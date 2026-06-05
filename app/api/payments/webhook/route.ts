import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret no configurado." }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Falta firma." }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma inválida"
    console.error("[webhook] signature verification failed:", message)
    return NextResponse.json({ error: `Firma inválida: ${message}` }, { status: 400 })
  }

  const supabase = adminClient()

  // Idempotencia: si ya procesamos este evento, retornar 200 sin re-procesar
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id, processed")
    .eq("stripe_event_id", event.id)
    .maybeSingle()

  if (existingEvent) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  // Guardar evento
  await supabase.from("webhook_events").insert({
    stripe_event_id: event.id,
    type: event.type,
    processed: false,
    payload: event,
  })

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        const companyId = session.metadata?.company_id
        const planId = session.metadata?.plan_id
        const seats = parseInt(session.metadata?.seats || "1", 10)
        const chargeSetup = session.metadata?.charge_setup === "true"

        if (!companyId || !planId) {
          console.error("[webhook] checkout.session.completed sin metadata")
          break
        }

        // Obtener subscription completa de Stripe para tener period dates
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const item = subscription.items.data[0]

        await supabase.from("company_subscriptions").upsert({
          company_id: companyId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          stripe_subscription_item_id: item.id,
          plan_id: planId,
          seats: seats,
          status: subscription.status === "active" ? "active" : subscription.status,
          current_period_start: new Date(item.current_period_start * 1000).toISOString(),
          current_period_end: new Date(item.current_period_end * 1000).toISOString(),
          setup_fee_paid: chargeSetup,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: "company_id" })

        // Limpiar expires_at de companies.settings.subscription
        const { data: company } = await supabase
          .from("companies")
          .select("settings")
          .eq("id", companyId)
          .single()

        if (company) {
          const currentSettings = (company.settings as Record<string, any>) || {}
          const sub = (currentSettings.subscription as Record<string, any>) || {}
          await supabase.from("companies").update({
            settings: {
              ...currentSettings,
              subscription: {
                ...sub,
                plan_id: planId,
                status: "active",
                stripe_subscription_id: subscription.id,
                seats: seats,
                setup_fee_paid: chargeSetup,
                current_period_end: new Date(item.current_period_end * 1000).toISOString(),
                expires_at: null,
              },
            },
          }).eq("id", companyId)
        }

        // Notificar al director
        const { data: director } = await supabase
          .from("profiles")
          .select("id")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()

        if (director) {
          await supabase.from("notifications").insert({
            company_id: companyId,
            user_id: director.id,
            type: "subscription_activated",
            title: "Suscripción activa",
            body: `Tu suscripción al plan ${planId} está activa con ${seats} ${seats === 1 ? "asiento" : "asientos"}.`,
          })
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as any
        const subId = invoice.subscription
        if (!subId) break

        const subscription = await stripe.subscriptions.retrieve(subId)
        const item = subscription.items.data[0]
        const companyId = subscription.metadata?.company_id

        if (companyId) {
          await supabase.from("company_subscriptions").update({
            status: "active",
            current_period_start: new Date(item.current_period_start * 1000).toISOString(),
            current_period_end: new Date(item.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subId)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        const subId = invoice.subscription
        if (!subId) break

        const subscription = await stripe.subscriptions.retrieve(subId)
        const companyId = subscription.metadata?.company_id

        if (companyId) {
          await supabase.from("company_subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subId)

          // Notificar al director
          const { data: director } = await supabase
            .from("profiles")
            .select("id")
            .eq("company_id", companyId)
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (director) {
            await supabase.from("notifications").insert({
              company_id: companyId,
              user_id: director.id,
              type: "payment_failed",
              title: "Pago rechazado",
              body: "No pudimos procesar el pago de tu suscripción. Actualiza tu método de pago para evitar la cancelación.",
            })
          }
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any
        const companyId = subscription.metadata?.company_id
        const planId = subscription.metadata?.plan_id
        const seats = parseInt(subscription.metadata?.seats || "1", 10)
        const item = subscription.items.data[0]

        if (companyId) {
          await supabase.from("company_subscriptions").update({
            plan_id: planId,
            seats: seats,
            status: subscription.status,
            current_period_start: new Date(item.current_period_start * 1000).toISOString(),
            current_period_end: new Date(item.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subscription.id)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        const companyId = subscription.metadata?.company_id

        if (companyId) {
          await supabase.from("company_subscriptions").update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subscription.id)
        }
        break
      }
    }

    // Marcar como procesado
    await supabase
      .from("webhook_events")
      .update({ processed: true })
      .eq("stripe_event_id", event.id)

    return NextResponse.json({ received: true })
  } catch (handlerError) {
    const message = handlerError instanceof Error ? handlerError.message : "Error procesando evento"
    console.error(`[webhook] handler error for ${event.type}:`, message)
    // Devolvemos 200 para que Stripe no reintente indefinidamente; el error queda logueado
    return NextResponse.json({ received: true, handlerError: message })
  }
}

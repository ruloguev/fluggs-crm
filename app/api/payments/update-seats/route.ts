import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { PLAN_LIMITS, isValidSeats, type PlanId } from "@/lib/stripe-plans"
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
  try {
    const { planId, seats } = await req.json()

    if (!planId || !PLAN_LIMITS[planId as PlanId]) {
      return NextResponse.json({ error: "Plan inválido." }, { status: 400 })
    }

    const seatsNum = Number(seats)
    if (!Number.isInteger(seatsNum) || !isValidSeats(planId as PlanId, seatsNum)) {
      const plan = PLAN_LIMITS[planId as PlanId]
      return NextResponse.json(
        { error: `Asientos fuera de rango. El plan ${plan.name} permite de ${plan.min} a ${plan.max} asientos.` },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const userSupabase = createServerClient(
      getSupabaseUrl()!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 401 })
    }

    const supabase = adminClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role:roles(level, name)")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 400 })
    }

    const roleLevel = (profile?.role as any)?.level ?? 99
    const roleName = ((profile?.role as any)?.name ?? "").toLowerCase()
    const isDirector = roleLevel <= 1 || roleName.includes("director")
    if (!isDirector) {
      return NextResponse.json({ error: "Solo el director puede modificar la suscripción." }, { status: 403 })
    }

    const { data: sub } = await supabase
      .from("company_subscriptions")
      .select("stripe_subscription_id, stripe_subscription_item_id, plan_id")
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (!sub?.stripe_subscription_id || !sub.stripe_subscription_item_id) {
      return NextResponse.json({ error: "No tienes una suscripción activa en Stripe." }, { status: 404 })
    }

    const stripe = getStripe()
    const newPlan = PLAN_LIMITS[planId as PlanId]
    const oldPlanId = sub.plan_id as PlanId

    // Agente Pro tiene 1 asiento fijo: solo puede migrar a otro plan, nunca sumar asientos
    if (oldPlanId === "agente_pro" && planId === "agente_pro") {
      return NextResponse.json(
        { error: "El plan Agente Pro tiene un asiento fijo y no permite modificarlo. Contrata otro plan para sumar asientos." },
        { status: 400 },
      )
    }

    // Si cambió de plan, actualizar el price_id también
    if (planId !== oldPlanId) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{
          id: sub.stripe_subscription_item_id,
          price: newPlan.priceId,
          quantity: seatsNum,
        }],
        proration_behavior: "create_prorations",
        metadata: {
          company_id: profile.company_id,
          plan_id: planId,
          seats: String(seatsNum),
        },
      })
    } else {
      // Solo cambió cantidad de asientos
      await stripe.subscriptionItems.update(sub.stripe_subscription_item_id, {
        quantity: seatsNum,
        proration_behavior: "create_prorations",
      })

      // Actualizar metadata con nueva cantidad
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        metadata: {
          company_id: profile.company_id,
          plan_id: planId,
          seats: String(seatsNum),
        },
      })
    }

    // Actualizar DB local (el webhook customer.subscription.updated también lo hará,
    // pero actualizamos aquí para respuesta inmediata)
    await supabase.from("company_subscriptions").update({
      plan_id: planId,
      seats: seatsNum,
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", sub.stripe_subscription_id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    console.error("[update-seats] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

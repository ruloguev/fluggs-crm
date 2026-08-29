import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { PLAN_LIMITS, SETUP_PRICE_ID, isValidSeats, type PlanId } from "@/lib/stripe-plans"
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
    const { planId, seats, origin } = await req.json()

    if (!planId || !PLAN_LIMITS[planId as PlanId]) {
      return NextResponse.json({ error: "Plan inválido." }, { status: 400 })
    }

    const plan = PLAN_LIMITS[planId as PlanId]
    const seatsNum = Number(seats)
    if (!Number.isInteger(seatsNum) || !isValidSeats(planId as PlanId, seatsNum)) {
      return NextResponse.json(
        { error: `Asientos fuera de rango. El plan ${plan.name} permite de ${plan.min} a ${plan.max} asientos.` },
        { status: 400 }
      )
    }

    if (!plan.priceId) {
      return NextResponse.json({ error: `Price ID no configurado para ${plan.name}.` }, { status: 500 })
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
      .select("id, company_id, email, full_name")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 400 })
    }

    // Verificar si ya tiene suscripción activa
    const { data: existing } = await supabase
      .from("company_subscriptions")
      .select("id, status, setup_fee_paid, stripe_customer_id, stripe_subscription_id")
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (existing && ["active", "trial", "past_due"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Ya tienes una suscripción activa. Ve a Ajustes > Cuenta para modificarla." },
        { status: 409 }
      )
    }

    // Determinar si cobrar setup fee:
    //  - Empresa nueva (no existe registro) → cobrar
    //  - Canceló/expiró antes → cobrar (segunda vuelta)
    //  - Activa/trial/past_due → no cobrar (no debería llegar aquí, pero por seguridad)
    //  - El plan descarta el setup (Agente Pro: setupFee = 0) → nunca cobrar
    const chargeSetup =
      plan.setupFee > 0 &&
      (!existing || (existing.setup_fee_paid && ["cancelled", "expired"].includes(existing.status)))

    const stripe = getStripe()
    const appUrl = origin || req.headers.get("origin") || "https://flugzz-crm.vercel.app"

    // Crear o recuperar Stripe Customer
    let customerId = existing?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: { company_id: profile.company_id, profile_id: profile.id },
      })
      customerId = customer.id
    }

    // Construir line items
    const lineItems: Array<{ price: string; quantity: number }> = [
      { price: plan.priceId, quantity: seatsNum },
    ]

    if (chargeSetup && SETUP_PRICE_ID) {
      lineItems.unshift({ price: SETUP_PRICE_ID, quantity: 1 })
    }

    // Fail-fast: validar que todos los prices existen en Stripe antes de crear la sesion.
    // Si alguno fue borrado o el env var esta mal, devolvemos un mensaje accionable
    // en lugar del generico "No such price".
    try {
      await stripe.prices.retrieve(plan.priceId)
      if (chargeSetup && SETUP_PRICE_ID) await stripe.prices.retrieve(SETUP_PRICE_ID)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Price no encontrado"
      console.error("[create-checkout] price validation failed:", msg)
      return NextResponse.json(
        {
          error: `Price no disponible: ${plan.name}. Verifica STRIPE_PRICE_${planId.toUpperCase()}${chargeSetup && SETUP_PRICE_ID ? " o STRIPE_PRICE_SETUP" : ""} en Vercel.`,
          details: msg,
        },
        { status: 500 },
      )
    }

    // Crear sesión de checkout en modo embedded
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      customer: customerId,
      line_items: lineItems,
      mode: "subscription",
      subscription_data: {
        metadata: {
          company_id: profile.company_id,
          plan_id: planId,
          seats: String(seatsNum),
          charge_setup: String(chargeSetup),
        },
      },
      metadata: {
        company_id: profile.company_id,
        plan_id: planId,
        seats: String(seatsNum),
        charge_setup: String(chargeSetup),
      },
      return_url: `${appUrl}/suscripcion/resultado?session_id={CHECKOUT_SESSION_ID}`,
    })

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      chargeSetup,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    console.error("[create-checkout] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

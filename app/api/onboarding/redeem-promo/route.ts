import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

const VALID_PLANS = new Set(["fundacion", "expansion", "imperio"])

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { planId, code } = await req.json()
    const normalizedPlan = typeof planId === "string" ? planId.trim().toLowerCase() : ""
    const normalizedCode =
      typeof code === "string" && code.trim().length > 0 ? code.trim().toUpperCase() : null

    if (!VALID_PLANS.has(normalizedPlan)) {
      return NextResponse.json({ error: "Plan inválido." }, { status: 400 })
    }
    if (!normalizedCode) {
      return NextResponse.json({ error: "Código requerido." }, { status: 400 })
    }

    const cookieStore = await cookies()
    const userSupabase = createServerClient(
      getSupabaseUrl()!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    )

    const {
      data: { user },
    } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 401 })
    }

    const supabase = adminClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 400 })
    }

    // Verificar que no tenga ya una suscripción activa de pago.
    // Si tiene una suscripción de demo (status='active' sin stripe_subscription_id,
    // creada por el backfill de la migración 017), permitir reemplazarla: la
    // eliminamos antes de crear el trial.
    const { data: existing } = await supabase
      .from("company_subscriptions")
      .select("status, stripe_subscription_id, stripe_customer_id")
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (existing) {
      if (existing.status === "trial") {
        return NextResponse.json(
          { error: "Ya tienes una prueba activa. No puedes redimir otro código." },
          { status: 409 },
        )
      }
      if (existing.status === "past_due") {
        return NextResponse.json(
          { error: "Tu suscripción tiene un pago pendiente. Resuélvelo antes de redimir un código." },
          { status: 409 },
        )
      }
      if (existing.status === "active" && existing.stripe_subscription_id) {
        return NextResponse.json(
          { error: "Ya tienes una suscripción activa de pago. No puedes redimir un código." },
          { status: 409 },
        )
      }
      // active SIN stripe_subscription_id = sub de demo / backfill. Reemplazable.
      if (existing.status === "active" && !existing.stripe_subscription_id) {
        const { error: delError } = await supabase
          .from("company_subscriptions")
          .delete()
          .eq("company_id", profile.company_id)
        if (delError) {
          console.error("redeem-promo: failed to clear demo sub:", delError)
          return NextResponse.json(
            { error: "No pudimos preparar el espacio para el código." },
            { status: 500 },
          )
        }
      }
    }

    const { data: redeemData, error: redeemError } = await supabase.rpc("redeem_promo_code", {
      p_code: normalizedCode,
      p_company: profile.company_id,
      p_user: user.id,
      p_plan: normalizedPlan,
    })

    if (redeemError) {
      if ((redeemError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Este código ya fue utilizado por tu empresa." },
          { status: 409 },
        )
      }
      console.error("redeem_promo_code rpc error:", redeemError)
      return NextResponse.json({ error: "No pudimos validar el código." }, { status: 500 })
    }
    if (!redeemData?.ok) {
      return NextResponse.json({ error: redeemData?.error ?? "Código inválido." }, { status: 400 })
    }

    const { error: upsertError } = await supabase.from("company_subscriptions").upsert(
      {
        company_id: profile.company_id,
        plan_id: normalizedPlan,
        seats: 1,
        status: "trial",
        current_period_end: redeemData.expires_at,
        current_period_start: new Date().toISOString(),
        setup_fee_paid: false,
        cancel_at_period_end: false,
      },
      { onConflict: "company_id" },
    )

    if (upsertError) {
      console.error("company_subscriptions upsert error:", upsertError)
      return NextResponse.json({ error: "No pudimos activar la prueba." }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      trial: true,
      expiresAt: redeemData.expires_at,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    console.error("redeem-promo uncaught:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

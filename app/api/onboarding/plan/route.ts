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
    const { planId, promoCode } = await req.json()
    const normalizedPlan = typeof planId === "string" ? planId.trim().toLowerCase() : ""

    if (!VALID_PLANS.has(normalizedPlan)) {
      return NextResponse.json({ error: "Selecciona un plan valido." }, { status: 400 })
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
      return NextResponse.json({ error: "Sesion no encontrada." }, { status: 401 })
    }

    const supabase = adminClient()
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: "No se encontro la empresa del usuario." }, { status: 400 })
    }

    const companyId = profile.company_id
    const normalizedCode =
      typeof promoCode === "string" && promoCode.trim().length > 0
        ? promoCode.trim().toUpperCase()
        : null

    // ── Sin codigo → NO marcar active, devolver flag para redirigir a /suscripcion
    if (!normalizedCode) {
      return NextResponse.json(
        { requiresPayment: true, planId: normalizedPlan, redirect: "/suscripcion" },
        { status: 402 },
      )
    }

    // ── Con codigo → redencion atomica via funcion SQL
    const { data: redeemData, error: redeemError } = await supabase.rpc("redeem_promo_code", {
      p_code: normalizedCode,
      p_company: companyId,
      p_user: user.id,
      p_plan: normalizedPlan,
    })

    if (redeemError) {
      // 23505 = unique_violation = PK compuesto (code, company_id) ya tiene fila
      if ((redeemError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Este código ya fue utilizado por tu empresa." },
          { status: 409 },
        )
      }
      console.error("redeem_promo_code rpc error:", redeemError)
      return NextResponse.json({ error: "No pudimos validar el codigo." }, { status: 500 })
    }

    if (!redeemData?.ok) {
      return NextResponse.json({ error: redeemData?.error ?? "Codigo invalido." }, { status: 400 })
    }

    const expiresAt = redeemData.expires_at as string

    // Crear / actualizar company_subscriptions con trial
    const { error: upsertError } = await supabase.from("company_subscriptions").upsert(
      {
        company_id: companyId,
        plan_id: normalizedPlan,
        seats: 1,
        status: "trial",
        current_period_end: expiresAt,
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

    return NextResponse.json({ ok: true, trial: true, redirect: "/dashboard" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    console.error("onboarding/plan uncaught:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

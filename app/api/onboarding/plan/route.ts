import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

const VALID_PLANS = new Set(["fundacion", "expansion", "imperio"])

function normalizePromoCode(value: unknown) {
  if (typeof value !== "string") return null
  const code = value.trim().toUpperCase()
  return code.length > 0 ? code : null
}

function isValidPromoCode(code: string) {
  return /^FLUGZZ(0[1-9]|1[01])$/.test(code)
}

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
    const normalizedPromo = normalizePromoCode(promoCode)

    if (!VALID_PLANS.has(normalizedPlan)) {
      return NextResponse.json({ error: "Selecciona un plan valido." }, { status: 400 })
    }

    if (normalizedPromo && !isValidPromoCode(normalizedPromo)) {
      return NextResponse.json(
        { error: "El codigo debe estar entre FLUGZZ01 y FLUGZZ11." },
        { status: 400 },
      )
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

    if (normalizedPromo) {
      const { data: existingRedemption } = await supabase
        .from("promo_code_redemptions")
        .select("company_id")
        .eq("code", normalizedPromo)
        .maybeSingle()

      if (existingRedemption && existingRedemption.company_id !== companyId) {
        return NextResponse.json({ error: "Este codigo ya fue utilizado." }, { status: 409 })
      }

      if (!existingRedemption) {
        const { error: redemptionError } = await supabase
          .from("promo_code_redemptions")
          .insert({
            code: normalizedPromo,
            company_id: companyId,
            redeemed_by: user.id,
            plan_id: normalizedPlan,
          })

        if (redemptionError) {
          return NextResponse.json(
            { error: redemptionError.code === "23505" ? "Este codigo ya fue utilizado." : redemptionError.message },
            { status: redemptionError.code === "23505" ? 409 : 500 },
          )
        }
      }
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }

    const currentSettings =
      company?.settings && typeof company.settings === "object" && !Array.isArray(company.settings)
        ? company.settings
        : {}

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        settings: {
          ...currentSettings,
          subscription: {
            plan_id: normalizedPlan,
            promo_code: normalizedPromo,
            trial_code_applied: Boolean(normalizedPromo),
            selected_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", companyId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

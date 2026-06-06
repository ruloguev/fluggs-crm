import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

/**
 * GET /api/onboarding/check-sub
 *
 * Devuelve el estado actual de la suscripción de la empresa del usuario.
 * Útil para diagnosticar el flujo de promo / hard block del layout.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userSupabase = createServerClient(
      getSupabaseUrl()!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    )
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 401 })
    }

    const supabase = adminClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, company_id, full_name, email")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 400 })
    }

    const { data: sub, error: subError } = await supabase
      .from("company_subscriptions")
      .select("plan_id, seats, status, setup_fee_paid, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, cancel_at_period_end, updated_at, created_at")
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    // Contar redenciones de la empresa (todas)
    const { data: redemptions, count: redemptionCount } = await supabase
      .from("promo_code_redemptions")
      .select("code, redeemed_at, plan_id, redeemed_by", { count: "exact" })
      .eq("company_id", profile.company_id)
      .order("redeemed_at", { ascending: false })

    return NextResponse.json({
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        companyId: profile.company_id,
      },
      subscription: sub
        ? {
            planId: sub.plan_id,
            seats: sub.seats,
            status: sub.status,
            setupFeePaid: sub.setup_fee_paid,
            hasStripeSubscription: Boolean(sub.stripe_subscription_id),
            hasStripeCustomer: Boolean(sub.stripe_customer_id),
            currentPeriodStart: sub.current_period_start,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: sub.updated_at,
            createdAt: sub.created_at,
            daysLeft: sub.current_period_end
              ? Math.ceil(
                  (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                )
              : null,
            isExpired: sub.current_period_end
              ? new Date(sub.current_period_end) < new Date()
              : null,
          }
        : null,
      redemptions: {
        count: redemptionCount ?? 0,
        items: (redemptions ?? []).map((r) => ({
          code: r.code,
          redeemedAt: r.redeemed_at,
          planId: r.plan_id,
          redeemedBy: r.redeemed_by,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    console.error("[check-sub]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

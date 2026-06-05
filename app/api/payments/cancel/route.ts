import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
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
  try {
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
      return NextResponse.json({ error: "Solo el director puede cancelar la suscripción." }, { status: 403 })
    }

    const { data: sub } = await supabase
      .from("company_subscriptions")
      .select("stripe_subscription_id")
      .eq("company_id", profile.company_id)
      .maybeSingle()

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: "No tienes una suscripción activa." }, { status: 404 })
    }

    const stripe = getStripe()
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    await supabase.from("company_subscriptions").update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq("stripe_subscription_id", sub.stripe_subscription_id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

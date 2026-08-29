import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getStripe } from "@/lib/stripe"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

export async function GET(_req: NextRequest) {
  try {
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
      return NextResponse.json({ error: "No autenticado." }, { status: 401 })
    }

    const supabase = adminClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role:roles(level, name)")
      .eq("id", user.id)
      .single()

    const roleLevel = (profile?.role as { level?: number } | null)?.level ?? 99
    const roleName = (profile?.role as { name?: string } | null)?.name ?? ""
    const isDirector = roleLevel <= 1 || roleName.toLowerCase().includes("director")
    if (!isDirector) {
      return NextResponse.json({ error: "Solo directores." }, { status: 403 })
    }

    const stripe = getStripe()
    const sk = process.env.STRIPE_SECRET_KEY ?? ""
    const stripeMode = sk.startsWith("sk_live_") ? "live" : sk.startsWith("sk_test_") ? "test" : "unknown"

    const configured = {
      setup: process.env.STRIPE_PRICE_SETUP ?? null,
      agente_pro: process.env.STRIPE_PRICE_INDEPENDIENTE ?? null,
      fundacion: process.env.STRIPE_PRICE_FUNDACION ?? null,
      expansion: process.env.STRIPE_PRICE_EXPANSION ?? null,
      imperio: process.env.STRIPE_PRICE_IMPERIO ?? null,
    }

    const result: Record<string, unknown> = {
      stripeMode,
      keyPreview: sk ? `${sk.slice(0, 12)}...` : "(no configurada)",
      configured,
      valid: {} as Record<string, boolean | string>,
      errors: {} as Record<string, string>,
      details: {} as Record<string, unknown>,
    }
    const valid = result.valid as Record<string, boolean | string>
    const errors = result.errors as Record<string, string>
    const details = result.details as Record<string, unknown>

    for (const [key, id] of Object.entries(configured)) {
      if (!id) {
        valid[key] = false
        errors[key] = "Variable de entorno no configurada"
        continue
      }
      try {
        const price = await stripe.prices.retrieve(id)
        valid[key] = price.active
        if (!price.active) {
          errors[key] = "Price archivado/inactivo"
        }
        details[key] = {
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          product: price.product,
          active: price.active,
          nickname: price.nickname,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        valid[key] = false
        errors[key] = msg
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error inesperado"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

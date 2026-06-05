import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { code, companyId } = await req.json()
    const normalized =
      typeof code === "string" && code.trim().length > 0 ? code.trim().toUpperCase() : null

    if (!normalized) {
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

    // Verificar codigo via funcion SQL (no consume uso)
    const { data: checkData, error: checkError } = await supabase.rpc("check_promo_code", {
      p_code: normalized,
    })

    if (checkError) {
      console.error("check_promo_code error:", checkError)
      return NextResponse.json({ error: "No pudimos validar el código." }, { status: 500 })
    }
    if (!checkData?.ok) {
      return NextResponse.json(
        { ok: false, error: checkData?.error ?? "Código inválido." },
        { status: 400 },
      )
    }

    // Verificar si la empresa YA lo redimio antes
    const targetCompanyId = companyId ?? (await getUserCompanyId(supabase, user.id))
    if (!targetCompanyId) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from("promo_code_redemptions")
      .select("redeemed_at")
      .eq("code", normalized)
      .eq("company_id", targetCompanyId)
      .maybeSingle()

    return NextResponse.json({
      ok: true,
      alreadyRedeemed: Boolean(existing),
      currentUses: checkData.current_uses,
      maxUses: checkData.max_uses,
      campaign: checkData.campaign,
      expiresAt: checkData.expires_at,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error inesperado"
    console.error("validate-promo uncaught:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function getUserCompanyId(supabase: ReturnType<typeof adminClient>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single()
  return data?.company_id ?? null
}

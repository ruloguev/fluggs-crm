import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")
  if (!sessionId) {
    return NextResponse.json({ status: "unknown" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    getSupabaseUrl()!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 })
  }

  const supabase = adminClient()
  const { data: sub } = await supabase
    .from("company_subscriptions")
    .select("status, stripe_session_id")
    .eq("company_id", user.id)
    .maybeSingle()

  if (sub && ["active", "past_due"].includes(sub.status)) {
    return NextResponse.json({ status: sub.status })
  }

  return NextResponse.json({ status: "pending" })
}

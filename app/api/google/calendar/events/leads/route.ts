import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/server-env"

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const leadId = req.nextUrl.searchParams.get("lead_id")
    if (!leadId) return NextResponse.json({ error: "Falta lead_id" }, { status: 400 })

    const { data: events } = await supabase
      .from("lead_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("start_time", { ascending: false })

    return NextResponse.json({ events: events ?? [] })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

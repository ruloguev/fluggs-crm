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
    if (!user) return NextResponse.json({ connected: false })

    const { data } = await supabase
      .from("user_google_tokens")
      .select("google_email")
      .eq("user_id", user.id)
      .single()

    if (!data) return NextResponse.json({ connected: false })

    return NextResponse.json({
      connected: true,
      email: (data as any).google_email || "",
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}

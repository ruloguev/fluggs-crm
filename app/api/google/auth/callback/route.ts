import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getOAuth2Client, encryptToken } from "@/lib/google-calendar"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/server-env"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code")
    const error = req.nextUrl.searchParams.get("error")

    if (error || !code) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      return NextResponse.redirect(`${base}/integraciones?google=error`)
    }

    const supabase = createServerClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      return NextResponse.redirect(`${base}/login?redirect=/integraciones&google=expired`)
    }

    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      return NextResponse.redirect(`${base}/integraciones?google=no_refresh`)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const tokenInfo = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokens.access_token}`
    ).then(r => r.json()).catch(() => ({}))
    const googleEmail = tokenInfo.email || ""

    const encryptedAccess = encryptToken(tokens.access_token)
    const encryptedRefresh = encryptToken(tokens.refresh_token)

    const { error: upsertError } = await supabase.from("user_google_tokens").upsert({
      user_id: user.id,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: new Date(tokens.expiry_date).toISOString(),
      google_email: googleEmail,
    }, { onConflict: "user_id" })

    if (upsertError) {
      return NextResponse.redirect(`${baseUrl}/integraciones?google=error&detail=${encodeURIComponent(upsertError.message)}`)
    }

    return NextResponse.redirect(`${baseUrl}/integraciones?google=connected`)
  } catch (e) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return NextResponse.redirect(`${base}/integraciones?google=error&detail=${encodeURIComponent((e as Error).message)}`)
  }
}

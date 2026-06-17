import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/server-env"
import { decryptToken, refreshAccessToken, createCalendarEvent, encryptToken } from "@/lib/google-calendar"

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { lead_id, title, description, start_time, end_time, add_meet } = await req.json()
    if (!lead_id || !title || !start_time || !end_time) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const { data: tokenRow } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!tokenRow) {
      return NextResponse.json({ error: "Conecta Google Calendar primero en Integraciones" }, { status: 400 })
    }

    let accessToken: string
    try {
      accessToken = decryptToken(tokenRow.access_token as string)
    } catch {
      return NextResponse.json({ error: "Error al descifrar token" }, { status: 500 })
    }

    const expiresAt = new Date(tokenRow.token_expires_at as string)
    if (expiresAt.getTime() <= Date.now()) {
      try {
        const refreshToken = decryptToken(tokenRow.refresh_token as string)
        const refreshed = await refreshAccessToken(refreshToken)
        accessToken = refreshed.access_token
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in)
        const encryptedAccess = encryptToken(accessToken)
        await supabase
          .from("user_google_tokens")
          .update({ access_token: encryptedAccess, token_expires_at: newExpiresAt.toISOString() })
          .eq("id", tokenRow.id as string)
      } catch {
        return NextResponse.json({ error: "Sesión de Google expirada. Reconecta en Integraciones." }, { status: 401 })
      }
    }

    const startDate = new Date(start_time)
    const endDate = new Date(end_time)

    const event = await createCalendarEvent({
      accessToken,
      summary: title,
      description,
      startTime: startDate,
      endTime: endDate,
      addMeet: !!add_meet,
    })

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    await supabase.from("lead_events").insert({
      lead_id,
      user_id: user.id,
      company_id: (profile as any)?.company_id || "",
      google_event_id: event.googleEventId,
      meet_link: event.meetLink,
      title,
      description: description || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    })

    await supabase
      .from("leads")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", lead_id)

    // Log activity
    const { data: contact } = await supabase
      .from("leads")
      .select("contact_id")
      .eq("id", lead_id)
      .single()

    const meetMsg = event.meetLink ? `\nMeet: ${event.meetLink}` : ""

    if ((contact as any)?.contact_id) {
      await (supabase as any).from("activities").insert({
        lead_id,
        contact_id: (contact as any).contact_id,
        user_id: user.id,
        company_id: (profile as any)?.company_id || "",
        type: "meeting",
        title: "Reunión agendada",
        body: `Reunión: ${title}\n${startDate.toLocaleString("es-MX")} - ${endDate.toLocaleString("es-MX")}${meetMsg}`,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      ok: true,
      googleEventId: event.googleEventId,
      htmlLink: event.htmlLink,
      meetLink: event.meetLink,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

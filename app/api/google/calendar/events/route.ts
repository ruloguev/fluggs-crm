import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/server-env"
import { decryptToken, refreshAccessToken, createCalendarEvent, encryptToken } from "@/lib/google-calendar"

const MEETING_LABELS: Record<string, string> = {
  call: "Llamada",
  meet: "Google Meet",
  in_person: "Presencial",
}

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

    const { lead_id, title, description, start_time, end_time, meeting_type, location } = await req.json()
    if (!lead_id || !title || !start_time || !end_time) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const mtype = meeting_type === "call" || meeting_type === "in_person" ? meeting_type : "meet"

    let googleEventId: string | null = null
    let htmlLink: string | null = null
    let meetLink: string | null = null
    let accessToken: string | null = null

    if (mtype === "meet") {
      const { data: tokenRow } = await supabase
        .from("user_google_tokens")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (!tokenRow) {
        return NextResponse.json({ error: "Conecta Google Calendar primero en Integraciones" }, { status: 400 })
      }

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
        addMeet: true,
      })

      googleEventId = event.googleEventId
      htmlLink = event.htmlLink
      meetLink = event.meetLink
    }

    const startDate = new Date(start_time)
    const endDate = new Date(end_time)

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    await supabase.from("lead_events").insert({
      lead_id,
      user_id: user.id,
      company_id: (profile as any)?.company_id || "",
      google_event_id: googleEventId,
      meet_link: meetLink,
      title,
      description: description || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      meeting_type: mtype,
      location: location || null,
    })

    await supabase
      .from("leads")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", lead_id)

    const { data: contact } = await supabase
      .from("leads")
      .select("contact_id")
      .eq("id", lead_id)
      .single()

    const parts: string[] = [
      `Tipo: ${MEETING_LABELS[mtype]}`,
      `${startDate.toLocaleString("es-MX")} - ${endDate.toLocaleString("es-MX")}`,
    ]
    if (mtype === "in_person" && location) parts.push(`Lugar: ${location}`)
    if (meetLink) parts.push(`Meet: ${meetLink}`)

    await (supabase as any).from("activities").insert({
      lead_id,
      contact_id: (contact as any)?.contact_id || null,
      user_id: user.id,
      company_id: (profile as any)?.company_id || "",
      type: "meeting",
      title: `${MEETING_LABELS[mtype]} agendada`,
      body: parts.join("\n"),
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      googleEventId,
      htmlLink,
      meetLink,
      meeting_type: mtype,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

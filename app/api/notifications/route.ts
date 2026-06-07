import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createNotificationWithPush } from "@/lib/push-notifications"

/**
 * POST /api/notifications
 *
 * Crea una notificacion en la base de datos y dispara push notification.
 * Diseñado para ser llamado desde el cliente (ej. @menciones en notas).
 * Usa service_role key para insertar en nombre de otro usuario.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_id, user_id, lead_id, type, title, body: messageBody } = body

    if (!company_id || !user_id || !type || !title) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: company_id, user_id, type, title" },
        { status: 400 },
      )
    }

    const notification = await createNotificationWithPush({
      company_id,
      user_id,
      lead_id: lead_id ?? undefined,
      type,
      title,
      body: messageBody ?? "",
    })

    if (!notification) {
      return NextResponse.json({ error: "No se pudo crear la notificacion" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: notification.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado"
    console.error("[POST /api/notifications]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

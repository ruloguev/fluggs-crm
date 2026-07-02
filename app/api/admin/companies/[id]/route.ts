import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/server-env"
import { verifyAdminToken } from "@/lib/admin-auth"

function getAdmin() {
  return createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)
}

function checkAdmin(token: string): boolean {
  return verifyAdminToken(token)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (!token || !checkAdmin(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { action } = body
  const admin = getAdmin()

  if (action === "extend_trial") {
    const days = body.days ?? 30
    const { data: sub } = await admin
      .from("company_subscriptions")
      .select("current_period_end")
      .eq("company_id", id)
      .single()

    if (!sub) {
      return NextResponse.json({ error: "Empresa sin suscripción" }, { status: 404 })
    }

    const newEnd = new Date(
      (sub.current_period_end ? new Date(sub.current_period_end).getTime() : Date.now()) +
        days * 86400000,
    ).toISOString()

    await admin
      .from("company_subscriptions")
      .update({ current_period_end: newEnd })
      .eq("company_id", id)

    return NextResponse.json({ ok: true, new_period_end: newEnd })
  }

  if (action === "cancel") {
    await admin
      .from("company_subscriptions")
      .update({ cancel_at_period_end: true, status: "cancelled" })
      .eq("company_id", id)

    return NextResponse.json({ ok: true })
  }

  if (action === "reactivate") {
    await admin
      .from("company_subscriptions")
      .update({ cancel_at_period_end: false, status: "active" })
      .eq("company_id", id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, fullName, roleId, companyId } = await req.json()

    if (!email || !fullName || !companyId)
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, company_id: companyId, role_id: roleId ?? null },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const userId = data.user?.id
    if (!userId) return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 })

    await adminClient.from("profiles").upsert({
      id: userId, company_id: companyId, role_id: roleId ?? null,
      full_name: fullName, email, is_active: true,
    })

    await adminClient.from("team_memberships").upsert({
      company_id: companyId, user_id: userId, reports_to: null,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

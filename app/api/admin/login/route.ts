import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminToken, getAdminCredentials } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  const creds = getAdminCredentials()

  if (email !== creds.email || password !== creds.password) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
  }

  const token = createAdminToken()
  const cookieStore = await cookies()
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: 86400,
  })

  return NextResponse.json({ ok: true })
}

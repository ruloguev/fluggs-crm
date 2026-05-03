import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

function adminClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) throw new Error("Faltan variables de entorno del servidor.")
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = adminClient()
    const {
      userId,        // auth.uid() del usuario recién creado
      email,
      fullName,
      companyName,
      industry,
      currency = "MXN",
    } = await req.json()

    if (!userId || !email || !fullName || !companyName) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 })
    }

    // ── 1. Crear empresa ─────────────────────────────────────────
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName.trim(),
        industry: industry?.trim() || null,
        default_currency: currency,
        allowed_currencies: [currency],
      })
      .select("id")
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: companyError?.message ?? "Error creando empresa." }, { status: 500 })
    }

    const companyId = company.id

    // ── 2. Crear roles por defecto ───────────────────────────────
    const defaultRoles = [
      {
        name: "Director",
        level: 1,
        color: "#22d3ee",
        permissions: {
          can_manage_users: true,
          can_manage_roles: true,
          can_manage_integrations: true,
          can_manage_pipeline: true,
          can_view_all_leads: true,
          can_view_team: true,
          can_manage_drive: true,
          can_export: true,
        },
      },
      {
        name: "Gerente",
        level: 2,
        color: "#a78bfa",
        permissions: {
          can_manage_users: true,
          can_manage_roles: false,
          can_manage_integrations: false,
          can_manage_pipeline: true,
          can_view_all_leads: true,
          can_view_team: true,
          can_manage_drive: true,
          can_export: true,
        },
      },
      {
        name: "Coordinador",
        level: 3,
        color: "#34d399",
        permissions: {
          can_manage_users: true,
          can_manage_roles: false,
          can_manage_integrations: false,
          can_manage_pipeline: false,
          can_view_all_leads: false,
          can_view_team: true,
          can_manage_drive: false,
          can_export: false,
        },
      },
      {
        name: "Agente",
        level: 4,
        color: "#fb923c",
        permissions: {
          can_manage_users: false,
          can_manage_roles: false,
          can_manage_integrations: false,
          can_manage_pipeline: false,
          can_view_all_leads: false,
          can_view_team: false,
          can_manage_drive: false,
          can_export: false,
        },
      },
    ]

    const { data: rolesData, error: rolesError } = await supabase
      .from("roles")
      .insert(defaultRoles.map(r => ({ ...r, company_id: companyId })))
      .select("id, name, level")

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 })
    }

    const directorRole = rolesData?.find(r => r.level === 1)

    // ── 3. Crear / actualizar perfil del director ────────────────
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        company_id: companyId,
        role_id: directorRole?.id ?? null,
        is_active: true,
      })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // ── 4. Crear etapas de pipeline por defecto ──────────────────
    const defaultStages = [
      { name: "Nuevo Lead",   color: "#64748b", position: 1, is_closed: false },
      { name: "Contactado",   color: "#22d3ee", position: 2, is_closed: false },
      { name: "Calificado",   color: "#a78bfa", position: 3, is_closed: false },
      { name: "Propuesta",    color: "#fb923c", position: 4, is_closed: false },
      { name: "Negociación",  color: "#fbbf24", position: 5, is_closed: false },
      { name: "Venta Cerrada",color: "#34d399", position: 6, is_closed: true  },
      { name: "Perdido",      color: "#f87171", position: 7, is_closed: true  },
    ]

    await supabase
      .from("pipeline_stages")
      .insert(defaultStages.map(s => ({ ...s, company_id: companyId })))

    // ── 5. Membresía en equipo ───────────────────────────────────
    await supabase
      .from("team_memberships")
      .upsert({ company_id: companyId, user_id: userId, reports_to: null })

    return NextResponse.json({ ok: true, companyId })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error inesperado"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

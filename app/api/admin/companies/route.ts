import { NextResponse } from "next/server"
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

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (!token || !checkAdmin(token)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const admin = getAdmin()

  const { data: companies } = await admin
    .from("companies")
    .select(`
      id,
      name,
      created_at,
      settings,
      company_subscriptions (
        plan_id,
        status,
        seats,
        current_period_start,
        current_period_end,
        setup_fee_paid,
        cancel_at_period_end,
        stripe_subscription_id,
        stripe_customer_id,
        created_at
      ),
      profiles!inner (
        id,
        full_name,
        email,
        role_id,
        is_active,
        is_super_admin,
        roles!inner (name, level)
      )
    `)
    .order("created_at", { ascending: false })

  if (!companies) {
    return NextResponse.json({ companies: [] })
  }

  const enriched = await Promise.all(
    companies.map(async (c: any) => {
      const { count: activeMembers } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", c.id)
        .eq("is_active", true)

      const { count: totalLeads } = await admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", c.id)

      const directors = (c.profiles ?? []).filter(
        (p: any) => p.roles?.level === 1,
      )

      return {
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        subscription: c.company_subscriptions?.[0] ?? null,
        directors: directors.map((d: any) => ({
          name: d.full_name,
          email: d.email,
        })),
        active_members: activeMembers ?? 0,
        total_leads: totalLeads ?? 0,
      }
    }),
  )

  return NextResponse.json({ companies: enriched })
}

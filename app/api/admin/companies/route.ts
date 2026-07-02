import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/server-env"

async function checkSuperAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    getSupabaseUrl()!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createClient(getSupabaseUrl()!, getSupabaseServiceRoleKey()!)
  const { data: profile } = await admin
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_super_admin) return null
  return admin
}

export async function GET() {
  const admin = await checkSuperAdmin()
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

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

  // Get active member count and lead count per company
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

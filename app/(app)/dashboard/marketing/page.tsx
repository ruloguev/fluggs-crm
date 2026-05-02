"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { NeonDonut } from "@/components/dashboard/neon-donut"
import {
  contactacionPercent,
  conversionPercent,
  getClosedWonStageIds,
} from "@/lib/dashboard-kpis"
import { ArrowRight, Cable, Loader2, Megaphone, TrendingUp } from "lucide-react"

type LeadRow = {
  id: string
  owner_id: string | null
  source_id: string | null
  stage_id: string | null
  last_activity_at: string | null
}
type StageRow = { id: string; name: string; is_closed: boolean }
type SourceRow = { id: string; name: string }
type IntegrationRow = {
  page_id: string
  page_name: string | null
  is_active: boolean
  last_synced_at: string | null
}

function getDashboardMode(roleName: string) {
  const n = roleName.toLowerCase()
  if (n.includes("mkt") || n.includes("marketing")) return "marketing" as const
  return "other" as const
}

export default function MarketingDashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { profile, role, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [stages, setStages] = useState<StageRow[]>([])
  const [sources, setSources] = useState<SourceRow[]>([])
  const [integration, setIntegration] = useState<IntegrationRow | null>(null)

  const mode = useMemo(
    () => getDashboardMode(role?.name ?? ""),
    [role?.name],
  )

  useEffect(() => {
    if (!authLoading && mode !== "marketing") router.replace("/dashboard")
  }, [authLoading, mode, router])

  useEffect(() => {
    const companyId = profile?.company_id
    if (!companyId) return

    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: leadRows }, { data: stageRows }, { data: sourceRows }, { data: intRow }] =
        await Promise.all([
          supabase
            .from("leads")
            .select("id, owner_id, source_id, stage_id, last_activity_at")
            .eq("company_id", companyId),
          supabase
            .from("pipeline_stages")
            .select("id, name, is_closed")
            .eq("company_id", companyId)
            .order("position"),
          supabase.from("lead_sources").select("id, name").eq("company_id", companyId),
          supabase
            .from("facebook_integrations")
            .select("page_id, page_name, is_active, last_synced_at")
            .eq("company_id", companyId)
            .maybeSingle(),
        ])
      if (cancelled) return
      setLeads((leadRows as LeadRow[]) ?? [])
      setStages((stageRows as StageRow[]) ?? [])
      setSources((sourceRows as SourceRow[]) ?? [])
      setIntegration((intRow as IntegrationRow | null) ?? null)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [profile?.company_id, supabase])

  const wonIds = useMemo(() => getClosedWonStageIds(stages), [stages])
  const conversionPct = useMemo(
    () => conversionPercent(leads, wonIds),
    [leads, wonIds],
  )
  const contactPct = useMemo(() => contactacionPercent(leads), [leads])

  const topSourceShare = useMemo(() => {
    if (leads.length === 0) return 0
    const counts: Record<string, number> = {}
    for (const l of leads) {
      if (!l.source_id) continue
      counts[l.source_id] = (counts[l.source_id] ?? 0) + 1
    }
    const top = Math.max(0, ...Object.values(counts))
    return (top / leads.length) * 100
  }, [leads])

  const carteraSanaPct = useMemo(() => {
    if (leads.length === 0) return 0
    const staleMs = 3 * 24 * 60 * 60 * 1000
    const now = Date.now()
    const stale = leads.filter(
      (l) =>
        !l.last_activity_at ||
        now - new Date(l.last_activity_at).getTime() > staleMs,
    ).length
    return ((leads.length - stale) / leads.length) * 100
  }, [leads])

  const integrationPulse = integration?.is_active ? 100 : 0

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  if (mode !== "marketing") return null

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-violet-300 mb-3">
            <Megaphone className="w-3.5 h-3.5" /> Marketing
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-100">
            Panel visual<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-xl">
            KPIs de captación y embudo en un vistazo. Misma lógica de conversión que el dashboard principal (etapa «venta cerrada» o etapas cerradas).
          </p>
        </div>
        <Link
          href="/integraciones"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 shrink-0"
        >
          Integraciones <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/50 p-8 flex flex-col items-center backdrop-blur-xl">
          <NeonDonut
            percent={conversionPct}
            label="Conversión"
            subtitle="Ventas cerradas / leads totales"
            variant="cyan"
          />
        </div>
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/50 p-8 flex flex-col items-center backdrop-blur-xl">
          <NeonDonut
            percent={contactPct}
            label="Contactación 7d"
            subtitle="Leads con actividad reciente"
            variant="emerald"
          />
        </div>
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/50 p-8 flex flex-col items-center backdrop-blur-xl">
          <NeonDonut
            percent={topSourceShare}
            label="Dominancia fuente top"
            subtitle="Cuota del canal líder vs total"
            variant="violet"
          />
        </div>
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/50 p-8 flex flex-col items-center backdrop-blur-xl">
          <NeonDonut
            percent={carteraSanaPct}
            label="Cartera activa"
            subtitle="Sin estancamiento +3 días"
            variant="amber"
          />
        </div>
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/50 p-8 flex flex-col items-center backdrop-blur-xl sm:col-span-2 lg:col-span-1">
          <NeonDonut
            percent={integrationPulse}
            label="Integración leads"
            subtitle={integration?.is_active ? "Facebook / webhooks activos" : "Sin conector activo"}
            variant="cyan"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-950/78 p-5 flex gap-4">
          <div className="w-12 h-12 rounded-2xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center shrink-0">
            <Cable className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <p className="font-medium text-zinc-100">
              {integration?.page_name || integration?.page_id || "Facebook Lead Ads"}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              {integration?.is_active
                ? `Sincronización lista · ${integration.last_synced_at ? new Date(integration.last_synced_at).toLocaleString("es-MX") : "Sin fecha"}`
                : "Activa la integración para medir impacto real."}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-950/78 p-5 flex gap-4">
          <div className="w-12 h-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <p className="font-medium text-zinc-100">Volumen total</p>
            <p className="text-sm text-zinc-500 mt-1">
              {leads.length} leads en la empresa · {sources.length} fuentes configuradas
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600">
        <Link href="/dashboard" className="text-flugzz-accent hover:underline">
          Volver al dashboard general
        </Link>
      </p>
    </div>
  )
}

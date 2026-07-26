"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import {
  Activity, ArrowRight, Building2, Cable, CalendarDays, CircleDollarSign,
  Clock3, Loader2, PhoneOutgoing, TrendingUp, Users, Sparkles,
  Phone, MessageCircle, Mail, CheckCircle, Clock, Download, Target,
} from "lucide-react"
import { NeonDonut } from "@/components/dashboard/neon-donut"
import {
  contactacionPercent,
  conversionPercent,
  getClosedWonStageIds,
  coberturaEquipoPercent,
  eficienciaPercent,
  velocidadPipelinePercent,
  type LeadKpi,
  type ActivityKpi,
  type StageKpi,
} from "@/lib/dashboard-kpis"

type PermissionMap = Record<string, boolean>

type RoleRecord = {
  id: string; name: string; level: number; color: string; permissions: PermissionMap
}
type ProfileRecord = {
  id: string; full_name: string; email: string | null; is_active: boolean; role_id: string | null
  role: RoleRecord | null; team_memberships: { reports_to: string | null }[] | null
}
type LeadRecord = LeadKpi & { source_id: string | null; currency: string | null }
type ActivityRecord = ActivityKpi & { title: string | null; body: string | null }
type SourceRecord = { id: string; name: string }
type StageRecord = StageKpi & { color: string | null; position?: number }
type IntegrationRecord = { page_id: string; page_name: string | null; is_active: boolean; last_synced_at: string | null }
type CompanyRecord = { default_currency: string | null; settings: Record<string, any> | null }

type ScopeMetrics = { leadCount: number; staleCount: number; activities7d: number; projectedValue: number }
type ActorCard = {
  id: string; name: string; roleName: string; leadCount: number; staleCount: number
  activities7d: number; projectedValue: number; topSource: string
}
type DashboardMode = "director" | "gerente" | "coordinador" | "marketing" | "agente"
type DateRangePreset = "7d" | "15d" | "30d" | "90d" | "historico" | "personalizado"

const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "7 días" },
  { value: "15d", label: "15 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "historico", label: "Histórico" },
  { value: "personalizado", label: "Personalizado" },
]

function formatCurrency(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
}

function timeAgo(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return "Hace un momento"
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`
  return `Hace ${Math.floor(diff / 86400)} días`
}

function getDashboardMode(roleName: string, permissions: PermissionMap | undefined): DashboardMode {
  const n = roleName.toLowerCase()
  if (n.includes("director")) return "director"
  if (n.includes("gerente")) return "gerente"
  if (n.includes("coordin")) return "coordinador"
  if (n.includes("mkt") || n.includes("marketing")) return "marketing"
  if (permissions?.is_transversal) return "director"
  return "agente"
}

function MetricCard({ icon: Icon, title, value, hint, accentClass }: {
  icon: React.ComponentType<{ className?: string }>; title: string; value: string; hint: string; accentClass: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${accentClass}`}><Icon className="w-5 h-5" /></div>
        <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-600">{hint}</span>
      </div>
      <p className="text-sm text-zinc-400 mt-4">{title}</p>
      <p className="text-3xl font-semibold tracking-tight text-zinc-100 mt-1">{value}</p>
    </div>
  )
}

function BarList({ title, subtitle, items, accent }: {
  title: string; subtitle: string; items: { label: string; value: number; helper?: string }[]; accent: string
}) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <div className="mb-5"><h2 className="text-lg font-semibold text-zinc-100">{title}</h2><p className="text-sm text-zinc-500 mt-1">{subtitle}</p></div>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 mb-2 text-sm"><span className="text-zinc-300">{item.label}</span><span className="text-zinc-500">{item.helper ?? item.value}</span></div>
            <div className="h-2 rounded-full bg-zinc-800/70 overflow-hidden"><div className={`h-full rounded-full ${accent}`} style={{ width: `${(item.value / max) * 100}%` }} /></div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-zinc-600">Sin datos suficientes todavía.</p>}
      </div>
    </div>
  )
}

function ActorGrid({ title, subtitle, cards, currency }: {
  title: string; subtitle: string; cards: ActorCard[]; currency: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <div className="mb-5"><h2 className="text-lg font-semibold text-zinc-100">{title}</h2><p className="text-sm text-zinc-500 mt-1">{subtitle}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(card => (
          <div key={card.id} className="rounded-xl border border-zinc-800/40 bg-zinc-950/60 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                {card.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0"><p className="text-sm font-medium text-zinc-200 truncate">{card.name}</p><p className="text-xs text-zinc-600">{card.roleName}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-semibold text-zinc-100">{card.leadCount}</p><p className="text-[10px] text-zinc-600 uppercase tracking-wider">leads</p></div>
              <div><p className={`text-lg font-semibold ${card.staleCount > 0 ? "text-amber-400" : "text-zinc-100"}`}>{card.staleCount}</p><p className="text-[10px] text-zinc-600 uppercase tracking-wider">estancados</p></div>
              <div><p className="text-lg font-semibold text-cyan-400">{card.activities7d}</p><p className="text-[10px] text-zinc-600 uppercase tracking-wider">actividad</p></div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{card.topSource}</span>
              <span className="text-xs text-emerald-400">{formatCurrency(card.projectedValue, currency)}</span>
            </div>
          </div>
        ))}
        {cards.length === 0 && <p className="col-span-2 text-sm text-zinc-600">Sin equipos configurados en este nivel.</p>}
      </div>
    </div>
  )
}

function SignalsPanel({ activities }: { activities: ActivityRecord[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-zinc-100 mb-5">Señales recientes</h2>
      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="flex gap-3">
            <div className="mt-1 w-3 h-3 rounded-full bg-flugzz-accent/80 shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
            <div>
              <p className="text-sm font-medium text-zinc-200">{activity.title || activity.type}</p>
              <p className="text-xs text-zinc-500 mt-1">{activity.body || "Movimiento registrado en el sistema."}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mt-2">{timeAgo(activity.created_at)}</p>
            </div>
          </div>
        ))}
        {activities.length === 0 && <p className="text-sm text-zinc-600">Aún no hay actividad reciente en este alcance.</p>}
      </div>
    </div>
  )
}

// ── KPI Donuts por modo ────────────────────────────────────────
type DonutConfig = {
  percent: number
  label: string
  subtitle: string
  variant: "cyan" | "emerald" | "violet" | "amber"
}

function KpiDonuts({ donuts }: { donuts: DonutConfig[] }) {
  // Size decreases slightly when showing more donuts
  const size = donuts.length <= 2 ? 160 : donuts.length === 3 ? 145 : 130
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Rendimiento comercial</h2>
          <p className="text-xs text-zinc-500 mt-1">Llamadas sin respuesta cuentan como intento de contactación.</p>
        </div>
      </div>
      <div className={`grid gap-6 ${donuts.length <= 2 ? "grid-cols-2" : donuts.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
        {donuts.map(d => (
          <div key={d.label} className="flex justify-center">
            <NeonDonut percent={d.percent} label={d.label} subtitle={d.subtitle} variant={d.variant} size={size} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile, role, can, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [stages, setStages] = useState<StageRecord[]>([])
  const [integration, setIntegration] = useState<IntegrationRecord | null>(null)
  const [company, setCompany] = useState<CompanyRecord | null>(null)
  const [snapshotAt, setSnapshotAt] = useState<number>(0)
  const [aiActions, setAiActions] = useState<any[]>([])
  const [loadingAiActions, setLoadingAiActions] = useState(false)
  const [rankingData, setRankingData] = useState<any[]>([])
  const [velocityData, setVelocityData] = useState<any[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  const [dateRange, setDateRange] = useState<DateRangePreset>("30d")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const datePickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDatePicker) return
    const handleClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showDatePicker])

  const rangeStartMs = useMemo(() => {
    if (dateRange === "historico") return 0
    if (dateRange === "personalizado") {
      if (customStartDate) return new Date(customStartDate).getTime()
      return 0
    }
    const days = { "7d": 7, "15d": 15, "30d": 30, "90d": 90 }[dateRange]
    return days ? Date.now() - days * 86400000 : 0
  }, [dateRange, customStartDate])

  const dateRangeLabel = DATE_RANGE_PRESETS.find(p => p.value === dateRange)?.label ?? "30 días"

  useEffect(() => {
    const companyId = profile?.company_id
    if (!companyId) return
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      const [{ data: profileRows }, { data: leadRows }, { data: activityRows }, { data: sourceRows }, { data: stageRows }, { data: integrationRow }, { data: companyRow }] =
        await Promise.all([
          fetch(`/api/team/members?companyId=${companyId}`).then(r => r.json()).then(d => ({ data: (d.members ?? []).map((m: any) => ({ ...m, role: m.role ?? null, team_memberships: m.reports_to !== undefined ? [{ reports_to: m.reports_to }] : [] })), error: null })),
          supabase.from("leads").select("id, owner_id, source_id, stage_id, budget_max, currency, created_at, last_activity_at").eq("company_id", companyId),
          supabase.from("activities").select("id, user_id, lead_id, type, call_status, title, body, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(300),
          supabase.from("lead_sources").select("id, name").eq("company_id", companyId),
          supabase.from("pipeline_stages").select("id, name, color, is_closed, position").eq("company_id", companyId).order("position"),
          supabase.from("facebook_integrations").select("page_id, page_name, is_active, last_synced_at").eq("company_id", companyId).single(),
          supabase.from("companies").select("default_currency, settings").eq("id", companyId).single(),
        ])
      if (cancelled) return
      setProfiles((profileRows as ProfileRecord[] | null) ?? [])
      setLeads((leadRows as LeadRecord[] | null) ?? [])
      setActivities((activityRows as ActivityRecord[] | null) ?? [])
      setSources((sourceRows as SourceRecord[] | null) ?? [])
      setStages((stageRows as StageRecord[] | null) ?? [])
      setIntegration((integrationRow as IntegrationRecord | null) ?? null)
      setCompany((companyRow as CompanyRecord | null) ?? null)
      setSnapshotAt(Date.now())
      setLoading(false)
    }

    void loadDashboard()
    
    // Cargar sugerencias de IA
    if (profile?.id && companyId) {
      setLoadingAiActions(true)
      fetch("/api/ia/lead-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, userId: profile.id, limit: 5 })
      })
        .then(r => r.json())
        .then(d => {
          if (d.actions) setAiActions(d.actions)
        })
        .finally(() => setLoadingAiActions(false))
    }
    
    // Cargar métricas de ranking y velocidad
    if (companyId) {
      setLoadingMetrics(true)
      Promise.all([
        fetch("/api/metrics/ranking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId })
        }).then(r => r.json()),
        fetch("/api/metrics/pipeline-velocity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId })
        }).then(r => r.json())
      ])
        .then(([rankingRes, velocityRes]) => {
          setRankingData(rankingRes.ranking || [])
          setVelocityData(velocityRes.velocity || [])
        })
        .finally(() => setLoadingMetrics(false))
    }
    
    return () => { cancelled = true }
  }, [profile?.company_id, profile?.id, supabase])

  const mode = useMemo(() => getDashboardMode(role?.name ?? "", role?.permissions), [role?.name, role?.permissions])
  const currency = company?.default_currency || "MXN"

  const reportsToMap = useMemo(() => {
    const map = new Map<string, string | null>()
    profiles.forEach(p => map.set(p.id, p.team_memberships?.[0]?.reports_to ?? null))
    return map
  }, [profiles])

  const reportsByLeader = useMemo(() => {
    const map = new Map<string, string[]>()
    profiles.forEach(p => {
      const mgr = reportsToMap.get(p.id)
      if (!mgr) return
      map.set(mgr, [...(map.get(mgr) ?? []), p.id])
    })
    return map
  }, [profiles, reportsToMap])

  const getDescendants = useCallback((userId: string): string[] => {
    const queue = [...(reportsByLeader.get(userId) ?? [])]
    const collected: string[] = []
    while (queue.length > 0) {
      const current = queue.shift()
      if (!current || collected.includes(current)) continue
      collected.push(current)
      queue.push(...(reportsByLeader.get(current) ?? []))
    }
    return collected
  }, [reportsByLeader])

  const scopeUserIds = useMemo(() => {
    if (!profile?.id) return []
    if (mode === "director" || mode === "marketing") return profiles.map(p => p.id)
    if (mode === "gerente") return [profile.id, ...getDescendants(profile.id)]
    if (mode === "coordinador") return [profile.id, ...(reportsByLeader.get(profile.id) ?? [])]
    return [profile.id]
  }, [mode, profile?.id, profiles, getDescendants, reportsByLeader])

  const rawScopeLeadRecords = useMemo(
    () => leads.filter(l => l.owner_id && scopeUserIds.includes(l.owner_id)),
    [leads, scopeUserIds],
  )

  const rawScopeActivities = useMemo(
    () => activities.filter(a => a.user_id && scopeUserIds.includes(a.user_id)),
    [activities, scopeUserIds],
  )

  const scopeLeadRecords = useMemo(
    () => {
      if (!rangeStartMs) return rawScopeLeadRecords
      return rawScopeLeadRecords.filter(l => l.created_at && new Date(l.created_at).getTime() >= rangeStartMs)
    },
    [rawScopeLeadRecords, rangeStartMs],
  )

  const scopeActivities = useMemo(
    () => {
      if (!rangeStartMs) return rawScopeActivities
      return rawScopeActivities.filter(a => new Date(a.created_at).getTime() >= rangeStartMs)
    },
    [rawScopeActivities, rangeStartMs],
  )

  const scopeMetrics = useMemo<ScopeMetrics>(() => {
    const sevenDaysAgo = snapshotAt - 7 * 24 * 60 * 60 * 1000
    return {
      leadCount: scopeLeadRecords.length,
      staleCount: scopeLeadRecords.filter(l => !l.last_activity_at || snapshotAt - new Date(l.last_activity_at).getTime() > 3 * 24 * 60 * 60 * 1000).length,
      activities7d: scopeActivities.filter(a => new Date(a.created_at).getTime() >= sevenDaysAgo).length,
      projectedValue: scopeLeadRecords.reduce((s, l) => s + Number(l.budget_max || 0), 0),
    }
  }, [scopeActivities, scopeLeadRecords, snapshotAt])

  const wonStageIds = useMemo(() => getClosedWonStageIds(stages), [stages])
  const firstStageId = stages[0]?.id ?? null

  const conversionPct = useMemo(() => conversionPercent(scopeLeadRecords, wonStageIds), [scopeLeadRecords, wonStageIds])
  const contactacionPct = useMemo(() => contactacionPercent(rawScopeLeadRecords, rawScopeActivities), [rawScopeLeadRecords, rawScopeActivities])
  const wonCount = useMemo(() => scopeLeadRecords.filter(l => l.stage_id && wonStageIds.includes(l.stage_id)).length, [scopeLeadRecords, wonStageIds])

  const monthlyGoal = company?.settings?.goals?.monthly_won_leads ?? 0
  const monthlyWonLeads = useMemo(() => {
    if (!monthlyGoal) return 0
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    return scopeLeadRecords.filter(l => {
      if (!l.stage_id || !wonStageIds.includes(l.stage_id)) return false
      const leadUpdatedAt = l.last_activity_at ? new Date(l.last_activity_at).getTime() : 0
      return leadUpdatedAt >= startOfMonth
    }).length
  }, [scopeLeadRecords, wonStageIds, monthlyGoal])
  const goalProgress = monthlyGoal > 0 ? Math.min(150, Math.round((monthlyWonLeads / monthlyGoal) * 100)) : 0

  // KPIs extra — solo se computan cuando aplican
  const directReportIds = useMemo(() => reportsByLeader.get(profile?.id ?? "") ?? [], [reportsByLeader, profile?.id])

  const coberturaEquipoPct = useMemo(() => {
    const teamIds = mode === "director" ? profiles.map(p => p.id) : mode === "gerente" ? getDescendants(profile?.id ?? "") : directReportIds
    return coberturaEquipoPercent(teamIds, rawScopeActivities, 7, snapshotAt)
  }, [mode, profiles, profile?.id, directReportIds, rawScopeActivities, snapshotAt, getDescendants])

  const eficienciaPct = useMemo(() => eficienciaPercent(rawScopeLeadRecords, rawScopeActivities, wonStageIds, snapshotAt), [rawScopeLeadRecords, rawScopeActivities, wonStageIds, snapshotAt])
  const velocidadPct = useMemo(() => velocidadPipelinePercent(rawScopeLeadRecords, firstStageId, snapshotAt), [rawScopeLeadRecords, firstStageId, snapshotAt])

  // Build donuts config per mode
  const donuts = useMemo<DonutConfig[]>(() => {
    const base: DonutConfig[] = [
      { percent: conversionPct, label: "Conversión", subtitle: `${wonCount} / ${scopeLeadRecords.length || 0} cerrados`, variant: "cyan" },
      { percent: contactacionPct, label: "Contactación", subtitle: "Actividad o llamada registrada", variant: "emerald" },
    ]
    if (mode === "coordinador") {
      base.push({ percent: coberturaEquipoPct, label: "Cobertura equipo", subtitle: "% agentes activos esta semana", variant: "violet" })
    }
    if (mode === "gerente") {
      base.push({ percent: coberturaEquipoPct, label: "Cobertura equipo", subtitle: "% del equipo activo esta semana", variant: "violet" })
      base.push({ percent: eficienciaPct, label: "Eficiencia", subtitle: "Leads con 2+ actividades recientes", variant: "amber" })
    }
    if (mode === "director") {
      base.push({ percent: coberturaEquipoPct, label: "Cobertura total", subtitle: "% del equipo activo esta semana", variant: "violet" })
      base.push({ percent: eficienciaPct, label: "Eficiencia", subtitle: "Leads con seguimiento sostenido", variant: "amber" })
      base.push({ percent: velocidadPct, label: "Velocidad", subtitle: "Leads nuevos que ya avanzaron", variant: "cyan" })
    }
    return base
  }, [mode, conversionPct, contactacionPct, coberturaEquipoPct, eficienciaPct, velocidadPct, wonCount, scopeLeadRecords.length])

  const stageBars = useMemo(() => stages.map(s => ({
    label: s.name, value: scopeLeadRecords.filter(l => l.stage_id === s.id).length,
    helper: `${scopeLeadRecords.filter(l => l.stage_id === s.id).length} leads`,
  })).filter(i => i.value > 0), [scopeLeadRecords, stages])

  const sourceBars = useMemo(() => sources.map(s => ({
    label: s.name, value: scopeLeadRecords.filter(l => l.source_id === s.id).length,
    helper: `${scopeLeadRecords.filter(l => l.source_id === s.id).length} captados`,
  })).filter(i => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [scopeLeadRecords, sources])

  const buildActorCard = useCallback((actorId: string): ActorCard | null => {
    const actor = profiles.find(p => p.id === actorId)
    if (!actor) return null
    const actorLeads = scopeLeadRecords.filter(l => l.owner_id === actorId)
    const actorActivities = scopeActivities.filter(a => a.user_id === actorId)
    const topSourceId = actorLeads.reduce<Record<string, number>>((acc, l) => {
      if (!l.source_id) return acc
      acc[l.source_id] = (acc[l.source_id] ?? 0) + 1
      return acc
    }, {})
    const topSource = Object.entries(topSourceId).sort((a, b) => b[1] - a[1])[0]?.[0]
    return {
      id: actor.id, name: actor.full_name, roleName: actor.role?.name ?? "Sin rol",
      leadCount: actorLeads.length,
      staleCount: actorLeads.filter(l => !l.last_activity_at || snapshotAt - new Date(l.last_activity_at).getTime() > 3 * 24 * 60 * 60 * 1000).length,
      activities7d: actorActivities.filter(a => snapshotAt - new Date(a.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length,
      projectedValue: actorLeads.reduce((s, l) => s + Number(l.budget_max || 0), 0),
      topSource: sources.find(s => s.id === topSource)?.name ?? "Sin fuente",
    }
  }, [scopeActivities, scopeLeadRecords, profiles, snapshotAt, sources])

  const actorCards = useMemo(() => {
    const targetIds = mode === "coordinador" ? directReportIds
      : mode === "gerente" ? directReportIds
      : mode === "director" ? profiles.filter(p => (reportsByLeader.get(p.id) ?? []).length > 0).map(p => p.id)
      : []
    return targetIds.map(id => buildActorCard(id)).filter((c): c is ActorCard => Boolean(c))
  }, [buildActorCard, mode, directReportIds, profiles, reportsByLeader])

  const perspectiveTitle = useMemo(() => ({
    director: "Panorama directivo", gerente: "Vista gerencial", coordinador: "Vista de coordinación",
    marketing: "Panel de marketing", agente: "Tablero operativo",
  }[mode]), [mode])

  const perspectiveDescription = useMemo(() => ({
    director: "Ves el rendimiento global, la salud del pipeline y el detalle por liderazgo.",
    gerente: "Ves el comportamiento de cada coordinación que te reporta y sus alertas comerciales.",
    coordinador: "Ves el rendimiento de cada agente, su actividad y los leads que requieren seguimiento.",
    marketing: "Ves captación, fuentes, integraciones y el pulso del origen de los leads.",
    agente: "Ves tu cartera activa, tu actividad reciente y dónde se está frenando tu pipeline.",
  }[mode]), [mode])

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" /></div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-full border border-flugzz-accent/20 bg-flugzz-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-flugzz-accent">{perspectiveTitle}</span>
            <span className="text-xs text-zinc-600">{role?.name ?? "Sin rol"}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100">Dashboard<span className="text-flugzz-accent">.</span></h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">{perspectiveDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 px-4 py-3 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-600">Alcance actual</p>
            <p className="text-sm text-zinc-200 mt-1">{scopeUserIds.length} usuarios en este panel</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(v => !v)}
              className="flex items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 px-4 py-3 backdrop-blur-xl text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm font-medium">{dateRangeLabel}</span>
            </button>
            {showDatePicker && (
              <div ref={datePickerRef} className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-zinc-800/50 bg-zinc-900 p-4 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setDateRange(p.value); if (p.value !== "personalizado") setShowDatePicker(false) }}
                      className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
                        dateRange === p.value
                          ? "bg-flugzz-accent/20 text-flugzz-accent border border-flugzz-accent/30"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {dateRange === "personalizado" && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
                    />
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="w-full mt-1 rounded-xl bg-flugzz-accent/20 text-flugzz-accent px-3 py-2 text-sm font-medium hover:bg-flugzz-accent/30 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Users} title="Leads en alcance" value={String(scopeMetrics.leadCount)} hint={dateRangeLabel} accentClass="bg-violet-500/10 border-violet-500/20 text-violet-300" />
        <MetricCard icon={Activity} title="Actividad en período" value={String(scopeMetrics.activities7d)} hint="movimiento" accentClass="bg-cyan-500/10 border-cyan-500/20 text-cyan-300" />
        <MetricCard icon={Clock3} title="Leads sin seguimiento" value={String(scopeMetrics.staleCount)} hint="alerta" accentClass="bg-amber-500/10 border-amber-500/20 text-amber-300" />
        <MetricCard icon={CircleDollarSign} title="Valor proyectado" value={formatCurrency(scopeMetrics.projectedValue, currency)} hint={currency} accentClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" />
      </div>

      {monthlyGoal > 0 && (
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Meta del mes</h2>
              <p className="text-sm text-zinc-400">{monthlyWonLeads} de {monthlyGoal} leads cerrados</p>
            </div>
          </div>
          
          <div className="relative h-4 rounded-full bg-zinc-800 overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                goalProgress >= 100 ? "bg-emerald-500" : goalProgress >= 70 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, goalProgress)}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-2 text-sm">
            <span className={`font-medium ${goalProgress >= 100 ? "text-emerald-400" : goalProgress >= 70 ? "text-amber-400" : "text-red-400"}`}>
              {goalProgress >= 100 ? "✓ Meta cumplida" : goalProgress >= 70 ? "En buen camino" : "Por debajo de meta"}
            </span>
            <span className="text-zinc-500">{goalProgress}%</span>
          </div>
        </div>
      )}

      {/* KPI Donuts — todos los modos los ven, distintos sets */}
      <KpiDonuts donuts={donuts} />

      {/* Exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">Exportación de datos</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => {
            const companyId = profile?.company_id
            if (!companyId) return
            fetch("/api/metrics/export", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId, type: "leads" })
            }).then(r => r.blob()).then(blob => {
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            })
          }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 text-sm hover:text-zinc-200 hover:border-zinc-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Leads
          </button>
          <button onClick={() => {
            const companyId = profile?.company_id
            if (!companyId) return
            fetch("/api/metrics/export", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId, type: "activities" })
            }).then(r => r.blob()).then(blob => {
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `actividades_${new Date().toISOString().split("T")[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            })
          }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 text-sm hover:text-zinc-200 hover:border-zinc-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Actividades
          </button>
          <button onClick={() => {
            const companyId = profile?.company_id
            if (!companyId) return
            fetch("/api/metrics/export", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId, type: "metrics" })
            }).then(r => r.blob()).then(blob => {
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `metricas_${new Date().toISOString().split("T")[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            })
          }} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 text-sm hover:text-zinc-200 hover:border-zinc-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Métricas
          </button>
        </div>
      </div>

      {/* Ranking de agentes - solo para director y gerente */}
      {(mode === "director" || mode === "gerente") && (
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Ranking de agentes</h2>
              <p className="text-sm text-zinc-500 mt-1">Desempeño por agente en el período actual</p>
            </div>
            {loadingMetrics && <Loader2 className="w-4 h-4 text-flugzz-accent animate-spin" />}
          </div>
          
          {rankingData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-left border-b border-zinc-800">
                    <th className="pb-3 font-medium">Agente</th>
                    <th className="pb-3 font-medium text-center">Leads</th>
                    <th className="pb-3 font-medium text-center">Ganados</th>
                    <th className="pb-3 font-medium text-center">Llamadas</th>
                    <th className="pb-3 font-medium text-center">Contactados</th>
                    <th className="pb-3 font-medium text-center">Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.map((agent: any, index: number) => (
                    <tr key={agent.agent_id} className="border-b border-zinc-800/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                            index === 1 ? "bg-zinc-400/20 text-zinc-300 border border-zinc-500/30" :
                            index === 2 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                            "bg-zinc-800 text-zinc-500"
                          }`}>{index + 1}</span>
                          <span className="text-zinc-200">{agent.agent_name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center text-zinc-300">{agent.total_leads}</td>
                      <td className="py-3 text-center text-emerald-400 font-medium">{agent.won_leads}</td>
                      <td className="py-3 text-center text-zinc-300">{agent.total_calls}</td>
                      <td className="py-3 text-center text-zinc-300">{agent.answered_calls}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          agent.conversion_rate >= 20 ? "bg-emerald-500/10 text-emerald-400" :
                          agent.conversion_rate >= 10 ? "bg-amber-500/10 text-amber-400" :
                          "bg-zinc-800 text-zinc-400"
                        }`}>{agent.conversion_rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loadingMetrics ? (
            <p className="text-zinc-500 text-sm">No hay datos de rendimiento disponibles.</p>
          ) : null}
        </div>
      )}

      {/* Velocidad de pipeline */}
      {velocityData.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Velocidad del pipeline</h2>
              <p className="text-sm text-zinc-500 mt-1">Tiempo promedio (días) en cada etapa</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {velocityData.map((stage: any) => (
              <div key={stage.stage_id} className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.stage_color || "#666" }} />
                  <span className="text-sm text-zinc-300 truncate">{stage.stage_name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-flugzz-accent">{stage.avg_days || 0}</span>
                  <span className="text-xs text-zinc-500">días promedio</span>
                </div>
                <div className="mt-2 text-xs text-zinc-600">
                  {stage.total_leads} transiciones • {stage.current_leads} actuales
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <BarList title="Embudo por etapa" subtitle="Lectura visual del pipeline dentro del alcance de este rol." items={stageBars} accent="bg-gradient-to-r from-cyan-500 to-blue-500" />

          {(mode === "director" || mode === "gerente" || mode === "coordinador") && (
            <ActorGrid
              title={mode === "coordinador" ? "Detalle por agente" : mode === "gerente" ? "Detalle por coordinación" : "Detalle por liderazgo"}
              subtitle={mode === "coordinador" ? "Actividad, cartera y saturación por asesor." : mode === "gerente" ? "Volumen, actividad y origen por coordinación." : "Vista transversal del rendimiento de líderes."}
              cards={actorCards} currency={currency}
            />
          )}

          {mode === "marketing" && (
            <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-lg font-semibold text-zinc-100">Integraciones y captación</h2><p className="text-sm text-zinc-500 mt-1">Estado de conectores e impacto en la captación.</p></div>
                <Link href="/integraciones" className="inline-flex items-center gap-2 text-sm text-flugzz-accent hover:text-cyan-300">Abrir integraciones <ArrowRight className="w-4 h-4" /></Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 mt-5">
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/78 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center"><Cable className="w-5 h-5 text-blue-300" /></div>
                    <div><p className="text-zinc-100 font-medium">{integration?.page_name || integration?.page_id || "Facebook Lead Ads"}</p><p className="text-xs text-zinc-500 mt-1">{integration?.is_active ? "Activo y listo para captar leads" : "Sin configuración activa"}</p></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/78 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-300" /></div>
                    <div><p className="text-zinc-100 font-medium">{sourceBars[0]?.label || "Sin fuente dominante"}</p><p className="text-xs text-zinc-500 mt-1">{sourceBars[0] ? `${sourceBars[0].value} leads en esta fuente` : "Conecta una fuente para medir"}</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SignalsPanel activities={scopeActivities.slice(0, 8)} />
          <BarList title="Fuentes principales" subtitle="Origen que está empujando el pipeline en esta vista." items={sourceBars} accent="bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl border border-flugzz-accent/20 bg-flugzz-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-flugzz-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Sugerencias de IA <span className="ml-1.5 rounded-md bg-flugzz-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-flugzz-accent">BETA</span></h2>
                <p className="text-sm text-zinc-500 mt-1">Acciones recomendadas para hoy basadas en tu cartera.</p>
              </div>
            </div>
            
            {loadingAiActions ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Analizando leads...
              </div>
            ) : aiActions.length > 0 ? (
              <div className="space-y-3">
                {aiActions.map((action: any) => (
                  <Link
                    key={action.lead_id}
                    href={`/leads/${action.lead_id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/60 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        action.action_type === "call" ? "bg-emerald-500/10 border border-emerald-500/20" :
                        action.action_type === "whatsapp" ? "bg-green-500/10 border border-green-500/20" :
                        action.action_type === "email" ? "bg-blue-500/10 border border-blue-500/20" :
                        action.action_type === "close" ? "bg-amber-500/10 border border-amber-500/20" :
                        "bg-zinc-800/50 border border-zinc-700"
                      }`}>
                        {action.action_type === "call" && <Phone className="w-4 h-4 text-emerald-400" />}
                        {action.action_type === "whatsapp" && <MessageCircle className="w-4 h-4 text-green-400" />}
                        {action.action_type === "email" && <Mail className="w-4 h-4 text-blue-400" />}
                        {action.action_type === "close" && <CheckCircle className="w-4 h-4 text-amber-400" />}
                        {action.action_type === "follow_up" && <Clock className="w-4 h-4 text-zinc-400" />}
                        {action.action_type === "waiting" && <Clock className="w-4 h-4 text-zinc-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{action.contact_name}</p>
                        <p className="text-xs text-zinc-500">{action.reason}</p>
                      </div>
                    </div>
                    {action.priority === "high" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Urgente</span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-500">No hay sugerencias pendientes.</p>
                <p className="text-xs text-zinc-600 mt-1">Todos tus leads están activos.</p>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-zinc-800/60">
              <Link href="/pipeline" className="inline-flex items-center gap-2 text-sm text-flugzz-accent hover:text-cyan-300">
                Ver todos los leads <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

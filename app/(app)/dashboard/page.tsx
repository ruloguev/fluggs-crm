"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import {
  Activity, ArrowRight, Building2, Cable, CircleDollarSign,
  Clock3, Loader2, PhoneOutgoing, TrendingUp, Users,
} from "lucide-react"
import { NeonDonut } from "@/components/dashboard/neon-donut"
import {
  contactacionPercent,
  conversionPercent,
  getClosedWonStageIds,
} from "@/lib/dashboard-kpis"

type PermissionMap = Record<string, boolean>

type RoleRecord = {
  id: string
  name: string
  level: number
  color: string
  permissions: PermissionMap
}

type ProfileRecord = {
  id: string
  full_name: string
  email: string | null
  is_active: boolean
  role_id: string | null
  role: RoleRecord | null
  team_memberships: { reports_to: string | null }[] | null
}

type LeadRecord = {
  id: string
  owner_id: string | null
  source_id: string | null
  stage_id: string | null
  budget_max: number | null
  currency: string | null
  created_at: string
  last_activity_at: string | null
}

type ActivityRecord = {
  id: string
  user_id: string | null
  type: string
  title: string | null
  body: string | null
  created_at: string
}

type SourceRecord = { id: string; name: string }
type StageRecord = { id: string; name: string; color: string | null; is_closed: boolean }
type IntegrationRecord = { page_id: string; page_name: string | null; is_active: boolean; last_synced_at: string | null }
type CompanyRecord = { default_currency: string | null }

type ScopeMetrics = {
  leadCount: number
  staleCount: number
  activities7d: number
  projectedValue: number
}

type ActorCard = {
  id: string
  name: string
  roleName: string
  leadCount: number
  staleCount: number
  activities7d: number
  projectedValue: number
  topSource: string
}

type DashboardMode = "director" | "gerente" | "coordinador" | "marketing" | "agente"

function formatCurrency(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function timeAgo(dateString: string) {
  const diffInSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diffInSeconds < 60) return "Hace un momento"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `Hace ${diffInHours} horas`
  return `Hace ${Math.floor(diffInHours / 24)} días`
}

function getDashboardMode(roleName: string, permissions: PermissionMap | undefined): DashboardMode {
  const normalized = roleName.toLowerCase()
  if (normalized.includes("director")) return "director"
  if (normalized.includes("gerente")) return "gerente"
  if (normalized.includes("coordin")) return "coordinador"
  if (normalized.includes("mkt") || normalized.includes("marketing")) return "marketing"
  if (permissions?.is_transversal) return "director"
  return "agente"
}

function MetricCard({
  icon: Icon,
  title,
  value,
  hint,
  accentClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string
  hint: string
  accentClass: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${accentClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-600">{hint}</span>
      </div>
      <p className="text-sm text-zinc-400 mt-4">{title}</p>
      <p className="text-3xl font-semibold tracking-tight text-zinc-100 mt-1">{value}</p>
    </div>
  )
}

function BarList({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string
  subtitle: string
  items: { label: string; value: number; helper?: string }[]
  accent: string
}) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 mb-2 text-sm">
              <span className="text-zinc-300">{item.label}</span>
              <span className="text-zinc-500">{item.helper ?? item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800/70 overflow-hidden">
              <div
                className={`h-full rounded-full ${accent}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-zinc-600">Sin datos suficientes todavía.</p>}
      </div>
    </div>
  )
}

function ActorGrid({
  title,
  subtitle,
  cards,
  currency,
}: {
  title: string
  subtitle: string
  cards: ActorCard[]
  currency: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-950/78 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-medium text-zinc-100">{card.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600 mt-1">{card.roleName}</p>
              </div>
              <span className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                {card.topSource}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3">
                <p className="text-zinc-500">Leads</p>
                <p className="text-xl font-semibold text-zinc-100 mt-1">{card.leadCount}</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3">
                <p className="text-zinc-500">Actividad 7d</p>
                <p className="text-xl font-semibold text-zinc-100 mt-1">{card.activities7d}</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3">
                <p className="text-zinc-500">Sin seguimiento</p>
                <p className="text-xl font-semibold text-amber-300 mt-1">{card.staleCount}</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3">
                <p className="text-zinc-500">Valor</p>
                <p className="text-base font-semibold text-zinc-100 mt-1">{formatCurrency(card.projectedValue, currency)}</p>
              </div>
            </div>
          </div>
        ))}
        {cards.length === 0 && <p className="text-sm text-zinc-600">Todavía no hay equipos asignados a este nivel.</p>}
      </div>
    </div>
  )
}

function SignalsPanel({ activities }: { activities: ActivityRecord[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-zinc-100 mb-5">Señales recientes</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
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

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile, role, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [stages, setStages] = useState<StageRecord[]>([])
  const [integration, setIntegration] = useState<IntegrationRecord | null>(null)
  const [company, setCompany] = useState<CompanyRecord | null>(null)
  const [snapshotAt, setSnapshotAt] = useState<number>(0)

  useEffect(() => {
    const companyId = profile?.company_id
    if (!companyId) return

    let cancelled = false
    async function loadDashboard() {
      setLoading(true)

      const [{ data: profileRows }, { data: leadRows }, { data: activityRows }, { data: sourceRows }, { data: stageRows }, { data: integrationRow }, { data: companyRow }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(`
              id, full_name, email, is_active, role_id,
              role:roles(id, name, level, color, permissions),
              team_memberships(reports_to)
            `)
            .eq("company_id", companyId)
            .eq("is_active", true),
          supabase
            .from("leads")
            .select("id, owner_id, source_id, stage_id, budget_max, currency, created_at, last_activity_at")
            .eq("company_id", companyId),
          supabase
            .from("activities")
            .select("id, user_id, type, title, body, created_at")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(80),
          supabase
            .from("lead_sources")
            .select("id, name")
            .eq("company_id", companyId),
          supabase
            .from("pipeline_stages")
            .select("id, name, color, is_closed")
            .eq("company_id", companyId)
            .order("position"),
          supabase
            .from("facebook_integrations")
            .select("page_id, page_name, is_active, last_synced_at")
            .eq("company_id", companyId)
            .single(),
          supabase
            .from("companies")
            .select("default_currency")
            .eq("id", companyId)
            .single(),
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
    return () => { cancelled = true }
  }, [profile?.company_id, supabase])

  const mode = useMemo(() => getDashboardMode(role?.name ?? "", role?.permissions), [role?.name, role?.permissions])
  const currency = company?.default_currency || "MXN"

  const reportsToMap = useMemo(() => {
    const map = new Map<string, string | null>()
    profiles.forEach((item) => {
      map.set(item.id, item.team_memberships?.[0]?.reports_to ?? null)
    })
    return map
  }, [profiles])

  const reportsByLeader = useMemo(() => {
    const map = new Map<string, string[]>()
    profiles.forEach((item) => {
      const managerId = reportsToMap.get(item.id)
      if (!managerId) return
      map.set(managerId, [...(map.get(managerId) ?? []), item.id])
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

  const scopeUserIds = (() => {
    if (!profile?.id) return []
    if (mode === "director" || mode === "marketing") return profiles.map((item) => item.id)
    if (mode === "gerente") return [profile.id, ...getDescendants(profile.id)]
    if (mode === "coordinador") return [profile.id, ...(reportsByLeader.get(profile.id) ?? [])]
    return [profile.id]
  })()

  const scopeLeadRecords = useMemo(
    () => leads.filter((lead) => lead.owner_id && scopeUserIds.includes(lead.owner_id)),
    [leads, scopeUserIds]
  )

  const scopeActivities = useMemo(
    () => activities.filter((activity) => activity.user_id && scopeUserIds.includes(activity.user_id)).slice(0, 8),
    [activities, scopeUserIds]
  )

  const scopeMetrics = useMemo<ScopeMetrics>(() => {
    const now = snapshotAt
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    return {
      leadCount: scopeLeadRecords.length,
      staleCount: scopeLeadRecords.filter((lead) => {
        if (!lead.last_activity_at) return true
        return now - new Date(lead.last_activity_at).getTime() > 3 * 24 * 60 * 60 * 1000
      }).length,
      activities7d: scopeActivities.filter((activity) => new Date(activity.created_at).getTime() >= sevenDaysAgo).length,
      projectedValue: scopeLeadRecords.reduce((sum, lead) => sum + Number(lead.budget_max || 0), 0),
    }
  }, [scopeActivities, scopeLeadRecords, snapshotAt])

  const wonStageIds = useMemo(() => getClosedWonStageIds(stages), [stages])

  const conversionPct = useMemo(
    () => conversionPercent(scopeLeadRecords, wonStageIds),
    [scopeLeadRecords, wonStageIds],
  )

  const contactacionPct = useMemo(
    () => contactacionPercent(scopeLeadRecords),
    [scopeLeadRecords],
  )

  const wonCount = useMemo(
    () =>
      scopeLeadRecords.filter(
        (l) => l.stage_id && wonStageIds.includes(l.stage_id),
      ).length,
    [scopeLeadRecords, wonStageIds],
  )

  const stageBars = useMemo(() => {
    return stages.map((stage) => ({
      label: stage.name,
      value: scopeLeadRecords.filter((lead) => lead.stage_id === stage.id).length,
      helper: `${scopeLeadRecords.filter((lead) => lead.stage_id === stage.id).length} leads`,
    })).filter((item) => item.value > 0)
  }, [scopeLeadRecords, stages])

  const sourceBars = useMemo(() => {
    return sources.map((source) => ({
      label: source.name,
      value: scopeLeadRecords.filter((lead) => lead.source_id === source.id).length,
      helper: `${scopeLeadRecords.filter((lead) => lead.source_id === source.id).length} captados`,
    })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [scopeLeadRecords, sources])

  const buildActorCard = useCallback((actorId: string): ActorCard | null => {
    const actor = profiles.find((item) => item.id === actorId)
    if (!actor) return null
    const actorLeads = leads.filter((lead) => lead.owner_id === actorId)
    const actorActivities = activities.filter((activity) => activity.user_id === actorId)
    const topSourceId = actorLeads.reduce<Record<string, number>>((acc, lead) => {
      if (!lead.source_id) return acc
      acc[lead.source_id] = (acc[lead.source_id] ?? 0) + 1
      return acc
    }, {})
    const topSource = Object.entries(topSourceId).sort((a, b) => b[1] - a[1])[0]?.[0]
    const sourceName = sources.find((source) => source.id === topSource)?.name ?? "Sin fuente"
    return {
      id: actor.id,
      name: actor.full_name,
      roleName: actor.role?.name ?? "Sin rol",
      leadCount: actorLeads.length,
      staleCount: actorLeads.filter((lead) => !lead.last_activity_at || snapshotAt - new Date(lead.last_activity_at).getTime() > 3 * 24 * 60 * 60 * 1000).length,
      activities7d: actorActivities.filter((activity) => snapshotAt - new Date(activity.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length,
      projectedValue: actorLeads.reduce((sum, lead) => sum + Number(lead.budget_max || 0), 0),
      topSource: sourceName,
    }
  }, [activities, leads, profiles, snapshotAt, sources])

  const actorCards = useMemo(() => {
    const targetIds =
      mode === "coordinador"
        ? reportsByLeader.get(profile?.id ?? "") ?? []
        : mode === "gerente"
          ? reportsByLeader.get(profile?.id ?? "") ?? []
          : mode === "director"
            ? profiles.filter((item) => (reportsByLeader.get(item.id) ?? []).length > 0).map((item) => item.id)
            : []

    return targetIds.map((id) => buildActorCard(id)).filter((item): item is ActorCard => Boolean(item))
  }, [buildActorCard, mode, profile?.id, profiles, reportsByLeader])

  const perspectiveTitle = useMemo(() => {
    if (mode === "director") return "Panorama directivo"
    if (mode === "gerente") return "Vista gerencial"
    if (mode === "coordinador") return "Vista de coordinación"
    if (mode === "marketing") return "Panel de marketing"
    return "Tablero operativo"
  }, [mode])

  const perspectiveDescription = useMemo(() => {
    if (mode === "director") return "Ves el rendimiento global, la salud del pipeline y el detalle por liderazgo."
    if (mode === "gerente") return "Ves el comportamiento de cada coordinación que te reporta y sus alertas comerciales."
    if (mode === "coordinador") return "Ves el rendimiento de cada agente, su actividad y los leads que requieren seguimiento."
    if (mode === "marketing") return "Ves captación, fuentes, integraciones y el pulso del origen de los leads."
    return "Ves tu cartera activa, tu actividad reciente y dónde se está frenando tu pipeline."
  }, [mode])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-full border border-flugzz-accent/20 bg-flugzz-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-flugzz-accent">
              {perspectiveTitle}
            </span>
            <span className="text-xs text-zinc-600">{role?.name ?? "Sin rol"}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100">
            Dashboard<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">{perspectiveDescription}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 px-4 py-3 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-600">Alcance actual</p>
          <p className="text-sm text-zinc-200 mt-1">{scopeUserIds.length} usuarios en este panel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Users} title="Leads en alcance" value={String(scopeMetrics.leadCount)} hint="cartera" accentClass="bg-violet-500/10 border-violet-500/20 text-violet-300" />
        <MetricCard icon={Activity} title="Actividad últimos 7 días" value={String(scopeMetrics.activities7d)} hint="movimiento" accentClass="bg-cyan-500/10 border-cyan-500/20 text-cyan-300" />
        <MetricCard icon={Clock3} title="Leads sin seguimiento" value={String(scopeMetrics.staleCount)} hint="alerta" accentClass="bg-amber-500/10 border-amber-500/20 text-amber-300" />
        <MetricCard icon={CircleDollarSign} title="Valor proyectado" value={formatCurrency(scopeMetrics.projectedValue, currency)} hint={currency} accentClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" />
      </div>

      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Rendimiento comercial</h2>
            <p className="text-sm text-zinc-500 mt-1 max-w-xl">
              <span className="text-zinc-300">Conversión</span>: leads en etapa «venta cerrada» (nombre sugerido para medir cierre). Si no tienes esa etapa, usamos todas las etapas marcadas como cerradas.
              {" "}
              <span className="text-zinc-300">Contactación</span>: leads con actividad en los últimos 7 días.
            </p>
            <p className="text-xs text-zinc-600 mt-3">
              Cierres contados: <span className="text-zinc-400">{wonCount}</span> · Base:{" "}
              <span className="text-zinc-400">{scopeLeadRecords.length}</span> leads en esta vista
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 lg:gap-14 shrink-0">
            <NeonDonut
              percent={conversionPct}
              label="Conversión"
              subtitle={`${wonCount} / ${scopeLeadRecords.length || 0} en venta cerrada`}
              variant="cyan"
            />
            <NeonDonut
              percent={contactacionPct}
              label="Contactación (7d)"
              subtitle="Leads con movimiento reciente"
              variant="emerald"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <BarList
            title="Embudo por etapa"
            subtitle="Lectura visual del pipeline dentro del alcance de este rol."
            items={stageBars}
            accent="bg-gradient-to-r from-cyan-500 to-blue-500"
          />

          {(mode === "director" || mode === "gerente" || mode === "coordinador") && (
            <ActorGrid
              title={mode === "coordinador" ? "Detalle por agente" : mode === "gerente" ? "Detalle por coordinación" : "Detalle por liderazgo"}
              subtitle={mode === "coordinador"
                ? "Cada tarjeta resume actividad, cartera y saturación de seguimiento por asesor."
                : mode === "gerente"
                  ? "Cada coordinación se resume con volumen, actividad y origen dominante."
                  : "Vista transversal del rendimiento de líderes con equipos activos."}
              cards={actorCards}
              currency={currency}
            />
          )}

          {mode === "marketing" && (
            <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Integraciones y captación</h2>
                  <p className="text-sm text-zinc-500 mt-1">Marketing ve el estado de los conectores y su impacto en la captación.</p>
                </div>
                <Link href="/integraciones" className="inline-flex items-center gap-2 text-sm text-flugzz-accent hover:text-cyan-300">
                  Abrir integraciones <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-5">
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/78 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-center">
                      <Cable className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-zinc-100 font-medium">{integration?.page_name || integration?.page_id || "Facebook Lead Ads"}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {integration?.is_active ? "Activo y listo para captar leads" : "Sin configuración activa"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/78 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-zinc-100 font-medium">{sourceBars[0]?.label || "Sin fuente dominante"}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {sourceBars[0] ? `${sourceBars[0].value} leads captados en esta fuente` : "Conecta una fuente para empezar a medir"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SignalsPanel activities={scopeActivities} />

          <BarList
            title="Fuentes principales"
            subtitle="Qué origen está empujando el pipeline dentro de esta vista."
            items={sourceBars}
            accent="bg-gradient-to-r from-emerald-500 to-teal-400"
          />

          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                {mode === "marketing" ? <Cable className="w-5 h-5 text-zinc-300" /> : mode === "director" ? <Building2 className="w-5 h-5 text-zinc-300" /> : mode === "coordinador" ? <Users className="w-5 h-5 text-zinc-300" /> : <PhoneOutgoing className="w-5 h-5 text-zinc-300" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Siguiente acción sugerida</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {mode === "marketing"
                    ? "Revisa integraciones activas y compara captación por fuente."
                    : mode === "director"
                      ? "Ataca primero a los equipos con más leads sin seguimiento."
                      : mode === "gerente"
                        ? "Entra al detalle de las coordinaciones con actividad baja."
                        : mode === "coordinador"
                          ? "Prioriza a los agentes con más leads estancados."
                          : "Haz seguimiento a tus leads sin actividad de más de 72 horas."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={mode === "marketing" ? "/integraciones" : "/pipeline"} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
                Abrir {mode === "marketing" ? "integraciones" : "pipeline"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={mode === "marketing" ? "/contactos" : "/ajustes/equipo"} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-700">
                {mode === "marketing" ? "Ver leads captados" : "Ver equipo"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

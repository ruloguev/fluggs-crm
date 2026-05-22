"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  Plus,
  Phone,
  MessageCircle,
  Clock3,
  AlertCircle,
  Loader2,
  MoveRight,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

const UNASSIGNED_STAGE_ID = "__unassigned__"
const LONG_PRESS_MS = 420

type Stage = {
  id: string
  name: string
  color: string
  position: number
  is_closed: boolean
}

type LeadMetadata = Record<string, unknown> | null

type Lead = {
  id: string
  title: string | null
  priority: "low" | "medium" | "high"
  budget_max: number | null
  currency: string
  last_activity_at: string
  stage_id: string | null
  owner_id: string | null
  metadata: LeadMetadata
  contact: {
    full_name: string | null
    phone: string | null
  } | null
  source: {
    name: string | null
    icon: string | null
    color: string | null
  } | null
  stale: boolean
  activity_label: string
}

type RawLead = Omit<Lead, "stale" | "activity_label">

type ContactRelation =
  | {
      full_name: string | null
      phone: string | null
    }
  | Array<{
      full_name: string | null
      phone: string | null
    }>
  | null

type SourceRelation =
  | {
      name: string | null
      icon: string | null
      color: string | null
    }
  | Array<{
      name: string | null
      icon: string | null
      color: string | null
    }>
  | null

type FetchedLead = {
  id: string
  title: string | null
  priority: string | null
  budget_max: number | null
  currency: string | null
  last_activity_at: string
  stage_id: string | null
  owner_id: string | null
  metadata: LeadMetadata
  contact: ContactRelation
  source: SourceRelation
}

type TeamProfile = {
  id: string
  full_name: string
  role: {
    name: string | null
  } | null
  team_memberships: {
    reports_to: string | null
  }[] | null
}

type TeamRoleRelation = { name: string | null } | Array<{ name: string | null }> | null
type FetchedTeamProfile = {
  id: string
  full_name: string
  role: TeamRoleRelation
  team_memberships: {
    reports_to: string | null
  }[] | null
}

type FocusLevel = "all" | "gerente" | "coordinador" | "agente"

type StageColumn = {
  id: string
  name: string
  color: string
  leads: Lead[]
}

const PRIORITY_STYLES = {
  high: "border-red-500/25 bg-red-500/10 text-red-300",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  low: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
} as const

function formatTimeAgo(timestamp: string) {
  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime())
  const minutes = Math.floor(diff / 60000)

  if (minutes < 60) return `${Math.max(1, minutes)}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`

  return `${Math.floor(hours / 24)}d`
}

function decorateLead(lead: RawLead): Lead {
  const lastActivity = new Date(lead.last_activity_at).getTime()
  const stale = Number.isFinite(lastActivity)
    ? Date.now() - lastActivity > 3 * 24 * 60 * 60 * 1000
    : false

  return {
    ...lead,
    stale,
    activity_label: formatTimeAgo(lead.last_activity_at),
  }
}

function normalizePriority(priority: string | null | undefined): Lead["priority"] {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority
  }

  return "medium"
}

function normalizeContact(contact: ContactRelation): RawLead["contact"] {
  if (Array.isArray(contact)) {
    return contact[0] ?? null
  }

  return contact
}

function normalizeSource(source: SourceRelation): RawLead["source"] {
  if (Array.isArray(source)) {
    return source[0] ?? null
  }

  return source
}

function normalizeLead(lead: FetchedLead): RawLead {
  return {
    id: lead.id,
    title: lead.title,
    priority: normalizePriority(lead.priority),
    budget_max: lead.budget_max,
    currency: lead.currency ?? "MXN",
    last_activity_at: lead.last_activity_at,
    stage_id: lead.stage_id,
    owner_id: lead.owner_id,
    metadata: lead.metadata,
    contact: normalizeContact(lead.contact),
    source: normalizeSource(lead.source),
  }
}

function getRoleScope(roleName: string | null | undefined): Exclude<FocusLevel, "all"> {
  const normalized = (roleName ?? "").toLowerCase()
  if (normalized.includes("gerente")) return "gerente"
  if (normalized.includes("coordin")) return "coordinador"
  return "agente"
}

function normalizeTeamProfile(profile: FetchedTeamProfile): TeamProfile {
  return {
    id: profile.id,
    full_name: profile.full_name,
    role: Array.isArray(profile.role) ? (profile.role[0] ?? null) : profile.role,
    team_memberships: profile.team_memberships,
  }
}

function getLeadDisplayName(lead: Lead) {
  return lead.contact?.full_name || lead.title || "Lead sin nombre"
}

function getBudgetLabel(lead: Lead) {
  if (!lead.budget_max) return null

  const amount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: lead.currency || "MXN",
    maximumFractionDigits: 0,
  }).format(lead.budget_max)

  return amount
}

function LeadQuickMoveDialog({
  lead,
  stages,
  movingLeadId,
  onOpenChange,
  onMove,
  onViewLead,
}: {
  lead: Lead | null
  stages: StageColumn[]
  movingLeadId: string | null
  onOpenChange: (open: boolean) => void
  onMove: (leadId: string, stageId: string | null) => Promise<void>
  onViewLead: (leadId: string) => void
}) {
  const currentStageId = lead?.stage_id ?? null

  return (
    <Dialog open={Boolean(lead)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Mover lead</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {lead ? `Selecciona la etapa para ${getLeadDisplayName(lead)}.` : "Selecciona una etapa."}
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-4">
              <p className="text-sm font-medium text-zinc-100">{getLeadDisplayName(lead)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Etapa actual: {stages.find((stage) => stage.id === (lead.stage_id ?? UNASSIGNED_STAGE_ID))?.name ?? "Sin etapa"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {stages.map((stage) => {
                const isCurrent = stage.id === (currentStageId ?? UNASSIGNED_STAGE_ID)
                const isMoving = movingLeadId === lead.id

                return (
                  <button
                    key={stage.id}
                    type="button"
                    disabled={isCurrent || isMoving}
                    onClick={() => void onMove(lead.id, stage.id === UNASSIGNED_STAGE_ID ? null : stage.id)}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      isCurrent
                        ? "border-flugzz-accent/40 bg-flugzz-accent/10"
                        : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900"
                    } ${isMoving ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                        <span className="truncate text-sm font-medium text-zinc-100">{stage.name}</span>
                      </div>
                      <span className="rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] text-zinc-500">
                        {stage.leads.length}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {isCurrent ? "Etapa actual" : "Mover con un toque"}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">Ver detalle completo</p>
                <p className="text-xs text-zinc-500">Abre el lead para editar, registrar actividad o subir expediente.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => onViewLead(lead.id)}
              >
                Ir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LeadCard({
  lead,
  index,
  draggable,
  onOpenLead,
  onOpenMove,
}: {
  lead: Lead
  index: number
  draggable: boolean
  onOpenLead: (leadId: string) => void
  onOpenMove: (lead: Lead) => void
}) {
  const timerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)
  const budgetLabel = getBudgetLabel(lead)
  const displayName = getLeadDisplayName(lead)
  const isFacebookLead =
    Boolean(lead.metadata?.facebook_lead_id) ||
    Boolean(lead.source?.name?.toLowerCase().includes("facebook"))

  function clearLongPress() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function startLongPress() {
    if (draggable) return
    clearLongPress()
    longPressTriggeredRef.current = false
    timerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      onOpenMove(lead)
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    clearLongPress()
  }

  function handleOpenLead() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    onOpenLead(lead.id)
  }

  const content = (
    <div
      className={`shadow-sm transition-all ${
        draggable
          ? lead.stale
            ? "rounded-xl border border-amber-500/20 bg-zinc-900 p-4 hover:border-amber-500/40"
            : "rounded-xl border border-zinc-800/60 bg-zinc-900 p-4 hover:border-zinc-700"
          : lead.stale
            ? "rounded-2xl border border-amber-500/20 bg-zinc-900 p-4 hover:border-amber-500/40"
            : "rounded-2xl border border-zinc-800/60 bg-zinc-900 p-4 hover:border-zinc-700"
      }`}
      onClick={handleOpenLead}
      onPointerDown={draggable ? undefined : startLongPress}
      onPointerUp={draggable ? undefined : cancelLongPress}
      onPointerLeave={draggable ? undefined : cancelLongPress}
      onPointerCancel={draggable ? undefined : cancelLongPress}
      onPointerMove={draggable ? undefined : cancelLongPress}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
          {lead.title && !draggable && <p className="mt-1 truncate text-xs text-zinc-500">{lead.title}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isFacebookLead && (
            <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
              fb
            </span>
          )}
          {lead.stale && <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
        </div>
      </div>

      {draggable && lead.title && (
        <p className="mt-1 truncate text-xs text-zinc-500">{lead.title}</p>
      )}

      <div className={`flex items-center justify-between gap-3 ${draggable ? "mt-3 mb-3" : "mt-3"}`}>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${PRIORITY_STYLES[lead.priority]}`}>
          {lead.priority === "high" ? "Alta" : lead.priority === "medium" ? "Media" : "Baja"}
        </span>
        {budgetLabel && (
          <span className={`font-medium text-zinc-400 ${draggable ? "text-[10px]" : "text-[11px]"}`}>{budgetLabel}</span>
        )}
      </div>

      <div className={`${draggable ? "" : "mt-4"} flex items-center justify-between border-t border-zinc-800/60 pt-3`}>
        <div className="flex items-center gap-1.5">
          {lead.contact?.phone && (
            <a
              href={`tel:${lead.contact.phone}`}
              onClick={(event) => event.stopPropagation()}
              className="rounded-xl bg-zinc-800/60 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-flugzz-accent"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {lead.contact?.phone && (
            <a
              href={`https://wa.me/${lead.contact.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="rounded-xl bg-zinc-800/60 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          {!draggable && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenMove(lead)
              }}
              className="rounded-xl bg-zinc-800/60 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <MoveRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock3 className="h-3 w-3" />
          {lead.activity_label}
        </div>
      </div>
    </div>
  )

  if (!draggable) {
    return content
  }

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={`cursor-grab active:cursor-grabbing ${
            snapshot.isDragging ? "scale-[1.02] rotate-[0.6deg]" : ""
          }`}
        >
          {content}
        </div>
      )}
    </Draggable>
  )
}

function StageColumnDesktop({
  stage,
  onCreateLead,
  onOpenLead,
  onOpenMove,
}: {
  stage: StageColumn
  onCreateLead: () => void
  onOpenLead: (leadId: string) => void
  onOpenMove: (lead: Lead) => void
}) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="truncate text-xs font-medium uppercase tracking-[0.24em] text-zinc-400">
            {stage.name}
          </span>
          <span className="rounded-full bg-zinc-900/70 px-2 py-0.5 text-[10px] text-zinc-500">
            {stage.leads.length}
          </span>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
          onClick={onCreateLead}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[160px] flex-1 space-y-2.5 rounded-3xl border p-2.5 transition-colors ${
              snapshot.isDraggingOver
                ? "border-flugzz-accent/30 bg-zinc-800/40"
                : "border-zinc-800/40 bg-zinc-900/20"
            }`}
          >
            {stage.leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                draggable
                onOpenLead={onOpenLead}
                onOpenMove={onOpenMove}
              />
            ))}
            {provided.placeholder}
            {stage.leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-xs text-zinc-700">
                Arrastra aqui
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

function MobileStagePanel({
  stage,
  onCreateLead,
  onOpenLead,
  onOpenMove,
  stageRef,
}: {
  stage: StageColumn
  onCreateLead: () => void
  onOpenLead: (leadId: string) => void
  onOpenMove: (lead: Lead) => void
  stageRef: (node: HTMLDivElement | null) => void
}) {
  return (
    <section
      ref={stageRef}
      className="snap-center shrink-0 w-[calc(100vw-2rem)] rounded-[28px] border border-zinc-800/60 bg-zinc-950/60 p-4 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
            <h2 className="truncate text-base font-semibold text-zinc-100">{stage.name}</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {stage.leads.length} lead{stage.leads.length === 1 ? "" : "s"} en esta etapa
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-zinc-100"
          onClick={onCreateLead}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-500">
        Desliza entre etapas. Mantén presionado un lead para moverlo rápido.
      </div>

      <div className="mt-4 max-h-[calc(100vh-18.5rem)] overflow-y-auto pr-1">
        {stage.leads.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-6 text-center text-sm text-zinc-600">
            Esta etapa está limpia por ahora.
          </div>
        ) : (
          <div className="space-y-3">
            {stage.leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={index}
                draggable={false}
                onOpenLead={onOpenLead}
                onOpenMove={onOpenMove}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function PipelinePage() {
  const supabase = createClient()
  const router = useRouter()
  const { profile } = useAuth()

  const [stages, setStages] = useState<Stage[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [profiles, setProfiles] = useState<TeamProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [activeMobileStageId, setActiveMobileStageId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<"all" | Lead["priority"]>("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [focusLevel, setFocusLevel] = useState<FocusLevel>("all")
  const [focusProfileId, setFocusProfileId] = useState("all")

  const mobileRailRef = useRef<HTMLDivElement | null>(null)
  const mobileStageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const mobileScrollTimeoutRef = useRef<number | null>(null)

  const loadPipeline = useCallback(async (companyId: string) => {
    setLoading(true)
    setError(null)

    const [
      { data: stagesData, error: stageError },
      { data: leadsData, error: leadError },
      { data: profileRows, error: profileError },
    ] = await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name, color, position, is_closed")
        .eq("company_id", companyId)
        .order("position"),
      supabase
        .from("leads")
        .select(`
          id,
          title,
          priority,
          budget_max,
          currency,
          last_activity_at,
          stage_id,
          owner_id,
          metadata,
          contact:contacts(full_name, phone),
          source:lead_sources(name, icon, color)
        `)
        .eq("company_id", companyId)
        .order("last_activity_at", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          role:roles(name),
          team_memberships(reports_to)
        `)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name"),
    ])

    if (stageError || leadError || profileError) {
      setError(stageError?.message || leadError?.message || profileError?.message || "No pudimos cargar el pipeline.")
      setLoading(false)
      return
    }

    setStages((stagesData as Stage[] | null) ?? [])
    setLeads(((leadsData as FetchedLead[] | null) ?? []).map(normalizeLead).map(decorateLead))
    setProfiles(((profileRows as FetchedTeamProfile[] | null) ?? []).map(normalizeTeamProfile))
    setLoading(false)
  }, [supabase])

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

  const getDescendants = useCallback((userId: string) => {
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

  const availableProfileOptions = useMemo(() => {
    if (focusLevel === "all") return []
    return profiles.filter((item) => getRoleScope(item.role?.name) === focusLevel)
  }, [focusLevel, profiles])

  const resolvedFocusProfileId =
    focusLevel !== "all" && availableProfileOptions.some((item) => item.id === focusProfileId)
      ? focusProfileId
      : "all"

  const scopedOwnerIds = useMemo(() => {
    if (focusLevel === "all" || resolvedFocusProfileId === "all") return null
    if (focusLevel === "gerente") return [resolvedFocusProfileId, ...getDescendants(resolvedFocusProfileId)]
    if (focusLevel === "coordinador") return [resolvedFocusProfileId, ...(reportsByLeader.get(resolvedFocusProfileId) ?? [])]
    return [resolvedFocusProfileId]
  }, [focusLevel, getDescendants, reportsByLeader, resolvedFocusProfileId])

  const filteredLeads = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase()

    return leads.filter((lead) => {
      if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false
      if (sourceFilter !== "all" && (lead.source?.name ?? "") !== sourceFilter) return false
      if (scopedOwnerIds && (!lead.owner_id || !scopedOwnerIds.includes(lead.owner_id))) return false

      if (!normalizedQuery) return true

      const searchable = [
        getLeadDisplayName(lead),
        lead.title ?? "",
        lead.source?.name ?? "",
      ].join(" ").toLowerCase()

      return searchable.includes(normalizedQuery)
    })
  }, [leads, priorityFilter, scopedOwnerIds, searchTerm, sourceFilter])

  const sourceOptions = useMemo(() => {
    return Array.from(new Set(leads.map((lead) => lead.source?.name).filter(Boolean))) as string[]
  }, [leads])

  const stageColumns = useMemo(() => {
    const activeStages = stages.filter((stage) => !stage.is_closed)
    const columns: StageColumn[] = activeStages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      leads: filteredLeads.filter((lead) => lead.stage_id === stage.id),
    }))

    const unassignedLeads = filteredLeads.filter((lead) => !lead.stage_id)
    if (unassignedLeads.length > 0) {
      columns.push({
        id: UNASSIGNED_STAGE_ID,
        name: "Sin etapa",
        color: "#71717a",
        leads: unassignedLeads,
      })
    }

    return columns
  }, [filteredLeads, stages])

  useEffect(() => {
    if (profile?.company_id) {
      const companyId = profile.company_id
      const timeoutId = window.setTimeout(() => {
        void loadPipeline(companyId)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [loadPipeline, profile?.company_id])

  function createLead() {
    router.push("/contactos?new=1")
  }

  function openLead(leadId: string) {
    router.push(`/leads/${leadId}`)
  }

  function syncActiveMobileStage() {
    const rail = mobileRailRef.current
    if (!rail) return

    const railCenter = rail.getBoundingClientRect().left + rail.clientWidth / 2
    let closestStageId = resolvedActiveMobileStageId
    let closestDistance = Number.POSITIVE_INFINITY

    for (const stage of stageColumns) {
      const node = mobileStageRefs.current[stage.id]
      if (!node) continue

      const rect = node.getBoundingClientRect()
      const cardCenter = rect.left + rect.width / 2
      const distance = Math.abs(cardCenter - railCenter)

      if (distance < closestDistance) {
        closestDistance = distance
        closestStageId = stage.id
      }
    }

    if (closestStageId && closestStageId !== resolvedActiveMobileStageId) {
      setActiveMobileStageId(closestStageId)
    }
  }

  function scrollToStage(stageId: string) {
    setActiveMobileStageId(stageId)
    mobileStageRefs.current[stageId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }

  function handleMobileRailScroll() {
    if (mobileScrollTimeoutRef.current) {
      window.clearTimeout(mobileScrollTimeoutRef.current)
    }

    mobileScrollTimeoutRef.current = window.setTimeout(() => {
      syncActiveMobileStage()
    }, 80)
  }

  async function moveLeadToStage(leadId: string, nextStageId: string | null) {
    const previousLeads = leads
    const now = new Date().toISOString()

    setMovingLeadId(leadId)
    setError(null)
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? decorateLead({
              ...lead,
              stage_id: nextStageId,
              last_activity_at: now,
            })
          : lead,
      ),
    )

    const { error: updateError } = await supabase
      .from("leads")
      .update({ stage_id: nextStageId, last_activity_at: now })
      .eq("id", leadId)

    if (updateError) {
      setLeads(previousLeads)
      setError(updateError.message)
    } else {
      setSelectedLead(null)
    }

    setMovingLeadId(null)
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return

    const nextStageId = result.destination.droppableId === UNASSIGNED_STAGE_ID
      ? null
      : result.destination.droppableId

    await moveLeadToStage(result.draggableId, nextStageId)
  }

  function setStageRef(stageId: string) {
    return (node: HTMLDivElement | null) => {
      mobileStageRefs.current[stageId] = node
    }
  }

  const totalStaleLeads = filteredLeads.filter((lead) => lead.stale).length
  const totalWithPhone = filteredLeads.filter((lead) => Boolean(lead.contact?.phone)).length
  const resolvedActiveMobileStageId =
    stageColumns.some((stage) => stage.id === activeMobileStageId)
      ? activeMobileStageId
      : (stageColumns[0]?.id ?? "")
  const hasDesktopFilters =
    searchTerm.trim().length > 0 ||
    priorityFilter !== "all" ||
    sourceFilter !== "all" ||
    focusLevel !== "all" ||
    focusProfileId !== "all"

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Pipeline<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {loading ? "Cargando..." : `${filteredLeads.length} leads visibles${hasDesktopFilters ? ` de ${leads.length}` : ""} y ${stageColumns.length} etapas`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 md:flex-none"
            onClick={createLead}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Leads activos", value: filteredLeads.length.toString() },
          { label: "Sin seguimiento", value: totalStaleLeads.toString() },
          { label: "Con telefono", value: totalWithPhone.toString() },
          { label: "Etapas visibles", value: stageColumns.length.toString() },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">{item.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="hidden rounded-3xl border border-zinc-800/50 bg-zinc-900/40 p-4 md:block">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_180px_200px_180px_240px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar lead, contacto u origen"
              className="border-zinc-800 bg-zinc-950 pl-9 text-zinc-100"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
          >
            <option value="all">Todas las prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
          >
            <option value="all">Todos los orígenes</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          <select
            value={focusLevel}
            onChange={(event) => {
              setFocusLevel(event.target.value as FocusLevel)
              setFocusProfileId("all")
            }}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
          >
            <option value="all">Todo el equipo</option>
            <option value="gerente">Gerencia</option>
            <option value="coordinador">Coordinación</option>
            <option value="agente">Agente</option>
          </select>

          <select
            value={resolvedFocusProfileId}
            onChange={(event) => setFocusProfileId(event.target.value)}
            disabled={focusLevel === "all"}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none disabled:opacity-50"
          >
            <option value="all">
              {focusLevel === "all" ? "Sin filtro por responsable" : `Selecciona ${focusLevel}`}
            </option>
            {availableProfileOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.full_name}</option>
            ))}
          </select>

          <Button
            type="button"
            variant="ghost"
            disabled={!hasDesktopFilters}
            className="border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 disabled:opacity-40"
            onClick={() => {
              setSearchTerm("")
              setPriorityFilter("all")
              setSourceFilter("all")
              setFocusLevel("all")
              setFocusProfileId("all")
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-flugzz-accent" />
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {stageColumns.map((stage) => {
                    const isActive = stage.id === resolvedActiveMobileStageId
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => scrollToStage(stage.id)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm transition-all ${
                      isActive
                        ? "border-flugzz-accent/30 bg-flugzz-accent/10 text-zinc-100"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                      <span className="rounded-full bg-zinc-950/70 px-1.5 py-0.5 text-[10px] text-zinc-500">
                        {stage.leads.length}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div
              ref={mobileRailRef}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              onScroll={handleMobileRailScroll}
            >
              {stageColumns.map((stage) => (
                <MobileStagePanel
                  key={stage.id}
                  stage={stage}
                  onCreateLead={createLead}
                  onOpenLead={openLead}
                  onOpenMove={setSelectedLead}
                  stageRef={setStageRef(stage.id)}
                />
              ))}
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 overflow-x-auto pb-4 md:block">
            <DragDropContext onDragEnd={(result) => void onDragEnd(result)}>
              <div
                className="flex h-full items-start gap-5"
                style={{ minWidth: `${Math.max(stageColumns.length, 1) * 320}px` }}
              >
                {stageColumns.map((stage) => (
                  <StageColumnDesktop
                    key={stage.id}
                    stage={stage}
                    onCreateLead={createLead}
                    onOpenLead={openLead}
                    onOpenMove={setSelectedLead}
                  />
                ))}
              </div>
            </DragDropContext>
          </div>
        </>
      )}

      <LeadQuickMoveDialog
        lead={selectedLead}
        stages={stageColumns}
        movingLeadId={movingLeadId}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null)
        }}
        onMove={moveLeadToStage}
        onViewLead={openLead}
      />
    </div>
  )
}

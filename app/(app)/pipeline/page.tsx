"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Plus, Phone, MessageCircle, Clock, AlertCircle, Loader2, ChevronDown, Check, Search, X, Filter, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { computeScope } from "@/lib/role-scope"

type Stage = { id: string; name: string; color: string; position: number; is_closed: boolean }
type Lead = {
  id: string; title: string | null; project: string | null; priority: "low" | "medium" | "high"
  budget_max: number | null; currency: string; last_activity_at: string
  stage_id: string | null; metadata: any; owner_id: string | null; source_id: string | null
  lead_tags: string[] | null
  contact: { id: string; full_name: string; phone: string | null }
  source: { id: string; name: string; icon: string | null; color: string | null } | null
}
type Source = { id: string; name: string; icon: string | null; color: string | null }
type TeamMember = { id: string; full_name: string; role_level: number }

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}d`
}

const P_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

const LeadCard = React.memo(function LeadCard({ lead, index, stages, supabase, profileId, companyId, onLeadUpdate }: {
  lead: Lead; index: number
  stages: Stage[]
  supabase: ReturnType<typeof createClient>
  profileId: string
  companyId: string
  onLeadUpdate: (leadId: string, patch: Partial<Lead>) => void
}) {
  const router = useRouter()
  const stale = Date.now() - new Date(lead.last_activity_at).getTime() > 3*86400*1000
  const isFb = lead.metadata?.facebook_lead_id || lead.source?.name?.toLowerCase().includes("facebook")

  async function handleCall(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!lead.contact.phone) return
    window.location.href = `tel:${lead.contact.phone}`
    const now = new Date().toISOString()
    await supabase.from("activities").insert({
      company_id: companyId,
      user_id: profileId,
      lead_id: lead.id,
      contact_id: lead.contact.id,
      type: "call",
      title: "Llamada saliente",
      body: `Llamada iniciada a ${lead.contact.phone}`,
      call_status: "answered",
      created_at: now,
    })
    await supabase.from("leads").update({ last_activity_at: now }).eq("id", lead.id)
    onLeadUpdate(lead.id, { last_activity_at: now })
  }

  async function handleWhatsApp(e: React.MouseEvent) {
    e.stopPropagation()
    const phone = lead.contact.phone?.replace(/\D/g, "")
    if (!phone) return
    window.open(`https://wa.me/${phone}`, "_blank")
    const now = new Date().toISOString()
    await supabase.from("activities").insert({
      company_id: companyId,
      user_id: profileId,
      lead_id: lead.id,
      contact_id: lead.contact.id,
      type: "whatsapp",
      title: "Mensaje de WhatsApp",
      body: `Conversación iniciada con ${lead.contact.full_name}`,
      created_at: now,
    })
    await supabase.from("leads").update({ last_activity_at: now }).eq("id", lead.id)
    onLeadUpdate(lead.id, { last_activity_at: now })
  }

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => router.push(`/leads/${lead.id}`)}
          className={`group bg-zinc-950/75 border rounded-xl p-3 cursor-pointer transition-all ${
            snapshot.isDragging
              ? "border-flugzz-accent/60 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
              : "border-zinc-800/55 hover:border-zinc-700/75"
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate leading-snug">
                {lead.contact.full_name}
              </p>
              {lead.title && (
                <p className="text-xs text-zinc-500 truncate mt-0.5">{lead.title}</p>
              )}
            </div>
            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${P_STYLES[lead.priority]}`}>
              {lead.priority === "high" ? "Alta" : lead.priority === "medium" ? "Media" : "Baja"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-1.5">
              {isFb && (
                <div className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-blue-400">f</span>
                </div>
              )}
              {lead.budget_max && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  ${lead.budget_max.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {stale && <AlertCircle className="w-3.5 h-3.5 text-amber-500/70" />}
              <div className="flex items-center gap-1 text-zinc-600 text-[11px]">
                <Clock className="w-3 h-3" />
                {timeAgo(lead.last_activity_at)}
              </div>
              {lead.contact.phone && (
                <button
                  type="button"
                  title={`Llamar a ${lead.contact.phone}`}
                  onClick={handleCall}
                  className="p-1.5 rounded-lg bg-zinc-800/75 text-zinc-400 hover:text-flugzz-accent hover:bg-zinc-800 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                title="WhatsApp"
                onClick={handleWhatsApp}
                className="p-1.5 rounded-lg bg-zinc-800/75 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
)}
    </Draggable>
  )
})

// ── Scope filter dropdown ───────────────────────────────────────
function ScopeDropdown({ label, options, selectedId, onSelect, storageKey }: {
  label: string
  options: { id: string; name: string; isSelf?: boolean }[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  storageKey?: string
}) {
  const [open, setOpen] = useState(false)
  const current = options.find(o => o.id === selectedId)
  
  // Persist filter selection in sessionStorage for iOS
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      if (selectedId !== null) {
        sessionStorage.setItem(storageKey, selectedId)
      } else {
        sessionStorage.removeItem(storageKey)
      }
    }
  }, [selectedId, storageKey])
  
  if (options.length === 0) return null
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm hover:border-zinc-700 transition-colors min-h-[44px]"
        style={{ touchAction: 'manipulation' }}>
        <span className="text-zinc-400 text-xs">{label}:</span>
        <span className="text-zinc-200 font-medium">{current?.name ?? "Todos"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
      </button>
      {open && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setOpen(false)}
            style={{ willChange: 'opacity', WebkitTapHighlightColor: 'transparent' }}
          />
          <div 
            className="absolute top-full mt-1 left-0 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-[200px] max-h-[70vh] overflow-y-auto"
            style={{ willChange: 'transform' }}
          >
            <button onClick={() => { onSelect(null); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors min-h-[44px] ${!selectedId ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"}`}>
              Todos
              {!selectedId && <Check className="w-3.5 h-3.5 ml-auto text-flugzz-accent" />}
            </button>
            {options.map(o => (
              <button key={o.id} onClick={() => { onSelect(o.id); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors min-h-[44px] ${selectedId === o.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"}`}
                style={{ touchAction: 'manipulation' }}>
                {o.isSelf ? (
                  <div className="w-7 h-7 rounded-full bg-flugzz-accent/20 flex items-center justify-center text-[10px] font-bold text-flugzz-accent shrink-0">
                    Yo
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                    {o.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                  </div>
                )}
                <span className="truncate">{o.name}</span>
                {selectedId === o.id && <Check className="w-3.5 h-3.5 ml-auto text-flugzz-accent shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [allTags, setAllTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const supabase = createClient()
  const router = useRouter()
  const { profile, role } = useAuth()

  const scope = computeScope(profile?.id ?? null, role ?? null, teamMembers)
  const isLeader = scope.isLeader || scope.isTransversal

  useEffect(() => {
    setIsMounted(true)
    // Restore filter from sessionStorage (iOS fix)
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('pipeline-filter')
      if (saved) setFilterMemberId(saved)
    }
    if (profile?.company_id && profile?.id) {
      void loadAll(profile.company_id, profile.id)
    }
  }, [profile?.company_id, profile?.id])

  async function loadAll(companyId: string, userId: string) {
    setLoading(true)
    // Load stages + all leads + team for hierarchy
    const [{ data: s }, { data: l }, { data: memberships }, { data: sourceRows }] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("company_id", companyId).order("position"),
      supabase.from("leads").select(`
        id,title,project,priority,budget_max,currency,last_activity_at,stage_id,metadata,owner_id,source_id,lead_tags,
        contact:contacts(id,full_name,phone),
        source:lead_sources(id,name,icon,color)
      `).eq("company_id", companyId).order("last_activity_at", { ascending: false }).limit(500),
      supabase.from("team_memberships").select("user_id, reports_to").eq("company_id", companyId),
      supabase.from("lead_sources").select("id, name, icon, color").eq("company_id", companyId).order("name"),
    ])
    setStages(s ?? [])
    setAllLeads((l as Lead[] | null) ?? [])
    setSources((sourceRows as Source[] | null) ?? [])

    // Collect all unique tags from leads
    const tagsSet = new Set<string>()
    ;(l as Lead[] | null)?.forEach(lead => {
      if (lead.lead_tags) {
        lead.lead_tags.forEach(tag => tagsSet.add(tag))
      }
    })
    setAllTags(Array.from(tagsSet).sort())

    // Build hierarchy tree
    if ((isLeader || scope.canViewTeam) && memberships) {
      const reportsByLeader = new Map<string, string[]>()
      memberships.forEach((m: any) => {
        if (!m.reports_to) return
        reportsByLeader.set(m.reports_to, [...(reportsByLeader.get(m.reports_to) ?? []), m.user_id])
      })
      // Recursive descendants
      function getDescendants(id: string): string[] {
        const q = [...(reportsByLeader.get(id) ?? [])]
        const res: string[] = []
        while (q.length) {
          const cur = q.shift()!
          if (res.includes(cur)) continue
          res.push(cur)
          q.push(...(reportsByLeader.get(cur) ?? []))
        }
        return res
      }
      const descendants = getDescendants(userId)
      // Load profiles of direct reports for filter dropdown
      if (descendants.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, role_id, role:roles(level)")
          .in("id", descendants)
        const members: TeamMember[] = (profiles ?? []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          role_level: p.role?.level ?? 99,
        }))
        setTeamMembers(members)
      }
    }
    setLoading(false)
  }

  // Compute scope user ids based on permissions + hierarchy + filter
  const scopeIds = useMemo(() => {
    if (!profile?.id) return []
    
    // Agente (nivel 4+): solo sus propios leads
    if (!isLeader) return [profile.id]
    
    // PRIMERO: si hay filtro activo por usuario, respetarlo SIEMPRE
    if (filterMemberId) {
      return [filterMemberId]
    }
    
    // Transversal: ve todos los miembros de la empresa
    if (scope.isTransversal) {
      return [profile.id, ...teamMembers.map(m => m.id)]
    }
    
    // Líder con jerarquía: ve sus propios leads + equipo
    return [profile.id, ...teamMembers.map(m => m.id)]
  }, [profile?.id, isLeader, scope.isTransversal, teamMembers, filterMemberId])

  const visibleLeads = useMemo(() => {
    return allLeads.filter(l => {
      if (!l.owner_id || !scopeIds.includes(l.owner_id)) return false
      if (filterSource && l.source_id !== filterSource) return false
      if (filterPriority && l.priority !== filterPriority) return false
      if (filterTag && (!l.lead_tags || !l.lead_tags.includes(filterTag))) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          l.contact?.full_name?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q) ||
          l.project?.toLowerCase().includes(q) ||
          l.contact?.phone?.includes(q)
        )
      }
      return true
    })
  }, [allLeads, scopeIds, filterSource, filterPriority, filterTag, searchQuery])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStageId = destination.droppableId === "__unassigned__" ? null : destination.droppableId
    
    const lead = allLeads.find(l => l.id === draggableId)
    
    setAllLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage_id: newStageId } : l))
    
    await (supabase as any).from("leads")
      .update({ stage_id: newStageId, last_activity_at: new Date().toISOString() })
      .eq("id", draggableId)
    
    if (lead?.stage_id || newStageId) {
      await (supabase as any).from("activities").insert({
        company_id: profile?.company_id,
        lead_id: draggableId,
        contact_id: lead?.contact?.id,
        user_id: profile?.id,
        type: "stage_change",
        title: "Etapa cambiada",
        from_stage_id: lead?.stage_id,
        to_stage_id: newStageId,
        completed_at: new Date().toISOString(),
      })
    }
  }

  if (!isMounted) return null
  const activeStages = stages.filter(s => !s.is_closed)
  const unassignedLeads = visibleLeads.filter(l => !l.stage_id)

  // Filter options for dropdown - incluir "Yo" + todos los miembros del equipo
  const filterOptions = [
    { id: profile?.id ?? "", name: "Yo", isSelf: true },
    ...teamMembers.map(m => ({ id: m.id, name: m.full_name, isSelf: false })),
  ]

  const filterLabel = role?.level === 1 ? "Gerente/Coordinador"
    : role?.level === 2 ? "Coordinador"
    : "Agente"

  return (
    <div className="flex flex-col h-full space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Pipeline<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {loading ? "Cargando..." : `${visibleLeads.length} leads en vista`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                viewMode === "kanban" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                viewMode === "list" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <List className="w-4 h-4" /> Lista
            </button>
          </div>
          {filterOptions.length > 1 && (
            <ScopeDropdown
              label={filterLabel}
              options={filterOptions}
              selectedId={filterMemberId}
              onSelect={setFilterMemberId}
              storageKey="pipeline-filter"
            />
          )}
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => router.push("/contactos?new=1")}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl pl-9 pr-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
        {sources.length > 0 && (
          <select
            value={filterSource ?? ""}
            onChange={e => setFilterSource(e.target.value || null)}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-1.5 text-sm text-zinc-400 outline-none focus:border-zinc-700 cursor-pointer"
          >
            <option value="">Todas las fuentes</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>
        )}
        <select
          value={filterPriority ?? ""}
          onChange={e => setFilterPriority(e.target.value || null)}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-1.5 text-sm text-zinc-400 outline-none focus:border-zinc-700 cursor-pointer"
        >
          <option value="">Todas las prioridades</option>
          <option value="high">🔴 Alta</option>
          <option value="medium">🟡 Media</option>
          <option value="low">🟢 Baja</option>
        </select>
        {allTags.length > 0 && (
          <select
            value={filterTag ?? ""}
            onChange={e => setFilterTag(e.target.value || null)}
            className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-1.5 text-sm text-zinc-400 outline-none focus:border-zinc-700 cursor-pointer"
          >
            <option value="">Todas las etiquetas</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
        {(filterSource || filterPriority || filterTag || searchQuery) && (
          <button
            onClick={() => { setFilterSource(null); setFilterPriority(null); setFilterTag(null); setSearchQuery("") }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-200 border border-zinc-800/60 hover:border-zinc-700 transition-colors"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto pb-4 scrollbar-hide kanban-board">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="kanban-container flex gap-4 h-full items-start" style={{ minWidth: `${activeStages.length * 300}px` }}>
              {activeStages.map(stage => {
                const stageLeads = visibleLeads.filter(l => l.stage_id === stage.id)
                return (
                  <div key={stage.id} className="kanban-column w-72 flex-shrink-0 flex flex-col gap-2">
                    <div className="kanban-header flex items-center justify-between px-3 py-2.5 bg-zinc-900/95 rounded-xl border border-zinc-800/50 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider truncate">{stage.name}</span>
                        <span className="text-xs text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded-full shrink-0">{stageLeads.length}</span>
                      </div>
                      <button className="text-zinc-500 hover:text-zinc-200 p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors" onClick={() => router.push("/contactos?new=1")}><Plus className="w-4 h-4" /></button>
                    </div>
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}
                          className={`kanban-cards flex-1 flex flex-col gap-2 p-2 rounded-xl border min-h-[200px] overflow-y-auto ${
                            snapshot.isDraggingOver ? "bg-zinc-800/40 border-flugzz-accent/30" : "bg-zinc-900/30 border-zinc-800/40"
                          }`}>
                          {stageLeads.map((lead, i) => (
                            <LeadCard key={lead.id} lead={lead} index={i}
                              stages={stages} supabase={supabase}
                              profileId={profile?.id ?? ""} companyId={profile?.company_id ?? ""}
                              onLeadUpdate={(id, patch) => setAllLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } as Lead : l))}
                            />
                          ))}
                          {provided.placeholder}
                          {stageLeads.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-1 flex items-center justify-center py-12">
                              <p className="text-xs text-zinc-600">Arrastra aquí</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}

              {unassignedLeads.length > 0 && (
                <div className="w-72 flex-shrink-0 flex flex-col gap-2">
                  <div className="kanban-header flex items-center justify-between px-3 py-2.5 bg-zinc-900/95 rounded-xl border border-zinc-800/50 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-zinc-500" />
                      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider truncate">Sin etapa</span>
                      <span className="text-xs text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded-full shrink-0">{unassignedLeads.length}</span>
                    </div>
                  </div>
                  <Droppable droppableId="__unassigned__">
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}
                        className={`kanban-cards flex-1 flex flex-col gap-2 p-2 rounded-xl border min-h-[200px] overflow-y-auto ${
                          snapshot.isDraggingOver ? "bg-zinc-800/40 border-flugzz-accent/30" : "bg-zinc-900/30 border-zinc-800/40"
                        }`}>
                        {unassignedLeads.map((lead, i) => (
                          <LeadCard key={lead.id} lead={lead} index={i}
                            stages={stages} supabase={supabase}
                            profileId={profile?.id ?? ""} companyId={profile?.company_id ?? ""}
                            onLeadUpdate={(id, patch) => setAllLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } as Lead : l))}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </div>
          </DragDropContext>
        </div>
      ) : null}

      {/* Vista de lista (tabla) */}
      {viewMode === "list" && (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-800/50 bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm mobile-table-cards">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left hidden sm:table-row">
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  <th className="px-4 py-3 font-medium">Prioridad</th>
                  <th className="px-4 py-3 font-medium">Presupuesto</th>
                  <th className="px-4 py-3 font-medium">Última actividad</th>
                  <th className="px-4 py-3 font-medium">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No hay leads que mostrar
                    </td>
                  </tr>
                ) : (
                  visibleLeads.map(lead => {
                    const leadStage = stages.find(s => s.id === lead.stage_id)
                    return (
                      <tr 
                        key={lead.id} 
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3" data-label="Contacto">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                              {lead.contact?.full_name?.substring(0, 2).toUpperCase() ?? "??"}
                            </div>
                            <span className="text-zinc-200 font-medium">{lead.contact?.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300" data-label="Título">{lead.title || lead.project || "-"}</td>
                        <td className="px-4 py-3" data-label="Etapa">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: leadStage?.color ?? "#666" }} />
                            <span className="text-zinc-400 text-xs">{leadStage?.name ?? "Sin etapa"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" data-label="Prioridad">
                          <span className={`text-xs px-2 py-1 rounded-md border ${
                            lead.priority === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            lead.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
                            {lead.priority === "high" ? "Alta" : lead.priority === "medium" ? "Media" : "Baja"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 font-mono text-xs" data-label="Presupuesto">
                          {lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs" data-label="Actividad">{timeAgo(lead.last_activity_at)}</td>
                        <td className="px-4 py-3" data-label="Fuente">
                          {lead.source && (
                            <span className="text-xs text-zinc-400">{lead.source.name}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
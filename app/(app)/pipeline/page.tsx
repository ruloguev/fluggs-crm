"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Plus, Phone, MessageCircle, Clock, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

type Stage = { id: string; name: string; color: string; position: number; is_closed: boolean }

type Lead = {
  id: string; title: string | null; priority: 'low' | 'medium' | 'high'
  budget_max: number | null; currency: string; last_activity_at: string
  stage_id: string | null; metadata: any
  contact: { full_name: string; phone: string | null }
  source: { name: string; icon: string | null; color: string | null } | null
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}d`
}

const P_STYLES = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

function LeadCard({ lead, index }: { lead: Lead; index: number }) {
  const router = useRouter()
  const stale = Date.now() - new Date(lead.last_activity_at).getTime() > 3*86400*1000
  const isFb = lead.metadata?.facebook_lead_id || lead.source?.name?.toLowerCase().includes('facebook')

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={`p-4 rounded-xl border shadow-sm transition-all select-none cursor-grab active:cursor-grabbing ${
            snapshot.isDragging
              ? "bg-zinc-800 border-zinc-600 shadow-xl shadow-black/50 scale-[1.02] rotate-1"
              : stale ? "bg-zinc-950/95 border-amber-500/35 hover:border-amber-500/50 shadow-black/20"
              : "bg-zinc-950/95 border-zinc-800/70 hover:border-zinc-600 shadow-black/15"
          }`}
          onClick={() => !snapshot.isDragging && router.push(`/leads/${lead.id}`)}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-zinc-100 text-sm leading-snug">{lead.contact.full_name}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {isFb && <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded">fb</span>}
              {stale && <AlertCircle className="w-3 h-3 text-amber-400" aria-label="Sin actividad +3 días" />}
            </div>
          </div>

          {lead.title && <p className="text-xs text-zinc-500 truncate mb-3">{lead.title}</p>}

          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${P_STYLES[lead.priority]}`}>
              {lead.priority === 'high' ? 'Alta' : lead.priority === 'medium' ? 'Media' : 'Baja'}
            </span>
            {lead.budget_max && (
              <span className="text-[10px] text-zinc-500 font-mono">
                ${(lead.budget_max/1000000).toFixed(1)}M
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
            <div className="flex gap-1.5">
              {lead.contact.phone && (
                <a href={`tel:${lead.contact.phone}`} onClick={e=>e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-zinc-800/75 text-zinc-400 hover:text-flugzz-accent hover:bg-zinc-800 transition-all">
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
              {lead.contact.phone && (
                <a href={`https://wa.me/${lead.contact.phone?.replace(/\D/g,'')}`} target="_blank"
                  onClick={e=>e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-zinc-800/75 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-all">
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center text-[10px] text-zinc-600 gap-1">
              <Clock className="w-3 h-3" />{timeAgo(lead.last_activity_at)}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { profile } = useAuth()

  useEffect(() => {
    setIsMounted(true)
    if (profile?.company_id) {
      void loadPipeline(profile.company_id)
    }
  }, [profile?.company_id])

  async function loadPipeline(companyId: string) {
    setLoading(true)
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from('pipeline_stages').select('*').eq('company_id', companyId).order('position'),
      supabase.from('leads').select(`
        id,title,priority,budget_max,currency,last_activity_at,stage_id,metadata,
        contact:contacts(full_name,phone),
        source:lead_sources(name,icon,color)
      `).eq('company_id', companyId).order('last_activity_at', { ascending: false }).limit(200),
    ])
    setStages(s ?? [])
    setLeads((l as any) ?? [])
    setLoading(false)
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStageId = destination.droppableId === "__unassigned__" ? null : destination.droppableId
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage_id: newStageId } : l))
    await (supabase as any).from('leads')
      .update({ stage_id: newStageId, last_activity_at: new Date().toISOString() })
      .eq('id', draggableId)
  }

  if (!isMounted) return null
  const activeStages = stages.filter(s => !s.is_closed)
  const unassignedLeads = leads.filter(l => !l.stage_id)

  return (
    <div className="h-full flex flex-col space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Pipeline<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {loading ? 'Cargando...' : `${leads.length} leads activos`}
          </p>
        </div>
        <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => router.push("/contactos?new=1")}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Lead
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4 scrollbar-hide">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 h-full items-start" style={{ minWidth: `${activeStages.length * 300}px` }}>
              {activeStages.map(stage => {
                const stageLeads = leads.filter(l => l.stage_id === stage.id)
                return (
                  <div key={stage.id} className="w-72 flex-shrink-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{stage.name}</span>
                        <span className="text-xs text-zinc-600 bg-zinc-900/75 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                      </div>
                      <button className="text-zinc-600 hover:text-zinc-300 p-1" onClick={() => router.push("/contactos?new=1")}><Plus className="w-3.5 h-3.5" /></button>
                    </div>

                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}
                          className={`flex-1 min-h-[120px] flex flex-col gap-2.5 p-2 rounded-xl border transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-zinc-800/55 border-flugzz-accent/35"
                              : "bg-zinc-900/40 border-zinc-800/45"
                          }`}>
                          {stageLeads.map((lead, i) => <LeadCard key={lead.id} lead={lead} index={i} />)}
                          {provided.placeholder}
                          {stageLeads.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-1 flex items-center justify-center py-8">
                              <p className="text-xs text-zinc-700">Arrastra aquí</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}

              {unassignedLeads.length > 0 && (
                <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-500" />
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sin etapa</span>
                      <span className="text-xs text-zinc-600 bg-zinc-900/75 px-1.5 py-0.5 rounded-full">{unassignedLeads.length}</span>
                    </div>
                  </div>
                  <Droppable droppableId="__unassigned__">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 min-h-[120px] flex flex-col gap-2.5 p-2 rounded-xl border transition-colors ${
                          snapshot.isDraggingOver
                            ? "bg-zinc-800/55 border-flugzz-accent/35"
                            : "bg-zinc-900/40 border-zinc-800/45"
                        }`}
                      >
                        {unassignedLeads.map((lead, i) => <LeadCard key={lead.id} lead={lead} index={i} />)}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  )
}

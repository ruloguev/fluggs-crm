"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import {
  ArrowLeft, Phone, MessageCircle, Mail, MapPin, Clock,
  Plus, ChevronDown, Edit2, Check, X, Loader2, FileText,
  PhoneCall, PhoneMissed, PhoneOff, Voicemail, User,
  AlertCircle, Star, MoreHorizontal, ExternalLink,
  Navigation, StickyNote, Calendar
} from "lucide-react"

// ── tipos ─────────────────────────────────────────────────────
type Stage = { id: string; name: string; color: string; position: number; is_closed: boolean }
type Source = { id: string; name: string; icon: string | null; color: string | null }
type Contact = { id: string; full_name: string; phone: string | null; whatsapp: string | null; email: string | null }
type Activity = {
  id: string; type: string; title: string | null; body: string | null
  call_duration_secs: number | null; call_status: string | null
  visit_address: string | null; file_url: string | null; file_name: string | null
  from_stage: { name: string; color: string } | null
  to_stage: { name: string; color: string } | null
  user: { full_name: string } | null
  created_at: string
}
type Lead = {
  id: string; title: string | null; project: string | null
  priority: "low" | "medium" | "high"; budget_min: number | null; budget_max: number | null
  currency: string; expected_close_date: string | null; lost_reason: string | null
  last_activity_at: string; created_at: string; metadata: any
  contact: Contact; stage: Stage | null; source: Source | null
  owner: { full_name: string; email: string } | null
}

// ── helpers ───────────────────────────────────────────────────
function fmt(d: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d))
}
function fmtDuration(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
}
function fmtMoney(n: number, cur = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n)
}
function relTime(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return "ahora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`
  return fmt(d)
}

const PRIORITY_MAP = {
  high: { label: "Alta", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  medium: { label: "Media", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  low: { label: "Baja", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
}

// ── Activity icon ─────────────────────────────────────────────
function ActivityIcon({ type, callStatus }: { type: string; callStatus?: string | null }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
  if (type === "call") {
    if (callStatus === "answered") return <div className={`${base} bg-emerald-500/10 border-emerald-500/20`}><PhoneCall className="w-3.5 h-3.5 text-emerald-400" /></div>
    if (callStatus === "no_answer") return <div className={`${base} bg-red-500/10 border-red-500/20`}><PhoneMissed className="w-3.5 h-3.5 text-red-400" /></div>
    if (callStatus === "voicemail") return <div className={`${base} bg-purple-500/10 border-purple-500/20`}><Voicemail className="w-3.5 h-3.5 text-purple-400" /></div>
    if (callStatus === "busy") return <div className={`${base} bg-zinc-500/10 border-zinc-500/20`}><PhoneOff className="w-3.5 h-3.5 text-zinc-400" /></div>
    return <div className={`${base} bg-blue-500/10 border-blue-500/20`}><Phone className="w-3.5 h-3.5 text-blue-400" /></div>
  }
  if (type === "whatsapp") return <div className={`${base} bg-emerald-500/10 border-emerald-500/20`}><MessageCircle className="w-3.5 h-3.5 text-emerald-400" /></div>
  if (type === "email") return <div className={`${base} bg-blue-500/10 border-blue-500/20`}><Mail className="w-3.5 h-3.5 text-blue-400" /></div>
  if (type === "visit") return <div className={`${base} bg-amber-500/10 border-amber-500/20`}><Navigation className="w-3.5 h-3.5 text-amber-400" /></div>
  if (type === "note") return <div className={`${base} bg-zinc-700/50 border-zinc-700`}><StickyNote className="w-3.5 h-3.5 text-zinc-400" /></div>
  if (type === "stage_change") return <div className={`${base} bg-flugzz-accent/10 border-flugzz-accent/20`}><Check className="w-3.5 h-3.5 text-flugzz-accent" /></div>
  if (type === "file_upload") return <div className={`${base} bg-zinc-700/50 border-zinc-700`}><FileText className="w-3.5 h-3.5 text-zinc-400" /></div>
  return <div className={`${base} bg-zinc-700/50 border-zinc-700`}><User className="w-3.5 h-3.5 text-zinc-400" /></div>
}

// ── Activity item ─────────────────────────────────────────────
function ActivityItem({ act }: { act: Activity }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <ActivityIcon type={act.type} callStatus={act.call_status} />
        <div className="w-px flex-1 bg-zinc-800/60 my-1" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {act.type === "stage_change" && act.from_stage && act.to_stage ? (
              <p className="text-sm text-zinc-300">
                Movido de{" "}
                <span className="font-medium" style={{ color: act.from_stage.color }}>{act.from_stage.name}</span>
                {" → "}
                <span className="font-medium" style={{ color: act.to_stage.color }}>{act.to_stage.name}</span>
              </p>
            ) : (
              <p className="text-sm font-medium text-zinc-200">{act.title || act.type}</p>
            )}
            {act.call_duration_secs != null && (
              <p className="text-xs text-zinc-500 mt-0.5">Duración: {fmtDuration(act.call_duration_secs)}</p>
            )}
            {act.body && (
              <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed whitespace-pre-wrap">{act.body}</p>
            )}
            {act.visit_address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(act.visit_address)}`} target="_blank"
                className="flex items-center gap-1.5 text-xs text-amber-400 mt-1.5 hover:text-amber-300">
                <MapPin className="w-3 h-3" />{act.visit_address}
              </a>
            )}
            {act.file_url && (
              <a href={act.file_url} target="_blank"
                className="flex items-center gap-1.5 text-xs text-blue-400 mt-1.5 hover:text-blue-300">
                <FileText className="w-3 h-3" />{act.file_name || "Archivo"}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-zinc-600">{relTime(act.created_at)}</p>
            {act.user && <p className="text-[10px] text-zinc-700 mt-0.5">{act.user.full_name.split(" ")[0]}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Log Activity Sheet ────────────────────────────────────────
type LogType = "call" | "whatsapp" | "email" | "visit" | "note"

function LogActivitySheet({
  leadId, contactId, companyId, onClose, onSaved
}: { leadId: string; contactId: string; companyId: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<LogType>("call")
  const [note, setNote] = useState("")
  const [callStatus, setCallStatus] = useState<string>("answered")
  const [duration, setDuration] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const TYPES: { id: LogType; label: string; icon: React.ReactNode }[] = [
    { id: "call", label: "Llamada", icon: <Phone className="w-4 h-4" /> },
    { id: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-4 h-4" /> },
    { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
    { id: "visit", label: "Visita", icon: <Navigation className="w-4 h-4" /> },
    { id: "note", label: "Nota", icon: <StickyNote className="w-4 h-4" /> },
  ]

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const durSecs = duration ? parseInt(duration) * 60 : null

    const payload: any = {
      company_id: companyId, lead_id: leadId, contact_id: contactId,
      user_id: user!.id, type,
      title: type === "call" ? `Llamada ${callStatus === "answered" ? "contestada" : callStatus === "no_answer" ? "sin respuesta" : callStatus === "voicemail" ? "buzón" : "ocupado"}`
        : type === "whatsapp" ? "Mensaje de WhatsApp"
        : type === "email" ? "Email enviado"
        : type === "visit" ? "Visita registrada"
        : "Nota",
      body: note || null,
      completed_at: new Date().toISOString(),
    }

    if (type === "call") {
      payload.call_status = callStatus
      payload.call_duration_secs = durSecs
    }

    await (supabase as any).from("activities").insert(payload)
    await (supabase as any).from("leads")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", leadId)

    setSaving(false)
    onSaved()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto md:max-w-lg md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:bottom-8 md:border">

        <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-zinc-100 font-medium">Registrar actividad</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border whitespace-nowrap transition-all ${
                type === t.id ? "bg-zinc-100 text-zinc-900 border-zinc-100" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Call-specific */}
        {type === "call" && (
          <div className="space-y-3 mb-4">
            <div>
              <p className="text-xs text-zinc-500 mb-2">Estado de la llamada</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "answered", label: "Contestó", icon: <PhoneCall className="w-3.5 h-3.5" />, cls: "text-emerald-400 border-emerald-500/30" },
                  { id: "no_answer", label: "No contestó", icon: <PhoneMissed className="w-3.5 h-3.5" />, cls: "text-red-400 border-red-500/30" },
                  { id: "voicemail", label: "Buzón de voz", icon: <Voicemail className="w-3.5 h-3.5" />, cls: "text-purple-400 border-purple-500/30" },
                  { id: "busy", label: "Ocupado", icon: <PhoneOff className="w-3.5 h-3.5" />, cls: "text-zinc-400 border-zinc-700" },
                ].map(s => (
                  <button key={s.id} onClick={() => setCallStatus(s.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                      callStatus === s.id ? `bg-zinc-800 ${s.cls}` : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    }`}>
                    {s.icon}{s.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number" placeholder="Duración (minutos)" value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700"
            />
          </div>
        )}

        {/* Note / body */}
        <textarea
          placeholder={type === "note" ? "Escribe tu nota..." : "Notas adicionales (opcional)"}
          value={note} onChange={e => setNote(e.target.value)} rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700 resize-none mb-4"
        />

        <button onClick={save} disabled={saving}
          className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium disabled:opacity-40 transition-opacity">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Guardar actividad"}
        </button>
      </div>
    </>
  )
}

// ── Stage Selector ────────────────────────────────────────────
function StageSelector({ current, stages, leadId, companyId, contactId, onChanged }: {
  current: Stage | null; stages: Stage[]; leadId: string
  companyId: string; contactId: string; onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function changeStage(newStage: Stage) {
    if (newStage.id === current?.id) { setOpen(false); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    await Promise.all([
      (supabase as any).from("leads")
        .update({ stage_id: newStage.id, last_activity_at: new Date().toISOString() })
        .eq("id", leadId),
      (supabase as any).from("activities").insert({
        company_id: companyId, lead_id: leadId, contact_id: contactId,
        user_id: user!.id, type: "stage_change",
        title: `Etapa cambiada`,
        from_stage_id: current?.id ?? null,
        to_stage_id: newStage.id,
        completed_at: new Date().toISOString(),
      })
    ])

    setLoading(false)
    setOpen(false)
    onChanged()
  }

  const active = stages.filter(s => !s.is_closed)
  const closed = stages.filter(s => s.is_closed)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" /> : (
          <>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current?.color ?? "#666" }} />
            <span className="text-sm font-medium text-zinc-200">{current?.name ?? "Sin etapa"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[200px]">
            {active.length > 0 && (
              <div className="p-1">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1.5">Activas</p>
                {active.map(s => (
                  <button key={s.id} onClick={() => changeStage(s)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      s.id === current?.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:bg-zinc-900"
                    }`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                    {s.id === current?.id && <Check className="w-3.5 h-3.5 ml-auto text-zinc-500" />}
                  </button>
                ))}
              </div>
            )}
            {closed.length > 0 && (
              <div className="p-1 border-t border-zinc-800/60">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1.5">Cerradas</p>
                {closed.map(s => (
                  <button key={s.id} onClick={() => changeStage(s)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      s.id === current?.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"
                    }`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}{s.is_closed && " (Cerrado)"}
                    
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────
export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [lead, setLead] = useState<Lead | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"timeline" | "info">("timeline")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [id])
  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus() }, [editingTitle])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single()
    setCompanyId(profile?.company_id ?? null)

    const [{ data: leadData }, { data: stagesData }, { data: activitiesData }] = await Promise.all([
      supabase.from("leads").select(`
        id, title, project, priority, budget_min, budget_max, currency,
        expected_close_date, lost_reason, last_activity_at, created_at, metadata,
        contact:contacts(id, full_name, phone, whatsapp, email),
        stage:pipeline_stages(*),
        source:lead_sources(id, name, icon, color),
        owner:profiles(full_name, email)
      `).eq("id", id).single(),

      supabase.from("pipeline_stages").select("*").eq("company_id", profile?.company_id).order("position"),

      (supabase as any).from("activities").select(`
        id, type, title, body, call_duration_secs, call_status,
        visit_address, file_url, file_name, created_at,
        from_stage:pipeline_stages!from_stage_id(name, color),
        to_stage:pipeline_stages!to_stage_id(name, color),
        user:profiles(full_name)
      `).eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
    ])

    setLead(leadData as any)
    setStages(stagesData ?? [])
    setActivities(activitiesData ?? [])
    setTitleDraft(leadData?.title ?? "")
    setLoading(false)
  }

  async function saveTitle() {
    if (!lead) return
    setEditingTitle(false)
    if (titleDraft === lead.title) return
    await (supabase as any).from("leads").update({ title: titleDraft }).eq("id", id)
    setLead(l => l ? { ...l, title: titleDraft } : l)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
    </div>
  )

  if (!lead) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <AlertCircle className="w-10 h-10 text-zinc-600" />
      <p className="text-zinc-400">Lead no encontrado</p>
      <button onClick={() => router.push("/pipeline")} className="text-sm text-flugzz-accent hover:underline">Volver al pipeline</button>
    </div>
  )

  const contact = lead.contact
  const priority = PRIORITY_MAP[lead.priority]

  return (
    <div className="max-w-3xl mx-auto space-y-0 animate-in fade-in duration-300">

      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => router.push("/pipeline")}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Pipeline
        </button>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-400 text-sm truncate">{contact.full_name}</span>
      </div>

      {/* ── HEADER CARD ── */}
      <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/60 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {/* Contact name */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                {contact.full_name.substring(0, 2).toUpperCase()}
              </div>
              <h1 className="text-xl font-semibold text-zinc-100">{contact.full_name}</h1>
            </div>

            {/* Editable title */}
            <div className="flex items-center gap-1.5 ml-10">
              {editingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <input ref={titleRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false) }}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none"
                    placeholder="Título del lead"
                  />
                  <button onClick={saveTitle} className="p-1 rounded hover:bg-zinc-700"><Check className="w-3.5 h-3.5 text-emerald-400" /></button>
                  <button onClick={() => setEditingTitle(false)} className="p-1 rounded hover:bg-zinc-700"><X className="w-3.5 h-3.5 text-zinc-500" /></button>
                </div>
              ) : (
                <button onClick={() => setEditingTitle(true)}
                  className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm group transition-colors">
                  <span className="truncate">{lead.title || "Agregar título"}</span>
                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${priority.cls}`}>{priority.label}</span>
            {lead.source && (
              <span className="text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400"
                style={{ borderColor: lead.source.color ? `${lead.source.color}30` : undefined }}>
                {lead.source.icon} {lead.source.name}
              </span>
            )}
          </div>
        </div>

        {/* Stage selector */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <StageSelector
            current={lead.stage} stages={stages} leadId={id}
            companyId={companyId ?? ""} contactId={contact.id}
            onChanged={loadData}
          />
          <div className="flex items-center text-xs text-zinc-600 gap-1">
            <Clock className="w-3 h-3" />
            {relTime(lead.last_activity_at)}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 text-sm transition-all">
              <Phone className="w-3.5 h-3.5" /> Llamar
            </a>
          )}
          {(contact.whatsapp || contact.phone) && (
            <a href={`https://wa.me/${(contact.whatsapp || contact.phone)?.replace(/\D/g, "")}`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-400 text-sm transition-all">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-blue-500/40 text-zinc-300 hover:text-blue-400 text-sm transition-all">
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
          )}
          <button onClick={() => setShowLog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-sm font-medium transition-all ml-auto">
            <Plus className="w-3.5 h-3.5" /> Registrar
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 p-1 bg-zinc-900/40 border border-zinc-800/40 rounded-xl w-fit mb-4">
        {(["timeline", "info"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {t === "timeline" ? "Actividad" : "Información"}
          </button>
        ))}
      </div>

      {/* ── TIMELINE ── */}
      {activeTab === "timeline" && (
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/40 p-5">
          {activities.length === 0 ? (
            <div className="text-center py-10 text-zinc-600">
              <StickyNote className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin actividad registrada</p>
              <button onClick={() => setShowLog(true)} className="text-flugzz-accent text-sm hover:underline mt-2">
                Registrar primera actividad
              </button>
            </div>
          ) : (
            <div>
              {activities.map((act, i) => (
                <div key={act.id} style={i === activities.length - 1 ? { "--last": "1" } as any : {}}>
                  {i === activities.length - 1 ? (
                    <div className="flex gap-3">
                      <ActivityIcon type={act.type} callStatus={act.call_status} />
                      <div className="pb-2 flex-1 min-w-0">
                        {/* same content without the line */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {act.type === "stage_change" && act.from_stage && act.to_stage ? (
                              <p className="text-sm text-zinc-300">
                                Movido de <span className="font-medium" style={{ color: act.from_stage.color }}>{act.from_stage.name}</span>
                                {" → "}<span className="font-medium" style={{ color: act.to_stage.color }}>{act.to_stage.name}</span>
                              </p>
                            ) : <p className="text-sm font-medium text-zinc-200">{act.title || act.type}</p>}
                            {act.call_duration_secs != null && <p className="text-xs text-zinc-500 mt-0.5">Duración: {fmtDuration(act.call_duration_secs)}</p>}
                            {act.body && <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed whitespace-pre-wrap">{act.body}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-zinc-600">{relTime(act.created_at)}</p>
                            {act.user && <p className="text-[10px] text-zinc-700 mt-0.5">{act.user.full_name.split(" ")[0]}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ActivityItem act={act} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INFO ── */}
      {activeTab === "info" && (
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/40 p-5 space-y-5">
          {/* Contact info */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Datos de contacto</p>
            <div className="space-y-2">
              {[
                { label: "Nombre", value: contact.full_name },
                { label: "Teléfono", value: contact.phone, href: `tel:${contact.phone}` },
                { label: "WhatsApp", value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp?.replace(/\D/g, "")}` },
                { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
              ].map(({ label, value, href }) => value ? (
                <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="text-sm text-zinc-500">{label}</span>
                  {href ? (
                    <a href={href} className="text-sm text-zinc-200 hover:text-flugzz-accent transition-colors">{value}</a>
                  ) : (
                    <span className="text-sm text-zinc-200">{value}</span>
                  )}
                </div>
              ) : null)}
            </div>
          </div>

          {/* Deal info */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Oportunidad</p>
            <div className="space-y-2">
              {[
                { label: "Proyecto", value: lead.project },
                { label: "Presupuesto", value: (lead.budget_min || lead.budget_max) ? `${lead.budget_min ? fmtMoney(lead.budget_min, lead.currency) : ""}${lead.budget_min && lead.budget_max ? " – " : ""}${lead.budget_max ? fmtMoney(lead.budget_max, lead.currency) : ""}` : null },
                { label: "Cierre esperado", value: lead.expected_close_date ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lead.expected_close_date)) : null },
                { label: "Agente", value: lead.owner?.full_name },
                { label: "Fuente", value: lead.source ? `${lead.source.icon ?? ""} ${lead.source.name}`.trim() : null },
                { label: "Creado", value: fmt(lead.created_at) },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="text-sm text-zinc-500">{label}</span>
                  <span className="text-sm text-zinc-200">{value}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Facebook metadata */}
          {lead.metadata?.facebook_lead_id && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Facebook Lead Ads</p>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                {lead.metadata.facebook_form_id && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Form ID</span>
                    <span className="text-zinc-300 font-mono text-xs">{lead.metadata.facebook_form_id}</span>
                  </div>
                )}
                {lead.metadata.form_fields && Object.entries(lead.metadata.form_fields).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-300 text-xs">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Activity Sheet */}
      {showLog && companyId && (
        <LogActivitySheet
          leadId={id} contactId={contact.id} companyId={companyId}
          onClose={() => setShowLog(false)}
          onSaved={() => { setShowLog(false); loadData() }}
        />
      )}
    </div>
  )
}

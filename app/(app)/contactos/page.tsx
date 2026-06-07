"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { computeScope } from "@/lib/role-scope"
import {
  ArrowUpRight, Check, ChevronDown, Download, Filter, Loader2, Mail, Phone, Plus, Search, X,
} from "lucide-react"

type Stage = { id: string; name: string; color: string | null; position: number; is_closed: boolean }
type Source = { id: string; name: string; icon: string | null; color: string | null }
type TeamMember = { id: string; full_name: string; role_level: number }
type LeadRow = {
  id: string
  owner_id: string | null
  title: string | null
  priority: "low" | "medium" | "high"
  budget_max: number | null
  currency: string | null
  deal_type: "sale" | "rent" | "sale_rent"
  created_at: string
  contact: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
  } | null
  stage: { name: string; color: string | null } | null
  source: { name: string } | null
  owner: { id: string; full_name: string } | null
}

type CompanySettings = {
  default_currency: string | null
  allowed_currencies: string[] | null
}

const PRIORITY_STYLES = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

const DEAL_TYPE_LABELS = {
  sale: "Venta",
  rent: "Renta",
  sale_rent: "Venta y renta",
}

function formatMoney(value: number | null, currency = "MXN") {
  if (!value) return "Sin presupuesto"
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ContactosPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, role } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    title: "",
    project: "",
    source_id: "",
    stage_id: "",
    priority: "medium" as "low" | "medium" | "high",
    budget_max: "",
    currency: "MXN",
    deal_type: "sale" as "sale" | "rent" | "sale_rent",
  })

  const scope = computeScope(profile?.id ?? null, role ?? null, teamMembers)
  const isLeader = scope.isLeader || scope.isTransversal

  const loadData = useCallback(async (companyId: string) => {
    setLoading(true)

    const [{ data: leadRows }, { data: stageRows }, { data: sourceRows }, { data: companyRow }, { data: memberships }] = await Promise.all([
      supabase
        .from("leads")
        .select(`
          id, owner_id, title, priority, budget_max, currency, deal_type, created_at,
          contact:contacts(id, full_name, email, phone),
          stage:pipeline_stages(name, color),
          source:lead_sources(name),
          owner:profiles(id, full_name)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("pipeline_stages")
        .select("id, name, color, position, is_closed")
        .eq("company_id", companyId)
        .order("position"),
      supabase
        .from("lead_sources")
        .select("id, name, icon, color")
        .eq("company_id", companyId)
        .order("name"),
      supabase
        .from("companies")
        .select("default_currency, allowed_currencies")
        .eq("id", companyId)
        .single(),
      supabase
        .from("team_memberships")
        .select("user_id, reports_to")
        .eq("company_id", companyId),
    ])

    const settings = (companyRow as CompanySettings | null) ?? null
    const nextStages = (stageRows as Stage[] | null) ?? []
    const nextSources = (sourceRows as Source[] | null) ?? []

    setLeads((leadRows as LeadRow[] | null) ?? [])
    setStages(nextStages)
    setSources(nextSources)
    setCompanySettings(settings)

    // Build hierarchy tree for filter dropdown
    if (profile?.id && (isLeader || scope.canViewTeam) && memberships) {
      const reportsByLeader = new Map<string, string[]>()
      memberships.forEach((m: any) => {
        if (!m.reports_to) return
        reportsByLeader.set(m.reports_to, [...(reportsByLeader.get(m.reports_to) ?? []), m.user_id])
      })
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
      const descendants = getDescendants(profile.id)
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

    setFormData((prev) => ({
      ...prev,
      source_id: prev.source_id || nextSources[0]?.id || "",
      stage_id: prev.stage_id || nextStages.find((stage) => !stage.is_closed)?.id || "",
      currency: settings?.default_currency || "MXN",
    }))
    setLoading(false)
  }, [supabase, profile?.id, isLeader, scope.canViewTeam])

  useEffect(() => {
    // Restore filter from sessionStorage (iOS fix)
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('contactos-filter')
      if (saved) setFilterMemberId(saved)
    }
    if (profile?.company_id) {
      const companyId = profile.company_id
      const timeoutId = window.setTimeout(() => {
        void loadData(companyId)
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [loadData, profile?.company_id])

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)

    if (params.get("new") === "1") {
      window.history.replaceState({}, "", window.location.pathname)
      const timeoutId = window.setTimeout(() => {
        setIsOpen(true)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [])

  async function handleSaveLead(event: React.FormEvent) {
    event.preventDefault()
    if (!profile?.company_id) return

    setSaving(true)
    setError(null)

    const { data: authUser } = await supabase.auth.getUser()
    const userId = authUser.user?.id
    let stageId = formData.stage_id

    if (!stageId) {
      const { data: existingStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("is_closed", false)
        .order("position")
        .limit(1)
        .single()

      stageId = existingStage?.id ?? ""

      if (!stageId) {
        const { data: createdStage } = await supabase
          .from("pipeline_stages")
          .insert({
            company_id: profile.company_id,
            name: "Nuevo",
            color: "#22D3EE",
            position: 1,
            is_closed: false,
          })
          .select("id")
          .single()

        stageId = createdStage?.id ?? ""
      }
    }

    const { data: contactData, error: contactError } = await supabase
      .from("contacts")
      .insert({
        company_id: profile.company_id,
        owner_id: userId,
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        whatsapp: formData.phone.trim() || null,
        source_id: formData.source_id || null,
      })
      .select("id")
      .single()

    if (contactError || !contactData) {
      setError(contactError?.message ?? "No se pudo crear el contacto.")
      setSaving(false)
      return
    }

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert({
        company_id: profile.company_id,
        contact_id: contactData.id,
        owner_id: userId,
        source_id: formData.source_id || null,
        stage_id: stageId || null,
        title: formData.title.trim() || `${formData.full_name.trim()} — Lead`,
        project: formData.project.trim() || null,
        priority: formData.priority,
        budget_max: formData.budget_max ? Number(formData.budget_max) : null,
        currency: formData.currency || companySettings?.default_currency || "MXN",
        deal_type: formData.deal_type,
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (leadError || !leadData) {
      setError(leadError?.message ?? "No se pudo crear el lead.")
      setSaving(false)
      return
    }

    // Crear notificación de nuevo lead (fire-and-forget, no bloquea el flujo)
    if (userId && profile.company_id) {
      import('@/lib/push-notifications').then(({ createNotificationWithPush }) => {
        createNotificationWithPush({
          company_id: profile.company_id!,
          user_id: userId,
          lead_id: leadData.id,
          type: "lead_created",
          title: "📋 Nuevo lead asignado",
          body: `Se te ha asignado el lead ${formData.full_name.trim()} (${formData.priority === "high" ? "prioridad alta" : "prioridad normal"})`,
        }).catch(() => {}) // Silenciar errores
      }).catch(() => {})
    }

    await supabase.from("activities").insert({
      company_id: profile.company_id,
      lead_id: leadData.id,
      contact_id: contactData.id,
      user_id: userId,
      type: "system",
      title: "Lead registrado manualmente",
      body: "Capturado desde el panel de contactos.",
    })

    setFormData({
      full_name: "",
      email: "",
      phone: "",
      title: "",
      project: "",
      source_id: sources[0]?.id || "",
      stage_id: stageId || stages.find((stage) => !stage.is_closed)?.id || "",
      priority: "medium",
      budget_max: "",
      currency: companySettings?.default_currency || "MXN",
      deal_type: "sale",
    })
    setIsOpen(false)
    setSaving(false)
    await loadData(profile.company_id)
    router.push(`/leads/${leadData.id}`)
  }

  // Filter options for dropdown
  const filterOptions = [
    { id: profile?.id ?? "", name: "Yo", isSelf: true },
    ...teamMembers.map(m => ({ id: m.id, name: m.full_name, isSelf: false })),
  ]

  // Compute scope user ids
  const scopeIds = useMemo(() => {
    if (!profile?.id) return []
    if (!isLeader) return [profile.id]
    if (filterMemberId) return [filterMemberId]
    if (scope.isTransversal) return [profile.id, ...teamMembers.map(m => m.id)]
    return [profile.id, ...teamMembers.map(m => m.id)]
  }, [profile?.id, isLeader, scope.isTransversal, teamMembers, filterMemberId])

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return leads.filter((lead) => {
      // Filter by user scope
      if (!lead.owner_id || !scopeIds.includes(lead.owner_id)) return false
      // Filter by search query
      if (query) {
        const values = [
          lead.contact?.full_name,
          lead.contact?.email,
          lead.contact?.phone,
          lead.title,
          lead.source?.name,
          lead.owner?.full_name,
        ]
        if (!values.some((value) => value?.toLowerCase().includes(query))) return false
      }
      return true
    })
  }, [leads, searchTerm, scopeIds])

  const allowedCurrencies = companySettings?.allowed_currencies?.length
    ? companySettings.allowed_currencies
    : ["MXN"]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Contactos y leads</h1>
          <p className="text-sm text-zinc-400 mt-1">Registra prospectos reales y empújalos directo al pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl">
              <DialogHeader>
                <DialogTitle>Registrar nuevo lead</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Crea el contacto y la oportunidad comercial en un solo paso.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveLead} className="space-y-5 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-zinc-300">Nombre completo</Label>
                    <Input id="full_name" required value={formData.full_name}
                      onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                      placeholder="Ej. Juan Perez"
                      className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-zinc-300">Título del lead</Label>
                    <Input id="title" value={formData.title}
                      onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                      placeholder="Ej. Interés por lote premium"
                      className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Correo electrónico</Label>
                    <Input id="email" type="email" value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      placeholder="juan@ejemplo.com"
                      className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-zinc-300">Teléfono</Label>
                    <Input id="phone" value={formData.phone}
                      onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                      placeholder="+52 55 0000 0000"
                      className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project" className="text-zinc-300">Proyecto</Label>
                    <Input id="project" value={formData.project}
                      onChange={(event) => setFormData({ ...formData, project: event.target.value })}
                      placeholder="Ej. Sierra Alta"
                      className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source_id" className="text-zinc-300">Origen</Label>
                    <select id="source_id" value={formData.source_id}
                      onChange={(event) => setFormData({ ...formData, source_id: event.target.value })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-700">
                      {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.icon ? `${source.icon} ${source.name}` : source.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage_id" className="text-zinc-300">Etapa inicial</Label>
                    <select id="stage_id" value={formData.stage_id}
                      onChange={(event) => setFormData({ ...formData, stage_id: event.target.value })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-700">
                      {stages.filter((stage) => !stage.is_closed).map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-zinc-300">Prioridad</Label>
                    <select id="priority" value={formData.priority}
                      onChange={(event) => setFormData({ ...formData, priority: event.target.value as "low" | "medium" | "high" })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-700">
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deal_type" className="text-zinc-300">Tipo de operación</Label>
                    <select id="deal_type" value={formData.deal_type}
                      onChange={(event) => setFormData({ ...formData, deal_type: event.target.value as "sale" | "rent" | "sale_rent" })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-700">
                      <option value="sale">Venta</option>
                      <option value="rent">Renta</option>
                      <option value="sale_rent">Venta y renta</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget_max" className="text-zinc-300">Presupuesto</Label>
                    <Input id="budget_max" type="number" min="0" value={formData.budget_max}
                      onChange={(event) => setFormData({ ...formData, budget_max: event.target.value })}
                      placeholder="2500000"
                      className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-zinc-700" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-zinc-300">Moneda</Label>
                    <select id="currency" value={formData.currency}
                      onChange={(event) => setFormData({ ...formData, currency: event.target.value })}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-700">
                      {allowedCurrencies.map((currency) => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Guardar lead
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar por nombre, correo, teléfono o lead..."
              className="pl-10 bg-zinc-950/50 border-zinc-800 focus-visible:ring-zinc-700"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          {filterOptions.length > 1 && (
            <ScopeDropdown
              label="Agente"
              options={filterOptions}
              selectedId={filterMemberId}
              onSelect={setFilterMemberId}
              storageKey="contactos-filter"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {(filterMemberId || searchTerm) && (
            <button
              onClick={() => { setFilterMemberId(null); setSearchTerm("") }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-200 border border-zinc-800/60 hover:border-zinc-700 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-flugzz-accent animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium">Lead</TableHead>
                <TableHead className="text-zinc-400 font-medium">Etapa</TableHead>
                <TableHead className="text-zinc-400 font-medium">Contacto</TableHead>
                <TableHead className="text-zinc-400 font-medium">Origen</TableHead>
                <TableHead className="text-zinc-400 font-medium">Presupuesto</TableHead>
                <TableHead className="text-right text-zinc-400 font-medium">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <TableCell className="font-medium text-zinc-200">
                    <div className="space-y-1">
                      <p>{lead.contact?.full_name ?? "Sin nombre"}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge className={`${PRIORITY_STYLES[lead.priority]} border font-normal`}>
                          {lead.priority === "high" ? "Alta" : lead.priority === "medium" ? "Media" : "Baja"}
                        </Badge>
                        <span className="text-zinc-500">{DEAL_TYPE_LABELS[lead.deal_type]}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="border font-normal bg-zinc-900 text-zinc-200" style={{ borderColor: `${lead.stage?.color ?? "#3f3f46"}50`, color: lead.stage?.color ?? "#e4e4e7" }}>
                      {lead.stage?.name ?? "Sin etapa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {lead.contact?.email && (
                        <div className="flex items-center text-xs text-zinc-400">
                          <Mail className="w-3 h-3 mr-1.5" /> {lead.contact.email}
                        </div>
                      )}
                      {lead.contact?.phone && (
                        <div className="flex items-center text-xs text-zinc-400">
                          <Phone className="w-3 h-3 mr-1.5" /> {lead.contact.phone}
                        </div>
                      )}
                      {!lead.contact?.email && !lead.contact?.phone && (
                        <span className="text-xs text-zinc-500">Sin datos de contacto</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    <div>
                      <p>{lead.source?.name ?? "Sin origen"}</p>
                      <p className="text-xs text-zinc-600 mt-1">{lead.owner?.full_name ?? "Sin agente"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300 text-sm">
                    {formatMoney(lead.budget_max, lead.currency || companySettings?.default_currency || "MXN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                      onClick={() => router.push(`/leads/${lead.id}`)}>
                      Ver
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filteredLeads.length === 0 && (
                <TableRow className="border-zinc-800/50">
                  <TableCell colSpan={6} className="py-10 text-center text-zinc-500">
                    No hay leads registrados en esta vista.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

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
        className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm hover:border-zinc-700 transition-colors whitespace-nowrap min-h-[44px]"
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

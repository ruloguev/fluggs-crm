"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  Globe, RefreshCw, Plus, Trash2, GripVertical, CheckCircle2,
  XCircle, Copy, ExternalLink, Users, Shuffle, Loader2, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

// ── Sección: Estado de conexión ───────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Activo
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
      Inactivo
    </span>
  )
}

// ── Formulario de integración Facebook ───────────────────────
function FacebookSetupForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    page_id: '', page_name: '', access_token: '', verify_token: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Generar un verify_token aleatorio
  function generateToken() {
    const token = crypto.randomUUID().replace(/-/g, '')
    setForm(f => ({ ...f, verify_token: token }))
  }

  async function save() {
    if (!form.page_id || !form.access_token || !form.verify_token) {
      setError('Page ID, Access Token y Verify Token son requeridos.')
      return
    }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single()

    const { error: err } = await (supabase as any).from('facebook_integrations').upsert({
      company_id: profile!.company_id,
      page_id: form.page_id,
      page_name: form.page_name,
      access_token: form.access_token,
      verify_token: form.verify_token,
      is_active: true,
      created_by: user!.id,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/facebook`
    : '/api/facebook'

  return (
    <div className="space-y-5">
      {/* Instrucciones */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <p className="text-sm text-blue-300 font-medium mb-2">¿Cómo configurar?</p>
        <ol className="text-xs text-blue-300/70 space-y-1.5 list-decimal list-inside">
          <li>Ve a <strong className="text-blue-300">Meta for Developers</strong> → Tu App → Webhooks</li>
          <li>Agrega un webhook para <strong className="text-blue-300">Page</strong>, suscríbete a <code className="bg-blue-950/50 px-1 rounded">leadgen</code></li>
          <li>Usa la URL y el Verify Token de abajo</li>
          <li>Copia el Page ID y el Page Access Token de tu página de Facebook</li>
        </ol>
      </div>

      {/* URL del webhook */}
      <div className="space-y-1.5">
        <Label className="text-zinc-400">URL del Webhook (copia esto en Meta)</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-flugzz-accent truncate">
            {webhookUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verify Token */}
      <div className="space-y-1.5">
        <Label className="text-zinc-400">Verify Token</Label>
        <div className="flex items-center gap-2">
          <Input
            value={form.verify_token}
            onChange={e => setForm(f => ({ ...f, verify_token: e.target.value }))}
            placeholder="Generar o escribir tu token"
            className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm"
          />
          <button
            onClick={generateToken}
            className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors whitespace-nowrap text-xs"
          >
            Generar
          </button>
        </div>
        {form.verify_token && (
          <p className="text-xs text-zinc-500">Copia este token en el campo Verify Token de Meta Webhooks</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Page ID</Label>
          <Input value={form.page_id} onChange={e => setForm(f => ({ ...f, page_id: e.target.value }))}
            placeholder="123456789" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-zinc-400">Nombre de la página</Label>
          <Input value={form.page_name} onChange={e => setForm(f => ({ ...f, page_name: e.target.value }))}
            placeholder="CD Maderas Oficial" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-400">Page Access Token</Label>
        <Input type="password" value={form.access_token}
          onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
          placeholder="EAABwzLixnjYBO..." className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs" />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <Button onClick={save} disabled={saving} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
        Guardar integración
      </Button>
    </div>
  )
}

// ── Gestor de Round Robin ─────────────────────────────────────
function RoundRobinManager({ companyId }: { companyId: string }) {
  const [agents, setAgents] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [queueId, setQueueId] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)

    // Cargar todos los agentes de la company
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('company_id', companyId)
      .eq('is_active', true)

    // Cargar la cola de Facebook
    const { data: queue } = await (supabase as any)
      .from('round_robin_queues')
      .select('id')
      .eq('company_id', companyId)
      .eq('source', 'facebook')
      .single()

    setQueueId(queue?.id ?? null)

    if (queue) {
      const { data: membersData } = await (supabase as any)
        .from('round_robin_members')
        .select('*, profile:profiles(full_name, email)')
        .eq('queue_id', queue.id)
        .order('position')

      const { data: stateData } = await (supabase as any)
        .from('round_robin_state')
        .select('current_position, total_assigned')
        .eq('queue_id', queue.id)
        .single()

      setMembers(membersData ?? [])
      setStats(stateData)
    }

    setAgents(profiles ?? [])
    setLoading(false)
  }

  async function createQueue() {
    const { data } = await (supabase as any).from('round_robin_queues').insert({
      company_id: companyId, name: 'Cola Facebook Leads', source: 'facebook'
    }).select().single()
    if (data) { setQueueId(data.id); loadData() }
  }

  async function addAgent(userId: string) {
    if (!queueId) return
    const nextPos = (members.length > 0 ? Math.max(...members.map((m: any) => m.position)) : 0) + 1
    await (supabase as any).from('round_robin_members').insert({
      queue_id: queueId, company_id: companyId, user_id: userId, position: nextPos
    })
    loadData()
  }

  async function removeAgent(memberId: string) {
    await (supabase as any).from('round_robin_members').delete().eq('id', memberId)
    loadData()
  }

  async function toggleAgent(memberId: string, isActive: boolean) {
    await (supabase as any).from('round_robin_members')
      .update({ is_active: !isActive })
      .eq('id', memberId)
    loadData()
  }

  const memberIds = members.map((m: any) => m.user_id)
  const availableAgents = agents.filter(a => !memberIds.includes(a.id))

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 text-flugzz-accent animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <p className="text-2xl font-semibold text-zinc-100">{stats.total_assigned}</p>
            <p className="text-xs text-zinc-500 mt-1">Leads asignados en total</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <p className="text-2xl font-semibold text-flugzz-accent">{members.filter((m: any) => m.is_active).length}</p>
            <p className="text-xs text-zinc-500 mt-1">Agentes activos en rotación</p>
          </div>
        </div>
      )}

      {/* Sin cola creada */}
      {!queueId ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Shuffle className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <p className="text-zinc-200 font-medium">Sin cola configurada</p>
            <p className="text-zinc-500 text-sm mt-1">Crea una cola para empezar la rotación automática</p>
          </div>
          <Button onClick={createQueue} className="bg-flugzz-accent text-zinc-950 hover:bg-cyan-300">
            <Plus className="w-4 h-4 mr-2" /> Crear cola de Facebook
          </Button>
        </div>
      ) : (
        <>
          {/* Agentes en la cola */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-300">Orden de rotación</p>
              <span className="text-xs text-zinc-500">{members.length} agentes</span>
            </div>

            {members.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-4">Añade agentes a la rotación</p>
            )}

            {members.map((member: any, i: number) => (
              <div key={member.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  member.is_active ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-zinc-950/40 border-zinc-800/20 opacity-50'
                }`}>
                <GripVertical className="w-4 h-4 text-zinc-700 cursor-grab" />
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{member.profile?.full_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{member.profile?.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-zinc-400 font-medium">{member.leads_assigned}</p>
                  <p className="text-[10px] text-zinc-600">asignados</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleAgent(member.id, member.is_active)}
                    className={`p-1.5 rounded-lg transition-colors ${member.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-600 hover:bg-zinc-800'}`}>
                    {member.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => removeAgent(member.id)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Agregar agentes */}
          {availableAgents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Agregar a la rotación</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableAgents.map(agent => (
                  <button key={agent.id} onClick={() => addAgent(agent.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-800 hover:border-flugzz-accent/40 hover:bg-zinc-900/30 transition-all text-left group">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                      {agent.full_name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 truncate group-hover:text-zinc-100">{agent.full_name}</p>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-600 group-hover:text-flugzz-accent transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function IntegracionesPage() {
  const router = useRouter()
  const { can, loading: authLoading, role } = useAuth()
  const [tab, setTab] = useState<'facebook' | 'roundrobin'>('facebook')
  const [integration, setIntegration] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const roleName = role?.name?.toLowerCase() ?? ""
    const canOpenIntegrations = can("can_manage_users") || can("can_manage_integrations") || roleName.includes("mkt") || roleName.includes("marketing")
    if (!authLoading && !canOpenIntegrations) {
      router.push("/dashboard")
      return
    }
    if (!authLoading && canOpenIntegrations) {
      void loadIntegration()
    }
  }, [authLoading, can, role?.name, router])

  async function loadIntegration() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single()
    setCompanyId(profile?.company_id ?? null)

    if (profile) {
      const { data } = await (supabase as any)
        .from('facebook_integrations')
        .select('*')
        .eq('company_id', profile.company_id)
        .single()
      setIntegration(data)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Integraciones<span className="text-flugzz-accent">.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Conecta tus fuentes de captación y configura la distribución automática.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl w-fit">
        {[
          { id: 'facebook', label: 'Facebook Leads', icon: Globe },
          { id: 'roundrobin', label: 'Round Robin', icon: Shuffle },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-flugzz-accent animate-spin" />
          </div>
        ) : tab === 'facebook' ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">Facebook Lead Ads</p>
                  {integration ? (
                    <p className="text-xs text-zinc-400">{integration.page_name || integration.page_id}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">Sin configurar</p>
                  )}
                </div>
              </div>
              <StatusBadge active={integration?.is_active ?? false} />
            </div>

            {integration ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Webhook activo · Los leads de Facebook se asignan automáticamente
                </div>
                <button onClick={() => setIntegration(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  Reconfigurar integración
                </button>
              </div>
            ) : (
              <FacebookSetupForm onSaved={loadIntegration} />
            )}
          </div>
        ) : (
          companyId && <RoundRobinManager companyId={companyId} />
        )}
      </div>
    </div>
  )
}

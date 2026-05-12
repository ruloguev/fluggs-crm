"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  Globe, Plus, Trash2, GripVertical, CheckCircle2,
  XCircle, Copy, Shuffle, Loader2, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type FacebookIntegration = {
  id: string
  company_id: string
  page_id: string | null
  page_name: string | null
  access_token: string | null
  verify_token: string | null
  is_active: boolean | null
}

type AgentProfile = {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

type QueueMember = {
  id: string
  user_id: string
  position: number
  is_active: boolean
  leads_assigned: number
  profile: {
    full_name: string
    email: string
  } | null
}

type QueueStats = {
  current_position: number
  total_assigned: number
} | null

const FACEBOOK_DRAFT_KEY = "flugzz:facebook-integration-draft"

const DEFAULT_FACEBOOK_FORM = {
  page_id: "",
  page_name: "",
  access_token: "",
  verify_token: "",
}

function getInitialFacebookDraft() {
  if (typeof window === "undefined") {
    return {
      form: DEFAULT_FACEBOOK_FORM,
      restored: false,
    }
  }

  const raw = window.localStorage.getItem(FACEBOOK_DRAFT_KEY)
  if (!raw) {
    return {
      form: DEFAULT_FACEBOOK_FORM,
      restored: false,
    }
  }

  try {
    const savedDraft = JSON.parse(raw) as typeof DEFAULT_FACEBOOK_FORM
    return {
      form: {
        ...DEFAULT_FACEBOOK_FORM,
        ...savedDraft,
      },
      restored: true,
    }
  } catch {
    window.localStorage.removeItem(FACEBOOK_DRAFT_KEY)
    return {
      form: DEFAULT_FACEBOOK_FORM,
      restored: false,
    }
  }
}

function buildFacebookFormState(integration?: FacebookIntegration | null) {
  const initialDraft = getInitialFacebookDraft()

  if (!integration) {
    return initialDraft
  }

  return {
    form: {
      page_id: integration.page_id ?? initialDraft.form.page_id,
      page_name: integration.page_name ?? initialDraft.form.page_name,
      access_token: integration.access_token ?? initialDraft.form.access_token,
      verify_token: integration.verify_token ?? initialDraft.form.verify_token,
    },
    restored: initialDraft.restored,
  }
}

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

function FacebookSetupForm({
  integration,
  onSaved,
}: {
  integration: FacebookIntegration | null
  onSaved: () => void
}) {
  const initialState = buildFacebookFormState(integration)
  const [form, setForm] = useState(initialState.form)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftRestored] = useState(initialState.restored)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window === "undefined") return

    const hasContent = Object.values(form).some((value) => value.trim().length > 0)
    if (!hasContent) {
      window.localStorage.removeItem(FACEBOOK_DRAFT_KEY)
      return
    }

    window.localStorage.setItem(FACEBOOK_DRAFT_KEY, JSON.stringify(form))
  }, [form])

  function generateToken() {
    const token = crypto.randomUUID().replace(/-/g, "")
    setForm((current) => ({ ...current, verify_token: token }))
  }

  async function getCurrentContext() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single()

    return { user, profile }
  }

  async function saveWebhookDraft() {
    if (!form.verify_token) {
      setError("Genera o captura primero el Verify Token.")
      return
    }

    setSaving(true)
    setError(null)

    const { user, profile } = await getCurrentContext()
    const payload = {
      company_id: profile!.company_id,
      page_name: form.page_name || null,
      verify_token: form.verify_token,
      is_active: true,
      created_by: user!.id,
    }

    const query = integration?.id
      ? (supabase as any).from("facebook_integrations").update(payload).eq("id", integration.id)
      : (supabase as any).from("facebook_integrations").insert(payload)

    const { error: saveError } = await query

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    onSaved()
  }

  async function saveLeadCaptureConfig() {
    if (!form.verify_token || !form.page_id || !form.access_token) {
      setError("Verify Token, Page ID y Page Access Token son requeridos para activar la captura.")
      return
    }

    setSaving(true)
    setError(null)

    const { user, profile } = await getCurrentContext()
    const payload = {
      company_id: profile!.company_id,
      page_id: form.page_id,
      page_name: form.page_name || null,
      access_token: form.access_token,
      verify_token: form.verify_token,
      is_active: true,
      created_by: user!.id,
    }

    const query = integration?.id
      ? (supabase as any).from("facebook_integrations").update(payload).eq("id", integration.id)
      : (supabase as any).from("facebook_integrations").insert(payload)

    const { error: saveError } = await query

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FACEBOOK_DRAFT_KEY)
    }

    onSaved()
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/facebook`
    : "/api/facebook"
  const webhookPrepared = Boolean((integration?.verify_token || form.verify_token || "").trim())
  const captureReady = Boolean((integration?.page_id || form.page_id) && (integration?.access_token || form.access_token))

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="mb-2 text-sm font-medium text-blue-300">Como configurarlo</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-200/70">
          <li>Genera y guarda primero el webhook.</li>
          <li>Ve a Meta Developers y pega el callback URL con el verify token.</li>
          <li>Cuando Meta lo verifique, vuelve y captura Page ID y Access Token.</li>
          <li>Guarda la pagina para activar la recepcion de leads.</li>
        </ol>
      </div>

      {draftRestored && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
          Recuperamos tu borrador automaticamente para que no pierdas lo capturado.
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Paso 1: Preparar webhook</p>
            <p className="mt-1 text-xs text-zinc-500">
              Aqui generas el token visible que luego copiaras en Meta.
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${webhookPrepared ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border border-zinc-800 bg-zinc-900 text-zinc-500"}`}>
            {webhookPrepared ? "Listo" : "Pendiente"}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">Callback URL</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-flugzz-accent">
              {webhookUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-zinc-400">Verify Token</Label>
            <button
              onClick={generateToken}
              className="whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {form.verify_token ? "Regenerar" : "Generar token"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex min-h-[42px] flex-1 items-center break-all rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-xs text-emerald-300">
              {form.verify_token || "Genera un token para copiarlo en Meta"}
            </code>
            <button
              onClick={() => form.verify_token && navigator.clipboard.writeText(form.verify_token)}
              disabled={!form.verify_token}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-40"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">Verify Token guardado</Label>
          <Input
            value={form.verify_token}
            onChange={(event) => setForm((current) => ({ ...current, verify_token: event.target.value }))}
            placeholder="Generar o escribir tu token"
            className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm"
          />
          <p className="text-xs text-zinc-500">
            Debe ser exactamente el mismo valor en Meta y en Flugzz.
          </p>
        </div>

        <Button onClick={saveWebhookDraft} disabled={saving || !form.verify_token} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
          Guardar webhook
        </Button>
      </div>

      <div className={`rounded-2xl border p-4 space-y-4 ${webhookPrepared ? "border-zinc-800/70 bg-zinc-950/70" : "border-zinc-900 bg-zinc-950/40 opacity-60"}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Paso 2: Vincular pagina y activar leads</p>
            <p className="mt-1 text-xs text-zinc-500">
              Despues de verificar el webhook en Meta, completa estos datos para activar la captura.
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${captureReady ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border border-zinc-800 bg-zinc-900 text-zinc-500"}`}>
            {captureReady ? "Listo" : "Pendiente"}
          </div>
        </div>

        {!webhookPrepared && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Guarda primero el webhook para poder copiarlo y verificarlo en Meta.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Page ID</Label>
            <Input
              value={form.page_id}
              onChange={(event) => setForm((current) => ({ ...current, page_id: event.target.value }))}
              placeholder="123456789"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Nombre de la pagina</Label>
            <Input
              value={form.page_name}
              onChange={(event) => setForm((current) => ({ ...current, page_name: event.target.value }))}
              placeholder="CD Maderas Oficial"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">Page Access Token</Label>
          <Input
            type="password"
            value={form.access_token}
            onChange={(event) => setForm((current) => ({ ...current, access_token: event.target.value }))}
            placeholder="EAABwzLixnjYBO..."
            className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs"
          />
        </div>

        <Button onClick={saveLeadCaptureConfig} disabled={saving || !webhookPrepared} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
          Guardar pagina y activar leads
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
    </div>
  )
}

function RoundRobinManager({ companyId }: { companyId: string }) {
  const [agents, setAgents] = useState<AgentProfile[]>([])
  const [members, setMembers] = useState<QueueMember[]>([])
  const [queueId, setQueueId] = useState<string | null>(null)
  const [stats, setStats] = useState<QueueStats>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadData() {
    setLoading(true)

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("company_id", companyId)
      .eq("is_active", true)

    const { data: queue } = await (supabase as any)
      .from("round_robin_queues")
      .select("id")
      .eq("company_id", companyId)
      .eq("source", "facebook")
      .single()

    setQueueId(queue?.id ?? null)

    if (queue) {
      const { data: membersData } = await (supabase as any)
        .from("round_robin_members")
        .select("id, user_id, position, is_active, leads_assigned, profile:profiles(full_name, email)")
        .eq("queue_id", queue.id)
        .order("position")

      const { data: stateData } = await (supabase as any)
        .from("round_robin_state")
        .select("current_position, total_assigned")
        .eq("queue_id", queue.id)
        .single()

      setMembers((membersData as QueueMember[] | null) ?? [])
      setStats((stateData as QueueStats) ?? null)
    } else {
      setMembers([])
      setStats(null)
    }

    setAgents((profiles as AgentProfile[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [companyId])

  async function createQueue() {
    const { data } = await (supabase as any)
      .from("round_robin_queues")
      .insert({
        company_id: companyId,
        name: "Cola Facebook Leads",
        source: "facebook",
      })
      .select()
      .single()

    if (data) {
      setQueueId(data.id)
      await loadData()
    }
  }

  async function addAgent(userId: string) {
    if (!queueId) return

    const nextPos = (members.length > 0 ? Math.max(...members.map((member) => member.position)) : 0) + 1
    await (supabase as any).from("round_robin_members").insert({
      queue_id: queueId,
      company_id: companyId,
      user_id: userId,
      position: nextPos,
    })
    await loadData()
  }

  async function removeAgent(memberId: string) {
    await (supabase as any).from("round_robin_members").delete().eq("id", memberId)
    await loadData()
  }

  async function toggleAgent(memberId: string, isActive: boolean) {
    await (supabase as any)
      .from("round_robin_members")
      .update({ is_active: !isActive })
      .eq("id", memberId)
    await loadData()
  }

  const memberIds = members.map((member) => member.user_id)
  const availableAgents = agents.filter((agent) => !memberIds.includes(agent.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
            <p className="text-2xl font-semibold text-zinc-100">{stats.total_assigned}</p>
            <p className="mt-1 text-xs text-zinc-500">Leads asignados en total</p>
          </div>
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
            <p className="text-2xl font-semibold text-flugzz-accent">
              {members.filter((member) => member.is_active).length}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Agentes activos en rotacion</p>
          </div>
        </div>
      )}

      {!queueId ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <Shuffle className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-200">Sin cola configurada</p>
            <p className="mt-1 text-sm text-zinc-500">Crea una cola para empezar la rotacion automatica</p>
          </div>
          <Button onClick={createQueue} className="bg-flugzz-accent text-zinc-950 hover:bg-cyan-300">
            <Plus className="w-4 h-4 mr-2" /> Crear cola de Facebook
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Orden de rotacion</p>
              <span className="text-xs text-zinc-500">{members.length} agentes</span>
            </div>

            {members.length === 0 && (
              <p className="py-4 text-center text-sm text-zinc-600">Anade agentes a la rotacion</p>
            )}

            {members.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  member.is_active ? "border-zinc-800/50 bg-zinc-900/40" : "border-zinc-800/20 bg-zinc-950/40 opacity-50"
                }`}
              >
                <GripVertical className="w-4 h-4 text-zinc-700 cursor-grab" />
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">{member.profile?.full_name}</p>
                  <p className="truncate text-xs text-zinc-500">{member.profile?.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-zinc-400">{member.leads_assigned}</p>
                  <p className="text-[10px] text-zinc-600">asignados</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => void toggleAgent(member.id, member.is_active)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      member.is_active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    {member.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => void removeAgent(member.id)}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {availableAgents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Agregar a la rotacion</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => void addAgent(agent.id)}
                    className="group flex items-center gap-3 rounded-xl border border-dashed border-zinc-800 p-3 text-left transition-all hover:border-flugzz-accent/40 hover:bg-zinc-900/30"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-zinc-400">
                      {agent.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-300 group-hover:text-zinc-100">{agent.full_name}</p>
                    </div>
                    <Plus className="w-4 h-4 shrink-0 text-zinc-600 transition-colors group-hover:text-flugzz-accent" />
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

export default function IntegracionesPage() {
  const router = useRouter()
  const { can, loading: authLoading, role } = useAuth()
  const [tab, setTab] = useState<"facebook" | "roundrobin">("facebook")
  const [integration, setIntegration] = useState<FacebookIntegration | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const roleName = role?.name?.toLowerCase() ?? ""
  const canOpenIntegrations =
    can("can_manage_users") ||
    can("can_manage_integrations") ||
    roleName.includes("mkt") ||
    roleName.includes("marketing") ||
    roleName.includes("director") ||
    roleName.includes("gerente") ||
    (role?.level ?? 99) <= 2

  async function loadIntegration() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single()

    setCompanyId(profile?.company_id ?? null)

    if (profile?.company_id) {
      const { data } = await (supabase as any)
        .from("facebook_integrations")
        .select("id, company_id, page_id, page_name, access_token, verify_token, is_active")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      setIntegration((data as FacebookIntegration | null) ?? null)
    } else {
      setIntegration(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && !canOpenIntegrations) {
      router.push("/dashboard")
      return
    }

    if (!authLoading && canOpenIntegrations) {
      void loadIntegration()
    }
  }, [authLoading, canOpenIntegrations, router])

  const captureReady = Boolean(integration?.page_id && integration?.access_token && integration?.verify_token)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Integraciones<span className="text-flugzz-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Conecta tus fuentes de captacion y configura la distribucion automatica.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-zinc-800/50 bg-zinc-900/60 p-1 w-fit">
        {[
          { id: "facebook", label: "Facebook Leads", icon: Globe },
          { id: "roundrobin", label: "Round Robin", icon: Shuffle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as "facebook" | "roundrobin")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === id ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-6 backdrop-blur-xl">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-flugzz-accent animate-spin" />
          </div>
        ) : tab === "facebook" ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">Facebook Lead Ads</p>
                  <p className="text-xs text-zinc-400">
                    {integration?.page_name || integration?.page_id || "Configuracion escalonada"}
                  </p>
                </div>
              </div>
              <StatusBadge active={integration?.is_active ?? false} />
            </div>

            {captureReady && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                La integracion ya tiene webhook y captura de leads configurados.
              </div>
            )}

            <FacebookSetupForm integration={integration} onSaved={() => void loadIntegration()} />
          </div>
        ) : (
          companyId && <RoundRobinManager companyId={companyId} />
        )}
      </div>
    </div>
  )
}

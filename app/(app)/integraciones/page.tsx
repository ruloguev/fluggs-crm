"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  Globe,
  Plus,
  Trash2,
  GripVertical,
  CheckCircle2,
  XCircle,
  Copy,
  Shuffle,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type IntegrationScope = "company" | "direccion" | "gerencia" | "coordinacion"

type FacebookIntegration = {
  id: string
  company_id: string
  name: string
  page_id: string | null
  page_name: string | null
  access_token: string | null
  verify_token: string | null
  is_active: boolean | null
  scope_type: IntegrationScope
  scope_owner_id: string | null
  created_at: string
}

type TeamProfile = {
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

type QueueRecord = {
  id: string
  auto_reassign_enabled: boolean | null
  reassign_after_hours: number | null
  auto_reassign_cron: string | null
  scheduler_job_name: string | null
  last_reassignment_run_at: string | null
}

type FacebookFormState = {
  name: string
  scope_type: IntegrationScope
  scope_owner_id: string
  page_id: string
  page_name: string
  access_token: string
  verify_token: string
}

const FACEBOOK_DRAFT_KEY = "flugzz:facebook-integration-draft"

const DEFAULT_FACEBOOK_FORM: FacebookFormState = {
  name: "",
  scope_type: "company",
  scope_owner_id: "",
  page_id: "",
  page_name: "",
  access_token: "",
  verify_token: "",
}

const SCOPE_OPTIONS: Array<{
  value: IntegrationScope
  label: string
  helper: string
}> = [
  {
    value: "company",
    label: "Empresa",
    helper: "Compartida para toda la inmobiliaria.",
  },
  {
    value: "direccion",
    label: "Direccion",
    helper: "Controlada desde direccion comercial.",
  },
  {
    value: "gerencia",
    label: "Gerencia",
    helper: "Autonoma para una gerencia o unidad.",
  },
  {
    value: "coordinacion",
    label: "Coordinacion",
    helper: "Autonoma para un equipo puntual.",
  },
]

function getDraftStorageKey(integrationId: string) {
  return `${FACEBOOK_DRAFT_KEY}:${integrationId || "new"}`
}

function buildFacebookFormState(integration: FacebookIntegration | null) {
  const storageKey = getDraftStorageKey(integration?.id ?? "new")

  if (typeof window === "undefined") {
    return {
      form: {
        ...DEFAULT_FACEBOOK_FORM,
        name: integration?.name ?? "",
        scope_type: integration?.scope_type ?? "company",
        scope_owner_id: integration?.scope_owner_id ?? "",
        page_id: integration?.page_id ?? "",
        page_name: integration?.page_name ?? "",
        access_token: integration?.access_token ?? "",
        verify_token: integration?.verify_token ?? "",
      },
      restored: false,
    }
  }

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return {
      form: {
        ...DEFAULT_FACEBOOK_FORM,
        name: integration?.name ?? "",
        scope_type: integration?.scope_type ?? "company",
        scope_owner_id: integration?.scope_owner_id ?? "",
        page_id: integration?.page_id ?? "",
        page_name: integration?.page_name ?? "",
        access_token: integration?.access_token ?? "",
        verify_token: integration?.verify_token ?? "",
      },
      restored: false,
    }
  }

  try {
    const storedDraft = JSON.parse(raw) as Partial<FacebookFormState>

    return {
      form: {
        ...DEFAULT_FACEBOOK_FORM,
        name: integration?.name ?? "",
        scope_type: integration?.scope_type ?? "company",
        scope_owner_id: integration?.scope_owner_id ?? "",
        page_id: integration?.page_id ?? "",
        page_name: integration?.page_name ?? "",
        access_token: integration?.access_token ?? "",
        verify_token: integration?.verify_token ?? "",
        ...storedDraft,
      },
      restored: true,
    }
  } catch {
    window.localStorage.removeItem(storageKey)
    return {
      form: {
        ...DEFAULT_FACEBOOK_FORM,
        name: integration?.name ?? "",
        scope_type: integration?.scope_type ?? "company",
        scope_owner_id: integration?.scope_owner_id ?? "",
        page_id: integration?.page_id ?? "",
        page_name: integration?.page_name ?? "",
        access_token: integration?.access_token ?? "",
        verify_token: integration?.verify_token ?? "",
      },
      restored: false,
    }
  }
}

function getScopeLabel(scope: IntegrationScope) {
  return SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? "Empresa"
}

function getScopeOwnerName(integration: FacebookIntegration, profiles: TeamProfile[]) {
  if (!integration.scope_owner_id) return null
  return profiles.find((profile) => profile.id === integration.scope_owner_id)?.full_name ?? null
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Activa
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
      Borrador
    </span>
  )
}

function IntegrationPicker({
  integrations,
  profiles,
  selectedId,
  onSelect,
  onCreateNew,
}: {
  integrations: FacebookIntegration[]
  profiles: TeamProfile[]
  selectedId: string
  onSelect: (id: string) => void
  onCreateNew: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-200">Tus integraciones</p>
          <p className="mt-1 text-xs text-zinc-500">
            Puedes tener una global y otras autonomas por liderazgo.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="border border-zinc-800 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800"
          onClick={onCreateNew}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva
        </Button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onCreateNew}
          className={`w-full rounded-2xl border border-dashed p-4 text-left transition-all ${
            selectedId === "new"
              ? "border-flugzz-accent/40 bg-flugzz-accent/10"
              : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Nueva integracion</p>
              <p className="mt-1 text-xs text-zinc-500">Crea otro webhook y otra cola para otro equipo.</p>
            </div>
            <Plus className="h-4 w-4 text-zinc-500" />
          </div>
        </button>

        {integrations.map((integration) => {
          const isSelected = integration.id === selectedId
          const ownerName = getScopeOwnerName(integration, profiles)

          return (
            <button
              key={integration.id}
              type="button"
              onClick={() => onSelect(integration.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-flugzz-accent/40 bg-flugzz-accent/10"
                  : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{integration.name}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {integration.page_name || integration.page_id || "Webhook en configuracion"}
                  </p>
                </div>
                <StatusBadge active={Boolean(integration.is_active)} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                  {getScopeLabel(integration.scope_type)}
                </span>
                {ownerName && (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
                    {ownerName}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FacebookSetupForm({
  companyId,
  currentUserId,
  integration,
  profiles,
  onSaved,
}: {
  companyId: string
  currentUserId: string
  integration: FacebookIntegration | null
  profiles: TeamProfile[]
  onSaved: (integrationId: string) => void
}) {
  const initialState = buildFacebookFormState(integration)
  const [form, setForm] = useState<FacebookFormState>(initialState.form)
  const [draftRestored] = useState(initialState.restored)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window === "undefined") return

    const storageKey = getDraftStorageKey(integration?.id ?? "new")
    const hasContent = Object.values(form).some((value) => value.trim().length > 0)

    if (!hasContent) {
      window.localStorage.removeItem(storageKey)
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(form))
  }, [form, integration?.id])

  function generateToken() {
    const token = crypto.randomUUID().replace(/-/g, "")
    setForm((current) => ({ ...current, verify_token: token }))
  }

  function clearDraftStorage(targetId: string) {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(getDraftStorageKey(targetId))
  }

  async function persistIntegration(mode: "webhook" | "capture") {
    if (!form.name.trim()) {
      setError("Ponle un nombre interno a la integracion para distinguirla.")
      return
    }

    if (!form.verify_token.trim()) {
      setError("Genera o captura primero el Verify Token.")
      return
    }

    if (mode === "capture" && (!form.page_id.trim() || !form.access_token.trim())) {
      setError("Page ID y Page Access Token son requeridos para activar la captura.")
      return
    }

    setSaving(true)
    setError(null)

    const basePayload = {
      company_id: companyId,
      created_by: currentUserId,
      name: form.name.trim(),
      scope_type: form.scope_type,
      scope_owner_id: form.scope_type === "company" ? null : form.scope_owner_id || null,
      page_name: form.page_name.trim() || null,
      verify_token: form.verify_token.trim(),
      is_active: true,
    }

    const payload = mode === "capture"
      ? {
          ...basePayload,
          page_id: form.page_id.trim(),
          access_token: form.access_token.trim(),
        }
      : basePayload

    const query = integration?.id
      ? supabase.from("facebook_integrations").update(payload).eq("id", integration.id).select("id").single()
      : supabase.from("facebook_integrations").insert(payload).select("id").single()

    const { data, error: saveError } = await query

    setSaving(false)
    if (saveError || !data) {
      setError(saveError?.message || "No pudimos guardar la integracion.")
      return
    }

    clearDraftStorage(integration?.id ?? "new")
    onSaved(data.id)
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/facebook`
    : "/api/facebook"
  const webhookPrepared = Boolean((integration?.verify_token || form.verify_token).trim())
  const captureReady = Boolean((integration?.page_id || form.page_id) && (integration?.access_token || form.access_token))

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm font-medium text-blue-300">Flujo recomendado</p>
        <ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs text-blue-200/70">
          <li>Define el nombre y alcance de esta integracion.</li>
          <li>Genera el verify token y guarda el webhook.</li>
          <li>Verificalo en Meta.</li>
          <li>Despues conecta Page ID, token y cola de distribucion.</li>
        </ol>
      </div>

      {draftRestored && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
          Restauramos tu borrador automaticamente para que no pierdas configuracion.
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Identidad de la integracion</p>
            <p className="mt-1 text-xs text-zinc-500">
              Define para que equipo existe y quien la opera.
            </p>
          </div>
          <StatusBadge active={Boolean(integration?.is_active)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">Nombre interno</Label>
          <Input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Facebook Gerencia Norte"
            className="border-zinc-800 bg-zinc-900 text-zinc-100"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Alcance</Label>
            <select
              value={form.scope_type}
              onChange={(event) => setForm((current) => ({ ...current, scope_type: event.target.value as IntegrationScope, scope_owner_id: "" }))}
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              {SCOPE_OPTIONS.find((option) => option.value === form.scope_type)?.helper}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400">Responsable visible</Label>
            <select
              value={form.scope_owner_id}
              onChange={(event) => setForm((current) => ({ ...current, scope_owner_id: event.target.value }))}
              disabled={form.scope_type === "company"}
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none disabled:opacity-50"
            >
              <option value="">Selecciona un responsable</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Si es una integracion global, puedes dejarlo vacio.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Paso 1: Preparar webhook</p>
            <p className="mt-1 text-xs text-zinc-500">
              Este token debe estar visible y copiables para pegarlo luego en Meta.
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
              type="button"
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-zinc-400">Verify Token</Label>
            <button
              type="button"
              onClick={generateToken}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {form.verify_token ? "Regenerar" : "Generar token"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex min-h-[44px] flex-1 items-center break-all rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-xs text-emerald-300">
              {form.verify_token || "Genera un token para copiarlo en Meta"}
            </code>
            <button
              type="button"
              disabled={!form.verify_token}
              onClick={() => form.verify_token && navigator.clipboard.writeText(form.verify_token)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-400">Verify Token guardado</Label>
          <Input
            value={form.verify_token}
            onChange={(event) => setForm((current) => ({ ...current, verify_token: event.target.value }))}
            placeholder="Genera o escribe tu token"
            className="border-zinc-800 bg-zinc-900 font-mono text-sm text-zinc-100"
          />
        </div>

        <Button
          type="button"
          onClick={() => void persistIntegration("webhook")}
          disabled={saving || !form.verify_token.trim()}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
          Guardar webhook
        </Button>
      </div>

      <div className={`rounded-2xl border p-4 space-y-4 ${webhookPrepared ? "border-zinc-800/70 bg-zinc-950/70" : "border-zinc-900 bg-zinc-950/40 opacity-60"}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Paso 2: Vincular pagina y activar leads</p>
            <p className="mt-1 text-xs text-zinc-500">
              Despues de verificar el webhook, conectas la pagina que alimenta esta integracion.
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-medium ${captureReady ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border border-zinc-800 bg-zinc-900 text-zinc-500"}`}>
            {captureReady ? "Listo" : "Pendiente"}
          </div>
        </div>

        {!webhookPrepared && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Guarda primero el webhook para poder verificarlo en Meta y luego conectar la pagina.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-zinc-400">Page ID</Label>
            <Input
              value={form.page_id}
              onChange={(event) => setForm((current) => ({ ...current, page_id: event.target.value }))}
              placeholder="123456789"
              className="border-zinc-800 bg-zinc-900 text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400">Nombre de la pagina</Label>
            <Input
              value={form.page_name}
              onChange={(event) => setForm((current) => ({ ...current, page_name: event.target.value }))}
              placeholder="CD Maderas Oficial"
              className="border-zinc-800 bg-zinc-900 text-zinc-100"
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
            className="border-zinc-800 bg-zinc-900 font-mono text-xs text-zinc-100"
          />
        </div>

        <Button
          type="button"
          onClick={() => void persistIntegration("capture")}
          disabled={saving || !webhookPrepared}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
          Guardar pagina y activar leads
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

function RoundRobinManager({
  companyId,
  integration,
  profiles,
}: {
  companyId: string
  integration: FacebookIntegration | null
  profiles: TeamProfile[]
}) {
  const [members, setMembers] = useState<QueueMember[]>([])
  const [queueId, setQueueId] = useState<string | null>(null)
  const [queueConfig, setQueueConfig] = useState<QueueRecord | null>(null)
  const [stats, setStats] = useState<QueueStats>(null)
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configMessage, setConfigMessage] = useState<string | null>(null)
  const [autoReassignEnabled, setAutoReassignEnabled] = useState(false)
  const [autoReassignAfterHours, setAutoReassignAfterHours] = useState("6")
  const [autoReassignCron, setAutoReassignCron] = useState("*/15 * * * *")
  const supabase = createClient()

  async function loadData() {
    if (!integration?.id) {
      setQueueId(null)
      setQueueConfig(null)
      setMembers([])
      setStats(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data: queue } = await supabase
      .from("round_robin_queues")
      .select("id, auto_reassign_enabled, reassign_after_hours, auto_reassign_cron, scheduler_job_name, last_reassignment_run_at")
      .eq("company_id", companyId)
      .eq("source", "facebook")
      .eq("integration_id", integration.id)
      .maybeSingle()

    setQueueId(queue?.id ?? null)
    setQueueConfig((queue as QueueRecord | null) ?? null)
    setAutoReassignEnabled(Boolean(queue?.auto_reassign_enabled))
    setAutoReassignAfterHours(String(queue?.reassign_after_hours ?? 6))
    setAutoReassignCron(queue?.auto_reassign_cron ?? "*/15 * * * *")

    if (queue?.id) {
      const { data: membersData } = await supabase
        .from("round_robin_members")
        .select("id, user_id, position, is_active, leads_assigned, profile:profiles(full_name, email)")
        .eq("queue_id", queue.id)
        .order("position")

      const { data: stateData } = await supabase
        .from("round_robin_state")
        .select("current_position, total_assigned")
        .eq("queue_id", queue.id)
        .maybeSingle()

      setMembers((membersData as QueueMember[] | null) ?? [])
      setStats((stateData as QueueStats) ?? null)
    } else {
      setQueueConfig(null)
      setMembers([])
      setStats(null)
    }

    setLoading(false)
  }

  const loadDataRef = useRef(loadData)

  useEffect(() => {
    loadDataRef.current = loadData
  }, [loadData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDataRef.current()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [companyId, integration?.id])

  async function createQueue() {
    if (!integration?.id) return

    const { data } = await supabase
      .from("round_robin_queues")
      .insert({
        company_id: companyId,
        integration_id: integration.id,
        name: `Rotacion ${integration.name}`,
        source: "facebook",
      })
      .select("id")
      .single()

    if (data?.id) {
      setQueueId(data.id)
      await loadData()
    }
  }

  async function saveAutoReassignConfig() {
    if (!queueId) return

    setSavingConfig(true)
    setConfigError(null)
    setConfigMessage(null)

    const hours = Number(autoReassignAfterHours)
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      setConfigError("Debe ser entre 1 y 24 horas.")
      setSavingConfig(false)
      return
    }

    const { error } = await supabase.rpc("configure_round_robin_reassignment", {
      p_queue_id: queueId,
      p_enabled: autoReassignEnabled,
      p_after_hours: hours,
    })

    setSavingConfig(false)

    if (error) {
      setConfigError(error.message)
      return
    }

    setConfigMessage("Configuración de reasignación guardada.")
    await loadData()
  }

  async function runAutoReassignNow() {
    if (!queueId) return

    setSavingConfig(true)
    setConfigError(null)
    setConfigMessage(null)

    const { data, error } = await supabase.rpc("reassign_stale_round_robin_leads", {
      p_queue_id: queueId,
    })

    setSavingConfig(false)

    if (error) {
      setConfigError(error.message)
      return
    }

    setConfigMessage(`Se ejecutó la reasignación. Leads movidos: ${data ?? 0}.`)
    await loadData()
  }

  async function addAgent(userId: string) {
    if (!queueId) return

    const nextPosition = (members.length > 0 ? Math.max(...members.map((member) => member.position)) : 0) + 1
    await supabase.from("round_robin_members").insert({
      queue_id: queueId,
      company_id: companyId,
      user_id: userId,
      position: nextPosition,
    })

    await loadData()
  }

  async function removeAgent(memberId: string) {
    await supabase.from("round_robin_members").delete().eq("id", memberId)
    await loadData()
  }

  async function toggleAgent(memberId: string, isActive: boolean) {
    await supabase.from("round_robin_members").update({ is_active: !isActive }).eq("id", memberId)
    await loadData()
  }

  const memberIds = members.map((member) => member.user_id)
  const availableAgents = profiles.filter((profile) => !memberIds.includes(profile.id))

  if (!integration?.id) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-950/50 px-6 py-10 text-center">
        <Shuffle className="h-8 w-8 text-zinc-600" />
        <p className="mt-4 text-sm font-medium text-zinc-200">Guarda primero la integracion</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Cuando la integracion exista, aqui puedes crear una cola dedicada para ese equipo.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-flugzz-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4">
        <p className="text-sm font-medium text-zinc-100">{integration.name}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Esta cola solo distribuye los leads que entren por esta integracion.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4">
            <p className="text-2xl font-semibold text-zinc-100">{stats.total_assigned}</p>
            <p className="mt-1 text-xs text-zinc-500">Leads asignados</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4">
            <p className="text-2xl font-semibold text-flugzz-accent">
              {members.filter((member) => member.is_active).length}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Agentes activos</p>
          </div>
        </div>
      )}

      {queueId && (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">Reasignación automática con pg_cron</p>
              <p className="mt-1 text-xs text-zinc-500">
                Configura cada cuánto revisar leads sin actividad y reasignarlos dentro de esta cola.
              </p>
            </div>
            <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400">
              {queueConfig?.scheduler_job_name || "Sin job configurado"}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
              <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">Activo</span>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Encender reasignación</p>
                  <p className="text-xs text-zinc-500">Usa pg_cron para correrla automáticamente.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoReassignEnabled((current) => !current)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${autoReassignEnabled ? "bg-flugzz-accent" : "bg-zinc-800"}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${autoReassignEnabled ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
            </label>

            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4">
              <Label className="text-zinc-400">Horas sin actividad (1-24)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={autoReassignAfterHours}
                onChange={(event) => setAutoReassignAfterHours(event.target.value)}
                className="mt-2 border-zinc-800 bg-zinc-950 text-zinc-100"
              />
              <p className="mt-2 text-xs text-zinc-500">Cuando un lead supera este umbral sin actividad en la primera etapa, será reasignado al siguiente agente.</p>
            </div>


          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void saveAutoReassignConfig()}
              disabled={savingConfig}
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            >
              {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
              Guardar programación
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void runAutoReassignNow()}
              disabled={savingConfig}
              className="border border-zinc-800 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800"
            >
              Ejecutar ahora
            </Button>
            {queueConfig?.last_reassignment_run_at && (
              <span className="text-xs text-zinc-500">
                Última corrida: {new Date(queueConfig.last_reassignment_run_at).toLocaleString("es-MX")}
              </span>
            )}
          </div>

          {configError && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {configError}
            </div>
          )}

          {configMessage && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {configMessage}
            </div>
          )}
        </div>
      )}

      {!queueId ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <Shuffle className="h-6 w-6 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-200">Sin cola configurada</p>
            <p className="mt-1 text-sm text-zinc-500">Crea una cola especifica para esta integracion.</p>
          </div>
          <Button onClick={() => void createQueue()} className="bg-flugzz-accent text-zinc-950 hover:bg-cyan-300">
            <Plus className="mr-2 h-4 w-4" />
            Crear cola de Facebook
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
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                  member.is_active ? "border-zinc-800/50 bg-zinc-900/40" : "border-zinc-800/20 bg-zinc-950/40 opacity-50"
                }`}
              >
                <GripVertical className="h-4 w-4 cursor-grab text-zinc-700" />
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
                    type="button"
                    onClick={() => void toggleAgent(member.id, member.is_active)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      member.is_active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    {member.is_active ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeAgent(member.id)}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {availableAgents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Agregar a la rotacion</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableAgents.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => void addAgent(profile.id)}
                    className="group flex items-center gap-3 rounded-2xl border border-dashed border-zinc-800 p-3 text-left transition-all hover:border-flugzz-accent/40 hover:bg-zinc-900/30"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-zinc-400">
                      {profile.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-300 group-hover:text-zinc-100">{profile.full_name}</p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-flugzz-accent" />
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
  const supabase = createClient()
  const { can, loading: authLoading, role, profile } = useAuth()

  const [tab, setTab] = useState<"facebook" | "roundrobin" | "google">("facebook")

  // Google Calendar state
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState("")
  const [loadingGoogle, setLoadingGoogle] = useState(true)

  useEffect(() => {
    fetch("/api/google/auth/status")
      .then(r => r.json())
      .then(d => {
        setGoogleConnected(d.connected)
        setGoogleEmail(d.email || "")
      })
      .catch(() => {})
      .finally(() => setLoadingGoogle(false))
  }, [])

  // Handle redirect from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get("google")
    if (googleStatus === "connected") {
      setGoogleConnected(true)
      const url = new URL(window.location.href)
      url.searchParams.delete("google")
      url.searchParams.delete("detail")
      window.history.replaceState({}, "", url.toString())
      fetch("/api/google/auth/status")
        .then(r => r.json())
        .then(d => {
          setGoogleEmail(d.email || "")
        })
        .catch(() => {})
    } else if (googleStatus === "error") {
      const detail = params.get("detail")
      alert(detail ? `Error al conectar Google Calendar: ${detail}` : "Error al conectar Google Calendar")
      const url = new URL(window.location.href)
      url.searchParams.delete("google")
      url.searchParams.delete("detail")
      window.history.replaceState({}, "", url.toString())
    }
  }, [])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([])
  const [integrations, setIntegrations] = useState<FacebookIntegration[]>([])
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("new")
  const [loading, setLoading] = useState(true)

  const roleName = role?.name?.toLowerCase() ?? ""
  const canOpenIntegrations =
    can("can_manage_users") ||
    can("can_manage_integrations") ||
    roleName.includes("mkt") ||
    roleName.includes("marketing") ||
    roleName.includes("director") ||
    roleName.includes("gerente") ||
    (role?.level ?? 99) <= 2

  async function loadData(preferredIntegrationId?: string) {
    if (!profile?.company_id) {
      setCompanyId(null)
      setTeamProfiles([])
      setIntegrations([])
      setSelectedIntegrationId("new")
      setLoading(false)
      return
    }

    setLoading(true)
    setCompanyId(profile.company_id)

    const [profilesResult, integrationsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("facebook_integrations")
        .select("id, company_id, name, page_id, page_name, access_token, verify_token, is_active, scope_type, scope_owner_id, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false }),
    ])

    const nextProfiles = (profilesResult.data as TeamProfile[] | null) ?? []
    const nextIntegrations = (integrationsResult.data as FacebookIntegration[] | null) ?? []

    setTeamProfiles(nextProfiles)
    setIntegrations(nextIntegrations)

    if (preferredIntegrationId && nextIntegrations.some((integration) => integration.id === preferredIntegrationId)) {
      setSelectedIntegrationId(preferredIntegrationId)
    } else if (selectedIntegrationId !== "new" && nextIntegrations.some((integration) => integration.id === selectedIntegrationId)) {
      setSelectedIntegrationId(selectedIntegrationId)
    } else if (nextIntegrations.length > 0) {
      setSelectedIntegrationId(nextIntegrations[0].id)
    } else {
      setSelectedIntegrationId("new")
    }

    setLoading(false)
  }

  const loadDataRef = useRef(loadData)

  useEffect(() => {
    loadDataRef.current = loadData
  }, [loadData])

  useEffect(() => {
    if (!authLoading && !canOpenIntegrations) {
      router.push("/dashboard")
      return
    }

    if (!authLoading && canOpenIntegrations) {
      const timeoutId = window.setTimeout(() => {
        void loadDataRef.current()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [authLoading, canOpenIntegrations, profile?.company_id, router])

  const selectedIntegration = useMemo(
    () => integrations.find((integration) => integration.id === selectedIntegrationId) ?? null,
    [integrations, selectedIntegrationId],
  )

  const captureReady = Boolean(
    selectedIntegration?.page_id &&
    selectedIntegration?.access_token &&
    selectedIntegration?.verify_token,
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Integraciones<span className="text-flugzz-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Conecta varias captaciones por empresa, gerencia o coordinacion y asignales su propia rotacion.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/40 p-5 backdrop-blur-xl">
          <IntegrationPicker
            integrations={integrations}
            profiles={teamProfiles}
            selectedId={selectedIntegrationId}
            onSelect={setSelectedIntegrationId}
            onCreateNew={() => {
              setSelectedIntegrationId("new")
              setTab("facebook")
            }}
          />
        </div>

        <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/40 p-6 backdrop-blur-xl">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-flugzz-accent" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/20">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">
                      {selectedIntegration?.name || "Nueva integracion de Facebook Leads"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {selectedIntegration
                        ? `${getScopeLabel(selectedIntegration.scope_type)}${getScopeOwnerName(selectedIntegration, teamProfiles) ? ` · ${getScopeOwnerName(selectedIntegration, teamProfiles)}` : ""}`
                        : "Configura una nueva fuente de captacion"}
                    </p>
                  </div>
                </div>

                {selectedIntegration && (
                  <div className="flex items-center gap-3">
                    <StatusBadge active={Boolean(selectedIntegration.is_active)} />
                    {captureReady && (
                      <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                        Captura activa
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-1 rounded-xl border border-zinc-800/50 bg-zinc-900/60 p-1 w-fit">
                {[
                  { id: "facebook", label: "Facebook Leads", icon: Globe },
                  { id: "roundrobin", label: "Round Robin", icon: Shuffle },
                  { id: "google", label: "Google Calendar", icon: Calendar },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id as "facebook" | "roundrobin" | "google")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      tab === id ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {tab === "google" ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/30 bg-red-600/20">
                      <Calendar className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-100">Google Calendar</p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Conecta tu cuenta de Google para agendar reuniones con leads y generar enlaces de Google Meet directamente desde el CRM.
                      </p>
                    </div>
                  </div>

                  {loadingGoogle ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando conexión...
                    </div>
                  ) : googleConnected ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-300">Conectado</span>
                      </div>
                      {googleEmail && (
                        <p className="text-sm text-zinc-300">
                          Cuenta: <span className="font-medium">{googleEmail}</span>
                        </p>
                      )}
                      <p className="text-xs text-zinc-500">
                        Puedes agendar reuniones desde la ficha de cada lead.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch("/api/google/auth/disconnect", { method: "POST" })
                          setGoogleConnected(false)
                          setGoogleEmail("")
                        }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/50 p-5 space-y-4">
                      <p className="text-sm text-zinc-400">
                        Al conectar, podrás crear eventos de calendario y reuniones de Google Meet directamente desde los leads.
                      </p>
                      <a
                        href="/api/google/auth"
                        className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
                      >
                        <Calendar className="h-4 w-4" />
                        Conectar Google Calendar
                      </a>
                    </div>
                  )}

                  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/50 p-5">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Permisos solicitados</p>
                    <ul className="space-y-2 text-sm text-zinc-400">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-flugzz-accent shrink-0 mt-0.5" />
                        <span>Ver tu dirección de correo electrónico</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-flugzz-accent shrink-0 mt-0.5" />
                        <span>Crear eventos en tu Google Calendar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-flugzz-accent shrink-0 mt-0.5" />
                        <span>Crear reuniones de Google Meet</span>
                      </li>
                    </ul>
                    <p className="mt-4 text-xs text-zinc-600">
                      Solo creamos eventos, no leemos ni modificamos eventos existentes. Cada agente conecta su cuenta personal.
                    </p>
                  </div>
                </div>
              ) : tab === "facebook" ? (
                companyId && profile?.id ? (
                  <FacebookSetupForm
                    key={selectedIntegration?.id ?? "new"}
                    companyId={companyId}
                    currentUserId={profile.id}
                    integration={selectedIntegration}
                    profiles={teamProfiles}
                    onSaved={(integrationId) => void loadData(integrationId)}
                  />
                ) : null
              ) : (
                companyId && (
                  <RoundRobinManager
                    companyId={companyId}
                    integration={selectedIntegration}
                    profiles={teamProfiles}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

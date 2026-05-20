"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown, ArrowUp, Building2, FolderOpen, KanbanSquare, Loader2,
  Plus, Save, Trash2, Target
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"

type CompanySettings = {
  id: string
  name: string
  default_currency: string | null
  allowed_currencies: string[] | null
  settings: Record<string, any> | null
}

type CompanyGoals = {
  monthly_won_leads: number
  agent_goals: Record<string, number>
}

type Stage = {
  id: string
  company_id: string
  name: string
  color: string
  position: number
  is_closed: boolean
}

type DocumentTemplate = {
  id: string
  company_id: string
  name: string
  description: string | null
  deal_type: "sale" | "rent" | "other"
  is_active: boolean
}

type DocumentTemplateItem = {
  id: string
  template_id: string
  label: string
  is_required: boolean
  position: number
}

const CURRENCIES = ["MXN", "USD", "EUR", "CAD"]
const STAGE_COLORS = ["#22D3EE", "#38BDF8", "#A78BFA", "#F97316", "#F43F5E", "#10B981", "#FACC15"]

export default function AdminSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, loading: authLoading, can, role } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [defaultCurrency, setDefaultCurrency] = useState("MXN")
  const [allowedCurrenciesInput, setAllowedCurrenciesInput] = useState("MXN")
  const [stages, setStages] = useState<Stage[]>([])
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [templateItems, setTemplateItems] = useState<Record<string, DocumentTemplateItem[]>>({})
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateType, setNewTemplateType] = useState<"sale" | "rent" | "other">("sale")
  const [monthlyGoal, setMonthlyGoal] = useState(10)
  const [savingGoals, setSavingGoals] = useState(false)
  const normalizedRoleName = role?.name?.toLowerCase() ?? ""
  const canManageSettings =
    can("can_manage_users") ||
    normalizedRoleName.includes("director") ||
    normalizedRoleName.includes("gerente") ||
    normalizedRoleName.includes("admin") ||
    (role?.level ?? 99) <= 2

  useEffect(() => {
    if (!authLoading && !canManageSettings) {
      router.push("/pipeline")
      return
    }
    if (!authLoading && profile?.company_id) {
      const companyId = profile.company_id
      const timeoutId = window.setTimeout(() => {
        void (async () => {
          const [{ data: companyData }, { data: stagesData }, { data: templatesData }, { data: itemsData }] =
            await Promise.all([
              supabase
                .from("companies")
                .select("id, name, default_currency, allowed_currencies, settings")
                .eq("id", companyId)
                .single(),
              supabase
                .from("pipeline_stages")
                .select("id, company_id, name, color, position, is_closed")
                .eq("company_id", companyId)
                .order("position"),
              supabase
                .from("document_templates")
                .select("id, company_id, name, description, deal_type, is_active")
                .eq("company_id", companyId)
                .order("deal_type")
                .order("name"),
              supabase
                .from("document_template_items")
                .select("id, template_id, label, is_required, position")
                .order("position"),
            ])

          const nextCompany = (companyData as CompanySettings | null) ?? null
          setCompany(nextCompany)
          setDefaultCurrency(nextCompany?.default_currency ?? "MXN")
          setAllowedCurrenciesInput((nextCompany?.allowed_currencies ?? ["MXN"]).join(", "))
          setStages((stagesData as Stage[] | null) ?? [])

          const goals = nextCompany?.settings?.goals as CompanyGoals | null
          if (goals?.monthly_won_leads) {
            setMonthlyGoal(goals.monthly_won_leads)
          }
          setTemplates((templatesData as DocumentTemplate[] | null) ?? [])

          const groupedItems: Record<string, DocumentTemplateItem[]> = {}
          ;((itemsData as DocumentTemplateItem[] | null) ?? []).forEach((item) => {
            groupedItems[item.template_id] ??= []
            groupedItems[item.template_id].push(item)
          })
          setTemplateItems(groupedItems)
          setLoading(false)
        })()
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [authLoading, canManageSettings, profile?.company_id, router, supabase])

  async function saveGeneralSettings() {
    if (!company) return
    setSavingGeneral(true)
    const allowedCurrencies = allowedCurrenciesInput
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)

    const nextAllowed = allowedCurrencies.length > 0 ? Array.from(new Set(allowedCurrencies)) : ["MXN"]
    const nextDefault = nextAllowed.includes(defaultCurrency) ? defaultCurrency : nextAllowed[0]

    await supabase
      .from("companies")
      .update({
        default_currency: nextDefault,
        allowed_currencies: nextAllowed,
      })
      .eq("id", company.id)

    setDefaultCurrency(nextDefault)
    setAllowedCurrenciesInput(nextAllowed.join(", "))
    setSavingGeneral(false)
  }

  async function saveGoals() {
    if (!company) return
    setSavingGoals(true)
    const currentSettings = company.settings ?? {}
    await supabase
      .from("companies")
      .update({
        settings: {
          ...currentSettings,
          goals: {
            monthly_won_leads: monthlyGoal,
            agent_goals: currentSettings?.goals?.agent_goals ?? {},
          },
        },
      })
      .eq("id", company.id)
    setSavingGoals(false)
  }

  async function addStage() {
    if (!profile?.company_id) return
    const nextPosition = stages.length > 0 ? Math.max(...stages.map((stage) => stage.position)) + 1 : 1
    const payload = {
      company_id: profile.company_id,
      name: `Nueva etapa ${nextPosition}`,
      color: STAGE_COLORS[stages.length % STAGE_COLORS.length],
      position: nextPosition,
      is_closed: false,
    }

    const { data } = await supabase
      .from("pipeline_stages")
      .insert(payload)
      .select("id, company_id, name, color, position, is_closed")
      .single()

    if (data) {
      setStages((prev) => [...prev, data as Stage].sort((a, b) => a.position - b.position))
    }
  }

  async function updateStage(stageId: string, patch: Partial<Stage>) {
    await supabase.from("pipeline_stages").update(patch).eq("id", stageId)
    setStages((prev) => prev.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)))
  }

  async function moveStage(stageId: string, direction: "up" | "down") {
    const ordered = [...stages].sort((a, b) => a.position - b.position)
    const index = ordered.findIndex((stage) => stage.id === stageId)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return

    const current = ordered[index]
    const target = ordered[swapIndex]
    const currentPosition = current.position
    current.position = target.position
    target.position = currentPosition

    const nextStages = [...ordered].sort((a, b) => a.position - b.position)
    setStages(nextStages)

    await Promise.all([
      supabase.from("pipeline_stages").update({ position: current.position }).eq("id", current.id),
      supabase.from("pipeline_stages").update({ position: target.position }).eq("id", target.id),
    ])
  }

  async function deleteStage(stageId: string) {
    await supabase.from("pipeline_stages").delete().eq("id", stageId)
    setStages((prev) =>
      prev
        .filter((stage) => stage.id !== stageId)
        .map((stage, index) => ({ ...stage, position: index + 1 }))
    )
  }

  async function addTemplate() {
    if (!profile?.company_id || !newTemplateName.trim()) return
    const { data } = await supabase
      .from("document_templates")
      .insert({
        company_id: profile.company_id,
        name: newTemplateName.trim(),
        deal_type: newTemplateType,
        is_active: true,
      })
      .select("id, company_id, name, description, deal_type, is_active")
      .single()

    if (data) {
      setTemplates((prev) => [...prev, data as DocumentTemplate])
      setTemplateItems((prev) => ({ ...prev, [(data as DocumentTemplate).id]: [] }))
      setNewTemplateName("")
    }
  }

  async function updateTemplate(templateId: string, patch: Partial<DocumentTemplate>) {
    await supabase.from("document_templates").update(patch).eq("id", templateId)
    setTemplates((prev) => prev.map((template) => (template.id === templateId ? { ...template, ...patch } : template)))
  }

  async function deleteTemplate(templateId: string) {
    await supabase.from("document_templates").delete().eq("id", templateId)
    setTemplates((prev) => prev.filter((template) => template.id !== templateId))
    setTemplateItems((prev) => {
      const next = { ...prev }
      delete next[templateId]
      return next
    })
  }

  async function addTemplateItem(templateId: string) {
    const items = templateItems[templateId] ?? []
    const nextPosition = items.length > 0 ? Math.max(...items.map((item) => item.position)) + 1 : 1
    const { data } = await supabase
      .from("document_template_items")
      .insert({
        template_id: templateId,
        label: `Documento ${nextPosition}`,
        is_required: true,
        position: nextPosition,
      })
      .select("id, template_id, label, is_required, position")
      .single()

    if (data) {
      setTemplateItems((prev) => ({
        ...prev,
        [templateId]: [...(prev[templateId] ?? []), data as DocumentTemplateItem].sort((a, b) => a.position - b.position),
      }))
    }
  }

  async function updateTemplateItem(templateId: string, itemId: string, patch: Partial<DocumentTemplateItem>) {
    await supabase.from("document_template_items").update(patch).eq("id", itemId)
    setTemplateItems((prev) => ({
      ...prev,
      [templateId]: (prev[templateId] ?? []).map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }))
  }

  async function deleteTemplateItem(templateId: string, itemId: string) {
    await supabase.from("document_template_items").delete().eq("id", itemId)
    setTemplateItems((prev) => ({
      ...prev,
      [templateId]: (prev[templateId] ?? []).filter((item) => item.id !== itemId),
    }))
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Admin<span className="text-flugzz-accent">.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configura reglas de negocio sin tocar código: moneda, etapas y expedientes por inmobiliaria.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-flugzz-accent" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-zinc-100">Empresa y monedas</h2>
            <p className="text-sm text-zinc-400">Define la moneda base y cuáles monedas podrá usar la operación.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Moneda base</span>
            <select
              value={defaultCurrency}
              onChange={(event) => setDefaultCurrency(event.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
            >
              {Array.from(new Set([defaultCurrency, ...CURRENCIES, ...(allowedCurrenciesInput.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))])).map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Monedas permitidas</span>
            <input
              value={allowedCurrenciesInput}
              onChange={(event) => setAllowedCurrenciesInput(event.target.value)}
              placeholder="MXN, USD"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
            />
          </label>
        </div>

        <button
          onClick={saveGeneralSettings}
          disabled={savingGeneral}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {savingGeneral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar ajustes
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <Target className="w-4 h-4 text-flugzz-accent" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-zinc-100">Metas y Cuotas</h2>
              <p className="text-sm text-zinc-400">Define la meta mensual de leads cerrados para tu equipo.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-4 md:grid-cols-[200px_1fr]">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Meta mensual (cierres)</span>
            <input
              type="number"
              min="1"
              value={monthlyGoal}
              onChange={(event) => setMonthlyGoal(Math.max(1, parseInt(event.target.value) || 1))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
            />
          </label>

          <div className="flex items-end">
            <button
              onClick={saveGoals}
              disabled={savingGoals}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {savingGoals ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar meta
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <KanbanSquare className="w-4 h-4 text-flugzz-accent" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-zinc-100">Pipeline</h2>
              <p className="text-sm text-zinc-400">Personaliza las fases del embudo por inmobiliaria.</p>
            </div>
          </div>

          <button
            onClick={addStage}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-600"
          >
            <Plus className="w-4 h-4" />
            Nueva etapa
          </button>
        </div>

        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.id} className="grid gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-4 md:grid-cols-[1.6fr_140px_130px_auto]">
              <input
                value={stage.name}
                onChange={(event) => void updateStage(stage.id, { name: event.target.value })}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
              />

              <input
                type="color"
                value={stage.color || STAGE_COLORS[0]}
                onChange={(event) => void updateStage(stage.id, { color: event.target.value })}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2"
              />

              <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={stage.is_closed}
                  onChange={(event) => void updateStage(stage.id, { is_closed: event.target.checked })}
                />
                Etapa cerrada
              </label>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => void moveStage(stage.id, "up")} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-300 hover:border-zinc-700">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => void moveStage(stage.id, "down")} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-300 hover:border-zinc-700">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button onClick={() => void deleteStage(stage.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300 hover:border-red-500/40">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-flugzz-accent" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-zinc-100">Plantillas de expediente</h2>
              <p className="text-sm text-zinc-400">Define qué documentos se piden por venta, renta u otro flujo.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-4 md:grid-cols-[1.5fr_180px_auto]">
          <input
            value={newTemplateName}
            onChange={(event) => setNewTemplateName(event.target.value)}
            placeholder="Ej. Venta residencial"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
          />
          <select
            value={newTemplateType}
            onChange={(event) => setNewTemplateType(event.target.value as "sale" | "rent" | "other")}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
          >
            <option value="sale">Venta</option>
            <option value="rent">Renta</option>
            <option value="other">Otro</option>
          </select>
          <button
            onClick={addTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            <Plus className="w-4 h-4" />
            Crear plantilla
          </button>
        </div>

        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-950/70 p-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-[1.4fr_150px_1fr_auto]">
                <input
                  value={template.name}
                  onChange={(event) => void updateTemplate(template.id, { name: event.target.value })}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
                />
                <select
                  value={template.deal_type}
                  onChange={(event) => void updateTemplate(template.id, { deal_type: event.target.value as "sale" | "rent" | "other" })}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
                >
                  <option value="sale">Venta</option>
                  <option value="rent">Renta</option>
                  <option value="other">Otro</option>
                </select>
                <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={template.is_active}
                    onChange={(event) => void updateTemplate(template.id, { is_active: event.target.checked })}
                  />
                  Activa
                </label>
                <button onClick={() => void deleteTemplate(template.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300 hover:border-red-500/40">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={template.description ?? ""}
                onChange={(event) => void updateTemplate(template.id, { description: event.target.value })}
                rows={2}
                placeholder="Descripción o instrucciones para este expediente"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
              />

              <div className="space-y-3">
                {(templateItems[template.id] ?? []).map((item) => (
                  <div key={item.id} className="grid gap-3 md:grid-cols-[1.6fr_180px_auto]">
                    <input
                      value={item.label}
                      onChange={(event) => void updateTemplateItem(template.id, item.id, { label: event.target.value })}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-700"
                    />
                    <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={item.is_required}
                        onChange={(event) => void updateTemplateItem(template.id, item.id, { is_required: event.target.checked })}
                      />
                      Obligatorio
                    </label>
                    <button onClick={() => void deleteTemplateItem(template.id, item.id)} className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300 hover:border-red-500/40">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => void addTemplateItem(template.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 hover:border-zinc-600"
                >
                  <Plus className="w-4 h-4" />
                  Agregar documento
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

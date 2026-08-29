"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table"
import {
  Check, Plus, Trash2, ArrowRight, Loader2,
  KanbanSquare, Users, Sparkles, GripVertical,
  Crown, Ticket, ShieldCheck, Zap, Rocket,
} from "lucide-react"

const STAGE_COLORS = [
  "#64748b", "#22d3ee", "#a78bfa", "#fb923c",
  "#fbbf24", "#34d399", "#f87171", "#60a5fa", "#e879f9",
]

type Stage = { id: string; name: string; color: string; position: number; is_closed: boolean; isNew?: boolean }
type InviteRow = { email: string; name: string }
type PlanId = "agente_pro" | "fundacion" | "expansion" | "imperio"

const PLAN_NAMES: Record<PlanId, string> = {
  agente_pro: "Agente Pro",
  fundacion: "Fundación",
  expansion: "Expansión",
  imperio: "Imperio",
}

const STEPS = [
  { id: "plan",     label: "Plan",     icon: Crown },
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { id: "team",     label: "Equipo",   icon: Users },
  { id: "done",     label: "¡Listo!",  icon: Sparkles },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { profile, loading: authLoading, refresh } = useAuth()

  const [step, setStep] = useState(0)
  const [stages, setStages] = useState<Stage[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([{ email: "", name: "" }])
  const [saving, setSaving] = useState(false)
  const [savingInvites, setSavingInvites] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [planError, setPlanError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/login")
    if (!authLoading && profile?.company_id) {
      loadCompanyPlan()
      loadStages()
    }
  }, [authLoading, profile])

  async function loadCompanyPlan() {
    const { data } = await supabase
      .from("company_subscriptions")
      .select("plan_id")
      .eq("company_id", profile!.company_id!)
      .maybeSingle()

    if (data?.plan_id && (["agente_pro", "fundacion", "expansion", "imperio"] as PlanId[]).includes(data.plan_id as PlanId)) {
      setSelectedPlan(data.plan_id as PlanId)
      setStep(1)
    }
  }

  async function loadStages() {
    const { data } = await supabase
      .from("pipeline_stages")
      .select("id, name, color, position, is_closed")
      .eq("company_id", profile!.company_id!)
      .order("position")
    setStages(data ?? [])
  }

  // ── Stage editor ────────────────────────────────────────────
  function addStage() {
    const pos = stages.length + 1
    setStages(prev => [...prev, {
      id: crypto.randomUUID(), name: "", color: STAGE_COLORS[pos % STAGE_COLORS.length],
      position: pos, is_closed: false, isNew: true,
    }])
  }

  function updateStage(id: string, patch: Partial<Stage>) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function removeStage(id: string) {
    setStages(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, position: i + 1 })))
  }

  // Drag-to-reorder (simple mouse/touch)
  function onDragStart(idx: number) { setDragIdx(idx) }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setStages(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(dragIdx, 1)
      arr.splice(idx, 0, moved)
      setDragIdx(idx)
      return arr.map((s, i) => ({ ...s, position: i + 1 }))
    })
  }

  async function savePlan() {
    if (!selectedPlan) {
      setPlanError("Selecciona un plan para continuar.")
      return
    }

    const normalizedCode = promoCode.trim().toUpperCase()

    setSavingPlan(true)
    setPlanError(null)

    const res = await fetch("/api/onboarding/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: selectedPlan,
        promoCode: normalizedCode || null,
      }),
    })

    const data = await res.json().catch(() => null)
    setSavingPlan(false)

    // El backend rechaza sin codigo y devuelve flag de pago requerido
    if (res.status === 402 && data?.requiresPayment) {
      router.push(`/suscripcion?plan=${selectedPlan}`)
      return
    }

    if (!res.ok) {
      setPlanError(data?.error ?? "No pudimos guardar el plan.")
      return
    }

    setPromoCode(normalizedCode)
    setStep(1)
  }

  async function saveStages() {
    setSaving(true)
    const companyId = profile!.company_id!

    // Upsert all stages
    for (const stage of stages) {
      if (stage.isNew) {
        await supabase.from("pipeline_stages").insert({
          company_id: companyId,
          name: stage.name.trim() || "Sin nombre",
          color: stage.color,
          position: stage.position,
          is_closed: stage.is_closed,
        })
      } else {
        await supabase.from("pipeline_stages").update({
          name: stage.name.trim() || "Sin nombre",
          color: stage.color,
          position: stage.position,
          is_closed: stage.is_closed,
        }).eq("id", stage.id)
      }
    }
    setSaving(false)
    // Agente Pro es un solo asiento: se salta el paso de invitar equipo
    setStep(selectedPlan === "agente_pro" ? 3 : 2)
  }

  // ── Invites ─────────────────────────────────────────────────
  async function sendInvites() {
    const validInvites = invites.filter(i => i.email.trim())
    if (validInvites.length === 0) { goToDashboard(); return }

    setSavingInvites(true)
    for (const inv of validInvites) {
      await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inv.email.trim(),
          fullName: inv.name.trim() || inv.email.split("@")[0],
          roleId: null,
          companyId: profile!.company_id,
          reportsTo: profile!.id,
        }),
      })
    }
    setSavingInvites(false)
    setStep(3)
  }

  function goToDashboard() {
    router.push("/dashboard")
  }

  // Refresca AuthContext ANTES de ir al dashboard (evita que Ajustes no aparezca)
  async function goToDashboardRefreshed() {
    await refresh()
    router.push("/dashboard")
  }

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#22D3EE]/6 rounded-full blur-[140px] pointer-events-none" />

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="font-semibold text-2xl tracking-tighter text-zinc-100 flex items-baseline justify-center">
          Flugzz<span style={{ color: "#22D3EE" }} className="ml-0.5">.</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Configura tu ecosistema en minutos</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.filter((s) => !(selectedPlan === "agente_pro" && s.id === "team")).map((s, i) => {
          const Icon = s.icon
          const active = i === step
          const done = i < step
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                active ? "bg-[#22D3EE] text-zinc-950"
                : done  ? "bg-zinc-800 text-zinc-400"
                : "bg-zinc-900/60 text-zinc-700 border border-zinc-800"
              }`}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.filter((x) => !(selectedPlan === "agente_pro" && x.id === "team")).length - 1 && (
                <div className={`w-6 h-px transition-colors ${i < step ? "bg-zinc-700" : "bg-zinc-800"}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 0: Plan ── */}
      {step === 0 && (
        <div className="w-full max-w-5xl">
          <div className="border border-zinc-800/60 rounded-3xl bg-zinc-950/80 backdrop-blur-xl p-5 sm:p-7 shadow-2xl shadow-black/40">
            <div className="flex flex-col gap-2 text-center mb-6">
              <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#22D3EE]">
                <Ticket className="h-3.5 w-3.5" /> Acceso fundador
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">Selecciona tu plan</h2>
              <p className="mx-auto max-w-2xl text-sm text-zinc-500">
                Elige la estructura que mejor describe tu operacion. Luego podras aplicar un codigo o pagar con Stripe.
              </p>
            </div>

            <PlanComparisonTable
              selectedPlan={selectedPlan}
              onSelect={(id) => {
                setSelectedPlan(id as PlanId)
                setPlanError(null)
              }}
            />

            <div className="mt-5 rounded-2xl border border-zinc-800/70 bg-black/30 p-4">
              <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                <Ticket className="h-3.5 w-3.5 text-[#22D3EE]" /> Codigo de promocion (opcional)
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value.toUpperCase())
                    setPlanError(null)
                  }}
                  placeholder="Ingresa tu codigo"
                  maxLength={16}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm uppercase tracking-[0.16em] text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-zinc-600"
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">
                  {promoCode.trim()
                    ? "Con codigo: prueba gratuita de 30 dias"
                    : "Sin codigo: te llevamos a la pantalla de pago"}
                </p>
                <button
                  type="button"
                  onClick={savePlan}
                  disabled={savingPlan || !selectedPlan}
                  className="rounded-xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Continuar</>}
                </button>
              </div>

              {planError && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {planError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-lg">
          <div className="border border-zinc-800/60 rounded-2xl bg-zinc-950/80 backdrop-blur-xl p-6">
            <h2 className="text-zinc-100 font-medium text-lg mb-1">Personaliza tu pipeline</h2>
            <p className="text-xs text-zinc-500 mb-5">
              Estas son las etapas por defecto. Renómbralas, reordénalas o agrega las que necesites.
            </p>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDragEnd={() => setDragIdx(null)}
                  className="flex items-center gap-3 p-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical className="w-4 h-4 text-zinc-700 shrink-0 group-hover:text-zinc-500 transition-colors" />

                  {/* Color picker */}
                  <div className="flex gap-1 shrink-0">
                    {STAGE_COLORS.slice(0, 5).map(c => (
                      <button key={c} type="button" onClick={() => updateStage(stage.id, { color: c })}
                        className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${stage.color === c ? "border-white scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <input
                    value={stage.name}
                    onChange={e => updateStage(stage.id, { name: e.target.value })}
                    placeholder="Nombre de etapa"
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                  />

                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input type="checkbox" checked={stage.is_closed}
                      onChange={e => updateStage(stage.id, { is_closed: e.target.checked })}
                      className="w-3.5 h-3.5 accent-emerald-400" />
                    <span className="text-[10px] text-zinc-600">Cerrada</span>
                  </label>

                  <button onClick={() => removeStage(stage.id)}
                    className="p-1 text-zinc-700 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addStage}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar etapa
            </button>

            <button onClick={saveStages} disabled={saving}
              className="mt-5 w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Guardar y continuar</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Team invites ── */}
      {step === 2 && (
        <div className="w-full max-w-lg">
          <div className="border border-zinc-800/60 rounded-2xl bg-zinc-950/80 backdrop-blur-xl p-6">
            <h2 className="text-zinc-100 font-medium text-lg mb-1">Invita a tu equipo</h2>
            <p className="text-xs text-zinc-500 mb-5">
              Opcional — puedes hacerlo después desde Ajustes → Equipo.
            </p>

            <div className="space-y-3">
              {invites.map((inv, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={inv.name}
                    onChange={e => setInvites(prev => prev.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                    className="w-32 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={inv.email}
                    onChange={e => setInvites(prev => prev.map((r, j) => j === i ? { ...r, email: e.target.value } : r))}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600"
                  />
                  {invites.length > 1 && (
                    <button onClick={() => setInvites(prev => prev.filter((_, j) => j !== i))}
                      className="p-2 text-zinc-700 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setInvites(prev => [...prev, { email: "", name: "" }])}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar otro
            </button>

            <div className="flex gap-3 mt-5">
              <button onClick={goToDashboard}
                className="flex-1 border border-zinc-800 rounded-xl py-3 text-sm text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors">
                Omitir por ahora
              </button>
              <button onClick={sendInvites} disabled={savingInvites}
                className="flex-1 bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {savingInvites ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Enviar invitaciones</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && (
        <div className="w-full max-w-md text-center">
          <div className="border border-zinc-800/60 rounded-2xl bg-zinc-950/80 backdrop-blur-xl p-10">
            <div className="w-16 h-16 rounded-full bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-[#22D3EE]" />
            </div>
            <h2 className="text-zinc-100 font-semibold text-xl mb-2">
              ¡Tu ecosistema está listo
              <span style={{ color: "#22D3EE" }}>.</span>
            </h2>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              Pipeline configurado. Invitaciones enviadas. Ya puedes comenzar a operar.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-left">
              {[
                { label: "Plan", desc: selectedPlan ? PLAN_NAMES[selectedPlan] : "Seleccionado" },
                { label: "Pipeline", desc: `${stages.length} etapas listas` },
                { label: "Rol", desc: "Director asignado" },
                { label: "Equipo", desc: selectedPlan === "agente_pro" ? "No aplica" : `${invites.filter(i => i.email).length} invitados` },
              ].map(item => (
                <div key={item.label} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-600 mb-0.5">{item.label}</p>
                  <p className="text-xs text-zinc-300 font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={goToDashboardRefreshed}
              className="w-full bg-[#22D3EE] text-zinc-950 rounded-xl py-3 text-sm font-bold hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              Entrar al dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

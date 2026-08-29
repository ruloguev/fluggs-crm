"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase"
import { PLAN_LIMITS, type PlanId } from "@/lib/stripe-plans"
import { CheckoutModal } from "@/components/payments/checkout-modal"
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table"
import { Loader2, Minus, Plus, CreditCard, Sparkles, ArrowRight, Ticket, CheckCircle2, Shield, AlertCircle, ChevronDown, ChevronUp, Rocket } from "lucide-react"
import Link from "next/link"

const StripeLogo = ({ className = "h-3.5" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60 25"
    aria-hidden="true"
    className={className}
  >
    <path
      fill="#635BFF"
      d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.91-1.04l-.01 4.63-4.12.87V5.57h3.62l.21 1.02a4.45 4.45 0 0 1 3.36-1.29c3.01 0 5.85 2.7 5.85 7.66 0 5.41-2.81 7.34-6 7.34zm-.96-11.4c-.79 0-1.28.28-1.64.65l.02 6.16c.34.35.81.64 1.62.64 1.27 0 2.13-1.38 2.13-3.74 0-2.3-.87-3.71-2.13-3.71zM32.16 5.43l-4.13.88V3.06l4.13-.87v3.24zM28 6.79h4.13v13.23H28V6.79zm-4.36 9.04c0-1.32-.55-1.81-1.74-2.16l-1.36-.4c-1.36-.4-2.49-1.13-2.49-3.07 0-2.09 1.64-3.51 4.27-3.51 1.36 0 2.55.27 3.55.69v3.4c-1.04-.51-2.1-.78-3.18-.78-.91 0-1.46.3-1.46.95 0 .68.5.9 1.43 1.18l1.13.34c1.65.49 3.05 1.32 3.05 3.55 0 2.32-1.84 3.66-4.6 3.66-1.5 0-2.87-.31-3.83-.78v-3.46c1.16.61 2.4.97 3.6.97 1.04 0 1.63-.34 1.63-.98zm-9.85-2.32c0-1.55-.55-2.7-2.04-2.7-1.5 0-2.13 1.16-2.13 2.7 0 1.65.65 2.78 2.13 2.78 1.49 0 2.04-1.13 2.04-2.78zm4.18 0c0 3.57-2.15 6.19-5.7 6.19-1.44 0-2.46-.36-3.2-.95l-.21 1.04H5.21V2.7l4.13-.88v5.42c.7-.66 1.66-1.06 3.05-1.06 3.18 0 5.58 2.66 5.58 6.32zM5.2 20.3c-1.3 0-2.32-.55-2.9-1.01L2.28 24l-4.13.87V6.79h3.6l.22 1.05a4.4 4.4 0 0 1 3.32-1.32c3.06 0 5.57 2.65 5.57 6.59 0 4.36-2.5 7.19-5.65 7.19z"
    />
  </svg>
)

type ValidationState =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "valid"; currentUses: number; maxUses: number; campaign: string; alreadyRedeemed: boolean }
  | { kind: "invalid"; message: string }

export default function SuscripcionPage() {
  const router = useRouter()
  const { profile, company, role, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("expansion")
  const [seats, setSeats] = useState(PLAN_LIMITS.expansion.min)
  const [showCheckout, setShowCheckout] = useState(false)
  const [currentSub, setCurrentSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)

  const [promoInput, setPromoInput] = useState("")
  const [validation, setValidation] = useState<ValidationState>({ kind: "idle" })
  const [redeeming, setRedeeming] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)
  const [promoOpen, setPromoOpen] = useState(false)

  useEffect(() => {
    if (authLoading || !profile?.company_id) return
    setLoading(true)
    ;(async () => {
      const [{ data: sub }, { count }] = await Promise.all([
        supabase.from("company_subscriptions").select("*").eq("company_id", profile.company_id).maybeSingle(),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("is_active", true),
      ])
      setCurrentSub(sub)
      setMemberCount(count ?? 0)
      if (sub?.plan_id && PLAN_LIMITS[sub.plan_id as PlanId]) {
        setSelectedPlan(sub.plan_id as PlanId)
        if (typeof sub.seats === "number" && sub.seats > 0) {
          setSeats(sub.seats)
        }
      }
      setLoading(false)
    })()
  }, [authLoading, profile?.company_id])

  // Pre-selección desde onboarding (?plan=agente_pro)
  useEffect(() => {
    const planParam = new URLSearchParams(window.location.search).get("plan")
    if (planParam && planParam in PLAN_LIMITS) {
      setSelectedPlan(planParam as PlanId)
      setSeats(PLAN_LIMITS[planParam as PlanId].min)
    }
  }, [])

  useEffect(() => {
    const { min, max } = PLAN_LIMITS[selectedPlan]
    setSeats((prev) => {
      // Si la sub actual coincide con el plan seleccionado, mantener seats del sub
      if (currentSub?.plan_id === selectedPlan && typeof currentSub?.seats === "number") {
        return Math.max(min, Math.min(max, currentSub.seats))
      }
      // Cualquier otro caso (cambio manual de plan, sin sub) → partir desde min
      // para que el cliente vaya creciendo desde el rango más bajo del plan.
      return min
    })
  }, [selectedPlan, currentSub])

  const isDirector = (role?.level ?? 99) <= 1 || (role?.name ?? "").toLowerCase().includes("director")
  const hasActiveSub = currentSub && ["active", "past_due"].includes(currentSub.status)
  const hasTrial = currentSub?.status === "trial"
  const limit = PLAN_LIMITS[selectedPlan]
  const isAgentePro = selectedPlan === "agente_pro"
  const monthlySubtotal = limit.unitPrice * seats
  const clampedSeats = Math.min(Math.max(seats, limit.min), limit.max)
  const planLabel = (id: PlanId) => PLAN_LIMITS[id].name

  async function validatePromo() {
    if (!promoInput.trim()) return
    setValidation({ kind: "validating" })
    setPromoError(null)
    setPromoSuccess(null)
    try {
      const res = await fetch("/api/payments/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim().toUpperCase(), planId: selectedPlan }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setValidation({ kind: "invalid", message: data?.error ?? "No pudimos validar el código." })
        return
      }
      if (data?.planMismatch && typeof data.planId === "string") {
        const target = data.planId as PlanId
        setSelectedPlan(target)
        setValidation({
          kind: "valid",
          currentUses: data.currentUses ?? 0,
          maxUses: data.maxUses ?? 0,
          campaign: data.campaign,
          alreadyRedeemed: Boolean(data.alreadyRedeemed),
        })
        return
      }
      if (!data?.ok) {
        setValidation({ kind: "invalid", message: data?.error ?? "Código inválido." })
        return
      }
      setValidation({
        kind: "valid",
        currentUses: data.currentUses,
        maxUses: data.maxUses,
        campaign: data.campaign,
        alreadyRedeemed: data.alreadyRedeemed,
      })
    } catch (e) {
      setValidation({ kind: "invalid", message: "Error de red." })
    }
  }

  async function activatePromo() {
    if (validation.kind !== "valid") return
    setRedeeming(true)
    setPromoError(null)
    setPromoSuccess(null)
    try {
      const res = await fetch("/api/onboarding/redeem-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan, code: promoInput.trim().toUpperCase() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setPromoError(data?.error ?? "No pudimos activar la prueba.")
        setRedeeming(false)
        return
      }
      setPromoSuccess("¡Prueba activada! Redirigiendo al dashboard…")
      // Hard reload: garantiza que el layout re-evalúe subStatus desde cero.
      // Evita race conditions con el cache de useEffect en client-side routing.
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 600)
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Error de red.")
      setRedeeming(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-flugzz-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Suscripción<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Elige tu plan y la cantidad de asientos para tu equipo.
          </p>
        </div>
      </div>

      {hasActiveSub && currentSub && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300">Suscripción activa</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Plan {planLabel(currentSub.plan_id as PlanId)} · {currentSub.seats} {currentSub.seats === 1 ? "asiento" : "asientos"} ·{" "}
              {currentSub.current_period_end ? new Date(currentSub.current_period_end).toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : ""}
            </p>
          </div>
          <Link href="/ajustes/cuenta" className="text-xs text-emerald-300 hover:text-emerald-200">
            Gestionar →
          </Link>
        </div>
      )}

      {hasTrial && currentSub && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-300">Prueba activa</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Plan {planLabel(currentSub.plan_id as PlanId)} · Termina el{" "}
              {currentSub.current_period_end
                ? new Date(currentSub.current_period_end).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
          {isDirector && (
            <Link
              href="/ajustes/cuenta"
              className="rounded-lg bg-cyan-500 text-zinc-950 px-3 py-1.5 text-xs font-semibold hover:opacity-90"
            >
              Activar plan de pago
            </Link>
          )}
        </div>
      )}

      <section>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Compara los planes</h2>
        <PlanComparisonTable
          selectedPlan={selectedPlan}
          onSelect={(id) => setSelectedPlan(id)}
          interactive={!hasActiveSub}
        />
        <p className="mt-3 text-xs text-zinc-500">
          Fundación, Expansión e Imperio incluyen los mismos módulos: solo cambian los asientos, el asistente IA y el almacenamiento.
        </p>
      </section>

      {!hasActiveSub && (
        <>
          {!isAgentePro && (
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Asientos</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Rango: {limit.min} - {limit.max === 9999 ? "∞" : limit.max} para el plan {limit.name}
                  </p>
                </div>
                {memberCount > 0 && (
                  <p className="text-xs text-zinc-500">
                    Miembros activos: <span className="text-zinc-300 font-medium">{memberCount}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.max(limit.min, s - 1))}
                  disabled={seats <= limit.min}
                  className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-300 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={limit.min}
                  max={limit.max}
                  value={seats}
                  onChange={(e) => {
                    const val = parseInt(e.target.value || "0", 10)
                    if (Number.isNaN(val)) return
                    setSeats(Math.max(limit.min, Math.min(limit.max, val)))
                  }}
                  className="flex-1 h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-center text-zinc-100 text-sm font-mono outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setSeats((s) => Math.min(limit.max, s + 1))}
                  disabled={seats >= limit.max}
                  className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-300 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isAgentePro && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-300">1 asiento fijo</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  El plan Agente Pro es para agentes independientes: una sola cuenta, sin gestión de equipo.
                </p>
              </div>
              <Ticket className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-2">
            <p className="text-sm font-medium text-zinc-100 mb-3">Resumen</p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Costo por asiento</span>
              <span className="text-zinc-200">${limit.unitPrice} MXN/mes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Asientos</span>
              <span className="text-zinc-200">{isAgentePro ? "1 (fijo)" : seats}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Subtotal mensual</span>
              <span className="text-zinc-200">${monthlySubtotal.toLocaleString("es-MX")} MXN</span>
            </div>
            {limit.setupFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Setup inicial (pago único)</span>
                <span className="text-zinc-200">${limit.setupFee.toLocaleString("es-MX")} MXN</span>
              </div>
            )}

            <div className="h-px bg-zinc-800 my-3" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">Cargo hoy</span>
              <span className="text-lg font-semibold text-zinc-100">
                ${(monthlySubtotal + limit.setupFee).toLocaleString("es-MX")} MXN
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Renovación cada mes</span>
              <span className="text-xs text-zinc-400">
                ${monthlySubtotal.toLocaleString("es-MX")} MXN
              </span>
            </div>

            {isAgentePro && (
              <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                Promo de lanzamiento: 1 mes gratis usando el código <span className="font-mono font-semibold">FLUGZZINDIE</span>
              </p>
            )}
          </div>
        </>
      )}

      {/* Badge Stripe + CTA pago */}
      {!hasActiveSub && !hasTrial && (
        <div className="space-y-3">
          <div className="rounded-xl border border-flugzz-accent/30 bg-flugzz-accent/5 px-4 py-3 flex items-center gap-3">
            <Shield className="w-4 h-4 text-flugzz-accent shrink-0" />
            <p className="text-xs text-zinc-200 flex-1">
              Pago 100% seguro con encriptación <span className="font-semibold">PCI-DSS</span>
            </p>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Powered by</span>
              <StripeLogo className="h-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {isDirector ? (
              <button
                onClick={() => setShowCheckout(true)}
                className="rounded-xl bg-zinc-100 text-zinc-900 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2"
              >
                Continuar al pago <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-xs text-zinc-500">Solo el director puede modificar la suscripción.</p>
            )}
          </div>
        </div>
      )}

      {/* Flujo 2 pasos: Validar → Activar (colapsable, siempre accesible) */}
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40">
        <button
          type="button"
          onClick={() => {
            setPromoOpen((o) => !o)
            if (!promoOpen) {
              setPromoError(null)
              setPromoSuccess(null)
            }
          }}
          className="w-full flex items-center justify-between gap-3 p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-flugzz-accent" />
            <span className="text-sm font-medium text-zinc-100">Tengo un código de activación</span>
          </div>
          {promoOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {promoOpen && (
          <div className="px-5 pb-5 space-y-3">
            <p className="text-xs text-zinc-500">
              Activa tu prueba gratuita de 30 días.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase())
                  setValidation({ kind: "idle" })
                  setPromoError(null)
                  setPromoSuccess(null)
                }}
                placeholder="Código de activación"
                className="flex-1 h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-mono outline-none focus:border-zinc-600"
              />
              <button
                onClick={validatePromo}
                disabled={!promoInput.trim() || validation.kind === "validating"}
                className="rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 px-4 py-2 text-sm font-semibold disabled:opacity-30 flex items-center gap-2 justify-center"
              >
                {validation.kind === "validating" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Validar código"
                )}
              </button>
            </div>

            {validation.kind === "valid" && (
              <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-950/40 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-300">
                      ¡Código válido!
                    </p>
                    {validation.campaign && (
                      <p className="text-xs text-emerald-400/70">Campaña: {validation.campaign}</p>
                    )}
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {validation.currentUses}/{validation.maxUses} usos globales
                      {validation.alreadyRedeemed && " · tu empresa ya lo redimió"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-black/40 border border-emerald-500/20 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Plan a activar:</span>
                    <span className="font-semibold text-zinc-100">{planLabel(selectedPlan)}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Asientos:</span>
                    <span className="font-semibold text-zinc-100">{clampedSeats}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Duración de la prueba:</span>
                    <span className="font-semibold text-emerald-400">30 días gratis</span>
                  </div>
                </div>

                {!validation.alreadyRedeemed && (
                  <button
                    onClick={activatePromo}
                    disabled={redeeming}
                    className="w-full rounded-xl bg-cyan-500 text-black px-4 py-3.5 text-base font-bold hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2 border border-cyan-300 shadow-lg shadow-cyan-500/30 transition-all"
                  >
                    {redeeming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Rocket className="w-5 h-5" />
                        Activar prueba de 30 días
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {validation.kind === "invalid" && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validation.message}</span>
              </div>
            )}

            {promoError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p>{promoError}</p>
                  <button
                    onClick={activatePromo}
                    disabled={redeeming}
                    className="mt-2 text-xs underline text-red-200 hover:text-red-100 disabled:opacity-50"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {promoSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <p className="text-sm text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {promoSuccess}
                </p>
                <button
                  onClick={() => { window.location.href = "/dashboard" }}
                  className="w-full rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors"
                >
                  Ir al dashboard ahora →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal
          planId={selectedPlan}
          seats={seats}
          open={showCheckout}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false)
            window.location.href = "/dashboard"
          }}
        />
      )}
    </div>
  )
}

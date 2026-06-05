"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase"
import { PLAN_LIMITS, PLAN_FEATURES, SETUP_FEE, type PlanId } from "@/lib/stripe-plans"
import { CheckoutModal } from "@/components/payments/checkout-modal"
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table"
import { Loader2, Minus, Plus, CreditCard, Sparkles, ArrowRight, Ticket, CheckCircle2 } from "lucide-react"
import Link from "next/link"

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
  const [redeeming, setRedeeming] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<{ plan: PlanId; expiresAt: string } | null>(null)

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

  // Al cambiar de plan: respetar el valor actual si está dentro del rango;
  // si no, hacer clamp a min o max.
  useEffect(() => {
    const { min, max } = PLAN_LIMITS[selectedPlan]
    setSeats((prev) => Math.max(min, Math.min(max, prev)))
  }, [selectedPlan])

  const isDirector = (role?.level ?? 99) <= 1 || (role?.name ?? "").toLowerCase().includes("director")
  const hasActiveSub = currentSub && ["active", "past_due"].includes(currentSub.status)
  const hasTrial = currentSub?.status === "trial"
  const limit = PLAN_LIMITS[selectedPlan]
  const monthlySubtotal = limit.unitPrice * seats
  const totalFirstMonth = monthlySubtotal + (hasActiveSub ? 0 : SETUP_FEE)

  async function redeemPromo() {
    if (!promoInput.trim()) return
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
        setPromoError(data?.error ?? "No pudimos validar el código.")
        return
      }
      setPromoSuccess({ plan: selectedPlan, expiresAt: data.expiresAt })
      setPromoInput("")
      setTimeout(() => router.push("/dashboard"), 1500)
    } finally {
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
              Plan {currentSub.plan_id} · {currentSub.seats} {currentSub.seats === 1 ? "asiento" : "asientos"} ·{" "}
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
              Plan {currentSub.plan_id} · Termina el{" "}
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

      {/* Tabla comparativa */}
      <section>
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Compara los planes</h2>
        <PlanComparisonTable
          selectedPlan={selectedPlan}
          onSelect={(id) => setSelectedPlan(id)}
          interactive={!hasActiveSub}
        />
      </section>

      {!hasActiveSub && (
        <>
          {/* Seats stepper */}
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

          {/* Resumen */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-2">
            <p className="text-sm font-medium text-zinc-100 mb-3">Resumen</p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Costo por asiento</span>
              <span className="text-zinc-200">${limit.unitPrice} MXN/mes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Asientos</span>
              <span className="text-zinc-200">{seats}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Subtotal mensual</span>
              <span className="text-zinc-200">${monthlySubtotal.toLocaleString("es-MX")} MXN</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Setup inicial (pago único)</span>
              <span className="text-zinc-200">${SETUP_FEE.toLocaleString("es-MX")} MXN</span>
            </div>

            <div className="h-px bg-zinc-800 my-3" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">Cargo hoy</span>
              <span className="text-lg font-semibold text-zinc-100">
                ${(monthlySubtotal + SETUP_FEE).toLocaleString("es-MX")} MXN
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Renovación cada mes</span>
              <span className="text-xs text-zinc-400">
                ${monthlySubtotal.toLocaleString("es-MX")} MXN
              </span>
            </div>
          </div>
        </>
      )}

      {/* CTA principal: pago (solo si no tiene sub activa ni trial) */}
      {!hasActiveSub && !hasTrial && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-flugzz-accent" />
            Pago seguro procesado por Stripe
          </p>
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
      )}

      {/* Input de código promo (solo si no tiene sub activa ni trial) */}
      {!hasActiveSub && !hasTrial && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-flugzz-accent" />
            <p className="text-sm font-medium text-zinc-100">¿Tienes un código de activación?</p>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            Activa tu prueba gratuita de 30 días. (Válido una sola vez por empresa.)
          </p>
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase())
                setPromoError(null)
                setPromoSuccess(null)
              }}
              placeholder="FLUGZZ01"
              maxLength={8}
              className="flex-1 h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-mono outline-none focus:border-zinc-600"
            />
            <button
              onClick={redeemPromo}
              disabled={!promoInput.trim() || redeeming}
              className="rounded-xl bg-flugzz-accent text-zinc-900 px-4 py-2 text-sm font-semibold disabled:opacity-30 flex items-center gap-2"
            >
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activar prueba"}
            </button>
          </div>
          {promoError && (
            <p className="text-xs text-red-400 mt-2">{promoError}</p>
          )}
          {promoSuccess && (
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> ¡Prueba activada! Redirigiendo al dashboard…
            </p>
          )}
        </div>
      )}

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

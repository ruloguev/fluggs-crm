"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase"
import { PLAN_LIMITS, SETUP_FEE, type PlanId } from "@/lib/stripe-plans"
import { CheckoutModal } from "@/components/payments/checkout-modal"
import { Loader2, Minus, Plus, Check, Crown, ShieldCheck, Zap, CreditCard, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

const PLAN_ICONS: Record<PlanId, any> = {
  fundacion: ShieldCheck,
  expansion: Zap,
  imperio: Crown,
}

export default function SuscripcionPage() {
  const { profile, company, role, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("expansion")
  const [seats, setSeats] = useState(PLAN_LIMITS.expansion.min)
  const [showCheckout, setShowCheckout] = useState(false)
  const [currentSub, setCurrentSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)

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
      setLoading(false)
    })()
  }, [authLoading, profile?.company_id])

  // Ajustar seats al mínimo del plan cuando se cambia de plan
  useEffect(() => {
    const min = PLAN_LIMITS[selectedPlan].min
    if (seats < min) setSeats(min)
  }, [selectedPlan])

  const isDirector = (role?.level ?? 99) <= 1 || (role?.name ?? "").toLowerCase().includes("director")
  const hasActiveSub = currentSub && ["active", "past_due"].includes(currentSub.status)
  const limit = PLAN_LIMITS[selectedPlan]
  const monthlySubtotal = limit.unitPrice * seats
  const totalFirstMonth = monthlySubtotal + (hasActiveSub ? 0 : SETUP_FEE)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
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

      {/* Plan cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(PLAN_LIMITS) as PlanId[]).map((id) => {
          const plan = PLAN_LIMITS[id]
          const Icon = PLAN_ICONS[id]
          const active = selectedPlan === id
          return (
            <button
              key={id}
              onClick={() => setSelectedPlan(id)}
              className={`text-left rounded-2xl border p-4 transition-all ${
                active
                  ? "border-flugzz-accent bg-flugzz-accent/5"
                  : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? "bg-flugzz-accent/20 text-flugzz-accent" : "bg-zinc-950 border border-zinc-800 text-zinc-400"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {active && <Check className="w-4 h-4 text-flugzz-accent ml-auto" />}
              </div>
              <p className="text-sm font-medium text-zinc-100">{plan.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{plan.range}</p>
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{plan.description}</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-xl font-semibold text-zinc-100">${plan.unitPrice}</span>
                <span className="text-xs text-zinc-500">MXN/asiento/mes</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Seats stepper */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-zinc-100">Asientos</p>
            <p className="text-xs text-zinc-500 mt-0.5">Rango: {limit.min} - {limit.max} para el plan {limit.name}</p>
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
            onClick={() => setSeats(Math.max(limit.min, seats - 1))}
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
            onClick={() => setSeats(Math.min(limit.max, seats + 1))}
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
        {!hasActiveSub && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Setup inicial (pago único)</span>
            <span className="text-zinc-200">${SETUP_FEE.toLocaleString("es-MX")} MXN</span>
          </div>
        )}

        <div className="h-px bg-zinc-800 my-3" />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-200">Cargo hoy</span>
          <span className="text-lg font-semibold text-zinc-100">
            ${totalFirstMonth.toLocaleString("es-MX")} MXN
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Renovación cada mes</span>
          <span className="text-xs text-zinc-400">
            ${monthlySubtotal.toLocaleString("es-MX")} MXN
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-flugzz-accent" />
          Pago seguro procesado por Stripe
        </p>
        {isDirector ? (
          <button
            onClick={() => setShowCheckout(true)}
            disabled={hasActiveSub}
            className="rounded-xl bg-zinc-100 text-zinc-900 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {hasActiveSub ? "Ya tienes suscripción" : <>Continuar al pago <ArrowRight className="w-4 h-4" /></>}
          </button>
        ) : (
          <p className="text-xs text-zinc-500">Solo el director puede modificar la suscripción.</p>
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

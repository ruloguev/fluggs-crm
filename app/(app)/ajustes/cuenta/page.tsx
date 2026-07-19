"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, User, Shield, Building2, AlertTriangle, AlertCircle, X, Check, CreditCard, ExternalLink, XCircle, Pause, ArrowRight, Lock, Mail, Edit2 } from "lucide-react"
import { useRouter } from "next/navigation"

type ProfileDetail = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: { name: string } | null
  team_memberships: { reports_to: string | null }[]
}

type SubDetail = {
  plan_id: string
  seats: number
  status: "trial" | "active" | "past_due" | "cancelled" | "expired"
  current_period_end?: string | null
  setup_fee_paid?: boolean
  cancel_at_period_end?: boolean
}

function SubscriptionSection({ isDirector, onPortalClick, portalLoading }: { isDirector: boolean; onPortalClick: () => void; portalLoading: boolean }) {
  const supabase = createClient()
  const { profile } = useAuth()
  const [sub, setSub] = useState<SubDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  async function load() {
    if (!profile?.company_id) return
    const { data } = await supabase
      .from("company_subscriptions")
      .select("plan_id, seats, status, current_period_end, setup_fee_paid, cancel_at_period_end")
      .eq("company_id", profile.company_id)
      .maybeSingle()
    setSub(data as SubDetail | null)
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.company_id])

  async function cancel() {
    if (!confirm("¿Cancelar la suscripción? Mantendrás acceso hasta el final del periodo actual.")) return
    setActionLoading(true)
    const res = await fetch("/api/payments/cancel", { method: "POST" })
    const data = await res.json().catch(() => null)
    setActionLoading(false)
    if (!res.ok) { alert(data?.error ?? "Error al cancelar"); return }
    await load()
  }

  async function resume() {
    setActionLoading(true)
    const res = await fetch("/api/payments/resume", { method: "POST" })
    const data = await res.json().catch(() => null)
    setActionLoading(false)
    if (!res.ok) { alert(data?.error ?? "Error al reanudar"); return }
    await load()
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
        <Loader2 className="w-5 h-5 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-flugzz-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-medium text-zinc-100">Suscripción</h2>
          <p className="text-xs text-zinc-500">Plan y estado de tu cuenta.</p>
        </div>
        {isDirector && (
          <Link
            href="/suscripcion"
            className="text-xs text-flugzz-accent hover:text-flugzz-accent/80 font-medium flex items-center gap-1"
          >
            Ver planes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {!sub ? (
        isDirector ? (
          <Link
            href="/suscripcion"
            className="block rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-200">No tienes suscripción activa</p>
                <p className="text-xs text-zinc-500 mt-0.5">Activa un plan para empezar.</p>
              </div>
              <span className="text-xs text-amber-300 font-medium">Ver planes →</span>
            </div>
          </Link>
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-200">No tienes suscripción activa.</p>
            <p className="text-xs text-zinc-500 mt-0.5">Pide a tu director que active un plan.</p>
          </div>
        )
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Plan</p>
              <p className="text-sm text-zinc-200 capitalize">{sub.plan_id}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Asientos</p>
              <p className="text-sm text-zinc-200">{sub.seats}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Estado</p>
              <p className={`text-sm font-medium capitalize ${
                sub.status === "active" ? "text-emerald-400"
                : sub.status === "trial" ? "text-cyan-400"
                : sub.status === "past_due" ? "text-amber-400"
                : "text-red-400"
              }`}>
                {sub.status === "active" ? "Activa" : sub.status === "trial" ? "Prueba" : sub.status === "past_due" ? "Pago pendiente" : sub.status === "cancelled" ? "Cancelada" : "Expirada"}
              </p>
            </div>
            {sub.current_period_end && (
              <div className="sm:col-span-3">
                <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">
                  {sub.cancel_at_period_end ? "Acceso hasta" : "Próxima renovación"}
                </p>
                <p className="text-sm text-zinc-200">
                  {new Date(sub.current_period_end).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
          </div>

          {sub.cancel_at_period_end && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200 flex items-center justify-between">
              <span>Tu suscripción se cancelará al final del periodo actual.</span>
              {isDirector && (
                <button onClick={resume} disabled={actionLoading} className="text-xs text-amber-300 hover:text-amber-100 font-medium">
                  Reanudar
                </button>
              )}
            </div>
          )}

          {sub.status === "past_due" && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              El último pago fue rechazado. Actualiza tu método de pago para evitar la cancelación.
            </div>
          )}

          {isDirector && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/60">
              <Link href="/suscripcion" className="rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 px-3 py-1.5 text-xs flex items-center gap-1.5">
                Cambiar plan / asientos
              </Link>
              <button onClick={onPortalClick} disabled={portalLoading} className="rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50">
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Gestionar método de pago
              </button>
              {!sub.cancel_at_period_end && sub.status === "active" && (
                <button onClick={cancel} disabled={actionLoading} className="rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10 px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                  Cancelar suscripción
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function CuentaPage() {
  const { profile, company, role, loading: authLoading } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [detail, setDetail] = useState<ProfileDetail | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editMode, setEditMode] = useState<"name" | "email" | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [emailConfirmSent, setEmailConfirmSent] = useState(false)

  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSent, setPwdSent] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  const isDirector = (role?.level ?? 99) <= 1 || (role?.name ?? "").toLowerCase().includes("director")

  async function openCustomerPortal() {
    setPortalLoading(true)
    const res = await fetch("/api/payments/customer-portal", { method: "POST" })
    const data = await res.json().catch(() => null)
    setPortalLoading(false)
    if (!res.ok) { alert(data?.error ?? "Error al abrir portal"); return }
    if (data?.url) window.open(data.url, "_blank")
  }

  async function sendPasswordReset() {
    setPwdLoading(true)
    setPwdError(null)
    setPwdSent(false)
    const appUrl = typeof window !== "undefined" ? window.location.origin : ""
    const redirectTo = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || appUrl || "http://localhost:3000") + "/login"
    const { error } = await supabase.auth.resetPasswordForEmail(detail?.email ?? "", {
      redirectTo,
    })
    setPwdLoading(false)
    if (error) {
      setPwdError(error.message)
    } else {
      setPwdSent(true)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!profile) { router.replace("/login"); return }

    setLoading(true)

    ;(async () => {
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          role:roles(name),
          team_memberships!team_memberships_user_id_fkey(reports_to)
        `)
        .eq("id", profile.id)
        .single()

      if (!profileErr && profileData) setDetail(profileData as unknown as ProfileDetail)

    if (profile.company_id) {
      const { data: comp } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .single()
      if (comp) setCompanyName(comp.name)
    }

      setLoading(false)
    })()
  }, [authLoading, profile])

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    const res = await fetch("/api/account/delete", { method: "DELETE" })
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setError(data?.error ?? "Error al eliminar la cuenta.")
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  const hasSuperior = detail?.team_memberships?.[0]?.reports_to != null

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <User className="w-5 h-5 text-flugzz-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Cuenta<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Información de tu perfil y administración de cuenta.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            <User className="w-4 h-4 text-flugzz-accent" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Tu perfil</h2>
            <p className="text-xs text-zinc-500">Información general de tu cuenta.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Nombre</p>
            {editMode === "name" ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  autoFocus
                />
                <button onClick={async () => {
                  if (!editName.trim()) return
                  setSaving(true); setSaveError(null); setSaveSuccess(null)
                  try {
                    const res = await fetch("/api/account/update-profile", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ full_name: editName.trim() }),
                    })
                    const data = await res.json()
                    if (!res.ok) { setSaveError(data.error); return }
                    setDetail(d => d ? { ...d, full_name: editName.trim() } : d)
                    setSaveSuccess("Nombre actualizado")
                    setEditMode(null)
                    setTimeout(() => setSaveSuccess(null), 3000)
                  } catch { setSaveError("Error al guardar") }
                  setSaving(false)
                }} disabled={saving || !editName.trim()} className="p-2 rounded-lg bg-cyan-500 text-zinc-950 hover:bg-cyan-400 disabled:opacity-40">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditMode(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p className="text-sm text-zinc-200">{detail?.full_name ?? "—"}</p>
                <button onClick={() => { setEditName(detail?.full_name ?? ""); setEditMode("name"); setSaveSuccess(null) }} className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-500 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Email</p>
            {editMode === "email" ? (
              <div className="flex items-center gap-2">
                <input
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  type="email"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  autoFocus
                />
                <button onClick={async () => {
                  if (!editEmail.trim()) return
                  setSaving(true); setSaveError(null); setSaveSuccess(null); setEmailConfirmSent(false)
                  try {
                    const res = await fetch("/api/account/update-profile", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: editEmail.trim() }),
                    })
                    const data = await res.json()
                    if (!res.ok) { setSaveError(data.error); return }
                    setDetail(d => d ? { ...d, email: editEmail.trim() } : d)
                    if (data.confirmationSent) {
                      setEmailConfirmSent(true)
                      setSaveSuccess("Se envió un link de confirmación al nuevo correo")
                    } else {
                      setSaveSuccess("Email actualizado")
                    }
                    setEditMode(null)
                    setTimeout(() => setSaveSuccess(null), 5000)
                  } catch { setSaveError("Error al guardar") }
                  setSaving(false)
                }} disabled={saving || !editEmail.trim()} className="p-2 rounded-lg bg-cyan-500 text-zinc-950 hover:bg-cyan-400 disabled:opacity-40">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditMode(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p className="text-sm text-zinc-200">{detail?.email ?? "—"}</p>
                <button onClick={() => { setEditEmail(detail?.email ?? ""); setEditMode("email"); setSaveSuccess(null) }} className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-500 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Teléfono</p>
            <p className="text-sm text-zinc-200">{detail?.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Rol</p>
            <p className="text-sm text-zinc-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              {role?.name ?? detail?.role?.name ?? "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Empresa</p>
            <p className="text-sm text-zinc-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              {companyName ?? company?.name ?? "—"}
            </p>
          </div>
        </div>

        {saveError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <Check className="w-4 h-4 shrink-0" />{saveSuccess}
          </div>
        )}
        {emailConfirmSent && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
            <Mail className="w-4 h-4 shrink-0" />
            Revisa tu nuevo correo para confirmar el cambio. Mientras tanto, sigue usando tu email actual para iniciar sesión.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            <Lock className="w-4 h-4 text-flugzz-accent" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-zinc-100">Contraseña</h2>
            <p className="text-xs text-zinc-500">Recibirás un enlace por correo para cambiarla.</p>
          </div>
        </div>

        {pwdSent ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Correo enviado</p>
              <p className="text-xs text-zinc-400 mt-0.5">Revisa tu bandeja de entrada y sigue las instrucciones para cambiar tu contraseña.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              Se enviará un enlace seguro a <strong className="text-zinc-300">{detail?.email}</strong>.
            </p>
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={pwdLoading}
              className="shrink-0 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors flex items-center gap-2"
            >
              {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {pwdLoading ? "Enviando..." : "Cambiar contraseña"}
            </button>
          </div>
        )}
        {pwdError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {pwdError}
          </div>
        )}
        {pwdSent && (
          <button
            type="button"
            onClick={() => { setPwdSent(false); setPwdError(null) }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Enviar de nuevo
          </button>
        )}
      </div>

      <SubscriptionSection
        isDirector={isDirector}
        onPortalClick={openCustomerPortal}
        portalLoading={portalLoading}
      />

      <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-red-300">Eliminar cuenta</h2>
            <p className="text-xs text-zinc-500">Esta acción es irreversible.</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-xs text-zinc-400 space-y-2">
          <p className="flex items-start gap-2">
            <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span>Se eliminará tu perfil y acceso al sistema.</span>
          </p>
          {hasSuperior ? (
            <p className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>Tus leads serán reasignados a tu superior inmediato y recibirá una notificación.</span>
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>No tienes un superior asignado. Todos tus leads serán eliminados permanentemente.</span>
            </p>
          )}
          <p className="flex items-start gap-2">
            <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span>Tu equipo perderá acceso a tus datos y asignaciones.</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Escribe <strong className="text-red-300">ELIMINAR</strong> para confirmar.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            maxLength={10}
            className="w-full max-w-xs rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-red-500/40 uppercase tracking-widest"
          />
          <div>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={confirmText !== "ELIMINAR"}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Eliminar cuenta
            </button>
          </div>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 pb-8 md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:rounded-2xl md:border">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-zinc-100 font-medium text-lg">¿Eliminar cuenta?</h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-5">
              Esta acción no se puede deshacer.
              {hasSuperior
                ? " Tus leads se reasignarán a tu superior."
                : " Todos tus leads se eliminarán."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                {deleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

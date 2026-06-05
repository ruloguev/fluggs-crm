"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, User, Shield, Building2, AlertTriangle, X, Check, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"

type ProfileDetail = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: { name: string } | null
  team_memberships: { reports_to: string | null }[]
}

export default function CuentaPage() {
  const { profile, company, role, loading: authLoading } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [detail, setDetail] = useState<ProfileDetail | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<{
    plan_id?: string
    status?: string
    expires_at?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

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
        .select("name, settings")
        .eq("id", profile.company_id)
        .single()
      if (comp) {
        setCompanyName(comp.name)
        const sub = (comp.settings as { subscription?: { plan_id?: string; status?: string; expires_at?: string | null } } | null)?.subscription
        if (sub) setSubscription(sub)
      }
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
            <p className="text-sm text-zinc-200">{detail?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Email</p>
            <p className="text-sm text-zinc-200">{detail?.email ?? "—"}</p>
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
      </div>

      {subscription && (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-flugzz-accent" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-100">Suscripción</h2>
              <p className="text-xs text-zinc-500">Plan y estado de tu cuenta.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Plan</p>
              <p className="text-sm text-zinc-200 capitalize">{subscription.plan_id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">Estado</p>
              <p className={`text-sm font-medium capitalize ${
                subscription.status === "trial" ? "text-cyan-400"
                : subscription.status === "active" ? "text-emerald-400"
                : subscription.status === "expired" ? "text-red-400"
                : "text-zinc-200"
              }`}>
                {subscription.status === "trial" ? "Prueba" : subscription.status === "active" ? "Activa" : subscription.status === "expired" ? "Expirada" : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.12em] mb-1">
                {subscription.status === "trial" ? "Días restantes" : "Expira"}
              </p>
              <p className="text-sm text-zinc-200">
                {subscription.expires_at
                  ? (() => {
                      const days = Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      if (subscription.status === "trial" && days > 0) {
                        return `${days} ${days === 1 ? "día" : "días"}`
                      }
                      return new Date(subscription.expires_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
                    })()
                  : "—"}
              </p>
            </div>
          </div>

          {subscription.status === "expired" && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Tu prueba terminó. Activa tu suscripción para volver a acceder al CRM.
            </div>
          )}
        </div>
      )}

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

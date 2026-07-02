"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Building2, Users, Target,
  CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Search,
  Loader2, Shield, LogOut,
} from "lucide-react"

const PLAN_LABELS: Record<string, string> = {
  fundacion: "Fundación",
  expansion: "Expansión",
  imperio: "Imperio",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  trial:     { label: "Trial",     color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30", icon: Clock },
  active:    { label: "Activa",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 },
  past_due:  { label: "Vencida",   color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  cancelled: { label: "Cancelada", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: XCircle },
  expired:   { label: "Expirada",  color: "text-zinc-500 bg-zinc-800/50 border-zinc-700/50", icon: XCircle },
}

type Company = {
  id: string
  name: string
  created_at: string
  subscription: {
    plan_id: string
    status: string
    seats: number
    current_period_start: string | null
    current_period_end: string | null
    setup_fee_paid: boolean
    cancel_at_period_end: boolean
    stripe_subscription_id: string | null
    stripe_customer_id: string | null
  } | null
  directors: { name: string; email: string }[]
  active_members: number
  total_leads: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const res = await fetch("/api/admin/companies")
    if (!res.ok) {
      if (res.status === 403) { router.replace("/admin/login"); return }
      setError("Error al cargar datos")
      setLoading(false)
      return
    }
    const data = await res.json()
    setCompanies(data.companies ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function doAction(companyId: string, action: string, days?: number) {
    setActionLoading(companyId)
    await fetch(`/api/admin/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, days }),
    })
    await load()
    setActionLoading(null)
  }

  async function handleLogout() {
    setLogoutLoading(true)
    await fetch("/api/admin/logout", { method: "POST" })
    router.replace("/admin/login")
  }

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.directors.some((d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()),
    ),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400">
        {error}
      </div>
    )
  }

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.subscription?.status === "active").length,
    trial: companies.filter((c) => c.subscription?.status === "trial").length,
    pastDue: companies.filter((c) => c.subscription?.status === "past_due").length,
    cancelled: companies.filter((c) => c.subscription?.status === "cancelled" || c.subscription?.status === "expired").length,
    totalLeads: companies.reduce((s, c) => s + c.total_leads, 0),
    totalMembers: companies.reduce((s, c) => s + c.active_members, 0),
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 antialiased">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Panel de Administración</h1>
              <p className="text-sm text-zinc-500">Gestión global de empresas suscritas</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 text-sm transition-colors"
          >
            {logoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Salir
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
          <StatCard icon={Building2} label="Total" value={stats.total} color="text-zinc-100" />
          <StatCard icon={CheckCircle2} label="Activas" value={stats.active} color="text-emerald-400" />
          <StatCard icon={Clock} label="Trial" value={stats.trial} color="text-cyan-400" />
          <StatCard icon={AlertTriangle} label="Vencidas" value={stats.pastDue} color="text-amber-400" />
          <StatCard icon={XCircle} label="Canceladas" value={stats.cancelled} color="text-red-400" />
          <StatCard icon={Target} label="Leads" value={stats.totalLeads} color="text-zinc-100" />
          <StatCard icon={Users} label="Miembros" value={stats.totalMembers} color="text-zinc-100" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, director o email..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Asientos</th>
                  <th className="px-4 py-3 font-medium">Miembros</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">Creada</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const sub = c.subscription
                  const sc = STATUS_CONFIG[sub?.status ?? "expired"] ?? STATUS_CONFIG.expired
                  const StatusIcon = sc.icon
                  const isExpanded = expandedId === c.id

                  return (
                    <tr key={c.id} className="border-b border-zinc-800/30 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">{c.name}</div>
                        {c.directors[0] && (
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {c.directors[0].name} · {c.directors[0].email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-100 font-medium">
                        {sub ? (PLAN_LABELS[sub.plan_id] ?? sub.plan_id) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-100">{sub?.seats ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={c.active_members > (sub?.seats ?? 0) ? "text-red-400" : "text-zinc-100"}>
                          {c.active_members}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-100">{c.total_leads}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(c.created_at).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                        </button>
                      </td>

                      {isExpanded && (
                        <tr key={`${c.id}-detail`}>
                          <td colSpan={8} className="px-4 py-4 bg-zinc-900/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wider text-zinc-500">Período actual</p>
                                <p className="text-zinc-300">
                                  {sub?.current_period_start ? new Date(sub.current_period_start).toLocaleDateString("es-MX") : "—"}
                                  {" → "}
                                  {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("es-MX") : "—"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wider text-zinc-500">Stripe</p>
                                <p className="text-zinc-300 text-xs truncate">
                                  {sub?.stripe_subscription_id ?? "Sin suscripción"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs uppercase tracking-wider text-zinc-500">Directores ({c.directors.length})</p>
                                {c.directors.map((d, i) => (
                                  <p key={i} className="text-zinc-300 text-xs">{d.name} — {d.email}</p>
                                ))}
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wider text-zinc-500">Acciones</p>
                                <div className="flex flex-wrap gap-2">
                                  {sub?.status === "trial" && (
                                    <button
                                      onClick={() => doAction(c.id, "extend_trial", 30)}
                                      disabled={actionLoading === c.id}
                                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
                                    >
                                      +30 días trial
                                    </button>
                                  )}
                                  {(sub?.status === "active" || sub?.status === "trial") && (
                                    <button
                                      onClick={() => doAction(c.id, "cancel")}
                                      disabled={actionLoading === c.id}
                                      className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                  {sub?.status === "cancelled" && (
                                    <button
                                      onClick={() => doAction(c.id, "reactivate")}
                                      disabled={actionLoading === c.id}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                                    >
                                      Reactivar
                                    </button>
                                  )}
                                  {actionLoading === c.id && (
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              {search ? "Sin resultados para esa búsqueda" : "No hay empresas registradas"}
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-600 text-center">
          {companies.length} empresas · {stats.active} activas · {stats.trial} en trial · {stats.pastDue} vencidas · {stats.cancelled} canceladas
        </p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div>
        <p className={`text-lg font-semibold ${color}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

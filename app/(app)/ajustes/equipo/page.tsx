"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  UserPlus, Mail, Shield, ChevronDown, Check, X,
  Loader2, MoreHorizontal, UserX, UserCheck,
  Copy, AlertCircle, Users, Edit2, Trash2, KeyRound,
} from "lucide-react"

type Role = { id: string; name: string; level: number; color: string }
type Member = {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  role_id: string | null
  role: Role | null
  reports_to_name: string | null
  created_at: string
}

// ── Small helpers ──────────────────────────────────────────────
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs"
  return (
    <div className={`${sz} rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center font-bold text-zinc-300 shrink-0`}>
      {initials}
    </div>
  )
}

// ── Role selector dropdown ────────────────────────────────────
function RoleSelector({ roles, currentId, onSelect }: {
  roles: Role[]; currentId: string | null; onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = roles.find(r => r.id === currentId)

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm hover:border-zinc-700 transition-colors">
        {current ? (
          <>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current.color }} />
            <span className="text-zinc-200">{current.name}</span>
          </>
        ) : (
          <span className="text-zinc-500">Asignar rol</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-[160px]">
            {roles.map(r => (
              <button key={r.id} onClick={() => { onSelect(r.id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  r.id === currentId ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:bg-zinc-900"
                }`}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                {r.name}
                {r.id === currentId && <Check className="w-3.5 h-3.5 ml-auto text-zinc-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Invite sheet ───────────────────────────────────────────────
function InviteSheet({ roles, companyId, onClose, onInvited }: {
  roles: Role[]; companyId: string; onClose: () => void; onInvited: () => void
}) {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [roleId, setRoleId] = useState<string>(roles[roles.length - 1]?.id ?? "")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  async function sendInvite() {
    if (!email.trim() || !fullName.trim()) { setError("Completa todos los campos"); return }
    setSending(true); setError(null)

    try {
      // Use Supabase admin invite
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), roleId, companyId }),
      })
      const raw = await res.text()
      const data = raw ? JSON.parse(raw) : null

      if (!res.ok) { setError(data.error ?? "Error al enviar invitación"); setSending(false); return }

      if (data?.inviteLink) setInviteLink(data.inviteLink)
      setDone(true)
      onInvited()
    } catch (e: any) {
      setError(e.message ?? "Error inesperado")
    }
    setSending(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 pb-8 md:max-w-md md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:border animate-in slide-in-from-bottom duration-200">

        <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5 md:hidden" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-zinc-100 font-medium text-lg">Invitar al equipo</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-zinc-100 font-medium">Invitación enviada</p>
              <p className="text-zinc-500 text-sm mt-1">
                {email} recibirá un correo. Al abrir el enlace, se validará el acceso y entrará al CRM (URL de retorno: /auth/callback).
              </p>
            </div>
            {inviteLink && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                <p className="text-xs text-zinc-500 mb-2">O comparte este link directamente:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-flugzz-accent flex-1 truncate">{inviteLink}</code>
                  <button onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <button onClick={onClose}
              className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-200">
              Listo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input autoFocus placeholder="Nombre completo" value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700" />

            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700" />

            <div>
              <p className="text-xs text-zinc-500 mb-2">Rol asignado</p>
              <div className="flex flex-wrap gap-2">
                {roles.map(r => (
                  <button key={r.id} onClick={() => setRoleId(r.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                      roleId === r.id
                        ? "text-zinc-900 font-medium border-transparent"
                        : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
                    }`}
                    style={roleId === r.id ? { backgroundColor: r.color } : {}}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleId === r.id ? "#fff" : r.color }} />
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <button onClick={sendInvite} disabled={sending}
              className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium disabled:opacity-40 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Mail className="w-4 h-4" /> Enviar invitación</>}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Create user with password (admin) ──────────────────────────
function CreateUserSheet({ roles, companyId, onClose, onCreated }: {
  roles: Role[]
  companyId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [roleId, setRoleId] = useState<string>(roles[roles.length - 1]?.id ?? "")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!email.trim() || !fullName.trim()) {
      setError("Completa nombre y email")
      return
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/team/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password,
          roleId: roleId || null,
          companyId,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Error al crear usuario")
        setSending(false)
        return
      }
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado")
    }
    setSending(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 pb-8 md:max-w-md md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:border max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5 md:hidden" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-zinc-100 font-medium text-lg">Crear usuario y contraseña</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-zinc-100 font-medium">Usuario creado</p>
            <p className="text-zinc-500 text-sm">
              Puedes compartir el correo y la contraseña por un canal seguro. El usuario puede iniciar sesión de inmediato.
            </p>
            <button
              type="button"
              onClick={() => {
                onCreated()
                onClose()
              }}
              className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-200"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              autoFocus
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700"
            />
            <input
              type="password"
              placeholder="Contraseña (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700"
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700"
            />
            <div>
              <p className="text-xs text-zinc-500 mb-2">Rol asignado</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleId(r.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                      roleId === r.id ? "text-zinc-900 font-medium border-transparent" : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
                    }`}
                    style={roleId === r.id ? { backgroundColor: r.color } : {}}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: roleId === r.id ? "#fff" : r.color }}
                    />
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={sending}
              className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-medium disabled:opacity-40 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creando…
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Crear usuario
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function EditMemberSheet({
  member,
  onClose,
  onSaved,
}: {
  member: Member
  onClose: () => void
  onSaved: (patch: Partial<Member>) => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: member.full_name,
    email: member.email,
    phone: member.phone ?? "",
  })

  async function save() {
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      })
      .eq("id", member.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 pb-8 md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:rounded-2xl md:border">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-zinc-100 font-medium text-lg">Editar usuario</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm outline-none focus:border-zinc-700" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm outline-none focus:border-zinc-700" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Teléfono"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm outline-none focus:border-zinc-700" />
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-700">Cancelar</button>
            <button onClick={save} disabled={saving} className="rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Member row ─────────────────────────────────────────────────
function MemberRow({ member, roles, onRoleChange, onToggleActive, onEdit, onDelete }: {
  member: Member
  roles: Role[]
  onRoleChange: (memberId: string, roleId: string) => void
  onToggleActive: (memberId: string, isActive: boolean) => void
  onEdit: (member: Member) => void
  onDelete: (member: Member) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      member.is_active ? "bg-zinc-900/50 border-zinc-800/40 hover:border-zinc-700/60" : "bg-zinc-950/50 border-zinc-800/20 opacity-50"
    }`}>
      <Avatar name={member.full_name} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-200 truncate">{member.full_name}</p>
          {!member.is_active && <span className="text-[10px] text-zinc-600 bg-zinc-900 border border-zinc-800 px-1.5 rounded">Inactivo</span>}
        </div>
        <p className="text-xs text-zinc-500 truncate">{member.email}</p>
      </div>

      {/* Role selector */}
      <div className="hidden sm:block shrink-0">
        <RoleSelector roles={roles} currentId={member.role_id}
          onSelect={(roleId) => onRoleChange(member.id, roleId)} />
      </div>

      {/* Actions */}
      <div className="relative shrink-0">
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
              {/* Mobile role change */}
              <div className="sm:hidden border-b border-zinc-800/60 p-2">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 py-1">Cambiar rol</p>
                {roles.map(r => (
                  <button key={r.id} onClick={() => { onRoleChange(member.id, r.id); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.name}
                    {r.id === member.role_id && <Check className="w-3 h-3 ml-auto text-zinc-500" />}
                  </button>
                ))}
              </div>
              <button onClick={() => { onToggleActive(member.id, member.is_active); setMenuOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  member.is_active ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"
                }`}>
                {member.is_active ? <><UserX className="w-4 h-4" />Desactivar usuario</> : <><UserCheck className="w-4 h-4" />Activar usuario</>}
              </button>
              <button onClick={() => { onEdit(member); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors">
                <Edit2 className="w-4 h-4" />Editar usuario
              </button>
              <button onClick={() => { onDelete(member); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" />Eliminar usuario
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function EquipoPage() {
  const { profile, can, role, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active")
  const [search, setSearch] = useState("")
  const normalizedRoleName = role?.name?.toLowerCase() ?? ""
  const canManageSettings =
    can("can_manage_users") ||
    normalizedRoleName.includes("director") ||
    normalizedRoleName.includes("gerente") ||
    normalizedRoleName.includes("admin") ||
    (role?.level ?? 99) <= 2

  // Tabs for sub-nav (Equipo / Roles)
  const [activeTab, setActiveTab] = useState<"equipo" | "roles">("equipo")

  useEffect(() => {
    if (!authLoading && !canManageSettings) router.push("/pipeline")
  }, [authLoading, canManageSettings, router])

  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadData() {
    setLoading(true)
    const [{ data: rolesData }, { data: membersData }] = await Promise.all([
      supabase.from("roles").select("*").eq("company_id", profile!.company_id).order("level"),
      supabase.from("profiles").select(`
        id, full_name, email, phone, avatar_url, is_active, role_id, created_at,
        role:roles(id, name, level, color),
        team_memberships(reports_to)
      `).eq("company_id", profile!.company_id).order("created_at"),
    ])

    setRoles(rolesData ?? [])

    // Get reporter names
    const allProfiles = membersData ?? []
    const membersMapped: Member[] = allProfiles.map((m: any) => {
      const reportsToId = m.team_memberships?.[0]?.reports_to
      const reportsToName = reportsToId
        ? allProfiles.find((p: any) => p.id === reportsToId)?.full_name ?? null
        : null
      return { ...m, role: m.role ?? null, reports_to_name: reportsToName }
    })

    setMembers(membersMapped)
    setLoading(false)
  }

  async function updateRole(memberId: string, roleId: string) {
    await supabase.from("profiles").update({ role_id: roleId }).eq("id", memberId)
    setMembers(prev => prev.map(m => m.id === memberId
      ? { ...m, role_id: roleId, role: roles.find(r => r.id === roleId) ?? null }
      : m
    ))
  }

  async function toggleActive(memberId: string, isActive: boolean) {
    await supabase.from("profiles").update({ is_active: !isActive }).eq("id", memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_active: !isActive } : m))
  }

  async function deleteMember(member: Member) {
    const res = await fetch("/api/team/member", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: member.id }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      alert(data?.error ?? "No se pudo eliminar el usuario.")
      return
    }

    setMembers(prev => prev.filter(m => m.id !== member.id))
    setDeletingMember(null)
  }

  const filtered = members.filter(m => {
    if (filter === "active" && !m.is_active) return false
    if (filter === "inactive" && m.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    }
    return true
  })

  // Group by role level
  const byRole = roles.map(role => ({
    role,
    members: filtered.filter(m => m.role_id === role.id),
  })).filter(g => g.members.length > 0)

  const unassigned = filtered.filter(m => !m.role_id)

  const activeCount = members.filter(m => m.is_active).length

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Ajustes<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">{activeCount} usuarios activos</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateUser(true)}
            className="flex items-center gap-2 border border-zinc-700 bg-zinc-900/85 text-zinc-100 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            <KeyRound className="w-4 h-4" /> Crear usuario
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Invitar
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900/40 border border-zinc-800/40 rounded-xl w-fit">
        {[
          { id: "equipo", label: "Equipo", icon: Users },
          { id: "roles", label: "Roles", icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id}
            onClick={() => id === "roles" ? router.push("/ajustes/roles") : setActiveTab("equipo")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              (id === "equipo" && activeTab === "equipo") ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Filters & search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-zinc-900/40 border border-zinc-800/40 rounded-xl">
          {(["active", "all", "inactive"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {f === "active" ? "Activos" : f === "all" ? "Todos" : "Inactivos"}
            </button>
          ))}
        </div>
        <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[140px] bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors" />
      </div>

      {/* Members grouped by role */}
      <div className="space-y-5">
        {byRole.map(({ role, members: roleMembers }) => (
          <div key={role.id}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{role.name}</span>
              <span className="text-xs text-zinc-700">{roleMembers.length}</span>
            </div>
            <div className="space-y-1.5">
              {roleMembers.map(member => (
                <MemberRow key={member.id} member={member} roles={roles}
                  onRoleChange={updateRole} onToggleActive={toggleActive}
                  onEdit={setEditingMember} onDelete={setDeletingMember} />
              ))}
            </div>
          </div>
        ))}

        {unassigned.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full bg-zinc-700" />
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Sin rol asignado</span>
              <span className="text-xs text-zinc-700">{unassigned.length}</span>
            </div>
            <div className="space-y-1.5">
              {unassigned.map(member => (
                <MemberRow key={member.id} member={member} roles={roles}
                  onRoleChange={updateRole} onToggleActive={toggleActive}
                  onEdit={setEditingMember} onDelete={setDeletingMember} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-zinc-600">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin usuarios en esta vista</p>
          </div>
        )}
      </div>

      {/* Invite sheet */}
      {showInvite && profile?.company_id && (
        <InviteSheet roles={roles} companyId={profile.company_id}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); loadData() }} />
      )}

      {showCreateUser && profile?.company_id && (
        <CreateUserSheet
          roles={roles}
          companyId={profile.company_id}
          onClose={() => setShowCreateUser(false)}
          onCreated={() => { setShowCreateUser(false); loadData() }}
        />
      )}

      {editingMember && (
        <EditMemberSheet
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={(patch) => {
            setMembers(prev => prev.map(member => member.id === editingMember.id ? { ...member, ...patch } : member))
            setEditingMember(null)
          }}
        />
      )}

      {deletingMember && (
        <>
          <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setDeletingMember(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-8 md:rounded-2xl md:border">
            <h3 className="text-zinc-100 font-medium text-lg">Eliminar usuario</h3>
            <p className="text-sm text-zinc-500 mt-2">
              Esta acción eliminará la cuenta de {deletingMember.full_name} y ya no podrá ingresar al sistema.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeletingMember(null)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-700">
                Cancelar
              </button>
              <button onClick={() => void deleteMember(deletingMember)} className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-400">
                Eliminar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  Plus, GripVertical, Trash2, Check, X, Loader2,
  ChevronDown, ChevronRight, AlertCircle, Shield
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────
type Permission = {
  key: string
  label: string
  description: string
  group: string
}

type Role = {
  id: string
  name: string
  level: number
  color: string
  permissions: Record<string, boolean>
  _memberCount?: number
}

// ── Permission definitions ─────────────────────────────────────
const PERMISSIONS: Permission[] = [
  { key: "can_view_team",            label: "Ver equipo",          description: "Ver leads y actividad de niveles inferiores",    group: "Visibilidad" },
  { key: "can_view_contact_data",    label: "Ver datos de contacto", description: "Acceder a teléfonos y emails de leads",         group: "Visibilidad" },
  { key: "can_view_call_recordings", label: "Ver grabaciones",     description: "Escuchar grabaciones de llamadas (Twilio)",       group: "Visibilidad" },
  { key: "can_reassign_leads",       label: "Reasignar leads",     description: "Mover leads entre agentes del equipo",            group: "Leads" },
  { key: "can_export_reports",       label: "Exportar reportes",   description: "Descargar datos en CSV y PDF",                    group: "Leads" },
  { key: "can_manage_users",         label: "Gestionar usuarios",  description: "Invitar, editar y desactivar cuentas",            group: "Administración" },
  { key: "can_manage_drive",         label: "Gestionar drive",     description: "Subir, editar y archivar materiales",             group: "Administración" },
  { key: "can_manage_knowledge",     label: "Gestionar IA",        description: "Cargar y actualizar documentos del asistente",    group: "Administración" },
  { key: "is_transversal",           label: "Rol transversal",     description: "Ve todo el equipo sin jerarquía vertical",        group: "Especial" },
]

const PERM_GROUPS = ["Visibilidad", "Leads", "Administración", "Especial"]

const COLORS = [
  "#2C2C2A", "#3C3489", "#185FA5", "#0F6E56",
  "#854F0B", "#A32D2D", "#534AB7", "#1D9E75",
  "#639922", "#BA7517", "#993556", "#5F5E5A",
]

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  can_view_team: false, can_view_contact_data: true, can_view_call_recordings: false,
  can_reassign_leads: false, can_export_reports: false,
  can_manage_users: false, can_manage_drive: false, can_manage_knowledge: false,
  is_transversal: false,
}

// ── Permission Toggle ──────────────────────────────────────────
function PermToggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full border transition-all shrink-0 ${
        enabled ? "bg-emerald-500/20 border-emerald-500/40" : "bg-zinc-800 border-zinc-700"
      }`}
      style={{ height: "22px" }}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
        enabled ? "left-5 bg-emerald-400" : "left-0.5 bg-zinc-600"
      }`} />
    </button>
  )
}

// ── Role Card ──────────────────────────────────────────────────
function RoleCard({
  role, onUpdate, onDelete, isExpanded, onToggleExpand, isDragging
}: {
  role: Role
  onUpdate: (updated: Role) => void
  onDelete: () => void
  isExpanded: boolean
  onToggleExpand: () => void
  isDragging: boolean
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(role.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editingName) nameRef.current?.focus() }, [editingName])

  function saveName() {
    setEditingName(false)
    if (nameDraft.trim() && nameDraft !== role.name)
      onUpdate({ ...role, name: nameDraft.trim() })
    else setNameDraft(role.name)
  }

  function togglePermission(key: string) {
    onUpdate({ ...role, permissions: { ...role.permissions, [key]: !role.permissions[key] } })
  }

  const permCount = Object.values(role.permissions).filter(Boolean).length
  const groupedPerms = PERM_GROUPS.map(group => ({
    group, perms: PERMISSIONS.filter(p => p.group === group)
  }))

  return (
    <div className={`rounded-2xl border transition-all ${
      isDragging ? "border-zinc-600 bg-zinc-800 shadow-2xl shadow-black/60 scale-[1.01]" : "border-zinc-800/60 bg-zinc-900/40"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500 transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Level badge */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ backgroundColor: role.color, color: "#fff" }}>
          {role.level}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input ref={nameRef} value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameDraft(role.name) } }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 outline-none w-40"
              />
              <button onClick={saveName} className="p-1 rounded hover:bg-zinc-700"><Check className="w-3.5 h-3.5 text-emerald-400" /></button>
              <button onClick={() => { setEditingName(false); setNameDraft(role.name) }} className="p-1 rounded hover:bg-zinc-700"><X className="w-3.5 h-3.5 text-zinc-500" /></button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)}
              className="text-sm font-medium text-zinc-200 hover:text-zinc-100 transition-colors text-left group flex items-center gap-1.5">
              {role.name}
              <span className="opacity-0 group-hover:opacity-100 text-zinc-600 text-xs">editar</span>
            </button>
          )}
          <p className="text-xs text-zinc-600 mt-0.5">
            {permCount} permiso{permCount !== 1 ? "s" : ""} activo{permCount !== 1 ? "s" : ""}
            {role._memberCount != null && ` · ${role._memberCount} usuario${role._memberCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Color picker */}
        <div className="relative">
          <button onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-6 h-6 rounded-full border-2 border-zinc-700 hover:border-zinc-500 transition-colors"
            style={{ backgroundColor: role.color }} />
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowColorPicker(false)} />
              <div className="absolute right-0 top-8 z-40 p-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl grid grid-cols-4 gap-1.5">
                {COLORS.map(c => (
                  <button key={c} onClick={() => { onUpdate({ ...role, color: c }); setShowColorPicker(false) }}
                    className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                    style={{ backgroundColor: c, borderColor: role.color === c ? "#fff" : "transparent" }} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Expand / delete */}
        <button onClick={onToggleExpand}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <button onClick={onDelete} disabled={!!role._memberCount}
          className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={role._memberCount ? "No se puede eliminar un rol con usuarios asignados" : "Eliminar rol"}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Permissions panel */}
      {isExpanded && (
        <div className="border-t border-zinc-800/60 p-4 space-y-5">
          {groupedPerms.map(({ group, perms }) => (
            <div key={group}>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-2">{group}</p>
              <div className="space-y-2">
                {perms.map(perm => (
                  <div key={perm.key} className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{perm.label}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{perm.description}</p>
                    </div>
                    <PermToggle
                      enabled={!!role.permissions[perm.key]}
                      onChange={() => togglePermission(perm.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function RolesPage() {
  const { profile, can, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Guard
  useEffect(() => {
    if (!authLoading && !can("can_manage_users")) router.push("/pipeline")
  }, [authLoading])

  useEffect(() => { if (profile) loadRoles() }, [profile])

  async function loadRoles() {
    setLoading(true)
    const { data: rolesData } = await supabase.from("roles")
      .select("*")
      .eq("company_id", profile!.company_id)
      .order("level")

    // Count members per role
    const { data: profiles } = await supabase.from("profiles")
      .select("role_id")
      .eq("company_id", profile!.company_id)
      .eq("is_active", true)

    const counts: Record<string, number> = {}
    profiles?.forEach(p => { if (p.role_id) counts[p.role_id] = (counts[p.role_id] ?? 0) + 1 })

    setRoles((rolesData ?? []).map(r => ({ ...r, _memberCount: counts[r.id] ?? 0 })))
    setLoading(false)
  }

  async function createRole() {
    const maxLevel = roles.length > 0 ? Math.max(...roles.map(r => r.level)) : 0
    const { data, error } = await (supabase as any).from("roles").insert({
      company_id: profile!.company_id,
      name: "Nuevo rol",
      level: maxLevel + 1,
      color: COLORS[roles.length % COLORS.length],
      permissions: DEFAULT_PERMISSIONS,
    }).select().single()

    if (!error && data) {
      const newRole = { ...data, _memberCount: 0 }
      setRoles(prev => [...prev, newRole])
      setExpandedId(data.id)
    }
  }

  async function updateRole(updated: Role) {
    setSaving(updated.id)
    await (supabase as any).from("roles").update({
      name: updated.name,
      color: updated.color,
      permissions: updated.permissions,
    }).eq("id", updated.id)

    setRoles(prev => prev.map(r => r.id === updated.id ? updated : r))
    setSaving(null)
    setSaved(updated.id)
    setTimeout(() => setSaved(null), 2000)
  }

  async function deleteRole(roleId: string) {
    await (supabase as any).from("roles").delete().eq("id", roleId)
    setRoles(prev => prev.filter(r => r.id !== roleId))
  }

  // Drag to reorder
  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return }

    const ordered = [...roles]
    const fromIdx = ordered.findIndex(r => r.id === draggedId)
    const toIdx = ordered.findIndex(r => r.id === targetId)
    const [moved] = ordered.splice(fromIdx, 1)
    ordered.splice(toIdx, 0, moved)

    // Reassign levels
    const releveled = ordered.map((r, i) => ({ ...r, level: i + 1 }))
    setRoles(releveled)
    setDraggedId(null)
    setDragOverId(null)

    // Persist new levels
    await Promise.all(releveled.map(r =>
      (supabase as any).from("roles").update({ level: r.level }).eq("id", r.id)
    ))
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Roles<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Define jerarquías y permisos para tu equipo. Arrastra para reordenar.
          </p>
        </div>
        <button onClick={createRole}
          className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Nuevo rol
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40 flex items-start gap-3">
        <Shield className="w-4 h-4 text-flugzz-accent mt-0.5 shrink-0" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          El <strong className="text-zinc-300">nivel 1</strong> tiene la mayor autoridad. Un usuario con nivel 2 puede ver los leads de los niveles 3, 4, 5... dentro de su equipo. Los permisos específicos se configuran por rol independientemente del nivel.
        </p>
      </div>

      {/* Roles list */}
      {roles.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <Shield className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Sin roles configurados</p>
          <button onClick={createRole} className="mt-3 text-flugzz-accent text-sm hover:underline">
            Crear el primer rol
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id}
              draggable
              onDragStart={e => handleDragStart(e, role.id)}
              onDragOver={e => handleDragOver(e, role.id)}
              onDrop={e => handleDrop(e, role.id)}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
              className={`transition-all duration-150 ${
                dragOverId === role.id ? "scale-[1.01] opacity-70" : ""
              }`}>
              <div className="relative">
                <RoleCard
                  role={role}
                  onUpdate={updateRole}
                  onDelete={() => deleteRole(role.id)}
                  isExpanded={expandedId === role.id}
                  onToggleExpand={() => setExpandedId(expandedId === role.id ? null : role.id)}
                  isDragging={draggedId === role.id}
                />
                {/* Save feedback */}
                {(saving === role.id || saved === role.id) && (
                  <div className={`absolute top-3 right-14 flex items-center gap-1.5 text-xs transition-all ${
                    saved === role.id ? "text-emerald-400" : "text-zinc-500"
                  }`}>
                    {saving === role.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando</>
                      : <><Check className="w-3 h-3" /> Guardado</>
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

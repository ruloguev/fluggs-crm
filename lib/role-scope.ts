type RoleRecord = {
  level: number
  permissions: Record<string, boolean> | null
}

type TeamMember = {
  id: string
  full_name: string
  role_id?: string | null
  role?: { level: number } | null
}

export type ScopeResult = {
  userIds: string[]
  canViewTeam: boolean
  canViewSubordinates: boolean
  isTransversal: boolean
  isLeader: boolean
}

export function computeScope(
  profileId: string | null,
  role: RoleRecord | null,
  teamMembers: TeamMember[] = []
): ScopeResult {
  const perms = role?.permissions ?? {}
  const level = role?.level ?? 99

  const isTransversal = Boolean(perms["is_transversal"])
  const canViewTeam = Boolean(perms["can_view_team"])
  const canViewSubordinates = Boolean(perms["can_view_subordinates"])
  const isLeader = level <= 3

  // Nivel 5 con rol transversal: ve todo el equipo sin jerarquía
  if (isTransversal) {
    return {
      userIds: [profileId ?? "", ...teamMembers.map(m => m.id)],
      canViewTeam: true,
      canViewSubordinates: true,
      isTransversal: true,
      isLeader: false,
    }
  }

  // Agente (nivel 4+): solo sus propios leads
  if (!isLeader && !canViewTeam) {
    return {
      userIds: profileId ? [profileId] : [],
      canViewTeam: false,
      canViewSubordinates: false,
      isTransversal: false,
      isLeader: false,
    }
  }

  // Líder (nivel 1-3) o con permiso can_view_team:
  // Ve sus propios leads + los de su equipo
  const teamIds = teamMembers.map(m => m.id)
  return {
    userIds: [profileId ?? "", ...teamIds],
    canViewTeam: true,
    canViewSubordinates: canViewTeam || isLeader,
    isTransversal: false,
    isLeader: true,
  }
}

export function canReassignLead(
  role: RoleRecord | null,
  leadSourceId: string | null,
  leadSourceName: string | null
): boolean {
  const perms = role?.permissions ?? {}
  const canReassign = Boolean(perms["can_reassign_leads"])

  if (!canReassign) return false

  // Leads manuales (sin fuente) no se pueden reasignar
  if (!leadSourceId) return false

  // Leads de referidos no se pueden reasignar
  if (leadSourceName?.toLowerCase().includes("referido")) return false

  return true
}

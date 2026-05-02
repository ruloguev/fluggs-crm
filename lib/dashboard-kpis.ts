/**
 * KPI helpers para el dashboard.
 * Todos son pure functions sin efectos secundarios.
 */

export type LeadKpi = {
  id: string
  owner_id: string | null
  stage_id: string | null
  budget_max: number | null
  last_activity_at: string | null
  created_at?: string
}

export type ActivityKpi = {
  id: string
  user_id: string | null
  lead_id: string | null
  type: string
  call_status: string | null
  created_at: string
}

export type StageKpi = { id: string; name: string; is_closed: boolean }

// ── Etapas cerradas ────────────────────────────────────────────
export function getClosedWonStageIds(stages: StageKpi[]): string[] {
  const lower = (s: StageKpi) => s.name.toLowerCase()
  const exact = stages.filter(s => lower(s).includes("venta cerrada"))
  if (exact.length > 0) return exact.map(s => s.id)
  const broad = stages.filter(s => lower(s).includes("cerrada") || lower(s).includes("ganada"))
  if (broad.length > 0) return broad.map(s => s.id)
  return stages.filter(s => s.is_closed).map(s => s.id)
}

// ── Conversión ─────────────────────────────────────────────────
export function conversionPercent(leads: LeadKpi[], closedWonStageIds: string[]): number {
  if (leads.length === 0) return 0
  const won = leads.filter(l => l.stage_id && closedWonStageIds.includes(l.stage_id)).length
  return Math.round((won / leads.length) * 100)
}

// ── Contactación (incluye llamadas sin respuesta) ──────────────
/**
 * Cuenta un lead como "contactado" si:
 *  1. last_activity_at dentro del período, O
 *  2. Tiene una actividad type="call" con cualquier call_status en el período
 *     (contestada, no_answer, voicemail, busy – todas cuentan como intento).
 */
export function contactacionPercent(
  leads: LeadKpi[],
  activities: ActivityKpi[],
  dayWindow = 7,
): number {
  if (leads.length === 0) return 0
  const cutoff = Date.now() - dayWindow * 24 * 60 * 60 * 1000

  const calledLeadIds = new Set<string>()
  activities.forEach(a => {
    if (a.type === "call" && a.lead_id && new Date(a.created_at).getTime() >= cutoff) {
      calledLeadIds.add(a.lead_id)
    }
  })

  const contacted = leads.filter(l =>
    (l.last_activity_at && new Date(l.last_activity_at).getTime() >= cutoff) ||
    (l.id && calledLeadIds.has(l.id))
  ).length

  return Math.round((contacted / leads.length) * 100)
}

// ── Cobertura de equipo ────────────────────────────────────────
/** % de miembros del equipo que loguearon actividad en los últimos N días */
export function coberturaEquipoPercent(
  teamIds: string[],
  activities: ActivityKpi[],
  dayWindow = 7,
  snapshotAt = Date.now(),
): number {
  if (teamIds.length === 0) return 0
  const cutoff = snapshotAt - dayWindow * 24 * 60 * 60 * 1000
  const activeSet = new Set(
    activities
      .filter(a => a.user_id && new Date(a.created_at).getTime() >= cutoff)
      .map(a => a.user_id as string),
  )
  const active = teamIds.filter(id => activeSet.has(id)).length
  return Math.round((active / teamIds.length) * 100)
}

// ── Eficiencia de seguimiento ──────────────────────────────────
/** % de leads abiertos con 2+ actividades en últimos 14 días */
export function eficienciaPercent(
  leads: LeadKpi[],
  activities: ActivityKpi[],
  closedWonStageIds: string[],
  snapshotAt = Date.now(),
): number {
  const openLeads = leads.filter(l => !l.stage_id || !closedWonStageIds.includes(l.stage_id))
  if (openLeads.length === 0) return 0
  const cutoff = snapshotAt - 14 * 24 * 60 * 60 * 1000
  const countMap = new Map<string, number>()
  activities.forEach(a => {
    if (a.lead_id && new Date(a.created_at).getTime() >= cutoff) {
      countMap.set(a.lead_id, (countMap.get(a.lead_id) ?? 0) + 1)
    }
  })
  const wellWorked = openLeads.filter(l => (countMap.get(l.id) ?? 0) >= 2).length
  return Math.round((wellWorked / openLeads.length) * 100)
}

// ── Velocidad de pipeline ──────────────────────────────────────
/** % de leads de los últimos 30 días que ya avanzaron más allá de la 1ª etapa */
export function velocidadPipelinePercent(
  leads: LeadKpi[],
  firstStageId: string | null,
  snapshotAt = Date.now(),
): number {
  const cutoff = snapshotAt - 30 * 24 * 60 * 60 * 1000
  const recent = leads.filter(l => l.created_at && new Date(l.created_at).getTime() >= cutoff)
  if (recent.length === 0) return 0
  const advanced = recent.filter(l => l.stage_id && l.stage_id !== firstStageId).length
  return Math.round((advanced / recent.length) * 100)
}

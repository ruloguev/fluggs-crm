/**
 * Pure helper functions for computing dashboard KPI percentages.
 * All calculations are intentionally free of side-effects so they
 * can be used safely in both server and client components.
 */

type LeadRecord = {
  id: string
  stage_id: string | null
  last_activity_at: string | null
}

type StageRecord = {
  id: string
  name: string
  is_closed: boolean
}

/**
 * Returns the IDs of pipeline stages that represent a closed-won deal.
 *
 * Strategy (in order):
 *  1. Stages whose name includes "venta cerrada" (case-insensitive).
 *  2. Stages whose name includes "cerrada" or "ganada" (case-insensitive).
 *  3. All stages flagged as `is_closed === true`.
 *
 * Falls back to the next strategy only when the previous one yields no results.
 */
export function getClosedWonStageIds(stages: StageRecord[]): string[] {
  const lowerName = (s: StageRecord) => s.name.toLowerCase()

  const exactMatch = stages.filter((s) => lowerName(s).includes("venta cerrada"))
  if (exactMatch.length > 0) return exactMatch.map((s) => s.id)

  const broadMatch = stages.filter(
    (s) => lowerName(s).includes("cerrada") || lowerName(s).includes("ganada"),
  )
  if (broadMatch.length > 0) return broadMatch.map((s) => s.id)

  const closedFlags = stages.filter((s) => s.is_closed)
  return closedFlags.map((s) => s.id)
}

/**
 * Percentage of leads that are in a closed-won stage.
 * Returns 0 when there are no leads to avoid division-by-zero.
 */
export function conversionPercent(
  leads: LeadRecord[],
  closedWonStageIds: string[],
): number {
  if (leads.length === 0) return 0
  const won = leads.filter(
    (l) => l.stage_id && closedWonStageIds.includes(l.stage_id),
  ).length
  return Math.round((won / leads.length) * 100)
}

/**
 * Percentage of leads that had at least one activity in the last 7 days.
 * Returns 0 when there are no leads to avoid division-by-zero.
 */
export function contactacionPercent(leads: LeadRecord[]): number {
  if (leads.length === 0) return 0
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const contacted = leads.filter((l) => {
    if (!l.last_activity_at) return false
    return now - new Date(l.last_activity_at).getTime() <= sevenDaysMs
  }).length
  return Math.round((contacted / leads.length) * 100)
}

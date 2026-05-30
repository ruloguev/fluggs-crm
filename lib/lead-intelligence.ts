type LeadPriority = "low" | "medium" | "high"

type LeadScoreInput = {
  priority: LeadPriority
  lastActivityAt: string | null
  createdAt?: string | null
  stageName?: string | null
  isClosed?: boolean
  budgetMax?: number | null
  activityCount?: number
}

type OutreachInput = {
  contactName: string
  priority: LeadPriority
  lastActivityAt: string | null
  stageName?: string | null
  hasPhone: boolean
  hasEmail: boolean
}

export type LeadScore = {
  value: number
  level: "green" | "yellow" | "red"
  label: string
  helper: string
  className: string
  dotClassName: string
}

export type OutreachStep = {
  day: string
  channel: "WhatsApp" | "Email" | "Llamada" | "Nota"
  title: string
  detail: string
}

export type OutreachRecommendation = {
  headline: string
  nextAction: string
  reengagementMessage: string | null
  steps: OutreachStep[]
}

export function daysSince(value: string | null | undefined) {
  if (!value) return 999
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 999
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

export function getLeadScore(input: LeadScoreInput): LeadScore {
  const inactiveDays = daysSince(input.lastActivityAt)
  const stageName = (input.stageName ?? "").toLowerCase()
  let score = 48

  if (input.priority === "high") score += 20
  if (input.priority === "medium") score += 8
  if (input.priority === "low") score -= 4

  if (inactiveDays <= 1) score += 16
  else if (inactiveDays <= 3) score += 9
  else if (inactiveDays <= 7) score -= 4
  else if (inactiveDays <= 30) score -= 18
  else score -= 34

  if (stageName.includes("negoci") || stageName.includes("propuesta")) score += 14
  if (stageName.includes("calificado") || stageName.includes("contactado")) score += 7
  if (stageName.includes("nuevo")) score -= 4
  if (stageName.includes("perdido")) score -= 35
  if (stageName.includes("venta") || stageName.includes("cerrada")) score += 18
  if (input.isClosed && !stageName.includes("venta")) score -= 14

  if ((input.budgetMax ?? 0) > 0) score += 5
  if ((input.activityCount ?? 0) >= 3) score += 7

  const value = Math.max(0, Math.min(100, Math.round(score)))
  const level = value >= 70 ? "green" : value >= 45 ? "yellow" : "red"

  const label = level === "green" ? "Caliente" : level === "yellow" ? "Tibio" : "Frio"
  const helper =
    inactiveDays > 30
      ? "Mas de 30 dias sin actividad"
      : inactiveDays > 7
        ? "Necesita seguimiento"
        : input.priority === "high"
          ? "Prioridad alta y actividad reciente"
          : "Score basado en etapa, prioridad y actividad"

  return {
    value,
    level,
    label,
    helper,
    className:
      level === "green"
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
        : level === "yellow"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
          : "border-red-500/25 bg-red-500/10 text-red-300",
    dotClassName:
      level === "green"
        ? "bg-emerald-400"
        : level === "yellow"
          ? "bg-amber-400"
          : "bg-red-400",
  }
}

export function getOutreachRecommendation(input: OutreachInput): OutreachRecommendation {
  const inactiveDays = daysSince(input.lastActivityAt)
  const stageName = input.stageName ?? "esta etapa"
  const firstChannel = input.hasPhone ? "WhatsApp" : input.hasEmail ? "Email" : "Nota"
  const contactName = input.contactName || "este lead"

  const headline =
    inactiveDays > 30
      ? "Reactivar antes de reasignar"
      : input.priority === "high"
        ? "Atencion prioritaria"
        : "Mantener cadencia simple"

  const nextAction =
    inactiveDays > 30
      ? `Enviar mensaje de reactivacion a ${contactName}.`
      : firstChannel === "WhatsApp"
        ? `Enviar WhatsApp corto y confirmar interes en ${stageName}.`
        : firstChannel === "Email"
          ? `Enviar correo breve con siguiente paso claro.`
          : "Registrar una nota con el siguiente intento de contacto."

  const reengagementMessage =
    inactiveDays > 30
      ? `Hola ${contactName}, soy del equipo comercial. Vi que dejamos pendiente tu seguimiento y queria retomar contigo para confirmar si aun te interesa avanzar o si prefieres que ajustemos la busqueda.`
      : null

  return {
    headline,
    nextAction,
    reengagementMessage,
    steps: [
      {
        day: "Dia 1",
        channel: firstChannel,
        title: "Contacto directo",
        detail: firstChannel === "WhatsApp" ? "Mensaje breve con una pregunta facil de responder." : "Correo corto con contexto y siguiente paso.",
      },
      {
        day: "Dia 3",
        channel: input.hasPhone ? "Llamada" : "Email",
        title: "Segundo intento",
        detail: "Buscar respuesta concreta: interes, presupuesto, timing o descarte.",
      },
      {
        day: "Dia 7",
        channel: "Nota",
        title: "Decision operativa",
        detail: "Si no responde, marcar seguimiento futuro, reasignar o mover a etapa de baja prioridad.",
      },
    ],
  }
}

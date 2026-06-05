export type PlanId = "fundacion" | "expansion" | "imperio"

export const PLAN_LIMITS: Record<PlanId, {
  min: number
  max: number
  unitPrice: number
  priceId: string | undefined
  name: string
  range: string
  description: string
}> = {
  fundacion: {
    min: 1,
    max: 5,
    unitPrice: 350,
    priceId: process.env.STRIPE_PRICE_FUNDACION,
    name: "Fundación",
    range: "1 a 5 agentes",
    description: "Para equipos pequeños o células de alto rendimiento.",
  },
  expansion: {
    min: 6,
    max: 49,
    unitPrice: 250,
    priceId: process.env.STRIPE_PRICE_EXPANSION,
    name: "Expansión",
    range: "6 a 49 agentes",
    description: "Para gerencias con volumen fuerte y control operativo.",
  },
  imperio: {
    min: 50,
    max: 9999,
    unitPrice: 150,
    priceId: process.env.STRIPE_PRICE_IMPERIO,
    name: "Imperio",
    range: "50+ agentes",
    description: "Para desarrolladoras o master brokers con múltiples gerencias.",
  },
}

export const SETUP_FEE = 999
export const SETUP_PRICE_ID = process.env.STRIPE_PRICE_SETUP

export function getPlanLimit(planId: PlanId) {
  return PLAN_LIMITS[planId]
}

export function calculateMonthlyTotal(planId: PlanId, seats: number) {
  return PLAN_LIMITS[planId].unitPrice * seats
}

export function isValidSeats(planId: PlanId, seats: number) {
  const limit = PLAN_LIMITS[planId]
  return seats >= limit.min && seats <= limit.max
}

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  fundacion: [
    "1–5 asientos",
    "Pipeline Kanban ilimitado",
    "Captura de leads (formularios + WhatsApp)",
    "Asistente IA (200 resúmenes/mes)",
    "Drive compartido (5 GB)",
    "Reportes básicos",
    "Soporte por email",
  ],
  expansion: [
    "6–49 asientos",
    "Todo lo de Fundación, más:",
    "Jerarquía de equipo (gerentes / coordinadores)",
    "Asistente IA (1,000 resúmenes/mes)",
    "Drive compartido (50 GB)",
    "Reportes avanzados + embudo por etapa",
    "Roles y permisos granulares",
    "Integraciones (Meta Ads, Google Ads)",
    "Soporte prioritario (chat)",
  ],
  imperio: [
    "50+ asientos",
    "Todo lo de Expansión, más:",
    "Multi-gerencia con jerarquía profunda",
    "Asistente IA (5,000 resúmenes/mes)",
    "Drive compartido (500 GB)",
    "Reportes personalizados + BI",
    "API access (lectura)",
    "SLA 99.9% + onboarding dedicado",
    "Customer Success Manager asignado",
  ],
}

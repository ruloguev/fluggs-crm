export type PlanId = "agente_pro" | "fundacion" | "expansion" | "imperio"

export const SETUP_FEE = 999
export const SETUP_PRICE_ID = process.env.STRIPE_PRICE_SETUP

export const PLAN_LIMITS: Record<PlanId, {
  min: number
  max: number
  unitPrice: number
  priceId: string | undefined
  name: string
  range: string
  description: string
  setupFee: number
  promo?: string
  priceCompare?: number
}> = {
  agente_pro: {
    min: 1,
    max: 1,
    unitPrice: 149,
    priceId: process.env.STRIPE_PRICE_INDEPENDIENTE,
    name: "Agente Pro",
    range: "1 agente",
    description: "Para agentes independientes: todo tu CRM en una sola cuenta.",
    setupFee: 0,
    promo: "50% OFF",
    priceCompare: 299,
  },
  fundacion: {
    min: 1,
    max: 5,
    unitPrice: 350,
    priceId: process.env.STRIPE_PRICE_FUNDACION,
    name: "Fundación",
    range: "1 a 5 agentes",
    description: "Para equipos pequeños o células de alto rendimiento.",
    setupFee: SETUP_FEE,
  },
  expansion: {
    min: 6,
    max: 49,
    unitPrice: 250,
    priceId: process.env.STRIPE_PRICE_EXPANSION,
    name: "Expansión",
    range: "6 a 49 agentes",
    description: "Para gerencias con volumen fuerte y control operativo.",
    setupFee: SETUP_FEE,
  },
  imperio: {
    min: 50,
    max: 9999,
    unitPrice: 150,
    priceId: process.env.STRIPE_PRICE_IMPERIO,
    name: "Imperio",
    range: "50+ agentes",
    description: "Para desarrolladoras o master brokers con múltiples gerencias.",
    setupFee: SETUP_FEE,
  },
}

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
  agente_pro: [
    "1 asiento de agente independiente",
    "Pipeline Kanban ilimitado",
    "Captura de leads (formularios + WhatsApp)",
    "Facebook Leads + Google Calendar",
    "Google Meet para reuniones con tus leads",
    "Asistente IA (200 resúmenes/mes)",
    "Drive compartido (500 GB)",
    "Reportes personalizados + BI",
    "Soporte en línea",
  ],
  fundacion: [
    "1–5 asientos",
    "Pipeline Kanban ilimitado",
    "Captura de leads (formularios + WhatsApp)",
    "Facebook Leads + Google Calendar",
    "Reparto equitativo de leads (Round Robin)",
    "Roles y permisos",
    "Asistente IA (200 resúmenes/mes)",
    "Drive compartido (5 GB)",
    "Reportes básicos",
    "Soporte por email",
  ],
  expansion: [
    "6–49 asientos",
    "Pipeline Kanban ilimitado",
    "Captura de leads (formularios + WhatsApp)",
    "Jerarquía de equipo (gerentes / coordinadores)",
    "Reparto equitativo de leads (Round Robin)",
    "Roles y permisos granulares",
    "Asistente IA (1,000 resúmenes/mes)",
    "Drive compartido (50 GB)",
    "Reportes avanzados + embudo por etapa",
    "Integraciones (Meta Ads, Google Ads)",
    "Google Calendar + Google Meet",
    "Soporte prioritario (chat)",
  ],
  imperio: [
    "50+ asientos",
    "Multi-gerencia con jerarquía profunda",
    "Reparto equitativo de leads (Round Robin)",
    "Pipeline Kanban ilimitado",
    "Asistente IA (5,000 resúmenes/mes)",
    "Drive compartido (500 GB)",
    "Reportes personalizados + BI",
    "API access (lectura)",
    "SLA 99.9% + onboarding dedicado",
    "Customer Success Manager asignado",
  ],
}

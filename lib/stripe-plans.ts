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

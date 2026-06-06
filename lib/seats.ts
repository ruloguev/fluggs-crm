import type { SupabaseClient } from "@supabase/supabase-js"

const ALLOWED_STATUSES = ["trial", "active", "past_due"] as const

export type SeatCheck =
  | { ok: true; active: number; seats: number; remaining: number; status: string }
  | {
      ok: false
      reason: "no_subscription" | "limit_reached" | "wrong_status"
      active: number
      seats: number
      status: string | null
    }

/**
 * Comprueba si una empresa puede añadir un nuevo miembro activo.
 *
 * Cuenta `profiles.is_active = true` de la empresa y compara con
 * `company_subscriptions.seats`. Solo permite cuando la suscripción
 * está en estado trial/active/past_due y el límite no se ha alcanzado.
 *
 * @param supabase  Cliente de Supabase con service role (admin) o RLS de la empresa.
 * @param companyId ID de la empresa.
 */
export async function checkSeats(
  supabase: SupabaseClient,
  companyId: string,
): Promise<SeatCheck> {
  const [{ data: sub, error: subError }, { count: active, error: countError }] = await Promise.all([
    supabase
      .from("company_subscriptions")
      .select("seats, status")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
  ])

  if (subError) throw new Error(`Error leyendo suscripción: ${subError.message}`)
  if (countError) throw new Error(`Error contando usuarios activos: ${countError.message}`)

  const activeCount = active ?? 0

  if (!sub) {
    return { ok: false, reason: "no_subscription", active: activeCount, seats: 0, status: null }
  }

  if (!ALLOWED_STATUSES.includes(sub.status as (typeof ALLOWED_STATUSES)[number])) {
    return {
      ok: false,
      reason: "wrong_status",
      active: activeCount,
      seats: sub.seats,
      status: sub.status,
    }
  }

  if (activeCount >= sub.seats) {
    return {
      ok: false,
      reason: "limit_reached",
      active: activeCount,
      seats: sub.seats,
      status: sub.status,
    }
  }

  return {
    ok: true,
    active: activeCount,
    seats: sub.seats,
    remaining: sub.seats - activeCount,
    status: sub.status,
  }
}

/**
 * Mensaje de error amigable para mostrar en UI cuando checkSeats devuelve ok:false.
 */
export function seatCheckErrorMessage(check: Extract<SeatCheck, { ok: false }>): {
  title: string
  body: string
  code: "SEAT_LIMIT" | "NO_SUBSCRIPTION" | "WRONG_STATUS"
} {
  if (check.reason === "limit_reached") {
    return {
      code: "SEAT_LIMIT",
      title: "Límite de asientos alcanzado",
      body: `Tu plan permite ${check.seats} ${check.seats === 1 ? "asiento" : "asientos"} y ya hay ${check.active} ${check.active === 1 ? "usuario activo" : "usuarios activos"}. Agrega más asientos en Suscripción para invitar más personas.`,
    }
  }
  if (check.reason === "no_subscription") {
    return {
      code: "NO_SUBSCRIPTION",
      title: "Sin suscripción activa",
      body: "No hay una suscripción activa en esta empresa. Activa una prueba o contrata un plan para invitar usuarios.",
    }
  }
  return {
    code: "WRONG_STATUS",
    title: "Suscripción inactiva",
    body: `La suscripción está en estado "${check.status ?? "desconocido"}" y no permite invitar usuarios.`,
  }
}

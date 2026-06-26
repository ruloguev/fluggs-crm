import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALL_CODES = Array.from({ length: 9 }, (_, i) => `FLUGZZ${String(i + 3).padStart(2, "0")}`)

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase env vars")
  return createClient(url, key)
}

export async function POST() {
  try {
    const supabase = getAdmin()

    const { data: row } = await supabase
      .from("valid_promo_codes")
      .select("code")
      .in("code", ALL_CODES)
      .eq("given_by_generator", false)
      .limit(1)
      .maybeSingle()

    if (!row) {
      return NextResponse.json(
        { error: "Ya no quedan códigos promocionales :(" },
        { status: 404 },
      )
    }

    const { error: updateError } = await supabase
      .from("valid_promo_codes")
      .update({ given_by_generator: true })
      .eq("code", row.code)

    if (updateError) {
      console.error("Error marking code as given:", updateError)
      return NextResponse.json({ error: "Error al generar código." }, { status: 500 })
    }

    return NextResponse.json({ code: row.code })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado"
    console.error("generate-code error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

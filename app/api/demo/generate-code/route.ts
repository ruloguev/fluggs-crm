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
      .select("code, current_uses, max_uses")
      .in("code", ALL_CODES)
      .lt("current_uses", "max_uses")
      .limit(1)
      .maybeSingle()

    if (!row) {
      return NextResponse.json(
        { error: "Ya no quedan códigos promocionales :(" },
        { status: 404 },
      )
    }

    return NextResponse.json({ code: row.code })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado"
    console.error("generate-code error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

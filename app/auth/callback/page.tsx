"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const supabase = createClient()
      const code = searchParams.get("code")
      const next = searchParams.get("next") ?? "/dashboard"

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          if (!cancelled) {
            setDetail(error.message)
            router.replace(
              `/login?invite=1&error=${encodeURIComponent("No se pudo validar el enlace. Solicita una nueva invitación o usa «Olvidé mi contraseña».")}`,
            )
          }
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace(next.startsWith("/") ? next : "/dashboard")
        router.refresh()
        return
      }

      await new Promise((r) => setTimeout(r, 150))
      const { data: { session: retry } } = await supabase.auth.getSession()
      if (retry) {
        router.replace(next.startsWith("/") ? next : "/dashboard")
        router.refresh()
        return
      }

      if (!cancelled) {
        router.replace(
          "/login?invite=1&hint=finish",
        )
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3 px-6">
      <Loader2 className="w-8 h-8 animate-spin text-[#22D3EE]" />
      <p className="text-sm text-zinc-300">Validando tu invitación…</p>
      {detail && <p className="text-xs text-red-400 max-w-sm text-center">{detail}</p>}
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <Loader2 className="w-8 h-8 animate-spin text-[#22D3EE]" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}

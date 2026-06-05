"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2, Check, X } from "lucide-react"
import Link from "next/link"

function ResultadoContent() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId = params.get("session_id")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (!sessionId) {
      setStatus("error")
      return
    }

    // Dar tiempo al webhook a procesarse (típicamente < 2s)
    let attempts = 0
    const check = setInterval(async () => {
      attempts++
      try {
        const res = await fetch("/api/payments/checkout-status?session_id=" + sessionId)
        const data = await res.json()
        if (data.status === "active") {
          setStatus("success")
          clearInterval(check)
          setTimeout(() => router.replace("/dashboard"), 2500)
        } else if (attempts > 10) {
          setStatus("error")
          clearInterval(check)
        }
      } catch {
        if (attempts > 10) {
          setStatus("error")
          clearInterval(check)
        }
      }
    }, 1500)

    return () => clearInterval(check)
  }, [sessionId, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-flugzz-accent animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100">Procesando tu pago</h1>
            <p className="text-sm text-zinc-500 mt-2">Espera un momento mientras confirmamos tu suscripción...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">¡Suscripción activada!</h1>
            <p className="text-sm text-zinc-500 mt-2">Te redirigimos al dashboard en unos segundos...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">Algo salió mal</h1>
            <p className="text-sm text-zinc-500 mt-2">No pudimos confirmar tu pago. Si ya realizaste el cargo, contáctanos.</p>
            <Link href="/dashboard" className="inline-block mt-6 text-sm text-zinc-400 hover:text-zinc-200">
              Ir al dashboard →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    }>
      <ResultadoContent />
    </Suspense>
  )
}

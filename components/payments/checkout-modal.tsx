"use client"

import { useEffect, useState, useMemo } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, X, AlertTriangle, FlaskConical } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Props = {
  planId: "fundacion" | "expansion" | "imperio"
  seats: number
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

// Detecta el modo de Stripe desde la publishable key (publica, expuesta al cliente).
// pk_live_ → modo produccion (tarjetas reales)
// pk_test_ → modo pruebas (tarjetas como 4242 4242 4242 4242)
function detectStripeMode(): "live" | "test" | "unknown" {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
  if (pk.startsWith("pk_live_")) return "live"
  if (pk.startsWith("pk_test_")) return "test"
  return "unknown"
}

export function CheckoutModal({ planId, seats, open, onClose, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mode = detectStripeMode()

  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    fetch("/api/payments/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, seats }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Error al crear sesión de pago")
        setClientSecret(data.clientSecret)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error inesperado"))
      .finally(() => setLoading(false))
  }, [open, planId, seats])

  const options = useMemo(() => (clientSecret ? { clientSecret } : null), [clientSecret])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="
          max-w-[calc(100%-0.5rem)] sm:max-w-3xl md:max-w-4xl
          w-full
          border-zinc-800 bg-zinc-950 p-0
          top-0 sm:top-1/2 left-1/2 -translate-x-1/2 sm:-translate-y-1/2
          translate-y-0 sm:translate-y-[-50%]
          h-[100dvh] sm:h-auto sm:max-h-[95vh]
          rounded-none sm:rounded-xl
          [&>button]:hidden
        "
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-3 shrink-0">
          <h2 className="text-sm font-medium text-zinc-100">Activar suscripción</h2>
          <div className="flex items-center gap-2">
            {mode === "test" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                <FlaskConical className="w-3 h-3" /> Modo test
              </span>
            )}
            {mode === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                <AlertTriangle className="w-3 h-3" /> Modo live
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="min-h-[640px] flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-[640px]">
              <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-6 text-sm text-red-300 bg-red-500/10 border-t border-red-500/20">
              {error}
            </div>
          )}

          {options && !error && (
            <div className="stripe-embedded-checkout h-full">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={options}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

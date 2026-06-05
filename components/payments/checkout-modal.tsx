"use client"

import { useEffect, useState, useMemo } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, X } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Props = {
  planId: "fundacion" | "expansion" | "imperio"
  seats: number
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CheckoutModal({ planId, seats, open, onClose, onSuccess }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950 p-0 [&>button]:hidden">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-3">
          <h2 className="text-sm font-medium text-zinc-100">Activar suscripción</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-[500px]">
          {loading && (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-6 text-sm text-red-300 bg-red-500/10 border-t border-red-500/20">
              {error}
            </div>
          )}

          {options && !error && (
            <div className="stripe-embedded-checkout">
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

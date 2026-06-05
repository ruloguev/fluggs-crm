"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Loader2, AlertTriangle, LogOut, CreditCard, UserCog } from "lucide-react"
import Link from "next/link"

export default function VencidaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [planId, setPlanId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (!profile?.company_id) { router.replace("/login"); return }

      const { data: company } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", profile.company_id)
        .single()

      const sub = (company?.settings as { subscription?: { plan_id?: string; status?: string } } | null)?.subscription
      if (sub?.plan_id) setPlanId(sub.plan_id)
      setLoading(false)
    })()
  }, [router, supabase])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-100 text-center mb-2">
          Tu prueba ha terminado
        </h1>
        <p className="text-sm text-zinc-400 text-center mb-1">
          {planId ? (
            <>Plan <span className="text-zinc-200 font-medium">{planId.charAt(0).toUpperCase() + planId.slice(1)}</span> · 30 días completados</>
          ) : (
            "30 días de prueba completados"
          )}
        </p>
        <p className="text-sm text-zinc-500 text-center mb-8">
          Activa tu suscripción para volver a acceder a Flugzz CRM.
        </p>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
          <Link
            href="/suscripcion"
            className="w-full rounded-xl bg-zinc-100 text-zinc-900 px-4 py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" /> Activar suscripción
          </Link>

          <Link
            href="/ajustes/cuenta"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200 px-4 py-3 text-sm font-medium hover:border-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            <UserCog className="w-4 h-4" /> Ir a mi cuenta
          </Link>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 px-4 py-3 text-sm font-medium hover:border-zinc-700 hover:text-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {signingOut ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>

        <p className="text-xs text-zinc-600 text-center mt-6">
          ¿Necesitas ayuda? Escríbenos a <span className="text-zinc-400">legal@flugzz.com</span>
        </p>
      </div>
    </div>
  )
}

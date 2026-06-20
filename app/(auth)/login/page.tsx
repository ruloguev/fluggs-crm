"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Loader2, Mail, HelpCircle } from "lucide-react"

const FlugzzIsotipo = ({ className = "w-10 h-10" }) => (
  <img
    src="/Flugzz.svg"
    alt="Flugzz Isotipo"
    className={className}
    style={{ filter: "invert(1)" }}
  />
)

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const invite = searchParams.get("invite")
  const errQ = searchParams.get("error")
  const hint = searchParams.get("hint")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    if (errQ) setError(errQ)
  }, [errQ])

  useEffect(() => {
    const client = createClient()
    let cancelled = false
    void client.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session) {
        router.replace("/dashboard")
        router.refresh()
      }
    })
    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signError } = await supabase.auth.signInWithPassword({ email, password })

    if (signError) {
      setError("Credenciales incorrectas o cuenta sin activar. Si te invitaron, revisa el correo o usa «Definir contraseña».")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""
  const resetRedirect =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || appUrl || "http://localhost:3000"

  const sendPasswordSetup = useCallback(async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError("Escribe tu correo arriba para enviarte el enlace.")
      return
    }
    setResetLoading(true)
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${resetRedirect}/auth/callback`,
    })
    setResetLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setResetSent(true)
  }, [email, resetRedirect, supabase.auth])

  return (
    <div className="relative z-10 w-full max-w-md p-10 mx-4 overflow-hidden border border-zinc-800/60 rounded-3xl bg-zinc-950/72 backdrop-blur-xl shadow-2xl shadow-black/60">
      <div className="flex flex-col items-center mb-10 space-y-3">
        <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-700/50 mb-3 shadow-inner">
          <FlugzzIsotipo className="w-9 h-9 text-zinc-100" />
        </div>
        <span className="font-semibold text-3xl tracking-tighter text-zinc-100 flex items-baseline">
          Flugzz<span style={{ color: "#22D3EE" }} className="ml-0.5">.</span>
        </span>
        <p className="text-base text-zinc-400">Ingresa a tu entorno inmobiliario premium.</p>
      </div>

      {(invite || hint) && (
        <div className="mb-6 p-4 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/25 text-sm text-zinc-200 space-y-2">
          <div className="flex items-start gap-2 font-medium text-[#22D3EE]">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ¿Te invitaron al equipo?
          </div>
          <ol className="list-decimal list-inside text-zinc-400 space-y-1 text-xs leading-relaxed">
            <li>Abre el enlace del correo de invitación (o pégalo en la barra de direcciones).</li>
            <li>Te redirigiremos para validar el acceso y entrar al CRM.</li>
            <li>Si ves esta pantalla sin haber entrado, inicia sesión con tu correo o usa «Definir contraseña».</li>
          </ol>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {resetSent && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm text-center">
            Revisa tu correo: te enviamos un enlace para definir o restablecer tu contraseña.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@inmobiliaria.com"
            required
            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-flugzz-accent"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-300">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-flugzz-accent"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void sendPasswordSetup()}
              disabled={resetLoading}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <Button
          disabled={loading}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 mt-2 rounded-full h-11"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Entrar al CRM
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => void sendPasswordSetup()}
          disabled={resetLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-sm text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-colors disabled:opacity-50"
        >
          {resetLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mail className="w-4 h-4 text-zinc-500" />
          )}
          Definir o restablecer contraseña (mismo correo)
        </button>
        <p className="text-xs text-zinc-600 text-center">
          Usa el mismo email que en la invitación. Recibirás un enlace seguro (válido unos minutos).
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        El registro público no está habilitado; tu organización debe invitarte o crear tu cuenta desde Ajustes → Equipo.
      </p>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-600">
        <a href="/aviso-de-privacidad" className="hover:text-zinc-400 transition-colors">
          Aviso de Privacidad
        </a>
        <span className="text-zinc-700">|</span>
        <a href="/terminos-y-condiciones" className="hover:text-zinc-400 transition-colors">
          Términos y Condiciones
        </a>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="relative z-10 w-full max-w-md p-10 mx-4 rounded-3xl border border-zinc-800/60 bg-zinc-950/72 backdrop-blur-xl flex justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans flugzz-background relative overflow-hidden bg-black">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-flugzz-accent/10 rounded-full blur-[128px] pointer-events-none z-0" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-[128px] pointer-events-none z-0" />

      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

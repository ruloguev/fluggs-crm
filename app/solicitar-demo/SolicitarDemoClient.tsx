"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Gift, TicketX, Loader2, Copy, ExternalLink } from "lucide-react"

export default function SolicitarDemoPage() {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateCode() {
    setLoading(true)
    setError(null)
    setCode(null)
    setCopied(false)

    try {
      const res = await fetch("/api/demo/generate-code", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Error inesperado")
      } else {
        setCode(data.code)
      }
    } catch {
      setError("No pudimos conectar con el servidor. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function copyCode() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback manual */ }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-300 antialiased flex flex-col">
      {/* NAV */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <a href="/" className="font-semibold text-xl tracking-tighter text-zinc-100 flex items-baseline">
          Flugzz<span style={{ color: '#22D3EE' }} className="ml-0.5">.</span>
        </a>
        <a
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 transition-colors"
        >
          Iniciar sesión
        </a>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Gift className="w-3.5 h-3.5" />
              Demo gratuita
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 mb-3">
              Prueba Flugzz gratis
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base">
              Generá un código promocional y canjealo por <strong className="text-zinc-200">30 días de prueba</strong> sin compromiso.
            </p>
          </div>

          {/* CODE GENERATOR */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/80 p-6 sm:p-8">
            {!code && !error && (
              <div className="text-center">
                <button
                  onClick={generateCode}
                  disabled={loading}
                  className="w-full rounded-xl bg-cyan-500 text-black px-6 py-4 text-base font-bold hover:bg-cyan-400 transition-all border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Solicitar demo gratis
                    </>
                  )}
                </button>

                <p className="mt-4 text-xs text-zinc-600">
                  Cada código es único y puede ser usado una sola vez.
                </p>
              </div>
            )}

            {/* SUCCESS */}
            {code && (
              <div className="text-center space-y-5">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>

                <div>
                  <p className="text-sm text-zinc-400 mb-2">Tu código de activación</p>
                  <div className="inline-flex items-center gap-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-950/30 px-6 py-3">
                    <span className="text-2xl font-bold font-mono tracking-wider text-emerald-300">
                      {code}
                    </span>
                    <button
                      onClick={copyCode}
                      className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                      title="Copiar código"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 text-left text-sm space-y-2">
                  <p className="text-zinc-200 font-medium">Pasos para activar:</p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400">
                    <li>Crea tu cuenta en <strong className="text-zinc-200">Flugzz</strong></li>
                    <li>Ve a la sección <strong className="text-zinc-200">Suscripción</strong></li>
                    <li>Ingresa el código <strong className="text-zinc-200">{code}</strong> en &quot;Tengo un código de activación&quot;</li>
                    <li>Haz clic en &quot;Activar prueba de 30 días&quot;</li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/signup"
                    className="flex-1 rounded-xl bg-cyan-500 text-black px-4 py-3 font-semibold hover:bg-cyan-400 transition-all border border-cyan-300 flex items-center justify-center gap-2"
                  >
                    Crear cuenta ahora
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={generateCode}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 px-4 py-3 text-sm font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Generar otro código"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div className="text-center space-y-5">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <TicketX className="w-7 h-7 text-red-400" />
                </div>

                <div>
                  <p className="text-lg font-semibold text-zinc-100 mb-1">
                    {error}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Todos los cupos de demo han sido entregados.
                  </p>
                </div>

                <a
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 px-5 py-3 text-sm font-semibold transition-colors"
                >
                  Volver al inicio
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800/40 py-6 px-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-xs text-zinc-600 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Ultimate Tech & Architectonics (ULTEA). Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="/aviso-de-privacidad" className="hover:text-zinc-400 transition-colors">Aviso de Privacidad</a>
            <span className="text-zinc-700">|</span>
            <a href="/terminos-y-condiciones" className="hover:text-zinc-400 transition-colors">Términos y Condiciones</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

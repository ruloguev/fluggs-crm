"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Shield, Eye, EyeOff } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al iniciar sesión")
        setLoading(false)
        return
      }

      router.replace("/admin/dashboard")
    } catch {
      setError("Error de conexión")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-sans relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-10 mx-4 rounded-3xl border border-zinc-800/60 bg-zinc-950/72 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">Panel de Administración</h1>
          <p className="text-sm text-zinc-500 mt-1">Flugzz CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@flugzz.xyz"
              required
              className="w-full h-11 rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full h-11 rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 pr-10 text-sm text-zinc-100 outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-all border border-cyan-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  )
}

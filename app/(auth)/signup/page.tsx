"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { ArrowRight, Loader2, Eye, EyeOff, Building2, User, Mail, Lock } from "lucide-react"

const FlugzzIsotipo = ({ className = "w-10 h-10" }) => (
  <img src="/Flugzz.svg" alt="Flugzz" className={className} style={{ filter: "invert(1)" }} />
)

function SignUpForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<"account" | "company">("account")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
    currency: "MXN",
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard")
    })
  }, [])

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setError(null)
  }

  async function handleAccountNext(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName.trim()) { setError("Escribe tu nombre."); return }
    if (!form.email.trim()) { setError("Escribe tu correo."); return }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return }
    setStep("company")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) { setError("Escribe el nombre de tu empresa."); return }

    setLoading(true)
    setError(null)

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
      },
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? "Error al crear la cuenta.")
      setLoading(false)
      return
    }

    // 2. Setup completo via API — sin 'industry'
    const res = await fetch("/api/onboarding/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: authData.user.id,
        email: form.email.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        companyName: form.companyName.trim(),
        currency: form.currency,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      setError(data?.error ?? "Error al configurar la empresa.")
      setLoading(false)
      return
    }

    // 3. Redirigir
    if (authData.session) {
      // Sesión inmediata (email confirmation desactivado en Supabase)
      router.push("/onboarding")
    } else {
      // Supabase requiere confirmación de email
      router.push("/login?hint=confirm")
    }
  }

  const currencies = ["MXN", "USD", "COP", "ARS", "CLP", "PEN", "BRL", "EUR"]

  return (
    <div className="relative z-10 w-full max-w-md mx-4">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8 justify-center">
        {["account", "company"].map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === s ? "bg-[#22D3EE] text-zinc-950 scale-110"
              : step === "company" && i === 0 ? "bg-zinc-700 text-zinc-300"
              : "bg-zinc-900 border border-zinc-800 text-zinc-600"
            }`}>{i + 1}</div>
            {i === 0 && <div className={`w-12 h-px transition-colors duration-300 ${step === "company" ? "bg-[#22D3EE]/40" : "bg-zinc-800"}`} />}
          </div>
        ))}
      </div>

      <div className="p-8 border border-zinc-800/60 rounded-3xl bg-zinc-950/80 backdrop-blur-xl shadow-2xl shadow-black/60">
        <div className="flex flex-col items-center mb-8 space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700/50 mb-2">
            <FlugzzIsotipo className="w-8 h-8" />
          </div>
          <h1 className="font-semibold text-2xl tracking-tighter text-zinc-100 flex items-baseline">
            Flugzz<span style={{ color: "#22D3EE" }} className="ml-0.5">.</span>
          </h1>
          <p className="text-sm text-zinc-500 text-center">
            {step === "account" ? "Crea tu cuenta de director" : "Configura tu empresa"}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Step 1: Account */}
        {step === "account" && (
          <form onSubmit={handleAccountNext} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nombre completo
              </label>
              <input autoFocus type="text" value={form.fullName}
                onChange={e => set("fullName", e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Correo electrónico
              </label>
              <input type="email" value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="juan@empresa.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Contraseña
              </label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-11 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`flex-1 h-0.5 rounded-full transition-colors ${
                      form.password.length >= i * 2 + 4
                        ? i <= 1 ? "bg-red-500" : i === 2 ? "bg-amber-500" : "bg-emerald-500"
                        : "bg-zinc-800"
                    }`} />
                  ))}
                </div>
              )}
            </div>
            <button className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-2">
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Company */}
        {step === "company" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Nombre de la empresa
              </label>
              <input autoFocus type="text" value={form.companyName}
                onChange={e => set("companyName", e.target.value)}
                placeholder="Inmobiliaria Pérez"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Moneda principal</label>
              <div className="flex flex-wrap gap-2">
                {currencies.map(c => (
                  <button key={c} type="button" onClick={() => set("currency", c)}
                    className={`px-3 py-1.5 rounded-xl text-xs border font-mono transition-all ${
                      form.currency === c
                        ? "bg-[#22D3EE] text-zinc-900 font-bold border-transparent"
                        : "text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep("account")}
                className="flex-1 border border-zinc-800 rounded-xl py-3 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors">
                Atrás
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Crear cuenta</>}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-black relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#22D3EE]/8 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-zinc-800/20 rounded-full blur-[128px] pointer-events-none" />
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  )
}

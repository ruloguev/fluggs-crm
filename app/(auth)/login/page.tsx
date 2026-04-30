"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Loader2 } from "lucide-react"

// Tu Isotipo Oficial
const FlugzzIsotipo = ({ className = "w-10 h-10" }) => (
  <img 
    src="/Flugzz.svg" 
    alt="Flugzz Isotipo" 
    className={className} 
    style={{ filter: 'invert(1)' }} /* Esto invierte el color negro de tu SVG original a blanco */
  />
)

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Credenciales incorrectas. Intenta de nuevo.")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    // Aplicamos flugzz-background con un efecto de degradado para la login page
    <div className="min-h-screen flex items-center justify-center font-sans flugzz-background relative overflow-hidden bg-black">
      
      {/* Efectos de spotlight sutiles */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-flugzz-accent/10 rounded-full blur-[128px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-[128px] pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-md p-10 mx-4 overflow-hidden border border-zinc-800/60 rounded-3xl bg-zinc-950/60 backdrop-blur-xl shadow-2xl shadow-black/60">
        
        <div className="flex flex-col items-center mb-10 space-y-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-700/50 mb-3 shadow-inner">
            <FlugzzIsotipo className="w-9 h-9 text-zinc-100" />
          </div>
          <span className="font-extrabold text-3xl tracking-tighter text-zinc-100 flex items-baseline">
            Flugzz<span className="text-flugzz-accent ml-1">•</span>
          </span>
          <p className="text-base text-zinc-400">Ingresa a tu entorno inmobiliario premium.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Correo electrónico</Label>
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
            <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-flugzz-accent"
            />
          </div>

          <Button 
            disabled={loading}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 mt-8 rounded-full h-11"
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

        <div className="mt-10 text-center text-sm text-zinc-400">
          ¿Aún no eres parte de Flugzz.?{" "}
          <a href="#" className="font-semibold text-zinc-100 hover:underline">Regístrate</a>
        </div>

      </div>
    </div>
  )
}
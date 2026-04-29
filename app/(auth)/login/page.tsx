"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Hexagon, Loader2 } from "lucide-react"

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Credenciales incorrectas. Intenta de nuevo.")
      setLoading(false)
    } else {
      // Si todo sale bien, lo mandamos al dashboard
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 relative overflow-hidden">
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-900/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-8 mx-4 overflow-hidden border border-zinc-800/50 rounded-2xl bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
        
        <div className="flex flex-col items-center mb-8 space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-2 shadow-inner">
            <Hexagon className="w-6 h-6 text-zinc-100" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Fluggs.</h1>
          <p className="text-sm text-zinc-400">Ingresa a tu entorno de trabajo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
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
              placeholder="agente@inmobiliaria.com" 
              required
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100"
            />
          </div>

          <Button 
            disabled={loading}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 mt-6"
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

        <div className="mt-8 text-center text-sm text-zinc-400">
          ¿Aún no eres parte de Fluggs?{" "}
          <a href="#" className="font-medium text-zinc-100 hover:underline">Regístrate</a>
        </div>

      </div>
    </div>
  )
}
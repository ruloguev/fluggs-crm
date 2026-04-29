import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Hexagon } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 relative overflow-hidden">
      
      {/* Orbes de luz de fondo para dar profundidad */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-zinc-800/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-900/40 rounded-full blur-3xl pointer-events-none"></div>

      {/* Tarjeta de Login (Glassmorphism) */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 overflow-hidden border border-zinc-800/50 rounded-2xl bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
        
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8 space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 mb-2 shadow-inner">
            <Hexagon className="w-6 h-6 text-zinc-100" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Fluggs.
          </h1>
          <p className="text-sm text-zinc-400">
            Ingresa a tu entorno de trabajo
          </p>
        </div>

        {/* Formulario */}
        <form className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Correo electrónico</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="agente@inmobiliaria.com" 
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
              <a href="#" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
            />
          </div>

          <Button className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-all duration-200 group mt-6">
            Entrar al CRM
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </form>

        {/* Link de Registro */}
        <div className="mt-8 text-center text-sm text-zinc-400">
          ¿Aún no eres parte de Fluggs?{" "}
          <a href="#" className="font-medium text-zinc-100 hover:text-white hover:underline transition-all">
            Regístrate
          </a>
        </div>

      </div>
    </div>
  )
}
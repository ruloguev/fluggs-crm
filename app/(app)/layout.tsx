"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { 
  LayoutDashboard, 
  Users, 
  KanbanSquare, 
  HardDrive, 
  Bot, 
  Menu, 
  Bell, 
  Search, 
  Hexagon,
  LogOut
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { name: "Contactos", href: "/contactos", icon: Users },
  { name: "Drive", href: "/drive", icon: HardDrive },
  { name: "Asistente IA", href: "/asistente", icon: Bot },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userData, setUserData] = useState<{name: string, email: string, initials: string} | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Extraemos el nombre (o ponemos "Agente" por defecto) y sacamos las iniciales
        const name = user.user_metadata?.full_name || "Agente Fluggs"
        const email = user.email || ""
        const initials = name.substring(0, 2).toUpperCase()
        
        setUserData({ name, email, initials })
      } else {
        // Si no hay usuario activo, lo regresamos al login
        router.push("/login")
      }
    }

    fetchUser()
  }, [router, supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      
      {/* 1. SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/60 bg-zinc-950/50">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/60">
          <Hexagon className="w-6 h-6 text-zinc-100 mr-3" />
          <span className="font-semibold text-lg tracking-tight">Fluggs.</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? "bg-zinc-800/80 text-zinc-100" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Mini (Abajo) */}
        <div className="p-4 border-t border-zinc-800/60">
          {userData ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center overflow-hidden">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                  <span className="text-xs font-medium">{userData.initials}</span>
                </div>
                <div className="ml-3 truncate">
                  <p className="text-sm font-medium text-zinc-200 truncate">{userData.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{userData.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 ml-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="animate-pulse flex items-center w-full">
              <div className="w-9 h-9 rounded-full bg-zinc-800"></div>
              <div className="ml-3 space-y-2 flex-1">
                <div className="h-3 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-2 bg-zinc-800 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <button 
            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-100"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden sm:flex items-center flex-1 max-w-md ml-4 md:ml-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar leads, contactos, documentos..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-600 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4 ml-auto">
            <button className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-zinc-950"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-950/30 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
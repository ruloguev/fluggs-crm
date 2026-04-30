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
  LogOut,
  X
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { name: "Contactos", href: "/contactos", icon: Users },
  { name: "Drive", href: "/drive", icon: HardDrive },
  { name: "Asistente IA", href: "/asistente", icon: Bot },
]

// Componente SVG del Isotipo diseñado en código para Flugzz.
const FlugzzIsotipo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L89.1769 27.5V72.5L50 95L10.8231 72.5V27.5L50 5Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M50 25L75.9808 39.95V60.05L50 75L24.0192 60.05V39.95L50 25Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65"/>
    <path d="M50 40L62.9904 47.475V52.525L50 60L37.0096 52.525V47.475L50 40Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

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
        const name = user.user_metadata?.full_name || "Agente Fluggz"
        const email = user.email || ""
        const initials = name.substring(0, 2).toUpperCase()
        setUserData({ name, email, initials })
      } else {
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
    // Aplicamos la clase del patrón latente flugzz-background aquí
    <div className="min-h-screen text-zinc-100 flugzz-background flex font-sans">
      
      {/* 1. SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl relative z-10">
        {/* Logo Area - Transformado a Flugzz. */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/60">
          <FlugzzIsotipo className="w-8 h-8 text-zinc-100 mr-3.5" />
          <span className="font-extrabold text-2xl tracking-tighter text-zinc-100 flex items-baseline">
            Flugzz<span className="text-flugzz-accent ml-0.5">•</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? "bg-zinc-800/80 text-zinc-100 shadow-inner" 
                    : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Mini */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/20 backdrop-blur-sm">
          {userData ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center overflow-hidden">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700/50 shadow-inner">
                  <span className="text-sm font-semibold">{userData.initials}</span>
                </div>
                <div className="ml-3 truncate">
                  <p className="text-sm font-semibold text-zinc-200 truncate">{userData.name}</p>
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
              <div className="w-10 h-10 rounded-full bg-zinc-900"></div>
              <div className="ml-3 space-y-2 flex-1">
                <div className="h-3 bg-zinc-900 rounded w-3/4"></div>
                <div className="h-2 bg-zinc-900 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Menú Móvil (Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="fixed inset-y-0 left-0 w-64 bg-zinc-950 flugzz-background flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/60">
              <div className="flex items-center">
                <FlugzzIsotipo className="w-7 h-7 text-zinc-100 mr-3" />
                <span className="font-extrabold text-xl tracking-tighter text-zinc-100 flex items-baseline">
                  Flugzz<span className="text-flugzz-accent ml-0.5">•</span>
                </span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-500 hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Contenido de navegación igual que desktop */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium ${pathname === item.href ? "bg-zinc-800/80 text-zinc-100" : "text-zinc-400"}`}>
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* 2. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-10">
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 placeholder:text-zinc-600 transition-all shadow-inner"
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

        <div className="flex-1 overflow-auto bg-transparent p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
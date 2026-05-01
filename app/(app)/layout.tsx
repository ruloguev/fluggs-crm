"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard, Users, KanbanSquare, HardDrive, Bot,
  Menu, Bell, Search, LogOut, X, Plug, Settings, Loader2
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useState } from "react"

// Todos los nav items posibles con su permiso requerido (null = visible para todos)
const ALL_NAV = [
  { name: "Dashboard",     href: "/dashboard",          icon: LayoutDashboard, permission: null },
  { name: "Pipeline",      href: "/pipeline",           icon: KanbanSquare,    permission: null },
  { name: "Contactos",     href: "/contactos",          icon: Users,           permission: null },
  { name: "Drive",         href: "/drive",              icon: HardDrive,       permission: null },
  { name: "Asistente IA",  href: "/asistente",          icon: Bot,             permission: null },
  { name: "Integraciones", href: "/integraciones",      icon: Plug,            permission: "can_manage_integrations" as const },
  { name: "Ajustes",       href: "/ajustes",            icon: Settings,        permission: "can_manage_users" as const },
]

const FlugzzIsotipo = ({ className = "w-8 h-8" }) => (
  <img src="/Flugzz.svg" alt="Flugzz" className={className} style={{ filter: "invert(1)" }} />
)

function NavSkeleton() {
  return (
    <div className="space-y-1 px-3 py-5">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-9 rounded-xl bg-zinc-900 animate-pulse" />
      ))}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, company, role, loading, can } = useAuth()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  // Redirect to onboarding if authenticated but no company
  useEffect(() => {
    if (!loading && profile && !profile.company_id) {
      router.push("/onboarding")
    }
  }, [loading, profile])

  // Load unread notifications count
  useEffect(() => {
    if (!profile) return
    supabase.from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", profile.id)
      .eq("is_read", false)
      .then(({ count }) => setNotifCount(count ?? 0))
  }, [profile])

  // Filter nav items by permission
  const navItems = ALL_NAV.filter(item => {
    if (item.href === "/integraciones") {
      const roleName = role?.name?.toLowerCase() ?? ""
      if (roleName.includes("mkt") || roleName.includes("marketing")) return true
    }
    if (!item.permission) return true
    return can(item.permission)
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : "??"

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-60 bg-zinc-950/80 border-r border-zinc-800/60 backdrop-blur-xl">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-zinc-800/60 shrink-0">
        <FlugzzIsotipo className="w-7 h-7 mr-3" />
        <span className="font-semibold text-xl tracking-tighter text-zinc-100 flex items-baseline">
          Flugzz<span style={{ color: "#22D3EE" }} className="ml-0.5">.</span>
        </span>
        {company && (
          <span className="ml-auto text-[10px] text-zinc-600 truncate max-w-[80px]">{company.name}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {loading ? <NavSkeleton /> : navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active ? "bg-zinc-800/80 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}>
              <item.icon className={`w-4 h-4 mr-3 transition-colors ${
                active ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"
              }`} />
              {item.name}
              {item.href === "/ajustes" && role && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                  {role.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-zinc-800/60 shrink-0">
        {loading ? (
          <div className="flex items-center gap-2.5 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-zinc-900" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-zinc-900 rounded w-3/4" />
              <div className="h-2 bg-zinc-900 rounded w-1/2" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/50 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{profile?.full_name}</p>
              <p className="text-xs text-zinc-600 truncate">{role?.name ?? "Sin rol"}</p>
            </div>
            <button onClick={handleLogout}
              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
              title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen text-zinc-100 flugzz-background flex font-sans">

      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex">
            <Sidebar />
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <button className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-100"
            onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center flex-1 max-w-sm ml-4 md:ml-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input type="text" placeholder="Buscar leads, contactos..."
                className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-full pl-9 pr-4 py-1.5 text-sm text-zinc-300 outline-none focus:border-zinc-700 placeholder:text-zinc-600 transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 text-zinc-500 hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-800">
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-zinc-950" />
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

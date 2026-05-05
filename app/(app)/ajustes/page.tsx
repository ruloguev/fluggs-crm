"use client"

import Link from "next/link"
import { Building2, KanbanSquare, Shield, Users, Brain } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const ALL_CARDS = [
  {
    title: "Admin",
    description: "Configura moneda base, monedas permitidas, pipeline y plantillas de expediente.",
    href: "/ajustes/admin",
    icon: Building2,
    permission: "can_manage_users" as const,
  },
  {
    title: "Equipo",
    description: "Invita usuarios, activa o desactiva miembros y asigna roles al equipo.",
    href: "/ajustes/equipo",
    icon: Users,
    permission: "can_manage_users" as const,
  },
  {
    title: "Roles",
    description: "Crea jerarquías flexibles, ordena niveles y define permisos por perfil.",
    href: "/ajustes/roles",
    icon: Shield,
    permission: "can_manage_users" as const,
  },
  {
    title: "Conocimiento IA",
    description: "Sube fichas técnicas, listas de precios y manuales para entrenar al asistente.",
    href: "/ajustes/ia",
    icon: Brain,
    permission: "can_manage_knowledge" as const,
  },
]

export default function AjustesPage() {
  const { can } = useAuth()
  const cards = ALL_CARDS.filter(c => can(c.permission))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <KanbanSquare className="w-5 h-5 text-flugzz-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Ajustes<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Centro de administración para tu inmobiliaria.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/70"
          >
            <div className="w-11 h-11 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4">
              <card.icon className="w-5 h-5 text-zinc-300 group-hover:text-flugzz-accent transition-colors" />
            </div>
            <h2 className="text-lg font-medium text-zinc-100">{card.title}</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

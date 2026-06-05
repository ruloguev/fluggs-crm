/**
 * Acciones estáticas del command palette.
 *
 * Se filtran en el cliente según:
 *  1. Coincidencia con la query (palabras clave en title/keywords)
 *  2. Permisos del usuario (permission key del AuthContext)
 *
 * Las acciones son navegaciones a páginas del propio producto.
 * No incluyen acciones destructivas (eliminar, cancelar sub, etc.)
 * — esas siguen en sus menús contextuales.
 */

import type { SearchItemAction } from "./types"

type StaticAction = {
  id: string
  title: string
  subtitle: string
  href: string
  /** Palabras clave que disparan la acción cuando la query las contiene */
  keywords: string[]
  /** Si se define, la acción solo aparece si el usuario tiene este permiso */
  requires?: "can_manage_users" | "can_manage_integrations" | "can_manage_roles"
  /** Si se define, solo aparece si el role.name.toLowerCase() lo contiene */
  requiresRoleIncludes?: string
}

const STATIC_ACTIONS: StaticAction[] = [
  {
    id: "go-dashboard",
    title: "Ir a Dashboard",
    subtitle: "Resumen general de tu CRM",
    href: "/dashboard",
    keywords: ["dashboard", "inicio", "home", "resumen", "metricas"],
  },
  {
    id: "go-pipeline",
    title: "Ir a Pipeline",
    subtitle: "Tablero kanban de leads",
    href: "/pipeline",
    keywords: ["pipeline", "kanban", "tablero", "etapas", "embudo"],
  },
  {
    id: "go-contactos",
    title: "Ir a Contactos",
    subtitle: "Lista de contactos",
    href: "/contactos",
    keywords: ["contactos", "contacts", "agenda"],
  },
  {
    id: "go-asistente",
    title: "Abrir Asistente IA",
    subtitle: "Consulta tu base con lenguaje natural",
    href: "/asistente",
    keywords: ["asistente", "ia", "ai", "chat", "preguntar", "consultar", "bot"],
  },
  {
    id: "go-drive",
    title: "Ir a Drive",
    subtitle: "Archivos de la empresa",
    href: "/drive",
    keywords: ["drive", "archivos", "documentos", "files", "carpeta"],
  },
  {
    id: "go-marketing",
    title: "Ir a Marketing",
    subtitle: "Rendimiento de campañas",
    href: "/dashboard/marketing",
    keywords: ["marketing", "campanas", "facebook", "leads marketing"],
  },
  {
    id: "go-suscripcion",
    title: "Gestionar suscripción",
    subtitle: "Plan, asientos y método de pago",
    href: "/suscripcion",
    keywords: ["suscripcion", "plan", "pago", "asientos", "billing", "stripe"],
    requires: "can_manage_users",
  },
  {
    id: "go-cuenta",
    title: "Mi cuenta",
    subtitle: "Perfil, privacidad y eliminación",
    href: "/ajustes/cuenta",
    keywords: ["cuenta", "perfil", "mi cuenta", "account", "privacidad", "eliminar"],
  },
  {
    id: "go-equipo",
    title: "Gestionar equipo",
    subtitle: "Invitar, editar, activar usuarios",
    href: "/ajustes/equipo",
    keywords: ["equipo", "usuarios", "team", "miembros", "invitar"],
    requires: "can_manage_users",
  },
  {
    id: "go-roles",
    title: "Configurar roles",
    subtitle: "Permisos y jerarquía",
    href: "/ajustes/roles",
    keywords: ["roles", "permisos", "jerarquia", "niveles"],
    requires: "can_manage_roles",
  },
  {
    id: "go-integraciones",
    title: "Integraciones",
    subtitle: "Conectar Facebook, webhooks, etc.",
    href: "/integraciones",
    keywords: ["integraciones", "facebook", "webhook", "conectar", "api"],
    requires: "can_manage_integrations",
  },
  {
    id: "go-ia-settings",
    title: "Ajustes del asistente IA",
    subtitle: "Documentos y comportamiento",
    href: "/ajustes/ia",
    keywords: ["ia settings", "asistente config", "ia docs"],
  },
]

export function matchStaticActions(
  query: string,
  permissions: Record<string, boolean>,
  roleName: string | null,
): SearchItemAction[] {
  const q = query.trim().toLowerCase()
  const out: SearchItemAction[] = []

  for (const a of STATIC_ACTIONS) {
    if (a.requires && !permissions[a.requires]) continue
    if (a.requiresRoleIncludes) {
      const rn = (roleName ?? "").toLowerCase()
      if (!rn.includes(a.requiresRoleIncludes.toLowerCase())) continue
    }

    // Si no hay query, mostrar siempre las acciones disponibles
    if (!q) {
      out.push({
        category: "actions",
        id: a.id,
        title: a.title,
        subtitle: a.subtitle,
        href: a.href,
      })
      continue
    }

    const haystack = [a.title, a.subtitle, ...a.keywords].join(" ").toLowerCase()
    if (haystack.includes(q)) {
      out.push({
        category: "actions",
        id: a.id,
        title: a.title,
        subtitle: a.subtitle,
        href: a.href,
      })
    }
  }

  // Limitar a 8 acciones para no saturar el dropdown
  return out.slice(0, 8)
}

/**
 * Tipos compartidos del command palette.
 *
 * El endpoint /api/search devuelve un SearchResults con listas
 * pre-categorizadas. El componente cliente solo las renderiza
 * y maneja el highlight de texto coincidente.
 */

export type SearchCategory = "leads" | "contacts" | "files" | "members" | "actions"

export type SearchItemLead = {
  category: "leads"
  id: string
  title: string
  subtitle: string | null
  href: string
}

export type SearchItemContact = {
  category: "contacts"
  id: string
  title: string
  subtitle: string | null
  href: string
}

export type SearchItemFile = {
  category: "files"
  id: string
  title: string
  subtitle: string | null
  href: string
}

export type SearchItemMember = {
  category: "members"
  id: string
  title: string
  subtitle: string | null
  href: string
}

export type SearchItemAction = {
  category: "actions"
  id: string
  title: string
  subtitle: string | null
  href: string
  /** Si true, no navega — abre el sheet de nuevo lead prellenado (futuro) */
  createsLead?: boolean
}

export type SearchItem =
  | SearchItemLead
  | SearchItemContact
  | SearchItemFile
  | SearchItemMember
  | SearchItemAction

export type SearchResults = {
  leads: SearchItemLead[]
  contacts: SearchItemContact[]
  files: SearchItemFile[]
  members: SearchItemMember[]
  actions: SearchItemAction[]
}

/** Respuesta del endpoint /api/search (sin acciones — esas se computan en cliente) */
export type SearchHits = {
  leads: SearchItemLead[]
  contacts: SearchItemContact[]
  files: SearchItemFile[]
  members: SearchItemMember[]
}

export const CATEGORY_LABELS: Record<SearchCategory, string> = {
  leads: "Leads",
  contacts: "Contactos",
  files: "Archivos",
  members: "Equipo",
  actions: "Acciones",
}

export const CATEGORY_ORDER: SearchCategory[] = [
  "leads",
  "contacts",
  "files",
  "members",
  "actions",
]

"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import {
  Search, Loader2, ArrowRight, CornerDownLeft,
  TrendingUp, Users, FileText, UserCircle, Zap, X,
} from "lucide-react"
import { matchStaticActions } from "@/lib/search/actions"
import {
  CATEGORY_LABELS, CATEGORY_ORDER,
  type SearchItem, type SearchHits, type SearchCategory,
} from "@/lib/search/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_ICONS: Record<SearchCategory, React.ComponentType<{ className?: string }>> = {
  leads: TrendingUp,
  contacts: Users,
  files: FileText,
  members: UserCircle,
  actions: Zap,
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter()
  const { role } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [results, setResults] = useState<SearchHits>({
    leads: [], contacts: [], files: [], members: [],
  })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  // Reset state cuando se cierra
  useEffect(() => {
    if (!open) {
      setQuery("")
      setDebounced("")
      setResults({ leads: [], contacts: [], files: [], members: [] })
      setActiveIdx(0)
    }
  }, [open])

  // Debounce de 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Acciones siempre disponibles (filtradas por permisos)
  const actions = useMemo(() => {
    return matchStaticActions(query, role?.permissions ?? {}, role?.name ?? null)
  }, [query, role])

  // Lista plana para keyboard nav (mismo orden que CATEGORY_ORDER)
  const flatItems: SearchItem[] = useMemo(() => {
    const out: SearchItem[] = []
    for (const cat of CATEGORY_ORDER) {
      if (cat === "leads") out.push(...results.leads)
      if (cat === "contacts") out.push(...results.contacts)
      if (cat === "files") out.push(...results.files)
      if (cat === "members") out.push(...results.members)
      if (cat === "actions") out.push(...actions)
    }
    return out
  }, [results, actions])

  // Fetch cuando cambia el debounced
  useEffect(() => {
    if (!open) return
    if (debounced.length < 2) {
      setResults({ leads: [], contacts: [], files: [], members: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && "leads" in data) {
          setResults(data as SearchHits)
        }
        setLoading(false)
        setActiveIdx(0)
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("[command-palette] search error:", err)
          setLoading(false)
        }
      })
    return () => ctrl.abort()
  }, [debounced, open])

  // Mantener activeIdx dentro del rango
  useEffect(() => {
    if (activeIdx >= flatItems.length) setActiveIdx(Math.max(0, flatItems.length - 1))
  }, [flatItems.length, activeIdx])

  const activate = useCallback((item: SearchItem | undefined) => {
    if (!item) return
    onOpenChange(false)
    if (item.href) router.push(item.href)
  }, [router, onOpenChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(flatItems.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      activate(flatItems[activeIdx])
    }
  }, [flatItems, activeIdx, activate])

  // Calcular el índice de inicio de cada categoría (para resaltar grupos)
  const categoryOffsets = useMemo(() => {
    const offsets: Record<SearchCategory, number> = {
      leads: 0, contacts: 0, files: 0, members: 0, actions: 0,
    }
    let i = 0
    for (const cat of CATEGORY_ORDER) {
      const len = cat === "leads" ? results.leads.length
        : cat === "contacts" ? results.contacts.length
        : cat === "files" ? results.files.length
        : cat === "members" ? results.members.length
        : actions.length
      if (len > 0) offsets[cat] = i
      i += len
    }
    return offsets
  }, [results, actions])

  const showEmpty = debounced.length >= 2 && !loading && flatItems.length === 0
  const showHint = debounced.length < 2 && !loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-[calc(100%-0.5rem)] sm:max-w-2xl
          w-full
          border-zinc-800 bg-zinc-950 p-0
          top-[10vh] sm:top-1/2 -translate-y-0 sm:-translate-y-1/2
          rounded-xl overflow-hidden
          [&>button]:hidden
        "
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <div className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar leads, contactos, archivos, acciones..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <Loader2 className="w-4 h-4 text-flugzz-accent animate-spin" />}
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500"
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto overscroll-contain"
          onKeyDown={handleKeyDown}
        >
          {showHint && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-500">Empieza a escribir para buscar.</p>
              <p className="text-xs text-zinc-600 mt-1">Mínimo 2 caracteres.</p>
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-500">Sin resultados para &ldquo;{debounced}&rdquo;</p>
              <p className="text-xs text-zinc-600 mt-1">Prueba con otro término o revisa la página correspondiente.</p>
            </div>
          )}

          {CATEGORY_ORDER.map((cat) => {
            const items = cat === "leads" ? results.leads
              : cat === "contacts" ? results.contacts
              : cat === "files" ? results.files
              : cat === "members" ? results.members
              : actions

            if (items.length === 0) return null

            const Icon = CATEGORY_ICONS[cat]
            const startIdx = categoryOffsets[cat]

            return (
              <div key={cat} className="py-2">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 flex items-center gap-1.5">
                  <Icon className="w-3 h-3" /> {CATEGORY_LABELS[cat]}
                </p>
                <div>
                  {items.map((item, i) => {
                    const flatIdx = startIdx + i
                    const isActive = flatIdx === activeIdx
                    return (
                      <button
                        key={`${item.category}-${item.id}`}
                        onClick={() => activate(item)}
                        onMouseEnter={() => setActiveIdx(flatIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive ? "bg-flugzz-accent/10" : "hover:bg-zinc-900/60"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isActive ? "text-zinc-100" : "text-zinc-200"}`}>
                            <HighlightMatch text={item.title} query={debounced} />
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-zinc-500 truncate mt-0.5">
                              <HighlightMatch text={item.subtitle} query={debounced} />
                            </p>
                          )}
                        </div>
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-flugzz-accent" : "text-zinc-700"}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden sm:flex items-center justify-between border-t border-zinc-800/60 px-4 py-2 text-[10px] text-zinc-600">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-500 font-mono">↑↓</kbd>
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-500 font-mono">↵</kbd>
              abrir
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-500 font-mono">esc</kbd>
              cerrar
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="w-2.5 h-2.5" /> {flatItems.length} resultados
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-flugzz-accent/25 text-flugzz-accent rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

type Props = {
  onOpen: () => void
}

/**
 * Trigger desktop del command palette: input con apariencia de búsqueda.
 * Click → abre el palette (NO captura el typing aquí, eso ocurre dentro del modal).
 */
export function CommandPaletteTrigger({ onOpen }: Props) {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="hidden sm:flex items-center w-full max-w-sm gap-2 bg-zinc-900/70 border border-zinc-800/60 rounded-full pl-3 pr-2 py-1.5 text-sm text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
    >
      <Search className="w-4 h-4 text-zinc-600 shrink-0" />
      <span className="flex-1 text-left">Buscar leads, contactos, archivos...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-950 text-[10px] font-mono text-zinc-500">
        {isMac ? "⌘" : "Ctrl"}<span>K</span>
      </kbd>
    </button>
  )
}

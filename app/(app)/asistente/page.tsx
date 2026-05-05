"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  Send, Bot, Loader2, AlertCircle, Sparkles, BookOpen,
  UploadCloud, FileText, Trash2, RefreshCw, CheckCircle2,
  Clock, XCircle, ChevronDown, File, Plus, Hash,
  MessageSquare, Info
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; content: string }

type KnowledgeDoc = {
  id: string
  title: string
  description: string | null
  file_type: string | null
  status: "processing" | "ready" | "error" | "archived"
  version: number
  created_at: string
  _chunkCount?: number
}

// ── Helpers ────────────────────────────────────────────────────
function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "ahora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: KnowledgeDoc["status"] }) {
  const map = {
    ready:      { icon: <CheckCircle2 className="w-3 h-3" />, label: "Listo",       cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    processing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Procesando", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    error:      { icon: <XCircle className="w-3 h-3" />, label: "Error",      cls: "text-red-400 bg-red-500/10 border-red-500/20" },
    archived:   { icon: <Clock className="w-3 h-3" />, label: "Archivado",   cls: "text-zinc-500 bg-zinc-800/50 border-zinc-700/40" },
  }
  const { icon, label, cls } = map[status]
  return (
    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${cls}`}>
      {icon}{label}
    </span>
  )
}

// ── Document card ──────────────────────────────────────────────
function DocCard({
  doc, onDelete, onReprocess
}: {
  doc: KnowledgeDoc
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 hover:border-zinc-700/60 transition-colors overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-zinc-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{doc.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zinc-600">{doc.file_type?.toUpperCase() ?? "TXT"}</span>
            {doc._chunkCount != null && doc._chunkCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-zinc-600">
                <Hash className="w-2.5 h-2.5" />{doc._chunkCount} fragmentos
              </span>
            )}
            <span className="text-xs text-zinc-700">{relTime(doc.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={doc.status} />

          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-zinc-800/50 px-3 py-2.5 flex items-center gap-2 bg-zinc-900/20">
          {doc.description && (
            <p className="text-xs text-zinc-500 flex-1 italic">{doc.description}</p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {doc.status === "error" && (
              <button onClick={() => onReprocess(doc.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors">
                <RefreshCw className="w-3 h-3" />Reintentar
              </button>
            )}
            <button
              onClick={async () => { setDeleting(true); await onDelete(doc.id); setDeleting(false) }}
              disabled={deleting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-40">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Upload form ────────────────────────────────────────────────
function UploadForm({ companyId, onUploaded }: { companyId: string; onUploaded: () => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const ACCEPT = ".txt,.md,.csv,.pdf"
  const MAX_MB = 20
  const isPDF = file?.name.toLowerCase().endsWith(".pdf") ?? false

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const maxBytes = (f.name.toLowerCase().endsWith(".pdf") ? 20 : 5) * 1024 * 1024
    if (f.size > maxBytes) {
      setError(`El archivo supera el límite permitido.`)
      return
    }
    setFile(f)
    setError(null)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""))
  }

  async function upload() {
    if (!file || !title.trim()) { setError("Necesitas un título y un archivo."); return }
    setUploading(true); setError(null)

    let text = ""

    if (isPDF) {
      // ── PDF: extraer texto en el servidor ──
      setProgress("Extrayendo texto del PDF...")
      const form = new FormData()
      form.append("file", file)
      const extractRes = await fetch("/api/ia/document/extract-pdf", { method: "POST", body: form })
      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        setError(extractData.error ?? "No se pudo extraer texto del PDF.")
        setUploading(false); setProgress(null); return
      }
      text = extractData.text
      setProgress(`PDF leído · ${extractData.pages} página${extractData.pages !== 1 ? "s" : ""} · ${(extractData.charCount / 1000).toFixed(0)}k caracteres`)
      await new Promise(r => setTimeout(r, 600))
    } else {
      // ── Texto plano: leer directo en el cliente ──
      setProgress("Leyendo archivo...")
      text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })
    }

    if (!text.trim()) { setError("El archivo está vacío o no tiene texto extraíble."); setUploading(false); setProgress(null); return }

    setProgress("Guardando documento...")

    // 2. Crear registro en knowledge_documents via API
    const createRes = await fetch("/api/ia/document/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        title: title.trim(),
        description: description.trim() || null,
        fileType: file.name.split(".").pop() ?? "txt",
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok || !createData.documentId) {
      setError(createData.error ?? "Error al guardar el documento.")
      setUploading(false); setProgress(null); return
    }

    setProgress("Generando embeddings con IA...")

    // 3. Ingestar — genera chunks + embeddings
    const ingestRes = await fetch("/api/ia/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: createData.documentId, text, companyId }),
    })
    const ingestData = await ingestRes.json()

    if (!ingestRes.ok) {
      setError(ingestData.error ?? "Error al procesar embeddings.")
      setUploading(false); setProgress(null); return
    }

    setProgress(`✓ ${ingestData.chunks} fragmentos indexados`)
    setTimeout(() => {
      setUploading(false); setProgress(null)
      setTitle(""); setDescription(""); setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      onUploaded()
    }, 1200)
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 space-y-3">
      <p className="text-sm font-medium text-zinc-200 flex items-center gap-2">
        <Plus className="w-4 h-4 text-flugzz-accent" />
        Agregar documento
      </p>

      {/* Info callout */}
      <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300/70 leading-relaxed">
          Sube archivos <strong className="text-blue-300">.pdf</strong>, <strong className="text-blue-300">.txt</strong> o <strong className="text-blue-300">.md</strong>.
          PDFs hasta 20 MB, texto hasta 5 MB. Solo funciona con PDFs nativos (no escaneados).
          Ideal para fichas técnicas, listas de precios, manuales de objeciones y FAQs.
        </p>
      </div>

      <input
        placeholder="Título del documento (ej: Ficha Torre B Fase 2)"
        value={title} onChange={e => setTitle(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
      />
      <input
        placeholder="Descripción breve (opcional)"
        value={description} onChange={e => setDescription(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
      />

      {/* File picker */}
      <button
        onClick={() => fileRef.current?.click()}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-colors ${
          file
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-zinc-900/60 border-zinc-700 border-dashed text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        }`}>
        {file
          ? <><CheckCircle2 className="w-4 h-4" />{file.name}{isPDF ? " · PDF" : ""}</>
          : <><UploadCloud className="w-4 h-4" />Seleccionar archivo (PDF, TXT, MD)</>}
      </button>
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {progress && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-flugzz-accent/5 border border-flugzz-accent/15 text-flugzz-accent text-xs">
          {progress.startsWith("✓")
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
          {progress}
        </div>
      )}

      <button
        onClick={upload}
        disabled={uploading || !file || !title.trim()}
        className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-2.5 text-sm font-medium disabled:opacity-30 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
          : <><UploadCloud className="w-4 h-4" />Subir y entrenar al asistente</>}
      </button>
    </div>
  )
}

// ── Chat bubble ────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user"
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-flugzz-accent/15 border border-flugzz-accent/25 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-flugzz-accent" />
        </div>
      )}
      <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-zinc-100 text-zinc-900 rounded-tr-sm"
          : "bg-zinc-900/60 border border-zinc-800/50 text-zinc-200 rounded-tl-sm"
      }`}>
        {msg.content}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function AsistentePage() {
  const { profile, loading: authLoading, can } = useAuth()
  const canManage = can("can_manage_knowledge")

  const [tab, setTab] = useState<"chat" | "docs">("chat")

  // Chat state
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Docs state
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})

  const companyId = profile?.company_id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  const loadDocs = useCallback(async () => {
    if (!companyId) return
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/ia/document/list?companyId=${companyId}`)
      const data = await res.json()
      setDocs(data.docs ?? [])
      setDocCounts(data.chunkCounts ?? {})
    } catch {
      // silencioso
    }
    setDocsLoading(false)
  }, [companyId])

  useEffect(() => {
    if (tab === "docs") loadDocs()
  }, [tab, loadDocs])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  async function send() {
    const text = input.trim()
    if (!text || !companyId || sending) return
    setChatError(null)
    setInput("")
    const history = messages
    setMessages(m => [...m, { role: "user", content: text }])
    setSending(true)
    try {
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, companyId, history: history.slice(-12) }),
      })
      const data = await res.json() as { answer?: string; error?: string }
      if (!res.ok) { setChatError(data.error ?? "Error al obtener respuesta"); return }
      setMessages(m => [...m, { role: "assistant", content: data.answer?.trim() || "Sin respuesta" }])
    } catch {
      setChatError("Error de conexión. Verifica tu conexión e intenta de nuevo.")
    } finally {
      setSending(false)
    }
  }

  async function deleteDoc(docId: string) {
    await fetch("/api/ia/document/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId }),
    })
    setDocs(prev => prev.filter(d => d.id !== docId))
  }

  async function reprocessDoc(docId: string) {
    const doc = docs.find(d => d.id === docId)
    if (!doc) return
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: "processing" } : d))
    // Marks as processing, user needs to re-upload the file
    // We just reset the status for now
    await fetch("/api/ia/document/create", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, status: "processing" }),
    })
    loadDocs()
  }

  const QUICK_PROMPTS = [
    "¿Cuáles son los proyectos disponibles?",
    "¿Cuál es el precio por m²?",
    "¿Cómo manejo la objeción de precio?",
    "¿Qué incluye la escrituración?",
  ]

  const readyDocs = docs.filter(d => d.status === "ready").length
  const totalChunks = Object.values(docCounts).reduce((a, b) => a + b, 0)

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-5rem)] gap-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Asistente<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {readyDocs > 0
              ? `${readyDocs} documento${readyDocs > 1 ? "s" : ""} en la base de conocimiento · ${totalChunks} fragmentos indexados`
              : "Entrena al asistente cargando documentos de tu inmobiliaria"}
          </p>
        </div>

        {/* Tabs — solo el admin los ve todos */}
        {canManage && (
          <div className="flex gap-1 p-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl shrink-0">
            {[
              { id: "chat", icon: MessageSquare, label: "Chat" },
              { id: "docs", icon: BookOpen,      label: "Documentos" },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id as "chat" | "docs")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === id ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-200"
                }`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ════ CHAT TAB ════ */}
      {tab === "chat" && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-5 pb-10">
                <div className="w-16 h-16 rounded-2xl bg-flugzz-accent/10 border border-flugzz-accent/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-flugzz-accent" />
                </div>
                <div>
                  <p className="text-zinc-300 font-medium">¿En qué te ayudo hoy?</p>
                  <p className="text-zinc-600 text-sm mt-1">
                    {readyDocs > 0
                      ? "Pregúntame sobre proyectos, precios o argumentos de venta."
                      : "Aún no hay documentos. Un admin puede cargarlos en la pestaña Documentos."}
                  </p>
                </div>
                {readyDocs > 0 && (
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {QUICK_PROMPTS.map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className="text-left text-xs p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all leading-relaxed">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}

            {sending && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-flugzz-accent/15 border border-flugzz-accent/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-flugzz-accent animate-pulse" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-900/60 border border-zinc-800/50">
                  <div className="flex gap-1 items-center h-4">
                    {[0,150,300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chatError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />{chatError}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 shrink-0">
            <div className="flex-1 flex items-end gap-2 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl px-4 py-3 focus-within:border-zinc-700 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Pregunta sobre proyectos, precios, objeciones..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none resize-none max-h-40"
              />
            </div>
            <button onClick={send} disabled={!input.trim() || sending}
              className="p-3 rounded-2xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-30 transition-all shrink-0 self-end">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </>
      )}

      {/* ════ DOCS TAB ════ */}
      {tab === "docs" && canManage && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* Stats row */}
          {docs.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total docs", value: docs.length },
                { label: "Listos",    value: readyDocs },
                { label: "Fragmentos indexados", value: totalChunks },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40 text-center">
                  <p className="text-xl font-semibold text-zinc-100">{value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Upload form */}
          <UploadForm companyId={companyId!} onUploaded={loadDocs} />

          {/* Documents list */}
          {docsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-zinc-900/40 animate-pulse" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600 text-center">
              <BookOpen className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Sin documentos cargados</p>
              <p className="text-xs mt-1 max-w-xs text-zinc-700">
                Sube fichas técnicas, listas de precios o manuales de ventas en formato .txt o .md
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium">
                {docs.length} documento{docs.length > 1 ? "s" : ""}
              </p>
              {docs.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={{ ...doc, _chunkCount: docCounts[doc.id] }}
                  onDelete={deleteDoc}
                  onReprocess={reprocessDoc}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

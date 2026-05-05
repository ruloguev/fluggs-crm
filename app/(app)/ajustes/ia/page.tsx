"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  UploadCloud, FileText, Trash2, RefreshCw, CheckCircle2,
  Clock, XCircle, Hash, Plus, Info, Loader2, AlertCircle,
  ChevronDown, BookOpen, Sparkles, BarChart2
} from "lucide-react"

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

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "ahora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function StatusBadge({ status }: { status: KnowledgeDoc["status"] }) {
  const map = {
    ready:      { icon: <CheckCircle2 className="w-3 h-3" />, label: "Listo",       cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    processing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Procesando", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    error:      { icon: <XCircle className="w-3 h-3" />, label: "Error",       cls: "text-red-400 bg-red-500/10 border-red-500/20" },
    archived:   { icon: <Clock className="w-3 h-3" />, label: "Archivado",    cls: "text-zinc-500 bg-zinc-800/50 border-zinc-700/40" },
  }
  const { icon, label, cls } = map[status]
  return (
    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${cls}`}>
      {icon}{label}
    </span>
  )
}

function DocCard({ doc, onDelete, onReprocess }: {
  doc: KnowledgeDoc
  onDelete: (id: string) => void
  onReprocess: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 hover:border-zinc-700/60 transition-colors overflow-hidden">
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

      {expanded && (
        <div className="border-t border-zinc-800/50 px-3 py-2.5 flex items-center gap-2 bg-zinc-900/20">
          {doc.description && <p className="text-xs text-zinc-500 flex-1 italic">{doc.description}</p>}
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

function UploadForm({ companyId, onUploaded }: { companyId: string; onUploaded: () => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isPDF = file?.name.toLowerCase().endsWith(".pdf") ?? false

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const maxBytes = (f.name.toLowerCase().endsWith(".pdf") ? 20 : 5) * 1024 * 1024
    if (f.size > maxBytes) { setError("El archivo supera el límite permitido."); return }
    setFile(f)
    setError(null)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""))
  }

  async function upload() {
    if (!file || !title.trim()) { setError("Necesitas un título y un archivo."); return }
    setUploading(true); setError(null)

    let text = ""

    if (isPDF) {
      setProgress("Extrayendo texto del PDF...")
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/ia/document/extract-pdf", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error al extraer texto."); setUploading(false); setProgress(null); return }
      text = data.text
      setProgress(`PDF leído · ${data.pages} pág. · ${(data.charCount / 1000).toFixed(0)}k chars`)
      await new Promise(r => setTimeout(r, 600))
    } else {
      setProgress("Leyendo archivo...")
      text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })
    }

    if (!text.trim()) { setError("El archivo está vacío."); setUploading(false); setProgress(null); return }

    setProgress("Guardando documento...")
    const createRes = await fetch("/api/ia/document/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, title: title.trim(), description: description.trim() || null, fileType: isPDF ? "pdf" : file.name.split(".").pop() ?? "txt" }),
    })
    const createData = await createRes.json()
    if (!createRes.ok || !createData.documentId) { setError(createData.error ?? "Error al guardar."); setUploading(false); setProgress(null); return }

    setProgress("Generando embeddings con IA...")
    const ingestRes = await fetch("/api/ia/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: createData.documentId, text, companyId }),
    })
    const ingestData = await ingestRes.json()
    if (!ingestRes.ok) { setError(ingestData.error ?? "Error al procesar."); setUploading(false); setProgress(null); return }

    setProgress(`✓ ${ingestData.chunks ?? 0} fragmentos indexados`)
    setTimeout(() => {
      setUploading(false); setProgress(null)
      setTitle(""); setDescription(""); setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      onUploaded()
    }, 1200)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300/70 leading-relaxed">
          Sube <strong className="text-blue-300">.pdf</strong>, <strong className="text-blue-300">.txt</strong> o <strong className="text-blue-300">.md</strong>.
          PDFs hasta 20 MB, texto hasta 5 MB. Solo PDFs nativos (no escaneados).
        </p>
      </div>

      <input placeholder="Título del documento" value={title} onChange={e => setTitle(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors" />
      <input placeholder="Descripción breve (opcional)" value={description} onChange={e => setDescription(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors" />

      <button onClick={() => fileRef.current?.click()}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-colors ${
          file ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
               : "bg-zinc-900/60 border-zinc-700 border-dashed text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        }`}>
        {file ? <><CheckCircle2 className="w-4 h-4" />{file.name}</> : <><UploadCloud className="w-4 h-4" />Seleccionar archivo (PDF, TXT, MD)</>}
      </button>
      <input ref={fileRef} type="file" accept=".txt,.md,.csv,.pdf" className="hidden" onChange={onFileChange} />

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}
      {progress && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-flugzz-accent/5 border border-flugzz-accent/15 text-flugzz-accent text-xs">
          {progress.startsWith("✓") ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}
          {progress}
        </div>
      )}

      <button onClick={upload} disabled={uploading || !file || !title.trim()}
        className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-2.5 text-sm font-medium disabled:opacity-30 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <><Sparkles className="w-4 h-4" />Subir y entrenar al asistente</>}
      </button>
    </div>
  )
}

export default function AjustesIAPage() {
  const { profile, loading: authLoading, can } = useAuth()
  const router = useRouter()

  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})
  const [showUpload, setShowUpload] = useState(false)

  const companyId = profile?.company_id

  useEffect(() => {
    if (!authLoading && !can("can_manage_knowledge")) router.push("/pipeline")
  }, [authLoading])

  const loadDocs = useCallback(async () => {
    if (!companyId) return
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/ia/document/list?companyId=${companyId}`)
      const data = await res.json()
      setDocs(data.docs ?? [])
      setDocCounts(data.chunkCounts ?? {})
    } catch { /* silent */ }
    setDocsLoading(false)
  }, [companyId])

  useEffect(() => { loadDocs() }, [loadDocs])

  async function deleteDoc(docId: string) {
    await fetch("/api/ia/document/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId }),
    })
    setDocs(prev => prev.filter(d => d.id !== docId))
  }

  async function reprocessDoc(docId: string) {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: "processing" as const } : d))
    await fetch("/api/ia/document/create", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, status: "processing" }),
    })
    loadDocs()
  }

  const readyDocs  = docs.filter(d => d.status === "ready").length
  const totalChunks = Object.values(docCounts).reduce((a, b) => a + b, 0)

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Conocimiento IA<span className="text-flugzz-accent">.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Documentos que alimentan al asistente de tu equipo.
          </p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0">
          <Plus className="w-4 h-4" />
          {showUpload ? "Cancelar" : "Subir documento"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: FileText,  label: "Documentos",          value: docs.length,  color: "text-zinc-300" },
          { icon: CheckCircle2, label: "Listos",            value: readyDocs,    color: "text-emerald-400" },
          { icon: BarChart2, label: "Fragmentos indexados", value: totalChunks,  color: "text-flugzz-accent" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Upload panel */}
      {showUpload && companyId && (
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50">
          <p className="text-sm font-medium text-zinc-200 flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-flugzz-accent" />
            Nuevo documento
          </p>
          <UploadForm companyId={companyId} onUploaded={() => { setShowUpload(false); loadDocs() }} />
        </div>
      )}

      {/* Docs list */}
      <div>
        <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-3">
          {docs.length} documento{docs.length !== 1 ? "s" : ""} en la base de conocimiento
        </p>

        {docsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-zinc-900/40 animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zinc-600 text-center border border-dashed border-zinc-800/60 rounded-2xl">
            <BookOpen className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">Sin documentos cargados</p>
            <p className="text-xs mt-1 max-w-xs text-zinc-700">
              Sube fichas técnicas, listas de precios o manuales de ventas
            </p>
            <button onClick={() => setShowUpload(true)} className="mt-4 text-flugzz-accent text-sm hover:underline">
              Subir el primer documento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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
    </div>
  )
}

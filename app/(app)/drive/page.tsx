"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import {
  Folder,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  FolderPlus,
  Search,
  ChevronRight,
  FileArchive,
  Download,
  Tag,
  Loader2,
  AlertCircle,
} from "lucide-react"

const BUCKET = "company-drive"

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return <FileText className="w-8 h-8 text-rose-400" />
  if (mimeType.includes("image")) return <ImageIcon className="w-8 h-8 text-flugzz-accent" />
  if (mimeType.includes("zip") || mimeType.includes("rar"))
    return <FileArchive className="w-8 h-8 text-amber-400" />
  return <FileText className="w-8 h-8 text-zinc-400" />
}

type ListItem = {
  name: string
  id: string | null
  updated_at: string | null
  created_at: string
  last_accessed_at: string
  metadata: Record<string, unknown> | null
}

export default function DrivePage() {
  const { profile, loading: authLoading } = useAuth()
  const [supabase] = useState(() => createClient())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<ListItem[]>([])
  const [files, setFiles] = useState<ListItem[]>([])
  const [pathSegments, setPathSegments] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const companyId = profile?.company_id

  const listPrefix = useCallback(() => {
    if (!companyId) return ""
    if (pathSegments.length === 0) return companyId
    return [companyId, ...pathSegments].join("/")
  }, [companyId, pathSegments])

  const load = useCallback(async () => {
    if (!companyId) return
    setIsLoading(true)
    setError(null)
    const prefix = listPrefix()
    const { data, error: listError } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    })
    if (listError) {
      setError(
        listError.message.includes("not found")
          ? 'El bucket «company-drive» no existe. Ejecuta la migración SQL del proyecto o créalo en Supabase Storage.'
          : listError.message,
      )
      setFolders([])
      setFiles([])
      setIsLoading(false)
      return
    }

    const rows = (data ?? []) as ListItem[]
    const isFolder = (i: ListItem) =>
      i.metadata === null && i.name !== ".keep"
    const folderRows = rows.filter(isFolder)
    const fileRows = rows
      .filter((i) => !isFolder(i))
      .filter((i) => i.name !== ".keep")
    setFolders(folderRows)
    setFiles(fileRows)
    setIsLoading(false)
  }, [companyId, listPrefix, supabase])

  useEffect(() => {
    if (!authLoading && companyId) void load()
    if (!authLoading && !companyId) setIsLoading(false)
  }, [authLoading, companyId, load])

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !companyId) return
    setError(null)
    const base = listPrefix()
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const dest = `${base}/${file.name}`.replace(/\/+/g, "/")
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(dest, file, {
        upsert: false,
      })
      if (upErr) {
        setError(upErr.message)
        break
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
    await load()
  }

  async function createFolder() {
    const name = window.prompt("Nombre de la carpeta")
    if (!name?.trim() || !companyId) return
    const safe = name.trim().replace(/[/\\]/g, "-")
    const base = listPrefix()
    const placeholderPath = `${base}/${safe}/.keep`.replace(/\/+/g, "/")
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(placeholderPath, new Blob([""]), { contentType: "application/octet-stream" })
    if (upErr) setError(upErr.message)
    await load()
  }

  async function downloadFile(name: string) {
    const base = listPrefix()
    const path = `${base}/${name}`.replace(/\/+/g, "/")
    const { data, error: dlErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (dlErr || !data?.signedUrl) {
      setError(dlErr?.message ?? "No se pudo generar enlace")
      return
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  function enterFolder(name: string) {
    setPathSegments((p) => [...p, name])
  }

  function goToSegment(index: number) {
    setPathSegments((segments) => segments.slice(0, index))
  }

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-flugzz-accent animate-spin" />
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-sm text-amber-100/90 max-w-md">
        Asigna una empresa a tu perfil para usar el Drive.
      </div>
    )
  }

  return (
    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void uploadFiles(e.target.files)}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100">
            Documentos<span className="text-flugzz-accent ml-1">.</span>
          </h1>
          <div className="flex items-center flex-wrap text-sm mt-2 text-zinc-400 gap-1">
            <button
              type="button"
              className="hover:text-zinc-100 font-medium"
              onClick={() => setPathSegments([])}
            >
              Mi bóveda
            </button>
            {pathSegments.map((seg, index) => (
              <span key={seg + index} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                <button
                  type="button"
                  className="hover:text-zinc-100 font-medium"
                  onClick={() => goToSegment(index + 1)}
                >
                  {seg}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3 flex-wrap justify-end">
          <div className="relative group flex-1 md:w-64 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-flugzz-accent transition-colors" />
            <input
              type="text"
              placeholder="Buscar en esta carpeta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/55 border border-zinc-800/60 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-flugzz-accent/50 focus:ring-1 focus:ring-flugzz-accent/50 transition-all placeholder:text-zinc-600"
            />
          </div>

          <button
            type="button"
            className="p-2 rounded-xl bg-zinc-900/55 border border-zinc-800/60 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            title="Nueva carpeta"
            onClick={() => void createFolder()}
          >
            <FolderPlus className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-flugzz-accent text-zinc-950 font-semibold hover:bg-cyan-300 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)]"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-5 h-5" />
            <span className="hidden sm:inline">Subir archivo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-flugzz-accent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-10 space-y-8">
          {filteredFolders.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">
                Carpetas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFolders.map((folder) => (
                  <button
                    type="button"
                    key={folder.name}
                    onClick={() => enterFolder(folder.name)}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 text-left hover:border-flugzz-accent/40 hover:bg-zinc-800/45 transition-all group w-full"
                  >
                    <Folder className="w-8 h-8 text-zinc-500 group-hover:text-flugzz-accent transition-colors" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-zinc-200 text-sm font-medium truncate group-hover:text-white">
                        {folder.name}
                      </h3>
                      <p className="text-zinc-600 text-xs">Carpeta</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {filteredFiles.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">
                Archivos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFiles.map((file) => {
                  const meta = file.metadata as { mimetype?: string; size?: number } | null
                  const mime = meta?.mimetype ?? "application/octet-stream"
                  const size = meta?.size ?? 0
                  return (
                    <div
                      key={file.name}
                      className="flex flex-col p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700 transition-all relative"
                    >
                      <div className="absolute top-4 right-4">
                        <button
                          type="button"
                          className="text-zinc-600 hover:text-zinc-200 transition-colors p-1"
                          title="Descargar"
                          onClick={() => void downloadFile(file.name)}
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mb-4 p-3 bg-zinc-950/60 rounded-xl inline-block w-fit border border-zinc-800/50">
                        {getFileIcon(mime)}
                      </div>
                      <div className="flex-1 mb-4 pr-8">
                        <h3
                          className="text-zinc-100 font-medium truncate mb-1"
                          title={file.name}
                        >
                          {file.name}
                        </h3>
                        <div className="flex items-center text-xs text-zinc-500 gap-3">
                          <span>{formatBytes(size)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60 text-zinc-600 text-xs">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {mime.split("/").pop()}
                        </span>
                        <button
                          type="button"
                          onClick={() => void downloadFile(file.name)}
                          className="text-flugzz-accent hover:underline"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {filteredFolders.length === 0 && filteredFiles.length === 0 && !error && (
            <div className="text-center py-16 text-zinc-600 text-sm">
              <p>Esta carpeta está vacía.</p>
              <p className="mt-2">Sube archivos o crea una carpeta.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

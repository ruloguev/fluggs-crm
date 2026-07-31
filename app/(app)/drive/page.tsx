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
  Trash2,
  MoveRight,
  Link,
  Plus,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

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

type DriveLink = {
  id: string
  name: string
  url: string
  created_at: string
}

export default function DrivePage() {
  const { profile, role, can, loading: authLoading } = useAuth()
  const [supabase] = useState(() => createClient())
  const canManageDrive = can("can_manage_drive") || (role?.level ?? 99) <= 2
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<ListItem[]>([])
  const [files, setFiles] = useState<ListItem[]>([])
  const [pathSegments, setPathSegments] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [movePickerOpen, setMovePickerOpen] = useState(false)
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [moveSelectedFolder, setMoveSelectedFolder] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [links, setLinks] = useState<DriveLink[]>([])
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkName, setLinkName] = useState("")
  const [linkUrl, setLinkUrl] = useState("")

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

  const loadLinks = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from("drive_links")
      .select("id, name, url, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
    setLinks((data ?? []) as DriveLink[])
  }, [companyId, supabase])

  useEffect(() => {
    if (!authLoading && companyId) { void load(); void loadLinks() }
    if (!authLoading && !companyId) setIsLoading(false)
  }, [authLoading, companyId, load, loadLinks])

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
    const win = window.open("", "_blank")
    const { data, error: dlErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (dlErr || !data?.signedUrl) {
      win?.close()
      setError(dlErr?.message ?? "No se pudo generar enlace")
      return
    }
    if (win) {
      win.location.href = data.signedUrl
    } else {
      const a = document.createElement("a")
      a.href = data.signedUrl
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  async function deleteFile(name: string) {
    if (!window.confirm(`¿Eliminar permanentemente "${name}"?`)) return
    const base = listPrefix()
    const path = `${base}/${name}`.replace(/\/+/g, "/")
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) { setError(error.message); return }
    await load()
  }

  async function collectAllPaths(prefix: string): Promise<string[]> {
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 200 })
    if (!data) return []
    const items = data as ListItem[]
    let paths: string[] = []
    for (const item of items) {
      const fullPath = `${prefix}/${item.name}`
      if (item.metadata === null && item.name !== ".keep") {
        const subPaths = await collectAllPaths(fullPath)
        paths.push(...subPaths)
      } else {
        paths.push(fullPath)
      }
    }
    return paths
  }

  async function deleteFolder(name: string) {
    if (!window.confirm(`¿Eliminar permanentemente la carpeta "${name}" y todo su contenido?`)) return
    const base = listPrefix()
    const folderPath = `${base}/${name}`
    const allPaths = await collectAllPaths(folderPath)
    if (allPaths.length > 0) {
      for (let i = 0; i < allPaths.length; i += 100) {
        const batch = allPaths.slice(i, i + 100)
        const { error } = await supabase.storage.from(BUCKET).remove(batch)
        if (error) { setError(error.message); return }
      }
    }
    await load()
  }

  function openMovePicker(fileName: string) {
    setMoveTarget(fileName)
    setMoveSelectedFolder("")
    setMovePickerOpen(true)
  }

  async function confirmMove() {
    if (!moveTarget) return
    const base = listPrefix()
    const oldPath = `${base}/${moveTarget}`.replace(/\/+/g, "/")
    const newPath = moveSelectedFolder
      ? `${base}/${moveSelectedFolder}/${moveTarget}`.replace(/\/+/g, "/")
      : oldPath
    if (oldPath === newPath) { setMovePickerOpen(false); return }
    const { error } = await supabase.storage.from(BUCKET).move(oldPath, newPath)
    if (error) { setError(error.message); return }
    setMovePickerOpen(false)
    setMoveTarget(null)
    await load()
  }

  async function addLink() {
    if (!linkName.trim() || !linkUrl.trim() || !companyId || !profile?.id) return
    const { error } = await supabase.from("drive_links").insert({
      company_id: companyId,
      name: linkName.trim(),
      url: linkUrl.trim(),
      created_by: profile.id,
    })
    if (error) { setError(error.message); return }
    setLinkDialogOpen(false)
    setLinkName("")
    setLinkUrl("")
    await loadLinks()
  }

  async function deleteLink(id: string, name: string) {
    if (!window.confirm(`¿Eliminar el enlace "${name}"?`)) return
    const { error } = await supabase.from("drive_links").delete().eq("id", id)
    if (error) { setError(error.message); return }
    await loadLinks()
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
  const filteredLinks = links.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
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

          {canManageDrive && (
            <>
              <button
                type="button"
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors"
                title="Nueva carpeta"
                onClick={() => void createFolder()}
              >
                <FolderPlus className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors"
                title="Añadir enlace de Google Drive"
                onClick={() => { setLinkName(""); setLinkUrl(""); setLinkDialogOpen(true) }}
              >
                <Link className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors border border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-5 h-5" />
                <span>Subir archivo</span>
              </button>
            </>
          )}
          {!canManageDrive && (
            <span className="text-xs text-zinc-600 border border-zinc-800 rounded-xl px-3 py-2">Solo lectura</span>
          )}
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
                  <div key={folder.name} className="relative group">
                    <button
                      type="button"
                      onClick={() => enterFolder(folder.name)}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 text-left hover:border-flugzz-accent/40 hover:bg-zinc-800/45 transition-all w-full"
                    >
                      <Folder className="w-8 h-8 text-zinc-500 group-hover:text-flugzz-accent transition-colors shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-zinc-200 text-sm font-medium truncate group-hover:text-white">
                          {folder.name}
                        </h3>
                        <p className="text-zinc-600 text-xs">Carpeta</p>
                      </div>
                      {canManageDrive && (
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          title="Eliminar carpeta"
                          onClick={(e) => { e.stopPropagation(); void deleteFolder(folder.name) }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </button>
                  </div>
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
                      role="button"
                      tabIndex={0}
                      onClick={() => void downloadFile(file.name)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void downloadFile(file.name) }}}
                      className="flex flex-col p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700 transition-all relative cursor-pointer"
                    >
                      <div className="absolute top-4 right-4 flex items-center gap-0.5">
                        {canManageDrive && (
                          <>
                            <button
                              type="button"
                              className="text-zinc-600 hover:text-flugzz-accent transition-colors p-1"
                              title="Mover a carpeta"
                              onClick={(e) => { e.stopPropagation(); openMovePicker(file.name) }}
                            >
                              <MoveRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                              title="Eliminar"
                              onClick={(e) => { e.stopPropagation(); void deleteFile(file.name) }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="text-zinc-600 hover:text-zinc-200 transition-colors p-1"
                          title="Descargar"
                          onClick={(e) => { e.stopPropagation(); void downloadFile(file.name) }}
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
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {filteredLinks.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">
                Enlaces externos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-flugzz-accent/60 hover:bg-zinc-800/45 transition-all relative cursor-pointer"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-0.5">
                      {canManageDrive && (
                        <button
                          type="button"
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                          title="Eliminar enlace"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); void deleteLink(link.id, link.name) }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mb-4 p-3 bg-zinc-950/60 rounded-xl inline-block w-fit border border-zinc-800/50">
                      <Link className="w-8 h-8 text-flugzz-accent" />
                    </div>
                    <div className="flex-1 mb-4 pr-8">
                      <h3 className="text-zinc-100 font-medium truncate mb-1" title={link.name}>
                        {link.name}
                      </h3>
                      <div className="flex items-center text-xs text-zinc-500 gap-3">
                        <span className="truncate">{link.url}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60 text-zinc-600 text-xs">
                      <span className="flex items-center gap-1">Google Drive</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {filteredFolders.length === 0 && filteredFiles.length === 0 && filteredLinks.length === 0 && !error && (
            <div className="text-center py-16 text-zinc-600 text-sm">
              <p>Esta carpeta está vacía.</p>
              <p className="mt-2">Sube archivos, crea una carpeta o añade un enlace.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={movePickerOpen} onOpenChange={setMovePickerOpen}>
        <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Mover archivo</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Selecciona la carpeta de destino para <strong className="text-zinc-200">{moveTarget}</strong>
          </p>
          <select
            value={moveSelectedFolder}
            onChange={(e) => setMoveSelectedFolder(e.target.value)}
            className="mt-4 w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          >
            <option value="">Raíz (esta carpeta)</option>
            {folders.map((f) => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setMovePickerOpen(false)}
              className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmMove()}
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors border border-cyan-300"
            >
              Mover aquí
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Añadir enlace externo</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Ingresa un nombre y la URL del archivo en Google Drive (u otro servicio).
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Nombre</label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Ej: Plano departamento 101"
                className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-600 placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-600 placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setLinkDialogOpen(false)}
              className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void addLink()}
              disabled={!linkName.trim() || !linkUrl.trim()}
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors border border-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Añadir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

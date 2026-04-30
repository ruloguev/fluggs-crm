"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  UploadCloud, 
  FolderPlus, 
  Search, 
  MoreVertical,
  ChevronRight,
  FileArchive,
  Download,
  Tag
} from "lucide-react"

// --- FUNCIONES AUXILIARES ---
// Convierte bytes a KB o MB legibles
function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// Asigna un ícono y color según el tipo de archivo
function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-rose-400" />
  if (mimeType.includes('image')) return <ImageIcon className="w-8 h-8 text-flugzz-accent" />
  if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="w-8 h-8 text-amber-400" />
  return <FileText className="w-8 h-8 text-zinc-400" /> // Default (Word, Excel, etc.)
}

export default function DrivePage() {
  const [supabase] = useState(() => createClient())
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados para nuestros datos
  const [folders, setFolders] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [currentPath, setCurrentPath] = useState([{ id: null, name: "Mi Bóveda" }])

  useEffect(() => {
    async function fetchDriveData() {
      setIsLoading(true)
      
      try {
        // AQUÍ IRÁ LA LLAMADA REAL A SUPABASE
        // const { data: foldersData } = await supabase.from('drive_folders').select('*').eq('parent_id', currentPath[currentPath.length - 1].id)
        // const { data: filesData } = await supabase.from('drive_files').select('*').eq('folder_id', currentPath[currentPath.length - 1].id)

        // Datos simulados estructurados EXACTAMENTE como tu base de datos
        setTimeout(() => {
          setFolders([
            { id: "1", name: "Contratos de Compraventa", created_at: "2024-03-10T10:00:00Z" },
            { id: "2", name: "Identificaciones (INE/Pasaporte)", created_at: "2024-03-12T14:30:00Z" },
            { id: "3", name: "Plantillas Legales", created_at: "2024-03-15T09:15:00Z" },
          ])

          setFiles([
            { 
              id: "101", 
              name: "Contrato_ValleAlto_Firma.pdf", 
              mime_type: "application/pdf", 
              file_size_bytes: 2540000, // ~2.4 MB
              version: 2,
              download_count: 4,
              tags: ["Urgente", "Valle Alto"],
              created_at: "2024-03-20T16:20:00Z" 
            },
            { 
              id: "102", 
              name: "Render_Fachada_Principal.jpg", 
              mime_type: "image/jpeg", 
              file_size_bytes: 4800000, // ~4.5 MB
              version: 1,
              download_count: 12,
              tags: ["Marketing"],
              created_at: "2024-03-21T11:05:00Z" 
            },
            { 
              id: "103", 
              name: "Machote_Promesa_Compra.docx", 
              mime_type: "application/msword", 
              file_size_bytes: 850000, // ~830 KB
              version: 5,
              download_count: 45,
              is_template: true,
              tags: ["Plantilla"],
              created_at: "2024-03-22T08:45:00Z" 
            }
          ])
          setIsLoading(false)
        }, 800)

      } catch (error) {
        console.error("Error cargando archivos:", error)
      }
    }

    fetchDriveData()
  }, []) // En el futuro escucharemos el currentPath para recargar al entrar a carpetas

  return (
    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      
      {/* HEADER Y BUSCADOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100">
            Documentos<span className="text-flugzz-accent ml-1">.</span>
          </h1>
          
          {/* Miga de pan (Breadcrumbs) */}
          <div className="flex items-center text-sm mt-2 text-zinc-400">
            {currentPath.map((path, index) => (
              <div key={index} className="flex items-center">
                <span className="hover:text-zinc-100 cursor-pointer transition-colors font-medium">
                  {path.name}
                </span>
                {index < currentPath.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-1.5 text-zinc-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          {/* Buscador */}
          <div className="relative group flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-flugzz-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar archivos..." 
              className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-flugzz-accent/50 focus:ring-1 focus:ring-flugzz-accent/50 transition-all placeholder:text-zinc-600"
            />
          </div>
          
          {/* Acciones */}
          <button className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors" title="Nueva Carpeta">
            <FolderPlus className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-flugzz-accent text-zinc-950 font-semibold hover:bg-cyan-300 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <UploadCloud className="w-5 h-5" />
            <span className="hidden sm:inline">Subir archivo</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-flugzz-accent animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-10 space-y-8">
          
          {/* SECCIÓN DE CARPETAS */}
          {folders.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">Carpetas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <div 
                    key={folder.id} 
                    className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:border-flugzz-accent/40 hover:bg-zinc-800/40 cursor-pointer transition-all group"
                  >
                    <Folder className="w-8 h-8 text-zinc-500 group-hover:text-flugzz-accent transition-colors fill-zinc-900/50" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-zinc-200 text-sm font-medium truncate group-hover:text-white">{folder.name}</h3>
                      <p className="text-zinc-600 text-xs">Modificado reciéntemente</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECCIÓN DE ARCHIVOS */}
          {files.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">Archivos Recientes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex flex-col p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl group hover:border-zinc-700 transition-all relative"
                  >
                    {/* Botón de opciones (3 puntos) */}
                    <button className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-200 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Ícono grande según el MimeType */}
                    <div className="mb-4 p-3 bg-zinc-950/50 rounded-xl inline-block w-fit border border-zinc-800/50">
                      {getFileIcon(file.mime_type)}
                    </div>

                    {/* Info del archivo */}
                    <div className="flex-1 mb-4">
                      <h3 className="text-zinc-100 font-medium truncate pr-6 mb-1" title={file.name}>
                        {file.name}
                      </h3>
                      <div className="flex items-center text-xs text-zinc-500 gap-3">
                        <span>{formatBytes(file.file_size_bytes)}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span>v{file.version}</span>
                      </div>
                    </div>

                    {/* Footer de la tarjeta (Tags y Descargas) */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
                      <div className="flex gap-1.5 overflow-hidden">
                        {file.is_template && (
                          <span className="px-2 py-0.5 rounded-md bg-flugzz-accent/10 border border-flugzz-accent/20 text-[10px] font-medium text-flugzz-accent flex items-center shrink-0">
                            PLANTILLA
                          </span>
                        )}
                        {file.tags?.slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-medium text-zinc-300 flex items-center shrink-0 truncate max-w-[80px]">
                            <Tag className="w-2.5 h-2.5 mr-1 text-zinc-500" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center text-zinc-500 text-xs shrink-0 pl-2">
                        <Download className="w-3.5 h-3.5 mr-1" />
                        {file.download_count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  )
}
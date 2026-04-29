"use client"

import { useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone, 
  Filter,
  Download
} from "lucide-react"

// Datos de prueba (Luego los traeremos de la tabla 'contacts' de Supabase)
const initialContacts = [
  { id: 1, name: "Sofia Loren", email: "sofia@gmail.com", phone: "+52 55 1234 5678", status: "Nuevo", source: "WhatsApp" },
  { id: 2, name: "Alejandro Sanz", email: "sanz@empresa.com", phone: "+52 55 8765 4321", status: "Contactado", source: "Facebook" },
  { id: 3, name: "Mariana Rodriguez", email: "m.rodriguez@outlook.com", phone: "+52 44 2233 4455", status: "Visita", source: "Web" },
  { id: 4, name: "Julian Casablancas", email: "julian@strokes.com", phone: "+52 55 9988 7766", status: "Cierre", source: "Referido" },
]

export default function ContactosPage() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Contactos</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestiona y segmenta tu base de datos de clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Contacto
          </Button>
        </div>
      </div>

      {/* Barra de Herramientas (Filtros y Búsqueda) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-sm">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Buscar por nombre, correo o teléfono..." 
            className="pl-10 bg-zinc-950/50 border-zinc-800 focus-visible:ring-zinc-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 text-zinc-400">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
        </div>
      </div>

      {/* Tabla de Contactos */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium">Nombre</TableHead>
              <TableHead className="text-zinc-400 font-medium">Estado</TableHead>
              <TableHead className="text-zinc-400 font-medium">Contacto</TableHead>
              <TableHead className="text-zinc-400 font-medium">Origen</TableHead>
              <TableHead className="text-right text-zinc-400 font-medium">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialContacts.map((contact) => (
              <TableRow key={contact.id} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <TableCell className="font-medium text-zinc-200">
                  {contact.name}
                </TableCell>
                <TableCell>
                  <Badge className={`
                    ${contact.status === 'Nuevo' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                    ${contact.status === 'Contactado' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}
                    ${contact.status === 'Visita' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : ''}
                    ${contact.status === 'Cierre' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}
                    border font-normal
                  `}>
                    {contact.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-xs text-zinc-400">
                      <Mail className="w-3 h-3 mr-1.5" /> {contact.email}
                    </div>
                    <div className="flex items-center text-xs text-zinc-400">
                      <Phone className="w-3 h-3 mr-1.5" /> {contact.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm">
                  {contact.source}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
"use client"

import { motion } from "framer-motion"
import { MoreHorizontal, Plus, MessageCircle, Phone, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

// Datos de prueba basados en tu esquema de Supabase
const columns = [
  { id: "new", title: "Nuevo", color: "bg-blue-500" },
  { id: "contacted", title: "Contactado", color: "bg-amber-500" },
  { id: "visit", title: "Visita Agendada", color: "bg-purple-500" },
  { id: "proposal", title: "Propuesta", color: "bg-emerald-500" },
]

const leads = [
  { id: 1, name: "Carlos Jiménez", project: "Torre A - Depto 402", budget: "$3.5M", stage: "new", priority: "high" },
  { id: 2, name: "Ana Sofía", project: "Residencial Bosques", budget: "$2.1M", stage: "new", priority: "medium" },
  { id: 3, name: "Roberto Valdez", project: "Ciudad Maderas - Lote 12", budget: "$850k", stage: "contacted", priority: "high" },
  { id: 4, name: "Lucía Pérez", project: "Penthouse Loft", budget: "$7.2M", stage: "visit", priority: "low" },
]

export default function PipelinePage() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Pipeline de Ventas</h1>
          <p className="text-sm text-zinc-400 mt-1">Gestiona tus oportunidades activas.</p>
        </div>
        <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Lead
        </Button>
      </div>

      {/* Contenedor del Kanban con scroll horizontal en móvil */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {columns.map((column) => (
          <div key={column.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
            {/* Header de Columna */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                <h2 className="font-medium text-zinc-200">{column.title}</h2>
                <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                  {leads.filter(l => l.stage === column.id).length}
                </span>
              </div>
              <button className="text-zinc-500 hover:text-zinc-300">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Tarjetas */}
            <div className="flex-1 flex flex-col gap-3 p-2 rounded-xl bg-zinc-900/20 border border-zinc-800/30">
              {leads
                .filter((lead) => lead.stage === column.id)
                .map((lead) => (
                  <motion.div
                    key={lead.id}
                    layoutId={String(lead.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 shadow-sm cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        lead.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {lead.priority}
                      </span>
                      <p className="text-xs font-mono text-zinc-500">{lead.budget}</p>
                    </div>
                    
                    <h3 className="font-medium text-zinc-100">{lead.name}</h3>
                    <p className="text-xs text-zinc-500 mb-4">{lead.project}</p>

                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/50">
                      <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all ml-auto">
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              
              <button className="w-full py-2 border border-dashed border-zinc-800 rounded-xl text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 text-sm transition-all">
                + Añadir tarjeta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
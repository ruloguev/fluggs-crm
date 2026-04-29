"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { MoreHorizontal, Plus, MessageCircle, Phone, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

// Datos iniciales estructurados para Drag & Drop
const initialData = {
  new: {
    id: "new",
    title: "Nuevo",
    color: "bg-blue-500",
    items: [
      { id: "1", name: "Carlos Jiménez", project: "Torre A - Depto 402", budget: "$3.5M", priority: "high" },
      { id: "2", name: "Ana Sofía", project: "Residencial Bosques", budget: "$2.1M", priority: "medium" },
    ]
  },
  contacted: {
    id: "contacted",
    title: "Contactado",
    color: "bg-amber-500",
    items: [
      { id: "3", name: "Roberto Valdez", project: "Ciudad Maderas - Lote 12", budget: "$850k", priority: "high" },
    ]
  },
  visit: {
    id: "visit",
    title: "Visita Agendada",
    color: "bg-purple-500",
    items: [
      { id: "4", name: "Lucía Pérez", project: "Penthouse Loft", budget: "$7.2M", priority: "low" },
    ]
  },
  proposal: {
    id: "proposal",
    title: "Propuesta",
    color: "bg-emerald-500",
    items: []
  }
}

export default function PipelinePage() {
  // Estado para manejar las tarjetas
  const [columns, setColumns] = useState(initialData)
  
  // Evitar errores de hidratación en Next.js
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  // Función mágica que se ejecuta al soltar una tarjeta
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { source, destination } = result

    // Si soltó en la misma columna y misma posición, no hacemos nada
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceCol = columns[source.droppableId as keyof typeof columns]
    const destCol = columns[destination.droppableId as keyof typeof columns]

    const sourceItems = [...sourceCol.items]
    const destItems = [...destCol.items]

    // Quitamos la tarjeta de la columna original
    const [movedItem] = sourceItems.splice(source.index, 1)

    // Si es la misma columna, solo reordenamos
    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, movedItem)
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, items: sourceItems }
      })
    } else {
      // Si cambió de columna, la inyectamos en la nueva
      destItems.splice(destination.index, 0, movedItem)
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, items: sourceItems },
        [destination.droppableId]: { ...destCol, items: destItems }
      })
    }
  }

  if (!isMounted) return null // Previene destellos al cargar

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Pipeline de Ventas</h1>
          <p className="text-sm text-zinc-400 mt-1">Arrastra las tarjetas para actualizar su estado.</p>
        </div>
        <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Lead
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 scrollbar-hide">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full items-start">
            {Object.values(columns).map((col) => (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
                {/* Cabecera de la columna */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <h2 className="font-medium text-zinc-200">{col.title}</h2>
                    <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                      {col.items.length}
                    </span>
                  </div>
                  <button className="text-zinc-500 hover:text-zinc-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Zona donde se pueden soltar tarjetas */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 min-h-[150px] flex flex-col gap-3 p-2 rounded-xl border transition-colors ${
                        snapshot.isDraggingOver ? "bg-zinc-800/40 border-zinc-700/50" : "bg-zinc-900/20 border-zinc-800/30"
                      }`}
                    >
                      {col.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style }}
                              className={`p-4 rounded-xl border shadow-sm transition-shadow ${
                                snapshot.isDragging 
                                  ? "bg-zinc-800 border-zinc-600 shadow-xl shadow-black/50 z-50 scale-105" 
                                  : "bg-zinc-900 border-zinc-800/50 hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  item.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {item.priority}
                                </span>
                                <p className="text-xs font-mono text-zinc-500">{item.budget}</p>
                              </div>
                              
                              <h3 className="font-medium text-zinc-100">{item.name}</h3>
                              <p className="text-xs text-zinc-500 mb-4">{item.project}</p>

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
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      <button className="w-full py-2 mt-2 border border-dashed border-zinc-800 rounded-xl text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 text-sm transition-all">
                        + Añadir tarjeta
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
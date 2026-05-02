"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

type ChatMessage = { role: "user" | "assistant"; content: string }

export default function AsistentePage() {
  const { profile, loading: authLoading, company } = useAuth()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const companyId = profile?.company_id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  async function send() {
    const text = input.trim()
    if (!text || !companyId || sending) return

    setError(null)
    setInput("")
    const historyForRequest = messages
    setMessages((m) => [...m, { role: "user", content: text }])
    setSending(true)

    try {
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          companyId,
          history: historyForRequest.slice(-12),
        }),
      })
      const data = (await res.json()) as { answer?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? "No se pudo obtener respuesta")
        return
      }
      const answer = data.answer?.trim() || "Sin respuesta"
      setMessages((m) => [...m, { role: "assistant", content: answer }])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setSending(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando…
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-amber-200/90 text-sm max-w-lg">
        <p className="font-medium">Falta empresa asignada</p>
        <p className="text-zinc-500 mt-2">Completa el registro o asigna una compañía a tu perfil para usar el asistente.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[min(70vh,640px)] max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
          <Bot className="w-7 h-7 text-flugzz-accent" />
          Asistente IA
        </h1>
        {company?.name && (
          <p className="text-sm text-zinc-500 mt-1">{company.name}</p>
        )}
        <p className="text-sm text-zinc-500 mt-2">
          Preguntas sobre tu operación; las respuestas usan la base de conocimiento si está configurada.
        </p>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4 space-y-4">
        {messages.length === 0 && !sending && (
          <p className="text-sm text-zinc-600 text-center py-8">
            Escribe una pregunta para comenzar.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-300"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-4 py-2.5 flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Escribe tu mensaje…"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
          disabled={sending}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="self-end shrink-0 h-10 w-10 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

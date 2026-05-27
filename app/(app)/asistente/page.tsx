"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  Send, Loader2, AlertCircle, Sparkles, BookOpen, Copy, Check
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type ChatMessage = { role: "user" | "assistant"; content: string }

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user"
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-flugzz-accent/15 border border-flugzz-accent/25 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-3.5 h-3.5 text-flugzz-accent" />
        </div>
      )}
      <div className={`max-w-[88%] rounded-2xl ${
        isUser
          ? "bg-zinc-100 text-zinc-900 rounded-tr-sm"
          : "bg-zinc-900/60 border border-zinc-800/50 rounded-tl-sm"
      }`}>
        {!isUser && (
          <div className="flex justify-end px-3 pt-2">
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              title="Copiar respuesta"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        <div className={`px-4 py-3 text-sm leading-relaxed ${isUser ? "" : "markdown-content"}}`}>
          {isUser ? (
            msg.content
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 pl-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 pl-4 space-y-1 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="text-zinc-300">{children}</li>,
                strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-zinc-400">{children}</em>,
                h1: ({ children }) => <h1 className="text-xl font-bold text-zinc-100 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold text-zinc-100 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium text-zinc-100 mb-1">{children}</h3>,
                code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">{children}</code>,
                pre: ({ children }) => <pre className="p-3 rounded-lg bg-zinc-800/50 overflow-x-auto mb-2">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-flugzz-accent/30 pl-3 py-1 italic text-zinc-400 mb-2">{children}</blockquote>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  "¿Cuáles son los proyectos disponibles?",
  "¿Cuál es el precio por m²?",
  "¿Cómo manejo la objeción de precio?",
  "¿Qué incluye la escrituración?",
]

export default function AsistentePage() {
  const { profile, loading: authLoading } = useAuth()

  const [input, setInput]       = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  async function send() {
    const text = input.trim()
    if (!text || !profile?.company_id || sending) return
    setError(null)
    setInput("")
    const history = messages
    setMessages(m => [...m, { role: "user", content: text }])
    setSending(true)
    try {
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          companyId: profile.company_id,
          history: history.slice(-6),
        }),
      })
      const data = await res.json() as { answer?: string; error?: string }
      if (!res.ok) { setError(data.error ?? "Error al obtener respuesta"); return }
      setMessages(m => [...m, { role: "assistant", content: data.answer?.trim() || "Sin respuesta" }])
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setSending(false)
    }
  }

  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-flugzz-accent animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-5rem)] gap-4">

      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Asistente<span className="text-flugzz-accent">.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Respuestas basadas en los documentos de tu inmobiliaria.
        </p>
      </div>

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
                Pregúntame sobre proyectos, precios o argumentos de venta.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-left text-xs p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all leading-relaxed">
                  {q}
                </button>
              ))}
            </div>
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

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
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
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Loader2, Sparkles, Copy, Check, AlertCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type ChatMessage = { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS = [
  "¿Cómo agrego un lead?",
  "¿Cómo funciona Round Robin?",
  "¿Cómo conecto Google Calendar?",
  "¿Cómo configuro los roles?",
]

function Bubble({ msg }: { msg: ChatMessage; onCopy?: () => void }) {
  const isUser = msg.role === "user"
  const [copied, setCopied] = useState(false)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-cyan-400" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-xl text-sm leading-relaxed ${
        isUser ? "bg-zinc-700 text-zinc-100 rounded-tr-sm px-3 py-2" : "bg-zinc-800/60 border border-zinc-700/50 rounded-tl-sm"
      }`}>
        {!isUser && (
          <div className="flex justify-end px-2 pt-1.5">
            <button onClick={copyToClipboard} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors" title="Copiar">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
        <div className={`px-2.5 pb-2.5 ${isUser ? "" : "markdown-content"}`}>
          {isUser ? msg.content : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-1.5 last:mb-0 text-zinc-300">{children}</p>,
                ul: ({ children }) => <ul className="mb-1.5 pl-3 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-1.5 pl-3 space-y-0.5 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="text-zinc-400 text-xs">{children}</li>,
                strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>,
                code: ({ children }) => <code className="px-1 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[11px]">{children}</code>,
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

export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || sending) return
    setError(null)
    setInput("")
    const history = messages
    setMessages(m => [...m, { role: "user", content: msg }])
    setSending(true)
    try {
      const res = await fetch("/api/ia/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: history.slice(-6) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Error"); return }
      setMessages(m => [...m, { role: "assistant", content: data.answer?.trim() || "Sin respuesta" }])
    } catch {
      setError("Error de conexión.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Bubble button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-cyan-500 text-zinc-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:bg-cyan-400 transition-all flex items-center justify-center"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Popover */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-100">Soporte Flugzz</p>
              <p className="text-[10px] text-zinc-500">Respondo en segundos</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-zinc-300 text-sm font-medium">¿Necesitas ayuda?</p>
                  <p className="text-zinc-600 text-xs mt-1">Pregunta sobre cómo usar Flugzz.</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full max-w-xs">
                  {QUICK_PROMPTS.map(q => (
                    <button key={q} onClick={() => { setInput(q); send(q) }}
                      className="text-left text-[11px] p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-all leading-relaxed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}

            {sending && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-zinc-800/60 border border-zinc-700/50">
                  <div className="flex gap-1 items-center h-3">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
                <AlertCircle className="w-3 h-3 shrink-0" />{error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 flex gap-2 p-3 border-t border-zinc-800">
            <div className="flex-1 flex items-end gap-2 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 focus-within:border-zinc-700 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Escribe tu pregunta..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none resize-none max-h-20"
              />
            </div>
            <button onClick={() => send()} disabled={!input.trim() || sending}
              className="p-2 rounded-xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 disabled:opacity-30 transition-all shrink-0 self-end">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

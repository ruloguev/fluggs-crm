import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

function getSupabaseAdmin() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    if (!geminiKey)
      return NextResponse.json({ error: "Falta GEMINI_API_KEY." }, { status: 503 })

    const supabase = getSupabaseAdmin()
    if (!supabase)
      return NextResponse.json({ error: "Faltan credenciales de Supabase." }, { status: 503 })

    const { message, companyId, history = [] } = await req.json()
    if (!message || !companyId)
      return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 })

    // ── Búsqueda full-text en Postgres — sin embeddings ──────────
    // Extrae las palabras clave del mensaje para buscar en los chunks
    let contextText = ""
    try {
      // Búsqueda con ilike en múltiples palabras clave
      const keywords = message
        .toLowerCase()
        .replace(/[¿?¡!.,;:]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 6)

      // Buscar chunks que contengan cualquiera de las palabras clave
      let query = supabase
        .from("knowledge_chunks")
        .select(`
          id, content, metadata,
          knowledge_documents!inner(title, status, is_active)
        `)
        .eq("company_id", companyId)
        .eq("knowledge_documents.is_active", true)
        .eq("knowledge_documents.status", "ready")
        .limit(8)

      // Buscar por la frase completa primero
      const { data: phraseMatches } = await supabase
        .from("knowledge_chunks")
        .select("id, content, metadata, document_id")
        .eq("company_id", companyId)
        .ilike("content", `%${message.slice(0, 50)}%`)
        .limit(4)

      // Buscar por palabras clave individuales
      const { data: keywordMatches } = await supabase
        .from("knowledge_chunks")
        .select("id, content, metadata, document_id")
        .eq("company_id", companyId)
        .or(keywords.map((k: string) => `content.ilike.%${k}%`).join(","))
        .limit(8)

      // Combinar resultados deduplicando por id
      const seen = new Set<string>()
      const allChunks = [...(phraseMatches ?? []), ...(keywordMatches ?? [])]
        .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
        .slice(0, 8)

      if (allChunks.length > 0) {
        contextText = allChunks
          .map((c, i) => {
            const title = (c.metadata as any)?.document_title ?? "Documento"
            return `[Fuente ${i + 1} — ${title}]\n${c.content}`
          })
          .join("\n\n---\n\n")
      }

      // Si no hay matches específicos, traer los primeros chunks disponibles
      if (allChunks.length === 0) {
        const { data: fallbackChunks } = await supabase
          .from("knowledge_chunks")
          .select("id, content, metadata")
          .eq("company_id", companyId)
          .order("chunk_index")
          .limit(5)

        if (fallbackChunks && fallbackChunks.length > 0) {
          contextText = fallbackChunks
            .map((c, i) => {
              const title = (c.metadata as any)?.document_title ?? "Documento"
              return `[Fuente ${i + 1} — ${title}]\n${c.content}`
            })
            .join("\n\n---\n\n")
        }
      }
    } catch (searchErr) {
      console.error("[chat] Error en búsqueda:", searchErr)
    }

    // ── System prompt ─────────────────────────────────────────────
    const systemPrompt = contextText
      ? `Eres el asistente de ventas interno de esta inmobiliaria. Tu única fuente de información es la base de conocimiento que aparece abajo. Responde de forma directa y profesional. Si la respuesta no está en los documentos, di exactamente: "No tengo esa información. Consulta con tu director." Cita siempre entre paréntesis de qué fuente viene la información. Responde en español.

BASE DE CONOCIMIENTO:
${contextText}`
      : `Eres el asistente de ventas de esta inmobiliaria. Aún no hay documentos disponibles en la base de conocimiento, o el administrador no ha cargado ninguno todavía. Puedes ayudar con preguntas generales de ventas inmobiliarias. Responde en español.`

    // ── Llamada a Gemini 2.5 Flash ────────────────────────────────
    const formattedHistory = history.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

    formattedHistory.push({ role: "user", parts: [{ text: message }] })

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: formattedHistory,
        }),
      }
    )

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text()
      console.error("[chat] Gemini error:", errorText)
      throw new Error(`Gemini ${geminiRes.status}: ${errorText.slice(0, 200)}`)
    }

    const geminiData = await geminiRes.json()
    const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sin respuesta"

    return NextResponse.json({ answer })

  } catch (e: unknown) {
    console.error("[chat] Fatal:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
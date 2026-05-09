import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/server-env"

export const runtime = "nodejs"

function getSupabaseAdmin() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificamos la llave de Gemini (con .trim() para evitar espacios accidentales)
    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en las variables de entorno." },
        { status: 503 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: "Faltan las credenciales de Supabase en el servidor." },
        { status: 503 }
      )
    }

    const { message, companyId, history = [] } = await req.json()
    if (!message || !companyId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
    }

    let contextText = ""

    // 2. Embedding con Gemini (igual que el ingest — mismo modelo, mismas dimensiones)
    try {
      // Llamada directa a la API v1 de Google (el SDK usa v1beta que no soporta text-embedding-004)
      const embRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { parts: [{ text: message }] } }),
        }
      )
      if (!embRes.ok) throw new Error(`Gemini API ${embRes.status}: ${await embRes.text()}`)
      const embData = await embRes.json()
      const embeddingValues: number[] = embData.embedding.values
      const embeddingString = `[${embeddingValues.join(",")}]`

      const { data: chunks, error: rpcError } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: embeddingString,
        match_threshold: 0.5,   // umbral más bajo para mayor recall
        match_count: 6,
        p_company_id: companyId,
      })

      if (rpcError) console.error("match_knowledge_chunks error:", rpcError)

      if (chunks && chunks.length > 0) {
        contextText = chunks
          .map((c: { document_title?: string; content: string }, i: number) =>
            `[Fuente ${i + 1} — ${c.document_title ?? "Documento"}]\n${c.content}`
          )
          .join("\n\n---\n\n")
      }
    } catch (embErr) {
      console.error("Error generando embedding para búsqueda:", embErr)
      // Continuamos sin contexto — Gemini responderá en modo general
    }

    // 3. Preparamos las instrucciones del sistema
    const systemPrompt = contextText
      ? `Eres el asistente de ventas interno de esta inmobiliaria. Tu única fuente de información es la base de conocimiento abajo. Responde de forma directa y profesional. Si la respuesta no está en los documentos, di exactamente: "No tengo esa información. Consulta con tu director." Cita siempre la fuente entre paréntesis al final. Responde en español.\n\nBASE DE CONOCIMIENTO:\n${contextText}`
      : `Eres el asistente de ventas de esta inmobiliaria. Aún no hay documentos cargados en la base de conocimiento. Indica que el administrador debe cargar documentos en Ajustes → Asistente IA. Puedes ayudar con preguntas generales de ventas inmobiliarias. Responde en español.`

    // 4. INTEGRACIÓN DIRECTA CON GEMINI (Modelo Moderno 2.5 Flash)
    const formattedHistory = history.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

    formattedHistory.push({
      role: "user",
      parts: [{ text: message }]
    })

    // LA MAGIA: Apuntamos exactamente al modelo que tu cuenta SÍ tiene habilitado
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: formattedHistory
      })
    })

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text()
      console.error("Error devuelto por la API de Google:", errorText)
      throw new Error(`Fallo de conexión con IA: ${geminiRes.status}`)
    }

    const geminiData = await geminiRes.json()
    const answer = geminiData.candidates[0].content.parts[0].text

    return NextResponse.json({ answer })
    
  } catch (e: unknown) {
    console.error("Error en el Webhook de IA:", e)
    const message = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"
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
    // 1. Verificamos la llave de Gemini (Asegúrate de tener GEMINI_API_KEY en tu .env)
    const geminiKey = process.env.GEMINI_API_KEY
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
    if (!message || !companyId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

    let contextText = ""

    // 2. Mantenemos OpenAI para los Embeddings (Para no romper tu base de datos vectorial)
    if (process.env.OPENAI_API_KEY) {
      const embRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: message, model: "text-embedding-3-small" }),
      })
      
      if (embRes.ok) {
        const embData = await embRes.json()
        const embedding = embData.data[0].embedding
        const { data: chunks } = await supabase.rpc("match_knowledge_chunks", {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: 5,
          p_company_id: companyId,
        })
        
        if (chunks?.length > 0) {
          contextText = chunks
            .map((c: { document_title?: string; content: string }, i: number) =>
                `[Fuente ${i + 1} — ${c.document_title}]\n${c.content}`
            )
            .join("\n\n---\n\n")
        }
      }
    }

    // 3. Preparamos las instrucciones del sistema
    const systemPrompt = contextText
      ? `Eres el asistente de ventas interno de esta inmobiliaria. Tu única fuente de información es la base de conocimiento abajo. Responde de forma directa y profesional. Si la respuesta no está en los documentos, di exactamente: "No tengo esa información. Consulta con tu director." Cita siempre la fuente entre paréntesis al final. Responde en español.

BASE DE CONOCIMIENTO:
${contextText}`
      : `Eres el asistente de ventas de esta inmobiliaria. Aún no hay documentos cargados en la base de conocimiento. Indica que el administrador debe cargar documentos en Ajustes → Asistente IA. Puedes ayudar con preguntas generales de ventas inmobiliarias. Responde en español.`

    // 4. INTEGRACIÓN CON GEMINI
    const genAI = new GoogleGenerativeAI(geminiKey)
    
    // Usamos Flash porque es brutalmente rápido e ideal para RAG
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt // Le pasamos el contexto como instrucción base
    })

    // Mapeamos el historial de tu frontend al formato que usa Gemini
    const formattedHistory = history.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user", // Cambiamos 'assistant' por 'model'
      parts: [{ text: m.content }],
    }))

    // Agregamos el nuevo mensaje del usuario al final
    formattedHistory.push({
      role: "user",
      parts: [{ text: message }]
    })

    // 5. Ejecutamos la generación
    const result = await model.generateContent({
      contents: formattedHistory
    })

    const answer = result.response.text()

    return NextResponse.json({ answer })
    
  } catch (e: unknown) {
    console.error("Error en el Webhook de IA:", e)
    const message = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getAnthropicApiKey,
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
    const anthropicKey = getAnthropicApiKey()
    if (!anthropicKey) {
      return NextResponse.json(
        {
          error:
            "El servidor no recibe una clave de Anthropic válida. En Vercel: revisa ANTHROPIC_API_KEY en Environment Variables para «Production» (o el entorno que uses), vuelve a desplegar, y evita comillas en el valor.",
        },
        { status: 503 },
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
        },
        { status: 503 },
      )
    }

    const { message, companyId, history = [] } = await req.json()
    if (!message || !companyId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

    let contextText = ""

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
            .map(
              (c: { document_title?: string; content: string }, i: number) =>
                `[Fuente ${i + 1} — ${c.document_title}]\n${c.content}`,
            )
            .join("\n\n---\n\n")
        }
      }
    }

    const systemPrompt = contextText
      ? `Eres el asistente de ventas interno de esta inmobiliaria. Tu única fuente de información es la base de conocimiento abajo. Responde de forma directa y profesional. Si la respuesta no está en los documentos, di exactamente: "No tengo esa información. Consulta con tu director." Cita siempre la fuente entre paréntesis al final. Responde en español.

BASE DE CONOCIMIENTO:
${contextText}`
      : `Eres el asistente de ventas de esta inmobiliaria. Aún no hay documentos cargados en la base de conocimiento. Indica que el administrador debe cargar documentos en Ajustes → Asistente IA. Puedes ayudar con preguntas generales de ventas inmobiliarias. Responde en español.`

    const model =
      process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514"

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.slice(-6).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content: message },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: (err as { error?: { message?: string } }).error?.message ?? "Error de IA" },
        { status: 500 },
      )
    }

    const claudeData = await claudeRes.json()
    return NextResponse.json({
      answer: claudeData.content[0]?.text ?? "Sin respuesta",
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

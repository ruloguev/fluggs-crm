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

function chunkText(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + size))
    start += size - overlap
  }
  return chunks
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  if (!supabase)
    return NextResponse.json({ error: "Faltan variables de Supabase." }, { status: 503 })

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey)
    return NextResponse.json({ error: "Falta GEMINI_API_KEY." }, { status: 503 })

  let documentId = ""

  try {
    const body = await req.json()
    documentId = body.documentId
    const text: string = body.text
    const companyId: string = body.companyId

    if (!documentId || !text || !companyId)
      return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 })

    const { data: doc } = await supabase
      .from("knowledge_documents")
      .select("title")
      .eq("id", documentId)
      .single()

    const docTitle = doc?.title ?? "Sin título"

    await supabase.from("knowledge_chunks").delete().eq("document_id", documentId)

    const chunks = chunkText(text)
    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim()
      if (!chunk) continue

      let embeddingValues: number[]
      try {
        // SDK: apiVersion en getGenerativeModel (requestOptions), no en el constructor
        const { GoogleGenerativeAI } = await import("@google/generative-ai")
        const genAI = new GoogleGenerativeAI(geminiKey)
        const embModel = genAI.getGenerativeModel(
          { model: "text-embedding-004" },
          { apiVersion: "v1" },
        )
        const result = await embModel.embedContent(chunk)
        embeddingValues = result.embedding.values
      } catch (embErr) {
        const msg = embErr instanceof Error ? embErr.message : String(embErr)
        console.error(`[ingest] Chunk ${i} embedding error:`, msg)
        errors.push(`chunk ${i}: ${msg}`)
        continue
      }

      // Enviar como array JS directo — PostgREST lo convierte a vector
      const { error: insertError } = await supabase
        .from("knowledge_chunks")
        .insert({
          document_id: documentId,
          company_id: companyId,
          content: chunk,
          embedding: embeddingValues,
          chunk_index: i,
          metadata: { document_title: docTitle },
        })

      if (insertError) {
        console.error(`[ingest] Chunk ${i} insert error:`, insertError)
        errors.push(`chunk ${i}: ${insertError.message}`)
        continue
      }

      inserted++
    }

    const finalStatus = inserted > 0 ? "ready" : "error"
    await supabase
      .from("knowledge_documents")
      .update({ status: finalStatus })
      .eq("id", documentId)

    console.log(`[ingest] "${docTitle}": ${inserted}/${chunks.length} chunks OK`)

    if (inserted === 0) {
      return NextResponse.json({
        ok: false, chunks: 0,
        error: `0 chunks insertados. Primer error: ${errors[0] ?? "desconocido"}`,
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true, chunks: inserted })

  } catch (e: unknown) {
    console.error("[ingest] Fatal:", e)
    if (documentId) {
      await getSupabaseAdmin()
        ?.from("knowledge_documents")
        .update({ status: "error" })
        .eq("id", documentId)
    }
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Error desconocido",
    }, { status: 500 })
  }
}
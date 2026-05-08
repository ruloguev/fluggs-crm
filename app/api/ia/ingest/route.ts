import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/server-env"

export const runtime = "nodejs"

function getSupabaseAdmin() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceRoleKey()
  if (!url || !key) return null
  return createClient(url, key)
}

// Función ninja para picar el texto con "overlap" (traslape) para no perder contexto
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
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: "Faltan variables de Supabase en el servidor." },
        { status: 503 },
      )
    }

    // Verificamos nuestra llave de Gemini
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY en las variables de entorno." },
        { status: 503 }
      )
    }

    const { documentId, text, companyId } = await req.json()
    if (!documentId || !text || !companyId)
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

    const { data: doc } = await supabase
      .from("knowledge_documents")
      .select("title")
      .eq("id", documentId)
      .single()

    const chunks = chunkText(text)

    // Borramos versiones viejas del documento para evitar duplicados
    await supabase.from("knowledge_chunks").delete().eq("document_id", documentId)

    // INICIALIZAMOS GEMINI PARA EMBEDDINGS
    const genAI = new GoogleGenerativeAI(geminiKey)
    // Usamos el modelo específico para crear vectores matemáticos
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })

    let inserted = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim()
      if (!chunk) continue

      try {
        // Llamada nativa a la API de Google para crear el vector (768 dimensiones)
        const result = await embeddingModel.embedContent(chunk)
        const embeddingValues = result.embedding.values

        // Guardamos en Supabase
        // pgvector espera el embedding como string "[v1,v2,...]"
        const embeddingString = `[${embeddingValues.join(",")}]`

        await supabase.from("knowledge_chunks").insert({
          document_id: documentId,
          company_id: companyId,
          content: chunk,
          embedding: embeddingString,
          chunk_index: i,
          metadata: { document_title: doc?.title ?? "Sin título" },
        })
        inserted++
      } catch (err) {
        console.error(`Error procesando el chunk ${i}:`, err)
        // Si un chunk falla, continuamos con el siguiente
        continue 
      }
    }

    // Marcamos el documento como listo en la base de datos
    await supabase.from("knowledge_documents").update({ status: "ready" }).eq("id", documentId)
    
    return NextResponse.json({ ok: true, chunks: inserted })
    
  } catch (e: unknown) {
    console.error("Error fatal en el Webhook de Ingesta:", e)
    const message = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
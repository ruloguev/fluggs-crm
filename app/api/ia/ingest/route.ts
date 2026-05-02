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
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: "Faltan variables de Supabase en el servidor." },
        { status: 503 },
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

    if (!process.env.OPENAI_API_KEY) {
      await supabase.from("knowledge_documents").update({ status: "ready" }).eq("id", documentId)
      return NextResponse.json({
        ok: true,
        chunks: 0,
        note: "Sin embeddings — agrega OPENAI_API_KEY",
      })
    }

    await supabase.from("knowledge_chunks").delete().eq("document_id", documentId)

    let inserted = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim()
      if (!chunk) continue

      const embRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: chunk, model: "text-embedding-3-small" }),
      })
      if (!embRes.ok) continue

      const embData = await embRes.json()
      await supabase.from("knowledge_chunks").insert({
        document_id: documentId,
        company_id: companyId,
        content: chunk,
        embedding: embData.data[0].embedding,
        chunk_index: i,
        metadata: { document_title: doc?.title ?? "Sin título" },
      })
      inserted++
    }

    await supabase.from("knowledge_documents").update({ status: "ready" }).eq("id", documentId)
    return NextResponse.json({ ok: true, chunks: inserted })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

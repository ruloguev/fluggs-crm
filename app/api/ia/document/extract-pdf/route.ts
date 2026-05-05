import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 })
    }

    const MAX_MB = 20
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El PDF supera los ${MAX_MB} MB.` },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Lazy import pdf-parse to avoid issues with Next.js bundler
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse")
    const parsed = await pdfParse(buffer)

    const text = parsed.text?.trim()

    if (!text || text.length < 10) {
      return NextResponse.json(
        {
          error:
            "No se pudo extraer texto del PDF. Es posible que sea un PDF escaneado (imagen). " +
            "Intenta con un PDF de texto nativo o convierte el contenido a .txt.",
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      text,
      pages: parsed.numpages,
      charCount: text.length,
    })
  } catch (e: unknown) {
    console.error("extract-pdf error:", e)
    const msg = e instanceof Error ? e.message : "Error al procesar el PDF"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

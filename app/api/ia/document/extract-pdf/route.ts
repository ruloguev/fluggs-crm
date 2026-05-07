import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// ── Polyfills para pdf-parse / pdfjs-dist en Node.js ──────────
// pdfjs usa DOMMatrix, Path2D y otros APIs del browser que no
// existen en el entorno de servidor de Next.js.
function applyPolyfills() {
  const g = globalThis as Record<string, unknown>

  if (!g.DOMMatrix) {
    class DOMMatrixPolyfill {
      a=1; b=0; c=0; d=1; e=0; f=0
      m11=1; m12=0; m13=0; m14=0
      m21=0; m22=1; m23=0; m24=0
      m31=0; m32=0; m33=1; m34=0
      m41=0; m42=0; m43=0; m44=1
      is2D=true; isIdentity=true
      static fromMatrix() { return new DOMMatrixPolyfill() }
      static fromFloat32Array() { return new DOMMatrixPolyfill() }
      static fromFloat64Array() { return new DOMMatrixPolyfill() }
      translate() { return new DOMMatrixPolyfill() }
      scale()     { return new DOMMatrixPolyfill() }
      rotate()    { return new DOMMatrixPolyfill() }
      multiply()  { return new DOMMatrixPolyfill() }
      inverse()   { return new DOMMatrixPolyfill() }
      toFloat32Array() { return new Float32Array(16) }
      toFloat64Array() { return new Float64Array(16) }
    }
    g.DOMMatrix = DOMMatrixPolyfill
  }

  if (!g.Path2D) {
    g.Path2D = class Path2D {
      constructor(_?: unknown) {}
      addPath() {}; arc() {}; arcTo() {}; bezierCurveTo() {}
      closePath() {}; ellipse() {}; lineTo() {}; moveTo() {}
      quadraticCurveTo() {}; rect() {}
    }
  }

  if (!g.ImageData) {
    g.ImageData = class ImageData {
      data: Uint8ClampedArray; width: number; height: number
      constructor(w: number | Uint8ClampedArray, h: number) {
        if (typeof w === "number") {
          this.width = w; this.height = h
          this.data = new Uint8ClampedArray(w * h * 4)
        } else {
          this.data = w; this.width = h; this.height = w.length / h / 4
        }
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file)
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 })

    if (!file.name.toLowerCase().endsWith(".pdf"))
      return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 })

    const MAX_MB = 20
    if (file.size > MAX_MB * 1024 * 1024)
      return NextResponse.json({ error: `El PDF supera los ${MAX_MB} MB.` }, { status: 400 })

    // Aplicar polyfills antes de cargar pdf-parse
    applyPolyfills()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Opciones que reducen la dependencia en APIs del browser
    const options = {
      pagerender: undefined,   // desactiva el renderer de canvas
      max: 0,                  // sin límite de páginas
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse")
    const parsed = await pdfParse(buffer, options)

    const text = parsed.text?.trim()

    if (!text || text.length < 10)
      return NextResponse.json({
        error:
          "No se pudo extraer texto del PDF. " +
          "Es posible que sea un PDF escaneado (solo imágenes). " +
          "Intenta con un PDF de texto nativo o convierte el contenido a .txt.",
      }, { status: 422 })

    return NextResponse.json({
      text,
      pages: parsed.numpages,
      charCount: text.length,
    })
  } catch (e: unknown) {
    console.error("extract-pdf error:", e)

    // Mensaje específico para DOMMatrix u otros errores de polyfill
    const msg = e instanceof Error ? e.message : "Error al procesar el PDF"
    const isPolyfillError = msg.includes("DOMMatrix") || msg.includes("Path2D") || msg.includes("canvas")

    return NextResponse.json({
      error: isPolyfillError
        ? "Error de compatibilidad al procesar el PDF. Intenta convertir el contenido a formato .txt."
        : msg,
    }, { status: 500 })
  }
}

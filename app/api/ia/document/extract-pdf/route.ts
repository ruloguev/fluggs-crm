import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Extraemos el contenido
    const { text, totalPages } = await extractText(buffer);

    // 2. SOLUCIÓN AL ERROR DE TIPO:
    // Unimos el array de páginas en un solo string antes de limpiar
    const combinedText = Array.isArray(text) ? text.join(" ") : (text || "");
    
    // 3. Ahora 'combinedText' es un string, por lo que 'replace' funcionará perfecto
    const cleanedText = combinedText.replace(/\s+/g, ' ').trim();

    return NextResponse.json({ 
      success: true, 
      text: cleanedText,
      numPages: totalPages 
    });

  } catch (error: any) {
    console.error("LOG DE ERROR EN VERCEL:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error procesando el PDF", 
      details: error.message 
    }, { status: 500 });
  }
}
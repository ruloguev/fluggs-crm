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

    // 1. Convertimos el archivo a ArrayBuffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. EXTRAEMOS EL TEXTO (unpdf es magia pura para Vercel)
    const { text, totalPages } = await extractText(buffer);

    // 3. Limpiamos un poco el texto para quitar espacios raros
    const cleanedText = text.replace(/\s+/g, ' ').trim();

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
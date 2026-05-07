import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    // Importamos dinámicamente el motor de PDF de Mozilla
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Configuración para que no busque archivos externos
    const loadingTask = pdfjs.getDocument({
      data: buffer,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    // Extraemos el texto página por página
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore
        .map((item) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return NextResponse.json({ 
      success: true, 
      text: fullText,
      numPages: pdf.numPages 
    });

  } catch (error: any) {
    console.error("LOG CRÍTICO VERCEL:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error procesando PDF", 
      details: error.message 
    }, { status: 500 });
  }
}
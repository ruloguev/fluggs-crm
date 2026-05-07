import { NextRequest, NextResponse } from 'next/server';
const pdf = require('pdf-parse');
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    // Convertimos el archivo a un Buffer que Node pueda entender
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extraemos el texto de forma directa y limpia
    const data = await pdf(buffer);

    return NextResponse.json({ 
      text: data.text,
      numPages: data.numpages,
      info: data.info 
    });

  } catch (error: any) {
    console.error("Error en la extracción:", error);
    return NextResponse.json({ error: "Error al procesar el PDF", details: error.message }, { status: 500 });
  }
}
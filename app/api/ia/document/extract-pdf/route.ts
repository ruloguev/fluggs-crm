import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se recibió el archivo" }, { status: 400 });
    }

    // 1. IMPORTACIÓN ESTÁNDAR
    // Usamos el nombre base de la librería. 
    // El @ts-ignore es para que TypeScript no se queje de los tipos.
    // @ts-ignore
    const pdf = require('pdf-parse');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. EXTRACCIÓN
    // pdf-parse devuelve una promesa, por eso usamos await.
    const data = await pdf(buffer);

    return NextResponse.json({ 
      success: true, 
      text: data.text,
      numPages: data.numpages 
    });

  } catch (error: any) {
    console.error("ERROR CRÍTICO EN VERCEL:", error);
    
    return NextResponse.json({ 
      success: false,
      error: "Error interno en el servidor",
      details: error.message 
    }, { status: 500 });
  }
}
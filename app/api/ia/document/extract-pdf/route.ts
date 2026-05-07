import { NextRequest, NextResponse } from 'next/server';

// 1. Forzamos que la ruta sea dinámica para que Vercel no intente 
// pre-generarla estáticamente durante el despliegue.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    // 2. CARGA BAJO DEMANDA: Solo cargamos pdf-parse cuando la función se ejecuta.
    // Esto es CRUCIAL para saltarse los errores de compilación de Vercel.
    // @ts-ignore
    const pdf = require('pdf-parse/lib/pdf-parse.js');

    // Convertimos el archivo a un formato que el servidor pueda procesar
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Extracción de texto
    const data = await pdf(buffer);

    // Retornamos el éxito
    return NextResponse.json({ 
      success: true,
      text: data.text,
      numPages: data.numpages,
      info: data.info 
    });

  } catch (error: any) {
    console.error("Error en la API de PDF:", error);
    return NextResponse.json({ 
      error: "Error al procesar el documento", 
      details: error.message 
    }, { status: 500 });
  }
}
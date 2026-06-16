import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Demo - Flugzz CRM",
  description: "Video demo de Flugzz CRM - Gestión comercial inteligente",
  openGraph: { title: "Demo - Flugzz CRM", description: "Video demo de Flugzz CRM" },
}

export default function DemoPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tighter text-white">
            Flugzz<span className="text-[#22D3EE]">.</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Video demo de la plataforma</p>
        </div>
        <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl ring-1 ring-white/10">
          <iframe
            src="https://www.youtube.com/embed/7EVCHMGKsKk"
            title="Flugzz CRM Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <p className="text-zinc-600 text-sm text-center mt-6">
          <a href="/login" className="text-[#22D3EE] hover:underline">Iniciar sesión</a>
          <span className="mx-3">·</span>
          <a href="/signup" className="text-[#22D3EE] hover:underline">Crear cuenta</a>
        </p>
      </div>
    </div>
  )
}

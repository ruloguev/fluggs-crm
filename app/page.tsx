"use client"

import Link from "next/link"
import { ArrowRight, Play, ShieldCheck, Zap, Activity } from "lucide-react"

export default function LandingPageMockup() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 relative overflow-hidden font-sans">
      
      {/* EL PANAL DE FONDO (Reutilizamos tu animación) */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'56\' height=\'98\' viewBox=\'0 0 28 49\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg stroke=\'%23ffffff\' stroke-width=\'1\' fill=\'none\' fill-rule=\'evenodd\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z\'/%3E%3C/g%3E%3C/svg%3E')] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]"></div>
      </div>

      {/* NAVBAR MINIMALISTA */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="font-semibold text-xl tracking-tighter text-zinc-100 flex items-baseline">
          Flugzz<span style={{ color: '#22D3EE' }} className="ml-0.5">.</span>
        </div>
        <div className="flex gap-6 items-center">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 transition-colors">
            Comenzar
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 flex flex-col items-center text-center pt-24 pb-20 px-4 max-w-7xl mx-auto">
        
        {/* Badge (Etiqueta superior) */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Zap className="w-3.5 h-3.5" />
          Flugzz 2.0 ya está disponible
        </div>

        {/* Título Principal */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 text-balance">
          El ecosistema operativo para el Real Estate del <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">futuro.</span>
        </h1>

        {/* Subtítulo */}
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 text-balance">
          Centraliza tus leads, automatiza tus cierres y domina tu pipeline desde una bóveda de cristal. Diseñado para inmobiliarias que no juegan a empatar.
        </p>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          {/* Botón Primario */}
          <Link href="/login" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-flugzz-accent text-zinc-950 font-bold hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] group">
            Iniciar Ecosistema
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          {/* Botón Secundario */}
          <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-white font-medium hover:bg-zinc-800 transition-all backdrop-blur-sm group">
            <Play className="w-5 h-5 text-zinc-400 group-hover:text-flugzz-accent transition-colors" />
            Ver recorrido guiado
          </button>
        </div>

        {/* MOCKUP 3D DEL DASHBOARD (El "Gancho") */}
        <div className="w-full mt-24 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 hidden md:block">
          {/* Degradado para desvanecer la parte inferior */}
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#09090b] to-transparent z-20"></div>
          
          {/* El contenedor con perspectiva 3D */}
          <div className="relative mx-auto w-full max-w-5xl" style={{ perspective: '2000px' }}>
            <div className="rounded-2xl border border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl shadow-2xl overflow-hidden transform rotateX-[12deg] scale-[0.95] hover:rotateX-0 hover:scale-100 transition-all duration-700 ease-out p-1">
              
              {/* Barra superior de la "ventana" de Mac */}
              <div className="h-10 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              </div>

              {/* Contenido Falso del Dashboard para visualización */}
              <div className="p-6 bg-[#09090b] grid grid-cols-4 gap-4 opacity-80 pointer-events-none">
                {/* Headers falsos */}
                <div className="col-span-4 flex justify-between items-end mb-4">
                  <div className="h-8 w-48 bg-zinc-800/50 rounded-lg"></div>
                  <div className="h-6 w-24 bg-zinc-800/50 rounded-full"></div>
                </div>
                {/* Tarjetas KPI */}
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/80"></div>
                    <div>
                      <div className="h-3 w-16 bg-zinc-700/50 rounded mb-2"></div>
                      <div className="h-5 w-24 bg-zinc-200/80 rounded"></div>
                    </div>
                  </div>
                ))}
                {/* Gráfica principal grande */}
                <div className="col-span-3 h-64 rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-6 flex flex-col justify-end">
                   <div className="flex gap-2 h-32 items-end">
                     {[40, 60, 30, 80, 50, 90, 70].map((h, j) => (
                        <div key={j} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-zinc-800 to-flugzz-accent/40 rounded-t-sm"></div>
                     ))}
                   </div>
                </div>
                {/* Panel lateral derecho */}
                <div className="col-span-1 h-64 rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 flex flex-col gap-3">
                   {[1, 2, 3].map((k) => (
                     <div key={k} className="flex gap-3 items-center">
                        <div className="w-6 h-6 rounded-full bg-zinc-800"></div>
                        <div className="flex-1">
                          <div className="h-2 w-full bg-zinc-700/50 rounded mb-1.5"></div>
                          <div className="h-2 w-2/3 bg-zinc-800 rounded"></div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
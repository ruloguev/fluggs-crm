"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Play, Zap, BarChart3, Kanban, Sparkles, ThumbsUp, Shuffle, CalendarClock, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { PLAN_LIMITS, PLAN_FEATURES, type PlanId } from "@/lib/stripe-plans"

const PRICING_ORDER: PlanId[] = ["agente_pro", "fundacion", "expansion", "imperio"]

const FEATURES = [
  {
    icon: BarChart3,
    title: "Métricas y desempeño",
    desc: "Visualiza tus números y los de tu equipo de venta en tiempo real. Si lideras un equipo, sabes exactamente quién avanza y quién se queda atrás.",
    accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    icon: Kanban,
    title: "Prospectos y pipeline dinámico",
    desc: "Registra tus prospectos manualmente, consulta toda su información y muévelos de etapa en tu pipeline con un solo clic.",
    accent: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: Sparkles,
    title: "Copiloto de IA",
    desc: "La inteligencia artificial es tu copiloto comercial: pregúntale por tus propiedades y sigue sus sugerencias para un mejor seguimiento y más cierres.",
    accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: ThumbsUp,
    title: "Facebook Leads",
    desc: "Recibe tus leads de Facebook automáticamente, sin copiar y pegar a mano en una hoja de cálculo.",
    accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Shuffle,
    title: "Reparto equitativo",
    desc: "Automatiza la distribución de leads entre tu equipo de trabajo. Cada quien recibe su turno, de manera justa y sin favoritismos.",
    accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: CalendarClock,
    title: "Google Calendar",
    desc: "Conecta tu calendario de Google y agenda llamadas con tus prospectos en un par de clics, sin perder el hilo.",
    accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
]

export default function LandingPageMockup() {
  const router = useRouter()
  const { profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && profile) {
      router.replace("/dashboard")
    }
  }, [loading, profile, router])

  if (loading || profile) return null

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 relative overflow-hidden font-sans flex flex-col">
      
      {/* EL PANAL DE FONDO */}
      <div className="absolute inset-0 z-0 opacity-15">
        <div 
          className="absolute inset-0 animate-pulse" 
          style={{ 
            animationDuration: '4s',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='56' height='98' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg stroke='%23ffffff' stroke-width='1' fill='none' fill-rule='evenodd' stroke-linejoin='round'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '56px 98px'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]"></div>
      </div>

      {/* NAVBAR */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="font-semibold text-xl tracking-tighter text-zinc-100 flex items-baseline">
          Flugzz<span style={{ color: '#22D3EE' }} className="ml-0.5">.</span>
        </div>
        <div className="flex gap-4 sm:gap-6 items-center">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
            Iniciar Sesión
          </Link>
          <Link href="/signup" className="text-sm font-medium px-4 py-2 rounded-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 transition-colors">
            Comenzar
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative z-10 flex-1 flex flex-col items-center pt-10 md:pt-24 pb-20 px-4 max-w-7xl mx-auto w-full">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Zap className="w-3.5 h-3.5" />
          Flugzz 2.0 ya está disponible
        </div>

        {/* Título */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mb-6 text-center animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 text-balance">
          El ecosistema operativo para el Real Estate del <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">futuro.</span>
        </h1>

        {/* Subtítulo */}
        <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 text-balance">
          Centraliza tus leads, automatiza tus cierres y domina tu pipeline desde una bóveda de cristal. Diseñado para inmobiliarias que no juegan a empatar.
        </p>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 w-full sm:w-auto z-50">
          
          {/* Botón Primario Corregido (Sólido y brillante) */}
          <Link href="/signup" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-cyan-400 text-zinc-950 font-bold hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] group">
            Iniciar Ecosistema
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Botón Secundario */}
          <Link href="/demo" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 text-white font-medium hover:bg-zinc-800 transition-all backdrop-blur-sm group">
            <Play className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
            Ver recorrido guiado
          </Link>

          {/* Botón Demo */}
          <Link href="/solicitar-demo" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-zinc-900/50 border border-zinc-700/60 text-zinc-300 font-medium hover:bg-zinc-800 transition-all backdrop-blur-sm group">
            Solicitar demo
          </Link>
        </div>

        {/* MOCKUP 3D ADAPTATIVO (MÓVIL + ESCRITORIO) */}
        <div className="w-full mt-16 md:mt-24 relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          
          {/* Degradado inferior para que se pierda en la oscuridad */}
          <div className="absolute bottom-0 left-0 w-full h-24 md:h-40 bg-gradient-to-t from-[#09090b] to-transparent z-20"></div>
          
          <div className="relative mx-auto w-full max-w-5xl px-2 sm:px-4" style={{ perspective: '2000px' }}>
            {/* El contenedor mágico que se inclina */}
            <div className="rounded-2xl border border-zinc-800/80 bg-[#09090b]/80 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-700 ease-out p-1 [transform:rotateX(15deg)_scale(0.95)] hover:[transform:rotateX(0deg)_scale(1)] cursor-pointer">
              
              {/* Barra superior (Estilo Mac/Navegador) */}
              <div className="h-8 md:h-10 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center px-4 gap-2">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-zinc-700"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-zinc-700"></div>
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-zinc-700"></div>
              </div>

              {/* CONTENIDO INTERNO DEL MOCKUP */}
              <div className="p-4 md:p-6 bg-[#09090b] flex flex-col md:grid md:grid-cols-4 gap-4 opacity-90 pointer-events-none">
                
                {/* Header falso */}
                <div className="md:col-span-4 flex justify-between items-center md:items-end mb-2">
                  <div className="h-6 md:h-8 w-28 md:w-48 bg-zinc-800/50 rounded-lg"></div>
                  <div className="h-5 md:h-6 w-16 md:w-24 bg-zinc-800/50 rounded-full"></div>
                </div>
                
                {/* Tarjetas KPI (En móvil se ven 2 juntas, en escritorio 4) */}
                <div className="grid grid-cols-2 md:col-span-4 md:grid-cols-4 gap-3 md:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-20 md:h-28 rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-3 md:p-4 flex flex-col justify-between ${i > 2 ? 'hidden sm:flex' : 'flex'}`}>
                      <div className="flex justify-between items-start">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-zinc-800/80"></div>
                        <div className="w-6 h-6 md:w-10 md:h-10 rounded-full border border-zinc-800/80 hidden md:block"></div>
                      </div>
                      <div>
                        <div className="h-2 md:h-3 w-12 md:w-16 bg-zinc-700/50 rounded mb-1.5 md:mb-2"></div>
                        <div className="h-4 md:h-5 w-16 md:w-24 bg-zinc-200/80 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Gráfica principal */}
                <div className="md:col-span-3 h-40 md:h-64 rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 md:p-6 flex flex-col justify-end mt-2 md:mt-0">
                   <div className="flex gap-1.5 md:gap-2 h-20 md:h-32 items-end">
                     {[40, 60, 30, 80, 50, 90, 70, 85, 45, 100].map((h, j) => (
                        <div key={j} style={{ height: `${h}%` }} className={`flex-1 bg-gradient-to-t from-zinc-800 to-flugzz-accent/40 rounded-t-sm ${j > 5 ? 'hidden sm:block' : 'block'}`}></div>
                     ))}
                   </div>
                </div>
                
                {/* Panel lateral derecho (Señales) */}
                <div className="md:col-span-1 h-32 md:h-64 rounded-xl bg-zinc-900/60 border border-zinc-800/50 p-4 flex flex-col gap-4 mt-2 md:mt-0">
                   {[1, 2, 3].map((k) => (
                     <div key={k} className="flex gap-3 items-center">
                        <div className={`w-4 h-4 md:w-6 md:h-6 rounded-full ${k === 2 ? 'bg-flugzz-accent shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-zinc-800'}`}></div>
                        <div className="flex-1">
                          <div className="h-2 w-full bg-zinc-700/50 rounded mb-1.5"></div>
                          <div className="h-2 w-1/2 bg-zinc-800 rounded"></div>
                        </div>
                     </div>
                   ))}
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* HIGHLIGHTS */}
        <section className="w-full mt-20 md:mt-32">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap className="w-3.5 h-3.5" />
              ¿Por qué Flugzz?
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Deja el desmadre de las hojas de cálculo
            </h2>
            <p className="text-zinc-400 mt-4 text-base md:text-lg text-balance">
              Nada de CRMs con 10,000 funcionalidades de las que usas tres, cobrándote como si las usaras todas.
              Flugzz es simple, directo y hecho para vender.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 backdrop-blur-xl hover:border-flugzz-accent/40 transition-all"
                >
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-5 ${feature.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* PRICING */}
        <section className="w-full mt-20 md:mt-32">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-900/50 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap className="w-3.5 h-3.5" />
              Precios
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Planes simples, para tu etapa
            </h2>
            <p className="text-zinc-400 mt-4 text-base md:text-lg text-balance">
              Desde un agente independiente hasta una desarrolladora con 50+ agentes. Sin costos ocultos: el precio que ves es el que pagas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRICING_ORDER.map((pid) => {
              const plan = PLAN_LIMITS[pid]
              const features = PLAN_FEATURES[pid]
              const isNew = pid === "agente_pro"
              const isPopular = pid === "expansion"
              return (
                <div
                  key={pid}
                  className={`relative rounded-2xl border p-6 flex flex-col backdrop-blur-xl transition-all ${
                    isNew
                      ? "border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/10 to-zinc-900/50 hover:border-fuchsia-400/70 shadow-[0_0_30px_rgba(232,121,249,0.15)]"
                      : isPopular
                        ? "border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-zinc-900/50 hover:border-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.15)]"
                        : "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                >
                  {isNew && (
                    <span className="absolute -top-3 left-6 whitespace-nowrap rounded-full bg-fuchsia-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                      Nuevo
                    </span>
                  )}
                  {plan.promo && (
                    <span className="absolute -top-3 right-6 whitespace-nowrap rounded-full bg-emerald-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                      {plan.promo}
                    </span>
                  )}
                  {isPopular && (
                    <span className="absolute -top-3 right-6 whitespace-nowrap rounded-full bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                      Más elegido
                    </span>
                  )}

                  <h3 className="text-lg font-semibold text-zinc-100">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{plan.range}</p>
                  <p className="text-sm text-zinc-400 mt-3 leading-relaxed flex-1">{plan.description}</p>

                  <div className="mt-5 mb-5 flex items-baseline gap-2">
                    {plan.priceCompare ? (
                      <span className="text-lg text-zinc-600 line-through">${plan.priceCompare.toLocaleString("es-MX")}</span>
                    ) : null}
                    <span className="text-4xl font-bold tracking-tight text-zinc-100">${plan.unitPrice.toLocaleString("es-MX")}</span>
                    <span className="text-sm text-zinc-500">MXN/mes</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isNew ? "text-fuchsia-400" : isPopular ? "text-amber-400" : "text-cyan-400"}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/suscripcion?plan=${pid}`}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all group ${
                      isNew
                        ? "bg-fuchsia-400 text-zinc-950 hover:bg-fuchsia-300 shadow-[0_0_20px_rgba(232,121,249,0.4)]"
                        : isPopular
                          ? "bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                          : "bg-zinc-100 text-zinc-950 hover:bg-zinc-300"
                    }`}
                  >
                    Comenzar
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  {isNew && (
                    <p className="text-[11px] text-zinc-500 mt-3 text-center">
                      Sin costo de activación · usa el código <span className="text-fuchsia-300 font-semibold">FLUGZZINDIE</span> para tu primer mes gratis
                    </p>
                  )}
                  {isPopular && (
                    <p className="text-[11px] text-zinc-500 mt-3 text-center">
                      El favorito de equipos de ventas en crecimiento
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="w-full mt-20 md:mt-32 mb-10">
          <div className="relative rounded-3xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-10 md:p-16 text-center overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
                ¿Listo para dejar de perseguir leads?
              </h2>
              <p className="text-zinc-400 mt-4 max-w-xl mx-auto text-base md:text-lg">
                Convierte tu cartera en un sistema que trabaja para ti y cierra más ventas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-cyan-400 text-zinc-950 font-bold hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] group"
                >
                  Comenzar ahora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/solicitar-demo"
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-zinc-900/50 border border-zinc-700/60 text-zinc-300 font-medium hover:bg-zinc-800 transition-all backdrop-blur-sm"
                >
                  Solicitar demo gratis
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-zinc-800/40 py-6 px-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-xs text-zinc-600 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Ultea S.A.S. de C.V. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="/aviso-de-privacidad" className="hover:text-zinc-400 transition-colors">
              Aviso de Privacidad
            </a>
            <span className="text-zinc-700">|</span>
            <a href="/terminos-y-condiciones" className="hover:text-zinc-400 transition-colors">
              Términos y Condiciones
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

"use client"

import { 
  Users, 
  PhoneOutgoing, 
  Zap, 
  Wallet, 
  Activity, 
  ArrowUpRight,
  TrendingUp
} from "lucide-react"

// Datos simulados para darle vida a la gráfica futurista
const chartData = [35, 45, 30, 60, 45, 75, 50, 85, 65, 100, 80, 110]

export default function DashboardPage() {
  return (
    <div className="space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. HEADER DEL DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter text-zinc-100 flex items-baseline">
            Visión panorámica<span style={{ color: '#22D3EE' }} className="ml-1 animate-pulse">...</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Monitoreo del ecosistema inmobiliario en tiempo real.</p>
        </div>
        
        {/* Indicador de estado futurista */}
        <div className="flex items-center px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/60 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.05)]">
          <span className="relative flex h-2.5 w-2.5 mr-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flugzz-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-flugzz-accent"></span>
          </span>
          <span className="text-xs font-medium text-zinc-300 tracking-wide uppercase">Sincronizado</span>
        </div>
      </div>

      {/* 2. GRID DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tarjeta 1: Tasa de Conversión */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden group hover:border-flugzz-accent/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-flugzz-accent/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
              <Zap className="w-5 h-5 text-flugzz-accent" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Tasa de Conversión</h3>
          <p className="text-2xl font-semibold text-zinc-100 mt-1">24.8%</p>
        </div>

        {/* Tarjeta 2: Tasa de Contactación */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-600 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
              <PhoneOutgoing className="w-5 h-5 text-zinc-300" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +5%
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Tasa de Contactación</h3>
          <p className="text-2xl font-semibold text-zinc-100 mt-1">68.2%</p>
        </div>

        {/* Tarjeta 3: Leads Activos */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-600 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
              <Users className="w-5 h-5 text-zinc-300" />
            </div>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Leads en Flujo</h3>
          <p className="text-2xl font-semibold text-zinc-100 mt-1">142</p>
        </div>

        {/* Tarjeta 4: Valor del Pipeline */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl relative overflow-hidden group hover:border-zinc-600 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
              <Wallet className="w-5 h-5 text-zinc-300" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3 mr-1" />
            </span>
          </div>
          <h3 className="text-zinc-400 text-sm font-medium">Valor Proyectado</h3>
          <p className="text-2xl font-semibold text-zinc-100 mt-1">$2.4M</p>
        </div>
      </div>

      {/* 3. ÁREA DE GRÁFICA Y ACTIVIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica principal simulada con CSS (Futurista) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-flugzz-accent" />
                Flujo Térmico de Leads
              </h2>
              <p className="text-sm text-zinc-400">Volumen de actividad en los últimos 12 días</p>
            </div>
            <select className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-flugzz-accent transition-colors">
              <option>Últimos 12 días</option>
              <option>Este mes</option>
              <option>Trimestre</option>
            </select>
          </div>

          {/* Construcción de la gráfica de barras con Tailwind */}
          <div className="h-64 flex items-end justify-between gap-2 border-b border-zinc-800/60 pb-2 relative">
            {/* Líneas de guía de fondo */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-full h-px bg-zinc-800/30"></div>
              ))}
            </div>

            {/* Barras dinámicas */}
            {chartData.map((height, i) => (
              <div key={i} className="relative flex-1 flex justify-center group h-full items-end">
                <div 
                  style={{ height: `${height}%` }}
                  className="w-full max-w-[2rem] bg-gradient-to-t from-zinc-800 to-zinc-600 rounded-t-sm group-hover:to-flugzz-accent group-hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all duration-300 relative"
                >
                  {/* Efecto de luz en la punta de la barra */}
                  <div className="absolute top-0 w-full h-1 bg-zinc-400 group-hover:bg-white rounded-t-sm opacity-50"></div>
                </div>
                {/* Tooltip flotante al pasar el mouse */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-xs text-white px-2 py-1 rounded border border-zinc-700 pointer-events-none z-10">
                  {height} leads
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de Pulso de Actividad */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6">Señales Recientes</h2>
          
          <div className="space-y-6">
            {[
              { title: "Lead Contactado", desc: "Roberto Carlos agendó visita", time: "Hace 10 min", type: "success" },
              { title: "Nuevo Lead", desc: "Desde campaña de Facebook", time: "Hace 45 min", type: "neutral" },
              { title: "Contrato Firmado", desc: "Propiedad en Valle Alto", time: "Hace 2 horas", type: "accent" },
              { title: "Seguimiento", desc: "Llamada pendiente con Ana", time: "Hace 3 horas", type: "neutral" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 relative">
                {/* Línea conectora */}
                {i !== 3 && <div className="absolute left-[9px] top-6 w-px h-full bg-zinc-800/60"></div>}
                
                <div className="relative mt-1 z-10">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center bg-zinc-950 ${
                    item.type === 'accent' ? 'border-flugzz-accent shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 
                    item.type === 'success' ? 'border-emerald-500' : 'border-zinc-600'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      item.type === 'accent' ? 'bg-flugzz-accent' : 
                      item.type === 'success' ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}></div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                  <span className="text-[10px] text-zinc-600 font-medium tracking-wider uppercase mt-1 block">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
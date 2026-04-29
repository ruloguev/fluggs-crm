export default function DashboardPage() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Visión General</h1>
          <p className="text-sm text-zinc-400 mt-1">Monitorea tus metas y actividad reciente.</p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjetas de métricas de prueba */}
          {[
            { label: "Leads Activos", value: "24", trend: "+12%" },
            { label: "Citas Agendadas", value: "8", trend: "+2" },
            { label: "Ventas (Mes)", value: "$4.2M", trend: "+18%" }
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
              <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-zinc-100">{stat.value}</p>
                <span className="text-xs font-medium text-emerald-400">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
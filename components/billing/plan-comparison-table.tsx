import { PLAN_LIMITS, PLAN_FEATURES, type PlanId } from "@/lib/stripe-plans"
import { Check, Crown, ShieldCheck, Zap } from "lucide-react"

const PLAN_ICONS: Record<PlanId, React.ComponentType<{ className?: string }>> = {
  fundacion: ShieldCheck,
  expansion: Zap,
  imperio: Crown,
}

const PLAN_ACCENTS: Record<PlanId, string> = {
  fundacion: "#22D3EE",
  expansion: "#34D399",
  imperio: "#FBBF24",
}

type Props = {
  selectedPlan?: PlanId | null
  onSelect?: (id: PlanId) => void
  interactive?: boolean
}

export function PlanComparisonTable({ selectedPlan, onSelect, interactive = true }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(Object.keys(PLAN_LIMITS) as PlanId[]).map((id) => {
        const plan = PLAN_LIMITS[id]
        const Icon = PLAN_ICONS[id]
        const accent = PLAN_ACCENTS[id]
        const active = selectedPlan === id
        const features = PLAN_FEATURES[id]

        const inner = (
          <div className="relative h-full p-5 flex flex-col">
            <div
              className="absolute -right-10 -top-12 h-32 w-32 rounded-full blur-3xl opacity-25"
              style={{ backgroundColor: accent }}
            />
            <div className="relative flex items-start justify-between gap-4 mb-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                  active
                    ? "border-zinc-300 bg-zinc-950 text-zinc-100"
                    : "border-zinc-800 bg-black/30"
                }`}
                style={!active ? { color: accent } : undefined}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  active
                    ? "bg-zinc-900 text-zinc-100"
                    : "bg-zinc-950 text-zinc-500 border border-zinc-800"
                }`}
              >
                {plan.range}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-zinc-100">{plan.name}</h3>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{plan.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-zinc-100">${plan.unitPrice}</span>
              <span className="text-xs text-zinc-500">MXN/asiento/mes</span>
            </div>

            <ul className="mt-5 space-y-2.5 flex-1">
              {features.map((feat, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-zinc-300 leading-relaxed"
                >
                  <Check
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: active ? accent : "#71717a" }}
                  />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {interactive && onSelect && (
              <div className="mt-5 pt-4 border-t border-zinc-800/60">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    active ? "text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  {active ? "✓ Seleccionado" : "Elegir plan →"}
                </span>
              </div>
            )}
          </div>
        )

        if (!interactive) {
          return (
            <div
              key={id}
              className="text-left rounded-2xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden"
            >
              {inner}
            </div>
          )
        }

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect?.(id)}
            className={`text-left rounded-2xl border transition-all overflow-hidden ${
              active
                ? "border-zinc-200 bg-zinc-100 text-zinc-950 shadow-[0_0_32px_rgba(255,255,255,0.14)]"
                : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700"
            }`}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}

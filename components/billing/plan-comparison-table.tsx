import { PLAN_LIMITS, PLAN_FEATURES, type PlanId } from "@/lib/stripe-plans"
import { Check, Crown, Rocket, ShieldCheck, Zap } from "lucide-react"

const PLAN_ICONS: Record<PlanId, React.ComponentType<{ className?: string }>> = {
  agente_pro: Rocket,
  fundacion: ShieldCheck,
  expansion: Zap,
  imperio: Crown,
}

const PLAN_ACCENTS: Record<PlanId, string> = {
  agente_pro: "#E879F9",
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
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(PLAN_LIMITS) as PlanId[]).map((id) => {
        const plan = PLAN_LIMITS[id]
        const Icon = PLAN_ICONS[id]
        const accent = PLAN_ACCENTS[id]
        const active = selectedPlan === id
        const isPopular = id === "expansion"
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
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    active
                      ? "bg-zinc-900 text-zinc-100"
                      : "bg-zinc-950 text-zinc-500 border border-zinc-800"
                  }`}
                >
                  {plan.range}
                </span>
                {plan.promo && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      active
                        ? "bg-flugzz-accent text-zinc-950"
                        : "bg-flugzz-accent/15 text-flugzz-accent"
                    }`}
                  >
                    {plan.promo}
                  </span>
                )}
                {isPopular && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      active
                        ? "bg-amber-400 text-zinc-950"
                        : "bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    Más elegido
                  </span>
                )}
              </div>
            </div>

            <h3
              className={`text-xl font-semibold ${
                active ? "text-zinc-950" : "text-zinc-100"
              }`}
            >
              {plan.name}
            </h3>
            <p
              className={`mt-1 text-xs leading-relaxed ${
                active ? "text-zinc-700" : "text-zinc-500"
              }`}
            >
              {plan.description}
            </p>

            <div className="mt-4 flex items-baseline gap-1">
              {plan.priceCompare && (
                <span
                  className={`text-lg font-medium line-through ${
                    active ? "text-zinc-500" : "text-zinc-600"
                  }`}
                >
                  ${plan.priceCompare}
                </span>
              )}
              <span
                className={`text-2xl font-semibold ${
                  active ? "text-zinc-950" : "text-zinc-100"
                }`}
              >
                ${plan.unitPrice}
              </span>
              <span
                className={`text-xs ${active ? "text-zinc-600" : "text-zinc-500"}`}
              >
                MXN/asiento/mes
              </span>
            </div>

            <ul className="mt-5 space-y-2.5 flex-1">
              {features.map((feat, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-sm leading-relaxed ${
                    active ? "text-zinc-800" : "text-zinc-300"
                  }`}
                >
                  <Check
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: active ? "#0e7490" : accent }}
                  />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {interactive && onSelect && (
              <div className="mt-5 pt-4 border-t border-zinc-800/60">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    active ? "text-zinc-900" : "text-zinc-500"
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
              className={`text-left rounded-2xl border overflow-hidden ${
                isPopular && !active
                  ? "border-amber-400/40 shadow-[0_0_24px_rgba(251,191,36,0.10)]"
                  : "border-zinc-800/60 bg-zinc-900/40"
              }`}
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
                ? "border-zinc-200 bg-zinc-100 text-zinc-950 shadow-[0_0_32px_rgba(255,255,255,0.18)]"
                : isPopular
                  ? "border-amber-400/40 bg-zinc-900/40 hover:border-amber-400/70 shadow-[0_0_24px_rgba(251,191,36,0.12)]"
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

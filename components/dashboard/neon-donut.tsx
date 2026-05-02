"use client"

type NeonDonutVariant = "cyan" | "emerald" | "violet" | "amber"

const VARIANT_STYLES: Record<
  NeonDonutVariant,
  { stroke: string; glow: string; text: string }
> = {
  cyan: {
    stroke: "#22d3ee",
    glow: "drop-shadow(0 0 8px rgba(34,211,238,0.7))",
    text: "text-cyan-300",
  },
  emerald: {
    stroke: "#34d399",
    glow: "drop-shadow(0 0 8px rgba(52,211,153,0.7))",
    text: "text-emerald-300",
  },
  violet: {
    stroke: "#a78bfa",
    glow: "drop-shadow(0 0 8px rgba(167,139,250,0.7))",
    text: "text-violet-300",
  },
  amber: {
    stroke: "#fbbf24",
    glow: "drop-shadow(0 0 8px rgba(251,191,36,0.7))",
    text: "text-amber-300",
  },
}

interface NeonDonutProps {
  /** Value between 0 and 100 */
  percent: number
  label: string
  subtitle?: string
  variant?: NeonDonutVariant
  size?: number
}

export function NeonDonut({
  percent,
  label,
  subtitle,
  variant = "cyan",
  size = 120,
}: NeonDonutProps) {
  const styles = VARIANT_STYLES[variant]
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const dashOffset = circumference * (1 - clampedPercent / 100)
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={8}
          />
          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={styles.stroke}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ filter: styles.glow, transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>

        {/* Percentage label centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-semibold tabular-nums ${styles.text}`}>
            {clampedPercent.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 mt-0.5 max-w-[120px] leading-snug">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

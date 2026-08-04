import { cn } from "@/lib/utils";

/**
 * Semicircular gauge. `value` is a 0–100 percentage, or null when there's no
 * data yet (track only). Used for the positive-review rate on the dashboard.
 */
export function Gauge({
  value,
  caption,
  className,
}: {
  value: number | null;
  caption?: string;
  className?: string;
}) {
  const r = 80;
  const len = Math.PI * r;
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const offset = len * (1 - pct / 100);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-full max-w-[240px]">
        <svg viewBox="0 0 200 116" className="w-full" role="img"
          aria-label={value === null ? "No rating data yet" : `${pct}% positive`}>
          <path
            d="M 15 100 A 85 85 0 0 1 185 100"
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {value !== null && (
            <path
              d="M 15 100 A 85 85 0 0 1 185 100"
              fill="none"
              stroke="var(--evergreen)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className="tabular font-display text-[2rem] font-semibold leading-none text-ink">
            {value === null ? "—" : `${Math.round(pct)}%`}
          </span>
          {caption && <span className="mt-1 text-xs text-muted">{caption}</span>}
        </div>
      </div>
    </div>
  );
}

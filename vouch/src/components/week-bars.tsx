import { cn } from "@/lib/utils";

export type DayDatum = { day: string; value: number };

/**
 * Weekly activity bars. With data, bars fill evergreen and the peak day is
 * highlighted; without data, every bar shows the diagonal hatch — a designed
 * "waiting for data" state, not an empty box. Recharts takes over in Phase 4.
 */
export function WeekBars({
  data,
  className,
}: {
  data?: DayDatum[];
  className?: string;
}) {
  const days = data ?? [
    { day: "S", value: 0 },
    { day: "M", value: 0 },
    { day: "T", value: 0 },
    { day: "W", value: 0 },
    { day: "T", value: 0 },
    { day: "F", value: 0 },
    { day: "S", value: 0 },
  ];
  const max = Math.max(1, ...days.map((d) => d.value));
  const peak = days.reduce(
    (best, d, i) => (d.value > days[best].value ? i : best),
    0
  );
  const hasData = days.some((d) => d.value > 0);

  return (
    <div className={cn("flex items-end gap-3 sm:gap-4", className)}>
      {days.map((d, i) => {
        const empty = d.value === 0;
        const pct = empty ? 100 : Math.max(14, (d.value / max) * 100);
        const isPeak = hasData && i === peak && !empty;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-40 w-full items-end justify-center">
              {isPeak && (
                <span className="absolute -top-1 z-10 rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                  {d.value}
                </span>
              )}
              <div
                className={cn(
                  "w-full max-w-[46px] rounded-full transition-all",
                  empty
                    ? "hatch border border-border/60"
                    : isPeak
                      ? "bg-evergreen"
                      : "bg-evergreen/45"
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

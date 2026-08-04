import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The dashboard's signature element — the one place gold appears boldly.
 * `value` is the average rating (1–5) or null when no ratings exist yet.
 */
export function StarMeter({
  value,
  count,
  className,
}: {
  value: number | null;
  count: number;
  className?: string;
}) {
  const hasData = value !== null && count > 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline gap-2">
        <span className="tabular font-display text-2xl font-semibold text-ink">
          {hasData ? value.toFixed(1) : "—"}
        </span>
        <span className="text-sm text-muted">
          {hasData
            ? `from ${count} ${count === 1 ? "review" : "reviews"}`
            : "no reviews yet"}
        </span>
      </div>

      <div
        className="flex gap-1"
        role="img"
        aria-label={
          hasData
            ? `Average rating ${value.toFixed(1)} out of 5`
            : "No ratings yet"
        }
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = hasData && value >= i - 0.25;
          return (
            <Star
              key={i}
              aria-hidden
              className={cn(
                "h-7 w-7",
                filled ? "text-gold" : "text-border"
              )}
              fill={filled ? "var(--gold)" : "transparent"}
              strokeWidth={1.5}
            />
          );
        })}
      </div>
    </div>
  );
}

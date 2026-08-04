import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A headline metric card. `featured` renders the filled evergreen treatment
 * (one per row, like the reference's dark card). Numbers are tabular.
 * `hint` is neutral context — we don't invent month-over-month deltas.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  featured = false,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between gap-6 rounded-card border p-5 transition-shadow",
        featured
          ? "border-transparent bg-evergreen text-paper shadow-panel rings"
          : "border-border bg-card text-ink shadow-card hover:shadow-panel"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm font-medium",
            featured ? "text-paper/80" : "text-muted"
          )}
        >
          {label}
        </p>
        <Link
          href={href}
          aria-label={`View ${label.toLowerCase()}`}
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition",
            featured
              ? "border-white/25 text-paper hover:bg-white/10"
              : "border-border text-ink hover:border-evergreen hover:text-evergreen"
          )}
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="space-y-2">
        <p className="tabular font-display text-[2.25rem] font-semibold leading-none">
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              "text-xs",
              featured ? "text-paper/70" : "text-muted"
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

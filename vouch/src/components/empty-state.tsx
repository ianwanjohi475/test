import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Empty states are invitations, not mood — a clear next action lives right here.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-evergreen/10">
        <Icon className="h-5 w-5 text-evergreen" aria-hidden />
      </span>
      <div className="max-w-sm space-y-1">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

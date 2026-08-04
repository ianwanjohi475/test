"use client";

import { Search, Bell, ChevronDown } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type PlanStatus =
  | { kind: "trial"; daysLeft: number }
  | { kind: "active" }
  | { kind: "past_due" }
  | { kind: "canceled" };

function planLabel(status: PlanStatus) {
  switch (status.kind) {
    case "trial":
      return `Trial — ${status.daysLeft} ${status.daysLeft === 1 ? "day" : "days"} left`;
    case "active":
      return "Vouch plan · active";
    case "past_due":
      return "Payment needed";
    case "canceled":
      return "Plan canceled";
  }
}

export function TopBar({
  businessName,
  planStatus,
}: {
  businessName: string;
  planStatus: PlanStatus;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-3 px-1">
      {/* Search — activates in a later phase; present as part of the shell. */}
      <label className="relative hidden max-w-md flex-1 items-center sm:flex">
        <Search
          className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-muted"
          aria-hidden
        />
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder="Search requests, customers…"
          className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-16 text-sm text-ink placeholder:text-muted focus-visible:border-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/20"
        />
        <kbd className="pointer-events-none absolute right-3 rounded-md border border-border bg-paper px-1.5 py-0.5 text-[11px] font-medium text-muted">
          ⌘K
        </kbd>
      </label>
      <div className="sm:hidden" />

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/30"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-gold ring-2 ring-card" />
        </button>

        <button
          type="button"
          className={cn(
            "flex items-center gap-3 rounded-full border border-border bg-card p-1 pr-2 text-left transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/30",
            "sm:pr-3"
          )}
        >
          <Avatar name={businessName} />
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-sm font-semibold text-ink">
              {businessName}
            </span>
            <span className="block truncate text-xs text-muted">
              {planLabel(planStatus)}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted sm:block" aria-hidden />
        </button>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { navGroups } from "@/components/nav-config";
import type { PlanStatus } from "@/components/top-bar";

function TrialCard({ planStatus }: { planStatus: PlanStatus }) {
  const line =
    planStatus.kind === "trial"
      ? `${planStatus.daysLeft} ${planStatus.daysLeft === 1 ? "day" : "days"} left on your free trial`
      : planStatus.kind === "active"
        ? "You're on the Vouch plan"
        : "Reactivate to keep sending";

  return (
    <div className="relative overflow-hidden rounded-card bg-evergreen p-4 text-paper rings">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
        <Sparkles className="h-[18px] w-[18px] text-gold" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium leading-snug">{line}</p>
      <Link
        href="/billing"
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-gold text-sm font-semibold text-ink transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        See plans
      </Link>
    </div>
  );
}

export function AppSidebar({
  planStatus,
  className,
}: {
  planStatus: PlanStatus;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex h-full w-64 shrink-0 flex-col bg-card lg:rounded-panel lg:shadow-panel",
        className
      )}
    >
      <div className="flex h-16 items-center px-6">
        <Link
          href="/dashboard"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/30"
        >
          <Logo />
        </Link>
      </div>

      <div className="scroll-slim flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
        {navGroups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
              {group.heading}
            </p>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-evergreen/10 text-evergreen"
                          : "text-muted hover:bg-paper hover:text-ink"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-evergreen"
                        />
                      )}
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4">
        <TrialCard planStatus={planStatus} />
      </div>
    </nav>
  );
}

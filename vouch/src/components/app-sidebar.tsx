"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { navItems } from "@/components/nav-config";

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r border-border bg-card",
        className
      )}
    >
      <div className="flex h-16 items-center px-5">
        <Link
          href="/dashboard"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/30"
        >
          <Logo />
        </Link>
      </div>

      <ul className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-evergreen/10 text-evergreen"
                    : "text-muted hover:bg-paper hover:text-ink"
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted">
          Reputation, earned. One request at a time.
        </p>
      </div>
    </nav>
  );
}

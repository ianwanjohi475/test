"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { TopBar, type PlanStatus } from "@/components/top-bar";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export function AppShell({
  businessName,
  planStatus,
  children,
}: {
  businessName: string;
  planStatus: PlanStatus;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <AppSidebar className="hidden lg:flex" />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex">
            <AppSidebar />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top row with menu toggle */}
        <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Logo />
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/30"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <TopBar businessName={businessName} planStatus={planStatus} />

        <main className={cn("flex-1 px-5 py-6 sm:px-8 sm:py-8")}>
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

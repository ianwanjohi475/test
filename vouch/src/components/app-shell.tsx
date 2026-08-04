"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { TopBar, type PlanStatus } from "@/components/top-bar";
import { Logo } from "@/components/logo";

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-wash">
      <div className="mx-auto flex w-full max-w-[1480px] gap-5 p-3 sm:p-4 lg:p-5">
        {/* Desktop sidebar — a floating rounded panel */}
        <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] lg:block">
          <AppSidebar planStatus={planStatus} />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex p-3">
              <AppSidebar planStatus={planStatus} className="rounded-panel shadow-lift" />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header row */}
          <div className="mb-3 flex items-center justify-between rounded-card bg-card px-4 py-3 shadow-card lg:hidden">
            <Logo />
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/30"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <TopBar businessName={businessName} planStatus={planStatus} />

          <main className="mt-2 flex-1 pb-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

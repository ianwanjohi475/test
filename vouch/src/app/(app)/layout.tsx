import { AppShell } from "@/components/app-shell";
import type { PlanStatus } from "@/components/top-bar";

// Phase 1: the shell renders with neutral placeholders for the header chrome.
// Phase 2 replaces these with the authenticated business record + real
// subscription state (from Supabase / Stripe webhooks).
const businessName = "Your business";
const planStatus: PlanStatus = { kind: "trial", daysLeft: 14 };

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell businessName={businessName} planStatus={planStatus}>
      {children}
    </AppShell>
  );
}

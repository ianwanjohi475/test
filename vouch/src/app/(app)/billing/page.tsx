import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelBody } from "@/components/panel";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing"
        description="Your plan, your trial, and your invoices — all self-serve."
      />
      <Panel>
        <PanelBody>
          <EmptyState
            icon={CreditCard}
            title="Billing turns on in a later step"
            description="Your 14-day free trial starts at signup — no card needed. Subscribing and managing your plan through Stripe lands here."
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

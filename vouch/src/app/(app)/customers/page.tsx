import type { Metadata } from "next";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelBody } from "@/components/panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="The people you've served — add them one at a time or import a list."
        action={
          <Button disabled>
            <Users /> Add customer
          </Button>
        }
      />
      <Panel>
        <PanelBody>
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Adding and importing customers arrives in a later step. You'll paste a name and email, or upload a CSV of recent jobs."
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

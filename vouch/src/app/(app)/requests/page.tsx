import type { Metadata } from "next";
import { Send } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelBody } from "@/components/panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Requests"
        description="Send review requests and track every one from sent to rated."
        action={
          <Button disabled>
            <Send /> Send request
          </Button>
        }
      />
      <Panel>
        <PanelBody>
          <EmptyState
            icon={Send}
            title="No requests yet"
            description="Sending goes live in the next build step — you'll email a customer and watch it move from sent to opened to rated."
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

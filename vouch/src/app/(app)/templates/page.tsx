import type { Metadata } from "next";
import { MessageSquareText } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelBody } from "@/components/panel";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Templates"
        description="The words your customers read, and when reminders go out."
      />
      <Panel>
        <PanelBody>
          <EmptyState
            icon={MessageSquareText}
            title="Templates land soon"
            description="You'll edit your request message and reminder timing here, with a live preview — no jargon, just what your customer sees."
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelBody } from "@/components/panel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Your business profile, Google review link, sender identity, and brand."
      />
      <Panel>
        <PanelBody>
          <EmptyState
            icon={Settings}
            title="Settings arrive soon"
            description="You'll set your business name, Google review link, who emails come from, and your logo and brand color here."
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

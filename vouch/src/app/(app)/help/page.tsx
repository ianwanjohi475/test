import type { Metadata } from "next";
import { LifeBuoy, Mail } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Panel, PanelBody } from "@/components/panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Help" };

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Help"
        description="Guides and a real human when you need one."
      />
      <Panel>
        <PanelBody>
          <EmptyState
            icon={LifeBuoy}
            title="Help center coming soon"
            description="Short how-to guides land here. Until then, email us any time and we'll help you get set up."
            action={
              <Button variant="outline" asChild>
                <a href="mailto:help@vouch.app">
                  <Mail /> Email support
                </a>
              </Button>
            }
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type PlanStatus =
  | { kind: "trial"; daysLeft: number }
  | { kind: "active" }
  | { kind: "past_due" }
  | { kind: "canceled" };

function PlanBadge({ status }: { status: PlanStatus }) {
  switch (status.kind) {
    case "trial":
      return (
        <Badge variant="gold">
          Trial — {status.daysLeft}{" "}
          {status.daysLeft === 1 ? "day" : "days"} left
        </Badge>
      );
    case "active":
      return <Badge variant="success">Active plan</Badge>;
    case "past_due":
      return <Badge variant="danger">Payment needed</Badge>;
    case "canceled":
      return <Badge variant="neutral">Canceled</Badge>;
  }
}

export function TopBar({
  businessName,
  planStatus,
}: {
  businessName: string;
  planStatus: PlanStatus;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-paper/80 px-6 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card">
          <Building2 className="h-4 w-4 text-evergreen" aria-hidden />
        </span>
        <span className="truncate font-medium text-ink">{businessName}</span>
      </div>
      <div className="flex items-center gap-3">
        <PlanBadge status={planStatus} />
      </div>
    </header>
  );
}

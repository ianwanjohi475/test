import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        queued: "bg-paper text-muted",
        sent: "bg-info/10 text-info",
        opened: "bg-evergreen/10 text-evergreen",
        rated: "bg-gold-soft text-ink",
        completed: "bg-success/12 text-success",
        pending: "bg-gold-soft text-ink",
        failed: "bg-danger/10 text-danger",
      },
    },
    defaultVariants: { tone: "sent" },
  }
);

export type StatusTone = NonNullable<VariantProps<typeof pill>["tone"]>;

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(pill({ tone }), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

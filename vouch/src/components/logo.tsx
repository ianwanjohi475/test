import { cn } from "@/lib/utils";

/**
 * Vouch mark: a rounded evergreen tile with a single gold star — reviews are
 * gold stars, so gold is earned, not decorative.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-md bg-evergreen"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="var(--gold)"
          role="presentation"
        >
          <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.31l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z" />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Vouch
        </span>
      )}
    </span>
  );
}

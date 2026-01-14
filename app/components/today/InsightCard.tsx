type InsightCardProps = {
  title: string;
  value: string | null;
  subtitle: string | null;
  isLocked: boolean;
  lockReason: string | null;
  proBadge: boolean;
  emphasis?: boolean;
  className?: string;
};

export default function InsightCard({
  title,
  value,
  subtitle,
  isLocked,
  lockReason,
  proBadge,
  emphasis = false,
  className,
}: InsightCardProps) {
  return (
    <div
      className={`ui-surface p-[var(--space-5)] ${
        isLocked ? "bg-zinc-50" : "bg-white"
      } ${className ?? ""}`}
      aria-disabled={isLocked}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-700">{title}</div>
        {proBadge ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-color)] px-2 py-0.5 text-xs font-semibold text-zinc-500">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-3.5 w-3.5 text-zinc-400"
            >
              <path
                fill="currentColor"
                d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"
              />
            </svg>
            <span>Pro</span>
          </div>
        ) : null}
      </div>
      <div className="mt-4 space-y-1">
        <div
          className={`font-semibold text-zinc-900 ${
            emphasis ? "text-3xl" : "text-2xl"
          }`}
        >
          {isLocked ? "—" : value}
        </div>
        {isLocked && lockReason ? (
          <div className="text-xs text-zinc-400">{lockReason}</div>
        ) : null}
        {!isLocked && subtitle ? (
          <div className="text-xs text-zinc-500">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

import InsightCard from "./InsightCard";

type PatternInsight = {
  title: string;
  isUnlocked: boolean;
  requirement: string;
  value: string;
  subtitle: string | null;
  emphasis?: boolean;
  className?: string;
};

type PatternInsightsSectionProps = {
  collapsed: boolean;
  onToggle: () => void;
  isAuthed: boolean;
  isPro: boolean;
  patternInsights: PatternInsight[];
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  onViewPricing: () => void;
  onRequireAuth: () => void;
};

export default function PatternInsightsSection({
  collapsed,
  onToggle,
  isAuthed,
  isPro,
  patternInsights,
  showEmptyState = false,
  emptyStateMessage,
  onViewPricing,
  onRequireAuth,
}: PatternInsightsSectionProps) {
  return (
    <section className="ui-surface p-[var(--space-6)]">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Pattern insights
        </h2>
        <span className="text-sm text-zinc-500">{collapsed ? ">" : "v"}</span>
      </button>
      {!collapsed ? (
        <>
          {showEmptyState ? (
            <p className="mt-2 text-xs text-zinc-500">
              {emptyStateMessage}
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                Patterns emerge through repetition.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Pro tracks them across runs.
              </p>
            </>
          )}
          {!isAuthed ? (
            <button
              type="button"
              className="btn-tertiary mt-3"
              onClick={onRequireAuth}
            >
              Sign in to continue
            </button>
          ) : !isPro ? (
            <button
              type="button"
              className="btn-tertiary mt-3"
              onClick={onViewPricing}
            >
              Upgrade to Pro
            </button>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {patternInsights.map((insight) => {
              const isConstraintSwitching =
                insight.title === "Constraint switching";
              const isLocked =
                !isPro || (!insight.isUnlocked && !isConstraintSwitching);
              const showProBadge =
                isLocked && (!isPro || !isConstraintSwitching);
              return (
                <InsightCard
                  key={insight.title}
                  title={insight.title}
                  value={isLocked ? null : insight.value}
                  subtitle={isLocked ? null : insight.subtitle ?? null}
                  isLocked={isLocked}
                  lockReason={insight.requirement}
                  proBadge={showProBadge}
                  emphasis={insight.emphasis}
                  className={insight.className}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

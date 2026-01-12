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
  isPro: boolean;
  patternInsights: PatternInsight[];
  onViewPricing: () => void;
};

export default function PatternInsightsSection({
  collapsed,
  onToggle,
  isPro,
  patternInsights,
  onViewPricing,
}: PatternInsightsSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Pattern insights (Pro)
        </h2>
        <span className="text-sm text-zinc-500">{collapsed ? ">" : "v"}</span>
      </button>
      {!collapsed ? (
        <>
          <p className="mt-1 text-xs text-zinc-500">
            Patterns emerge after repeated runs.
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div />
            {!isPro ? (
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-semibold text-zinc-500 transition hover:text-zinc-700"
                onClick={onViewPricing}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 text-zinc-400"
                >
                  <path
                    fill="currentColor"
                    d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"
                  />
                </svg>
                <span>Pro</span>
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {patternInsights.map((insight) => {
              const isLocked = !isPro || !insight.isUnlocked;
              return (
                <InsightCard
                  key={insight.title}
                  title={insight.title}
                  value={isLocked ? null : insight.value}
                  subtitle={isLocked ? null : insight.subtitle ?? null}
                  isLocked={isLocked}
                  lockReason={insight.requirement}
                  proBadge={isLocked}
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

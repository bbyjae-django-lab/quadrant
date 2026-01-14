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
    <section className="ui-surface p-[var(--space-6)]">
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
            Pro preserves behavioural evidence across runs. Patterns surface whether you want them to or not.
          </p>
          {!isPro ? (
            <>
              <p className="mt-2 text-xs text-zinc-500">
                No patterns yet.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Free runs reset. Patterns require accumulation.
              </p>
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-zinc-500 transition hover:text-zinc-700"
                onClick={onViewPricing}
              >
                Upgrade to Pro
              </button>
            </>
          ) : null}
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

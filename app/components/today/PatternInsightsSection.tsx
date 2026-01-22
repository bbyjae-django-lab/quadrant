import InsightCard from "./InsightCard";

type PatternInsight = {
  title: string;
  value: string;
  subtitle?: string | null;
  emphasis?: boolean;
  className?: string;
};

type PatternInsightsSectionProps = {
  collapsed: boolean;
  onToggle: () => void;
  insights: PatternInsight[];
};

export default function PatternInsightsSection({
  collapsed,
  onToggle,
  insights,
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
          <p className="mt-2 text-xs text-zinc-500">
            Patterns emerge through repetition.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.title}
                title={insight.title}
                value={insight.value}
                subtitle={insight.subtitle ?? null}
                isLocked={false}
                lockReason={null}
                proBadge={false}
                emphasis={insight.emphasis}
                className={insight.className}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

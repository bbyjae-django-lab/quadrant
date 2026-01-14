import type { ActiveRunState, Protocol, RunHistoryEntry } from "../../types";

type ActiveRunSectionProps = {
  activeRunState: ActiveRunState;
  activeProtocol: Protocol | null;
  activeRuleText: string;
  runActive: boolean;
  runTrackerSymbols: string[];
  successfulDays: number;
  runLength: number;
  latestRun: RunHistoryEntry | null;
  latestRunStrip: string[];
  runSummaryLine: string;
  showFreeRunComplete: boolean;
  sectionId?: string;
  onCheckIn: () => void;
  onStartRun: () => void;
  onViewPricing: () => void;
};

export default function ActiveRunSection({
  activeRunState,
  activeProtocol,
  activeRuleText,
  runActive,
  runTrackerSymbols,
  successfulDays,
  runLength,
  latestRun,
  latestRunStrip,
  runSummaryLine,
  showFreeRunComplete,
  sectionId,
  onCheckIn,
  onStartRun,
  onViewPricing,
}: ActiveRunSectionProps) {
  return (
    <section
      id={sectionId}
      className="ui-surface p-[var(--space-6)]"
    >
      {activeRunState === "active" && activeProtocol ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Active run</h2>
            <span className="rounded-[var(--radius-pill)] border border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-zinc-500">
              Active
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold text-zinc-900">
            {activeProtocol.name}
          </div>
          <div className="mt-2 max-w-full whitespace-normal break-words text-sm font-semibold text-zinc-800">
            Rule: {activeRuleText}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {runTrackerSymbols.map((symbol, index) => (
              <div
                key={`active-run-strip-${index}`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                  symbol === "✕"
                    ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                    : symbol === "✓"
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-zinc-50 text-zinc-500"
                }`}
              >
                {symbol}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-medium text-zinc-500">
            Clean days: {successfulDays}/{runLength}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onCheckIn}
              disabled={!runActive}
            >
              Daily check-in
            </button>
          </div>
        </>
      ) : activeRunState === "summary" && latestRun ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">
              Completed run summary
            </h2>
            <span className="text-xs font-semibold tracking-wide text-zinc-500">
              {latestRun.result}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="text-sm font-semibold text-zinc-900">
              {latestRun.protocolName}
            </div>
            <div className="text-xs font-semibold tracking-wide text-zinc-500">
              This run
            </div>
            <div className="flex flex-wrap gap-2">
              {latestRunStrip.map((symbol, index) => (
                <div
                  key={`summary-strip-${latestRun.id}-${index}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                    symbol === "✕"
                      ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                      : symbol === "✓"
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-zinc-50 text-zinc-500"
                  }`}
                >
                  {symbol}
                </div>
              ))}
            </div>
            <div className="text-sm text-zinc-600">
              Clean days: {latestRun.cleanDays}/{runLength}
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-600">{runSummaryLine}</p>
          {showFreeRunComplete ? (
            <div className="ui-inset mt-4 p-[var(--space-4)] text-zinc-900">
              <div className="space-y-2">
                <div className="text-sm font-semibold">Free run complete.</div>
                <p className="text-sm text-zinc-600">
                  Patterns become visible with repetition. Pro tracks them.
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={onViewPricing}
                >
                  View pricing
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">
              No active run.
            </h2>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Select one protocol to enforce today.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onStartRun}
            >
              Start a run
            </button>
            <a href="/about" className="btn-tertiary text-sm">
              How this works
            </a>
          </div>
        </>
      )}
    </section>
  );
}

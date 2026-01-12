import type { ActiveRunState, Protocol, RunHistoryEntry } from "../../types";

type ActiveRunSectionProps = {
  activeRunState: ActiveRunState;
  activeProtocol: Protocol | null;
  activeRuleSummary: string;
  runActive: boolean;
  runTrackerSymbols: string[];
  successfulDays: number;
  runLength: number;
  latestRun: RunHistoryEntry | null;
  latestRunStrip: string[];
  runSummaryLine: string;
  showFreeRunComplete: boolean;
  isPro: boolean;
  showSwitchConfirm: boolean;
  showEndRunConfirm: boolean;
  onCheckIn: () => void;
  onEndRunRequest: () => void;
  onSwitchProtocol: () => void;
  onCancelSwitch: () => void;
  onConfirmSwitch: () => void;
  onCancelEndRun: () => void;
  onConfirmEndRun: () => void;
  onViewPricing: () => void;
};

export default function ActiveRunSection({
  activeRunState,
  activeProtocol,
  activeRuleSummary,
  runActive,
  runTrackerSymbols,
  successfulDays,
  runLength,
  latestRun,
  latestRunStrip,
  runSummaryLine,
  showFreeRunComplete,
  isPro,
  showSwitchConfirm,
  showEndRunConfirm,
  onCheckIn,
  onEndRunRequest,
  onSwitchProtocol,
  onCancelSwitch,
  onConfirmSwitch,
  onCancelEndRun,
  onConfirmEndRun,
  onViewPricing,
}: ActiveRunSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {activeRunState === "active" && activeProtocol ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Active run</h2>
            <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500">
              Active
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold text-zinc-900">
            {activeProtocol.name}
          </div>
          <div className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-800">
            Rule: {activeRuleSummary}
          </div>
          <div className="mt-4 text-xs font-semibold tracking-wide text-zinc-400">
            Run is live
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
                      : "border-zinc-200 text-zinc-600"
                }`}
              >
                {symbol}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-medium text-zinc-500">
            Clean days: {successfulDays}/{runLength}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onCheckIn}
              disabled={!runActive}
            >
              Daily check-in
            </button>
            {isPro && runActive ? (
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                onClick={onEndRunRequest}
              >
                End run
              </button>
            ) : null}
            {isPro && runActive ? (
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                onClick={onSwitchProtocol}
              >
                Switch protocol
              </button>
            ) : null}
          </div>
          {showSwitchConfirm ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <span>Switching protocols resets your current run.</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                  onClick={onCancelSwitch}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  onClick={onConfirmSwitch}
                >
                  Switch
                </button>
              </div>
            </div>
          ) : null}
          {showEndRunConfirm ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <span>Ending locks this run in history.</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                  onClick={onCancelEndRun}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  onClick={onConfirmEndRun}
                >
                  End run
                </button>
              </div>
            </div>
          ) : null}
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
                        : "border-zinc-200 text-zinc-600"
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
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900">
              <div className="space-y-2">
                <div className="text-sm font-semibold">Free run complete.</div>
                <p className="text-sm text-zinc-600">
                  See what breaks first. Track it over time. Stop repeating it
                  with Pro.
                </p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:border-zinc-400"
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
            <h2 className="text-lg font-semibold text-zinc-900">Active run</h2>
            <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500">
              Inactive
            </span>
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            Start a protocol to begin a run.
          </p>
        </>
      )}
    </section>
  );
}

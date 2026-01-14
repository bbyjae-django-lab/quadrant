import type { RunHistoryRow } from "../../types";

type RunHistorySectionProps = {
  collapsed: boolean;
  count: number;
  rows: RunHistoryRow[];
  onToggle: () => void;
  onRowClick: (rowId: string) => void;
};

export default function RunHistorySection({
  collapsed,
  count,
  rows,
  onToggle,
  onRowClick,
}: RunHistorySectionProps) {
  return (
    <section className="ui-surface p-[var(--space-6)]">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Run history ({count})
        </h2>
        <span className="text-sm text-zinc-500">{collapsed ? ">" : "v"}</span>
      </button>
      {!collapsed ? (
        <>
        <div className="mt-2 text-xs font-semibold tracking-wide text-zinc-400">
            Recent
          </div>
        <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)]">
            {rows.length > 0 ? (
              <div className="divide-y divide-zinc-100 text-sm text-zinc-600">
                {rows.map((row) => {
                  const dayNumber =
                    row.result === "Failed"
                      ? Math.max(row.days + 1, 1)
                      : Math.max(row.days, 1);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className="w-full cursor-pointer px-[var(--space-4)] py-[var(--space-3)] text-left hover:bg-zinc-50"
                      onClick={() => onRowClick(row.id)}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-zinc-900">
                          {row.protocol}
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-zinc-400">
                          {row.result}
                        </span>
                        <span className="text-xs font-semibold text-zinc-400">
                          Day {dayNumber}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-sm text-zinc-500">
                No runs recorded yet.
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

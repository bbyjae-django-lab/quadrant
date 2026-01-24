type ActiveRunSectionProps = {
  loading?: boolean;
  status: "active" | "ended" | "idle";
  protocolName?: string;
  ruleSummary?: string;
  sessionCount?: number;
  failureSession?: number;
  sectionId?: string;
  onLogSession: () => void;
  onStartRun: () => void;
};

export default function ActiveRunSection({
  loading = false,
  status,
  protocolName,
  ruleSummary,
  sessionCount = 0,
  failureSession,
  sectionId,
  onLogSession,
  onStartRun,
}: ActiveRunSectionProps) {
  if (loading && status !== "active") {
    return (
      <section className="ui-surface p-[var(--space-6)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Active run</h2>
        </div>
        <p className="mt-2 text-sm text-zinc-600">Loading...</p>
      </section>
    );
  }

  return (
    <section
      id={sectionId}
      className="ui-surface p-[var(--space-6)]"
    >
      {status === "active" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Active run</h2>
            <span className="rounded-[var(--radius-pill)] border border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-zinc-500">
              Active
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold text-zinc-900">
            {protocolName}
          </div>
          {ruleSummary ? (
            <div className="mt-2 max-w-full whitespace-normal break-words text-sm text-zinc-700">
              {ruleSummary}
            </div>
          ) : null}
          <div className="mt-3 text-xs font-medium text-zinc-500">
            Sessions logged: {sessionCount}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onLogSession}
            >
              Log session
            </button>
          </div>
        </>
      ) : status === "ended" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Run ended</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="text-sm font-semibold text-zinc-900">
              {protocolName}
            </div>
            <div className="text-sm text-zinc-600">
              Violation — Session {failureSession ?? 1}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onStartRun}
            >
              Start another run
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">
              No active run.
            </h2>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Select one protocol to enforce this session.
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

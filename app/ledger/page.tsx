"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../providers/AuthProvider";
import { getSupabaseClient } from "../lib/supabaseClient";
import AuthModal from "../components/modals/AuthModal";

type LedgerRun = {
  id: string;
  protocolName: string;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  status: string;
  sessions: number;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return [weekday, day, month].filter(Boolean).join(" ");
};

const getLedgerResult = (run: Pick<LedgerRun, "endReason" | "status">) => {
  if (run.endReason === "violation") {
    return { label: "Violation", className: "text-zinc-700" };
  }

  if (run.endReason === "ended") {
    return { label: "Ended", className: "text-zinc-500" };
  }

  // Future-proof fallback (in case endReason is null but status is ended)
  if (run.status === "ended") {
    return { label: "Ended", className: "text-zinc-500" };
  }

  return { label: "", className: "" };
};

export default function LedgerPage() {
  const router = useRouter();
  const { user, isAuthed, authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<LedgerRun[]>([]);
  const [showAuth, setShowAuth] = useState(false);

  const client = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthed || !user?.id) {
      setShowAuth(true);
      setLoading(false);
      return;
    }
    if (!client) {
      setRuns([]);
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: runRows } = await client
        .from("runs")
        .select("id, protocol_name, started_at, ended_at, end_reason, status")
        .eq("user_id", user.id)
        .eq("status", "ended")
        .order("started_at", { ascending: false })
        .limit(100);
      const runsData = Array.isArray(runRows) ? runRows : [];
      const runIds = runsData.map((row) => row.id);
      const sessionsByRun = new Map<string, number>();
      if (runIds.length) {
        const { data: checkinRows } = await client
          .from("checkins")
          .select("run_id")
          .eq("user_id", user.id)
          .in("run_id", runIds);
        if (Array.isArray(checkinRows)) {
          checkinRows.forEach((row) => {
            const runId = (row as { run_id: string }).run_id;
            sessionsByRun.set(runId, (sessionsByRun.get(runId) ?? 0) + 1);
          });
        }
      }
      if (!active) {
        return;
      }
      const nextRuns = runsData.map((row) => ({
        id: row.id,
        protocolName: row.protocol_name,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        endReason: row.end_reason,
        status: row.status,
        sessions: sessionsByRun.get(row.id) ?? 0,
      }));
      setRuns(nextRuns);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [authLoading, client, isAuthed, router, user?.id]);

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-8)] ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="text-xs text-zinc-500">
          <button type="button" className="underline" onClick={() => router.back()}>
            Back
          </button>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Ledger</h1>
          <p className="text-sm text-zinc-600">
            History that survives resets, devices, and bad weeks.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : runs.length === 0 ? (
          <div className="text-sm text-zinc-600">
            <p>No ledger yet.</p>
            <p className="mt-1">Your completed runs will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-zinc-700">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <tr className="border-b border-[var(--border-color)]">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Protocol</th>
                  <th className="py-3 pr-4">Sessions</th>
                  <th className="py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-[var(--border-color)]">
                    <td className="py-3 pr-4">
                      {formatDate(run.endedAt ?? run.startedAt)}
                    </td>
                    <td className="py-3 pr-4">{run.protocolName}</td>
                    <td className="py-3 pr-4">{run.sessions}</td>
                    <td className="py-3">
  {(() => {
    const result = getLedgerResult(run);
    return result.label ? (
      <span className={result.className}>{result.label}</span>
    ) : null;
  })()}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      {showAuth ? (
        <AuthModal
          title="Attach to your record"
          next="/ledger"
          onClose={() => setShowAuth(false)}
        />
      ) : null}
    </div>
  );
}

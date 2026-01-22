"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PROTOCOLS } from "@/lib/protocols";
import { LocalRunStore } from "@/lib/stores/localRunStore";
import { SupabaseRunStore } from "@/lib/stores/supabaseRunStore";
import type { CheckinResult, Protocol, Run } from "@/lib/types";
import { useAuth } from "../providers/AuthProvider";
import DailyCheckInModal from "./modals/DailyCheckInModal";

const formatTimestamp = (iso?: string) => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }
  return date.toLocaleString();
};

const getViolationIndex = (run: Run) => {
  const violated = run.checkins.find((checkin) => checkin.result === "violated");
  if (violated?.index) {
    return violated.index;
  }
  return Math.max(run.checkins.length, 1);
};

export default function QuadrantApp({
  view,
}: {
  view: "dashboard" | "protocols";
}) {
  const router = useRouter();
  const { user, isAuthed, authLoading, signOut } = useAuth();
  const store = useMemo(() => {
    if (isAuthed && user?.id) {
      return new SupabaseRunStore(user.id);
    }
    return new LocalRunStore();
  }, [isAuthed, user?.id]);
  const storeRef = useRef(store);

  const [hydrating, setHydrating] = useState(true);
  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [runHistory, setRunHistory] = useState<Run[]>([]);
  const [expandedProtocolId, setExpandedProtocolId] = useState<string | null>(
    null,
  );
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [ledgerCollapsed, setLedgerCollapsed] = useState(true);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    let active = true;
    setHydrating(true);
    store
      .hydrate()
      .then(() => {
        if (!active) {
          return;
        }
        setActiveRun(store.getActiveRun());
        setRunHistory(store.getRuns());
        setHydrating(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setActiveRun(null);
        setRunHistory([]);
        setHydrating(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, store]);

  useEffect(() => {
    if (view !== "protocols" || hydrating) {
      return;
    }
    if (activeRun) {
      router.replace("/dashboard");
    }
  }, [activeRun, hydrating, router, view]);

  const latestEndedRun = runHistory[0] ?? null;

  const refreshRuns = () => {
    setActiveRun(storeRef.current.getActiveRun());
    setRunHistory(storeRef.current.getRuns());
  };

  const handleStartRun = async (protocol: Protocol) => {
    if (hydrating || isStarting) {
      return;
    }
    if (activeRun) {
      router.replace("/dashboard");
      return;
    }
    setActionError("");
    setIsStarting(true);
    try {
      const run = await storeRef.current.startRun(protocol);
      setActiveRun(run);
      setRunHistory(storeRef.current.getRuns());
      setExpandedProtocolId(null);
      router.replace("/dashboard");
    } catch {
      setActionError("Unable to start run.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCheckIn = async (result: CheckinResult) => {
    if (!activeRun) {
      return;
    }
    setActionError("");
    try {
      const updated = await storeRef.current.addCheckin(
        activeRun.id,
        result,
        checkInNote,
      );
      setCheckInNote("");
      if (updated.status === "active") {
        setActiveRun(updated);
      } else {
        setActiveRun(null);
      }
      setRunHistory(storeRef.current.getRuns());
      setShowCheckInModal(false);
    } catch {
      setActionError("Unable to log session.");
    }
  };

  const handleCloseRunDetail = () => {
    setSelectedRun(null);
  };

  if (view === "protocols") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-[var(--space-6)] text-zinc-900">
        <main className="w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
          <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
            <span>Protocol library</span>
            <a href="/about" className="btn-tertiary">
              About Quadrant
            </a>
          </div>
          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-zinc-900">
                Protocol library
              </h1>
              <p className="text-sm text-zinc-600">
                Select one protocol to start a run.
              </p>
            </div>
            <div className="space-y-3">
              {PROTOCOLS.map((protocol) => {
                const isExpanded = protocol.id === expandedProtocolId;
                return (
                  <div
                    key={protocol.id}
                    className={`rounded-[var(--radius-card)] border transition ${
                      isExpanded
                        ? "border-[var(--border-color)] bg-zinc-50"
                        : "border-[var(--border-color)] bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-[var(--space-4)] py-[var(--space-3)] text-left hover:bg-zinc-50"
                      onClick={() => {
                        setExpandedProtocolId(
                          isExpanded ? null : protocol.id,
                        );
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">
                          {protocol.name}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {protocol.summary}
                        </div>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {isExpanded ? "v" : ">"}
                      </span>
                    </button>
                    {isExpanded ? (
                      <div className="border-t border-[var(--border-color)] bg-zinc-50 px-[var(--space-4)] py-[var(--space-4)]">
                        <p className="text-sm text-zinc-700 whitespace-pre-line">
                          {protocol.details}
                        </p>
                        <div className="flex flex-wrap gap-3 pt-4">
                          <button
                            type="button"
                            className="btn btn-primary text-sm"
                            disabled={isStarting || hydrating}
                            onClick={() => {
                              void handleStartRun(protocol);
                            }}
                          >
                            {isStarting ? "Activating…" : "Activate protocol"}
                          </button>
                        </div>
                        {actionError ? (
                          <p className="mt-3 text-xs font-semibold text-zinc-500">
                            {actionError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const sessionNumber = activeRun ? activeRun.checkins.length + 1 : 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-[var(--space-6)] text-zinc-900">
      <main className="w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span>Dashboard</span>
          <div className="flex items-center gap-3">
            {isAuthed ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Signed in</span>
                <button
                  type="button"
                  className="btn-tertiary"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
            <a href="/about" className="btn-tertiary">
              About Quadrant
            </a>
          </div>
        </div>

        <section className="mt-8 space-y-6">
          {hydrating ? (
            <div className="ui-surface p-[var(--space-6)]">
              <h2 className="text-lg font-semibold text-zinc-900">
                Active run
              </h2>
              <p className="mt-2 text-sm text-zinc-600">Loading…</p>
            </div>
          ) : activeRun ? (
            <div className="ui-surface p-[var(--space-6)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Active run
                </h2>
                <span className="rounded-[var(--radius-pill)] border border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-zinc-500">
                  Active
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold text-zinc-900">
                {activeRun.protocolName}
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                Session {sessionNumber}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => setShowCheckInModal(true)}
                >
                  Log session
                </button>
              </div>
              {!isAuthed ? (
                <p className="mt-3 text-xs text-zinc-500">
                  Saved on this device only.
                </p>
              ) : null}
            </div>
          ) : latestEndedRun ? (
            <div className="ui-surface p-[var(--space-6)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Run ended
                </h2>
                <span className="text-xs font-semibold text-zinc-500">
                  {formatTimestamp(latestEndedRun.endedAt)}
                </span>
              </div>
              <div className="mt-3 text-sm text-zinc-600">
                Violation on Session {getViolationIndex(latestEndedRun)}
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {latestEndedRun.protocolName}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => router.push("/protocols")}
                >
                  Start another run
                </button>
                {!isAuthed ? (
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => router.push("/pricing?from=dashboard")}
                  >
                    Upgrade to Pro to preserve your record
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="ui-surface p-[var(--space-6)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">
                  No active run
                </h2>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Select one protocol to enforce today.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => router.push("/protocols")}
                >
                  Start a run
                </button>
                <a href="/about" className="btn-tertiary text-sm">
                  How this works
                </a>
              </div>
            </div>
          )}

          {isAuthed ? (
            <div className="ui-surface p-[var(--space-6)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900">Ledger</h2>
                <button
                  type="button"
                  className="btn-tertiary text-sm"
                  onClick={() => setLedgerCollapsed((prev) => !prev)}
                >
                  {ledgerCollapsed ? "Show" : "Hide"}
                </button>
              </div>
              {ledgerCollapsed ? null : runHistory.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">
                  No runs yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {runHistory.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-color)] bg-white px-[var(--space-4)] py-[var(--space-3)] text-left"
                      onClick={() => setSelectedRun(run)}
                    >
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">
                          {run.protocolName}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {run.status === "ended" ? "Violation" : run.status}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Sessions: {run.checkins.length}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </main>

      {showCheckInModal && activeRun ? (
        <DailyCheckInModal
          checkInNote={checkInNote}
          onChangeNote={setCheckInNote}
          onClose={() => setShowCheckInModal(false)}
          onCleanSession={() => handleCheckIn("clean")}
          onViolated={() => handleCheckIn("violated")}
        />
      ) : null}

      {selectedRun ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
          <div
            role="dialog"
            aria-modal="true"
            data-quadrant-modal
            className="w-full max-w-xl ui-modal p-[var(--space-6)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-zinc-500">
                  Run detail
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
                  {selectedRun.protocolName}
                </h2>
              </div>
              <button
                type="button"
                className="btn-tertiary"
                aria-label="Close"
                onClick={handleCloseRunDetail}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm text-zinc-700">
              <div>
                <div className="text-xs font-semibold tracking-wide text-zinc-500">
                  Status
                </div>
                <div className="mt-1">
                  {selectedRun.status === "ended" ? "Violation" : selectedRun.status}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wide text-zinc-500">
                  Sessions
                </div>
                <div className="mt-2 space-y-2">
                  {selectedRun.checkins.map((checkin) => (
                    <div
                      key={`${selectedRun.id}-${checkin.index}`}
                      className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-white p-[var(--space-3)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-900">
                          Session {checkin.index}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {checkin.result === "violated" ? "Violation" : "Clean"}
                        </span>
                      </div>
                      {checkin.note ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          {checkin.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

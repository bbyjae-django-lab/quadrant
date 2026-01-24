"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PROTOCOLS } from "@/lib/protocols";
import { LocalRunStore } from "@/lib/stores/localRunStore";
import { SupabaseRunStore } from "@/lib/stores/supabaseRunStore";
import type { CheckinResult, Run } from "@/lib/types";
import { useAuth } from "../providers/AuthProvider";
import DailyCheckInModal from "./modals/DailyCheckInModal";

const getViolationIndex = (run: Run) => {
  const violated = run.checkins.find((checkin) => checkin.result === "violated");
  if (violated?.index) {
    return violated.index;
  }
  return Math.max(run.checkins.length, 1);
};

export default function QuadrantApp() {
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
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");

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

  const latestEndedRun = runHistory[0] ?? null;
  const sessionNumber = activeRun ? activeRun.checkins.length + 1 : 1;
  const activeRule = activeRun
    ? PROTOCOLS.find((protocol) => protocol.id === activeRun.protocolId)?.rule ??
      ""
    : "";

  const handleCheckIn = async (result: CheckinResult) => {
    if (!activeRun) {
      return;
    }
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
      // no-op
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-[var(--space-6)] text-zinc-900">
      <main className="w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="flex items-center justify-end text-sm font-medium text-zinc-500">
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
              <h2 className="text-lg font-semibold text-zinc-900">Active run</h2>
              <p className="mt-2 text-sm text-zinc-600">Loading…</p>
            </div>
          ) : activeRun ? (
            <div>
              <div className="ui-surface p-[var(--space-6)]">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Active run
                </h2>
                <div className="mt-3 text-sm font-semibold text-zinc-900">
                  {activeRun.protocolName}
                </div>
                <div className="mt-2 text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">Rule:</span>{" "}
                  {activeRule}
                </div>
                <div className="mt-2 text-sm text-zinc-600">
                  Current session: {sessionNumber}
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
              </div>
            </div>
          ) : latestEndedRun ? (
            <div className="ui-surface p-[var(--space-6)]">
              <h2 className="text-lg font-semibold text-zinc-900">Run ended</h2>
              <div className="mt-3 text-sm font-semibold text-zinc-900">
                {latestEndedRun.protocolName}
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                Violation on Session {getViolationIndex(latestEndedRun)}
              </div>
              <div className="mt-2 text-sm text-zinc-600">
                Constraint broken. Record preserved.
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
                  <a href="/pricing" className="text-sm text-zinc-600 underline">
                    Save your ledger with Pro
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="ui-surface p-[var(--space-6)]">
              <h2 className="text-lg font-semibold text-zinc-900">
                No active run
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Select one constraint to enforce next session.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => router.push("/protocols")}
                >
                  Start a run
                </button>
                <a href="/pricing" className="btn-tertiary text-sm">
                  How this works
                </a>
              </div>
            </div>
          )}
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
    </div>
  );
}

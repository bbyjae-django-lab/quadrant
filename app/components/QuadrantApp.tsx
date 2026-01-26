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
  const { user, isAuthed, authLoading } = useAuth();
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

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const current = `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem("quadrant_app_return_to", current);
    const returnTo = sessionStorage.getItem("quadrant_return_to");
    if (returnTo === current) {
      sessionStorage.removeItem("quadrant_return_to");
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    let active = true;
    setHydrating(true);
    if (!isAuthed) {
      store.clearLocalAppKeys();
    }
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
      const updated = await storeRef.current.addCheckin(activeRun.id, result);
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
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="flex items-center justify-end text-xs text-zinc-500">
          {isAuthed ? (
            <a href="/account" className="underline">
              Account
            </a>
          ) : (
            <a href="/auth?returnTo=/dashboard" className="underline">
              Sign in
            </a>
          )}
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
                <div className="mt-2 text-sm text-zinc-700">{activeRule}</div>
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
              </div>
            </div>
          ) : latestEndedRun ? (
            <div className="ui-surface p-[var(--space-6)]">
              <h2 className="text-lg font-semibold text-zinc-900">Run ended</h2>
              <div className="mt-3 text-sm text-zinc-600">
                Violation — Session {getViolationIndex(latestEndedRun)}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => router.push("/protocols")}
                >
                  Start another run
                </button>
              </div>
            </div>
          ) : (
            <div className="ui-surface p-[var(--space-6)]">
              <h2 className="text-lg font-semibold text-zinc-900">
                No active run
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => router.push("/protocols")}
                >
                  Start a run
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {showCheckInModal && activeRun ? (
        <DailyCheckInModal
          onClose={() => setShowCheckInModal(false)}
          onCleanSession={() => handleCheckIn("clean")}
          onViolated={() => handleCheckIn("violated")}
        />
      ) : null}
    </div>
  );
}

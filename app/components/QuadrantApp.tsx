"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
  const { user, session, isAuthed, authLoading, isPro, proStatus } = useAuth();
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
  const [showEndRunConfirm, setShowEndRunConfirm] = useState(false);
  const [endingRun, setEndingRun] = useState(false);
  const [suppressEndedState, setSuppressEndedState] = useState(false);

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
    if (activeRun) {
      setSuppressEndedState(false);
    }
  }, [activeRun]);

  const latestEndedRun = suppressEndedState ? null : runHistory[0] ?? null;
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
        setSuppressEndedState(false);
      }
      setRunHistory(storeRef.current.getRuns());
      setShowCheckInModal(false);
    } catch {
      // no-op
    }
  };

  const handleEndRun = async () => {
    if (!activeRun || endingRun) {
      return;
    }
    const accessToken = session?.access_token;
    if (!accessToken) {
      router.push("/auth?returnTo=/dashboard");
      return;
    }
    setEndingRun(true);
    try {
      const response = await fetch("/api/runs/end", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        console.error("[runs/end] request failed", response.status, payload);
        return;
      }
      if (payload?.ok || payload?.alreadyEnded) {
        try {
          await storeRef.current.hydrate();
        } catch {
          // no-op
        }
        setActiveRun(null);
        setShowEndRunConfirm(false);
        setSuppressEndedState(true);
      } else {
        console.error("[runs/end] unexpected response", payload);
      }
    } catch (error) {
      console.error("[runs/end] request error", error);
    } finally {
      setEndingRun(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="flex items-center justify-end gap-4 text-xs text-zinc-500">
          {isAuthed && proStatus === "pro" ? (
            <a href="/ledger" className="underline">
              View ledger
            </a>
          ) : null}
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
                <div className="mt-2 text-xs text-zinc-500">
                  {showEndRunConfirm ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        End this run now? This will be recorded as ended.
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setShowEndRunConfirm(false)}
                          disabled={endingRun}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="underline"
                          onClick={handleEndRun}
                          disabled={endingRun}
                        >
                          {endingRun ? "Ending..." : "End run"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setShowEndRunConfirm(true)}
                    >
                      End run
                    </button>
                  )}
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
              {!isAuthed ? (
                <Link
                  href="/pricing?intent=upgrade&returnTo=/dashboard"
                  className="mt-3 inline-block text-xs text-zinc-500 underline"
                >
                  Upgrade to Pro
                </Link>
              ) : proStatus === "unknown" ? (
                <p className="mt-3 text-xs text-zinc-500">Checking plan...</p>
              ) : isPro ? null : (
                <Link
                  href="/pricing?intent=upgrade&returnTo=/dashboard"
                  className="mt-3 inline-block text-xs text-zinc-500 underline"
                >
                  Upgrade to Pro
                </Link>
              )}
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

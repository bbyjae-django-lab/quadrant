"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PROTOCOLS, PROTOCOL_BY_ID } from "@/lib/protocols";
import { getFailureInsight, getLongestCleanRun } from "@/lib/insights";
import { QUADRANT_RESUME_CONTEXT } from "@/lib/keys";
import type { CheckinResult, Protocol, Run } from "@/lib/types";
import { LocalRunStore } from "@/lib/stores/localRunStore";
import { SupabaseRunStore } from "@/lib/stores/supabaseRunStore";
import type { RunStore } from "@/lib/stores/runStore";

import { useAuth } from "../providers/AuthProvider";
import AuthModal from "./modals/AuthModal";
import DailyCheckInModal from "./modals/DailyCheckInModal";
import ActiveRunSection from "./today/ActiveRunSection";
import PatternInsightsSection from "./today/PatternInsightsSection";
import ProtocolLibrarySection from "./today/ProtocolLibrarySection";
import RunHistorySection from "./today/RunHistorySection";

type ResumeContext = {
  protocolName: string;
  failedSession: number;
  endedAt?: string;
};

const getFailedSession = (run: Run) => {
  for (let i = 0; i < run.checkins.length; i += 1) {
    if (run.checkins[i]?.result === "violated") {
      return run.checkins[i]?.index ?? 1;
    }
  }
  return Math.max(run.checkins.length, 1);
};

const getRuleSummary = (protocol: Protocol | null) => {
  if (!protocol) {
    return "";
  }
  return protocol.summary;
};

export default function QuadrantApp({
  view,
}: {
  view: "dashboard" | "protocols";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthed, authLoading, isPro, signOut } = useAuth();

  const [activeRun, setActiveRun] = useState<Run | null>(null);
  const [runHistory, setRunHistory] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [libraryProtocolId, setLibraryProtocolId] = useState<string | null>(
    null,
  );
  const [resumeContext, setResumeContext] = useState<ResumeContext | null>(
    null,
  );
  const [isRunHistoryCollapsed, setIsRunHistoryCollapsed] = useState(false);
  const [isInsightsCollapsed, setIsInsightsCollapsed] = useState(false);
  const [isProtocolLibraryCollapsed, setIsProtocolLibraryCollapsed] =
    useState(false);
  const showLoading = authLoading || loading;

  const store = useMemo<RunStore | null>(() => {
    if (authLoading) {
      return null;
    }
    if (isAuthed && user?.id) {
      return new SupabaseRunStore(user.id);
    }
    return new LocalRunStore();
  }, [authLoading, isAuthed, user?.id]);

  useEffect(() => {
    if (!store) {
      return;
    }
    let active = true;
    const hydrate = async () => {
      setLoading(true);
      await store.hydrate();
      if (!active) {
        return;
      }
      const nextActiveRun = store.getActiveRun();
      const nextHistory = store.getRunHistory();
      setActiveRun(nextActiveRun);
      setRunHistory(nextHistory);
      if (isAuthed && !nextActiveRun && nextHistory.length === 0) {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(QUADRANT_RESUME_CONTEXT);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as ResumeContext;
              if (parsed && parsed.protocolName) {
                setResumeContext(parsed);
                localStorage.removeItem(QUADRANT_RESUME_CONTEXT);
              }
            } catch {
              localStorage.removeItem(QUADRANT_RESUME_CONTEXT);
            }
          }
        }
      } else {
        setResumeContext(null);
      }
      setLoading(false);
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [store, isAuthed]);

  const orderedProtocols = useMemo(
    () => [...PROTOCOLS].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const latestEndedRun = runHistory[0] ?? null;
  const activeProtocol = activeRun
    ? PROTOCOL_BY_ID[activeRun.protocolId] ?? null
    : null;
  const activeRuleSummary = getRuleSummary(activeProtocol);
  const cleanSessions = activeRun
    ? activeRun.checkins.filter((checkin) => checkin.result === "clean").length
    : 0;

  const status = activeRun
    ? "active"
    : latestEndedRun || resumeContext
      ? "ended"
      : "idle";
  const endedProtocolName =
    latestEndedRun?.protocolName ?? resumeContext?.protocolName ?? "";
  const endedFailureSession =
    latestEndedRun ? getFailedSession(latestEndedRun) : resumeContext?.failedSession;

  const runHistoryRows = runHistory.map((run) => ({
    id: run.id,
    protocolName: run.protocolName,
    failedSession: getFailedSession(run),
  }));

  const handleActivateProtocol = async (protocolId: string) => {
    if (!store) {
      return;
    }
    const protocol = PROTOCOL_BY_ID[protocolId];
    if (!protocol) {
      return;
    }
    try {
      const run = await store.startRun(protocol);
      setActiveRun(run);
      setRunHistory(store.getRunHistory());
      router.push("/dashboard");
    } catch {
      return;
    }
  };

  const handleLogSession = async (result: CheckinResult) => {
    if (!store) {
      return;
    }
    if (!activeRun) {
      return;
    }
    try {
      const updated = await store.addCheckin(
        activeRun.id,
        result,
        checkInNote,
      );
      setCheckInNote("");
      setShowCheckInModal(false);
      if (updated.status === "ended") {
        setActiveRun(null);
        setRunHistory(store.getRunHistory());
        return;
      }
      setActiveRun(updated);
    } catch {
      return;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    const localStore = new LocalRunStore();
    localStore.clearLocalAppKeys();
    setActiveRun(null);
    setRunHistory([]);
    setResumeContext(null);
  };

  const failureInsight = getFailureInsight(runHistory);
  const longestClean = getLongestCleanRun(runHistory);
  const insights = [
    {
      title: "Where runs usually fail",
      value: failureInsight,
    },
    {
      title: "Longest clean run",
      value: `${longestClean} session${longestClean === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-[var(--space-6)] text-zinc-900">
      <main className="w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span>{view === "dashboard" ? "Dashboard" : ""}</span>
          <div className="flex items-center gap-3">
            {isAuthed ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Signed in</span>
                <button
                  type="button"
                  className="btn-tertiary"
                  onClick={() => {
                    void handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : null}
            <a
              href="/about"
              className="btn-tertiary"
              onClick={() => {
                if (typeof window === "undefined") {
                  return;
                }
                const target = pathname;
                sessionStorage.setItem("about_return_to", target);
              }}
            >
              About Quadrant
            </a>
          </div>
        </div>

        {view === "dashboard" && (
          <section className="mt-8 space-y-6">
            <ActiveRunSection
              status={status}
              protocolName={
                status === "active" ? activeRun?.protocolName : endedProtocolName
              }
              ruleSummary={activeRuleSummary}
              sessionCount={cleanSessions}
              failureSession={endedFailureSession}
              loading={showLoading}
              sectionId="active-run"
              onLogSession={() => setShowCheckInModal(true)}
              onStartRun={() => {
                const target = document.getElementById("protocol-library");
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            <div className="space-y-10">
              <RunHistorySection
                collapsed={isRunHistoryCollapsed}
                count={runHistoryRows.length}
                rows={runHistoryRows}
                loading={showLoading}
                onToggle={() =>
                  setIsRunHistoryCollapsed((collapsed) => !collapsed)
                }
                onRowClick={() => {}}
                footer={
                  !isAuthed ? (
                    <button
                      type="button"
                      className="btn-tertiary"
                      onClick={() => setShowAuthModal(true)}
                    >
                      Sign in to preserve history
                    </button>
                  ) : null
                }
              />
              {isAuthed && isPro ? (
                <PatternInsightsSection
                  collapsed={isInsightsCollapsed}
                  onToggle={() =>
                    setIsInsightsCollapsed((collapsed) => !collapsed)
                  }
                  insights={insights}
                />
              ) : null}
              <ProtocolLibrarySection
                collapsed={isProtocolLibraryCollapsed}
                protocols={orderedProtocols}
                libraryProtocolId={libraryProtocolId}
                canActivate={status !== "active"}
                onActivateProtocol={handleActivateProtocol}
                sectionId="protocol-library"
                onToggle={() =>
                  setIsProtocolLibraryCollapsed((collapsed) => !collapsed)
                }
                onSelectProtocol={setLibraryProtocolId}
              />
            </div>
          </section>
        )}

        {view === "protocols" && (
          <section className="mt-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-zinc-900">
                Protocol library
              </h1>
              <p className="text-sm text-zinc-600">
                Select one protocol to start a run.
              </p>
            </div>
            <div className="space-y-3">
              {orderedProtocols.map((protocol) => {
                const isExpanded = protocol.id === libraryProtocolId;
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
                        setLibraryProtocolId(isExpanded ? null : protocol.id);
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
                        <div className="border-l border-[var(--border-color)] pl-[var(--space-4)]">
                          <div className="space-y-2 text-sm text-zinc-700">
                            <div className="text-xs font-semibold tracking-wide text-zinc-500">
                              Summary
                            </div>
                            <div>{protocol.summary}</div>
                            {protocol.details
                              .split("\n")
                              .filter((line) => line.trim().length > 0)
                              .map((line, index) => (
                                <div key={`${protocol.id}-detail-${index}`}>
                                  {line}
                                </div>
                              ))}
                          </div>
                          <div className="flex flex-wrap gap-3 pt-4">
                            <button
                              type="button"
                              className="btn btn-primary text-sm"
                              onClick={() => void handleActivateProtocol(protocol.id)}
                              disabled={status === "active"}
                            >
                              Activate protocol
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
      {showCheckInModal && view === "dashboard" ? (
        <DailyCheckInModal
          checkInNote={checkInNote}
          onChangeNote={setCheckInNote}
          onClose={() => setShowCheckInModal(false)}
          onCleanSession={() => void handleLogSession("clean")}
          onViolated={() => void handleLogSession("violated")}
        />
      ) : null}
      {showAuthModal ? (
        <AuthModal
          title="Sign in to preserve history"
          onClose={() => setShowAuthModal(false)}
        />
      ) : null}
    </div>
  );
}

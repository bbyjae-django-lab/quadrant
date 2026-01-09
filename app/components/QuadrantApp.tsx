"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { problemIndex } from "../data/problemIndex";
import { protocolById, protocols } from "../data/protocols";

const RUN_LENGTH = 5;

type RunEndContext = {
  result: "Failed" | "Completed";
  cleanDays: number;
};

type RunEndCopy = {
  title: string;
  outcomePrefix: string;
  outcomeHighlight: string;
  outcomeSuffix: string;
  reframeLines: string[];
  primaryLabel: string;
  primarySubtext: string;
  secondaryLabel: string;
};

const RUN_END_INSIGHT_LINE =
  "Most traders need 5–10 runs before patterns become obvious.";

const getRunEndCopy = (context: RunEndContext): RunEndCopy => {
  const dayIndex = context.cleanDays;

  if (context.result === "Completed" && dayIndex === RUN_LENGTH) {
    return {
      title: "Run complete",
      outcomePrefix: "You completed ",
      outcomeHighlight: String(RUN_LENGTH),
      outcomeSuffix: " clean trading days under this protocol.",
      reframeLines: [
        "This proves you can follow rules when they’re enforced.",
        "The question now is whether this repeats — or fades.",
      ],
      primaryLabel: "Continue tracking — $19/month",
      primarySubtext: "Turn one run into a pattern.",
      secondaryLabel: "Close",
    };
  }

  const failureDay = Math.min(dayIndex + 1, RUN_LENGTH);

  if (dayIndex === 0) {
    return {
      title: "Run ended",
      outcomePrefix: "You violated the protocol on day ",
      outcomeHighlight: String(failureDay),
      outcomeSuffix: ` of ${RUN_LENGTH}.`,
      reframeLines: [
        "That’s common.",
        "Early failures usually mean the rule exposed a real reflex. That’s the point.",
        RUN_END_INSIGHT_LINE,
      ],
      primaryLabel: "Keep run history — $19/month",
      primarySubtext: "See what keeps breaking first.",
      secondaryLabel: "Close and reset",
    };
  }

  if (dayIndex >= 3 && dayIndex < RUN_LENGTH) {
    return {
      title: "Run ended",
      outcomePrefix: "You violated the protocol on day ",
      outcomeHighlight: String(failureDay),
      outcomeSuffix: ` of ${RUN_LENGTH}.`,
      reframeLines: [
        "You were close.",
        "This is where patterns usually show up — right before completion.",
        "What matters now is whether you let this reset silently… or keep the evidence.",
      ],
      primaryLabel: "Keep run history — $19/month",
      primarySubtext: "Don’t lose this run.",
      secondaryLabel: "Close and start over",
    };
  }

  return {
    title: "Run ended",
    outcomePrefix: "You violated the protocol on day ",
    outcomeHighlight: String(failureDay),
    outcomeSuffix: ` of ${RUN_LENGTH}.`,
    reframeLines: [
      "That’s common.",
      "Early failures usually mean the rule exposed a real reflex. That’s the point.",
      RUN_END_INSIGHT_LINE,
    ],
    primaryLabel: "Keep run history — $19/month",
    primarySubtext: "See what keeps breaking first.",
    secondaryLabel: "Close and reset",
  };
};

const storageKeys = [
  "activeProblemId",
  "activeProtocolId",
  "activatedAt",
  "runStatus",
  "runStartDate",
  "streak",
  "checkIns",
  "runHistory",
  "lastCheckInDate",
  "lastCheckInFollowed",
  "lastCheckInNote",
  "runActive",
  "runDay",
  "activeArchetypeId",
];

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPreviousDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const getDateOffset = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const buildRunTracker = (
  startDate: string | null,
  length: number,
  checkIns: Record<string, { followed: boolean; note?: string }>,
) => {
  if (!startDate) {
    return Array.from({ length }, () => "▢");
  }
  return Array.from({ length }, (_, index) => {
    const dateKey = getDateOffset(startDate, index);
    const entry = checkIns[dateKey];
    if (!entry) {
      return "▢";
    }
    return entry.followed ? "✓" : "✕";
  });
};

const buildHistoryStrip = (
  cleanDays: number,
  result: "Completed" | "Failed" | "Ended",
  length: number,
) => {
  const symbols = Array.from({ length }, () => "▢");
  const filled = Math.min(cleanDays, length);
  for (let i = 0; i < filled; i += 1) {
    symbols[i] = "✓";
  }
  if (result === "Failed" && cleanDays < length) {
    symbols[cleanDays] = "✕";
  }
  return symbols;
};

const computeCurrentRun = (
  checkIns: Record<string, { followed: boolean; note?: string }>,
  todayKey: string,
) => {
  if (!checkIns[todayKey]?.followed) {
    return 0;
  }
  let count = 0;
  let cursor = todayKey;
  while (checkIns[cursor]?.followed) {
    count += 1;
    cursor = getPreviousDate(cursor);
  }
  return count;
};

const computeBestRun = (
  checkIns: Record<string, { followed: boolean; note?: string }>,
) => {
  const keys = Object.keys(checkIns).sort();
  let best = 0;
  let current = 0;
  let previousKey: string | null = null;
  for (const key of keys) {
    const entry = checkIns[key];
    if (!entry.followed) {
      current = 0;
      previousKey = key;
      continue;
    }
    if (previousKey && getPreviousDate(key) === previousKey && current > 0) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > best) {
      best = current;
    }
    previousKey = key;
  }
  return best;
};

export default function QuadrantApp({
  view,
}: {
  view: "dashboard" | "protocols";
}) {
  const router = useRouter();
  const [confirmProtocolId, setConfirmProtocolId] = useState<string | null>(
    null,
  );
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(null);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [checkInFollowed, setCheckInFollowed] = useState<boolean | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [runStatus, setRunStatus] = useState<
    "idle" | "active" | "failed" | "completed" | "ended"
  >("idle");
  const [runStartDate, setRunStartDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [checkIns, setCheckIns] = useState<
    Record<string, { followed: boolean; note?: string }>
  >({});
  const [hasCompletedRun, setHasCompletedRun] = useState(false);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [libraryProtocolId, setLibraryProtocolId] = useState<string | null>(
    null,
  );
  const [showRunDetail, setShowRunDetail] = useState(false);
  const [showRunEndedModal, setShowRunEndedModal] = useState(false);
  const [runEndContext, setRunEndContext] = useState<RunEndContext | null>(
    null,
  );
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showEndRunConfirm, setShowEndRunConfirm] = useState(false);
  const [runHistory, setRunHistory] = useState<
    Array<{
      id: string;
      protocolId: string;
      protocolName: string;
      startedAt: string | null;
      endedAt: string;
      result: "Completed" | "Failed" | "Ended";
      cleanDays: number;
      notes?: Array<{ date: string; note: string }>;
    }>
  >([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedActiveProblemId = localStorage.getItem("activeProblemId");
    const storedProtocolId = localStorage.getItem("activeProtocolId");
    const storedActivatedAt = localStorage.getItem("activatedAt");
    const storedRunStatus = localStorage.getItem("runStatus");
    const storedRunStartDate = localStorage.getItem("runStartDate");
    const storedStreak = localStorage.getItem("streak");
    const storedCheckIns = localStorage.getItem("checkIns");
    const storedHasCompletedRun = localStorage.getItem("hasCompletedRun");
    const storedIsPro = localStorage.getItem("quadrant_isPro");
    const storedRunHistory = localStorage.getItem("runHistory");

    if (storedActiveProblemId) {
      const parsedProblemId = Number.parseInt(storedActiveProblemId, 10);
      if (!Number.isNaN(parsedProblemId)) {
        setActiveProblemId(parsedProblemId);
      }
    }
    if (storedProtocolId) {
      setActiveProtocolId(storedProtocolId);
    }
    if (storedActivatedAt) {
      setActivatedAt(storedActivatedAt);
    }
    if (
      storedRunStatus === "idle" ||
      storedRunStatus === "active" ||
      storedRunStatus === "failed" ||
      storedRunStatus === "completed" ||
      storedRunStatus === "ended"
    ) {
      setRunStatus(storedRunStatus);
    }
    if (storedRunStartDate) {
      setRunStartDate(storedRunStartDate);
    }
    if (storedStreak) {
      const parsedStreak = Number.parseInt(storedStreak, 10);
      if (!Number.isNaN(parsedStreak)) {
        setStreak(parsedStreak);
      }
    }
    if (storedCheckIns) {
      try {
        const parsedCheckIns = JSON.parse(storedCheckIns) as Record<
          string,
          { followed: boolean; note?: string }
        >;
        setCheckIns(parsedCheckIns);
      } catch {
        setCheckIns({});
      }
    }
    if (storedHasCompletedRun === "true") {
      setHasCompletedRun(true);
    }
    if (storedIsPro === "true") {
      setIsPro(true);
    }
    if (storedRunHistory) {
      try {
        const parsedHistory = JSON.parse(storedRunHistory) as Array<{
          id: string;
          protocolId: string;
          protocolName: string;
          startedAt: string | null;
          endedAt: string;
          result: "Completed" | "Failed" | "Ended";
          cleanDays: number;
          notes?: Array<{ date: string; note: string }>;
        }>;
        setRunHistory(parsedHistory);
      } catch {
        setRunHistory([]);
      }
    }

  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !showCheckInModal) {
      return;
    }

    setHasSaved(false);

    const today = getLocalDateString();
    const todayEntry = checkIns[today];
    if (todayEntry) {
      setCheckInFollowed(todayEntry.followed);
      setCheckInNote(todayEntry.note ?? "");
    } else {
      setCheckInFollowed(null);
      setCheckInNote("");
    }
  }, [showCheckInModal, checkIns]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (activeProblemId !== null) {
      localStorage.setItem("activeProblemId", String(activeProblemId));
    } else {
      localStorage.removeItem("activeProblemId");
    }

    if (activeProtocolId) {
      localStorage.setItem("activeProtocolId", activeProtocolId);
    } else {
      localStorage.removeItem("activeProtocolId");
    }

    if (activatedAt) {
      localStorage.setItem("activatedAt", activatedAt);
    } else {
      localStorage.removeItem("activatedAt");
    }

    localStorage.setItem("runStatus", runStatus);
    if (runStartDate) {
      localStorage.setItem("runStartDate", runStartDate);
    } else {
      localStorage.removeItem("runStartDate");
    }
    localStorage.setItem("streak", String(streak));
    localStorage.setItem("checkIns", JSON.stringify(checkIns));
    localStorage.setItem("hasCompletedRun", hasCompletedRun ? "true" : "false");
    localStorage.setItem("runHistory", JSON.stringify(runHistory));
  }, [
    activeProblemId,
    activeProtocolId,
    activatedAt,
    runStatus,
    runStartDate,
    streak,
    checkIns,
    hasCompletedRun,
    runHistory,
  ]);

  const selectedProtocol = confirmProtocolId
    ? protocolById[confirmProtocolId]
    : null;
  const activeProtocol = activeProtocolId
    ? protocolById[activeProtocolId]
    : null;
  const libraryProtocol = libraryProtocolId
    ? protocolById[libraryProtocolId]
    : null;
  const activeProblem = problemIndex.find(
    (problem) => problem.id === activeProblemId,
  );

  const todayKey = getLocalDateString();
  const bestRun = computeBestRun(checkIns);
  const successfulDays = Object.values(checkIns).filter(
    (entry) => entry.followed,
  ).length;
  const freeProgressCount = Math.min(successfulDays, RUN_LENGTH);
  const progressCount = isPro ? successfulDays : freeProgressCount;
  const runTrackerSymbols = buildRunTracker(runStartDate, RUN_LENGTH, checkIns);
  const recentCheckInKeys = Object.keys(checkIns).sort().slice(-14);
  const recentCheckInSymbols = [
    ...Array.from({ length: 14 - recentCheckInKeys.length }, () => "▢"),
    ...recentCheckInKeys.map((key) =>
      checkIns[key]?.followed ? "✓" : "✕",
    ),
  ];

  const runActive = runStatus === "active";
  const runComplete = runStatus === "completed";
  const runFailed = runStatus === "failed";
  const runEnded = runStatus === "ended";
  const canStartNewRun = isPro || !hasCompletedRun;
  const freeRunComplete = !isPro && hasCompletedRun && !runActive;
  const protocolOrder = [
    "post-entry-information-restriction",
    "risk-and-size-immutability",
    "single-attempt-participation",
    "trade-count-and-exposure-cap",
    "regime-participation-filter",
    "entry-trigger-lock",
    "strategy-singularity-constraint",
    "session-boundary-restriction",
  ];
  const orderedProtocols = [...protocols].sort((a, b) => {
    const aIndex = protocolOrder.indexOf(a.id);
    const bIndex = protocolOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) {
      return a.name.localeCompare(b.name);
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });
  const clearActiveProtocol = () => {
    setActiveProblemId(null);
    setActiveProtocolId(null);
    setActivatedAt(null);
    setRunStatus("idle");
    setRunStartDate(null);
    setStreak(0);
    setCheckIns({});
    setCheckInFollowed(null);
    setCheckInNote("");
    setHasSaved(false);
    setShowEndRunConfirm(false);
    setShowRunDetail(false);
    setShowRunEndedModal(false);
    setRunEndContext(null);
    setShowCheckInModal(false);
    setConfirmProtocolId(null);
  };

  const appendRunHistory = (
    result: "Completed" | "Failed" | "Ended",
    snapshot: Record<string, { followed: boolean; note?: string }>,
  ) => {
    if (!activeProtocolId || !activeProtocol) {
      return;
    }
    const cleanDays = Object.values(snapshot).filter(
      (entry) => entry.followed,
    ).length;
    const notes = Object.entries(snapshot)
      .filter(([, value]) => value.note && value.note.trim().length > 0)
      .map(([date, value]) => ({
        date,
        note: value.note as string,
      }));
    const entry = {
      id: `${activeProtocolId}-${Date.now()}`,
      protocolId: activeProtocolId,
      protocolName: activeProtocol.name,
      startedAt: activatedAt,
      endedAt: new Date().toISOString(),
      result,
      cleanDays,
      notes,
    };
    setRunHistory((prev) => [entry, ...prev]);
  };

  const activateProtocol = (protocolId: string, problemId: number | null) => {
    const timestamp = new Date().toISOString();
    const today = getLocalDateString();
    setActivatedAt(timestamp);
    setActiveProblemId(problemId);
    setActiveProtocolId(protocolId);
    setRunStatus("active");
    setRunStartDate(today);
    setStreak(0);
    setCheckIns({});
    setCheckInFollowed(null);
    setCheckInNote("");
    setShowEndRunConfirm(false);
    router.push("/dashboard");
  };

  const handleActivateProtocol = () => {
    if (!selectedProtocol) {
      return;
    }
    if (!canStartNewRun) {
      return;
    }
    activateProtocol(selectedProtocol.id, null);
    setConfirmProtocolId(null);
  };

  const handleSwitchProtocol = () => {
    if (!isPro) {
      return;
    }
    setShowSwitchConfirm(true);
  };

  const handleConfirmSwitch = () => {
    setShowSwitchConfirm(false);
    clearActiveProtocol();
    setConfirmProtocolId(null);
    router.push("/protocols");
  };

  const persistCheckIns = (
    nextCheckIns: Record<string, { followed: boolean; note?: string }>,
  ) => {
    setCheckIns(nextCheckIns);
  };

  const handleSaveCheckIn = (followed: boolean) => {
    if (typeof window === "undefined") {
      return;
    }
    if (!runActive) {
      return;
    }
    const noteValue = checkInNote.trim();
    const dateStamp = getLocalDateString();
    const updatedCheckIns = {
      ...checkIns,
      [dateStamp]: {
        followed,
        note: noteValue || undefined,
      },
    };
    persistCheckIns(updatedCheckIns);
    const cleanDays = Object.values(updatedCheckIns).filter(
      (entry) => entry.followed,
    ).length;
    const newStreak = computeCurrentRun(updatedCheckIns, dateStamp);
    setStreak(newStreak);
    if (!followed) {
      setRunStatus("failed");
      if (!isPro) {
        setHasCompletedRun(true);
      }
      setRunEndContext({ result: "Failed", cleanDays });
      appendRunHistory("Failed", updatedCheckIns);
      setHasSaved(true);
      setShowRunEndedModal(true);
      setShowCheckInModal(false);
      return;
    } else if (!isPro && newStreak >= RUN_LENGTH) {
      setRunStatus("completed");
      setHasCompletedRun(true);
      setRunEndContext({ result: "Completed", cleanDays });
      appendRunHistory("Completed", updatedCheckIns);
      setShowRunEndedModal(true);
    }
    setHasSaved(true);
    setCheckInNote(noteValue);
    setCheckInFollowed(followed);
    setShowCheckInModal(false);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      storageKeys.forEach((key) => localStorage.removeItem(key));
    }
    setConfirmProtocolId(null);
    setActiveProblemId(null);
    setActiveProtocolId(null);
    setActivatedAt(null);
    setCheckInFollowed(null);
    setCheckInNote("");
    setHasSaved(false);
    setRunStatus("idle");
    setRunStartDate(null);
    setStreak(0);
    setCheckIns({});
    setShowSwitchConfirm(false);
    setShowRunDetail(false);
    setShowRunEndedModal(false);
    setRunEndContext(null);
    setShowCheckInModal(false);
  };

  const handleCheckInClick = () => {
    if (!runActive) {
      return;
    }
    setShowCheckInModal(true);
  };

  const handleEndRun = () => {
    if (!isPro || !runActive) {
      return;
    }
    setRunStatus("ended");
    appendRunHistory("Ended", checkIns);
    setShowEndRunConfirm(false);
    setRunEndContext(null);
  };

  const runHistoryRows = runHistory.map((entry) => ({
    id: entry.id,
    protocol: entry.protocolName,
    result: entry.result,
    days: entry.cleanDays,
    strip: buildHistoryStrip(entry.cleanDays, entry.result, RUN_LENGTH),
  }));
  const selectedRun =
    selectedRunId && runHistory.length > 0
      ? runHistory.find((entry) => entry.id === selectedRunId) ?? null
      : null;
  const selectedRunProtocol = selectedRun
    ? protocolById[selectedRun.protocolId]
    : null;
  const visibleRunHistoryRows = isPro
    ? runHistoryRows
    : runHistoryRows.slice(0, 1);
  const patternInsights = [
    { title: "Failure day distribution", value: "—" },
    { title: "Longest clean run", value: "—" },
    { title: "Time between failures", value: "—" },
    { title: "Protocols attempted", value: "—" },
  ];
  const lockIcon = (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 text-zinc-400"
    >
      <path
        fill="currentColor"
        d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"
      />
    </svg>
  );
  const latestRun = runHistory[0] ?? null;
  const runSummaryLine = RUN_END_INSIGHT_LINE;
  const runEndModalOpen =
    showRunEndedModal && view === "dashboard" && runEndContext !== null;
  const runEndCopy = runEndContext ? getRunEndCopy(runEndContext) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
      <main
        className={`w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10 ${
          runEndModalOpen ? "pointer-events-none select-none" : ""
        }`}
        aria-hidden={runEndModalOpen}
      >
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span>{view === "protocols" ? "Protocol library" : "Dashboard"}</span>
          <div className="flex items-center gap-3">
            {view === "protocols" ? (
              <button
                type="button"
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
                onClick={() => router.push("/dashboard")}
              >
                Back to dashboard
              </button>
            ) : null}
            <button
              type="button"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        {view === "dashboard" && (
          <section className="mt-10 space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              {runActive && activeProtocol ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Active run
                    </h2>
                    <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-500">
                      Active
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-zinc-900">
                    {activeProtocol.name}
                  </div>
                  <div className="mt-4 text-xs font-semibold tracking-wide text-zinc-500">
                    This run
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
                  <div className="mt-3 text-sm text-zinc-600">
                    Clean days: {successfulDays}/{RUN_LENGTH}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleCheckInClick}
                      disabled={!runActive}
                    >
                      Daily check-in
                    </button>
                    {isPro && runActive ? (
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                        onClick={() => setShowEndRunConfirm(true)}
                      >
                        End run
                      </button>
                    ) : null}
                    {isPro && runActive ? (
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                        onClick={handleSwitchProtocol}
                      >
                        Switch protocol
                      </button>
                    ) : null}
                  </div>
                </>
              ) : latestRun ? (
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
                      {buildHistoryStrip(
                        latestRun.cleanDays,
                        latestRun.result,
                        RUN_LENGTH,
                      ).map((symbol, index) => (
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
                      Clean days: {latestRun.cleanDays}/{RUN_LENGTH}
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-zinc-600">
                    {runSummaryLine}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      Active run
                    </h2>
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
            {showSwitchConfirm ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <span>Switching protocols resets your current run.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                    onClick={() => setShowSwitchConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                    onClick={handleConfirmSwitch}
                  >
                    Switch
                  </button>
                </div>
              </div>
            ) : null}
            {showEndRunConfirm ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <span>Ending locks this run in history.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                    onClick={() => setShowEndRunConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                    onClick={handleEndRun}
                  >
                    End run
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-10">
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Run history ({isPro ? runHistoryRows.length : visibleRunHistoryRows.length})
                      </h2>
                      <span className="text-xs font-semibold tracking-wide text-zinc-400">
                        Recent
                      </span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                      {visibleRunHistoryRows.length > 0 ? (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 text-xs font-semibold tracking-wide text-zinc-500">
                            <tr>
                              <th className="px-4 py-3">Protocol</th>
                              <th className="px-4 py-3">Result</th>
                              <th className="px-4 py-3">This run</th>
                              <th className="px-4 py-3">Days</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {visibleRunHistoryRows.map((row) => (
                              <tr key={row.id}>
                                <td className="px-4 py-3 text-zinc-900">
                                  <button
                                    type="button"
                                    className="text-left text-sm font-semibold text-zinc-900 hover:text-zinc-700"
                                    onClick={() => {
                                      setSelectedRunId(row.id);
                                      setShowRunDetail(true);
                                    }}
                                  >
                                    {row.protocol}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-zinc-600">
                                  {row.result}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-2">
                                    {row.strip.map((symbol, index) => (
                                      <div
                                        key={`history-strip-${row.id}-${index}`}
                                        className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold ${
                                          symbol === "✕"
                                            ? "border-red-200 bg-red-50 text-red-600"
                                            : symbol === "✓"
                                              ? "border-zinc-900 bg-zinc-900 text-white"
                                              : "border-zinc-200 text-zinc-600"
                                        }`}
                                      >
                                        {symbol}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-zinc-600">
                                  {row.days}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="px-4 py-6 text-sm text-zinc-500">
                          No runs recorded yet.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Pattern insights
                      </h2>
                      <span
                        className={`text-xs font-semibold tracking-wide ${
                          isPro ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        {isPro ? "Live" : "Locked"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {patternInsights.map((insight) => (
                        <div
                          key={insight.title}
                          className={`rounded-2xl border p-5 ${
                            isPro
                              ? "border-zinc-200 bg-white"
                              : "border-zinc-200 bg-zinc-50 text-zinc-400"
                          }`}
                          aria-disabled={!isPro}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-700">
                              {insight.title}
                            </div>
                            {!isPro ? (
                              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                                {lockIcon}
                                <span>Pro</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-4 text-2xl font-semibold text-zinc-900">
                            {isPro ? insight.value : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {freeRunComplete ? (
                    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-zinc-900 shadow-sm">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">
                          Free run complete.
                        </h2>
                        <p className="text-sm text-zinc-600">
                          Run history, cross-device persistence, and multiple
                          runs require Pro.
                        </p>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:border-zinc-400"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.location.href = "/pricing";
                            }
                          }}
                        >
                          View pricing
                        </button>
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Protocol library
                      </h2>
                      <span className="text-xs font-semibold tracking-wide text-zinc-400">
                        Read-only
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {orderedProtocols.map((protocol) => {
                        const isExpanded = protocol.id === libraryProtocolId;
                        return (
                          <div
                            key={protocol.id}
                            className={`rounded-xl border transition ${
                              isExpanded
                                ? "border-zinc-900 bg-zinc-50"
                                : "border-zinc-200"
                            }`}
                          >
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:border-zinc-400"
                              onClick={() => {
                                setLibraryProtocolId(
                                  isExpanded ? null : protocol.id,
                                );
                              }}
                            >
                              <div>
                                <div className="text-sm font-semibold text-zinc-900">
                                  {protocol.name}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">
                                  {protocol.commonBehaviourRemoved}
                                </div>
                              </div>
                              <span className="text-sm text-zinc-500">
                                {isExpanded ? "v" : ">"}
                              </span>
                            </button>
                            {isExpanded ? (
                              <div className="border-t border-zinc-200 bg-white/60 px-4 py-4">
                                <div className="border-l border-zinc-200 pl-4">
                                  <dl className="space-y-4 text-sm text-zinc-700">
                                    <div>
                                      <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                        Behaviour removed
                                      </dt>
                                      <dd className="mt-1">
                                        {protocol.commonBehaviourRemoved}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                        Rule
                                      </dt>
                                      <dd className="mt-1">{protocol.rule}</dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                        Duration
                                      </dt>
                                      <dd className="mt-1">
                                        {protocol.duration}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                        Failure condition
                                      </dt>
                                      <dd className="mt-1">
                                        {protocol.failure}
                                      </dd>
                                    </div>
                                  </dl>
                                  <div className="pt-4">
                                    <button
                                      type="button"
                                      className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                                      onClick={() => {
                                        if (freeRunComplete) {
                                          if (typeof window !== "undefined") {
                                            window.location.href = "/pricing";
                                          }
                                          return;
                                        }
                                        setConfirmProtocolId(protocol.id);
                                      }}
                                    >
                                      {freeRunComplete
                                        ? "Upgrade to activate"
                                        : "Activate protocol"}
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
            </div>
          </section>
        )}

        {view === "protocols" && (
          <section className="mt-10 space-y-6">
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
                    className={`rounded-xl border transition ${
                      isExpanded ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:border-zinc-400"
                      onClick={() => {
                        setLibraryProtocolId(isExpanded ? null : protocol.id);
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">
                          {protocol.name}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {protocol.commonBehaviourRemoved}
                        </div>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {isExpanded ? "v" : ">"}
                      </span>
                    </button>
                    {isExpanded ? (
                      <div className="border-t border-zinc-200 bg-white/60 px-4 py-4">
                        <div className="border-l border-zinc-200 pl-4">
                          <dl className="space-y-4 text-sm text-zinc-700">
                            <div>
                              <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                Rule
                              </dt>
                              <dd className="mt-1">{protocol.rule}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                Duration
                              </dt>
                              <dd className="mt-1">{protocol.duration}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                                Failure condition
                              </dt>
                              <dd className="mt-1">{protocol.failure}</dd>
                            </div>
                          </dl>
                          <div className="flex flex-wrap gap-3 pt-4">
                            <button
                              type="button"
                              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={freeRunComplete}
                              onClick={() => {
                                if (freeRunComplete) {
                                  return;
                                }
                                setConfirmProtocolId(protocol.id);
                              }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-zinc-500">
                  Daily check-in
                </p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-900">
                  Did you violate the protocol today?
                </h2>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
                onClick={() => setShowCheckInModal(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="check-in-note"
                  className="text-sm font-semibold text-zinc-800"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="check-in-note"
                  value={checkInNote}
                  onChange={(event) => setCheckInNote(event.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
                />
              </div>
              {hasSaved ? (
                <p className="text-sm font-semibold text-zinc-600">Saved</p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  onClick={() => {
                    setCheckInFollowed(true);
                    handleSaveCheckIn(true);
                  }}
                >
                  No — clean day
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                  onClick={() => {
                    setCheckInFollowed(false);
                    handleSaveCheckIn(false);
                  }}
                >
                  Yes — violated
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {selectedProtocol && view === "protocols" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-zinc-500">
                Activate protocol?
              </p>
              <h2 className="text-2xl font-semibold text-zinc-900">
                {selectedProtocol.name}
              </h2>
              {selectedProtocol.commonBehaviourRemoved ? (
                <p className="text-sm text-zinc-600">
                  Behaviour removed: {selectedProtocol.commonBehaviourRemoved}
                </p>
              ) : null}
            </div>
            <dl className="mt-6 space-y-4 text-sm text-zinc-700">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                  Rule
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.rule}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                  Duration
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.duration}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                  Failure condition
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.failure}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                onClick={() => setConfirmProtocolId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                onClick={handleActivateProtocol}
              >
                Activate protocol
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {runEndModalOpen && runEndCopy && runEndContext ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl"
          >
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-zinc-900">
                {runEndCopy.title}
              </h2>
              <p className="text-sm text-zinc-700">
                {runEndCopy.outcomePrefix}
                <strong className="font-semibold text-zinc-900">
                  {runEndCopy.outcomeHighlight}
                </strong>
                {runEndCopy.outcomeSuffix}
              </p>
            </div>
            <div className="h-4" />
            <div className="space-y-2 text-sm text-zinc-700">
              {runEndCopy.reframeLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="mt-6">
              <div className="text-xs font-semibold tracking-wide text-zinc-500">
                This run
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {buildHistoryStrip(
                  runEndContext.cleanDays,
                  runEndContext.result,
                  RUN_LENGTH,
                ).map((symbol, index) => (
                  <div
                    key={`run-end-strip-${index}`}
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
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <div>
                <button
                  type="button"
                  className="rounded-full bg-zinc-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/pricing";
                    }
                  }}
                >
                  {runEndCopy.primaryLabel}
                </button>
                <p className="mt-2 text-xs text-zinc-500">
                  {runEndCopy.primarySubtext}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-zinc-400 transition hover:text-zinc-500"
                onClick={() => {
                  if (runEndContext.result === "Failed") {
                    clearActiveProtocol();
                    return;
                  }
                  setShowRunEndedModal(false);
                  setRunEndContext(null);
                }}
              >
                {runEndCopy.secondaryLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showRunDetail && selectedRun && selectedRunProtocol ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-zinc-500">
                  Run detail
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
                  {selectedRunProtocol.name}
                </h2>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
                onClick={() => setShowRunDetail(false)}
              >
                Close
              </button>
            </div>
            <dl className="mt-6 space-y-4 text-sm text-zinc-700">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                  Rule
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedRunProtocol.rule}
                </dd>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                    Result
                  </dt>
                  <dd className="mt-1 text-base text-zinc-800">
                    {selectedRun.result}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                    Clean days
                  </dt>
                  <dd className="mt-1 text-base text-zinc-800">
                    {selectedRun.cleanDays}/{RUN_LENGTH}
                  </dd>
                </div>
              </div>
            </dl>
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-500">
                This run
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {buildHistoryStrip(
                  selectedRun.cleanDays,
                  selectedRun.result,
                  RUN_LENGTH,
                ).map((symbol, index) => (
                  <div
                    key={`run-detail-strip-${index}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                      symbol === "✕"
                        ? "border-red-200 bg-red-50 text-red-600"
                        : symbol === "✓"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-600"
                    }`}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            </div>
            {selectedRun.notes && selectedRun.notes.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-xs font-semibold tracking-wide text-zinc-500">
                  Notes
                </div>
                <div className="mt-3 space-y-2">
                  {selectedRun.notes.map((entry) => (
                    <div
                      key={`run-note-${entry.date}`}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                    >
                      <div className="text-xs text-zinc-500">{entry.date}</div>
                      <div className="mt-1 text-sm text-zinc-700">
                        {entry.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}




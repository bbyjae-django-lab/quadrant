"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { problemIndex } from "./data/problemIndex";
import { protocolById, protocols } from "./data/protocols";

const PRO_PRICE = 19;
const RUN_LENGTH = 5;

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

export default function Home() {
  const [step, setStep] = useState(1);
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(
    null,
  );
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(null);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [checkInFollowed, setCheckInFollowed] = useState<boolean | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [checkInError, setCheckInError] = useState("");
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
  const [showPricingPaymentsSoon, setShowPricingPaymentsSoon] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [libraryProtocolId, setLibraryProtocolId] = useState<string | null>(
    null,
  );
  const [showRunDetail, setShowRunDetail] = useState(false);
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
    }>
  >([]);
  const pathname = usePathname();

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
        }>;
        setRunHistory(parsedHistory);
      } catch {
        setRunHistory([]);
      }
    }

    setStep(storedProtocolId ? 1 : 2);
  }, []);

  useEffect(() => {
    if (!activeProtocolId && step === 1) {
      setStep(2);
    }
  }, [activeProtocolId, step]);

  useEffect(() => {
    if (typeof window === "undefined" || step !== 4) {
      return;
    }

    setHasSaved(false);
    setCheckInError("");

    const today = getLocalDateString();
    const todayEntry = checkIns[today];
    if (todayEntry) {
      setCheckInFollowed(todayEntry.followed);
      setCheckInNote(todayEntry.note ?? "");
    } else {
      setCheckInFollowed(null);
      setCheckInNote("");
    }
  }, [step, checkIns]);

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

  const selectedProtocol = selectedProtocolId
    ? protocolById[selectedProtocolId]
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
  const todayCheckIn = checkIns[todayKey];
  const bestRun = computeBestRun(checkIns);
  const successfulDays = Object.values(checkIns).filter(
    (entry) => entry.followed,
  ).length;
  const freeProgressCount = Math.min(successfulDays, RUN_LENGTH);
  const progressCount = isPro ? successfulDays : freeProgressCount;
  const recentCheckInKeys = Object.keys(checkIns).sort().slice(-14);
  const recentCheckInSymbols = [
    ...Array.from({ length: 14 - recentCheckInKeys.length }, () => "—"),
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
    "emotional-state-trading-ban",
    "trade-count-and-exposure-cap",
    "post-entry-information-restriction",
    "single-attempt-participation",
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
    setCheckInError("");
    setShowEndRunConfirm(false);
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
    const entry = {
      id: `${activeProtocolId}-${Date.now()}`,
      protocolId: activeProtocolId,
      protocolName: activeProtocol.name,
      startedAt: activatedAt,
      endedAt: new Date().toISOString(),
      result,
      cleanDays,
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
    setShowPaywall(false);
    setCheckInFollowed(null);
    setCheckInNote("");
    setShowEndRunConfirm(false);
    setStep(1);
  };

  const handleActivateProtocol = () => {
    if (!selectedProtocol) {
      return;
    }
    if (!canStartNewRun) {
      setShowPaywall(true);
      return;
    }
    activateProtocol(selectedProtocol.id, null);
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
    setSelectedProtocolId(null);
    setStep(2);
  };

  const handleStartAnotherProtocol = () => {
    if (!canStartNewRun) {
      setShowPaywall(true);
      return;
    }
    clearActiveProtocol();
    setSelectedProtocolId(null);
    setStep(2);
  };

  const handleSaveCheckIn = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!runActive) {
      return;
    }
    if (checkInFollowed === null) {
      setCheckInError("Please select Yes or No.");
      return;
    }
    const noteValue = checkInNote.trim();
    if (checkInFollowed === false && !noteValue) {
      setCheckInError("Please add a note for a deviation.");
      return;
    }
    setCheckInError("");
    const dateStamp = getLocalDateString();
    const updatedCheckIns = {
      ...checkIns,
      [dateStamp]: {
        followed: checkInFollowed,
        note: noteValue || undefined,
      },
    };
    setCheckIns(updatedCheckIns);
    const newStreak = computeCurrentRun(updatedCheckIns, dateStamp);
    setStreak(newStreak);
    if (checkInFollowed === false) {
      setRunStatus("failed");
      if (!isPro) {
        setHasCompletedRun(true);
      }
      appendRunHistory("Failed", updatedCheckIns);
      setHasSaved(true);
      setShowRunDetail(true);
      setStep(1);
      return;
    } else if (!isPro && newStreak >= RUN_LENGTH) {
      setRunStatus("completed");
      setHasCompletedRun(true);
      appendRunHistory("Completed", updatedCheckIns);
      setShowRunDetail(true);
    }
    setHasSaved(true);
    setCheckInNote(noteValue);
    setStep(1);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      storageKeys.forEach((key) => localStorage.removeItem(key));
    }
    setStep(2);
    setSelectedProtocolId(null);
    setActiveProblemId(null);
    setActiveProtocolId(null);
    setActivatedAt(null);
    setCheckInFollowed(null);
    setCheckInNote("");
    setHasSaved(false);
    setCheckInError("");
    setRunStatus("idle");
    setRunStartDate(null);
    setStreak(0);
    setCheckIns({});
    setShowPricingPaymentsSoon(false);
    setShowPaywall(false);
    setShowSwitchConfirm(false);
  };

  const handleCheckInClick = () => {
    if (!runActive) {
      return;
    }
    setStep(4);
  };

  const handleEndRun = () => {
    if (!isPro || !runActive) {
      return;
    }
    setRunStatus("ended");
    appendRunHistory("Ended", checkIns);
    setShowEndRunConfirm(false);
    setShowRunDetail(true);
    setStep(1);
  };

  const handleTogglePro = () => {
    const next = !isPro;
    setIsPro(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("quadrant_isPro", next ? "true" : "false");
    }
  };

  const handleBackToDashboard = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const canContinueFromStep2 = Boolean(selectedProtocolId);
  const canSaveCheckIn = runActive && checkInFollowed !== null;
  const runHistoryRows = runHistory.map((entry) => ({
    protocol: entry.protocolName,
    result: entry.result,
    days: entry.cleanDays,
  }));
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
  const runResultLabel = runComplete
    ? "Completed"
    : runFailed
      ? "Failed"
      : runEnded
        ? "Ended"
        : "—";
  const totalSteps = 2;
  const showStepCounter = step >= 2 && step <= 3;
  const displayStep = step - 1;
  if (pathname === "/pricing") {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
            <span>Pricing</span>
            <button
              type="button"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
              onClick={handleBackToDashboard}
            >
              Back to dashboard
            </button>
          </div>
          <section className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Fix the behaviour that's costing you money.
            </h1>
            <p className="text-xs font-semibold tracking-wide text-zinc-500">
              Pro = ${PRO_PRICE}/month
            </p>
            <p className="max-w-2xl text-base leading-7 text-zinc-600">
              Quadrant helps traders identify recurring behavioural patterns and
              enforce one corrective protocol at a time.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-zinc-900">Free</h2>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-700">
                <li>One active protocol</li>
                <li>Daily check-in</li>
                <li>7-day history</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-sm">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Pro</h2>
                <p className="text-sm text-zinc-300">${PRO_PRICE}/month</p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-100">
                <li>Full protocol library</li>
                <li>Run & streak tracking</li>
                <li>Search-based problem matching</li>
                <li>Future: multiple protocols, insights</li>
              </ul>
              <button
                type="button"
                className="mt-6 w-full rounded-full bg-white px-5 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100"
                onClick={() => setShowPricingPaymentsSoon(true)}
              >
                Unlock Pro - ${PRO_PRICE}/month
              </button>
              {showPricingPaymentsSoon ? (
                <p className="mt-3 text-xs text-zinc-300">
                  Payments launching soon. Join early access.
                </p>
              ) : null}
            </div>
          </section>

          <section className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-5">
            <p className="text-sm font-semibold text-zinc-700">
              Start with one problem
            </p>
            <a
              href="/"
              className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              Start with one problem
            </a>
          </section>

          <button
            type="button"
            className="text-sm font-semibold text-zinc-600"
            onClick={handleTogglePro}
          >
            {isPro ? "Disable Pro" : "Enable Pro (test)"}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
      <main className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span>
            {showStepCounter
              ? `Step ${displayStep} of ${totalSteps}`
              : "Dashboard"}
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        {step === 1 && (
          <section className="mt-10 space-y-6">
            {activeProtocol ? (
              <>
                <div className="space-y-10">
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-4 md:max-w-xl">
                        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400">
                          Active protocol
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
                          {activeProtocol.name}
                        </h1>
                        {activeProblem ? (
                          <p className="text-sm text-zinc-500">
                            Focus: {activeProblem.normalized_problem}
                          </p>
                        ) : null}
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="text-xs font-semibold tracking-wide text-zinc-500">
                            Rule
                          </div>
                          <p className="mt-2 text-base text-zinc-800">
                            {activeProtocol.rule}
                          </p>
                        </div>
                      </div>
                      <div className="w-full max-w-sm space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          {isPro ? (
                            <>
                              <div className="text-sm font-semibold text-zinc-900">
                                Current clean streak: {streak} days
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {recentCheckInSymbols.map((symbol, index) => (
                                  <div
                                    key={`recent-checkin-${index}`}
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
                            </>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                            <span>
                              Status:{" "}
                              {runActive
                                ? "Active"
                                : runComplete
                                  ? "Complete"
                                  : runFailed
                                    ? "Failed"
                                    : runEnded
                                      ? "Ended"
                                      : "Inactive"}
                            </span>
                            <span>Best run: {bestRun}</span>
                            {hasSaved ? <span>Today logged</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
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
                      </div>
                    </div>
                    {!freeRunComplete && runComplete ? (
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        <span className="text-sm font-semibold text-zinc-700">
                          Run complete
                        </span>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                            onClick={handleStartAnotherProtocol}
                          >
                            Start another protocol
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {showSwitchConfirm ? (
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
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
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
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
                  </section>

                  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Run history
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
                              <th className="px-4 py-3">Days</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {visibleRunHistoryRows.map((row) => (
                              <tr key={row.protocol}>
                                <td className="px-4 py-3 text-zinc-900">
                                  {row.protocol}
                                </td>
                                <td className="px-4 py-3 text-zinc-600">
                                  {row.result}
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
                      <span className="text-xs font-semibold tracking-wide text-zinc-400">
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
                              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
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
                    <section className="rounded-2xl border border-zinc-200 bg-zinc-900 p-6 text-white shadow-sm">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold">
                          Free run complete.
                        </h2>
                        <p className="text-sm text-zinc-300">
                          You can review your completed run. To start another
                          run, upgrade.
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.location.href = "/pricing";
                            }
                          }}
                        >
                          Upgrade to Pro
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white transition hover:border-white/70"
                          onClick={() => {
                            setShowRunDetail(true);
                          }}
                        >
                          View completed run
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
                              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
                                "hover:border-zinc-400"
                              }`}
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
                                {isExpanded ? "▼" : "▶"}
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
                                    <dd className="mt-1">
                                      {protocol.rule}
                                    </dd>
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
                                      Failure
                                    </dt>
                                    <dd className="mt-1">
                                      {protocol.failure}
                                    </dd>
                                  </div>
                                </dl>
                                <div className="flex flex-wrap gap-3 pt-4">
                                  <button
                                    type="button"
                                    className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                                    onClick={() => {
                                      if (freeRunComplete) {
                                        setShowPaywall(true);
                                        return;
                                      }
                                      setSelectedProtocolId(protocol.id);
                                      setStep(3);
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
              </>
            ) : null}
          </section>
        )}

        {step === 2 && (
          <section className="mt-10 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {orderedProtocols.map((protocol) => {
                const isSelected = protocol.id === selectedProtocolId;
                return (
                  <button
                    key={protocol.id}
                    type="button"
                    onClick={() => {
                      setSelectedProtocolId(protocol.id);
                    }}
                    className={`rounded-xl border px-5 py-4 text-left transition ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-semibold tracking-wide text-zinc-500">
                      {protocol.name}
                    </div>
                    {protocol.commonBehaviourRemoved ? (
                      <p className="mt-3 text-sm leading-6 text-zinc-700">
                        {protocol.commonBehaviourRemoved}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setStep(3)}
                disabled={!canContinueFromStep2}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && selectedProtocol ? (
          <section className="mt-10 space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide text-zinc-500">
                Confirm protocol
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                {selectedProtocol.name}
              </h1>
              {selectedProtocol.commonBehaviourRemoved ? (
                <p className="text-base leading-7 text-zinc-600">
                  Common behaviour removed:{" "}
                  {selectedProtocol.commonBehaviourRemoved}
                </p>
              ) : null}
            </div>
            <dl className="space-y-5">
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
                  Failure
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.failure}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                onClick={() => setStep(2)}
              >
                Choose a different protocol
              </button>
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                onClick={handleActivateProtocol}
              >
                Activate protocol
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 && (
          <section className="mt-10 space-y-8">
            <fieldset className="space-y-4">
              <legend className="text-base font-semibold text-zinc-800">
                Did you follow your active protocol today?
              </legend>
              <div className="flex flex-wrap gap-3">
                {["Yes", "No"].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      (option === "Yes" && checkInFollowed === true) ||
                      (option === "No" && checkInFollowed === false)
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="daily-check-in"
                      value={option}
                      checked={
                        (option === "Yes" && checkInFollowed === true) ||
                        (option === "No" && checkInFollowed === false)
                      }
                      onChange={() => setCheckInFollowed(option === "Yes")}
                      className="h-4 w-4 accent-zinc-900"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
            {checkInFollowed === false && (
              <div className="space-y-2">
                <label
                  htmlFor="check-in-note"
                  className="text-sm font-semibold text-zinc-800"
                >
                  If no, what caused the deviation?
                </label>
                <textarea
                  id="check-in-note"
                  value={checkInNote}
                  onChange={(event) => setCheckInNote(event.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
                />
              </div>
            )}
            {checkInError ? (
              <p className="text-sm text-red-600">{checkInError}</p>
            ) : null}
            {hasSaved ? (
              <p className="text-sm font-semibold text-zinc-600">Saved</p>
            ) : null}
            <div className="flex flex-col items-end gap-3">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSaveCheckIn}
                disabled={!canSaveCheckIn}
              >
                Save check-in
              </button>
            </div>
          </section>
        )}

      </main>
      {showPaywall ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-zinc-900">
                Your first run is complete.
              </h2>
              <div className="space-y-3 text-sm text-zinc-600">
                <p>Free users can complete one protocol run.</p>
                <p>Upgrade to continue experimenting with another protocol.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                onClick={() => {
                  setShowPaywall(false);
                  if (typeof window !== "undefined") {
                    window.location.href = "/pricing";
                  }
                }}
              >
                Upgrade to continue
              </button>
              <button
                type="button"
                className="rounded-full border border-zinc-300 px-5 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                onClick={() => {
                  setShowPaywall(false);
                  setStep(2);
                }}
              >
                Back to dashboard
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Upgrades save your runs across devices.
            </p>
          </div>
        </div>
      ) : null}
      {showRunDetail && activeProtocol ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-zinc-500">
                  Run detail
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
                  {activeProtocol.name}
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
                  {activeProtocol.rule}
                </dd>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                    Result
                  </dt>
                  <dd className="mt-1 text-base text-zinc-800">
                    {runResultLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                    {isPro ? "Clean days" : "Days completed"}
                  </dt>
                  <dd className="mt-1 text-base text-zinc-800">
                    {isPro ? progressCount : `${freeProgressCount}/${RUN_LENGTH}`}
                  </dd>
                </div>
              </div>
            </dl>
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              {isPro ? (
                <>
                  <div className="text-sm font-semibold text-zinc-900">
                    Current clean streak: {streak} days
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recentCheckInSymbols.map((symbol, index) => (
                      <div
                        key={`run-detail-recent-${index}`}
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
                </>
              ) : null}
            </div>
            {!isPro ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/pricing";
                    }
                  }}
                >
                  Upgrade to Pro
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                  onClick={() => setShowRunDetail(false)}
                >
                  Stay on dashboard
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}




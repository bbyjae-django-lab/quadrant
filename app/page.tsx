"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { ProblemIndexItem } from "./data/problemIndex";
import { problemIndex } from "./data/problemIndex";
import { protocolById, protocols } from "./data/protocols";

const PRO_PRICE = 19;
const RUN_LENGTH = 5;

const clarifierQuestions = [
  {
    id: "q1",
    label: "When does this issue most often occur?",
    options: ["Before entry", "During the trade", "After entry"],
  },
  {
    id: "q2",
    label: "Does this happen even when you feel calm and focused?",
    options: ["Yes", "No"],
  },
  {
    id: "q3",
    label: "Does this behaviour change depending on market conditions?",
    options: ["Yes", "No"],
  },
];

const storageKeys = [
  "activeProblemId",
  "activeProtocolId",
  "activatedAt",
  "clarifierAnswers",
  "runStatus",
  "runStartDate",
  "streak",
  "checkIns",
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

const tokenize = (value: string) =>
  value.toLowerCase().match(/[a-z0-9']+/g) ?? [];

const scoreQueryAgainstPhrase = (
  queryTokens: string[],
  phrase: string,
  normalizedQuery: string,
) => {
  const phraseLower = phrase.toLowerCase();
  if (
    phraseLower.includes(normalizedQuery) ||
    normalizedQuery.includes(phraseLower)
  ) {
    return 1000 + phraseLower.length;
  }
  if (!queryTokens.length) {
    return 0;
  }
  const phraseTokens = new Set(tokenize(phraseLower));
  let hits = 0;
  for (const token of queryTokens) {
    if (phraseTokens.has(token)) {
      hits += 1;
    }
  }
  return hits;
};

const findProblemMatches = (query: string, limit = 3) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }
  const queryTokens = tokenize(normalizedQuery);
  const scored = problemIndex
    .map((item) => {
      let score = 0;
      for (const phrase of item.raw_phrases) {
        const phraseScore = scoreQueryAgainstPhrase(
          queryTokens,
          phrase,
          normalizedQuery,
        );
        if (phraseScore > score) {
          score = phraseScore;
        }
      }
      return { item, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((result) => result.item);
};

export default function Home() {
  const [step, setStep] = useState(1);
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(
    null,
  );
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(
    null,
  );
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(null);
  const [clarifierAnswers, setClarifierAnswers] = useState<
    Record<string, string>
  >({});
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [checkInFollowed, setCheckInFollowed] = useState<boolean | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [runStatus, setRunStatus] = useState<
    "idle" | "active" | "failed" | "completed"
  >("idle");
  const [runStartDate, setRunStartDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [checkIns, setCheckIns] = useState<
    Record<string, { followed: boolean; note?: string }>
  >({});
  const [hasCompletedRun, setHasCompletedRun] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchResults, setSearchResults] = useState<ProblemIndexItem[]>([]);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [showPricingPaymentsSoon, setShowPricingPaymentsSoon] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [libraryProtocolId, setLibraryProtocolId] = useState<string | null>(
    null,
  );
  const [showRunDetail, setShowRunDetail] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedActiveProblemId = localStorage.getItem("activeProblemId");
    const storedProtocolId = localStorage.getItem("activeProtocolId");
    const storedActivatedAt = localStorage.getItem("activatedAt");
    const storedClarifiers = localStorage.getItem("clarifierAnswers");
    const storedRunStatus = localStorage.getItem("runStatus");
    const storedRunStartDate = localStorage.getItem("runStartDate");
    const storedStreak = localStorage.getItem("streak");
    const storedCheckIns = localStorage.getItem("checkIns");
    const storedHasCompletedRun = localStorage.getItem("hasCompletedRun");
    const storedIsPro = localStorage.getItem("quadrant_isPro");

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
    if (storedClarifiers) {
      try {
        const parsed = JSON.parse(storedClarifiers) as Record<string, string>;
        setClarifierAnswers(parsed);
      } catch {
        setClarifierAnswers({});
      }
    }
    if (
      storedRunStatus === "idle" ||
      storedRunStatus === "active" ||
      storedRunStatus === "failed" ||
      storedRunStatus === "completed"
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

    setStep(1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || step !== 6) {
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
    if (step === 1) {
      return;
    }
    setSearchAttempted(false);
    setSearchResults([]);
  }, [step]);

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

    if (Object.keys(clarifierAnswers).length > 0) {
      localStorage.setItem("clarifierAnswers", JSON.stringify(clarifierAnswers));
    } else {
      localStorage.removeItem("clarifierAnswers");
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
  }, [
    activeProblemId,
    activeProtocolId,
    activatedAt,
    clarifierAnswers,
    runStatus,
    runStartDate,
    streak,
    checkIns,
    hasCompletedRun,
  ]);

  const selectedProblem = problemIndex.find(
    (problem) => problem.id === selectedProblemId,
  );
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
  const progressCount = Math.min(successfulDays, RUN_LENGTH);

  const allClarifiersAnswered = clarifierQuestions.every(
    (question) => clarifierAnswers[question.id],
  );

  const runActive = runStatus === "active";
  const runComplete = runStatus === "completed";
  const runFailed = runStatus === "failed";
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
    setSearchQuery("");
    setSearchAttempted(false);
    setSearchResults([]);
    setShowPaywall(false);
    setCheckInFollowed(null);
    setCheckInNote("");
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
    activateProtocol(selectedProtocol.id, selectedProblem?.id ?? null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchAttempted(false);
      setSearchResults([]);
      return;
    }
    const matches = findProblemMatches(query, 3);
    setSearchResults(matches);
    setSearchAttempted(matches.length === 0);
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
    setSelectedProblemId(null);
    setSelectedProtocolId(null);
    setSearchQuery("");
    setSearchAttempted(false);
    setStep(2);
  };

  const handleStartAnotherProtocol = () => {
    if (!canStartNewRun) {
      setShowPaywall(true);
      return;
    }
    clearActiveProtocol();
    setSelectedProblemId(null);
    setSelectedProtocolId(null);
    setSearchQuery("");
    setSearchAttempted(false);
    setStep(2);
  };

  const handleRestartSameProtocol = () => {
    if (!activeProtocolId) {
      return;
    }
    if (!canStartNewRun) {
      setShowPaywall(true);
      return;
    }
    const timestamp = new Date().toISOString();
    const today = getLocalDateString();
    setActivatedAt(timestamp);
    setRunStatus("active");
    setRunStartDate(today);
    setStreak(0);
    setCheckIns({});
    setCheckInFollowed(null);
    setCheckInNote("");
    setHasSaved(false);
    setShowPaywall(false);
    setStep(1);
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
      setHasCompletedRun(true);
      setStep(7);
      return;
    } else if (newStreak >= RUN_LENGTH) {
      setRunStatus("completed");
      setHasCompletedRun(true);
    }
    setHasSaved(true);
    setCheckInNote(noteValue);
    setStep(1);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      storageKeys.forEach((key) => localStorage.removeItem(key));
    }
    setStep(1);
    setSelectedProblemId(null);
    setSelectedProtocolId(null);
    setActiveProblemId(null);
    setActiveProtocolId(null);
    setClarifierAnswers({});
    setActivatedAt(null);
    setCheckInFollowed(null);
    setCheckInNote("");
    setHasSaved(false);
    setCheckInError("");
    setRunStatus("idle");
    setRunStartDate(null);
    setStreak(0);
    setCheckIns({});
    setSearchQuery("");
    setSearchAttempted(false);
    setSearchResults([]);
    setShowPricingPaymentsSoon(false);
    setShowPaywall(false);
    setShowSwitchConfirm(false);
  };

  const handleCheckInClick = () => {
    if (!runActive) {
      return;
    }
    setStep(6);
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
  const canContinueFromStep3 = allClarifiersAnswered;
  const canSaveCheckIn = runActive && checkInFollowed !== null;
  const runHistoryRows = activeProtocol
    ? [
        {
          protocol: activeProtocol.name,
          result: runComplete
            ? "Complete"
            : runFailed
              ? "Failed"
              : runActive
                ? "Active"
                : "Inactive",
          days: progressCount,
        },
      ]
    : [];
  const visibleRunHistoryRows = isPro
    ? runHistoryRows
    : runHistoryRows.slice(0, 1);
  const patternInsights = [
    { title: "Failure Day Distribution", value: "—" },
    { title: "Longest Clean Run", value: "—" },
    { title: "Time Between Failures", value: "—" },
    { title: "Protocols Attempted", value: "—" },
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
  const runResultLabel = runComplete ? "Completed" : runFailed ? "Failed" : "—";
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
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              PRO = ${PRO_PRICE}/month
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
          <span>Step {step} of 6</span>
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
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                          ACTIVE PROTOCOL
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
                          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Rule
                          </div>
                          <p className="mt-2 text-base text-zinc-800">
                            {activeProtocol.rule}
                          </p>
                        </div>
                      </div>
                      <div className="w-full max-w-sm space-y-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="text-sm font-semibold text-zinc-900">
                            Progress: {progressCount}/{RUN_LENGTH} clean trading
                            days
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Array.from({ length: RUN_LENGTH }, (_, index) => {
                              const isFilled = index < progressCount;
                              const isFailed =
                                runFailed && index === progressCount;
                              const symbol = isFilled
                                ? "✓"
                                : isFailed
                                  ? "✕"
                                  : "—";
                              return (
                                <div
                                  key={`run-slot-${index + 1}`}
                                  className={`flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold ${
                                    isFailed
                                      ? "border-red-200 bg-red-50 text-red-600"
                                      : isFilled
                                        ? "border-zinc-900 bg-zinc-900 text-white"
                                        : "border-zinc-200 text-zinc-600"
                                  }`}
                                >
                                  <span className="text-sm">{symbol}</span>
                                  <span className="text-[10px] uppercase tracking-wide">
                                    Day {index + 1}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                            <span>
                              Status:{" "}
                              {runActive
                                ? "Active"
                                : runComplete
                                  ? "Complete"
                                  : runFailed
                                    ? "Failed"
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
                  </section>

                  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Run history
                      </h2>
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Recent
                      </span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                      {visibleRunHistoryRows.length > 0 ? (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
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
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Read-only
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        {orderedProtocols.map((protocol) => {
                          const isSelected =
                            protocol.id === libraryProtocolId;
                          return (
                            <button
                              key={protocol.id}
                              type="button"
                              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? "border-zinc-900 bg-zinc-50"
                                  : "border-zinc-200 hover:border-zinc-400"
                              }`}
                              onClick={() =>
                                setLibraryProtocolId(protocol.id)
                              }
                            >
                              <div className="text-sm font-semibold text-zinc-900">
                                {protocol.name}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {protocol.commonBehaviourRemoved}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                        {libraryProtocol ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
                              <span>Read-only details</span>
                              <span className="text-zinc-400">
                                No activation
                              </span>
                            </div>
                            <div className="text-lg font-semibold text-zinc-900">
                              {libraryProtocol.name}
                            </div>
                            <dl className="space-y-4 text-sm text-zinc-700">
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Rule
                                </dt>
                                <dd className="mt-1">
                                  {libraryProtocol.rule}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Duration
                                </dt>
                                <dd className="mt-1">
                                  {libraryProtocol.duration}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Failure
                                </dt>
                                <dd className="mt-1">
                                  {libraryProtocol.failure}
                                </dd>
                              </div>
                            </dl>
                            <div className="flex flex-wrap gap-3 pt-2">
                              <button
                                type="button"
                                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                                onClick={() => {
                                  if (freeRunComplete) {
                                    setShowPaywall(true);
                                    return;
                                  }
                                  setSelectedProtocolId(libraryProtocol.id);
                                  setSelectedProblemId(null);
                                  setStep(5);
                                }}
                              >
                                {freeRunComplete
                                  ? "Upgrade to activate"
                                  : "Activate protocol"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-500">
                            Select a protocol to view details.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  Quadrant
                </h1>
                <p className="text-base leading-7 text-zinc-600">
                  Fix the behaviour that's costing you money. Quadrant helps
                  traders identify recurring behavioural patterns and enforce one
                  corrective protocol at a time.
                </p>
                <form onSubmit={handleSearchSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchAttempted(false);
                      setSearchResults([]);
                    }}
                    placeholder="Describe the problem you're dealing with right now"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                    >
                      Search
                    </button>
                  </div>
                </form>
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Top matches
                    </div>
                    <div className="space-y-2">
                      {searchResults.map((problem) => (
                        <button
                          key={problem.id}
                          type="button"
                          className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-700 transition hover:border-zinc-400"
                          onClick={() => {
                            setSelectedProblemId(problem.id);
                            setSelectedProtocolId(problem.protocol_id);
                            setSearchAttempted(false);
                            setStep(4);
                          }}
                        >
                          <div className="font-semibold text-zinc-900">
                            {problem.normalized_problem}
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-zinc-500">
                            {problem.raw_phrases
                              .slice(0, 2)
                              .map((phrase) => (
                                <div key={phrase}>{phrase}</div>
                              ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchAttempted ? (
                  <div className="text-sm text-zinc-600">
                    No clear match — browse protocols.
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    onClick={() => setStep(2)}
                  >
                    Start
                  </button>
                </div>
              </>
            )}
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
                      setSelectedProblemId(null);
                      setSearchAttempted(false);
                    }}
                    className={`rounded-xl border px-5 py-4 text-left transition ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
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

        {step === 3 && (
          <section className="mt-10 space-y-8">
            <div className="space-y-6">
              {clarifierQuestions.map((question) => (
                <fieldset key={question.id} className="space-y-3">
                  <legend className="text-sm font-semibold text-zinc-800">
                    {question.label}
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {question.options.map((option) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                          clarifierAnswers[question.id] === option
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={clarifierAnswers[question.id] === option}
                          onChange={() =>
                            setClarifierAnswers((prev) => ({
                              ...prev,
                              [question.id]: option,
                            }))
                          }
                          className="h-4 w-4 accent-zinc-900"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setStep(4)}
                disabled={!canContinueFromStep3}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 4 && selectedProtocol ? (
          <section className="mt-10 space-y-6">
            {selectedProblem ? (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  Matched problem
                </h1>
                <p className="text-base leading-7 text-zinc-600">
                  {selectedProblem.normalized_problem}
                </p>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Recommended protocol
                  </div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {selectedProtocol.name}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Verbatim trader language
                  </div>
                  <div className="space-y-2 text-sm text-zinc-600">
                    {selectedProblem.raw_phrases.map((phrase) => (
                      <div key={phrase}>{phrase}</div>
                    ))}
                  </div>
                </div>
                {searchResults.length > 1 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      See other matches
                    </div>
                    <div className="space-y-2">
                      {searchResults
                        .filter((result) => result.id !== selectedProblem.id)
                        .slice(0, 2)
                        .map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-700 transition hover:border-zinc-400"
                            onClick={() => {
                              setSelectedProblemId(result.id);
                              setSelectedProtocolId(result.protocol_id);
                            }}
                          >
                            <div className="font-semibold text-zinc-900">
                              {result.normalized_problem}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {protocolById[result.protocol_id]?.name ??
                                "Protocol"}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  {selectedProtocol.name}
                </h1>
                {selectedProtocol.commonBehaviourRemoved ? (
                  <p className="text-base leading-7 text-zinc-600">
                    Common behaviour removed:{" "}
                    {selectedProtocol.commonBehaviourRemoved}
                  </p>
                ) : null}
              </>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                onClick={() => setStep(5)}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 5 && selectedProtocol && (
          <section className="mt-10 space-y-8">
            <dl className="space-y-5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Rule
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.rule}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Duration
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.duration}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Failure
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {selectedProtocol.failure}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                onClick={handleActivateProtocol}
              >
                Activate protocol
              </button>
            </div>
          </section>
        )}

        {step === 6 && (
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

        {step === 7 && activeProtocol ? (
          <section className="mt-10">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  Run ended.
                </h1>
                <p className="text-sm text-zinc-600">Protocol violated.</p>
              </div>
              <div className="mt-6 space-y-3 text-sm text-zinc-700">
                <div className="font-semibold text-zinc-900">
                  {activeProtocol.name}
                </div>
                <div className="text-xs text-zinc-500">
                  {activeProtocol.failure}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  onClick={handleRestartSameProtocol}
                >
                  Restart same protocol
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
                  onClick={handleStartAnotherProtocol}
                >
                  Choose another protocol
                </button>
              </div>
            </div>
          </section>
        ) : null}
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
                  setStep(1);
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
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Rule
                </dt>
                <dd className="mt-1 text-base text-zinc-800">
                  {activeProtocol.rule}
                </dd>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Result
                  </dt>
                  <dd className="mt-1 text-base text-zinc-800">
                    {runResultLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Days completed
                  </dt>
                  <dd className="mt-1 text-base text-zinc-800">
                    {progressCount}/{RUN_LENGTH}
                  </dd>
                </div>
              </div>
            </dl>
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-900">
                Progress: {progressCount}/{RUN_LENGTH} clean trading days
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: RUN_LENGTH }, (_, index) => {
                  const isFilled = index < progressCount;
                  const isFailed = runFailed && index === progressCount;
                  const symbol = isFilled ? "✓" : isFailed ? "✕" : "—";
                  return (
                    <div
                      key={`run-detail-slot-${index + 1}`}
                      className={`flex h-12 w-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold ${
                        isFailed
                          ? "border-red-200 bg-red-50 text-red-600"
                          : isFilled
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 text-zinc-600"
                      }`}
                    >
                      <span className="text-sm">{symbol}</span>
                      <span className="text-[10px] uppercase tracking-wide">
                        Day {index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


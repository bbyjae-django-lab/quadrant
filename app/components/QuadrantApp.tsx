"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { problemIndex } from "../data/problemIndex";
import { observedBehaviours } from "../data/observedBehaviours";
import { protocolById, protocols } from "../protocols";
import type {
  ActiveRunState,
  Protocol,
  RunEndContext,
  RunEndCopy,
  RunHistoryEntry,
  RunHistoryRow,
} from "../types";
import { useAuth } from "../providers/AuthProvider";
import {
  getAdapter,
  insertSupabaseCheckin,
  isSupabaseReady,
  loadSupabaseRunsWithCheckins,
  setSupabaseReady,
  upsertSupabaseRun,
  type CheckinRecord,
} from "../lib/storageAdapter";
import {
  hasMigratedToSupabase,
  migrateLocalToSupabase,
} from "../lib/migrate";
import AuthModal from "./modals/AuthModal";
import DailyCheckInModal from "./modals/DailyCheckInModal";
import RunEndedModal from "./modals/RunEndedModal";
import ActiveRunSection from "./today/ActiveRunSection";
import PatternInsightsSection from "./today/PatternInsightsSection";
import ProtocolLibrarySection from "./today/ProtocolLibrarySection";
import RunHistorySection from "./today/RunHistorySection";

const RUN_LENGTH = 5;
const MAX_OBSERVED_BEHAVIOURS = 2;

const RUN_END_INSIGHT_LINE =
  "Most traders need 5–10 runs before patterns become obvious.";

const coerceActiveRunState = (value: unknown): ActiveRunState => {
  if (value === "active" || value === "summary" || value === "inactive") {
    return value;
  }
  return "inactive";
};

const clampObservedBehaviours = (ids: string[] | null | undefined) => {
  if (!ids || !Array.isArray(ids)) {
    return [];
  }
  return ids
    .filter((id) => typeof id === "string")
    .slice(0, MAX_OBSERVED_BEHAVIOURS);
};

const getRuleSummary = (rule: string) => {
  const trimmed = rule.trim();
  if (!trimmed) {
    return "";
  }
  const sentenceEnd = trimmed.search(/[.!?]/);
  let summary =
    sentenceEnd === -1 ? trimmed : trimmed.slice(0, sentenceEnd + 1);
  if (summary.length > 90) {
    summary = `${summary.slice(0, 87).trimEnd()}...`;
  }
  return summary;
};

const persistRunHistory = (history: RunHistoryEntry[]) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("runHistory", JSON.stringify(history));
};

const buildCheckinsFromSnapshot = (
  runId: string,
  snapshot: CheckInEntry[],
): CheckinRecord[] => {
  return snapshot.map((entry, index) => ({
    id: `${runId}-${entry.dayIndex}-${index}`,
    runId,
    dayIndex: entry.dayIndex,
    result: entry.followed ? "clean" : "violated",
    note: entry.note,
    createdAt: new Date(entry.date).toISOString(),
  }));
};

const mapCheckinsToEntries = (checkins: CheckinRecord[]): CheckInEntry[] => {
  return checkins
    .slice()
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((checkin) => ({
      dayIndex: checkin.dayIndex,
      date: checkin.createdAt.slice(0, 10),
      followed: checkin.result === "clean",
      note: checkin.note,
    }));
};

const getDashboardViewModel = ({
  isPro,
  runStatus,
  activeProtocol,
  runHistory,
  hasCompletedRun,
  runHistoryRows,
  visibleRunHistoryRows,
  runHistoryCount,
}: {
  isPro: boolean;
  runStatus: "idle" | "active" | "failed" | "completed" | "ended";
  activeProtocol: Protocol | null;
  runHistory: RunHistoryEntry[];
  hasCompletedRun: boolean;
  runHistoryRows: RunHistoryRow[];
  visibleRunHistoryRows: RunHistoryRow[];
  runHistoryCount: number;
}) => {
  const runActive = runStatus === "active";
  const latestRun = runHistory[0] ?? null;
  const showFreeRunComplete = false;
  const activeRunState = coerceActiveRunState(
    runActive && activeProtocol ? "active" : "inactive",
  );

  return {
    activeRunState,
    latestRun,
    showFreeRunComplete,
    runHistory: {
      rows: runHistoryRows,
      visibleRows: visibleRunHistoryRows,
      count: runHistoryCount,
      collapsible: true,
      defaults: {
        collapsed: true,
      },
    },
    defaults: {
      runHistoryCollapsed: true,
      patternInsightsCollapsed: true,
      protocolLibraryCollapsed: true,
    },
  };
};

const getObservedBehaviourLogCounts = (snapshot: CheckInEntry[]) => {
  const counts: Record<string, number> = {};
  snapshot.forEach((entry) => {
    if (!entry.observedBehaviourIds) {
      return;
    }
    entry.observedBehaviourIds.forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
  });
  return counts;
};

const getRunEndCopy = (context: RunEndContext): RunEndCopy => {
  const dayIndex = context.cleanDays;

  if (context.result === "Completed" && dayIndex === RUN_LENGTH) {
    return {
      title: "Run complete",
      outcomePrefix: "The protocol was completed without violation.",
      outcomeHighlight: "",
      outcomeSuffix: "",
      reframeLines: [],
      primaryLabel: "Start another run",
      primarySubtext: "",
      primarySupportingLine: "",
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
        "That happens.",
        "Early failures usually mean the rule exposed a real reflex. That’s the point.",
        RUN_END_INSIGHT_LINE,
      ],
      primaryLabel: "Start another run",
      primarySubtext: "",
      primarySupportingLine: "",
      secondaryLabel: "Close",
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
      primaryLabel: "Start another run",
      primarySubtext: "",
      primarySupportingLine: "",
      secondaryLabel: "Close",
    };
  }

  return {
    title: "Run ended",
    outcomePrefix: "You violated the protocol on day ",
    outcomeHighlight: String(failureDay),
    outcomeSuffix: ` of ${RUN_LENGTH}.`,
    reframeLines: [
      "That happens.",
      "Early failures usually mean the rule exposed a real reflex. That’s the point.",
      RUN_END_INSIGHT_LINE,
    ],
    primaryLabel: "Start another run",
    primarySubtext: "",
    primarySupportingLine: "",
    secondaryLabel: "Close",
  };
};

const storageKeys = [
  "activeProblemId",
  "activeProtocolId",
  "activeRunId",
  "activatedAt",
  "runStatus",
  "runStartDate",
  "streak",
  "checkIns",
  "observedBehaviourIds",
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

const createRunId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}`;
};

type CheckInEntry = {
  dayIndex: number;
  date: string;
  followed: boolean;
  note?: string;
  observedBehaviourIds?: string[];
};

const buildRunTracker = (length: number, checkIns: CheckInEntry[]) => {
  const symbols = Array.from({ length }, () => "▢");
  checkIns.forEach((entry) => {
    const index = entry.dayIndex - 1;
    if (index < 0 || index >= length) {
      return;
    }
    symbols[index] = entry.followed ? "✓" : "✕";
  });
  return symbols;
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

const computeCurrentRun = (checkIns: CheckInEntry[]) => {
  let count = 0;
  for (let index = checkIns.length - 1; index >= 0; index -= 1) {
    if (!checkIns[index]?.followed) {
      break;
    }
    count += 1;
  }
  return count;
};

const computeBestRun = (checkIns: CheckInEntry[]) => {
  let best = 0;
  let current = 0;
  checkIns.forEach((entry) => {
    if (!entry.followed) {
      current = 0;
      return;
    }
    current += 1;
    if (current > best) {
      best = current;
    }
  });
  return best;
};

export default function QuadrantApp({
  view,
}: {
  view: "dashboard" | "protocols";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/dashboard";
  const { user, isAuthed, authLoading } = useAuth();
  const [confirmProtocolId, setConfirmProtocolId] = useState<string | null>(
    null,
  );
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [runStatus, setRunStatus] = useState<
    "idle" | "active" | "failed" | "completed" | "ended"
  >("idle");
  const [runStartDate, setRunStartDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([]);
  const [observedBehaviourIds, setObservedBehaviourIds] = useState<string[]>(
    [],
  );
  const [observedBehaviourLogSelection, setObservedBehaviourLogSelection] =
    useState<string[]>([]);
  const [hasCompletedRun, setHasCompletedRun] = useState(false);
  const [libraryProtocolId, setLibraryProtocolId] = useState<string | null>(
    null,
  );
  const [showRunDetail, setShowRunDetail] = useState(false);
  const [showRunEndedModal, setShowRunEndedModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [runEndContext, setRunEndContext] = useState<RunEndContext | null>(
    null,
  );
  const [isRunHistoryCollapsed, setIsRunHistoryCollapsed] = useState<
    boolean | null
  >(null);
  const [isPatternInsightsCollapsed, setIsPatternInsightsCollapsed] = useState<
    boolean | null
  >(null);
  const [isProtocolLibraryCollapsed, setIsProtocolLibraryCollapsed] = useState<
    boolean | null
  >(null);
  const [showObservedBehaviourPicker, setShowObservedBehaviourPicker] =
    useState(false);
  const [observedBehaviourSelection, setObservedBehaviourSelection] = useState<
    string[]
  >([]);
  const [observedBehaviourError, setObservedBehaviourError] = useState("");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runCheckinsByRunId, setRunCheckinsByRunId] = useState<
    Record<string, CheckinRecord[]>
  >({});
  const [runsLoading, setRunsLoading] = useState(true);
  const [supabaseReady, setSupabaseReadyState] = useState(false);
  const isPro = isAuthed;
  const storageAdapter = useMemo(
    () =>
      getAdapter({
        isAuthed,
        userId: user?.id ?? null,
        supabaseReady,
      }),
    [isAuthed, user?.id, supabaseReady],
  );

  useEffect(() => {
    if (!isAuthed || !isPro || !user?.id) {
      return;
    }
    if (hasMigratedToSupabase()) {
      return;
    }
    void migrateLocalToSupabase(user.id);
  }, [isAuthed, isPro, user?.id]);

  useEffect(() => {
    if (isAuthed && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [isAuthed, showAuthModal]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setSupabaseReadyState(isSupabaseReady());
  }, [isAuthed, authLoading]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    setRunsLoading(true);
    setSelectedRunId(null);
    setShowRunDetail(false);
    setIsRunHistoryCollapsed(null);
    setIsPatternInsightsCollapsed(null);
    setIsProtocolLibraryCollapsed(null);
  }, [authLoading, isAuthed]);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading) {
      return;
    }

    const storedActiveProblemId = localStorage.getItem("activeProblemId");
    const storedProtocolId = localStorage.getItem("activeProtocolId");
    const storedRunId = localStorage.getItem("activeRunId");
    const storedActivatedAt = localStorage.getItem("activatedAt");
    const storedRunStatus = localStorage.getItem("runStatus");
    const storedRunStartDate = localStorage.getItem("runStartDate");
    const storedStreak = localStorage.getItem("streak");
    const storedCheckIns = localStorage.getItem("checkIns");
    const storedObservedBehaviours = localStorage.getItem("observedBehaviourIds");
    const storedHasCompletedRun = localStorage.getItem("hasCompletedRun");
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
    if (storedRunId) {
      setActiveRunId(storedRunId);
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
        const parsedCheckIns = JSON.parse(storedCheckIns) as
          | CheckInEntry[]
          | Record<
              string,
              { followed: boolean; note?: string; observedBehaviourIds?: string[] }
            >;
        if (Array.isArray(parsedCheckIns)) {
          setCheckIns(parsedCheckIns);
        } else {
          const sortedDates = Object.keys(parsedCheckIns).sort();
          const converted = sortedDates.map((date, index) => ({
            dayIndex: index + 1,
            date,
            followed: parsedCheckIns[date]?.followed ?? false,
            note: parsedCheckIns[date]?.note,
            observedBehaviourIds: parsedCheckIns[date]?.observedBehaviourIds,
          }));
          setCheckIns(converted);
        }
      } catch {
        setCheckIns([]);
      }
    }
    if (storedObservedBehaviours) {
      try {
        const parsedObservedBehaviours = JSON.parse(
          storedObservedBehaviours,
        ) as string[];
        setObservedBehaviourIds(clampObservedBehaviours(parsedObservedBehaviours));
      } catch {
        setObservedBehaviourIds([]);
      }
    }
    if (authLoading) {
      return;
    }
    if (isPro && storedHasCompletedRun === "true") {
      setHasCompletedRun(true);
    }
    if (isAuthed && user?.id) {
      let active = true;
      loadSupabaseRunsWithCheckins(user.id)
        .then((result) => {
          if (!active) {
            return;
          }
          if (result.ok && result.hasData) {
            setSupabaseReady(true);
            setSupabaseReadyState(true);
            setRunHistory(
              result.runs.map((entry) => ({
                ...entry,
                observedBehaviourIds: clampObservedBehaviours(
                  entry.observedBehaviourIds,
                ),
                observedBehaviourLogCounts: entry.observedBehaviourLogCounts ?? {},
              })),
            );
            setHasCompletedRun(result.runs.length > 0);
            setRunCheckinsByRunId(result.checkinsByRunId);
            if (result.activeRun) {
              setActiveRunId(result.activeRun.id);
              setActiveProtocolId(result.activeRun.protocol_id);
              setRunStatus("active");
              setActivatedAt(result.activeRun.started_at);
              setRunStartDate(
                result.activeRun.started_at
                  ? result.activeRun.started_at.slice(0, 10)
                  : null,
              );
              const activeCheckins =
                result.checkinsByRunId[result.activeRun.id] ?? [];
              const mappedCheckins = mapCheckinsToEntries(activeCheckins);
              setCheckIns(mappedCheckins);
              setStreak(
                mappedCheckins.filter((entry) => entry.followed).length,
              );
            }
            setRunsLoading(false);
            return;
          }
          if (storedRunHistory) {
            try {
              const parsedHistory = JSON.parse(
                storedRunHistory,
              ) as RunHistoryEntry[];
              setRunHistory(
                parsedHistory.map((entry) => ({
                  ...entry,
                  observedBehaviourIds: clampObservedBehaviours(
                    entry.observedBehaviourIds,
                  ),
                  observedBehaviourLogCounts: entry.observedBehaviourLogCounts ?? {},
                })),
              );
              setRunCheckinsByRunId({});
              setRunsLoading(false);
            } catch {
              setRunHistory([]);
              setRunCheckinsByRunId({});
              setRunsLoading(false);
            }
          }
          setRunsLoading(false);
        })
        .catch(() => {
          if (!active) {
            return;
          }
          if (storedRunHistory) {
            try {
              const parsedHistory = JSON.parse(
                storedRunHistory,
              ) as RunHistoryEntry[];
              setRunHistory(
                parsedHistory.map((entry) => ({
                  ...entry,
                  observedBehaviourIds: clampObservedBehaviours(
                    entry.observedBehaviourIds,
                  ),
                  observedBehaviourLogCounts: entry.observedBehaviourLogCounts ?? {},
                })),
              );
              setRunCheckinsByRunId({});
              setRunsLoading(false);
            } catch {
              setRunHistory([]);
              setRunCheckinsByRunId({});
              setRunsLoading(false);
            }
          }
          setRunsLoading(false);
        });
      return () => {
        active = false;
      };
    }
    if (storedRunHistory) {
      try {
        const parsedHistory = JSON.parse(storedRunHistory) as RunHistoryEntry[];
        setRunHistory(
          parsedHistory.map((entry) => ({
            ...entry,
            observedBehaviourIds: clampObservedBehaviours(
              entry.observedBehaviourIds,
            ),
            observedBehaviourLogCounts: entry.observedBehaviourLogCounts ?? {},
          })),
        );
        setRunCheckinsByRunId({});
        setRunsLoading(false);
      } catch {
        setRunHistory([]);
        setRunCheckinsByRunId({});
        setRunsLoading(false);
      }
    } else {
      setRunsLoading(false);
    }
  }, [isPro, isAuthed, user?.id, authLoading]);

  useEffect(() => {
    if (typeof window === "undefined" || !showCheckInModal) {
      return;
    }

    const today = getLocalDateString();
    const latestEntry = checkIns[checkIns.length - 1];
    if (latestEntry && latestEntry.date === today) {
      setCheckInNote(latestEntry.note ?? "");
      setObservedBehaviourLogSelection(
        clampObservedBehaviours(latestEntry.observedBehaviourIds),
      );
    } else {
      setCheckInNote("");
      setObservedBehaviourLogSelection([]);
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
    if (activeRunId) {
      localStorage.setItem("activeRunId", activeRunId);
    } else {
      localStorage.removeItem("activeRunId");
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
    localStorage.setItem(
      "observedBehaviourIds",
      JSON.stringify(clampObservedBehaviours(observedBehaviourIds)),
    );
    if (isPro && !storageAdapter.isSupabase) {
      localStorage.setItem(
        "hasCompletedRun",
        hasCompletedRun ? "true" : "false",
      );
      localStorage.setItem("runHistory", JSON.stringify(runHistory));
    } else {
      localStorage.removeItem("hasCompletedRun");
      localStorage.removeItem("runHistory");
    }
  }, [
    activeProblemId,
    activeProtocolId,
    activeRunId,
    activatedAt,
    runStatus,
    runStartDate,
    streak,
    checkIns,
    observedBehaviourIds,
    hasCompletedRun,
    runHistory,
    isPro,
    storageAdapter,
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
  const successfulDays = checkIns.filter((entry) => entry.followed).length;
  const freeProgressCount = Math.min(successfulDays, RUN_LENGTH);
  const progressCount = isPro ? successfulDays : freeProgressCount;
  const runTrackerSymbols = buildRunTracker(RUN_LENGTH, checkIns);
  const recentCheckIns = checkIns.slice(-14);
  const recentCheckInSymbols = [
    ...Array.from({ length: 14 - recentCheckIns.length }, () => "▢"),
    ...recentCheckIns.map((entry) => (entry.followed ? "✓" : "✕")),
  ];

  const runActive = runStatus === "active";
  const runComplete = runStatus === "completed";
  const runFailed = runStatus === "failed";
  const canStartNewRun = !runActive;
  const freeRunCompleted = isPro ? hasCompletedRun : false;
  const freeRunComplete = !isPro && freeRunCompleted;
  useEffect(() => {
    if (!runActive) {
      return;
    }
    setIsRunHistoryCollapsed(true);
    setIsPatternInsightsCollapsed(true);
    setIsProtocolLibraryCollapsed(true);
  }, [runActive]);

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
    setActiveRunId(null);
    setActivatedAt(null);
    setRunStatus("idle");
    setRunStartDate(null);
    setStreak(0);
    setCheckIns([]);
    setObservedBehaviourIds([]);
    setCheckInNote("");
    setShowRunDetail(false);
    setSelectedRunId(null);
    setShowRunEndedModal(false);
    setRunEndContext(null);
    setShowCheckInModal(false);
    setConfirmProtocolId(null);
    setIsRunHistoryCollapsed(null);
    setIsPatternInsightsCollapsed(null);
    setIsProtocolLibraryCollapsed(null);
    setLibraryProtocolId(null);
  };

  const appendRunHistory = (
    result: "Completed" | "Failed" | "Ended",
    snapshot: CheckInEntry[],
  ) => {
    if (!isPro || !activeProtocolId || !activeProtocol) {
      return;
    }
    const cleanDays = snapshot.filter((entry) => entry.followed).length;
    const notes = snapshot
      .filter((entry) => entry.note && entry.note.trim().length > 0)
      .map((entry) => ({
        date: entry.date,
        note: entry.note as string,
      }));
    const entry = {
      id: activeRunId ?? createRunId(),
      protocolId: activeProtocolId,
      protocolName: activeProtocol.name,
      startedAt: activatedAt,
      endedAt: new Date().toISOString(),
      result,
      cleanDays,
      observedBehaviourIds: isPro
        ? clampObservedBehaviours(observedBehaviourIds)
        : [],
      observedBehaviourLogCounts: isPro
        ? getObservedBehaviourLogCounts(snapshot)
        : {},
      notes,
    };
    setRunHistory((prev) => {
      const next = [entry, ...prev];
      persistRunHistory(next);
      return next;
    });
    if (isAuthed && user?.id) {
      void upsertSupabaseRun({
        userId: user.id,
        id: entry.id,
        protocolId: entry.protocolId,
        protocolName: entry.protocolName,
        status: result.toLowerCase() as "completed" | "failed" | "ended",
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
      }).then((success) => {
        if (success) {
          setSupabaseReadyState(true);
        }
      });
      const checkins = buildCheckinsFromSnapshot(entry.id, snapshot);
      checkins.forEach((checkin) => {
        void insertSupabaseCheckin({ userId: user.id, checkin }).then(
          (success) => {
            if (success) {
              setSupabaseReadyState(true);
            }
          },
        );
      });
    }
  };

  const activateProtocol = (
    protocolId: string,
    problemId: number | null,
    observedIds?: string[],
  ) => {
    const timestamp = new Date().toISOString();
    const today = getLocalDateString();
    setActivatedAt(timestamp);
    setActiveProblemId(problemId);
    setActiveProtocolId(protocolId);
    const nextRunId = activeRunId ?? createRunId();
    setActiveRunId(nextRunId);
    setRunStatus("active");
    setRunStartDate(today);
    setStreak(0);
    setCheckIns([]);
    setObservedBehaviourIds(
      isPro ? clampObservedBehaviours(observedIds) : [],
    );
    setCheckInNote("");
    setLibraryProtocolId(null);
    if (isAuthed && user?.id) {
      void upsertSupabaseRun({
        userId: user.id,
        id: nextRunId,
        protocolId,
        protocolName: protocolById[protocolId]?.name ?? "Protocol",
        status: "active",
        startedAt: timestamp,
        endedAt: null,
      }).then((success) => {
        if (success) {
          setSupabaseReadyState(true);
        }
      });
    }
    router.push("/dashboard");
    focusActiveRun();
  };

  const handleActivateProtocol = () => {
    if (!selectedProtocol) {
      return;
    }
    if (!canStartNewRun) {
      return;
    }
    activateProtocol(
      selectedProtocol.id,
      null,
      isPro ? observedBehaviourSelection : [],
    );
    setConfirmProtocolId(null);
    setShowObservedBehaviourPicker(false);
    setObservedBehaviourSelection([]);
    setObservedBehaviourError("");
  };

  const persistCheckIns = (nextCheckIns: CheckInEntry[]) => {
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
    const lastEntry = checkIns[checkIns.length - 1];
    const nextEntry: CheckInEntry = {
      dayIndex: lastEntry?.date === dateStamp ? lastEntry.dayIndex : checkIns.length + 1,
      date: dateStamp,
      followed,
      note: noteValue || undefined,
      observedBehaviourIds:
        followed && isPro
          ? clampObservedBehaviours(observedBehaviourLogSelection)
          : undefined,
    };
    const updatedCheckIns =
      lastEntry?.date === dateStamp
        ? [...checkIns.slice(0, -1), nextEntry]
        : [...checkIns, nextEntry];
    persistCheckIns(updatedCheckIns);
    const cleanDays = updatedCheckIns.filter((entry) => entry.followed).length;
    const newStreak = computeCurrentRun(updatedCheckIns);
    setStreak(newStreak);
    if (isAuthed && user?.id && activeRunId) {
      const checkinRecord: CheckinRecord = {
        id: `${activeRunId}-${nextEntry.dayIndex}`,
        runId: activeRunId,
        dayIndex: nextEntry.dayIndex,
        result: followed ? "clean" : "violated",
        note: nextEntry.note,
        createdAt: new Date(nextEntry.date).toISOString(),
      };
      void insertSupabaseCheckin({ userId: user.id, checkin: checkinRecord }).then(
        (success) => {
          if (success) {
            setSupabaseReadyState(true);
          }
        },
      );
    }
    if (!followed) {
      setRunStatus("failed");
      setRunEndContext({ result: "Failed", cleanDays });
      if (isPro) {
        appendRunHistory("Failed", updatedCheckIns);
      }
      setShowRunEndedModal(true);
      setShowCheckInModal(false);
      return;
    } else if (newStreak >= RUN_LENGTH) {
      setRunStatus("completed");
      setRunEndContext({ result: "Completed", cleanDays });
      appendRunHistory("Completed", updatedCheckIns);
      setShowRunEndedModal(true);
    }
    setCheckInNote(noteValue);
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
    setCheckInNote("");
    setRunStatus("idle");
    setRunStartDate(null);
    setStreak(0);
    setCheckIns([]);
    setObservedBehaviourIds([]);
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

  const availableObservedBehaviours = observedBehaviours.filter((behaviour) =>
    observedBehaviourIds.includes(behaviour.id),
  );

  const runHistoryRows = isPro
    ? runHistory.map((entry) => ({
        id: entry.id,
        protocol: entry.protocolName,
        result: entry.result,
        days: entry.cleanDays,
        strip: buildHistoryStrip(entry.cleanDays, entry.result, RUN_LENGTH),
      }))
    : [];
  const selectedRun =
    isPro && selectedRunId && runHistory.length > 0
      ? runHistory.find((entry) => entry.id === selectedRunId) ?? null
      : null;
  const selectedRunProtocol = selectedRun
    ? protocolById[selectedRun.protocolId]
    : null;
  const visibleRunHistoryRows = isPro ? runHistoryRows : [];
  const runHistoryCount = isPro ? runHistoryRows.length : 0;
  const runEndHistoryStrip =
    runEndContext !== null
      ? buildHistoryStrip(runEndContext.cleanDays, runEndContext.result, RUN_LENGTH)
      : [];
  const dashboardViewModel = getDashboardViewModel({
    isPro,
    runStatus,
    activeProtocol,
    runHistory,
    hasCompletedRun,
    runHistoryRows,
    visibleRunHistoryRows,
    runHistoryCount,
  });
  const latestRunStrip =
    dashboardViewModel.latestRun !== null
      ? buildHistoryStrip(
          dashboardViewModel.latestRun.cleanDays,
          dashboardViewModel.latestRun.result,
          RUN_LENGTH,
        )
      : [];
  const isRunHistoryCollapsedResolved =
    isRunHistoryCollapsed ?? dashboardViewModel.defaults.runHistoryCollapsed;
  const isPatternInsightsCollapsedResolved =
    isPatternInsightsCollapsed ??
    dashboardViewModel.defaults.patternInsightsCollapsed;
  const isProtocolLibraryCollapsedResolved =
    isProtocolLibraryCollapsed ??
    dashboardViewModel.defaults.protocolLibraryCollapsed;
  const failedRuns = runHistory.filter((entry) => entry.result === "Failed");
  const uniqueProtocolsAttempted = new Set(
    runHistory.map((entry) => entry.protocolId),
  ).size;
  const longestCleanRun = runHistory.reduce((max, entry) => {
    const checkins = runCheckinsByRunId[entry.id] ?? [];
    const cleanCount = checkins.filter(
      (checkin) => checkin.result === "clean",
    ).length;
    return Math.max(max, cleanCount);
  }, 0);
  const protocolFailureCounts = failedRuns.reduce<Record<string, number>>(
    (acc, entry) => {
      acc[entry.protocolId] = (acc[entry.protocolId] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const mostFrequentFailureCount = Math.max(
    0,
    ...Object.values(protocolFailureCounts),
  );
  const failureDayCounts = failedRuns.reduce<Record<number, number>>(
    (acc, entry) => {
      const checkins = runCheckinsByRunId[entry.id] ?? [];
      const violated = checkins.filter(
        (checkin) => checkin.result === "violated",
      );
      const violationDay =
        violated.length > 0
          ? Math.max(...violated.map((checkin) => checkin.dayIndex))
          : null;
      if (violationDay) {
        acc[violationDay] = (acc[violationDay] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );
  const failureDayMode = Object.entries(failureDayCounts).reduce<
    { day: number; count: number } | null
  >((best, [dayKey, count]) => {
    const day = Number(dayKey);
    if (!best || count > best.count || (count === best.count && day < best.day)) {
      return { day, count };
    }
    return best;
  }, null);

  const mostFrequentProtocolId = Object.entries(protocolFailureCounts).reduce<
    { id: string; count: number } | null
  >((best, [id, count]) => {
    if (!best || count > best.count) {
      return { id, count };
    }
    return best;
  }, null);
  const switchCount = runHistory
    .slice()
    .reverse()
    .reduce(
      (acc, entry, index, arr) => {
        if (index === 0) {
          return { last: entry.protocolId, count: 0 };
        }
        if (entry.protocolId !== acc.last) {
          return { last: entry.protocolId, count: acc.count + 1 };
        }
        return acc;
      },
      { last: "", count: 0 },
    ).count;
  const mostFrequentProtocolName =
    mostFrequentProtocolId?.id
      ? protocolById[mostFrequentProtocolId.id]?.name ??
        mostFrequentProtocolId.id
      : "";
  const hasRuns = runHistory.length > 0;
  const patternInsights = [
    {
      title: "Most frequent breaking behaviour",
      isUnlocked: Boolean(mostFrequentProtocolId),
      requirement: "Requires memory across runs.",
      value: mostFrequentProtocolName,
      subtitle:
        "This behaviour appears more often than any other across your runs.",
      className: "md:col-span-2",
    },
    {
      title: "Longest clean run",
      isUnlocked: hasRuns,
      requirement: "Requires memory across runs.",
      value: `${longestCleanRun} clean days`,
      subtitle:
        "The maximum number of consecutive clean days you’ve completed without violation.",
    },
    {
      title: "Where runs usually fail",
      isUnlocked: Boolean(failureDayMode),
      requirement: "Requires repeated outcomes to surface.",
      value: failureDayMode ? `Day ${failureDayMode.day}` : "",
      subtitle: "Most violations occur at the same point in the run.",
    },
    {
      title: "Constraint switching",
      isUnlocked: runHistory.length > 1,
      requirement: "Requires multiple completed runs.",
      value: `${switchCount} switches`,
      subtitle: "Tracks how often you abandon one constraint for another.",
    },
  ];
  const patternInsightsEmpty = runHistory.length === 0;
  const patternInsightsEmptyMessage =
    "No patterns yet — complete a few runs to unlock insights.";
  const runSummaryLine = RUN_END_INSIGHT_LINE;
  const runEndModalOpen =
    showRunEndedModal && view === "dashboard" && runEndContext !== null;
  const runEndCopy = runEndContext ? getRunEndCopy(runEndContext) : null;
  const runEndPrimaryLabel = runEndCopy?.primaryLabel ?? "Start another run";
  const requireAuth = () => {
    if (isAuthed) {
      return false;
    }
    setShowAuthModal(true);
    return true;
  };
  const focusProtocolLibrary = () => {
    setIsProtocolLibraryCollapsed(false);
    setIsRunHistoryCollapsed(true);
    setIsPatternInsightsCollapsed(true);
    setLibraryProtocolId(null);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document
          .getElementById("protocol-library")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };
  const focusActiveRun = () => {
    setIsProtocolLibraryCollapsed(true);
    setIsRunHistoryCollapsed(true);
    setIsPatternInsightsCollapsed(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document
          .getElementById("active-run")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };
  const activeRuleText = activeProtocol ? activeProtocol.rule : "";
  const activeRunLoading = authLoading || runsLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-[var(--space-6)] text-zinc-900">
      <main
        className={`w-full max-w-3xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)] ${
          runEndModalOpen ? "pointer-events-none select-none" : ""
        }`}
        aria-hidden={runEndModalOpen}
      >
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span>{view === "dashboard" ? "Dashboard" : ""}</span>
          <div className="flex items-center gap-3">
            <a
              href="/about"
              className="btn-tertiary"
            >
              About Quadrant
            </a>
          </div>
        </div>

        {view === "dashboard" && (
          <section className="mt-8 space-y-6">
            <ActiveRunSection
              activeRunState={dashboardViewModel.activeRunState}
              activeProtocol={activeProtocol}
              activeRuleText={activeRuleText}
              runActive={runActive}
              loading={activeRunLoading}
              runTrackerSymbols={runTrackerSymbols}
              successfulDays={successfulDays}
              runLength={RUN_LENGTH}
              latestRun={dashboardViewModel.latestRun}
              latestRunStrip={latestRunStrip}
              runSummaryLine={runSummaryLine}
              showFreeRunComplete={dashboardViewModel.showFreeRunComplete}
              sectionId="active-run"
              onCheckIn={handleCheckInClick}
              onStartRun={focusProtocolLibrary}
              onViewPricing={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/pricing";
                }
              }}
            />
            <div className="space-y-10">
              {isPro ? (
                <RunHistorySection
                  collapsed={isRunHistoryCollapsedResolved}
                  count={dashboardViewModel.runHistory.count}
                  rows={dashboardViewModel.runHistory.visibleRows}
                  loading={runsLoading}
                  onToggle={() => {
                    if (requireAuth()) {
                      return;
                    }
                    setIsRunHistoryCollapsed(
                      (collapsed) =>
                        !(
                          collapsed ??
                          dashboardViewModel.defaults.runHistoryCollapsed
                        ),
                    );
                  }}
                  onRowClick={(rowId) => {
                    if (requireAuth()) {
                      return;
                    }
                    setSelectedRunId(rowId);
                    setShowRunDetail(true);
                  }}
                />
              ) : (
                <section className="ui-surface p-[var(--space-6)]">
                  <div className="flex w-full items-start justify-between text-left">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Run history
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Run history is empty.
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Pro preserves behavioural evidence across runs.
                      </p>
                      <button
                        type="button"
                        className="btn-tertiary mt-3"
                        onClick={() => {
                          setShowAuthModal(true);
                        }}
                      >
                        Sign in
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-zinc-400">
                      Pro
                    </span>
                  </div>
                </section>
              )}
              <PatternInsightsSection
                collapsed={isPatternInsightsCollapsedResolved}
                onToggle={() => {
                  if (requireAuth()) {
                    return;
                  }
                  setIsPatternInsightsCollapsed(
                    (collapsed) =>
                      !(
                        collapsed ??
                        dashboardViewModel.defaults.patternInsightsCollapsed
                      ),
                  );
                }}
                isPro={isPro}
                patternInsights={patternInsights}
                showEmptyState={patternInsightsEmpty}
                emptyStateMessage={patternInsightsEmptyMessage}
                onViewPricing={() => {
                  setShowAuthModal(true);
                }}
              />

              <ProtocolLibrarySection
                collapsed={isProtocolLibraryCollapsedResolved}
                protocols={orderedProtocols}
                libraryProtocolId={libraryProtocolId}
                canActivate={dashboardViewModel.activeRunState === "inactive"}
                onActivateProtocol={(protocolId) => {
                  if (isPro) {
                    setConfirmProtocolId(protocolId);
                    return;
                  }
                  activateProtocol(protocolId, null);
                }}
                sectionId="protocol-library"
                onToggle={() =>
                  setIsProtocolLibraryCollapsed(
                    (collapsed) =>
                      !(
                        collapsed ??
                        dashboardViewModel.defaults.protocolLibraryCollapsed
                      ),
                  )
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
                          {protocol.commonBehaviourRemoved}
                        </div>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {isExpanded ? "v" : ">"}
                      </span>
                    </button>
                    {isExpanded ? (
                      <div className="border-t border-[var(--border-color)] bg-zinc-50 px-[var(--space-4)] py-[var(--space-4)]">
                        <div className="border-l border-[var(--border-color)] pl-[var(--space-4)]">
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
                              className="btn btn-primary text-sm"
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
        <DailyCheckInModal
          checkInNote={checkInNote}
          onChangeNote={setCheckInNote}
          onClose={() => setShowCheckInModal(false)}
          onCleanDay={() => {
            handleSaveCheckIn(true);
          }}
          onViolated={() => {
            handleSaveCheckIn(false);
          }}
          isPro={isPro}
          availableObservedBehaviours={availableObservedBehaviours}
          observedBehaviourLogSelection={observedBehaviourLogSelection}
          setObservedBehaviourLogSelection={setObservedBehaviourLogSelection}
          maxObservedBehaviours={MAX_OBSERVED_BEHAVIOURS}
        />
      ) : null}
      {selectedProtocol ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 px-[var(--space-6)] backdrop-blur-sm">
          <div className="flex w-full max-w-xl max-h-[85vh] flex-col ui-modal p-[var(--space-6)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-zinc-500">
                Activate protocol?
              </p>
              <h2 className="text-xl font-semibold text-zinc-900">
                {selectedProtocol.name}
              </h2>
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 text-sm text-zinc-700">
              <div className="space-y-2">
                {selectedProtocol.commonBehaviourRemoved ? (
                  <div className="whitespace-normal break-words">
                    Behaviour removed: {selectedProtocol.commonBehaviourRemoved}
                  </div>
                ) : null}
                <div className="text-base font-semibold text-zinc-900 whitespace-normal break-words">
                  Rule: {selectedProtocol.rule}
                </div>
                <div className="whitespace-normal break-words">
                  Ends when: {selectedProtocol.duration}
                </div>
                <div className="whitespace-normal break-words">
                  Failure: {selectedProtocol.failure}
                </div>
              </div>
              {isPro ? (
                <div className="ui-inset p-[var(--space-4)]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-900"
                    onClick={() =>
                      setShowObservedBehaviourPicker((prev) => !prev)
                    }
                  >
                    <span>Observe additional behaviours (optional)</span>
                    <span className="text-sm text-zinc-500">
                      {showObservedBehaviourPicker ? "v" : ">"}
                    </span>
                  </button>
                  {showObservedBehaviourPicker ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-zinc-500">
                        Tracked for insight. Does not end your run.
                      </p>
                      <div className="space-y-2">
                        {observedBehaviours.map((behaviour) => {
                          const isChecked = observedBehaviourSelection.includes(
                            behaviour.id,
                          );
                          return (
                            <label
                              key={behaviour.id}
                              className="flex items-start gap-3 text-sm text-zinc-700"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
                                checked={isChecked}
                                onChange={() => {
                                  setObservedBehaviourError("");
                                  if (isChecked) {
                                    setObservedBehaviourSelection((prev) =>
                                      prev.filter((id) => id !== behaviour.id),
                                    );
                                    return;
                                  }
                                  if (
                                    observedBehaviourSelection.length >=
                                    MAX_OBSERVED_BEHAVIOURS
                                  ) {
                                    setObservedBehaviourError("Choose up to 2.");
                                    return;
                                  }
                                  setObservedBehaviourSelection((prev) => [
                                    ...prev,
                                    behaviour.id,
                                  ]);
                                }}
                              />
                              <span>
                                <span className="font-semibold text-zinc-900">
                                  {behaviour.label}
                                </span>
                                <span className="mt-1 block text-xs text-zinc-500">
                                  {behaviour.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {observedBehaviourError ? (
                        <p className="text-xs font-semibold text-zinc-500">
                          {observedBehaviourError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => {
                  setConfirmProtocolId(null);
                  setShowObservedBehaviourPicker(false);
                  setObservedBehaviourSelection([]);
                  setObservedBehaviourError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={handleActivateProtocol}
              >
                Activate protocol
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {runEndModalOpen && runEndCopy && runEndContext ? (
        <RunEndedModal
          runEndCopy={runEndCopy}
          runEndContext={runEndContext}
          historyStrip={runEndHistoryStrip}
          primaryLabel={runEndPrimaryLabel}
          showFreeNotice={!isAuthed}
          freeActionLabel={
            runEndContext?.result === "Completed"
              ? "Save this run → Pro"
              : "See pricing"
          }
          showCloseButton={isPro}
          onUpgradeClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/pricing";
            }
          }}
          onPrimaryAction={() => {
            clearActiveProtocol();
          }}
          onClose={() => {
            clearActiveProtocol();
          }}
        />
      ) : null}
      {showAuthModal ? (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      ) : null}
      {showRunDetail && selectedRun && selectedRunProtocol && isPro ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
          <div className="w-full max-w-xl ui-modal p-[var(--space-6)]">
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
                className="btn-tertiary"
                onClick={() => setShowRunDetail(false)}
              >
                Close
              </button>
            </div>
            <dl className="mt-4 space-y-4 text-sm text-zinc-700">
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
            <div className="ui-inset mt-4 p-[var(--space-4)]">
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
                        ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                        : symbol === "✓"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-[var(--border-color)] text-zinc-600"
                    }`}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            </div>
            {selectedRun.notes && selectedRun.notes.length > 0 ? (
              <div className="ui-inset mt-4 p-[var(--space-4)]">
                <div className="text-xs font-semibold tracking-wide text-zinc-500">
                  Notes
                </div>
                <div className="mt-3 space-y-2">
                  {selectedRun.notes.map((entry) => (
                    <div
                      key={`run-note-${entry.date}`}
                      className="ui-inset px-[var(--space-3)] py-[var(--space-2)]"
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
      {showRunDetail && selectedRun && selectedRunProtocol && !isPro ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
          <div className="w-full max-w-xl ui-modal p-[var(--space-6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900">
                  Run history
                </h2>
              </div>
              <button
                type="button"
                className="btn-tertiary"
                onClick={() => setShowRunDetail(false)}
              >
                Close
              </button>
            </div>
            <p className="mt-4 text-sm text-zinc-700">
              Run details are available in Pro.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = "/pricing";
                  }
                }}
              >
                See pricing
              </button>
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => setShowRunDetail(false)}
              >
                Back to Today
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

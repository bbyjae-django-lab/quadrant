"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { getSupabaseClient } from "../lib/supabaseClient";
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
const ACTIVE_RUN_STORAGE_KEY = "quadrant_active_run_v1";
const DASHBOARD_MODAL_KEY = "dashboard_modal";
const ENDED_RUN_ID_KEY = "ended_run_id";
const DASHBOARD_MODAL_CONTEXT_KEY = "dashboard_modal_context";
const PRO_ACTIVE_SEEN_KEY = "pro_active_seen";
const POST_AUTH_INTENT_KEY = "post_auth_intent";
const PENDING_PROTOCOL_ID_KEY = "pending_protocol_id";
const PENDING_PROTOCOL_NAME_KEY = "pending_protocol_name";
const RUN_ENDED_SNAPSHOT_KEY = "runEnded_snapshot";
const PENDING_RUN_KEY = "quadrant_pending_run_v1";
const PENDING_SAVE_INTENT_KEY = "quadrant_pending_save_intent";

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

const loadLocalActiveRun = (): LocalActiveRunSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as LocalActiveRunSnapshot;
    if (
      parsed &&
      parsed.status === "active" &&
      parsed.runId &&
      parsed.protocolId &&
      parsed.protocolName &&
      parsed.startedAt &&
      Array.isArray(parsed.checkins)
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  clearLocalActiveRun();
  return null;
};

const saveLocalActiveRun = (snapshot: LocalActiveRunSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(ACTIVE_RUN_STORAGE_KEY, JSON.stringify(snapshot));
};

const clearLocalActiveRun = () => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
};

type RunEndedModalContext = {
  result: "Completed" | "Failed";
  protocolId: string;
  protocolName: string;
  cleanDays: number;
  runLength: number;
  endedAt: string;
  isFree: boolean;
};

type PendingRunPayload = {
  client_run_id: string;
  protocol_id: string;
  protocol_slug: string;
  protocol_name: string;
  started_at: string;
  ended_at: string;
  end_reason: "violation" | "completed" | "abandoned";
  clean_days: number;
  total_days: number;
  violation_day: number | null;
};

const saveRunEndedModalContext = (context: RunEndedModalContext) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(
    DASHBOARD_MODAL_CONTEXT_KEY,
    JSON.stringify(context),
  );
};

const loadRunEndedModalContext = (): RunEndedModalContext | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(DASHBOARD_MODAL_CONTEXT_KEY);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored) as RunEndedModalContext;
    if (
      parsed &&
      typeof parsed.protocolId === "string" &&
      typeof parsed.protocolName === "string" &&
      typeof parsed.cleanDays === "number" &&
      typeof parsed.runLength === "number" &&
      typeof parsed.endedAt === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const buildPendingRunPayload = (
  context: RunEndContext | null,
): PendingRunPayload | null => {
  if (!context) {
    return null;
  }
  const modalContext = loadRunEndedModalContext();
  if (!modalContext) {
    return null;
  }
  const endedAt = modalContext.endedAt;
  const endDate = new Date(endedAt);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - Math.max(context.cleanDays, 0));
  const endReason =
    context.result === "Failed"
      ? "violation"
      : context.result === "Completed"
        ? "completed"
        : "abandoned";
  const violationDay =
    context.result === "Failed"
      ? Math.min(context.cleanDays + 1, RUN_LENGTH)
      : null;
  return {
    client_run_id: createRunId(),
    protocol_id: modalContext.protocolId,
    protocol_slug: modalContext.protocolId,
    protocol_name: modalContext.protocolName,
    started_at: startDate.toISOString(),
    ended_at: endedAt,
    end_reason: endReason,
    clean_days: context.cleanDays,
    total_days: RUN_LENGTH,
    violation_day: violationDay,
  };
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

const formatTieList = (items: string[]) => {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const mergeCheckinsByDay = (local: CheckInEntry[], remote: CheckInEntry[]) => {
  if (remote.length === 0) {
    return local;
  }
  const byDay = new Map<number, CheckInEntry>();
  local.forEach((entry) => {
    byDay.set(entry.dayIndex, entry);
  });
  remote.forEach((entry) => {
    byDay.set(entry.dayIndex, entry);
  });
  return Array.from(byDay.values()).sort((a, b) => a.dayIndex - b.dayIndex);
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
  const normalizedResult =
    context.result === "Completed" ? "Completed" : "Failed";

  if (normalizedResult === "Completed" && dayIndex === RUN_LENGTH) {
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

type LocalActiveRunSnapshot = {
  runId: string;
  protocolId: string;
  protocolName: string;
  status: "active";
  startedAt: string;
  checkins: Array<{
    dayIndex: number;
    result: "clean" | "violated";
    note?: string;
    createdAt: string;
  }>;
  optionalTrackedBehaviours?: string[];
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
  const searchParams = useSearchParams();
  const isDashboardRoute = pathname === "/dashboard";
  const { user, isAuthed, authLoading, isPro, signOut } = useAuth();
  const initialLocalSnapshot =
    typeof window !== "undefined" ? loadLocalActiveRun() : null;
  const initialLocalCheckIns = initialLocalSnapshot
    ? initialLocalSnapshot.checkins.map((entry) => ({
        dayIndex: entry.dayIndex,
        date: entry.createdAt.slice(0, 10),
        followed: entry.result === "clean",
        note: entry.note,
      }))
    : [];
  const [activateModalProtocolId, setActivateModalProtocolId] = useState<
    string | null
  >(
    null,
  );
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);
  const [activeProtocolId, setActiveProtocolId] = useState<string | null>(
    initialLocalSnapshot?.protocolId ?? null,
  );
  const [activeRunId, setActiveRunId] = useState<string | null>(
    initialLocalSnapshot?.runId ?? null,
  );
  const [activatedAt, setActivatedAt] = useState<string | null>(
    initialLocalSnapshot?.startedAt ?? null,
  );
  const [checkInNote, setCheckInNote] = useState("");
  const [runStatus, setRunStatus] = useState<
    "idle" | "active" | "failed" | "completed" | "ended"
  >(initialLocalSnapshot ? "active" : "idle");
  const [runStartDate, setRunStartDate] = useState<string | null>(
    initialLocalSnapshot?.startedAt
      ? initialLocalSnapshot.startedAt.slice(0, 10)
      : null,
  );
  const [streak, setStreak] = useState(
    initialLocalCheckIns.filter((entry) => entry.followed).length,
  );
  const [checkIns, setCheckIns] =
    useState<CheckInEntry[]>(initialLocalCheckIns);
  const [observedBehaviourIds, setObservedBehaviourIds] = useState<string[]>(
    clampObservedBehaviours(initialLocalSnapshot?.optionalTrackedBehaviours),
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
  const [authModalIntent, setAuthModalIntent] = useState<
    "history" | "checkout"
  >("history");
  const [authModalTitle, setAuthModalTitle] = useState(
    "Sign in to preserve history",
  );
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
  const [activationError, setActivationError] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [runHistory, setRunHistory] = useState<RunHistoryEntry[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runCheckinsByRunId, setRunCheckinsByRunId] = useState<
    Record<string, CheckinRecord[]>
  >({});
  const [runsLoading, setRunsLoading] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [supabaseReady, setSupabaseReadyState] = useState(false);
  const activateModalRef = useRef<HTMLDivElement | null>(null);
  const runDetailModalRef = useRef<HTMLDivElement | null>(null);
  const [showProActive, setShowProActive] = useState(false);
  const checkInsRef = useRef<CheckInEntry[]>(checkIns);
  const activeRunIdRef = useRef<string | null>(activeRunId);
  const hydrateRequestRef = useRef(0);
  const pendingPersistAttemptedRef = useRef(false);

  useEffect(() => {
    checkInsRef.current = checkIns;
  }, [checkIns]);

  useEffect(() => {
    activeRunIdRef.current = activeRunId;
  }, [activeRunId]);

  const persistPendingRun = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!isAuthed || !isPro || !user?.id) {
      return;
    }
    if (pendingPersistAttemptedRef.current) {
      return;
    }
    const stored = localStorage.getItem(PENDING_RUN_KEY);
    if (!stored) {
      return;
    }
    let payload: PendingRunPayload | null = null;
    try {
      payload = JSON.parse(stored) as PendingRunPayload;
    } catch {
      payload = null;
    }
    if (!payload) {
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }
    const sessionResult = await supabase.auth.getSession();
    const token = sessionResult.data.session?.access_token;
    if (!token) {
      return;
    }
    pendingPersistAttemptedRef.current = true;
    const response = await fetch("/api/runs/persist-pending", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      pendingPersistAttemptedRef.current = false;
      return;
    }
    localStorage.removeItem(PENDING_RUN_KEY);
    localStorage.removeItem(PENDING_SAVE_INTENT_KEY);
    const refreshed = await loadSupabaseRunsWithCheckins(user.id);
    if (refreshed.ok) {
      setRunHistory(refreshed.runs);
      setRunCheckinsByRunId(refreshed.checkinsByRunId);
    }
  }, [isAuthed, isPro, user?.id]);
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
    if (typeof window === "undefined" || !hasHydrated) {
      return;
    }
    setSupabaseReadyState(isSupabaseReady());
  }, [isAuthed, authLoading]);

  useEffect(() => {
    if (authLoading || !hasHydrated) {
      return;
    }
    void persistPendingRun();
  }, [authLoading, hasHydrated, persistPendingRun]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    hydrateRequestRef.current += 1;
    setRunsLoading(true);
    setHasHydrated(false);
    setSelectedRunId(null);
    setShowRunDetail(false);
    setIsRunHistoryCollapsed(null);
    setIsPatternInsightsCollapsed(null);
    setIsProtocolLibraryCollapsed(null);
  }, [authLoading, isAuthed]);

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const stripeStatus = searchParams.get("stripe");
    const upgraded = searchParams.get("upgraded");
    if (stripeStatus === "success" || upgraded === "1") {
      if (typeof window !== "undefined") {
        const seen = localStorage.getItem(PRO_ACTIVE_SEEN_KEY);
        if (!seen) {
          setShowProActive(true);
          localStorage.setItem(PRO_ACTIVE_SEEN_KEY, "true");
        }
      } else {
        setShowProActive(true);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading) {
      return;
    }

    if (!isAuthed) {
      const snapshot = loadLocalActiveRun();
      if (snapshot && snapshot.status === "active") {
        setActiveRunId(snapshot.runId);
        setActiveProtocolId(snapshot.protocolId);
        setRunStatus("active");
        setActivatedAt(snapshot.startedAt);
        setRunStartDate(snapshot.startedAt.slice(0, 10));
        setCheckIns(
          snapshot.checkins.map((entry) => ({
            dayIndex: entry.dayIndex,
            date: entry.createdAt.slice(0, 10),
            followed: entry.result === "clean",
            note: entry.note,
          })),
        );
        setStreak(
          snapshot.checkins.filter((entry) => entry.result === "clean").length,
        );
        setObservedBehaviourIds(
          clampObservedBehaviours(snapshot.optionalTrackedBehaviours),
        );
        setRunsLoading(false);
        setHasHydrated(true);
        return;
      }
      const storedProtocolId = localStorage.getItem("activeProtocolId");
      const storedRunId = localStorage.getItem("activeRunId");
      const storedRunStatus = localStorage.getItem("runStatus");
      if (storedRunStatus === "active" && (storedProtocolId || storedRunId)) {
        localStorage.removeItem("activeProtocolId");
        localStorage.removeItem("activeRunId");
        localStorage.removeItem("runStatus");
        localStorage.removeItem(DASHBOARD_MODAL_KEY);
      }
      setRunsLoading(false);
      setHasHydrated(true);
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
    const isValidStoredStatus =
      storedRunStatus === "idle" ||
      storedRunStatus === "active" ||
      storedRunStatus === "failed" ||
      storedRunStatus === "completed" ||
      storedRunStatus === "ended";
    if (isValidStoredStatus) {
      setRunStatus(storedRunStatus);
    } else if (storedProtocolId) {
      setRunStatus("active");
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
    if (!isAuthed && storedCheckIns) {
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
    const hasActiveSnapshot = loadLocalActiveRun();
    if (storedProtocolId && !storedRunId) {
      setActiveRunId(createRunId());
    }
    if (
      !isAuthed &&
      storedRunStatus === "active" &&
      !storedProtocolId &&
      !hasActiveSnapshot
    ) {
      localStorage.removeItem("activeRunId");
      localStorage.removeItem("runStatus");
      localStorage.removeItem(DASHBOARD_MODAL_KEY);
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
      const requestId = hydrateRequestRef.current;
      let active = true;
      loadSupabaseRunsWithCheckins(user.id)
        .then((result) => {
          if (!active || requestId !== hydrateRequestRef.current) {
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
              const existingRunId = activeRunIdRef.current;
              if (existingRunId && existingRunId !== result.activeRun.id) {
                setRunsLoading(false);
                setHasHydrated(true);
                return;
              }
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
              const existingCheckins = checkInsRef.current;
              const merged = mergeCheckinsByDay(
                existingCheckins,
                mappedCheckins,
              );
              if (mappedCheckins.length > 0 || existingCheckins.length === 0) {
                setCheckIns(merged);
              }
              setStreak(
                merged.filter((entry) => entry.followed).length,
              );
            }
            setRunsLoading(false);
            setHasHydrated(true);
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
              setHasHydrated(true);
            } catch {
              setRunHistory([]);
              setRunCheckinsByRunId({});
              setRunsLoading(false);
              setHasHydrated(true);
            }
          }
          setRunsLoading(false);
          setHasHydrated(true);
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
              setHasHydrated(true);
            } catch {
              setRunHistory([]);
              setRunCheckinsByRunId({});
              setRunsLoading(false);
              setHasHydrated(true);
            }
          }
          setRunsLoading(false);
          setHasHydrated(true);
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
        setHasHydrated(true);
      } catch {
        setRunHistory([]);
        setRunCheckinsByRunId({});
        setRunsLoading(false);
        setHasHydrated(true);
      }
    } else {
      setRunsLoading(false);
      setHasHydrated(true);
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
    hasHydrated,
  ]);

  const selectedProtocol = activateModalProtocolId
    ? protocolById[activateModalProtocolId]
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
    clearLocalActiveRun();
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
    setActivateModalProtocolId(null);
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

  const activateProtocol = async (
    protocolId: string,
    problemId: number | null,
    observedIds?: string[],
  ): Promise<boolean> => {
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
    if (isAuthed && isPro && user?.id) {
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
    saveLocalActiveRun({
      runId: nextRunId,
      protocolId,
      protocolName: protocolById[protocolId]?.name ?? "Protocol",
      status: "active",
      startedAt: timestamp,
      checkins: [],
      optionalTrackedBehaviours: clampObservedBehaviours(observedIds),
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("activeProtocolId", protocolId);
      localStorage.setItem("activeRunId", nextRunId);
      localStorage.setItem("runStatus", "active");
      localStorage.setItem("activatedAt", timestamp);
      localStorage.setItem("runStartDate", today);
      localStorage.setItem("checkIns", JSON.stringify([]));
      localStorage.setItem(
        "observedBehaviourIds",
        JSON.stringify(clampObservedBehaviours(observedIds)),
      );
    }
    if (
      process.env.NODE_ENV !== "production" &&
      typeof window !== "undefined"
    ) {
      const snapshot = loadLocalActiveRun();
      if (!snapshot || snapshot.runId !== nextRunId) {
        console.warn("Active run snapshot missing after activation.");
      }
    }
    console.log("protocol-activate:route", "/dashboard");
    router.replace("/dashboard");
    focusActiveRun();
    return true;
  };

  const handleActivateProtocol = async () => {
    const pendingId = activateModalProtocolId;
    if (!pendingId) {
      return;
    }
    console.log("protocol-activate:confirm", pendingId);
    if (isActivating) {
      return;
    }
    setActivationError("");
    setIsActivating(true);
    if (!canStartNewRun) {
      setIsActivating(false);
      closeActivateProtocolModal();
      router.replace("/dashboard");
      return;
    }
    try {
      const activated = await activateProtocol(
        pendingId,
        null,
        isPro ? observedBehaviourSelection : [],
      );
      if (activated) {
        console.log("protocol-activate:route", "/dashboard");
        router.replace("/dashboard");
        closeActivateProtocolModal();
      } else {
        setActivationError("Unable to activate protocol.");
      }
    } catch {
      setActivationError("Unable to activate protocol.");
    } finally {
      setIsActivating(false);
    }
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
    if (isAuthed && isPro && user?.id && activeRunId) {
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
    if (activeRunId && activeProtocolId && activeProtocol && activatedAt) {
      const snapshotCheckins: LocalActiveRunSnapshot["checkins"] =
        updatedCheckIns.map((entry) => ({
          dayIndex: entry.dayIndex,
          result: entry.followed ? "clean" : "violated",
          note: entry.note,
          createdAt: new Date(entry.date).toISOString(),
        }));
      saveLocalActiveRun({
        runId: activeRunId,
        protocolId: activeProtocolId,
        protocolName: activeProtocol.name,
        status: "active",
        startedAt: activatedAt,
        checkins: snapshotCheckins,
        optionalTrackedBehaviours: clampObservedBehaviours(observedBehaviourIds),
      });
    }
    if (!followed) {
      if (typeof window !== "undefined") {
        localStorage.setItem("runStatus", "failed");
        localStorage.setItem("checkIns", JSON.stringify(updatedCheckIns));
        localStorage.removeItem("activeProtocolId");
        localStorage.removeItem("activeRunId");
        localStorage.removeItem("activatedAt");
        localStorage.removeItem("runStartDate");
      }
      if (isPro) {
        appendRunHistory("Failed", updatedCheckIns);
      }
      clearLocalActiveRun();
      setRunStatus("failed");
      setActiveProtocolId(null);
      setActiveRunId(null);
      setActivatedAt(null);
      setRunStartDate(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(DASHBOARD_MODAL_KEY, "runEnded");
        sessionStorage.setItem(DASHBOARD_MODAL_KEY, "runEnded");
        if (activeRunId) {
          localStorage.setItem(ENDED_RUN_ID_KEY, activeRunId);
        }
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          RUN_ENDED_SNAPSHOT_KEY,
          JSON.stringify({
            protocolId: activeProtocolId ?? "",
            protocolName: activeProtocol?.name ?? "",
            cleanDays,
            endedAt: new Date().toISOString(),
            result: "Failed",
          }),
        );
      }
      saveRunEndedModalContext({
        result: "Failed",
        protocolId: activeProtocolId ?? "",
        protocolName: activeProtocol?.name ?? "",
        cleanDays,
        runLength: RUN_LENGTH,
        endedAt: new Date().toISOString(),
        isFree: !isPro,
      });
      setRunEndContext({ result: "Failed", cleanDays });
      setShowRunEndedModal(true);
      setShowCheckInModal(false);
      return;
    } else if (newStreak >= RUN_LENGTH) {
      if (typeof window !== "undefined") {
        localStorage.setItem("runStatus", "completed");
        localStorage.setItem("checkIns", JSON.stringify(updatedCheckIns));
        localStorage.removeItem("activeProtocolId");
        localStorage.removeItem("activeRunId");
        localStorage.removeItem("activatedAt");
        localStorage.removeItem("runStartDate");
      }
      appendRunHistory("Completed", updatedCheckIns);
      clearLocalActiveRun();
      setRunStatus("completed");
      setActiveProtocolId(null);
      setActiveRunId(null);
      setActivatedAt(null);
      setRunStartDate(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(DASHBOARD_MODAL_KEY, "runEnded");
        sessionStorage.setItem(DASHBOARD_MODAL_KEY, "runEnded");
        if (activeRunId) {
          localStorage.setItem(ENDED_RUN_ID_KEY, activeRunId);
        }
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          RUN_ENDED_SNAPSHOT_KEY,
          JSON.stringify({
            protocolId: activeProtocolId ?? "",
            protocolName: activeProtocol?.name ?? "",
            cleanDays,
            endedAt: new Date().toISOString(),
            result: "Completed",
          }),
        );
      }
      saveRunEndedModalContext({
        result: "Completed",
        protocolId: activeProtocolId ?? "",
        protocolName: activeProtocol?.name ?? "",
        cleanDays,
        runLength: RUN_LENGTH,
        endedAt: new Date().toISOString(),
        isFree: !isPro,
      });
      setRunEndContext({ result: "Completed", cleanDays });
      setShowRunEndedModal(true);
      return;
    }
    setCheckInNote(noteValue);
    if (typeof window !== "undefined") {
      localStorage.removeItem(DASHBOARD_MODAL_KEY);
    }
    setShowCheckInModal(false);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      storageKeys.forEach((key) => localStorage.removeItem(key));
    }
    setActivateModalProtocolId(null);
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
    if (typeof window !== "undefined") {
      localStorage.setItem(DASHBOARD_MODAL_KEY, "checkin");
    }
    setShowCheckInModal(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!runActive) {
      return;
    }
    const lockState = { quadrantLock: true };
    window.history.pushState(lockState, "", window.location.href);
    const handlePopState = () => {
      if (!runActive) {
        return;
      }
      window.history.pushState(lockState, "", window.location.href);
      router.replace("/dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [runActive, router]);

  const availableObservedBehaviours = observedBehaviours.filter((behaviour) =>
    observedBehaviourIds.includes(behaviour.id),
  );

  const runHistoryRows = isAuthed
    ? runHistory.map((entry) => ({
        id: entry.id,
        protocol: entry.protocolName,
        result: entry.result,
        days: entry.cleanDays,
        strip: buildHistoryStrip(entry.cleanDays, entry.result, RUN_LENGTH),
      }))
    : [];
  const selectedRun =
    isAuthed && selectedRunId && runHistory.length > 0
      ? runHistory.find((entry) => entry.id === selectedRunId) ?? null
      : null;
  const selectedRunProtocol = selectedRun
    ? protocolById[selectedRun.protocolId]
    : null;
  const visibleRunHistoryRows = isAuthed ? runHistoryRows : [];
  const runHistoryCount = isAuthed ? runHistoryRows.length : 0;
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
  const failedRuns = runHistory.filter(
    (entry) => entry.result === "Failed" || entry.result === "Ended",
  );
  const uniqueProtocolsAttempted = new Set(
    runHistory.map((entry) => entry.protocolId),
  ).size;
  const getMaxCleanStreak = (
    items: Array<{ dayIndex: number; result: string }>,
  ) => {
    const sorted = items.slice().sort((a, b) => a.dayIndex - b.dayIndex);
    let current = 0;
    let best = 0;
    sorted.forEach((item) => {
      const normalized = item.result.toLowerCase();
      if (normalized === "clean") {
        current += 1;
        best = Math.max(best, current);
      } else if (normalized === "violated") {
        current = 0;
      } else {
        current = 0;
      }
    });
    return best;
  };
  const allRunsForInsights = [
    ...runHistory.map((entry) => runCheckinsByRunId[entry.id] ?? []),
    ...(runActive
      ? [
          checkIns.map((entry) => ({
            dayIndex: entry.dayIndex,
            result: entry.followed ? "clean" : "violated",
          })),
        ]
      : []),
  ];
  const longestCleanRun = allRunsForInsights.reduce(
    (max, runCheckins) => Math.max(max, getMaxCleanStreak(runCheckins)),
    0,
  );
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
      const violationDayIndex = checkins
        .filter((checkin) => checkin.result === "violated")
        .reduce<number | null>((minDay, checkin) => {
          if (minDay === null || checkin.dayIndex < minDay) {
            return checkin.dayIndex;
          }
          return minDay;
        }, null);
      const failureDay =
        violationDayIndex !== null
          ? violationDayIndex + 1
          : Number.isFinite(entry.cleanDays)
            ? entry.cleanDays + 1
            : null;
      if (failureDay && Number.isFinite(failureDay)) {
        acc[failureDay] = (acc[failureDay] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );
  const topFailureDayCount = Math.max(0, ...Object.values(failureDayCounts));
  const tiedFailureDays = Object.entries(failureDayCounts)
    .filter(([, count]) => count === topFailureDayCount)
    .map(([day]) => Number(day))
    .sort((a, b) => a - b);
  const failureDayDisplay =
    tiedFailureDays.length === 0
      ? ""
      : tiedFailureDays.length === 1
        ? `Day ${tiedFailureDays[0]}`
        : tiedFailureDays.length === 2
          ? `Days ${tiedFailureDays[0]} and ${tiedFailureDays[1]}`
          : `Days ${tiedFailureDays[0]}-${tiedFailureDays[tiedFailureDays.length - 1]}`;

  const mostFrequentProtocolIds = Object.entries(protocolFailureCounts)
    .filter(([, count]) => count === mostFrequentFailureCount)
    .map(([id]) => id);
  const mostFrequentProtocolNames = mostFrequentProtocolIds.map(
    (id) => protocolById[id]?.name ?? id,
  );
  const observedBehaviourCounts = runHistory.reduce<Record<string, number>>(
    (acc, entry) => {
      const counts = entry.observedBehaviourLogCounts ?? {};
      Object.entries(counts).forEach(([id, count]) => {
        acc[id] = (acc[id] ?? 0) + count;
      });
      return acc;
    },
    {},
  );
  const mostCommonObservedBehaviour = Object.entries(
    observedBehaviourCounts,
  ).reduce<{ id: string; count: number } | null>((best, [id, count]) => {
    if (!best || count > best.count) {
      return { id, count };
    }
    return best;
  }, null);
  const observedBehaviourLabel = mostCommonObservedBehaviour
    ? observedBehaviours.find(
        (behaviour) => behaviour.id === mostCommonObservedBehaviour.id,
      )?.label ?? mostCommonObservedBehaviour.id
    : "";
  const observedBehaviourValue = mostCommonObservedBehaviour
    ? `${observedBehaviourLabel} (${mostCommonObservedBehaviour.count})`
    : "Not enough data yet";
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
  const hasRuns = runHistory.length > 0;
  const hasEnoughFrequencyData =
    runHistory.length >= 5 && failedRuns.length >= 3;
  const mostFrequentValue = hasEnoughFrequencyData
    ? mostFrequentProtocolNames.length > 1
      ? `Tie: ${formatTieList(mostFrequentProtocolNames)}`
      : mostFrequentProtocolNames[0] ?? "Not enough data yet"
    : "Not enough data yet";
  const hasEnoughFailureDayData = failedRuns.length >= 3;
  const failureDayShare =
    failedRuns.length > 0 ? topFailureDayCount / failedRuns.length : 0;
  const hasFailureDayConsensus =
    hasEnoughFailureDayData &&
    (topFailureDayCount >= 3 || failureDayShare >= 0.5);
  const failureDayValue = hasFailureDayConsensus && failureDayDisplay
    ? `Most runs fail on ${failureDayDisplay}.`
    : "Not enough data yet";
  const patternInsights = [
    {
      title: "Most frequent breaking behaviour",
      isUnlocked: true,
      requirement: "Requires memory across runs.",
      value: mostFrequentValue,
      subtitle:
        hasEnoughFrequencyData
          ? "This behaviour appears more often than any other across your runs."
          : null,
      className: "md:col-span-2",
    },
    {
      title: "Longest clean run",
      isUnlocked: hasRuns,
      requirement: "Requires memory across runs.",
      value: `${longestCleanRun} clean day${
        longestCleanRun === 1 ? "" : "s"
      }`,
      subtitle:
        "The maximum number of consecutive clean days you’ve completed without violation.",
    },
    {
      title: "Where runs usually fail",
      isUnlocked: true,
      requirement: "Requires repeated outcomes to surface.",
      value: failureDayValue,
      subtitle: hasFailureDayConsensus
        ? "Most violations occur at the same point in the run."
        : null,
    },
    {
      title: "Constraint switching",
      isUnlocked: runHistory.length > 1,
      requirement: "Requires multiple completed runs.",
      value: `${switchCount} switches`,
      subtitle: "Tracks how often you abandon one constraint for another.",
    },
    {
      title: "Most common observed behaviour",
      isUnlocked: true,
      requirement: "Requires memory across runs.",
      value: observedBehaviourValue,
      subtitle: mostCommonObservedBehaviour
        ? null
        : "Tag observed behaviours during check-ins to surface patterns.",
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
  const openAuthModal = (intent: "history" | "checkout") => {
    setAuthModalIntent(intent);
    setAuthModalTitle(
      intent === "checkout"
        ? "Sign in to continue"
        : "Sign in to preserve history",
    );
    if (intent === "checkout" && typeof window !== "undefined") {
      localStorage.setItem(POST_AUTH_INTENT_KEY, "checkout");
    }
    setShowAuthModal(true);
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
  const [modalIntentHandled, setModalIntentHandled] = useState(false);
  const activeRunLoading = authLoading || runsLoading || !hasHydrated;
  const openActivateProtocolModal = (protocolId: string) => {
    console.log("protocol-activate:open", protocolId);
    if (typeof window !== "undefined") {
      localStorage.setItem(DASHBOARD_MODAL_KEY, "activateProtocol");
      sessionStorage.setItem(DASHBOARD_MODAL_KEY, "activateProtocol");
      sessionStorage.setItem(PENDING_PROTOCOL_ID_KEY, protocolId);
      sessionStorage.setItem(
        PENDING_PROTOCOL_NAME_KEY,
        protocolById[protocolId]?.name ?? "",
      );
    }
    setActivateModalProtocolId(protocolId);
    setActivationError("");
    setIsActivating(false);
  };
  const closeActivateProtocolModal = () => {
    if (typeof window !== "undefined") {
      const storedModal = localStorage.getItem(DASHBOARD_MODAL_KEY);
      if (storedModal === "activateProtocol") {
        localStorage.removeItem(DASHBOARD_MODAL_KEY);
      }
      sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
      sessionStorage.removeItem(PENDING_PROTOCOL_ID_KEY);
      sessionStorage.removeItem(PENDING_PROTOCOL_NAME_KEY);
    }
    setActivateModalProtocolId(null);
    setShowObservedBehaviourPicker(false);
    setObservedBehaviourSelection([]);
    setObservedBehaviourError("");
    setActivationError("");
    setIsActivating(false);
  };

  useEffect(() => {
    if (activateModalProtocolId) {
      console.log("protocol-activate:modal", activateModalProtocolId);
    }
  }, [activateModalProtocolId]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydrated || modalIntentHandled) {
      return;
    }
    const storedModal =
      sessionStorage.getItem(DASHBOARD_MODAL_KEY) ??
      localStorage.getItem(DASHBOARD_MODAL_KEY);
    if (!storedModal) {
      setModalIntentHandled(true);
      return;
    }
    if (storedModal === "checkin") {
      const today = getLocalDateString();
      const latestEntry = checkIns[checkIns.length - 1];
      const hasCheckInToday = latestEntry?.date === today;
      if (runActive && !hasCheckInToday) {
        setShowCheckInModal(true);
      } else {
        sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
        localStorage.removeItem(DASHBOARD_MODAL_KEY);
      }
      setModalIntentHandled(true);
      return;
    }
    if (storedModal === "runEnded") {
      if (runActive) {
        return;
      }
      if (!runEndContext) {
        const storedEndedRunId =
          typeof window !== "undefined"
            ? localStorage.getItem(ENDED_RUN_ID_KEY)
            : null;
        const endedRun =
          storedEndedRunId && runHistory.length > 0
            ? runHistory.find((entry) => entry.id === storedEndedRunId) ??
              runHistory[0]
            : runHistory[0];
        if (endedRun) {
          setRunEndContext({
            result: endedRun.result,
            cleanDays: endedRun.cleanDays,
          });
        } else {
          const context = loadRunEndedModalContext();
          if (context) {
            setRunEndContext({
              result: context.result,
              cleanDays: context.cleanDays,
            });
          } else {
            const snapshot = sessionStorage.getItem(RUN_ENDED_SNAPSHOT_KEY);
            if (snapshot) {
              try {
                const parsed = JSON.parse(snapshot) as {
                  cleanDays: number;
                  result: "Completed" | "Failed";
                  endedAt?: string;
                };
                setRunEndContext({
                  result: parsed.result,
                  cleanDays: parsed.cleanDays,
                });
              } catch {
                // fall through
              }
            } else if (
              runStatus === "failed" ||
              runStatus === "completed" ||
              runStatus === "ended"
            ) {
              setRunEndContext({
                result:
                  runStatus === "completed"
                    ? "Completed"
                    : runStatus === "ended"
                      ? "Ended"
                      : "Failed",
                cleanDays: checkIns.filter((entry) => entry.followed).length,
              });
            } else {
              setModalIntentHandled(true);
              return;
            }
          }
        }
      }
      setShowRunEndedModal(true);
      sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
      sessionStorage.removeItem("pricing_return_context");
      setModalIntentHandled(true);
    }
    if (storedModal === "activateProtocol") {
      if (runActive) {
        sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
        localStorage.removeItem(DASHBOARD_MODAL_KEY);
        sessionStorage.removeItem(PENDING_PROTOCOL_ID_KEY);
        sessionStorage.removeItem(PENDING_PROTOCOL_NAME_KEY);
        setModalIntentHandled(true);
        return;
      }
      const pendingId = sessionStorage.getItem(PENDING_PROTOCOL_ID_KEY);
      if (pendingId && protocolById[pendingId]) {
        setActivateModalProtocolId(pendingId);
      } else {
        sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
        localStorage.removeItem(DASHBOARD_MODAL_KEY);
        sessionStorage.removeItem(PENDING_PROTOCOL_ID_KEY);
        sessionStorage.removeItem(PENDING_PROTOCOL_NAME_KEY);
      }
      setModalIntentHandled(true);
    }
  }, [
    hasHydrated,
    modalIntentHandled,
    runActive,
    checkIns,
    runEndContext,
    runHistory,
    runStatus,
  ]);

  useEffect(() => {
    if (!selectedProtocol) {
      return;
    }
    const modal = activateModalRef.current;
    if (!modal) {
      return;
    }
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((el) => !el.hasAttribute("disabled"));
    focusables[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeActivateProtocolModal();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProtocol]);

  useEffect(() => {
    if (!showRunDetail) {
      return;
    }
    const modal = runDetailModalRef.current;
    if (!modal) {
      return;
    }
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((el) => !el.hasAttribute("disabled"));
    focusables[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowRunDetail(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showRunDetail]);
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
            <a
              href="/about"
              className="btn-tertiary"
              onClick={() => {
                if (typeof window === "undefined") {
                  return;
                }
                const query = searchParams?.toString();
                const target = query ? `${pathname}?${query}` : pathname;
                sessionStorage.setItem("about_return_to", target);
              }}
            >
              About Quadrant
            </a>
          </div>
        </div>
        {showProActive ? (
          <div className="mt-3 text-xs text-zinc-600">Pro active.</div>
        ) : null}

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
              {isAuthed ? (
                <RunHistorySection
                  collapsed={isRunHistoryCollapsedResolved}
                  count={dashboardViewModel.runHistory.count}
                  rows={dashboardViewModel.runHistory.visibleRows}
                  loading={runsLoading}
                  onToggle={() => {
                    if (!isAuthed) {
                      openAuthModal("history");
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
                    if (!isAuthed) {
                      openAuthModal("history");
                      return;
                    }
                    setSelectedRunId(rowId);
                    setShowRunDetail(true);
                  }}
                  footer={
                    !isPro ? (
                      <>
                        <span>New runs won’t be saved without Pro.</span>{" "}
                        <button
                          type="button"
                          className="btn-tertiary"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.location.href = "/pricing";
                            }
                          }}
                        >
                          See pricing
                        </button>
                      </>
                    ) : null
                  }
                />
              ) : (
                <section className="ui-surface p-[var(--space-6)]">
                  <div className="flex w-full items-start justify-between text-left">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Run history
                      </h2>
                      <button
                        type="button"
                        className="btn-tertiary mt-3"
                        onClick={() => {
                          openAuthModal("history");
                        }}
                      >
                        Sign in to preserve history
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
                  setIsPatternInsightsCollapsed(
                    (collapsed) =>
                      !(
                        collapsed ??
                        dashboardViewModel.defaults.patternInsightsCollapsed
                      ),
                  );
                }}
                isAuthed={isAuthed}
                isPro={isPro}
                patternInsights={patternInsights}
                showEmptyState={patternInsightsEmpty}
                emptyStateMessage={patternInsightsEmptyMessage}
                onViewPricing={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = "/pricing";
                  }
                }}
                onRequireAuth={() => {
                  openAuthModal("history");
                }}
              />

              <ProtocolLibrarySection
                collapsed={isProtocolLibraryCollapsedResolved}
                protocols={orderedProtocols}
                libraryProtocolId={libraryProtocolId}
                canActivate={dashboardViewModel.activeRunState === "inactive"}
                onActivateProtocol={(protocolId) => {
                  if (isPro) {
                    openActivateProtocolModal(protocolId);
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
                                openActivateProtocolModal(protocol.id);
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
          onClose={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem(DASHBOARD_MODAL_KEY);
            }
            setShowCheckInModal(false);
          }}
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
        <div
          key={activateModalProtocolId ?? "none"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 px-[var(--space-6)] backdrop-blur-sm"
        >
          <div
            ref={activateModalRef}
            role="dialog"
            aria-modal="true"
            data-quadrant-modal
            className="flex w-full max-w-xl max-h-[85vh] flex-col ui-modal p-[var(--space-6)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-zinc-500">
                  Activate protocol?
                </p>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {selectedProtocol.name}
                </h2>
              </div>
              <button
                type="button"
                className="btn-tertiary"
                aria-label="Close"
                onClick={closeActivateProtocolModal}
              >
                ✕
              </button>
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
                        Select up to 2. Tracked for insight only — does not end
                        your run.
                      </p>
                      <p className="text-xs text-zinc-500">
                        {observedBehaviourSelection.length >=
                        MAX_OBSERVED_BEHAVIOURS
                          ? "Max 2 selected"
                          : `${observedBehaviourSelection.length} selected`}
                      </p>
                      <div className="space-y-2">
                        {observedBehaviours.map((behaviour) => {
                          const isChecked = observedBehaviourSelection.includes(
                            behaviour.id,
                          );
                          const atLimit =
                            observedBehaviourSelection.length >=
                            MAX_OBSERVED_BEHAVIOURS;
                          const isDisabled = !isChecked && atLimit;
                          return (
                            <label
                              key={behaviour.id}
                              className={`flex items-start gap-3 text-sm text-zinc-700 ${
                                isDisabled ? "opacity-60" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
                                checked={isChecked}
                                disabled={isDisabled}
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
            {activationError ? (
              <p className="mt-3 text-xs font-semibold text-zinc-500">
                {activationError}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={closeActivateProtocolModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={() => {
                  void handleActivateProtocol();
                }}
                disabled={isActivating || !activateModalProtocolId}
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
          showFreeNotice={!isPro}
          freeActionLabel="Upgrade to save this run"
          freePrimarySubtext="This run won’t be saved on Free."
          freeSecondarySubtext="Keep this run + unlock history and pattern insights."
          showCloseButton={isPro}
          onUpgradeClick={() => {
            if (typeof window !== "undefined") {
              const pendingPayload = buildPendingRunPayload(runEndContext);
              if (pendingPayload) {
                localStorage.setItem(
                  PENDING_RUN_KEY,
                  JSON.stringify(pendingPayload),
                );
                localStorage.setItem(PENDING_SAVE_INTENT_KEY, "1");
              }
              sessionStorage.setItem("pricing_return_context", "runEnded");
              sessionStorage.setItem(DASHBOARD_MODAL_KEY, "runEnded");
              localStorage.removeItem(DASHBOARD_MODAL_KEY);
              localStorage.removeItem(DASHBOARD_MODAL_CONTEXT_KEY);
              localStorage.removeItem(ENDED_RUN_ID_KEY);
            }
            router.push("/pricing");
          }}
          onPrimaryAction={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem(DASHBOARD_MODAL_KEY);
              localStorage.removeItem(DASHBOARD_MODAL_CONTEXT_KEY);
              localStorage.removeItem(ENDED_RUN_ID_KEY);
              sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
              sessionStorage.removeItem(RUN_ENDED_SNAPSHOT_KEY);
            }
            clearActiveProtocol();
          }}
          onClose={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem(DASHBOARD_MODAL_KEY);
              localStorage.removeItem(DASHBOARD_MODAL_CONTEXT_KEY);
              localStorage.removeItem(ENDED_RUN_ID_KEY);
              sessionStorage.removeItem(DASHBOARD_MODAL_KEY);
              sessionStorage.removeItem(RUN_ENDED_SNAPSHOT_KEY);
            }
            clearActiveProtocol();
          }}
        />
      ) : null}
      {showAuthModal ? (
        <AuthModal
          title={authModalTitle}
          onClose={() => {
            if (
              typeof window !== "undefined" &&
              authModalIntent === "checkout"
            ) {
              localStorage.removeItem(POST_AUTH_INTENT_KEY);
            }
            setShowAuthModal(false);
          }}
        />
      ) : null}
      {showRunDetail && selectedRun && selectedRunProtocol && isPro ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
          <div
            ref={runDetailModalRef}
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

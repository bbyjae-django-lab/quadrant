import type { RunHistoryEntry } from "../types";
import { getSupabaseClient } from "./supabaseClient";

export type CheckinRecord = {
  id: string;
  runId: string;
  dayIndex: number;
  result: "clean" | "violated";
  note?: string;
  createdAt: string;
};

export type StorageAdapter = {
  loadRuns: () => Promise<RunHistoryEntry[]>;
  saveRun: (run: RunHistoryEntry) => Promise<void>;
  updateRun: (run: RunHistoryEntry) => Promise<void>;
  loadCheckins: (runId: string) => Promise<CheckinRecord[]>;
  addCheckin: (checkin: CheckinRecord) => Promise<void>;
  isSupabase: boolean;
};

const parseLocalRunHistory = () => {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = localStorage.getItem("runHistory");
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored) as RunHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalRunHistory = (runs: RunHistoryEntry[]) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("runHistory", JSON.stringify(runs));
};

export const LocalAdapter: StorageAdapter = {
  isSupabase: false,
  loadRuns: async () => parseLocalRunHistory(),
  saveRun: async (run) => {
    const current = parseLocalRunHistory();
    const next = [run, ...current];
    saveLocalRunHistory(next);
  },
  updateRun: async (run) => {
    const current = parseLocalRunHistory();
    const next = current.map((entry) => (entry.id === run.id ? run : entry));
    saveLocalRunHistory(next);
  },
  loadCheckins: async (_runId) => {
    if (typeof window === "undefined") {
      return [];
    }
    const stored = localStorage.getItem("checkIns");
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored) as
        | Array<{ dayIndex: number; date: string; followed: boolean; note?: string }>
        | Record<string, { followed: boolean; note?: string }>;
      if (Array.isArray(parsed)) {
        return parsed.map((entry, index) => ({
          id: `${entry.date}-${index}`,
          runId: _runId,
          dayIndex: entry.dayIndex,
          result: entry.followed ? "clean" : "violated",
          note: entry.note,
          createdAt: new Date(entry.date).toISOString(),
        }));
      }
      const sortedDates = Object.keys(parsed).sort();
      return sortedDates.map((date, index) => ({
        id: `${date}-${index}`,
        runId: _runId,
        dayIndex: index + 1,
        result: parsed[date].followed ? "clean" : "violated",
        note: parsed[date].note,
        createdAt: new Date(date).toISOString(),
      }));
    } catch {
      return [];
    }
  },
  addCheckin: async () => {},
};

const mapStatusToResult = (status: string): RunHistoryEntry["result"] | null => {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "failed") {
    return "Failed";
  }
  if (status === "ended") {
    return "Ended";
  }
  return null;
};

const mapResultToStatus = (result: RunHistoryEntry["result"]) => {
  return result.toLowerCase();
};

export const createSupabaseAdapter = (userId: string): StorageAdapter => ({
  isSupabase: true,
  loadRuns: async () => {
    const client = getSupabaseClient();
    if (!client) {
      return [];
    }
    const { data: runs, error: runError } = await client
      .from("runs")
      .select("id, protocol_id, protocol_name, status, started_at, ended_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });
    if (runError || !runs) {
      console.warn(runError?.message ?? "Failed to load runs.");
      return LocalAdapter.loadRuns();
    }
    const runIds = runs.map((run) => run.id);
    if (runIds.length === 0) {
      return [];
    }
    const { data: checkins, error: checkinError } = await client
      .from("checkins")
      .select("id, run_id, day_index, result, note, created_at")
      .eq("user_id", userId)
      .in("run_id", runIds);
    if (checkinError) {
      console.warn(checkinError.message);
      return LocalAdapter.loadRuns();
    }
    const mappedRuns: RunHistoryEntry[] = [];
    runs.forEach((run) => {
      const result = mapStatusToResult(run.status);
      if (!result) {
        return;
      }
      const runCheckins =
        checkins?.filter((item) => item.run_id === run.id) ?? [];
      const cleanDays = runCheckins.filter(
        (item) => item.result === "clean",
      ).length;
      const notes = runCheckins
        .filter((item) => item.note && item.note.trim().length > 0)
        .map((item) => ({
          date: item.created_at?.slice(0, 10) ?? "",
          note: item.note as string,
        }));
      mappedRuns.push({
        id: run.id,
        protocolId: run.protocol_id,
        protocolName: run.protocol_name,
        startedAt: run.started_at,
        endedAt: run.ended_at ?? new Date().toISOString(),
        result,
        cleanDays,
        observedBehaviourIds: [],
        observedBehaviourLogCounts: {},
        notes,
      });
    });
    return mappedRuns;
  },
  saveRun: async (run) => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    const { error } = await client.from("runs").upsert({
      id: run.id,
      user_id: userId,
      protocol_id: run.protocolId,
      protocol_name: run.protocolName,
      status: mapResultToStatus(run.result),
      started_at: run.startedAt,
      ended_at: run.endedAt,
    });
    if (error) {
      console.warn(error.message);
      await LocalAdapter.saveRun(run);
    }
  },
  updateRun: async (run) => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    const { error } = await client.from("runs").upsert({
      id: run.id,
      user_id: userId,
      protocol_id: run.protocolId,
      protocol_name: run.protocolName,
      status: mapResultToStatus(run.result),
      started_at: run.startedAt,
      ended_at: run.endedAt,
    });
    if (error) {
      console.warn(error.message);
      await LocalAdapter.updateRun(run);
    }
  },
  loadCheckins: async (runId) => {
    const client = getSupabaseClient();
    if (!client) {
      return [];
    }
    const { data, error } = await client
      .from("checkins")
      .select("id, run_id, day_index, result, note, created_at")
      .eq("user_id", userId)
      .eq("run_id", runId)
      .order("day_index", { ascending: true });
    if (error || !data) {
      if (error) {
        console.warn(error.message);
      }
      return LocalAdapter.loadCheckins(runId);
    }
    return data.map((item) => ({
      id: item.id,
      runId: item.run_id,
      dayIndex: item.day_index,
      result: item.result,
      note: item.note ?? undefined,
      createdAt: item.created_at,
    }));
  },
  addCheckin: async (checkin) => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    const { error } = await client.from("checkins").insert({
      id: checkin.id,
      run_id: checkin.runId,
      user_id: userId,
      day_index: checkin.dayIndex,
      result: checkin.result,
      note: checkin.note ?? null,
      created_at: checkin.createdAt,
    });
    if (error) {
      console.warn(error.message);
      await LocalAdapter.addCheckin(checkin);
    }
  },
});

export const getAdapter = ({
  isAuthed,
  isPro,
  userId,
}: {
  isAuthed: boolean;
  isPro: boolean;
  userId: string | null;
}): StorageAdapter => {
  if (isAuthed && isPro && userId) {
    const client = getSupabaseClient();
    if (client) {
      return createSupabaseAdapter(userId);
    }
  }
  return LocalAdapter;
};

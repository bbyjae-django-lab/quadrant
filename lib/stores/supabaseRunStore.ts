import { getSupabaseClient } from "@/app/lib/supabaseClient";
import type { Checkin, CheckinResult, Protocol, Run } from "../types";
import type { RunStore } from "./runStore";

type RunRow = {
  id: string;
  user_id: string;
  protocol_id: string;
  protocol_name: string;
  status: "active" | "ended";
  started_at: string;
  ended_at: string | null;
  end_reason: "violation" | null;
};

type CheckinRow = {
  id: string;
  run_id: string;
  user_id: string;
  day_index: number;
  result: CheckinResult;
  note: string | null;
  created_at: string;
};

const nowIso = () => new Date().toISOString();

const toRun = (row: RunRow): Run => ({
  id: row.id,
  protocolId: row.protocol_id,
  protocolName: row.protocol_name,
  status: row.status,
  startedAt: row.started_at,
  endedAt: row.ended_at ?? undefined,
  endReason: row.end_reason ?? undefined,
  checkins: [],
});

export class SupabaseRunStore implements RunStore {
  private activeRun: Run | null = null;
  private runHistory: Run[] = [];
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async hydrate() {
    const client = getSupabaseClient();
    if (!client || !this.userId) {
      this.activeRun = null;
      this.runHistory = [];
      return;
    }
    const { data: activeRow } = await client
      .from("runs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<RunRow>();
    if (activeRow) {
      const activeRun = toRun(activeRow);
      const { data: checkinRows } = await client
        .from("checkins")
        .select("*")
        .eq("run_id", activeRow.id)
        .eq("user_id", this.userId)
        .order("day_index", { ascending: true });
      activeRun.checkins = Array.isArray(checkinRows)
        ? (checkinRows as CheckinRow[]).map((row) => ({
            index: row.day_index,
            result: row.result,
            note: row.note ?? undefined,
            createdAt: row.created_at,
          }))
        : [];
      this.activeRun = activeRun;
    } else {
      this.activeRun = null;
    }

    const { data: historyRows } = await client
      .from("runs")
      .select("*")
      .eq("user_id", this.userId)
      .eq("status", "ended")
      .order("started_at", { ascending: false })
      .limit(25);
    this.runHistory = Array.isArray(historyRows)
      ? (historyRows as RunRow[]).map(toRun)
      : [];
  }

  getActiveRun() {
    return this.activeRun;
  }

  getRuns() {
    return this.runHistory.slice();
  }

  async startRun(protocol: Protocol) {
    if (this.activeRun) {
      return this.activeRun;
    }
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase unavailable.");
    }
    const now = nowIso();
    const { data, error } = await client
      .from("runs")
      .insert({
        user_id: this.userId,
        protocol_id: protocol.id,
        protocol_name: protocol.name,
        status: "active",
        started_at: now,
        ended_at: null,
        end_reason: null,
      })
      .select("*")
      .single<RunRow>();
    if (error || !data) {
      throw new Error("Unable to start run.");
    }
    const run = toRun(data);
    this.activeRun = run;
    return run;
  }

  async addCheckin(runId: string, result: CheckinResult, note?: string) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase unavailable.");
    }
    if (!this.activeRun || this.activeRun.id !== runId) {
      throw new Error("Active run not found.");
    }
    const checkin: Checkin = {
      index: this.activeRun.checkins.length + 1,
      result,
      note: note?.trim() ? note.trim() : undefined,
      createdAt: nowIso(),
    };
    const endedAt = result === "violated" ? nowIso() : null;
    const { error: checkinError } = await client.from("checkins").insert({
      user_id: this.userId,
      run_id: runId,
      day_index: checkin.index,
      result: checkin.result,
      note: checkin.note ?? null,
      created_at: checkin.createdAt,
    });
    if (checkinError) {
      throw new Error("Unable to update run.");
    }
    if (result === "violated") {
      const { data, error } = await client
        .from("runs")
        .update({
          status: "ended",
          ended_at: endedAt,
          end_reason: "violation",
        })
        .eq("id", runId)
        .eq("user_id", this.userId)
        .select("*")
        .single<RunRow>();
      if (error || !data) {
        throw new Error("Unable to update run.");
      }
      const run = toRun(data);
      run.checkins = [...this.activeRun.checkins, checkin];
      this.activeRun = null;
      this.runHistory = [run, ...this.runHistory.filter((item) => item.id !== run.id)];
      return run;
    }
    const run = {
      ...this.activeRun,
      checkins: [...this.activeRun.checkins, checkin],
    };
    this.activeRun = run;
    return run;
  }

  async endRun(runId: string) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase unavailable.");
    }
    if (!this.activeRun || this.activeRun.id !== runId) {
      throw new Error("Active run not found.");
    }
    const endedAt = nowIso();
    const { data, error } = await client
      .from("runs")
      .update({
        status: "ended",
        ended_at: endedAt,
        end_reason: "violation",
      })
      .eq("id", runId)
      .eq("user_id", this.userId)
      .select("*")
      .single<RunRow>();
    if (error || !data) {
      throw new Error("Unable to end run.");
    }
    const run = toRun(data);
    this.activeRun = null;
    this.runHistory = [run, ...this.runHistory.filter((item) => item.id !== run.id)];
    return run;
  }

  clearLocalAppKeys() {
    // No-op: Supabase store does not own local keys.
  }
}

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
  checkins: Checkin[] | null;
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
  checkins: Array.isArray(row.checkins) ? row.checkins : [],
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
    this.activeRun = activeRow ? toRun(activeRow) : null;

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

  getRunHistory() {
    return this.runHistory.slice();
  }

  async startRun(protocol: Protocol) {
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
        checkins: [],
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
    const cleanCount = this.activeRun.checkins.filter(
      (checkin) => checkin.result === "clean",
    ).length;
    const checkin: Checkin = {
      index: cleanCount + 1,
      result,
      note: note?.trim() ? note.trim() : undefined,
      createdAt: nowIso(),
    };
    const nextCheckins = [...this.activeRun.checkins, checkin];
    const endedAt = result === "violated" ? nowIso() : null;
    const { data, error } = await client
      .from("runs")
      .update({
        checkins: nextCheckins,
        status: result === "violated" ? "ended" : "active",
        ended_at: endedAt,
        end_reason: result === "violated" ? "violation" : null,
      })
      .eq("id", runId)
      .eq("user_id", this.userId)
      .select("*")
      .single<RunRow>();
    if (error || !data) {
      throw new Error("Unable to update run.");
    }
    const run = toRun(data);
    if (run.status === "ended") {
      this.activeRun = null;
      this.runHistory = [run, ...this.runHistory.filter((item) => item.id !== run.id)];
    } else {
      this.activeRun = run;
    }
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

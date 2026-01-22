import { QUADRANT_LOCAL_ACTIVE_RUN, QUADRANT_LOCAL_RUN_HISTORY } from "../keys";
import type { Checkin, CheckinResult, Protocol, Run } from "../types";
import type { RunStore } from "./runStore";

const isRun = (value: unknown): value is Run => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const run = value as Run;
  return (
    typeof run.id === "string" &&
    typeof run.protocolId === "string" &&
    typeof run.protocolName === "string" &&
    typeof run.status === "string" &&
    typeof run.startedAt === "string" &&
    Array.isArray(run.checkins)
  );
};

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

const createRunId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}`;
};

export class LocalRunStore implements RunStore {
  private activeRun: Run | null = null;
  private runHistory: Run[] = [];

  async hydrate() {
    if (typeof window === "undefined") {
      return;
    }
    const storedActive = safeParse<Run>(
      localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN),
    );
    if (storedActive && isRun(storedActive) && storedActive.status === "active") {
      this.activeRun = storedActive;
    } else {
      this.activeRun = null;
    }
    const storedHistory = safeParse<Run[]>(
      localStorage.getItem(QUADRANT_LOCAL_RUN_HISTORY),
    );
    if (storedHistory && Array.isArray(storedHistory)) {
      this.runHistory = storedHistory.filter(isRun);
    } else {
      this.runHistory = [];
    }
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
    const run: Run = {
      id: createRunId(),
      protocolId: protocol.id,
      protocolName: protocol.name,
      status: "active",
      startedAt: nowIso(),
      checkins: [],
    };
    this.activeRun = run;
    if (typeof window !== "undefined") {
      localStorage.setItem(QUADRANT_LOCAL_ACTIVE_RUN, JSON.stringify(run));
    }
    return run;
  }

  async addCheckin(runId: string, result: CheckinResult, note?: string) {
    if (!this.activeRun || this.activeRun.id !== runId) {
      throw new Error("Active run not found.");
    }
    const nextIndex = this.activeRun.checkins.length + 1;
    const checkin: Checkin = {
      index: nextIndex,
      result,
      note: note?.trim() ? note.trim() : undefined,
      createdAt: nowIso(),
    };
    const updatedRun: Run = {
      ...this.activeRun,
      checkins: [...this.activeRun.checkins, checkin],
    };
    if (result === "violated") {
      return this.endRunInternal(updatedRun);
    }
    this.activeRun = updatedRun;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        QUADRANT_LOCAL_ACTIVE_RUN,
        JSON.stringify(updatedRun),
      );
    }
    return updatedRun;
  }

  async endRun(runId: string) {
    if (!this.activeRun || this.activeRun.id !== runId) {
      throw new Error("Active run not found.");
    }
    return this.endRunInternal(this.activeRun);
  }

  clearLocalAppKeys() {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(QUADRANT_LOCAL_ACTIVE_RUN);
    localStorage.removeItem(QUADRANT_LOCAL_RUN_HISTORY);
  }

  private endRunInternal(run: Run) {
    const endedRun: Run = {
      ...run,
      status: "ended",
      endedAt: nowIso(),
      endReason: "violation",
    };
    this.activeRun = null;
    this.runHistory = [endedRun, ...this.runHistory];
    if (typeof window !== "undefined") {
      localStorage.removeItem(QUADRANT_LOCAL_ACTIVE_RUN);
      localStorage.setItem(
        QUADRANT_LOCAL_RUN_HISTORY,
        JSON.stringify(this.runHistory),
      );
    }
    return endedRun;
  }
}

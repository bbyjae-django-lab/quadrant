import type { CheckinResult, Protocol, Run } from "../types";

export interface RunStore {
  hydrate(): Promise<void>;
  getActiveRun(): Run | null;
  getRunHistory(): Run[];
  startRun(protocol: Protocol): Promise<Run>;
  addCheckin(
    runId: string,
    result: CheckinResult,
    note?: string,
  ): Promise<Run>;
  endRun(runId: string): Promise<Run>;
  clearLocalAppKeys(): void;
}

export type Protocol = {
  id: string;
  name: string;
  commonBehaviourRemoved: string;
  rule: string;
  duration: string;
  failure: string;
};

export type ActiveRunState = "active" | "summary" | "inactive";

export type RunResult = "Completed" | "Failed" | "Ended";

export type RunHistoryEntry = {
  id: string;
  protocolId: string;
  protocolName: string;
  startedAt: string | null;
  endedAt: string;
  result: RunResult;
  cleanDays: number;
  observedBehaviourIds?: string[];
  observedBehaviourLogCounts?: Record<string, number>;
  notes?: Array<{ date: string; note: string }>;
};

export type RunHistoryRow = {
  id: string;
  protocol: string;
  result: RunResult;
  days: number;
  strip?: string[];
};

export type RunEndContext = {
  result: "Failed" | "Completed";
  cleanDays: number;
};

export type RunEndCopy = {
  title: string;
  outcomePrefix: string;
  outcomeHighlight: string;
  outcomeSuffix: string;
  reframeLines: string[];
  primaryLabel: string;
  primarySubtext: string;
  primarySupportingLine: string;
  secondaryLabel: string;
};

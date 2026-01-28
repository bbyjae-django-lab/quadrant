export type Protocol = {
  id: string;
  name: string;
  rule: string;
  violation: string;
};

export type RunStatus = "active" | "ended";

export type CheckinResult = "clean" | "violated";

export type Checkin = {
  index: number;
  result: CheckinResult;
  note?: string;
  createdAt: string;
};

export type Run = {
  id: string;
  protocolId: string;
  protocolName: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  endReason?: "violation" | "ended";
  checkins: Checkin[];
};

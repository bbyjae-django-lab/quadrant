import type { Run } from "./types";

export const getFailureInsight = (runs: Run[]) => {
  const failedRuns = runs.filter((run) => run.status === "ended");
  if (failedRuns.length < 3) {
    return "Not enough data yet";
  }
  const counts = new Map<number, number>();
  failedRuns.forEach((run) => {
    const failedCheckin = run.checkins.find(
      (checkin) => checkin.result === "violated",
    );
    const session = Math.max(
      failedCheckin?.index ?? run.checkins.length,
      1,
    );
    counts.set(session, (counts.get(session) ?? 0) + 1);
  });
  let modeSession = 0;
  let modeCount = 0;
  counts.forEach((count, session) => {
    if (count > modeCount) {
      modeSession = session;
      modeCount = count;
    }
  });
  if (modeCount >= 3 || modeCount / failedRuns.length >= 0.5) {
    return `Most runs fail on Session ${modeSession}.`;
  }
  return "Not enough data yet";
};

export const getLongestCleanRun = (runs: Run[]) => {
  let maxClean = 0;
  runs.forEach((run) => {
    const cleanCount = run.checkins.filter(
      (checkin) => checkin.result === "clean",
    ).length;
    if (cleanCount > maxClean) {
      maxClean = cleanCount;
    }
  });
  if (maxClean === 0) {
    return 0;
  }
  return Math.max(1, maxClean);
};

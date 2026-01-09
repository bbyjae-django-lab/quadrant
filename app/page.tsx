"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const hasRunHistory = (rawHistory: string | null) => {
  if (!rawHistory) {
    return false;
  }
  try {
    const parsed = JSON.parse(rawHistory) as Array<unknown>;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
};

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const activeProtocolId = localStorage.getItem("activeProtocolId");
    const runStatus = localStorage.getItem("runStatus");
    const hasCompletedRun = localStorage.getItem("hasCompletedRun") === "true";
    const runHistory = localStorage.getItem("runHistory");
    const hasAnyRun =
      Boolean(activeProtocolId) || hasCompletedRun || hasRunHistory(runHistory);

    if (runStatus === "active" || hasAnyRun) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400">
            Quadrant
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            One protocol. One run. Clear outcomes.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            Quadrant enforces a single corrective protocol with daily binary
            check-ins and a clean, final run record.
          </p>
        </div>
        <div>
          <a
            href="/protocols"
            className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Start a run
          </a>
        </div>
      </main>
    </div>
  );
}

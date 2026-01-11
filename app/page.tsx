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

  const handleStartRun = () => {
    if (typeof window === "undefined") {
      return;
    }
    const activeProtocolId = localStorage.getItem("activeProtocolId");
    const runStatus = localStorage.getItem("runStatus");
    const hasActiveRun = Boolean(activeProtocolId) || runStatus === "active";
    router.push(hasActiveRun ? "/dashboard" : "/protocols");
  };

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
            Fix the behaviour that&#39;s costing you money.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            One protocol at a time. Binary rule. Daily check-in. Run history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            onClick={handleStartRun}
          >
            Start a run
          </button>
        </div>
      </main>
    </div>
  );
}

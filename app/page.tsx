"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  QUADRANT_LOCAL_ACTIVE_RUN,
  QUADRANT_LOCAL_RUN_HISTORY,
} from "@/lib/keys";

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
    const activeRun = localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN);
    router.push(activeRun ? "/dashboard" : "/protocols");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const activeRun = localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN);
    const runHistory = localStorage.getItem(QUADRANT_LOCAL_RUN_HISTORY);
    const hasAnyRun = Boolean(activeRun) || hasRunHistory(runHistory);

    if (hasAnyRun) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-12)]">
        <section className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400">
            Quadrant
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Fix the behaviour that&#39;s costing you money.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            Quadrant enforces one trading rule at a time, session by session.
          </p>
          <p className="max-w-2xl text-sm text-zinc-600">
            You already know the rules. Quadrant makes you follow one.
          </p>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={handleStartRun}
              >
                Start a run
              </button>
              <a
                href="/pricing?from=landing"
                className="btn-tertiary text-sm"
              >
                Pricing
              </a>
            </div>
            <p className="text-xs font-semibold text-zinc-500">
              Free. No account required.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500">
            How It Works
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="ui-surface p-[var(--space-5)]">
              <div className="text-sm font-semibold text-zinc-900">
                Choose a constraint
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Pick one rule you don&#39;t negotiate.
              </p>
            </div>
            <div className="ui-surface p-[var(--space-5)]">
              <div className="text-sm font-semibold text-zinc-900">
                Run it by session
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Log each session. The record is binary.
              </p>
            </div>
            <div className="ui-surface p-[var(--space-5)]">
              <div className="text-sm font-semibold text-zinc-900">
                Let the outcome stand
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                If it breaks, the run ends.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto mt-[var(--space-10)] w-full max-w-4xl border-t border-[var(--border-color)] pt-[var(--space-5)] text-xs text-zinc-600">
        <div className="space-y-2">
          <p>No brokerage connection.</p>
          <p>No trade data required.</p>
          <p>Local-first. History saved only with Pro.</p>
        </div>
      </footer>
    </div>
  );
}

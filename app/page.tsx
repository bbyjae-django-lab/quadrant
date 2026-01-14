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
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-12)]">
        <section className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400">
            Quadrant
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Fix the behaviour that&#39;s costing you money.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            Quadrant enforces one trading rule at a time — daily, binary, and
            non-negotiable.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={handleStartRun}
            >
              Start a run
            </button>
            <a
              href="/pricing"
              className="btn-tertiary text-sm"
            >
              Pricing
            </a>
          </div>
        </section>

        <section className="max-w-3xl space-y-3 text-base leading-7 text-zinc-700">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500">
            What Quadrant Is
          </h2>
          <p>
            Quadrant is a behavioural enforcement system for traders who already
            know the rules but don’t consistently follow them. It doesn’t
            journal, coach, motivate, or explain. You choose a protocol. You
            check in once per day. If you violate it, the run ends. Nothing is
            softened. Nothing is reinterpreted. The system records what actually
            happens.
          </p>
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
                Pick a single rule you can’t negotiate.
              </p>
            </div>
            <div className="ui-surface p-[var(--space-5)]">
              <div className="text-sm font-semibold text-zinc-900">
                Run it daily
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Check in once. The record is binary.
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

        <section className="max-w-3xl space-y-3 text-base leading-7 text-zinc-700">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500">
            Free vs Pro
          </h2>
          <p className="text-base font-semibold text-zinc-900">
            Free enforces behaviour. Pro remembers it.
          </p>
          <p>
            Free lets you run protocols as many times as you want. Nothing is
            saved. Pro keeps your runs. Patterns accumulate. Behaviour changes
            because violations can’t hide.
          </p>
          <a
            href="/pricing"
            className="btn-tertiary text-sm"
          >
            View pricing
          </a>
        </section>

        <section className="max-w-3xl space-y-3 text-base leading-7 text-zinc-700">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500">
            Philosophy
          </h2>
          <p>
            Quadrant assumes you are already capable. If a rule is violated, the
            system doesn’t ask why. It records that it happened. Over time,
            behaviour changes not through insight — but through exposure.
          </p>
        </section>

        <section className="space-y-3">
          <button
            type="button"
            className="btn btn-primary text-sm"
            onClick={handleStartRun}
          >
            Start a run
          </button>
          <p className="text-xs font-semibold text-zinc-500">
            Free. No account history required.
          </p>
        </section>
      </main>
      <footer className="mx-auto mt-[var(--space-12)] w-full max-w-4xl border-t border-[var(--border-color)] pt-[var(--space-6)] text-xs text-zinc-500">
        <div className="space-y-1">
          <p>No brokerage connection.</p>
          <p>No trade data required.</p>
          <p>Local-first. Data persists only when you choose Pro.</p>
        </div>
        <div className="mt-3 flex gap-4">
          <a href="/about" className="btn-tertiary text-xs">
            About
          </a>
          <a href="/pricing" className="btn-tertiary text-xs">
            Pricing
          </a>
        </div>
      </footer>
    </div>
  );
}

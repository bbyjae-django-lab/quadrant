"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { QUADRANT_LOCAL_ACTIVE_RUN } from "@/lib/keys";

export default function LandingPage() {
  const router = useRouter();

  const handleStartRun = () => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { status?: string };
        if (parsed.status === "active") {
          router.push("/dashboard");
          return;
        }
      } catch {
        // ignore
      }
    }
    router.push("/protocols");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { status?: string };
      if (parsed.status === "active") {
        router.replace("/dashboard");
      }
    } catch {
      // ignore
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
            <p className="text-sm text-zinc-600">
              Pick a rule. Log each session. A violation ends the run.
            </p>
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

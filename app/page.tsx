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
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Fix the behaviour that&#39;s costing you money.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            One trading constraint at a time — session by session.
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
            </div>
            <p className="text-xs font-semibold text-zinc-500">
              Free. No account required.
            </p>
            <p className="text-xs text-zinc-600">
              No brokerage. No trade data. Local by default.
            </p>
            <a href="/pricing?from=landing" className="text-xs underline">
              Pricing
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

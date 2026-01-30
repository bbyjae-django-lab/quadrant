"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { QUADRANT_LOCAL_ACTIVE_RUN } from "@/lib/keys";
import AuthModal from "./components/modals/AuthModal";
import { useAuth } from "./providers/AuthProvider";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthed, authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [desiredNext, setDesiredNext] = useState("/protocols");

  const handleStartRun = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (authLoading) {
      return;
    }
    const stored = localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN);
    let next = "/protocols";
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { status?: string };
        if (parsed.status === "active") {
          next = "/dashboard";
        }
      } catch {
        // ignore
      }
    }
    if (!isAuthed) {
      setDesiredNext(next);
      setShowAuth(true);
      return;
    }
    router.push(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!authLoading && isAuthed) {
      router.replace("/dashboard");
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
  }, [authLoading, isAuthed, router]);

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-12)]">
        <section className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Fix the behaviour that&#39;s costing you money.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            One constraint at a time. One session at a time.
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
            <p className="text-xs text-zinc-600">
              Free saves runs to your account. Pro keeps a permanent ledger.
            </p>
            <p className="text-xs text-zinc-600">
              No brokerage connections. No trade data.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <a href="/pricing?from=landing" className="underline">
                View pricing
              </a>
              <a href="#how-it-works" className="underline">
                How it works
              </a>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-900">
            How it works
          </h2>
          <div className="space-y-3 text-sm text-zinc-700">
            <div>
              <p className="font-semibold text-zinc-900">
                Choose a constraint
              </p>
              <p>Pick one rule you're committing to for this session.</p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900">Start a run</p>
              <p>
                Quadrant enforces it until you end the run or violate it.
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900">
                End clean - or violate
              </p>
              <p>Either outcome is recorded. Pro makes it permanent.</p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-zinc-600">
            <p>Free enforces. Pro remembers.</p>
            <p>No brokerage connections. No trade data.</p>
          </div>
        </section>
      </main>
      {showAuth ? (
        <AuthModal
          title="Attach your run to your record"
          next={desiredNext}
          onClose={() => setShowAuth(false)}
        />
      ) : null}
    </div>
  );
}

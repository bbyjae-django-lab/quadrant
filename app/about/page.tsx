"use client";

import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();
  const handleReturn = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (typeof window === "undefined") {
      return;
    }
    const stored = sessionStorage.getItem("about_return_to");
    if (stored) {
      sessionStorage.removeItem("about_return_to");
      router.replace(stored);
      return;
    }
    const activeSnapshot = localStorage.getItem("quadrant_active_run_v1");
    if (activeSnapshot) {
      try {
        const parsed = JSON.parse(activeSnapshot) as {
          status?: string;
          runId?: string;
          protocolId?: string;
        };
        if (parsed.status === "active" && parsed.runId && parsed.protocolId) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // fall through
      }
    }
    router.replace("/");
  };
  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-12)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--space-8)]">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            About Quadrant
          </h1>
          <p className="text-base text-zinc-700">
            Quadrant is a behavioural enforcement system for traders who already
            know the rules.
          </p>
        </header>

        <section className="space-y-2 text-base text-zinc-700">
          <p>It enforces one non-negotiable rule at a time.</p>
          <p>You check in once per day.</p>
          <p>If the rule breaks, the run ends.</p>
          <p>The system records what actually happens.</p>
        </section>

        <section className="space-y-2 text-base text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            What it is not
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Not a journal.</li>
            <li>Not coaching.</li>
            <li>Not reflection or reframing.</li>
            <li>No interpretation or intent parsing.</li>
          </ul>
        </section>

        <section className="space-y-1 text-base text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            Free vs Pro
          </h2>
          <p>Free enforces behaviour.</p>
          <p>Runs are disposable.</p>
          <p>Pro remembers outcomes.</p>
          <p>Patterns accumulate.</p>
          <p>Avoidance stops working.</p>
        </section>

        <div className="pt-2">
          <a
            href="/dashboard"
            className="btn-tertiary text-sm"
            onClick={handleReturn}
          >
            Return to active run
          </a>
        </div>
      </main>
    </div>
  );
}

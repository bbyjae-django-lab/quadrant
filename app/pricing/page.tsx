"use client";

import { useState } from "react";

const PRO_PRICE = 19;

export default function PricingPage() {
  const [upgradeNotice, setUpgradeNotice] = useState("");
  const hasProEntitlement = false;
  const handleUpgrade = () => {
    if (typeof window !== "undefined") {
      if (hasProEntitlement) {
        window.location.href = "/dashboard";
        return;
      }
      setUpgradeNotice("Upgrade pending. Subscription not yet provisioned.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-12)]">
        <div className="flex items-center justify-end text-sm font-medium text-zinc-500">
          <a
            href="/dashboard"
            className="btn-tertiary"
          >
            Back to Today
          </a>
        </div>
        <section className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Pricing
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-zinc-600">
            Free enforces behaviour. Pro remembers it.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="ui-surface p-[var(--space-6)]">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-900">Free</h2>
              <p className="text-sm text-zinc-500">Experience constraint.</p>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>One active protocol</li>
              <li>Daily check-in</li>
              <li>Run ends on violation</li>
              <li>No historical persistence</li>
            </ul>
          </div>

          <div className="on-dark rounded-[var(--radius-card)] border border-zinc-900 bg-zinc-900 p-[var(--space-6)] text-white shadow-[var(--shadow-1)]">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Pro</h2>
              <p className="text-sm text-zinc-300">
                ${PRO_PRICE} / month
              </p>
            </div>
            <p className="mt-4 text-xs text-zinc-300">
              Pro preserves behavioural evidence.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-100">
              <li>Run history across sessions</li>
              <li>Cross-device persistence</li>
              <li>Pattern visibility across runs</li>
              <li>Run detail and review</li>
            </ul>
            <p className="mt-3 text-xs text-zinc-300">
              Behaviour changes when memory accumulates.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={handleUpgrade}
            >
              Upgrade to Pro
            </button>
            {upgradeNotice ? (
              <p className="mt-3 text-xs font-semibold text-zinc-300">
                {upgradeNotice}
              </p>
            ) : null}
          </div>
        </section>

      </main>
    </div>
  );
}

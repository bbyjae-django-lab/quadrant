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
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <div className="flex items-center justify-end text-sm font-medium text-zinc-500">
          <a
            href="/dashboard"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
          >
            Back to dashboard
          </a>
        </div>
        <section className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Pricing
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-zinc-600">
            Quadrant is free to try. Memory is paid.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-900">Free</h2>
              <p className="text-sm text-zinc-500">Experience the constraint.</p>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-zinc-700">
              <li>One active protocol</li>
              <li>Daily check-in</li>
              <li>Run ends on violation</li>
              <li>No historical persistence</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Pro</h2>
              <p className="text-sm text-zinc-300">
                ${PRO_PRICE} / month
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-zinc-100">
              <li>Run history across sessions</li>
              <li>Pattern visibility across runs</li>
              <li>Run detail and review</li>
              <li>Cross-device persistence</li>
            </ul>
            <p className="mt-4 text-xs text-zinc-300">
              Pro preserves behavioural evidence over time.
            </p>
            <p className="mt-3 text-xs text-zinc-300">
              Behaviour changes when memory accumulates.
            </p>
            <button
              type="button"
              className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-100"
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

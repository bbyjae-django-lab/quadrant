"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";
import { getSupabaseClient } from "../lib/supabaseClient";

const PRO_PRICE = 29;

type PricingClientProps = {
  backHref: string;
};

export default function PricingClient({ backHref }: PricingClientProps) {
  const [upgradeNotice, setUpgradeNotice] = useState("");
  const router = useRouter();
  const { isPro } = useAuth();
  const startCheckout = () => {
    fetch("/api/stripe/checkout", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        setUpgradeNotice("Unable to start checkout.");
      })
      .catch(() => {
        setUpgradeNotice("Unable to start checkout.");
      });
  };
  const handleUpgrade = () => {
    if (typeof window !== "undefined") {
      startCheckout();
    }
  };

  const handleManageBilling = () => {
    if (typeof window === "undefined") {
      return;
    }
    const supabase = getSupabaseClient();
    const tokenPromise = supabase
      ? supabase.auth
          .getSession()
          .then((result) => result.data.session?.access_token)
      : Promise.resolve(null);
    tokenPromise.then((accessToken) => {
      if (!accessToken) {
        setUpgradeNotice("Sign in to continue.");
        return;
      }
      fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
          setUpgradeNotice("Unable to open billing.");
        })
        .catch(() => {
          setUpgradeNotice("Unable to open billing.");
        });
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-12)]">
        <div className="flex items-center justify-end text-sm font-medium text-zinc-500">
          <button
            type="button"
            className="btn-tertiary"
            onClick={() => router.replace(backHref)}
          >
            Back to Today
          </button>
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
              <li>Log sessions</li>
              <li>Run ends on violation</li>
              <li>Saved on this device</li>
            </ul>
          </div>

          <div className="on-dark rounded-[var(--radius-card)] border border-zinc-900 bg-zinc-900 p-[var(--space-6)] text-white shadow-[var(--shadow-1)]">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Pro</h2>
              <p className="text-sm text-zinc-300">${PRO_PRICE} / month</p>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-100">
              <li>Cross-device ledger</li>
              <li>Run history across devices</li>
              <li>Run detail and notes</li>
            </ul>
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={handleUpgrade}
              disabled={isPro}
            >
              {isPro ? "You're Pro" : "Upgrade to Pro"}
            </button>
            {isPro ? (
              <button
                type="button"
                className="btn-tertiary mt-3"
                onClick={handleManageBilling}
              >
                Manage billing
              </button>
            ) : null}
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

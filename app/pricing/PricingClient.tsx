"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";
import AuthModal from "../components/modals/AuthModal";

const PRO_PRICE = 49;

type PricingClientProps = {
  backHref: string;
};

export default function PricingClient({ backHref }: PricingClientProps) {
  const [upgradeNotice, setUpgradeNotice] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const { isPro, isAuthed, user, session } = useAuth();

  const upgradeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (searchParams?.get("intent") === "upgrade") {
      upgradeButtonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      upgradeButtonRef.current?.focus();
    }
  }, [searchParams]);

  const getReturnTo = () => {
    const returnParam = searchParams?.get("returnTo");
    let returnTo = returnParam || "/dashboard";

    if (typeof window !== "undefined") {
      if (!returnParam) {
        returnTo =
          sessionStorage.getItem("quadrant_app_return_to") ?? "/dashboard";
      }
      sessionStorage.setItem("quadrant_return_to", returnTo);
    }

    return returnTo;
  };

  const startCheckout = async () => {
    const returnTo = getReturnTo();

    // Require identity before checkout
    if (!isAuthed || !user?.id) {
      setUpgradeNotice("");
      setShowAuth(true);
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo, userId: user.id }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.replace(data.url);
        return;
      }

      setUpgradeNotice(
        data?.error ? `Checkout error: ${data.error}` : "Unable to start checkout.",
      );
    } catch {
      setUpgradeNotice("Unable to start checkout.");
    }
  };

  const handleUpgrade = () => {
    void startCheckout();
  };

  const handleBack = () => {
    router.replace(backHref);
  };

  const handleManageBilling = () => {
    const accessToken = session?.access_token ?? null;
    if (!accessToken) {
      setUpgradeNotice("Sign in to continue.");
      return;
    }

    fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
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
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-[var(--space-12)]">
        <div className="text-xs text-zinc-500">
          <button type="button" className="underline" onClick={handleBack}>
            Back
          </button>
        </div>

        <section className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Pricing
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-zinc-600">
            Free enforces. Pro remembers.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="ui-surface p-[var(--space-6)]">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-900">Free</h2>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>One constraint at a time</li>
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
              <li>A permanent ledger of every run</li>
              <li>Survives resets, devices, and bad weeks</li>
              <li>Proof you followed the rule when it mattered</li>
            </ul>

            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={handleUpgrade}
              disabled={isPro}
              ref={upgradeButtonRef}
            >
              {isPro
                ? "You're Pro"
                : isAuthed
                  ? "Upgrade to Pro"
                  : "Sign in to upgrade"}
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

            {showAuth ? (
              <AuthModal
                title="Attach Pro to your record"
                next={`/pricing?intent=upgrade&returnTo=${encodeURIComponent(
                  getReturnTo(),
                )}`}
                onClose={() => setShowAuth(false)}
              />
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

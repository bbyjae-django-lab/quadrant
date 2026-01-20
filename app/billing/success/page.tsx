"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

const PRO_STATUSES = new Set(["active", "trialing"]);

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const query = searchParams?.toString();
    return `${window.location.origin}/billing/success${query ? `?${query}` : ""}`;
  }, [searchParams]);

  const checkBilling = async () => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    setChecking(true);
    const session = await client.auth.getSession();
    const user = session.data.session?.user;
    if (!user?.email) {
      setChecking(false);
      return;
    }
    const { data, error } = await client
      .from("billing_customers")
      .select("status, price_id")
      .eq("email", user.email)
      .maybeSingle();
    if (error) {
      setChecking(false);
      return;
    }
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "";
    const matchesPrice = priceId ? data?.price_id === priceId : true;
    const isPro = Boolean(matchesPrice && PRO_STATUSES.has(data?.status ?? ""));
    if (isPro) {
      setStatusMessage("Pro attached. Redirecting…");
      window.setTimeout(() => {
        router.replace("/dashboard");
      }, 800);
    }
    setChecking(false);
  };

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    client.auth.getSession().then((result) => {
      const user = result.data.session?.user;
      if (user?.email) {
        void checkBilling();
      }
    });
    const { data: subscription } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void checkBilling();
      }
    });
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  const handleSendLink = async () => {
    if (!email.trim()) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    setSubmitting(false);
    if (!error) {
      setSent(true);
      return;
    }
    setError("Unable to send link.");
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pro is active.
          </h1>
          <p className="text-sm text-zinc-600">
            Sign in to attach it to your history.
          </p>
        </div>
        {statusMessage ? (
          <p className="text-sm text-zinc-600">{statusMessage}</p>
        ) : null}
        <label className="text-sm font-semibold text-zinc-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-[var(--radius-card)] border border-[var(--border-color)] p-[var(--space-3)] text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
            placeholder="you@example.com"
          />
        </label>
        {submitting ? (
          <p className="text-sm text-zinc-600">Sending…</p>
        ) : sent ? (
          <p className="text-sm text-zinc-600">
            Check your email for the link.
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-primary text-sm"
            onClick={handleSendLink}
          >
            Send link
          </button>
        )}
        <button
          type="button"
          className="btn-tertiary text-sm"
          onClick={() => {
            void checkBilling();
          }}
          disabled={checking}
        >
          I’ve signed in — refresh status
        </button>
        {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
      </main>
    </div>
  );
}

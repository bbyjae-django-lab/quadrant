"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { signInWithOtp } from "../../lib/auth";
import { getSupabaseClient } from "../../lib/supabaseClient";

export default function BillingSuccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    client.auth.getSession().then((result) => {
      if (result.data.session?.user) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  const handleSendLink = async () => {
    if (!email.trim()) {
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error } = await signInWithOtp(email.trim());
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
        {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
      </main>
    </div>
  );
}

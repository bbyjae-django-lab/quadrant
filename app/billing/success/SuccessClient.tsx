"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

const STORAGE_EMAIL_KEY = "quadrant_success_email";
const STORAGE_PENDING_KEY = "quadrant_success_pending_attach";
const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30000;

export default function SuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const params = new URLSearchParams(searchParams?.toString());
    params.set("attached", "1");
    const query = params.toString();
    return `${window.location.origin}/billing/success?${query}`;
  }, [searchParams]);

  const clearPending = () => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(STORAGE_EMAIL_KEY);
    localStorage.removeItem(STORAGE_PENDING_KEY);
  };

  const attachIfReady = async () => {
    const client = getSupabaseClient();
    if (!client) {
      return false;
    }
    setChecking(true);
    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;
    const user = session?.user;
    if (!user || !session?.access_token) {
      setChecking(false);
      return false;
    }
    const storedEmail =
      email.trim() ||
      (typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_EMAIL_KEY) ?? ""
        : "");
    if (!storedEmail) {
      setChecking(false);
      return false;
    }
    const response = await fetch("/api/billing/attach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: storedEmail }),
    });
    if (!response.ok) {
      setChecking(false);
      return false;
    }
    setStatusMessage("Attached. Redirecting…");
    clearPending();
    window.setTimeout(() => {
      router.replace("/dashboard");
    }, 800);
    setChecking(false);
    return true;
  };

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem(STORAGE_EMAIL_KEY);
      if (!email && storedEmail) {
        setEmail(storedEmail);
      }
      const pending = localStorage.getItem(STORAGE_PENDING_KEY);
      if (pending) {
        setSent(true);
      }
    }
    void attachIfReady();
    const { data: subscription } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void attachIfReady();
      }
    });
    const start = Date.now();
    pollingRef.current = window.setInterval(() => {
      const pending =
        typeof window !== "undefined" &&
        localStorage.getItem(STORAGE_PENDING_KEY) === "1";
      if (!pending) {
        return;
      }
      void attachIfReady();
      if (Date.now() - start > POLL_TIMEOUT_MS && pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, POLL_INTERVAL_MS);
    return () => {
      subscription?.subscription.unsubscribe();
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
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
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_EMAIL_KEY, email.trim());
      localStorage.setItem(STORAGE_PENDING_KEY, "1");
    }
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
            console.log("refresh-status clicked");
            void attachIfReady();
          }}
        >
          I’ve signed in — refresh status
        </button>
        {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
      </main>
    </div>
  );
}

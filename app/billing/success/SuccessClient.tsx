"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

const RESEND_COOLDOWN_MS = 8000;

const getSafeReturnTo = (value: string | null) => {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
};

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const autoSendRef = useRef(false);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const sessionId = searchParams?.get("session_id");
      let resolvedEmail = "";
      if (sessionId) {
        try {
          const response = await fetch(
            `/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`,
          );
          if (response.ok) {
            const data = (await response.json()) as { email?: string | null };
            if (data?.email) {
              resolvedEmail = data.email;
            }
          }
        } catch {
          // ignore
        }
      }
      if (!active) {
        return;
      }
      if (resolvedEmail) {
        setEmail(resolvedEmail);
        setShowEmailForm(false);
      } else {
        setShowEmailForm(true);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (showEmailForm) {
      return;
    }
    if (!email.trim()) {
      return;
    }
    if (autoSendRef.current) {
      return;
    }
    autoSendRef.current = true;
    void sendMagicLink();
  }, [email, showEmailForm]);

  useEffect(() => {
    if (!cooldownUntil) {
      return;
    }
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(0);
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldownUntil(0);
    }, remaining);
    return () => {
      window.clearTimeout(timer);
    };
  }, [cooldownUntil]);

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || isSending) {
      return;
    }
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setError("Unable to send link.");
      return;
    }
    setError(null);
    setIsSending(true);
    const returnTo =
      typeof window !== "undefined"
        ? localStorage.getItem("quadrant_return_to")
        : null;
    const safeReturnTo = getSafeReturnTo(returnTo);
    const { error } = await client.auth.signInWithOtp({
      email: trimmed,
      options:
        typeof window !== "undefined"
          ? {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                safeReturnTo,
              )}`,
            }
          : undefined,
    });
    if (error) {
      setError("Unable to send link.");
      setIsSending(false);
      return;
    }
    setShowEmailForm(false);
    setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
    setIsSending(false);
  };

  const inCooldown = cooldownUntil > Date.now();

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pro is active.
          </h1>
          <p className="text-sm text-zinc-600">Check your email to continue.</p>
        </div>

        {showEmailForm || !email ? (
          <div className="space-y-4">
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
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={sendMagicLink}
                disabled={isSending}
              >
                Send link
              </button>
              <button
                type="button"
                className="btn-tertiary text-sm"
                onClick={() => {
                  setShowEmailForm(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
            {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
          </div>
        ) : (
          <div className="space-y-3 text-sm text-zinc-600">
            <div>
              <p className="font-semibold text-zinc-700">
                We&#39;ve sent a sign-in link to:
              </p>
              <p className="mt-1 text-sm text-zinc-900">{email}</p>
            </div>
            <p>
              Open the email on this device and click the link. You can close
              this tab after signing in.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={sendMagicLink}
                disabled={isSending || inCooldown}
              >
                Resend link
              </button>
              <button
                type="button"
                className="btn-tertiary text-sm"
                onClick={() => {
                  setShowEmailForm(true);
                  setError(null);
                }}
              >
                Change email
              </button>
            </div>
            {inCooldown && !isSending ? (
              <p className="text-xs text-zinc-500">Sent.</p>
            ) : null}
            {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";

import { getSupabaseClient } from "../../lib/supabaseClient";

type Status = "sent" | "error";

const getInitialEmail = () => {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  const paramEmail = params.get("email");
  if (paramEmail) {
    localStorage.setItem("quadrant_checkout_email", paramEmail);
    return paramEmail;
  }
  return localStorage.getItem("quadrant_checkout_email") ?? "";
};

export default function SuccessClient() {
  const [email, setEmail] = useState(getInitialEmail);
  const [status, setStatus] = useState<Status>("sent");
  const [hasSent, setHasSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const sendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || isSending) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setStatus("error");
      return;
    }
    setIsSending(true);
    localStorage.setItem("quadrant_checkout_email", trimmed);
    const returnTo =
      typeof window !== "undefined"
        ? sessionStorage.getItem("quadrant_return_to")
        : null;
    const safeReturnTo =
      returnTo &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      returnTo !== "/pricing" &&
      returnTo !== "/"
        ? returnTo
        : "/dashboard";
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
      setStatus("error");
      setIsSending(false);
      return;
    }
    setStatus("sent");
    setHasSent(true);
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pro is active.
          </h1>
          <p className="text-sm text-zinc-600">Check your email to continue.</p>
        </div>

        {hasSent ? (
          <div className="space-y-3 text-sm text-zinc-600">
            {email ? (
              <div>
                <p className="font-semibold text-zinc-700">
                  We&#39;ve sent a sign-in link to:
                </p>
                <p className="mt-1 text-sm text-zinc-900">{email}</p>
              </div>
            ) : null}
            <p>Open the email on this device and click the link.</p>
            <p className="text-xs text-zinc-500">
              Didn&#39;t receive it?{" "}
              <button
                type="button"
                className="underline"
                onClick={sendMagicLink}
                disabled={isSending}
              >
                Send another
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-zinc-600">
            {email ? null : (
              <label className="text-sm font-semibold text-zinc-700">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-[var(--radius-card)] border border-[var(--border-color)] p-[var(--space-3)] text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
                />
              </label>
            )}
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={sendMagicLink}
              disabled={!email.trim() || isSending}
            >
              Send sign-in link
            </button>
            {status === "error" ? (
              <p className="text-xs text-zinc-500">
                Unable to send link.
              </p>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

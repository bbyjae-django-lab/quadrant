"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

type Step = "loading" | "enter_email" | "email_sent" | "error";

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const emailRef = useRef("");

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

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
      }
      setStep("enter_email");
    };
    void init();
    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleSendLink = async () => {
    if (!email.trim()) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    setError(null);
    setIsSending(true);
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options:
        typeof window !== "undefined"
          ? {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                "/dashboard",
              )}`,
            }
          : undefined,
    });
    if (!error) {
      setStep("email_sent");
      setIsSending(false);
      return;
    }
    setStep("enter_email");
    setError("Unable to send link.");
    setIsSending(false);
  };

  const renderBody = () => {
    if (step === "email_sent") {
      return (
        <div className="space-y-3 text-sm text-zinc-600">
          <div>
            <p className="font-semibold text-zinc-700">
              We&#39;ve sent a sign-in link to:
            </p>
            <p className="mt-1 text-sm text-zinc-900">{email}</p>
          </div>
          <p>Check your email and click the link.</p>
          <p>You can close this tab after clicking the link.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-tertiary text-sm"
              onClick={() => {
                setStep("enter_email");
                setError(null);
                setEmail(emailRef.current);
              }}
            >
              Change email
            </button>
          </div>
        </div>
      );
    }
    return (
      <>
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
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={handleSendLink}
          disabled={isSending}
        >
          Send link
        </button>
        {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pro is active.
          </h1>
          <p className="text-sm text-zinc-600">
            Sign in to continue.
          </p>
        </div>
        {renderBody()}
      </main>
    </div>
  );
}

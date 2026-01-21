"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

const STORAGE_SESSION_KEY = "quadrant_success_session_id";
const STORAGE_EMAIL_KEY = "quadrant_success_email";
const STORAGE_PENDING_KEY = "quadrant_pending_attach";
const RETURN_TO_KEY = "quadrant_resume_url";
const PENDING_EMAIL_KEY = "quadrant_pending_email";

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

  const clearPending = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(STORAGE_EMAIL_KEY);
    localStorage.removeItem(STORAGE_PENDING_KEY);
    localStorage.removeItem(RETURN_TO_KEY);
    localStorage.removeItem(PENDING_EMAIL_KEY);
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const sessionId = searchParams?.get("session_id");
      const returnToParam = searchParams?.get("returnTo") ?? "";
      if (typeof window !== "undefined" && sessionId) {
        localStorage.setItem(STORAGE_SESSION_KEY, sessionId);
      }
      if (typeof window !== "undefined") {
        let resolvedReturnTo =
          returnToParam ||
          localStorage.getItem(RETURN_TO_KEY) ||
          "/dashboard";
        localStorage.setItem(RETURN_TO_KEY, resolvedReturnTo);
      }
      const storedEmail =
        typeof window !== "undefined"
          ? localStorage.getItem(PENDING_EMAIL_KEY) ?? ""
          : "";
      const pending =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_PENDING_KEY) === "1"
          : false;
      let resolvedEmail = storedEmail;
      if (!resolvedEmail && sessionId) {
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
      if (pending && storedEmail) {
        setStep("email_sent");
      } else {
        setStep("enter_email");
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const sessionId = searchParams?.get("session_id");
    if (sessionId) {
      localStorage.setItem(STORAGE_SESSION_KEY, sessionId);
    }
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
    console.log("OTP send attempted", { email: email.trim() });
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options:
        typeof window !== "undefined"
          ? {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
                localStorage.getItem(RETURN_TO_KEY) ?? "/dashboard",
              )}`,
            }
          : undefined,
    });
    console.log("OTP send result", { error: error?.message ?? null });
    if (!error) {
      if (typeof window !== "undefined") {
        localStorage.setItem(PENDING_EMAIL_KEY, email.trim());
        localStorage.setItem(STORAGE_PENDING_KEY, "1");
      }
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
              We’ve sent a sign-in link to:
            </p>
            <p className="mt-1 text-sm text-zinc-900">{email}</p>
          </div>
          <p>Check your email and click the link.</p>
          <p>Keep this tab open.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-tertiary text-sm"
              onClick={() => {
                setStep("enter_email");
                setError(null);
                setEmail(emailRef.current);
                clearPending();
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
            Sign in to attach it to your history.
          </p>
        </div>
        {renderBody()}
      </main>
    </div>
  );
}

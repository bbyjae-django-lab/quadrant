"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

const STORAGE_SESSION_KEY = "quadrant_success_session_id";
const STORAGE_EMAIL_KEY = "quadrant_success_email";
const STORAGE_PENDING_KEY = "quadrant_success_pending_attach";
const CHECK_DEBOUNCE_MS = 750;

type Step = "loading" | "enter_email" | "link_sent" | "checking" | "attached" | "error";

export default function SuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const isCheckingRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const emailRef = useRef("");
  const autoAttachRan = useRef(false);

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const params = new URLSearchParams();
    const sessionId = searchParams?.get("session_id");
    if (sessionId) {
      params.set("session_id", sessionId);
    }
    const nextPath = params.toString()
      ? `/billing/success?${params.toString()}`
      : "/billing/success";
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath,
    )}`;
  }, [searchParams]);

  const clearPending = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(STORAGE_EMAIL_KEY);
    localStorage.removeItem(STORAGE_PENDING_KEY);
  }, []);

  const markAttached = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_PENDING_KEY, "0");
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(STORAGE_EMAIL_KEY);
  }, []);

  const ensureSession = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      return null;
    }
    const sessionResult = await client.auth.getSession();
    if (sessionResult.data.session) {
      return sessionResult.data.session;
    }
    return null;
  }, []);

  const checkSessionAndAttach = useCallback(async () => {
    const now = Date.now();
    if (isCheckingRef.current) {
      return;
    }
    if (now - lastAttemptAtRef.current < CHECK_DEBOUNCE_MS) {
      return;
    }
    lastAttemptAtRef.current = now;
    isCheckingRef.current = true;
    const client = getSupabaseClient();
    if (!client) {
      isCheckingRef.current = false;
      return;
    }
    setStep("checking");
    const session = await ensureSession();
    const user = session?.user;
    if (!user || !session?.access_token) {
      setHasSession(false);
      setStep("link_sent");
      setError(
        "Not signed in yet. Click the link in your email, then try again.",
      );
      isCheckingRef.current = false;
      return;
    }
    setHasSession(true);
    const storedEmail =
      emailRef.current.trim() ||
      (typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_EMAIL_KEY) ?? ""
        : "");
    if (!storedEmail) {
      setStep("email_sent");
      isCheckingRef.current = false;
      return;
    }
    setStep("checking");
    const sessionId =
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_SESSION_KEY)
        : null;
    const response = await fetch("/api/billing/attach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: storedEmail, session_id: sessionId }),
    });
    if (!response.ok) {
      console.warn("Billing attach failed.");
      setStep("error");
      setError("Couldn’t confirm Pro yet. Try again.");
      isCheckingRef.current = false;
      return;
    }
    setStep("attached");
    markAttached();
    window.setTimeout(() => {
      router.replace("/dashboard");
    }, 800);
    isCheckingRef.current = false;
  }, [ensureSession, markAttached, router]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const sessionId = searchParams?.get("session_id");
      if (typeof window !== "undefined" && sessionId) {
        localStorage.setItem(STORAGE_SESSION_KEY, sessionId);
      }
      const storedEmail =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_EMAIL_KEY) ?? ""
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
      if (pending && resolvedEmail) {
        setStep("link_sent");
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
    let active = true;
    const run = async () => {
      const client = getSupabaseClient();
      if (!client) {
        return;
      }
      if (typeof window !== "undefined") {
        const sessionId = searchParams?.get("session_id");
        if (sessionId) {
          localStorage.setItem(STORAGE_SESSION_KEY, sessionId);
        }
      }
      const session = await ensureSession();
      if (!active) {
        return;
      }
      const user = session?.user;
      if (!user || !session?.access_token) {
        setHasSession(false);
        return;
      }
      setHasSession(true);
      const pending =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_PENDING_KEY) === "1"
          : false;
      if (pending) {
        if (autoAttachRan.current) {
          return;
        }
        autoAttachRan.current = true;
        setStep("checking");
        await checkSessionAndAttach();
        return;
      }
      setStep("attached");
      window.setTimeout(() => {
        router.replace("/dashboard");
      }, 800);
    };
    void run();
    return () => {
      active = false;
    };
  }, [checkSessionAndAttach, router, searchParams]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (session && localStorage.getItem(STORAGE_PENDING_KEY) === "1") {
          void checkSessionAndAttach();
        }
      },
    );
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [checkSessionAndAttach]);

  const handleSendLink = async () => {
    if (!email.trim()) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    setError(null);
    setStep("checking");
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_EMAIL_KEY, email.trim());
      localStorage.setItem(STORAGE_PENDING_KEY, "1");
    }
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (!error) {
      setStep("link_sent");
      return;
    }
    setStep("enter_email");
    setError("Unable to send link.");
  };

  const renderBody = () => {
    if (step === "attached") {
      return (
        <div className="space-y-2 text-sm text-zinc-600">
          <p>Pro is active.</p>
          <p>Your subscription is now linked to your account.</p>
          <p>Redirecting to your dashboard…</p>
        </div>
      );
    }
    if (hasSession) {
      return (
        <div className="space-y-2 text-sm text-zinc-600">
          <p>Signing you in…</p>
          <p>Redirecting to your dashboard…</p>
        </div>
      );
    }
    if (step === "link_sent" || step === "checking" || step === "error") {
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
              className="btn btn-primary text-sm"
              onClick={() => {
                void checkSessionAndAttach();
              }}
            >
              I’ve clicked the link
            </button>
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
          {step === "checking" ? (
            <p className="text-xs text-zinc-500">Checking sign-in…</p>
          ) : null}
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
        >
          Send link
        </button>
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
        {step === "error" && error ? (
          <p className="text-xs text-zinc-500">{error}</p>
        ) : null}
      </main>
    </div>
  );
}

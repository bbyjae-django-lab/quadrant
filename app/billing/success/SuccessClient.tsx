"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

type Status = "sent" | "error";

const RESEND_COOLDOWN_SECONDS = 8;

const isBadReturnTo = (value: string) => value === "/pricing" || value === "/";

const getSafeReturnTo = (value: string | null) => {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !isBadReturnTo(value)
  ) {
    return value;
  }
  return "/dashboard";
};

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("sent");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const autoSendRef = useRef(false);
  const sendingRef = useRef(false);

  const sendMagicLink = async (targetEmail: string) => {
    if (!targetEmail || sendingRef.current) {
      return;
    }
    if (cooldownSeconds > 0) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setStatus("error");
      return;
    }
    sendingRef.current = true;
    const returnTo =
      typeof window !== "undefined"
        ? sessionStorage.getItem("quadrant_return_to")
        : null;
    const safeReturnTo = getSafeReturnTo(returnTo);
    const { error } = await client.auth.signInWithOtp({
      email: targetEmail,
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
    } else {
      setStatus("sent");
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    }
    sendingRef.current = false;
  };

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
      setEmail(resolvedEmail);
      if (!autoSendRef.current && resolvedEmail) {
        autoSendRef.current = true;
        void sendMagicLink(resolvedEmail);
      }
      if (!resolvedEmail) {
        setStatus("error");
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldownSeconds((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [cooldownSeconds]);

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pro is active.
          </h1>
          <p className="text-sm text-zinc-600">Check your email to continue.</p>
        </div>

        <div className="space-y-3 text-sm text-zinc-600">
          <div>
            <p className="font-semibold text-zinc-700">
              We&#39;ve sent a sign-in link to:
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {email || "your email"}
            </p>
          </div>
          <p>
            Open the email on this device and click the link. You can close this
            tab after signing in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={() => sendMagicLink(email)}
              disabled={cooldownSeconds > 0}
            >
              {cooldownSeconds > 0
                ? `Resend link in ${cooldownSeconds}s`
                : "Resend link"}
            </button>
          </div>
          {status === "error" ? null : null}
        </div>
      </main>
    </div>
  );
}

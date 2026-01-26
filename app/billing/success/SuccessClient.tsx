"use client";

import { useState } from "react";

type SuccessClientProps = {
  sessionId: string;
};

export default function SuccessClient({ sessionId }: SuccessClientProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);

  const handleResend = async () => {
    if (!sessionId || isSending || cooldownActive) {
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) {
        setErrorMessage("Unable to resend link.");
      } else {
        setCooldownActive(true);
        window.setTimeout(() => setCooldownActive(false), 10_000);
      }
    } catch {
      setErrorMessage("Unable to resend link.");
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Payment complete.
          </h1>
          <p className="text-sm text-zinc-600">Check your email to continue.</p>
        </div>

        <div className="space-y-3 text-sm text-zinc-600">
          <p>Open the email on this device and click the link.</p>
          <button
            type="button"
            className="btn btn-primary w-fit text-sm"
            onClick={handleResend}
            disabled={!sessionId || isSending || cooldownActive}
          >
            Resend link
          </button>
          {!sessionId ? (
            <p className="text-xs text-zinc-500">
              Missing checkout session. Please refresh.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="text-xs text-zinc-500">{errorMessage}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

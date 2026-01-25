"use client";

import { useEffect, useState } from "react";
import { signInWithOtp } from "../lib/auth";

type AuthClientProps = {
  returnTo: string;
};

const getSafeReturnTo = (value: string) => {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
};

export default function AuthClient({ returnTo }: AuthClientProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const safeReturnTo = getSafeReturnTo(returnTo);
    sessionStorage.setItem("quadrant_return_to", safeReturnTo);
  }, [returnTo]);

  const handleSend = async () => {
    if (!email.trim()) {
      return;
    }
    setError(null);
    setIsSending(true);
    const { error } = await signInWithOtp(email.trim());
    if (error) {
      setError("Unable to send link.");
      setIsSending(false);
      return;
    }
    setSent(true);
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        {sent ? (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>Check your email to continue.</p>
            <p>We sent a sign-in link to {email}.</p>
          </div>
        ) : (
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
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={handleSend}
              disabled={isSending}
            >
              Send link
            </button>
            {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
          </div>
        )}
      </main>
    </div>
  );
}

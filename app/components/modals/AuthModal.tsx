"use client";

import { useState } from "react";

import { signInWithOtp } from "../../lib/auth";

type AuthModalProps = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim()) {
      return;
    }
    setSubmitting(true);
    const { error } = await signInWithOtp(email.trim());
    setSubmitting(false);
    if (!error) {
      setSent(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
      <div className="w-full max-w-md ui-modal p-[var(--space-6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Sign in to preserve history
            </h2>
          </div>
        </div>
        <div className="mt-4 space-y-4">
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
          {sent ? (
            <p className="text-sm text-zinc-600">
              Check your email for the link.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={handleSendLink}
                disabled={submitting}
              >
                Send link
              </button>
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={onClose}
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import { signInWithOtp } from "../../lib/auth";

type AuthModalProps = {
  onClose: () => void;
};

export default function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((el) => !el.hasAttribute("disabled"));
    focusables[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSendLink = async () => {
    if (!email.trim()) {
      return;
    }
    setError(null);
    setSubmitting(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_from_modal", "true");
    }
    const { error } = await signInWithOtp(email.trim());
    setSubmitting(false);
    if (!error) {
      setSent(true);
      return;
    }
    setError("Unable to send link.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md ui-modal p-[var(--space-6)]"
      >
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
          {submitting ? (
            <p className="text-sm text-zinc-600">Sending…</p>
          ) : sent ? (
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
          {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

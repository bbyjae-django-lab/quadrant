"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../providers/AuthProvider";

type SuccessClientProps = {
  sessionId: string;
};

export default function SuccessClient({ sessionId }: SuccessClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session_id") ?? "";
  const effectiveSessionId = sessionId || urlSessionId;

  const { refreshEntitlements } = useAuth();

  const [status, setStatus] = useState<"syncing" | "done" | "error">("syncing");

  useEffect(() => {
    // Webhook should have applied entitlements already.
    // We refresh the client state so Pro flips immediately.
    const run = async () => {
      try {
        // If you have /api/billing/attach, you can call it here as belt+suspenders.
        // Otherwise, just refresh entitlements.
        refreshEntitlements();
        setStatus("done");
      } catch {
        setStatus("error");
      }
    };
    run();
  }, [refreshEntitlements]);

  const handleGoDashboard = () => {
    const returnTo =
      (typeof window !== "undefined" && sessionStorage.getItem("quadrant_return_to")) ||
      "/dashboard";
    router.replace(returnTo);
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Pro attached.
          </h1>
          <p className="text-sm text-zinc-600">
            Your record is now permanent across devices and resets.
          </p>
        </div>

        {status === "syncing" ? (
          <p className="text-sm text-zinc-600">Updating your access…</p>
        ) : null}

        {status === "error" ? (
          <p className="text-sm text-zinc-600">
            If Pro doesn’t appear immediately, refresh once.
          </p>
        ) : null}

        <div className="flex gap-3">
          <button type="button" className="btn btn-primary" onClick={handleGoDashboard}>
            Go to dashboard
          </button>
        </div>

        {!effectiveSessionId ? (
          <p className="text-xs text-zinc-500">
            Missing checkout session id (safe to ignore if Pro is active).
          </p>
        ) : null}
      </main>
    </div>
  );
}

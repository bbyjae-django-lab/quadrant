"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../providers/AuthProvider";
import { getSupabaseClient } from "../lib/supabaseClient";

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthed, isPro, proStatus, authLoading, signOut } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthed) {
      router.replace("/auth?returnTo=/dashboard");
    }
  }, [authLoading, isAuthed, router]);

  const handleManageBilling = () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setNotice("Sign in to continue.");
      return;
    }
    supabase.auth.getSession().then((result) => {
      const accessToken = result.data.session?.access_token;
      if (!accessToken) {
        setNotice("Sign in to continue.");
        return;
      }
      fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
          setNotice("Unable to open billing.");
        })
        .catch(() => {
          setNotice("Unable to open billing.");
        });
    });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/dashboard");
  };

  if (!isAuthed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto w-full max-w-2xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <h1 className="text-2xl font-semibold text-zinc-900">Account</h1>
        <div className="mt-6 space-y-4 text-sm text-zinc-700">
          <div>
            <p className="text-xs text-zinc-500">Email</p>
            <p className="mt-1 text-sm text-zinc-900">{user?.email ?? ""}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Plan</p>
            <p className="mt-1 min-h-[1.25rem] text-sm text-zinc-900">
              {authLoading || proStatus === "unknown"
                ? "Checking..."
                : isPro
                  ? "Pro"
                  : "Free"}
            </p>
          </div>
          {proStatus === "pro" ? (
            <button
              type="button"
              className="btn btn-secondary w-fit text-sm"
              onClick={handleManageBilling}
            >
              Manage billing
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary w-fit text-sm"
            onClick={handleSignOut}
          >
            Sign out
          </button>
          {notice ? (
            <p className="text-xs text-zinc-500">{notice}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

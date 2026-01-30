"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "../providers/AuthProvider";
import { getSupabaseClient } from "../lib/supabaseClient";
import AuthModal from "../components/modals/AuthModal";

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthed, isPro, proStatus, authLoading, signOut } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthed) {
      setShowAuth(true);
    }
  }, [authLoading, isAuthed]);

  const handleManageBilling = () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setNotice(null);
      setShowAuth(true);
      return;
    }
    supabase.auth.getSession().then((result) => {
      const accessToken = result.data.session?.access_token;
      if (!accessToken) {
        setNotice(null);
        setShowAuth(true);
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
    setIsSigningOut(true);
    await signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto w-full max-w-2xl ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="text-xs">
          <Link href="/dashboard" className="underline">
            Back
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Account</h1>
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {proStatus === "free" ? (
              <>
                <Link
                  href={`/pricing?intent=upgrade&returnTo=${encodeURIComponent("/account")}`}
                  className="underline"
                >
                  Upgrade to Pro
                </Link>
                <span aria-hidden="true" className="text-zinc-400">
                  |
                </span>
              </>
            ) : null}
            {proStatus === "pro" ? (
              <>
                <button
                  type="button"
                  className="underline"
                  onClick={handleManageBilling}
                >
                  Manage billing
                </button>
                <span aria-hidden="true" className="text-zinc-400">
                  |
                </span>
              </>
            ) : null}
            <button
              type="button"
              className="underline"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
          {notice ? (
            <p className="text-xs text-zinc-500">{notice}</p>
          ) : null}
        </div>
      </main>

      {showAuth ? (
        <AuthModal
          title="Attach to your record"
          next="/account"
          onClose={() => setShowAuth(false)}
        />
      ) : null}
    </div>
  );
}

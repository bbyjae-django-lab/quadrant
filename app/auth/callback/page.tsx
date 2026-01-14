"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      const client = getSupabaseClient();
      if (!client) {
        router.replace("/");
        return;
      }
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        await client.auth.exchangeCodeForSession(code);
      } else {
        await client.auth.getSession();
      }
      router.replace("/");
    };
    finalize();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-sm text-zinc-600">
      Signing you in…
    </div>
  );
}


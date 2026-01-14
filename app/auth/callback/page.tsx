"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

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
      const fromModal =
        typeof window !== "undefined" &&
        localStorage.getItem("auth_from_modal") === "true";
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_from_modal");
      }
      if (window.opener || fromModal) {
        try {
          window.opener?.postMessage({ type: "quadrant-auth" }, "*");
          window.close();
          setMessage("Signed in. You can close this tab.");
          return;
        } catch {
          setMessage("Signed in. You can close this tab.");
          return;
        }
      }
      router.replace("/");
    };
    finalize();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-sm text-zinc-600">
      {message}
    </div>
  );
}

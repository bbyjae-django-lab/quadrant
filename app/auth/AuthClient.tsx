"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthModal from "../components/modals/AuthModal";
import { getSupabaseClient } from "../lib/supabaseClient";

type AuthClientProps = {
  next: string;
};

export default function AuthClient({ next }: AuthClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      sessionStorage.setItem("quadrant_return_to", next);

      if (typeof window === "undefined") {
        if (!cancelled) {
          setShowModal(true);
        }
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        if (!cancelled) {
          setShowModal(true);
        }
        return;
      }

      const href = window.location.href;
      const url = new URL(href);
      const code = url.searchParams.get("code");
      const hash = url.hash ?? "";
      const hasHashTokens =
        hash.includes("access_token=") && hash.includes("refresh_token=");

      try {
        if (hasHashTokens) {
          const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data, error } = await client.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Failed to set Supabase session from magic link.");
            }

            if (!error && data?.session) {
              window.history.replaceState({}, "", url.pathname + url.search);
              router.replace(next);
              return;
            }
          }
        } else if (code) {
          const { data, error } = await client.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Failed to exchange auth code for session.");
          }
          if (!error && data?.session) {
            url.searchParams.delete("code");
            const search = url.searchParams.toString();
            const nextUrl = search ? `${url.pathname}?${search}` : url.pathname;
            window.history.replaceState({}, "", nextUrl);
            router.replace(next);
            return;
          }
        }
      } catch {
        // Fall through to showing modal.
      }

      if (!cancelled) {
        setShowModal(true);
      }
    };

    void handleCallback();

    return () => {
      cancelled = true;
    };
  }, [next, router]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(next);
  };

  if (!showModal) {
    return null;
  }

  return <AuthModal onClose={handleClose} />;
}

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

      try {
        if (code) {
          const { data, error } = await client.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            router.replace(next);
            return;
          }
        } else if (hash.includes("access_token=")) {
          const { data, error } = await client.auth.getSessionFromUrl({
            storeSession: true,
          });
          if (!error && data?.session) {
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

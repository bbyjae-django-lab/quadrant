import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "./supabaseClient";

let warned = false;

const warnOnce = (message: string) => {
  if (warned) {
    return;
  }
  console.warn(message);
  warned = true;
};

export const getSession = async (): Promise<Session | null> => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data, error } = await client.auth.getSession();
  if (error) {
    warnOnce(`Supabase auth session error: ${error.message}`);
    return null;
  }
  return data.session ?? null;
};

export const onAuthStateChange = (
  handler: (session: Session | null) => void,
): (() => void) => {
  const client = getSupabaseClient();
  if (!client) {
    return () => {};
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    handler(session);
  });
  return () => {
    data.subscription.unsubscribe();
  };
};

export const signInWithOtp = async (email: string) => {
  const client = getSupabaseClient();
  if (!client) {
    warnOnce("Supabase client unavailable; cannot send magic link.");
    return { error: new Error("Supabase client unavailable.") };
  }
  const isBadReturnTo = (path: string) => path === "/pricing" || path === "/";
  const storedNext =
    typeof window !== "undefined"
      ? sessionStorage.getItem("quadrant_return_to")
      : null;
  const returnTo =
    storedNext ??
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/dashboard");
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") && !isBadReturnTo(returnTo)
      ? returnTo
      : "/dashboard";
  if (typeof window !== "undefined" && !storedNext) {
    sessionStorage.setItem("quadrant_return_to", safeReturnTo);
  }
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth?next=${encodeURIComponent(safeReturnTo)}`,
    },
  });
};

export const signOut = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.auth.signOut();
};

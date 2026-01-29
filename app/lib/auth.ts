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

const getReturnTo = () => {
  if (typeof window === "undefined") {
    return "/dashboard";
  }
  const stored = sessionStorage.getItem("quadrant_return_to");
  if (stored && stored.startsWith("/") && !stored.startsWith("//")) {
    return stored;
  }
  return "/dashboard";
};

export const signInWithOtp = async (email: string, returnTo?: string) => {
const client = getSupabaseClient();
if (!client) {
warnOnce("Supabase client unavailable; cannot send magic link.");
return { error: new Error("Supabase client unavailable.") };
}

const resolvedReturnTo =
typeof returnTo === "string" &&
returnTo.startsWith("/") &&
!returnTo.startsWith("//")
? returnTo
: getReturnTo();

const appUrl = typeof window !== "undefined" ? window.location.origin : "";

return client.auth.signInWithOtp({
email,
options: {
emailRedirectTo: `${appUrl}/auth?next=${encodeURIComponent(resolvedReturnTo)}`,
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

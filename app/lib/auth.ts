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
  return client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
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


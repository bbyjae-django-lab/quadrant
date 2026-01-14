import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let warned = false;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (client) {
    return client;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (!warned) {
      console.warn(
        "Supabase env vars are missing; continuing in local-only mode.",
      );
      warned = true;
    }
    return null;
  }
  client = createClient(url, anonKey);
  return client;
};


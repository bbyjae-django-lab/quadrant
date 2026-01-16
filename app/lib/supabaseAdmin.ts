import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export const getSupabaseAdmin = () => {
  if (adminClient) {
    return adminClient;
  }
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return adminClient;
};

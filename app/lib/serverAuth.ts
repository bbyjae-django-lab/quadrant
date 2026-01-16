import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

export const getUserFromRequest = async (
  req: Request,
): Promise<User | null> => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return null;
  }
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return null;
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    return null;
  }
  return data.user ?? null;
};

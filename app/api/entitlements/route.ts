import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async (req: Request) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Missing config" },
      { status: 500 },
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(
    token,
  );
  const user = userData?.user ?? null;
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", detail: userError?.message },
      { status: 401 },
    );
  }
  const { data: row, error } = await supabase
    .from("user_entitlements")
    .select("is_pro,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "Entitlements lookup failed" },
      { status: 500 },
    );
  }
  const isProFlag = Boolean(row?.is_pro);
  const periodEnd = row?.current_period_end
    ? new Date(row.current_period_end).getTime()
    : null;
  const isActive = periodEnd ? periodEnd > Date.now() : true;
  const isPro = isProFlag && isActive;
  return NextResponse.json({ isPro });
};

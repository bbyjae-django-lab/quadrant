import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Missing Supabase config" },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);
  const user = userData?.user ?? null;
  if (!user) {
    return NextResponse.json(
      { error: "invalid_token", detail: userError?.message },
      { status: 401 },
    );
  }

  const { data: activeRun, error: activeError } = await supabase
    .from("runs")
    .select("id, ended_at, status, started_at")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeError) {
    console.error(
      "[runs/end] active lookup failed",
      activeError?.code,
      activeError?.message ?? activeError,
    );
    return NextResponse.json({ error: "run_lookup_failed" }, { status: 500 });
  }
  if (!activeRun) {
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }

  const endedAt = new Date().toISOString();
  const { data: updatedRun, error: updateError } = await supabase
    .from("runs")
    .update({
      ended_at: endedAt,
      end_reason: "ended",
      status: "ended",
    })
    .eq("id", activeRun.id)
    .eq("user_id", user.id)
    .is("ended_at", null)
    .select("id, ended_at")
    .maybeSingle();
  if (updateError) {
    console.error(
      "[runs/end] update failed",
      updateError?.code,
      updateError?.message ?? updateError,
    );
    return NextResponse.json({ error: "run_update_failed" }, { status: 500 });
  }
  if (!updatedRun) {
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }
  return NextResponse.json({
    ok: true,
    runId: updatedRun.id,
    endedAt: updatedRun.ended_at,
  });
};

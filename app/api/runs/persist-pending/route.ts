import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PendingRunPayload = {
  client_run_id: string;
  protocol_id: string;
  protocol_name: string;
  started_at: string;
  ended_at: string;
  end_reason: "violation" | "completed" | "abandoned";
  clean_days: number;
  total_days: number;
  violation_day: number | null;
};

const mapEndReasonToStatus = (
  reason: PendingRunPayload["end_reason"],
) => {
  if (reason === "completed") {
    return "completed";
  }
  if (reason === "violation") {
    return "failed";
  }
  return "ended";
};

export const POST = async (req: Request) => {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
  let payload: PendingRunPayload | null = null;
  try {
    payload = (await req.json()) as PendingRunPayload;
  } catch {
    payload = null;
  }
  if (
    !payload ||
    !payload.client_run_id ||
    !payload.protocol_id ||
    !payload.protocol_name ||
    !payload.started_at ||
    !payload.ended_at
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const status = mapEndReasonToStatus(payload.end_reason);
  const { error: runError } = await supabase.from("runs").upsert({
    id: payload.client_run_id,
    user_id: user.id,
    protocol_id: payload.protocol_id,
    protocol_name: payload.protocol_name,
    status,
    started_at: payload.started_at,
    ended_at: payload.ended_at,
  });
  if (runError) {
    return NextResponse.json(
      { error: "run_insert_failed" },
      { status: 500 },
    );
  }
  const checkins: Array<{
    id: string;
    run_id: string;
    user_id: string;
    day_index: number;
    result: "clean" | "violated";
    note: string | null;
    created_at: string;
  }> = [];
  for (let day = 1; day <= payload.clean_days; day += 1) {
    checkins.push({
      id: `${payload.client_run_id}-${day}`,
      run_id: payload.client_run_id,
      user_id: user.id,
      day_index: day,
      result: "clean",
      note: null,
      created_at: payload.ended_at,
    });
  }
  if (
    payload.end_reason === "violation" &&
    payload.violation_day &&
    payload.violation_day > payload.clean_days
  ) {
    checkins.push({
      id: `${payload.client_run_id}-${payload.violation_day}`,
      run_id: payload.client_run_id,
      user_id: user.id,
      day_index: payload.violation_day,
      result: "violated",
      note: null,
      created_at: payload.ended_at,
    });
  }
  if (checkins.length > 0) {
    await supabase.from("checkins").upsert(checkins, { onConflict: "id" });
  }
  return NextResponse.json({ ok: true });
};

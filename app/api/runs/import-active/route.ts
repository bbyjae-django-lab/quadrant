import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ImportActivePayload = {
  protocol_id: string;
  protocol_name: string;
  started_at: string;
};

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

  let payload: ImportActivePayload | null = null;
  try {
    payload = (await req.json()) as ImportActivePayload;
  } catch {
    payload = null;
  }
  if (
    !payload ||
    !payload.protocol_id ||
    !payload.protocol_name ||
    !payload.started_at
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { data: activeRun, error: activeError } = await supabase
    .from("runs")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeError) {
    console.error(
      "[runs/import-active] active lookup failed",
      activeError?.code,
      activeError?.message ?? activeError,
    );
    return NextResponse.json({ error: "run_lookup_failed" }, { status: 500 });
  }
  if (activeRun?.id) {
    return NextResponse.json({
      ok: true,
      alreadyExists: true,
      runId: activeRun.id,
    });
  }

  const { data: insertedRun, error: insertError } = await supabase
    .from("runs")
    .insert({
      user_id: user.id,
      protocol_id: payload.protocol_id,
      protocol_name: payload.protocol_name,
      status: "active",
      started_at: payload.started_at,
      ended_at: null,
      end_reason: null,
    })
    .select("id")
    .single();
  if (insertError || !insertedRun) {
    console.error(
      "[runs/import-active] insert failed",
      insertError?.code,
      insertError?.message ?? insertError,
    );
    return NextResponse.json({ error: "run_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, runId: insertedRun.id });
};

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ImportActivePayload = {
  protocol_id: string;
  protocol_name: string;
  started_at: string;
  checkins?: ImportCheckinPayload[];
};

type ImportCheckinPayload = {
  day_index: number;
  result: "clean" | "violated";
  note?: string | null;
  created_at: string;
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

  const rawCheckins = Array.isArray(payload.checkins) ? payload.checkins : [];
  const normalizedCheckins = new Map<number, ImportCheckinPayload>();
  for (const raw of rawCheckins) {
    const dayIndex = Number(raw?.day_index);
    const result = raw?.result;
    const createdAt = raw?.created_at;
    if (!Number.isFinite(dayIndex) || dayIndex <= 0) {
      continue;
    }
    if (result !== "clean" && result !== "violated") {
      continue;
    }
    if (typeof createdAt !== "string" || !createdAt) {
      continue;
    }
    const note =
      typeof raw?.note === "string" && raw.note.trim() ? raw.note.trim() : null;
    if (!normalizedCheckins.has(dayIndex)) {
      normalizedCheckins.set(dayIndex, {
        day_index: dayIndex,
        result,
        note,
        created_at: createdAt,
      });
    }
  }
  const checkins = Array.from(normalizedCheckins.values());

  const insertCheckins = async (
    runId: string,
    existingIndices?: Set<number>,
  ) => {
    if (!checkins.length) {
      return null;
    }
    const pending = existingIndices
      ? checkins.filter((checkin) => !existingIndices.has(checkin.day_index))
      : checkins;
    if (!pending.length) {
      return null;
    }
    const { error } = await supabase.from("checkins").insert(
      pending.map((checkin) => ({
        user_id: user.id,
        run_id: runId,
        day_index: checkin.day_index,
        result: checkin.result,
        note: checkin.note ?? null,
        created_at: checkin.created_at,
      })),
    );
    return error ?? null;
  };

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
    if (checkins.length) {
      const { data: existingCheckins, error: existingError } = await supabase
        .from("checkins")
        .select("day_index")
        .eq("user_id", user.id)
        .eq("run_id", activeRun.id);
      if (existingError) {
        console.error(
          "[runs/import-active] checkins lookup failed",
          existingError?.code,
          existingError?.message ?? existingError,
        );
        return NextResponse.json(
          { error: "checkins_lookup_failed" },
          { status: 500 },
        );
      }
      const existingIndices = new Set<number>(
        Array.isArray(existingCheckins)
          ? existingCheckins.map((row) => Number(row.day_index))
          : [],
      );
      const insertError = await insertCheckins(activeRun.id, existingIndices);
      if (insertError) {
        console.error(
          "[runs/import-active] checkins insert failed",
          insertError?.code,
          insertError?.message ?? insertError,
        );
        return NextResponse.json(
          { error: "checkins_insert_failed" },
          { status: 500 },
        );
      }
    }
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

  const checkinsError = await insertCheckins(insertedRun.id);
  if (checkinsError) {
    console.error(
      "[runs/import-active] checkins insert failed",
      checkinsError?.code,
      checkinsError?.message ?? checkinsError,
    );
    return NextResponse.json(
      { error: "checkins_insert_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, runId: insertedRun.id });
};

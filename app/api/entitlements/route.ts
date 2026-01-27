import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async (req: Request) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];
  if (!supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
  }
  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length > 0 || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing config", missing },
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
  const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(
    token,
  );
  const user = userData?.user ?? null;
  const userId = user?.id ?? null;
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", detail: userError?.message },
      { status: 401 },
    );
  }
  const emailNorm = (user?.email ?? "").trim().toLowerCase();
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: row, error } = await admin
    .from("user_entitlements")
    .select("is_pro,current_period_end")
    .eq("user_id", userId)
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
  if (row) {
    return NextResponse.json({ isPro, userId, hasRow: true });
  }

  if (!emailNorm) {
    return NextResponse.json({ isPro: false, userId, hasRow: false });
  }

  const { data: pending, error: pendingError } = await admin
    .from("pending_entitlements")
    .select(
      "email,is_pro,stripe_customer_id,stripe_subscription_id,stripe_price_id,current_period_end,updated_at",
    )
    .eq("email", emailNorm)
    .maybeSingle();
  if (pendingError) {
    return NextResponse.json(
      { error: "Pending entitlements lookup failed" },
      { status: 500 },
    );
  }
  if (pending?.is_pro === true) {
    const { error: upsertError } = await admin
      .from("user_entitlements")
      .upsert(
        {
          user_id: userId,
          is_pro: true,
          stripe_customer_id: pending.stripe_customer_id ?? null,
          stripe_subscription_id: pending.stripe_subscription_id ?? null,
          stripe_price_id: pending.stripe_price_id ?? null,
          current_period_end: pending.current_period_end ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (upsertError) {
      return NextResponse.json(
        { error: "Entitlements promotion failed" },
        { status: 500 },
      );
    }
    const { error: deleteError } = await admin
      .from("pending_entitlements")
      .delete()
      .eq("email", emailNorm);
    if (deleteError) {
      console.error(
        "[entitlements] pending cleanup failed",
        deleteError?.code,
        deleteError?.message ?? deleteError,
      );
    }
    return NextResponse.json({ isPro: true, userId, hasRow: true, promoted: true });
  }

  return NextResponse.json({ isPro: false, userId, hasRow: false });
};

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const getAccessTokenFromCookies = (req: Request): string | null => {
  const header = req.headers.get("cookie") ?? "";
  if (!header) {
    return null;
  }
  const cookies = header.split(";").map((part) => part.trim());
  const cookieMap = new Map<string, string>();
  for (const part of cookies) {
    const index = part.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index);
    const value = part.slice(index + 1);
    cookieMap.set(key, decodeURIComponent(value));
  }
  const directToken = cookieMap.get("sb-access-token");
  if (directToken) {
    return directToken;
  }
  for (const [key, value] of cookieMap.entries()) {
    if (!key.includes("sb-") || !key.endsWith("auth-token")) {
      continue;
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.access_token === "string"
      ) {
        return parsed.access_token;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const getUserFromCookies = async (req: Request) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { user: null, error: "Missing Supabase config" };
  }
  const token = getAccessTokenFromCookies(req);
  if (!token) {
    return { user: null, error: "Missing auth token" };
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    return { user: null, error: error.message };
  }
  return { user: data.user ?? null, error: null };
};

export const POST = async (req: Request) => {
  console.log("[billing/attach] request received");
  const { user, error: userError } = await getUserFromCookies(req);
  console.log("[billing/attach] user present:", Boolean(user));
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", detail: userError ?? undefined },
      { status: 401 },
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Missing Supabase admin" },
      { status: 500 },
    );
  }
  let payload: { email?: string } | null = null;
  try {
    payload = (await req.json()) as { email?: string };
  } catch {
    payload = null;
  }
  const email = payload?.email?.trim().toLowerCase() ?? user.email?.trim().toLowerCase() ?? "";
  console.log("[billing/attach] email:", email || "(missing)");
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  const { data: billingRows, error: selectError } = await admin
    .from("billing_customers")
    .select("email,user_id,stripe_customer_id,status,price_id")
    .eq("email", email);
  console.log(
    "[billing/attach] billing rows:",
    billingRows ? billingRows.length : 0,
  );
  if (selectError) {
    console.error("[billing/attach] select error:", selectError);
    return NextResponse.json(
      { error: "Billing lookup failed" },
      { status: 500 },
    );
  }
  if (!billingRows || billingRows.length === 0) {
    return NextResponse.json(
      { error: "No billing record for email" },
      { status: 404 },
    );
  }
  const billingRow = billingRows[0];
  if (billingRow.user_id && billingRow.user_id !== user.id) {
    return NextResponse.json(
      { error: "Billing record already linked" },
      { status: 409 },
    );
  }
  const { error: updateError } = await admin
    .from("billing_customers")
    .update({ user_id: user.id, updated_at: new Date().toISOString() })
    .eq("email", email);
  if (updateError) {
    console.error("[billing/attach] update error:", updateError);
    return NextResponse.json({ error: "Attach failed" }, { status: 500 });
  }
  const isProStatus =
    billingRow.status === "active" || billingRow.status === "trialing";
  const { error: entitlementError } = await admin
    .from("user_entitlements")
    .upsert({
      user_id: user.id,
      is_pro: isProStatus,
      stripe_customer_id: billingRow.stripe_customer_id ?? null,
      updated_at: new Date().toISOString(),
    });
  if (entitlementError) {
    console.error("[billing/attach] entitlement upsert error:", entitlementError);
  }
  console.log("[billing/attach] linked to user:", user.id);
  return NextResponse.json({ ok: true, user_id: user.id, email });
};

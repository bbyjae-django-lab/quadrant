import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  console.log("[billing/attach] request received");
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase config" },
      { status: 500 },
    );
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user ?? null;
  console.log("[billing/attach] user present:", Boolean(user));
  if (!user) {
    return NextResponse.json(
      { error: "invalid_token", detail: userError?.message },
      { status: 401 },
    );
  }
  let payload: { email?: string } | null = null;
  try {
    payload = (await req.json()) as { email?: string };
  } catch {
    payload = null;
  }
  const email =
    payload?.email?.trim().toLowerCase() ??
    user.email?.trim().toLowerCase() ??
    "";
  console.log("[billing/attach] email:", email || "(missing)");
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  const { data: billingRows, error: selectError } = await admin
    .from("billing_customers")
    .select("email,user_id,stripe_customer_id,status,price_id")
    .ilike("email", email);
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
    .ilike("email", email);
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

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { getUserFromRequest } from "../../../lib/serverAuth";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Missing Supabase admin" }, { status: 500 });
  }
  let payload: { email?: string } | null = null;
  try {
    payload = (await req.json()) as { email?: string };
  } catch {
    payload = null;
  }
  const email = payload?.email?.trim() ?? user.email ?? "";
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  const { error } = await admin
    .from("billing_customers")
    .upsert({
      email,
      supabase_user_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .select();
  if (error) {
    return NextResponse.json({ error: "Attach failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
};

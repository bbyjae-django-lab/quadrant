import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { getUserFromRequest } from "../../../lib/serverAuth";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!stripeSecret || !appUrl) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Missing Supabase admin" }, { status: 500 });
  }
  const { data: entitlement } = await admin
    .from("user_entitlements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!entitlement?.stripe_customer_id) {
    return NextResponse.json({ error: "No customer" }, { status: 400 });
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });
  const session = await stripe.billingPortal.sessions.create({
    customer: entitlement.stripe_customer_id,
    return_url: `${appUrl}/pricing`,
  });
  return NextResponse.json({ url: session.url });
};

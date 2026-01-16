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
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!stripeSecret || !priceId || !appUrl) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Missing Supabase admin" }, { status: 500 });
  }
  const { data: entitlement } = await admin
    .from("user_entitlements")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = entitlement?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("user_entitlements")
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_price_id: priceId,
        is_pro: false,
      })
      .select();
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
};

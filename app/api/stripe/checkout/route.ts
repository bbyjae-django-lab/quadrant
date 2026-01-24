import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getUserFromRequest } from "../../../lib/serverAuth";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  const user = await getUserFromRequest(req);
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!stripeSecret || !priceId || !appUrl) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
  const metadata: Record<string, string> = {
    app: "quadrant",
    price_id: priceId,
  };
  if (user?.id) {
    metadata.supabase_user_id = user.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard`,
    metadata,
    customer_email: user?.email ?? undefined,
  });

  return NextResponse.json({ url: session.url });
};

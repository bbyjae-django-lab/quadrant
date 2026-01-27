import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!stripeSecret || !priceId || !appUrl) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
  let returnTo = "/dashboard";
  try {
    const body = (await req.json()) as { returnTo?: string };
    if (
      body?.returnTo &&
      body.returnTo.startsWith("/") &&
      !body.returnTo.startsWith("//") &&
      body.returnTo !== "/" &&
      body.returnTo !== "/pricing"
    ) {
      returnTo = body.returnTo;
    }
  } catch {
    // ignore empty or invalid body
  }
  const metadata: Record<string, string> = {
    app: "quadrant",
    price_id: priceId,
    return_to: returnTo,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing/cancel`,
    metadata,
  });

  return NextResponse.json({ url: session.url });
};

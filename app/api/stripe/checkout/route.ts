// api/stripe/checkout
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const POST = async (req: Request) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!stripeSecret || !priceId || !appUrl) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

  let returnTo = "/dashboard";
  let userId: string | null = null;

  try {
    const body = (await req.json()) as { returnTo?: string; userId?: string };
    if (
      body?.returnTo &&
      body.returnTo.startsWith("/") &&
      !body.returnTo.startsWith("//") &&
      body.returnTo !== "/" &&
      body.returnTo !== "/pricing"
    ) {
      returnTo = body.returnTo;
    }
    if (body?.userId && isUuid(body.userId)) {
      userId = body.userId;
    }
  } catch {
    // ignore
  }

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const metadata: Record<string, string> = {
    app: "quadrant",
    price_id: priceId,
    return_to: returnTo,
    user_id: userId,
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




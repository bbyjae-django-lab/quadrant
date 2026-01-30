import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const missing: string[] = [];
  if (!stripeSecret) missing.push("STRIPE_SECRET_KEY");
  if (!priceId) missing.push("STRIPE_PRO_PRICE_ID");
  if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");

    if (missing.length) {
    return NextResponse.json({ error: "Missing config", missing }, { status: 500 });
  }

  // 👇 tell TypeScript these are definitely strings
  const STRIPE_SECRET_KEY = stripeSecret as string;
  const STRIPE_PRO_PRICE_ID = priceId as string;
  const NEXT_PUBLIC_APP_URL = appUrl as string;

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });


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
    userId = body?.userId ?? null;
  } catch {}

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
success_url: `${NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${NEXT_PUBLIC_APP_URL}/billing/cancel`,
metadata: {
  app: "quadrant",
  price_id: STRIPE_PRICE_ID,
  return_to: returnTo,
  user_id: userId,
},
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[stripe/checkout] failed", e?.message ?? e);
    return NextResponse.json(
      { error: "Stripe checkout create failed", message: e?.message ?? String(e) },
      { status: 500 },
    );
  }
};

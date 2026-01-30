import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getConfig = () => {
  const missing: string[] = [];
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecret) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (!webhookSecret) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }
  if (!appUrl) {
    missing.push("NEXT_PUBLIC_APP_URL");
  }
  if (!supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
  }
  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    stripeSecret,
    webhookSecret,
    appUrl,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    missing,
  };
};

// SQL (run once):
// create table if not exists public.stripe_webhook_events (
//   event_id text primary key,
//   created_at timestamptz default now()
// );

const getSafeReturnTo = (value: unknown) => {
  if (typeof value !== "string") {
    return "/dashboard";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  if (value === "/" || value === "/pricing") {
    return "/dashboard";
  }
  return value;
};

export const POST = async (req: Request) => {
  const {
    stripeSecret,
    webhookSecret,
    appUrl,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    missing,
  } = getConfig();
  if (
    missing.length > 0 ||
    !stripeSecret ||
    !webhookSecret ||
    !appUrl ||
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    return NextResponse.json(
      { error: "Missing config", missing },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error: eventInsertError } = await admin
    .from("stripe_webhook_events")
    .insert({ event_id: event.id });
  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    console.error("[stripe/webhook] event insert failed", eventInsertError);
    return NextResponse.json({ error: "Event tracking failed" }, { status: 500 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  let email = "";
  let returnTo = "/dashboard";
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  let stripePriceId: string | null = null;
  let currentPeriodEnd: string | null = null;
  let userId: string | null = null;

  try {
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["customer", "customer_details"],
    });
    email =
      fullSession.customer_details?.email ??
      fullSession.customer_email ??
      "";
    returnTo = getSafeReturnTo(fullSession.metadata?.return_to);
        stripePriceId = fullSession.metadata?.price_id ?? null;
    userId = (fullSession.metadata?.user_id as string | undefined) ?? null;

    stripeCustomerId =
      typeof fullSession.customer === "string"
        ? fullSession.customer
        : fullSession.customer?.id ?? null;

    stripeSubscriptionId =
      typeof fullSession.subscription === "string"
        ? fullSession.subscription
        : fullSession.subscription?.id ?? null;

    if (!email && typeof fullSession.customer === "string") {
      const customer = await stripe.customers.retrieve(fullSession.customer);
      if (!("deleted" in customer)) {
        email = customer.email ?? "";
      }
    }
    if (stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId,
      );
      currentPeriodEnd = new Date(
        subscription.current_period_end * 1000,
      ).toISOString();
    }
  } catch (error) {
    console.error("[stripe/webhook] session lookup failed", error);
    return NextResponse.json({ error: "Session lookup failed" }, { status: 500 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    console.log("[stripe/webhook] missing email for session", session.id);
    return NextResponse.json({ ok: true });
  }

    // ✅ Upgrade the actual user entitlements (source of truth for the app)
  if (userId) {
    const { error: entitlementsError } = await admin
      .from("user_entitlements")
      .upsert(
        {
          user_id: userId,
          is_pro: true,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_price_id: stripePriceId,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (entitlementsError) {
      console.error("[stripe/webhook] entitlements upsert failed", entitlementsError);
      return NextResponse.json(
        { error: "Entitlements upsert failed" },
        { status: 500 },
      );
    }

    // ✅ Since Pro is identity-bound, we’re done.
    return NextResponse.json({ ok: true });
  }

  // Fallback only (should be rare once checkout requires sign-in)
  console.error("[stripe/webhook] missing user_id metadata for session", session.id);

  const { error: pendingError } = await admin
    .from("pending_entitlements")
    .upsert(
      {
        email: normalizedEmail,
        is_pro: true,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: stripePriceId,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
  if (pendingError) {
    console.error("[stripe/webhook] pending entitlements upsert failed", pendingError);
    return NextResponse.json(
      { error: "Pending entitlements failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });


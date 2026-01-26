import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !stripeSecret ||
    !webhookSecret ||
    !appUrl ||
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
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

  try {
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["customer", "customer_details"],
    });
    email =
      fullSession.customer_details?.email ??
      fullSession.customer_email ??
      "";
    returnTo = getSafeReturnTo(fullSession.metadata?.return_to);

    if (!email && typeof fullSession.customer === "string") {
      const customer = await stripe.customers.retrieve(fullSession.customer);
      if (!("deleted" in customer)) {
        email = customer.email ?? "";
      }
    }
  } catch (error) {
    console.error("[stripe/webhook] session lookup failed", error);
    return NextResponse.json({ error: "Session lookup failed" }, { status: 500 });
  }

  if (!email) {
    console.log("[stripe/webhook] missing email for session", session.id);
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { error: sendError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
        returnTo,
      )}`,
    },
  });
  if (sendError) {
    console.error("[stripe/webhook] otp send failed", sendError);
    return NextResponse.json({ error: "OTP send failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};

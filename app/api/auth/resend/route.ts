import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!stripeSecret || !appUrl || !supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }

  let payload: { sessionId?: string } | null = null;
  try {
    payload = (await req.json()) as { sessionId?: string };
  } catch {
    payload = null;
  }
  const sessionId = payload?.sessionId?.trim() ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
  let email =
    "";
  let returnTo = "/dashboard";

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "customer_details"],
    });
    email =
      session.customer_details?.email ??
      session.customer_email ??
      "";
    returnTo = getSafeReturnTo(session.metadata?.return_to);

    if (!email && typeof session.customer === "string") {
      const customer = await stripe.customers.retrieve(session.customer);
      if (!("deleted" in customer)) {
        email = customer.email ?? "";
      }
    }
  } catch {
    return NextResponse.json({ error: "Unable to load session" }, { status: 500 });
  }

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 404 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
        returnTo,
      )}`,
    },
  });
  if (error) {
    return NextResponse.json({ error: "Unable to send link" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};

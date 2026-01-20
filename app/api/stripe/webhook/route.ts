import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const getStripe = () => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return null;
  }
  return new Stripe(secret, { apiVersion: "2024-04-10" });
};

export const POST = async (req: Request) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Missing config" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const payload = await req.text();
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Missing Supabase admin" }, { status: 500 });
  }

  const getCustomerEmail = async (customerId: string | null) => {
    if (!customerId) {
      return null;
    }
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (
        typeof customer === "object" &&
        "email" in customer &&
        customer.email
      ) {
        return customer.email;
      }
    } catch {
      return null;
    }
    return null;
  };

  const upsertBillingCustomer = async ({
    email,
    customerId,
    subscription,
    status,
  }: {
    email: string;
    customerId: string | null;
    subscription: Stripe.Subscription | null;
    status: string;
  }) => {
    await admin
      .from("billing_customers")
      .upsert({
        email,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription?.id ?? null,
        status,
        price_id: subscription?.items.data[0]?.price?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .select();
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email =
      session.customer_details?.email ?? session.customer_email ?? null;
    const customerId = session.customer as string | null;
    const subscriptionId = session.subscription as string | null;
    let subscription: Stripe.Subscription | null = null;
    if (subscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch {
        subscription = null;
      }
    }
    if (email) {
      await upsertBillingCustomer({
        email,
        customerId,
        subscription,
        status: subscription?.status ?? "active",
      });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const email = await getCustomerEmail(customerId);
    if (email) {
      await upsertBillingCustomer({
        email,
        customerId,
        subscription,
        status: subscription.status,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const email = await getCustomerEmail(customerId);
    if (email) {
      await upsertBillingCustomer({
        email,
        customerId,
        subscription,
        status: subscription.status ?? "canceled",
      });
    }
  }

  return NextResponse.json({ received: true });
};

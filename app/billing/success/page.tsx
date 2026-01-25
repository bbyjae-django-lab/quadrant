import { Suspense } from "react";
import Stripe from "stripe";

import SuccessClient from "./SuccessClient";

type BillingSuccessPageProps = {
  searchParams?: { session_id?: string | string[] };
};

export default async function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const rawSessionId = searchParams?.session_id;
  const sessionId = typeof rawSessionId === "string" ? rawSessionId : "";
  let emailFromSession = "";

  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-04-10",
      });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      emailFromSession =
        session.customer_details?.email ?? session.customer_email ?? "";
    } catch {
      emailFromSession = "";
    }
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <SuccessClient initialEmail={emailFromSession} />
    </Suspense>
  );
}

export const runtime = "nodejs";

import Stripe from "stripe";
import SuccessClient from "./SuccessClient";

type BillingSuccessPageProps = {
searchParams?: { session_id?: string | string[] };
};

export default async function BillingSuccessPage({ searchParams }: BillingSuccessPageProps) {
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
session.customer_details?.email ??
session.customer_email ??
"";

// Fallback: fetch Customer email if session doesn’t include it
if (!emailFromSession && typeof session.customer === "string") {
const customer = await stripe.customers.retrieve(session.customer);
if (typeof customer !== "string") {
emailFromSession = customer.email ?? "";
}
}
} catch (e) {
// Keep empty, but don’t pretend it succeeded.
emailFromSession = "";
}
}

return <SuccessClient initialEmail={emailFromSession} />;
}

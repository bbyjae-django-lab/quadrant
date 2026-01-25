import Stripe from "stripe";
import SuccessClient from "./SuccessClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BillingSuccessPageProps = {
searchParams?: { session_id?: string | string[] };
};

export default async function BillingSuccessPage({
searchParams,
}: BillingSuccessPageProps) {
const raw = searchParams?.session_id;
const sessionId = typeof raw === "string" ? raw : "";

let email = "";

if (sessionId && process.env.STRIPE_SECRET_KEY) {
try {
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
apiVersion: "2024-04-10",
});

const session = await stripe.checkout.sessions.retrieve(sessionId, {
expand: ["customer", "customer_details"],
});

email =
session.customer_details?.email ??
session.customer_email ??
"";

// If still empty, try pulling from the Customer object
if (!email) {
const cust = session.customer;

// Expanded customer object
if (cust && typeof cust === "object" && "email" in cust) {
email = (cust.email ?? "") as string;
}

// Customer ID string (not expanded)
if (!email && typeof cust === "string") {
const customerRes = await stripe.customers.retrieve(cust);
const customer = customerRes; // Stripe.Response<...>

// Narrow away DeletedCustomer safely
if (customer && typeof customer === "object" && "deleted" in customer) {
// deleted customer has no email
email = "";
} else {
// customer is Stripe.Customer here
email = (customer as Stripe.Customer).email ?? "";
}
}
}
} catch (e) {
console.error("[billing/success] failed to resolve email", {
sessionId,
error: e,
});
email = "";
}
}

return <SuccessClient initialEmail={email} />;
}

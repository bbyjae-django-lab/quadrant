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

  console.log("[billing/success] session_id =", sessionId);

  let email = "";

  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-04-10",
      });

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer", "customer_details"],
      });

      console.log(
        "[billing/success] session.customer_details?.email =",
        session.customer_details?.email,
      );
      console.log(
        "[billing/success] session.customer_email =",
        session.customer_email,
      );
      console.log("[billing/success] session.customer =", session.customer);

      email =
        session.customer_details?.email ??
        session.customer_email ??
        "";

      if (!email && typeof session.customer === "string") {
        const customer = await stripe.customers.retrieve(session.customer);

        if (!("deleted" in customer) || customer.deleted === false) {
          email = (customer as Stripe.Customer).email ?? "";
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

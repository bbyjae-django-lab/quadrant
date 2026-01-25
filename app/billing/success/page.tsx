import { Suspense } from "react";

import SuccessClient from "./SuccessClient";

type BillingSuccessPageProps = {
  searchParams?: { email?: string | string[] };
};

export default function BillingSuccessPage({ searchParams }: BillingSuccessPageProps) {
  const rawEmail = searchParams?.email;
  const emailFromQuery = typeof rawEmail === "string" ? rawEmail : "";

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <SuccessClient initialEmail={emailFromQuery ?? ""} />
    </Suspense>
  );
}

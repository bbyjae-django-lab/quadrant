import { Suspense } from "react";

import SuccessClient from "./SuccessClient";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}

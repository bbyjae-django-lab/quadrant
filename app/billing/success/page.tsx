"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?upgraded=1");
  }, [router]);

  return <div className="p-6 text-sm text-zinc-500">Payment confirmed…</div>;
}

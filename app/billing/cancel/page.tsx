"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BillingCancelPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pricing?canceled=1");
  }, [router]);

  return <div className="p-6 text-sm text-zinc-500">Checkout cancelled.</div>;
}

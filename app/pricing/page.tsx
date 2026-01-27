import { Suspense } from "react";
import PricingClient from "./PricingClient";

type PricingPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function PricingPage({ searchParams }: PricingPageProps) {
  const from = searchParams?.from;
  const backHref = from === "run-ended" ? "/dashboard" : "/";
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <PricingClient backHref={backHref} />
    </Suspense>
  );
}

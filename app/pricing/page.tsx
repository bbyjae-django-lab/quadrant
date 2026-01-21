import PricingClient from "./PricingClient";

type PricingPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function PricingPage({ searchParams }: PricingPageProps) {
  const from = searchParams?.from;
  const backHref = from === "dashboard" ? "/dashboard" : "/";
  return <PricingClient backHref={backHref} />;
}

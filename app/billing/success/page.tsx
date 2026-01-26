import SuccessClient from "./SuccessClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BillingSuccessPageProps = {
  searchParams?: { session_id?: string | string[] };
};

export default function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const raw = searchParams?.session_id;
  const sessionId = typeof raw === "string" ? raw : "";

  return <SuccessClient sessionId={sessionId} />;
}

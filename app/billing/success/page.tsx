import SuccessClient from "./SuccessClient";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type BillingSuccessPageProps = {
  searchParams?: { session_id?: string | string[] };
};

export default function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  cookies();
  const raw = searchParams?.session_id;
  const sessionId = typeof raw === "string" ? raw : "";
  const debug = JSON.stringify(searchParams ?? {});

  return <SuccessClient sessionId={sessionId} debug={debug} />;
}

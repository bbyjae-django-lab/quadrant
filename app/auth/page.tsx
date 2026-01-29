import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthPageProps = {
  searchParams?: { next?: string | string[]; returnTo?: string | string[] };
};

const getSafeReturnTo = (raw: string | string[] | undefined) => {
const value = Array.isArray(raw) ? raw[0] : raw;
if (typeof value !== "string" || !value) return null;

// Try raw first
const candidateRaw = value;

// Try decoded as well (handles %2Fdashboard%3FendRun%3D1)
let candidateDecoded = value;
try {
candidateDecoded = decodeURIComponent(value);
} catch {
// ignore decode errors; fall back to raw
}

const isSafe = (v: string) => v.startsWith("/") && !v.startsWith("//");

if (isSafe(candidateRaw)) return candidateRaw;
if (isSafe(candidateDecoded)) return candidateDecoded;

return null;
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const safeNext = getSafeReturnTo(searchParams?.next);
  const safeReturnTo = getSafeReturnTo(searchParams?.returnTo);
  const next = safeNext ?? safeReturnTo ?? "/dashboard";
  return <AuthClient next={next} />;
}

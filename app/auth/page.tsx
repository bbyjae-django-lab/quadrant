import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthPageProps = {
  searchParams?: { next?: string | string[]; returnTo?: string | string[] };
};

const getSafeReturnTo = (raw: string | string[] | undefined) => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return null;
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const safeNext = getSafeReturnTo(searchParams?.next);
  const safeReturnTo = getSafeReturnTo(searchParams?.returnTo);
  const next = safeNext ?? safeReturnTo ?? "/dashboard";
  return <AuthClient next={next} />;
}

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
  return "/dashboard";
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const raw = searchParams?.next ?? searchParams?.returnTo;
  const next = getSafeReturnTo(raw);
  return <AuthClient next={next} />;
}

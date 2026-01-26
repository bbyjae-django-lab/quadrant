import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthPageProps = {
  searchParams?: { returnTo?: string | string[] };
};

const getSafeReturnTo = (value: string | string[] | undefined) => {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const returnTo = getSafeReturnTo(searchParams?.returnTo);
  return <AuthClient returnTo={returnTo} />;
}

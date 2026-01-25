import AuthClient from "./AuthClient";

type AuthPageProps = {
  searchParams?: {
    returnTo?: string;
  };
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const returnTo = searchParams?.returnTo ?? "/dashboard";
  return <AuthClient returnTo={returnTo} />;
}

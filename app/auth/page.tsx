"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthModal from "../components/modals/AuthModal";

const getSafeReturnTo = (value: string | null) => {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
};

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    sessionStorage.setItem("quadrant_return_to", returnTo);
  }, [returnTo]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(returnTo);
  };

  return <AuthModal onClose={handleClose} />;
}

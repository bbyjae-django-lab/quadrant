"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthModal from "../components/modals/AuthModal";

type AuthClientProps = {
  returnTo: string;
};

export default function AuthClient({ returnTo }: AuthClientProps) {
  const router = useRouter();

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

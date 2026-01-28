"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AuthModal from "../components/modals/AuthModal";

type AuthClientProps = {
  next: string;
};

export default function AuthClient({ next }: AuthClientProps) {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem("quadrant_return_to", next);
  }, [next]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(next);
  };

  return <AuthModal onClose={handleClose} />;
}

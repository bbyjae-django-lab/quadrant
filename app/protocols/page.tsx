"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QuadrantApp from "../components/QuadrantApp";
import { QUADRANT_LOCAL_ACTIVE_RUN } from "@/lib/keys";

export const dynamic = "force-dynamic";

export default function ProtocolsPage() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = localStorage.getItem(QUADRANT_LOCAL_ACTIVE_RUN);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        status?: string;
        runId?: string;
        protocolId?: string;
      };
      if (parsed.status === "active" && parsed.runId && parsed.protocolId) {
        setRedirecting(true);
        router.replace("/dashboard");
      }
    } catch {
      return;
    }
  }, [router]);

  if (redirecting) {
    return <div className="p-6 text-sm text-zinc-500">Loading…</div>;
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <QuadrantApp view="protocols" />
    </Suspense>
  );
}

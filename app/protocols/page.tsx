import { Suspense } from "react";

import QuadrantApp from "../components/QuadrantApp";

export const dynamic = "force-dynamic";

export default function ProtocolsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <QuadrantApp view="protocols" />
    </Suspense>
  );
}

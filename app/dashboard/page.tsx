import { Suspense } from "react";

import QuadrantApp from "../components/QuadrantApp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <QuadrantApp view="dashboard" />
    </Suspense>
  );
}

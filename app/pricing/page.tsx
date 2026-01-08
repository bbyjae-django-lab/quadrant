"use client";

const PRO_PRICE = 19;

export default function PricingPage() {
  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span>Pricing</span>
          <button
            type="button"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            onClick={handleBack}
          >
            Back to dashboard
          </button>
        </div>
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pricing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
            Fix the behaviour that’s costing you money.
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            PRO = ${PRO_PRICE}/month
          </p>
          <p className="max-w-2xl text-lg leading-7 text-zinc-600">
            Quadrant helps traders identify recurring behavioural patterns and
            enforce one corrective protocol at a time.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-900">Free</h2>
              <p className="text-sm text-zinc-500">Forever</p>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-zinc-700">
              <li>One active protocol</li>
              <li>Daily check-in</li>
              <li>7-day history</li>
            </ul>
          </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-sm">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Pro</h2>
                <p className="text-sm text-zinc-300">${PRO_PRICE}/month</p>
              </div>
            <ul className="mt-6 space-y-2 text-sm text-zinc-100">
              <li>Full protocol library</li>
              <li>Run & streak tracking</li>
              <li>Search-based problem matching</li>
              <li>Future: multiple protocols, insights</li>
            </ul>
            <p className="mt-4 text-xs text-zinc-300">
              Upgrades save your runs across devices.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-5">
          <p className="text-sm font-semibold text-zinc-700">
            Start with one problem.
          </p>
          <button
            type="button"
            className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
            onClick={handleBack}
          >
            Start with one problem.
          </button>
        </section>
      </main>
    </div>
  );
}

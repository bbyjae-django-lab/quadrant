"use client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-zinc-900">
            About Quadrant
          </h1>
        </header>

        <section className="border-b border-[var(--border-color)] pb-[var(--space-8)]">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            What this system is
          </h2>
          <div className="mt-4 space-y-4 text-base leading-7 text-zinc-700">
            <p>Quadrant is a behavioural enforcement system.</p>
            <p>
              It exists for traders who already know the rules — and don’t
              reliably follow them.
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>It does not teach.</li>
              <li>It does not explain.</li>
              <li>It does not motivate.</li>
              <li>It does not soften outcomes.</li>
            </ul>
            <div className="space-y-2">
              <p>You select a single protocol.</p>
              <p>You check in once per day.</p>
              <p>If the rule is violated, the run ends.</p>
            </div>
            <p>The system records what actually happens.</p>
          </div>
        </section>

        <section className="border-b border-[var(--border-color)] pb-[var(--space-8)]">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            What Quadrant is not
          </h2>
          <div className="mt-4 space-y-4 text-base leading-7 text-zinc-700">
            <ul className="ml-4 list-disc space-y-2">
              <li>Quadrant is not a journal.</li>
              <li>It is not a coach.</li>
              <li>It is not therapy.</li>
              <li>It is not accountability through encouragement.</li>
              <li>There is no reflection step.</li>
              <li>There is no reframing.</li>
              <li>There is no interpretation of intent.</li>
              <li>Behaviour is either aligned — or it isn’t.</li>
            </ul>
          </div>
        </section>

        <section className="border-b border-[var(--border-color)] pb-[var(--space-8)]">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            Why it’s built this way
          </h2>
          <div className="mt-4 space-y-4 text-base leading-7 text-zinc-700">
            <p>Most trading errors are not caused by a lack of knowledge.</p>
            <p>They are caused by reflex:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>checking lower timeframes</li>
              <li>re-entering after exit</li>
              <li>adjusting size mid-trade</li>
              <li>trading outside declared conditions</li>
            </ul>
            <div className="space-y-2">
              <p>These behaviours happen quickly.</p>
              <p>They are justified later.</p>
              <p>Quadrant removes the justification layer.</p>
            </div>
            <div className="space-y-2">
              <p>When a rule breaks, the run ends.</p>
              <p>No debate.</p>
              <p>No context.</p>
              <p>No exceptions.</p>
            </div>
            <p>Over time, patterns become impossible to ignore.</p>
          </div>
        </section>

        <section className="border-b border-[var(--border-color)] pb-[var(--space-8)]">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            Free vs Pro (re-grounding, not selling)
          </h2>
          <div className="mt-4 space-y-2 text-base leading-7 text-zinc-700">
            <p>Free enforces behaviour.</p>
            <p>Pro remembers it.</p>
            <p>Free allows unlimited runs, but nothing persists.</p>
            <p>Each run is disposable.</p>
            <p>Failure leaves no trace.</p>
            <p>Pro preserves behavioural evidence.</p>
            <p>Runs accumulate.</p>
            <p>Patterns surface.</p>
            <p>Avoidance stops working.</p>
            <p>The behaviour doesn’t change because of insight.</p>
            <p>It changes because exposure compounds.</p>
          </div>
        </section>

        <section className="border-b border-[var(--border-color)] pb-[var(--space-8)]">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            On control and responsibility
          </h2>
          <div className="mt-4 space-y-2 text-base leading-7 text-zinc-700">
            <p>Quadrant assumes you are capable.</p>
            <p>If a rule is violated, the system does not ask why.</p>
            <p>It records that it happened.</p>
            <p>Responsibility is not negotiated.</p>
            <p>Outcomes are not adjusted.</p>
            <p>The record stands.</p>
          </div>
        </section>

        <div className="pt-2">
          <a
            href="/dashboard"
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-700"
          >
            Return to active run
          </a>
        </div>
      </main>
    </div>
  );
}

"use client";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900">
            About Quadrant
          </h1>
        </header>

        <section className="space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            What this system is
          </h2>
          <p>Quadrant is a behavioural enforcement system.</p>
          <p>
            It exists for traders who already know the rules — and don’t
            reliably follow them.
          </p>
          <p>It does not teach.</p>
          <p>It does not explain.</p>
          <p>It does not motivate.</p>
          <p>It does not soften outcomes.</p>
          <p>You select a single protocol.</p>
          <p>You check in once per day.</p>
          <p>If the rule is violated, the run ends.</p>
          <p>The system records what actually happens.</p>
        </section>

        <section className="space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            What Quadrant is not
          </h2>
          <p>Quadrant is not a journal.</p>
          <p>It is not a coach.</p>
          <p>It is not therapy.</p>
          <p>It is not accountability through encouragement.</p>
          <p>There is no reflection step.</p>
          <p>There is no reframing.</p>
          <p>There is no interpretation of intent.</p>
          <p>Behaviour is either aligned — or it isn’t.</p>
        </section>

        <section className="space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            Why it’s built this way
          </h2>
          <p>Most trading errors are not caused by a lack of knowledge.</p>
          <p>They are caused by reflex:</p>
          <p>checking lower timeframes</p>
          <p>re-entering after exit</p>
          <p>adjusting size mid-trade</p>
          <p>trading outside declared conditions</p>
          <p>These behaviours happen quickly.</p>
          <p>They are justified later.</p>
          <p>Quadrant removes the justification layer.</p>
          <p>When a rule breaks, the run ends.</p>
          <p>No debate.</p>
          <p>No context.</p>
          <p>No exceptions.</p>
          <p>Over time, patterns become impossible to ignore.</p>
        </section>

        <section className="space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            Free vs Pro (re-grounding, not selling)
          </h2>
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
        </section>

        <section className="space-y-4 text-sm leading-7 text-zinc-700">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
            On control and responsibility
          </h2>
          <p>Quadrant assumes you are capable.</p>
          <p>If a rule is violated, the system does not ask why.</p>
          <p>It records that it happened.</p>
          <p>Responsibility is not negotiated.</p>
          <p>Outcomes are not adjusted.</p>
          <p>The record stands.</p>
        </section>

        <div>
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

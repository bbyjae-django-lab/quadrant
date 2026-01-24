import Link from "next/link";

import { PROTOCOLS } from "@/lib/protocols";

export default function ProtocolsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-[var(--space-8)] ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <div className="flex items-center justify-between text-sm font-medium text-zinc-500">
          <span />
          <a href="/about" className="btn-tertiary">
            About Quadrant
          </a>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Choose one constraint.
        </h1>
        <ul className="space-y-2">
          {PROTOCOLS.map((protocol) => (
            <li key={protocol.id}>
              <Link
                href={`/protocols/${protocol.id}`}
                className="block rounded-[var(--radius-card)] border border-[var(--border-color)] bg-white px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                {protocol.name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

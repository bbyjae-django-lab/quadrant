"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PROTOCOLS } from "@/lib/protocols";
import { LocalRunStore } from "@/lib/stores/localRunStore";
import { SupabaseRunStore } from "@/lib/stores/supabaseRunStore";
import type { Protocol } from "@/lib/types";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ProtocolDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthed, authLoading } = useAuth();
  const [hydrating, setHydrating] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const protocolId = typeof params?.id === "string" ? params.id : "";
  const protocol = useMemo(
    () => PROTOCOLS.find((item) => item.id === protocolId) ?? null,
    [protocolId],
  );

  const store = useMemo(() => {
    if (isAuthed && user?.id) {
      return new SupabaseRunStore(user.id);
    }
    return new LocalRunStore();
  }, [isAuthed, user?.id]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    let active = true;
    setHydrating(true);
    store
      .hydrate()
      .then(() => {
        if (!active) {
          return;
        }
        if (store.getActiveRun()) {
          router.replace("/dashboard");
          return;
        }
        setHydrating(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setHydrating(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, router, store]);

  const handleStartRun = async (selected: Protocol) => {
    if (hydrating || isStarting) {
      return;
    }
    setError("");
    setIsStarting(true);
    try {
      await store.startRun(selected);
      router.replace("/dashboard");
    } catch {
      setError("Unable to start run.");
      setIsStarting(false);
    }
  };

  if (!protocol) {
    return (
      <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Protocol not found
          </h1>
          <a href="/protocols" className="btn-tertiary text-sm">
            Back
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-[var(--space-6)] py-[var(--space-16)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 ui-surface p-[var(--space-8)] sm:p-[var(--space-10)]">
        <a href="/protocols" className="text-xs text-zinc-400">
          Back
        </a>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {protocol.name}
        </h1>
        <div className="text-sm text-zinc-700">
          <div className="text-xs font-semibold tracking-wide text-zinc-500">
            Constraint:
          </div>
          <div className="mt-1">{protocol.rule}</div>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-primary text-sm"
            onClick={() => handleStartRun(protocol)}
            disabled={hydrating || isStarting}
          >
            {isStarting ? "Starting…" : "Start run"}
          </button>
        </div>
        {error ? <p className="text-xs text-zinc-500">{error}</p> : null}
      </main>
    </div>
  );
}

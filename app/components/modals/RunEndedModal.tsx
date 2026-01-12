"use client";

import type { RunEndContext, RunEndCopy } from "../../types";

type RunEndedModalProps = {
  runEndCopy: RunEndCopy;
  runEndContext: RunEndContext;
  historyStrip: string[];
  onPrimaryAction: () => void;
  onClose: () => void;
};

export default function RunEndedModal({
  runEndCopy,
  runEndContext,
  historyStrip,
  onPrimaryAction,
  onClose,
}: RunEndedModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 px-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-zinc-900">
              {runEndCopy.title}
            </h2>
            <p className="text-sm text-zinc-700">
              {runEndCopy.outcomePrefix}
              <strong className="font-semibold text-zinc-900">
                {runEndCopy.outcomeHighlight}
              </strong>
              {runEndCopy.outcomeSuffix}
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-zinc-400 transition hover:text-zinc-600"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="h-4" />
        <div className="space-y-2 text-sm text-zinc-700">
          {runEndCopy.reframeLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="mt-6">
          <div className="text-xs font-semibold tracking-wide text-zinc-500">
            This run
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {historyStrip.map((symbol, index) => (
              <div
                key={`run-end-strip-${index}`}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                  symbol === "✕"
                    ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                    : symbol === "✓"
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600"
                }`}
              >
                {symbol}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <div>
            <button
              type="button"
              className="rounded-full bg-zinc-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
              onClick={onPrimaryAction}
            >
              {runEndCopy.primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

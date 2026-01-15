"use client";

import { useEffect, useRef } from "react";
import type { RunEndContext, RunEndCopy } from "../../types";

type RunEndedModalProps = {
  runEndCopy: RunEndCopy;
  runEndContext: RunEndContext;
  historyStrip: string[];
  primaryLabel: string;
  showFreeNotice?: boolean;
  freeActionLabel?: string;
  showCloseButton?: boolean;
  onUpgradeClick?: () => void;
  onPrimaryAction: () => void;
  onClose: () => void;
};

export default function RunEndedModal({
  runEndCopy,
  runEndContext,
  historyStrip,
  primaryLabel,
  showFreeNotice = false,
  freeActionLabel = "See pricing",
  showCloseButton = true,
  onUpgradeClick,
  onPrimaryAction,
  onClose,
}: RunEndedModalProps) {
  const hasOutcomeHighlight =
    runEndCopy.outcomeHighlight.trim().length > 0 ||
    runEndCopy.outcomeSuffix.trim().length > 0;
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) {
      return;
    }
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(
      modal.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((el) => !el.hasAttribute("disabled"));
    focusables[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/90 px-[var(--space-6)] backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl ui-modal p-[var(--space-8)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-zinc-900">
              {runEndCopy.title}
            </h2>
            {hasOutcomeHighlight ? (
              <p className="text-sm text-zinc-700">
                {runEndCopy.outcomePrefix}
                <strong className="font-semibold text-zinc-900">
                  {runEndCopy.outcomeHighlight}
                </strong>
                {runEndCopy.outcomeSuffix}
              </p>
            ) : (
              <p className="text-sm text-zinc-700">
                {runEndCopy.outcomePrefix}
              </p>
            )}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              className="btn-tertiary"
              aria-label="Close"
              onClick={onClose}
            >
              ✕
            </button>
          ) : null}
        </div>
        <div className="h-[var(--space-4)]" />
        <div className="space-y-2 text-sm text-zinc-700">
          {runEndCopy.reframeLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="ui-inset mt-4 p-[var(--space-4)]">
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
                      : "border-zinc-300 bg-zinc-50 text-zinc-500"
                }`}
              >
                {symbol}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onPrimaryAction}
            >
              {primaryLabel}
            </button>
          </div>
          {showFreeNotice ? (
            <div className="text-xs text-zinc-500">
              <p>This run won’t be saved.</p>
              <button
                type="button"
                className="btn-tertiary mt-2"
                onClick={onUpgradeClick}
              >
                {freeActionLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

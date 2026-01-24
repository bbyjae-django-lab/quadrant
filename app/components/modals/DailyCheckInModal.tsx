"use client";

import { useEffect, useRef } from "react";

type DailyCheckInModalProps = {
  checkInNote: string;
  onChangeNote: (note: string) => void;
  onClose: () => void;
  onCleanSession: () => void;
  onViolated: () => void;
};

export default function DailyCheckInModal({
  checkInNote,
  onChangeNote,
  onClose,
  onCleanSession,
  onViolated,
}: DailyCheckInModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-[var(--space-6)]">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        data-quadrant-modal
        className="w-full max-w-lg ui-modal p-[var(--space-6)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900">
            Did you violate the protocol this session?
          </h2>
          <button
            type="button"
            className="btn-tertiary"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="check-in-note"
              className="text-sm font-semibold text-zinc-800"
            >
              Note (optional)
            </label>
            <textarea
              id="check-in-note"
              value={checkInNote}
              onChange={(event) => onChangeNote(event.target.value)}
              placeholder="One sentence is enough."
              className="min-h-[88px] w-full rounded-[var(--radius-card)] border border-[var(--border-color)] p-[var(--space-3)] text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary text-sm"
              onClick={onCleanSession}
            >
              Clean
            </button>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              onClick={onViolated}
            >
              Violated
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

type ObservedBehaviour = {
  id: string;
  label: string;
};

type DailyCheckInModalProps = {
  checkInNote: string;
  onChangeNote: (note: string) => void;
  onClose: () => void;
  onCleanDay: () => void;
  onViolated: () => void;
  isPro: boolean;
  availableObservedBehaviours: ObservedBehaviour[];
  observedBehaviourLogSelection: string[];
  setObservedBehaviourLogSelection: Dispatch<SetStateAction<string[]>>;
  maxObservedBehaviours: number;
};

export default function DailyCheckInModal({
  checkInNote,
  onChangeNote,
  onClose,
  onCleanDay,
  onViolated,
  isPro,
  availableObservedBehaviours,
  observedBehaviourLogSelection,
  setObservedBehaviourLogSelection,
  maxObservedBehaviours,
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
        className="w-full max-w-lg ui-modal p-[var(--space-6)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-zinc-500">
              Daily check-in
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              Did you break the protocol today?
            </h2>
          </div>
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
              Notes (optional)
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
              onClick={onCleanDay}
            >
              No
            </button>
            <button
              type="button"
              className="btn btn-secondary text-sm"
              onClick={onViolated}
            >
              Yes
            </button>
          </div>
          {isPro && availableObservedBehaviours.length > 0 ? (
            <div className="ui-inset p-[var(--space-4)]">
              <div className="text-sm font-semibold text-zinc-900">
                Did any of these occur today?
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Optional — tracked for insight only
              </p>
              <div className="mt-3 space-y-2">
                {availableObservedBehaviours.map((behaviour) => {
                  const isChecked =
                    observedBehaviourLogSelection.includes(behaviour.id);
                  return (
                    <label
                      key={behaviour.id}
                      className="flex items-start gap-3 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setObservedBehaviourLogSelection((prev) =>
                              prev.filter((id) => id !== behaviour.id),
                            );
                            return;
                          }
                          if (
                            observedBehaviourLogSelection.length >=
                            maxObservedBehaviours
                          ) {
                            return;
                          }
                          setObservedBehaviourLogSelection((prev) => [
                            ...prev,
                            behaviour.id,
                          ]);
                        }}
                      />
                      <span className="font-semibold text-zinc-900">
                        {behaviour.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

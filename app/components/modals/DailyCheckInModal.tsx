"use client";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-zinc-500">
              Daily check-in
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              Did you violate the protocol today?
            </h2>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-6 space-y-6">
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
              className="min-h-[88px] w-full rounded-xl border border-zinc-200 p-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              onClick={onCleanDay}
            >
              No — clean day
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              onClick={onViolated}
            >
              Yes — violated
            </button>
          </div>
          {isPro && availableObservedBehaviours.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
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

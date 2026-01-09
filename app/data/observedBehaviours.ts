export const observedBehaviours = [
  {
    id: "reenter_after_exit",
    label: "Re-entering after exit",
    description:
      "Taking a second trade on the same ticker after closing or stopping out.",
    violationRule:
      "Any additional entry on the same ticker after an exit or stop-out is recorded as a re-entry.",
  },
  {
    id: "overtrading_after_results",
    label: "Overtrading after early results",
    description:
      "Increasing trade frequency or taking lower-quality setups after early wins or losses.",
    violationRule:
      "Exceeding the trader’s declared session trade limit, or entering trades outside the planned setup criteria after the first result of the session.",
  },
  {
    id: "drop_timeframes_pressure",
    label: "Dropping time frames under pressure",
    description:
      "Checking or acting on lower time frames while a trade is active or stressed.",
    violationRule:
      "Opening or referencing any lower time frame than the execution time frame during an active position.",
  },
  {
    id: "hesitate_at_trigger",
    label: "Hesitating at trigger",
    description:
      "Delaying or second-guessing execution when a predefined entry trigger occurs.",
    violationRule:
      "Failing to enter on the trigger bar after the predefined entry condition is met.",
  },
  {
    id: "move_stops_emotionally",
    label: "Moving stops emotionally",
    description: "Adjusting stop levels to avoid loss or discomfort.",
    violationRule:
      "Any stop adjustment that increases risk or delays the predefined exit beyond the original stop.",
  },
  {
    id: "trade_outside_session",
    label: "Trading outside planned session",
    description: "Entering trades outside the declared session window.",
    violationRule:
      "Any trade entered before the declared session start or after the declared session end.",
  },
] as const;

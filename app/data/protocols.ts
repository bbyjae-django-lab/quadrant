export type Protocol = {
      id: string;
      name: string;
      commonBehaviourRemoved: string;
      rule: string;
      duration: string;
      failure: string;
    };

export const protocols: Protocol[] = [
  {
    "id": "post-entry-information-restriction",
    "name": "Protocol: Post-entry time frame lock",
    "commonBehaviourRemoved": "Dropping to lower time frames after entry to manage, validate, or micro-steer the trade.",
    "rule": "After entry, no lower time frame charts may be opened or viewed for that ticker until the position is fully closed.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Opening or viewing any lower time frame chart for an open position's ticker after entry ends the run."
  },
  {
    "id": "risk-and-size-immutability",
    "name": "Protocol: In-trade parameter lock",
    "commonBehaviourRemoved": "Altering any trade parameter after entry, including size, stop, target, or exit logic, to manage discomfort or influence outcome.",
    "rule": "Before entry, position size, stop level, and all exit conditions must be fully defined. After entry, no trade parameter may be changed for any reason.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Any change to position size (adds or reductions), stop level, target, trailing logic, partial rules, or exit conditions after entry ends the run."
  },
  {
    "id": "single-attempt-participation",
    "name": "Protocol: Single attempt per ticker per session",
    "commonBehaviourRemoved": "Re-engaging the same ticker after exit, stop-out, or missed move to \"get it back\" or chase.",
    "rule": "A ticker may be traded once per session: one entry attempt total, regardless of outcome.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Any second entry on the same ticker in the same session ends the run."
  },
  {
    "id": "trade-count-and-exposure-cap",
    "name": "Protocol: Trade count and exposure cap",
    "commonBehaviourRemoved": "Overtrading and overexposure (too many entries or too many simultaneous positions), often after early wins or losses.",
    "rule": "Before the session, declare (1) maximum total entries for the session and (2) maximum concurrent open positions. Neither limit may be exceeded.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Placing an entry that exceeds either declared maximum (total entries or concurrent positions) ends the run."
  },
  {
    "id": "regime-participation-filter",
    "name": "Protocol: Market regime filter",
    "commonBehaviourRemoved": "Trading without explicit market regime alignment, defaulting into trades without confirming conditions are favourable.",
    "rule": "Before the session begins, the market regime must be classified as either risk-on or risk-off. Trades are permitted only on days recorded as risk-on.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Entering any trade without a pre-session recorded regime classification, or entering any trade on a day classified as risk-off, ends the run."
  },
  {
    "id": "entry-trigger-lock",
    "name": "Protocol: Trigger execute-or-forfeit",
    "commonBehaviourRemoved": "Hesitating, re-optimising, or modifying execution once the trigger is hit.",
    "rule": "If a predefined entry trigger occurs, the order must be placed immediately, or the trade is permanently forfeited for that ticker for the rest of the session.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Entering on any bar after the trigger bar, adjusting price to \"improve entry,\" or hesitating in a way that results in a late entry ends the run."
  },
  {
    "id": "strategy-singularity-constraint",
    "name": "Protocol: Strategy singularity constraint",
    "commonBehaviourRemoved": "Switching, mixing, or opportunistically sampling multiple strategies within the same session.",
    "rule": "Before the session, declare one strategy. All trades that session must meet that strategy's criteria; no other strategy may be executed.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Executing any trade that does not meet the declared strategy's criteria ends the run."
  },
  {
    "id": "session-boundary-restriction",
    "name": "Protocol: Session boundary restriction",
    "commonBehaviourRemoved": "Trading outside declared session windows (late revenge trades, boredom trades).",
    "rule": "Before the day begins, declare session start and session end. Entries are permitted only within that window.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Entering any trade outside the declared session boundaries ends the run."
  }
];

    export const protocolById: Record<string, Protocol> = Object.fromEntries(
      protocols.map((protocol) => [protocol.id, protocol]),
    ) as Record<string, Protocol>;

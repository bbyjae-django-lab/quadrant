import type { Protocol } from "./types";

export const protocols: Protocol[] = [
  {
    id: "post-entry-time-frame-lock",
    name: "Post-entry time frame lock",
    rule:
      "After entry, no lower time frame charts may be opened or viewed for that ticker until the position is fully closed.",
    failure:
      "Opening or viewing any lower time frame chart for an open position’s ticker after entry ends the run.",
  },
  {
    id: "in-trade-parameter-lock",
    name: "In-trade parameter lock",
    rule:
      "Before entry, position size, stop level, and exit conditions must be fully defined; after entry, no trade parameter may be changed.",
    failure:
      "Any change to size, stop, target, trailing logic, partials, or exit rules after entry ends the run.",
  },
  {
    id: "single-attempt-per-ticker-per-session",
    name: "Single attempt per ticker per session",
    rule:
      "A ticker may be traded once per session: one entry attempt total, regardless of outcome.",
    failure:
      "Any second entry on the same ticker in the same session ends the run.",
  },
  {
    id: "trade-count-and-exposure-cap",
    name: "Trade count and exposure cap",
    rule:
      "Before the session, declare a maximum number of total entries and a maximum number of concurrent positions; neither may be exceeded.",
    failure: "Placing an entry that exceeds either declared maximum ends the run.",
  },
  {
    id: "market-phase-filter",
    name: "Market phase filter",
    rule:
      "Before the session begins, the market regime must be classified as risk-on or risk-off; trades are permitted only on risk-on days.",
    failure:
      "Entering any trade without a recorded regime classification, or trading on a risk-off day, ends the run.",
  },
  {
    id: "trigger-execute-or-forfeit",
    name: "Trigger execute-or-forfeit",
    rule:
      "If a predefined entry trigger occurs, the order must be placed immediately or the trade is forfeited for the session.",
    failure:
      "Entering after the trigger bar, adjusting price to improve entry, or hesitating into a late entry ends the run.",
  },
  {
    id: "strategy-singularity-constraint",
    name: "Strategy singularity constraint",
    rule:
      "Before the session, one strategy must be declared; all trades that session must meet that strategy’s criteria.",
    failure:
      "Executing any trade outside the declared strategy ends the run.",
  },
  {
    id: "session-boundary-restriction",
    name: "Session boundary restriction",
    rule:
      "Before the day begins, session start and end times must be declared; entries are permitted only within that window.",
    failure:
      "Entering any trade outside the declared session boundaries ends the run.",
  },
];

export const protocolById: Record<string, Protocol> = Object.fromEntries(
  protocols.map((protocol) => [protocol.id, protocol]),
) as Record<string, Protocol>;

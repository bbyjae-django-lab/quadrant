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
    "name": "Post-Entry Information Restriction",
    "commonBehaviourRemoved": "Monitoring additional information after entry",
    "rule": "After entering a trade, no chart lower than the entry timeframe may be viewed.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Viewing any lower timeframe chart after entry ends the run."
  },
  {
    "id": "single-attempt-participation",
    "name": "Single-Attempt Participation",
    "commonBehaviourRemoved": "Re-engaging the same idea after exit or miss",
    "rule": "Each trade idea may be attempted only once per session.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Entering a second trade on the same ticker in the same session ends the run."
  },
  {
    "id": "risk-and-size-immutability",
    "name": "Risk and Size Immutability",
    "commonBehaviourRemoved": "Modifying or avoiding predefined risk. Adjusting size based on fear or emotion",
    "rule": "Risk per trade and position size must be declared before entry and may not be changed.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Changing position size or stop distance after entry ends the run."
  },
  {
    "id": "trade-count-and-exposure-cap",
    "name": "Trade Count and Exposure Cap",
    "commonBehaviourRemoved": "Excess simultaneous positions or opportunities",
    "rule": "A maximum number of trades and open positions must be set pre-market and may not be exceeded.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Opening a trade beyond the declared trade count or exposure limit ends the run."
  },
  {
    "id": "regime-participation-filter",
    "name": "Regime Participation Filter",
    "commonBehaviourRemoved": "Trading without regime alignment",
    "rule": "Trades may only be taken if the current market regime is explicitly classified as favourable before the session.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Taking any trade without a pre-session regime classification ends the run."
  },
  {
    "id": "entry-trigger-lock",
    "name": "Entry Trigger Lock",
    "commonBehaviourRemoved": "Hesitating or altering execution at trigger",
    "rule": "Once a predefined entry trigger occurs, the trade must be executed immediately or abandoned entirely.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Delaying, adjusting, or second-guessing execution after the trigger occurs ends the run."
  },
  {
    "id": "exit-rule-immutability",
    "name": "Exit Rule Immutability",
    "commonBehaviourRemoved": "Deviating from predefined exit logic",
    "rule": "Exit rules must be defined before entry and may not be altered during the trade.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Changing stops, targets, or exit conditions after entry ends the run."
  },
  {
    "id": "strategy-singularity-constraint",
    "name": "Strategy Singularity Constraint",
    "commonBehaviourRemoved": "Switching or mixing strategies mid-cycle",
    "rule": "Only one trading strategy may be used per session.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Executing a trade from a second strategy within the same session ends the run."
  },
  {
    "id": "emotional-state-trading-ban",
    "name": "Emotional State Trading Ban",
    "commonBehaviourRemoved": "Executing trades under emotional impairment",
    "rule": "No trades may be taken while experiencing elevated emotional states.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Entering any trade after self-identifying an elevated emotional state ends the run."
  },
  {
    "id": "session-boundary-restriction",
    "name": "Session Boundary Restriction",
    "commonBehaviourRemoved": "Trading outside defined session structure",
    "rule": "Trades may only be taken during predefined trading sessions.",
    "duration": "Applies until 5 consecutive trading days are completed without violation.",
    "failure": "Entering a trade outside the declared session boundaries ends the run."
  }
];

    export const protocolById: Record<string, Protocol> = Object.fromEntries(
      protocols.map((protocol) => [protocol.id, protocol]),
    ) as Record<string, Protocol>;

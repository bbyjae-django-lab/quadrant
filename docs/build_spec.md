# Quadrant Build Spec

## 1) Product premise
Quadrant identifies the trader's problem and enforces a single corrective protocol.
Constraint-first execution replaces advice with strict rule adherence.
Progress is measured by consecutive compliant trading days, not outcomes.

## 2) Definitions
- Problem (problem index item): A canonical entry with id, raw phrases, normalized problem, error quadrant, and protocol_id.
- Protocol: A rule with fixed duration and explicit failure condition.
- Run: An active protocol attempt tracked across consecutive trading days.
- Check-in: A daily binary record (kept or broken).

## 3) Canonical user flow
A) Search path
1. User enters a problem statement.
2. System matches against raw phrases and selects the single best protocol.
3. User confirms, answers clarifiers, reviews protocol, activates.

B) Browse path
1. User browses protocols directly.
2. User selects one protocol, answers clarifiers, reviews protocol, activates.

If search has no match, user is routed to browse.

## 4) Paywall rules
Free:
- May complete one full run only.
- After completion or failure, must upgrade to start another run.

Paid:
- May run unlimited protocols sequentially.
- One active protocol at a time.

Paywall behavior:
- Triggered when free user attempts to start a second run.
- Message: first run is complete, offer upgrade to continue.
- No urgency, no discounts, no feature list.

## 5) State model (localStorage)
- activeProblemId: number | null; selected problem linked to active protocol.
- activeProtocolId: string | null; currently active protocol id.
- activatedAt: ISO timestamp when protocol was activated.
- clarifierAnswers: JSON map of clarifier responses.
- runStatus: "idle" | "active" | "failed" | "completed".
- runStartDate: YYYY-MM-DD start date of current run.
- streak: number of consecutive compliant trading days.
- checkIns: JSON map of date -> { followed: boolean, note?: string }.
- hasCompletedRun: boolean flag that a full run has completed (or failed) for free gating.
- quadrant_isPro: boolean flag for paid status.

## 6) Screens
- Step 1: Dashboard (active protocol summary, progress, check-in access).
- Step 2: Browse protocols list.
- Step 3: Clarifier questions.
- Step 4: Match context (problem details or protocol summary).
- Step 5: Protocol details (rule, duration, failure) + activate.
- Step 6: Daily check-in (kept/broken).
- Dashboard: Same as Step 1 when active; otherwise landing with search.
- Run Ended: Run complete or failed state with option to start another run (paywall if free).
- Pricing: Plan details and upgrade path.

## 7) Acceptance criteria checklist
- Problem Index only includes buckets with confirmed protocol assignment.
- Search matches raw phrases and returns one best protocol or none.
- No multiple matches, no explanations in the routing path.
- Run ends immediately on a violation.
- Run completion requires 5 consecutive compliant trading days.
- Free users may complete only one run; paid users may start unlimited runs sequentially.
- One active protocol at a time for all users.
- Paywall copy is neutral: no urgency, no discounts, no feature list.

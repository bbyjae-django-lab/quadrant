# Quadrant Build Spec

## 1) Product premise
Quadrant is a value-first protocol product, not a step-based wizard.
The core loop is: select one protocol → commit → daily binary check-in → run outcome → history.
Constraint-first execution replaces advice with strict rule adherence.
Progress is measured by consecutive compliant trading days, not outcomes.

## 2) Definitions
- Protocol: A rule with fixed duration and explicit failure condition.
- Run: A protocol attempt tracked across consecutive trading days.
- Check-in: A daily binary record (kept or broken).
- History: A list of completed runs with outcome and clean days.

## 3) Canonical user flow
1. User selects one protocol.
2. User commits to the protocol.
3. User completes a daily binary check-in.
4. Run ends on violation or completes after 5 clean days.
5. Run history persists and remains reviewable.

No diagnostics, no search-led onboarding, no multi-step wizard.

## 4) Routing
- / is a landing page.
- If an active run exists, route directly to /dashboard.
- /dashboard is the permanent home once any run exists.
- Never redirect users back into protocol selection after a run ends.

## 5) Paywall rules (Option A)
Free:
- One 5-day run total.
- After the free run ends (failure or completion), the completed run remains visible and persisted.
- "Run history (1)" is shown.
- Pro insight cards are visible but locked.
- Protocol library remains readable (twisties), but activation is gated.

Pro:
- Unlimited runs.
- Continuous tracking (run ends only on violation or manual end).
- Cross-device persistence.
- Pattern insights populate over time.

Paywall behavior:
- Triggered when a free user attempts to start a second run.
- Message: first run is complete, offer upgrade to continue.
- No urgency, no discounts, no feature list.

## 6) State model (localStorage)
- activeProtocolId: string | null; currently active protocol id.
- activatedAt: ISO timestamp when protocol was activated.
- runStatus: "idle" | "active" | "failed" | "completed" | "ended".
- runStartDate: YYYY-MM-DD start date of current run.
- streak: number of consecutive compliant trading days.
- checkIns: JSON map of date -> { followed: boolean, note?: string }.
- runHistory: JSON list of completed runs with outcome and clean days.
- hasCompletedRun: boolean flag that a run has completed (or failed) for free gating.
- quadrant_isPro: boolean flag for paid status.

## 7) Dashboard requirements
Always show:
- Active protocol (if any)
- Daily check-in CTA
- "This run" 5-slot strip
- Run history section

## 8) Screens
- Landing (/): marketing + entry point; route to /dashboard when a run exists.
- Dashboard (/dashboard): permanent home; protocol library, active run, history, insights.
- Run ended: calm, final state with run summary; no auto-redirect to selection.
- Pricing: plan details and upgrade path.

## 9) Acceptance criteria checklist
- Core loop is protocol → commit → check-in → outcome → history.
- No multi-step wizard, diagnostics, or search-led onboarding.
- / routes to /dashboard if an active run exists.
- /dashboard remains the home once any run exists.
- Run ends immediately on a violation.
- Run completion requires 5 consecutive compliant trading days.
- Free users get one total run; completed run remains visible; protocol library readable but activation gated.
- Pro users get unlimited runs and continuous tracking.
- One active protocol at a time for all users.
- Paywall copy is neutral: no urgency, no discounts, no feature list.

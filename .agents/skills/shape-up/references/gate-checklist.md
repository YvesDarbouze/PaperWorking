# Gate Checklist

Validate after convergence is detected, before entering plan mode.
Present each gate to the user with pass/fail status.

## Gates

### 1. Problem articulated

A specific story showing the broken status quo, not a vague wish.

- **Pass:** Can state the problem in 1-2 sentences naming who is affected
  and what happens today. Example: "Warehouse staff spend 4 hours daily
  on manual order reconciliation, producing errors that cascade to
  customer complaints."
- **Fail:** Problem is vague ("we need something better") or conflates
  problem with solution ("we need a React dashboard").

### 2. Appetite set

An explicit time budget framing how much this is worth.

- **Pass:** Stated as a deliberate choice — "small batch (~2 weeks)" or
  "big batch (~6 weeks)" or a custom time frame with rationale.
- **Fail (soft):** Not discussed. Note the assumption: "Appetite not set —
  defaulting to medium scope. The spec will not constrain to a time budget."
  This is acceptable for exploratory specs where the user wants to
  understand what's needed before committing resources.

### 3. Solution shaped

Named elements exist with responsibilities and key flows traced.

- **Pass:** At least 2 named elements with clear responsibilities. At least
  one interaction flow traced (user does X → system does Y → user sees Z).
  Fat-marker level — concrete enough to build from, rough enough to leave room.
- **Fail:** Only vague goals ("manage orders") without named components
  or traced flows.

### 4. Rabbit holes addressed

Risks identified and either patched with a decision or flagged for spikes.

- **Pass:** At least one risk named and addressed. Example: "Third-party
  API rate limits could block bulk imports — patched: implement queue with
  exponential backoff."
- **Fail (soft):** Not discussed. For simple features this may be
  acceptable — note: "No rabbit holes identified. For a small-batch
  feature this may be fine; for larger scopes, revisit."

### 5. No-gos stated

Explicit exclusions that prevent scope creep.

- **Pass:** At least one explicit exclusion. Example: "No mobile app.
  No real-time sync — polling is acceptable."
- **Fail:** No exclusions stated. Every shaped spec needs at least one
  no-go to demonstrate that scope was consciously bounded.

### 6. Boundaries defined

Non-functional constraints and success criteria measured against
the baseline.

- **Pass:** At least one non-functional constraint or success criterion.
  Example: "p95 latency under 2 seconds. Success: reconciliation takes
  under 30 minutes vs. today's 4 hours." Or explicitly: "No specific
  performance constraints beyond standard."
- **Fail (soft):** Not discussed. Note: "Boundaries not set — assuming
  standard quality defaults."

### 7. No contradictions

Appetite, solution, no-gos, and boundaries are internally consistent.

- **Pass:** Solution scope fits within appetite. No-gos don't exclude
  things the solution requires. Boundaries are achievable given the
  solution shape.
- **Fail:** Example: "Appetite is 2 weeks but solution has 8 named
  elements with complex integrations." Surface the conflict and resolve
  with the user — either expand appetite or cut scope.

### 8. User confirms

Explicit approval to proceed to specification.

- **Pass:** User says "go," "yes," "looks good," or equivalent.
- **Fail:** User is still exploring or has unresolved questions.
  Return to elicitation.

## Presentation

Show the checklist as a compact summary:

```
Spec elicitation checklist:
  [x] Problem: Manual reconciliation — 4 hours daily, error-prone
  [x] Appetite: Small batch (~2 weeks)
  [x] Solution: 3 elements (Importer, Validator, Reconciler), 2 flows
  [x] Rabbit holes: API rate limits patched (queue + backoff)
  [x] No-gos: No mobile app, no real-time sync
  [x] Boundaries: p95 < 2s, success = reconciliation under 30 min
  [x] No contradictions
  [ ] Awaiting your confirmation

Ready to produce spec. Confirm?
```

If any required gate fails, state what is missing and return to the
elicitation conversation to resolve it. Do not proceed to specification
with failed required gates.

Soft-fail gates can proceed with noted assumptions — but state each
assumption explicitly so the user can override if needed.

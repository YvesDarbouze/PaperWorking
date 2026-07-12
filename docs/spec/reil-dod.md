# REIL v2 Definition of Done

**Status:** Locked (Canonical Reference)
**Last Updated:** 2026-07-10
**Owner:** Quality Engineering

This document defines the 12-point runtime-evidence checklist that every feature
touching Projects, phases, metrics, cards, or UI copy must pass before merge.

---

## The 12-Point Checklist

Every feature must satisfy **all** applicable points. Check the box in your PR
description or walkthrough artifact.

---

### 1. ☐ Provider Interface + Real/Mock Adapters

For any integration with an external service:
- [ ] A typed provider interface is defined.
- [ ] A real adapter implements the interface.
- [ ] A mock adapter satisfies the same interface (for credentialless dev).
- [ ] Active adapter is selected via environment variable (e.g., `ESIGN_PROVIDER=docusign|mock`).

**Skip when:** The feature is purely UI or uses only local state/Firestore.

---

### 2. ☐ Server-Side Only Secrets

- [ ] All third-party API keys and SDK calls live in Next.js API routes or Server Actions.
- [ ] No secret appears in the client bundle (`next build` → grep confirms absence).
- [ ] New env vars are documented in `.env.example` with a clear comment.

---

### 3. ☐ Auth Guard

- [ ] Every server endpoint verifies the caller's Firebase ID token before acting.
- [ ] A request with no/invalid/forged token is rejected (demonstrate with a test case).
- [ ] The acting identity is derived from the verified token, not from client-supplied params.

---

### 4. ☐ Firestore Persistence

- [ ] Real results and status changes are written to Firestore (named collection path documented).
- [ ] No feature relies solely on React component state for data that survives page refresh.
- [ ] Write operations use the canonical Zod schema for validation.

---

### 5. ☐ Async & Webhooks

For any provider resolving asynchronously (signing, OCR, payment, etc.):
- [ ] The callback/webhook route is implemented and reconciles status.
- [ ] Completion is NOT faked with a client-side `setTimeout`.

**Skip when:** The operation is synchronous.

---

### 6. ☐ UI States — No Alert/setTimeout

- [ ] `alert()` calls are replaced with toast notifications or inline feedback.
- [ ] `setTimeout` fake-completion is replaced with real API calls.
- [ ] Loading, success, error, and empty states are explicitly handled.
- [ ] Empty states show actionable guidance (not just "No data").

---

### 7. ☐ Phase Model Compliance

- [ ] REIL v2 phase names used: Acquisition · Transaction · Rehab · Hold/Exit.
- [ ] Phase colors match the locked hex values: `#F59E0B` · `#3B82F6` · `#F97316` · `#10B981`.
- [ ] No legacy phase names (Purchase, Fund, Hold, Exit alone) introduced.
- [ ] `currentPhase` handled as number (1–4) or string enum, never string-only.

---

### 8. ☐ Metric Accuracy

- [ ] All financial formulas match `reiMetrics.ts` definitions.
- [ ] No inline metric math outside `src/lib/metrics/`.
- [ ] Golden-file seed values produce the locked outputs (NOI $12,486, Cap Rate 4.5%, etc.).
- [ ] `MetricResult` wrapper is used for all metric displays.
- [ ] Status zones applied: healthy/watch/alert with correct hex colors.

---

### 9. ☐ Copy Compliance

- [ ] No banned words used (robust, streamline, leverage, seamlessly, cutting-edge, holistic, empower, navigate, institutional-grade).
- [ ] No unverified statistics or fabricated testimonials.
- [ ] No capability claims for features that don't exist.
- [ ] Voice matches the operator tone — direct, experienced, concrete.
- [ ] CTA strings match the canonical templates from `reil-copy.md`.

---

### 10. ☐ Schema Conventions

- [ ] Currency fields use USD dollar floats (NOT cents).
- [ ] Percentage fields use whole numbers (12.5 = 12.5%), not decimals.
- [ ] New Zod schemas extend `projectSchema.ts` or `projectFinancialsSchema` — not ad-hoc types.
- [ ] No `any` types at financial computation boundaries.

---

### 11. ☐ Design System Compliance

- [ ] Fonts: Hanken Grotesk (sans) / Plus Jakarta Sans (display) / JetBrains Mono (tabular).
- [ ] Cards: frosted glass pattern (`rgba(255,255,255,0.02)`, 24px blur, 16px radius).
- [ ] Theme: respects `data-theme` on `<html>` + `useTheme()`.
- [ ] Navigation: no sidebar items added, removed, reordered, or renamed.
- [ ] Accessibility: high contrast (not `#595959` foreground), keyboard-navigable.

---

### 12. ☐ Idempotency & Error Handling

- [ ] Retries, network failures, and partial failures are handled.
- [ ] Actionable error messages surfaced to the user (not raw stack traces).
- [ ] Duplicate submissions produce the same result (idempotent operations).
- [ ] PostHog event emitted on success/failure (when telemetry is in scope).

---

## Verification Commands

Run these before declaring work complete:

```bash
# Type-check the full project
npx tsc --noEmit

# Run the full test suite
npm test

# Verify golden-file metric outputs
npm test -- --testPathPattern=reilMetricsSpec

# Check for banned words in changed files
git diff --name-only HEAD~1 | xargs grep -il 'robust\|streamline\|leverage\|seamlessly\|cutting-edge\|holistic\|empower\|navigate\|institutional-grade' || echo "Clean"

# Verify no secrets in client bundle
npm run build && grep -r 'RENTCAST\|STRIPE_SECRET\|FIREBASE_ADMIN' .next/static/ || echo "Clean"
```

---

## When Points Are Not Applicable

Not every point applies to every feature:

| Feature Type | Skip Points |
|-------------|-------------|
| Pure UI refactor (no data) | 1, 2, 3, 4, 5 |
| Internal dashboard widget | 1, 2, 5 |
| Copy-only update | 1, 2, 3, 4, 5, 8, 10, 12 |
| New metric deep-dive page | 1, 2, 5 |
| External integration | None — all points apply |

Mark skipped items as `N/A` in your checklist with a one-line justification.

---

## Escalation

If a point cannot be satisfied:
1. Document the gap in the PR description.
2. Create a follow-up issue with the `DoD-debt` label.
3. Get explicit sign-off from the feature owner before merging.

---

## Source of Truth Files

| File | Path |
|------|------|
| Mock Conversion Rules | `AGENTS.md` (mock-conversion-rules section) |
| Security Rules | `docs/data/firestore-rules-summary.md` |
| Gap Report | `docs/architect/gap-report.md` |
| Test Suite | `src/__tests__/reilMetricsSpec.test.ts` |

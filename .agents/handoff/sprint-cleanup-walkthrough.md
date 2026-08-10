# Walkthrough — Sprint Cleanup: Orphans, Follow Reconciliation, Deferred Requirements

**Date:** 2026-08-05
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — cleanup pass between Prompts 8 and 9

Closes the three items carried forward from Prompts 5–8 rather than starting
new feature work.

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx jest` | ⚠️ **2903 / 2915** — the same **2 pre-existing** DB-backed suites, **+16 new tests** (2887 → 2903) |
| `npx eslint` on all 16 touched files | ✅ **0 errors** |
| All eight sprint e2e suites | ✅ **59 / 59**, zero skips (was 54) |
| No "Sponsor" terminology | ✅ `grep -rIo "[Ss]ponsor" src/` → **0** |

The two failing jest suites are `src/marketplace/listings.test.ts` and
`src/scripts/seedAgentCrew.test.ts`. Both need a live Prisma/Postgres instance;
they were reproduced failing at clean `HEAD` with all sprint work stashed
earlier in this sprint and are unchanged here.

---

## 1. Item 1 — Two competing follow implementations, reconciled

### The defect

Two code paths wrote the **same** `investorFollowers` edges:

| Path | Optimistic | Maintains counts | Notification | Consent | Telemetry |
|---|---|---|---|---|---|
| `FollowInvestorButton` → `actions/follows.ts` | ❌ | ❌ | ❌ | ✅ | ✅ |
| Marketplace card / profile → `POST /api/marketplace/investors/follow` | ✅ | ✅ | ✅ | ❌ | ❌ |

`followerCount` and `followingCount` therefore **drifted from the edges**
depending on which button a user happened to click. A user followed through the
listings button and their follower count never moved.

### The fix

`src/hooks/useFollowInvestor.ts` (86 lines) is now the single write path. It
routes every follow through the API route — the only writer that increments the
counts inside the same batch as the edge and writes the inbox notification — and
exposes `onFollowed` / `onUnfollowed` / `onError` callbacks so the consent modal
and the PostHog event the older button contributed are preserved.

Both call sites migrated:

- `src/components/listings/FollowInvestorButton.tsx` — keeps its consent modal
  and `posthog.capture('investor_followed', …)`, now via `onFollowed`.
- `src/app/marketplace/investors/[id]/page.tsx` — the hook is hoisted above the
  load effect, which needs `setFollowing` to seed from the server response.

Optimistic flip with rollback on failure is now uniform:

```ts
setFollowing(next);                       // immediate
try { await POST(...) } 
catch { setFollowing(!next); onError?.(err); }   // rollback
```

`dealOnePager` and `dealProvenance` (9 tests, both mock the module) and the
`investor-marketplace` e2e suite pass unchanged.

---

## 2. Item 2 — 3,668 lines of orphaned components deleted

Four components with **zero importers**, all superseded by live surfaces:

| File | Lines | Superseded by |
|---|---:|---|
| `components/insights/KPIInsightsDashboard.tsx` | 2,799 | `app/dashboard/insights/page.tsx` + `KpiSectionGrid` (Prompt 6) |
| `components/insights/KPIDatapointExplorer.tsx` | 487 | ″ |
| `components/insights/InsightsDatapointGrid.tsx` | 154 | ″ |
| `components/settings/AccountTierSettings.tsx` | 228 | `app/dashboard/settings/billing/page.tsx` (Prompt 2) |
| | **3,668** | |

### Tested logic was extracted first, not deleted with the file

`insightsRedesign.test.ts` imported `calculatePeriodOverPeriod`,
`generateSeriesData`, and `downloadKPISeriesCSV` from `KPIDatapointExplorer`.
Deleting the component would have taken working, covered logic with it. The
three functions moved to `src/lib/kpi/kpiSeries.ts` (100 lines) and the test was
retargeted — **4/4 still passing** — before the `git rm -f`.

`git rm` was blocked by local modifications from the earlier de-green codemod,
hence `-f`.

---

## 3. Item 3a — Prompt 8 req 4: the profile editor (write path)

Prompt 8 shipped the **read** path for Investment Teams — `profileType`,
`businessName`, `teamLogoUrl`, `teamMembers` were modelled, returned by the API,
and rendered on the About tab — but there was no way to set any of it.

### New surface

`/dashboard/settings/marketplace-profile` (405 lines), added to the settings nav
between Profile and Team. Sections: profile type · identity · investment
strategy · team members · visibility.

- Team-only fields (business name, logo, roster) are **hidden** for Individual
  profiles rather than disabled — an empty roster on a solo profile is noise.
- Verification status is shown read-only when granted, with copy explaining it
  is not self-serve.
- Inputs are sized **inline**. `globals.css` styles `input`/`select` with
  `width: 100%` from outside any cascade layer, which beats Tailwind's layered
  utilities. This is the fourth surface in the sprint to hit that rule.

### New endpoint

`GET`/`PUT /api/marketplace/profile` (89 lines). The uid comes from the
**verified token** and there is no id in the body, so a caller cannot address
another user's profile at all.

### Validation is pure and tested

The rules that decide what reaches Firestore live in `sanitizeProfileInput`
(`src/lib/marketplace/investorProfile.ts`), not in the route, so they are
testable without a database. **16 new tests.**

| Rule | Why |
|---|---|
| Returns a **fixed shape**; unknown keys dropped, not merged | The write is `{ merge: true }`. `isVerified`, `followerCount`, `followingCount` cannot be set from the client even though the write is partial. Asserted by comparing the exact key set. |
| Strategies filtered against the known set | Free text would pollute the discovery filter |
| `websiteUrl` must be `http(s)://` | Rejects `javascript:` and bare hostnames |
| Teams require a business name | A nameless team renders as a blank discovery card |
| Invite emails validated; malformed → 400 | |
| Roster cleared when switching to Individual | Otherwise it would republish the moment the account flipped back |
| Roster capped at 50, bio at 600 chars | |
| `publicProfile` / `showRoiPublicly` must be **exactly** `true` | `'yes'` and `1` are private — the same non-truthiness rule as `isPublicOnMarketplace` |

Three e2e tests drive the real editor and assert the **captured PUT body**:
team fields appear only for teams, `isVerified` and `followerCount` are absent
from what is sent, and invites round-trip.

---

## 4. Item 3b — Prompt 7 req 5: the stage rail is now a stepper

**Before:** seven individually-boxed pills, each with its own background fill —
`#454955` for active, success-tinted for complete, `white/5` for available,
transparent for locked. Four competing fills in one row; it read as seven
unrelated tabs, not one ordered process.

**After:** `src/components/project/WorkflowStepper.tsx` (142 lines) — the same
treatment as `PhaseProgressTracker`, one level down: numbered 32px nodes joined
by a **hairline rail**, filled only where the process has reached, outlined and
muted where locked. The label carries the emphasis (weight 700 on active), not a
fill. Ordinals moved from the label text onto the node circle.

The connector is deliberately a hairline, not a progress bar — a filled segment
that grows reads as a loading indicator, which is what the phase timeline was
changed *away from* in Prompt 7.

Accent comes from `getPhaseConfig(phaseNumber)`, so the component is reusable on
phases 2–4 and inherits the canonical REIL palette rather than hardcoding.

### Existing suite contract preserved

Roughly a dozen e2e specs drive the acquisition workflow by clicking
`#stage-tab-{key}`. Those ids and the `data-testid="stage-complete"` marker are
kept verbatim. One spec (`offer-loi-negotiation.spec.ts:217`) reached for the
label text `span:has-text("5. Due Diligence")`; since the ordinal now lives on
the node, it was retargeted to `#stage-tab-due_diligence` — the locator every
other workflow spec already uses.

Two new e2e tests assert the restructure held: six connectors for seven stages,
each ≤ 2px tall; all seven node tops on **one** horizontal line; and every stage
button's own background computed as transparent (no pills left).

### Pre-existing failures confirmed, not introduced

`gate-audit-trail.spec.ts` (5) and `rehab-budget.spec.ts` (1) fail. To attribute
them, the phase-1 page was stashed and `WorkflowStepper.tsx` moved aside, and
the same **6 failures reproduced identically** without the stepper present. They
predate this change. `contingency-gonogo`, `disposition-strategy`, and
`offer-loi-negotiation` pass with the stepper in place.

---

## 5. `scenarioIRR.ts` — decided: retained, and documented

204 lines, no production importers; its only consumer is
`scenarioIRRNoMultiplier.test.ts` (26 tests). It was reviewed alongside the
3,668 deleted lines and **kept**, for two reasons those files did not share:

1. They were React surfaces duplicating live screens. This is a pure finance
   primitive with no UI to duplicate.
2. Its suite is a **regression guard** for a specific shipped bug — scenario
   IRRs fabricated by scaling a base result with a hardcoded coefficient instead
   of re-running the cash flows. Deleting the module deletes the guard, and the
   next scenario feature can reintroduce the same bug unnoticed.

A scope note at the top of the file records this so it is a decision, not
neglect. The note had to avoid the literal word the test greps for — the suite
asserts that term never appears in the source.

---

## 6. Files Changed

**New (5)**
- `src/hooks/useFollowInvestor.ts` (86)
- `src/lib/kpi/kpiSeries.ts` (100)
- `src/components/project/WorkflowStepper.tsx` (142)
- `src/app/api/marketplace/profile/route.ts` (89)
- `src/app/dashboard/settings/marketplace-profile/page.tsx` (405)

**Deleted (4)** — 3,668 lines, listed in §2

**Modified (11)**
- `src/lib/marketplace/investorProfile.ts` — `sanitizeProfileInput`, `EditableProfile`
- `src/lib/projections/scenarioIRR.ts` — scope note
- `src/components/listings/FollowInvestorButton.tsx` — onto the shared hook
- `src/app/marketplace/investors/[id]/page.tsx` — onto the shared hook
- `src/app/dashboard/projects/[id]/phase-1/page.tsx` — stepper swap
- `src/app/dashboard/settings/layout.tsx` — Marketplace nav entry
- `src/__tests__/investorProfile.test.ts` — +16
- `src/__tests__/insightsRedesign.test.ts` — retargeted to `kpiSeries`
- `e2e/investor-marketplace.spec.ts` — +3 (9 → 12)
- `e2e/project-workflow-simplify.spec.ts` — +2 (7 → 9)
- `e2e/offer-loi-negotiation.spec.ts` — locator retargeted

---

## 7. Screenshots

- `screenshots/investor-marketplace/profile-editor.png`
- `screenshots/project-workflow/stage-stepper.png`

---

## 8. Still Open

1. **`publicActivity` is never written.** The Activity tab is structurally
   correct but empty in practice; nothing emits events to it.
2. **Backfill `followerCount` / `followingCount`** for edges created before the
   counts existed. Now that there is one writer, a backfill is safe to run.
3. **`gate-audit-trail` (5) and `rehab-budget` (1)** e2e failures — pre-existing,
   confirmed unrelated to this work, unowned.
4. **Banner text collision** on the project workspace ("PHASE: ACQUISITION" over
   "Equity: 100%") — carried from Prompt 7 §8.
5. **`components/settings/SettingsLayout.tsx` and `SettingsSidebar.tsx`** have no
   importers; the live shell is `app/dashboard/settings/layout.tsx`. They are
   held in place only by `settingsSidebarAccess.test.ts`, which reads them off
   disk. Next orphan pass should retarget that test and decide their fate — the
   same pattern as `KPIDatapointExplorer` here.

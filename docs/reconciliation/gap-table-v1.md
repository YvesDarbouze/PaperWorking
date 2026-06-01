# PaperWorking — PRD Reconciliation Gap Table v1

**Audited:** 2026-06-01  
**Auditor:** Claude Code (Logic Lens discipline)  
**PRD version:** 1.0 + Amendment 1 (positioning correction)  
**Rule:** No feature code is written until this table is coordinator-approved. Gaps are closed in the sequence below, with a golden-file test gating each step.

---

## How to read this table

| Field | Meaning |
|---|---|
| ID | Stable gap identifier. Never changes after this document is committed. |
| Severity | P0 = blocks launch · P1 = blocks production confidence · P2 = spec drift · P3 = minor |
| PRD ref | The section(s) that define the requirement |
| File(s) | Exact file path(s) where the gap lives |
| What exists | What the code currently does |
| What's required | What the PRD requires |
| Test gate | The verifiable artifact that closes this gap |

---

## Gap Index

| ID | Severity | Domain | Title |
|----|----------|--------|-------|
| [R-01](#r-01) | P0 | Correctness | Golden test verifies internal consistency only — not PRD canonical values |
| [R-02](#r-02) | P0 | Correctness | Inline metric math in 5 files outside `/lib/metrics` |
| [R-03](#r-03) | P0 | Correctness | IRR computed as CoC×1.35 proxy in Data Room |
| [R-04](#r-04) | P0 | Correctness | GRM and IRR collapsed to scalars in Data Room (two violations) |
| [R-05](#r-05) | P0 | Correctness | GRM and IRR collapsed to scalars in Insights Hub (two violations) |
| [R-06](#r-06) | P0 | Correctness | DSCR portfolio aggregation includes all-cash NOI in numerator |
| [R-07](#r-07) | P0 | Security | Document binary upload not implemented — metadata only |
| [R-08](#r-08) | P0 | Security | Resend webhook signature verification bypassed |
| [R-09](#r-09) | P1 | Feature | Data-completion outreach engine: schema only, no engine |
| [R-10](#r-10) | P1 | Feature | MFA not implemented in auth flow |
| [R-11](#r-11) | P1 | Feature | Marketplace vendor-density gate not implemented |
| [R-12](#r-12) | P1 | Analytics | PostHog activation funnel: 4 of 7 canonical events missing |
| [R-13](#r-13) | P1 | UX | Dashboard layout does not match PRD Section 4.4 spec |
| [R-14](#r-14) | P1 | UX | Project Creation Wizard step structure does not match PRD 5-step spec |
| [R-15](#r-15) | P1 | UX | REIL phase URL names are `phase-1/2/3/4` not Acquisition/Transaction/Rehab/Hold-Exit |
| [R-16](#r-16) | P1 | Marketing | Amendment 1 violation: "risk mitigation platform" denial copy in FinalCTA |
| [R-17](#r-17) | P2 | Schema | Project schema shape does not match PRD Section 6.2 canonical structure |
| [R-18](#r-18) | P2 | Schema | State propagation (projected/actual/live/realized) not consistently applied in UI |
| [R-19](#r-19) | P2 | Testing | No property-based test suite (PRD requires ≥10,000 random inputs per metric) |
| [R-20](#r-20) | P2 | Ops | Stripe idempotency collection named `stripe_events` not `billingEvents` |
| [R-21](#r-21) | P2 | Security | 9 Firestore collections lack explicit security rules |
| [R-22](#r-22) | P2 | Launch | Launch criterion artifacts missing from `/docs/launch/` |

---

## Gap Details

---

### R-01

**Severity:** P0  
**Domain:** Correctness  
**PRD ref:** Section 4.2.2, Section 5.1, Section 7.7  
**Title:** Golden test verifies internal consistency only — not PRD canonical values

**File(s):**
- `src/lib/metrics/__tests__/golden.test.ts`

**What exists:**

The golden test uses a seed fixture with these parameters:
- Loan: `$223,200` at `7% / 30yr` → annual debt service ≈ `$17,826`
- The test then calls `deriveAllMetrics()` and asserts that each metric *wrapper* matches `deriveAllMetrics()` output

The test itself notes: *"Cash flow is negative (NOI < annual debt service) for this deal."*

**What's required:**

PRD Section 4.2.1 defines the canonical seed property with these **exact** expected outputs:

| Metric | PRD canonical value |
|--------|---------------------|
| NOI | **$12,486** |
| Cash Flow | **$1,722 / yr** |
| Cap Rate | **4.5%** |
| COC | **2.87%** |
| GRM | **11.9** |
| DSCR | **1.16** |

The PRD states: *"The seed property's expected values are the golden file; every test asserts to ±$1 / ±0.01% precision."*

The current test asserts circular internal consistency (wrappers match engine), not that the engine itself produces the PRD's specific numbers. A wrong formula that produces internally consistent wrong numbers passes the current test.

**Locked canonical seed property (Option B — coordinator-approved 2026-06-01):**

The PRD's original $897/mo P&I and positive $1,722 cash flow were implicitly pre-2022 rate assumptions. After reverse-engineering: a $142K loan at 6.5%/30yr produces $897/mo, but that implies ~49% LTV — inconsistent with the $60K total cash invested. Option B (20% down, 6.5%, 30yr) is the internally-consistent, market-realistic choice.

| Input | Locked value |
|-------|--------------|
| Purchase Price | $279,000 |
| Down Payment | $55,800 (20% LTV) |
| Closing Costs | $4,200 |
| Total Cash Invested | $60,000 |
| Loan Amount | $223,200 |
| Interest Rate | 6.5% |
| Loan Term | 30 years |
| Monthly P&I | $1,410.85 |
| Annual Debt Service | $16,930 |
| Monthly Gross Rent | $1,950 |
| Vacancy Rate | 7% |
| Property Management | 10% |
| Maintenance & CapEx | 10% |
| Property Taxes (annual) | $2,400 |
| Insurance (annual) | $696 |
| Utilities (annual) | $1,500 |

**Locked expected metric outputs (±$1 / ±0.01% precision):**

| Metric | Locked value | Change from PRD original |
|--------|--------------|--------------------------|
| NOI | **$12,486** | Unchanged (financing-agnostic) |
| Cash Flow | **−$4,444/yr** | Updated from $1,722 (rate correction) |
| Cap Rate | **4.5%** | Unchanged (financing-agnostic) |
| COC | **−7.41%** | Updated from 2.87% |
| GRM | **11.9** | Unchanged (financing-agnostic) |
| DSCR | **0.74** | Updated from 1.16 |
| Occupancy | **93%** | Unchanged |
| OER | **~40%** | Unchanged |

A second auxiliary fixture for "deal that pencils out" UI/UX tests (positive DSCR, positive cash flow rendering) will be defined in a separate ticket. It is NOT a correctness gate and does not run in the CI golden suite.

**What needs to happen:**
1. Replace `SEED_FINANCIALS` in `golden.test.ts` with the locked Option B values
2. Replace circular `expect(result.value).toBeCloseTo(golden.X, N)` assertions with explicit locked values
3. Add the test to the CI required suite
4. Update `docs/qa/golden-test-output.txt` after first passing run (launch criterion #1)

**Test gate:** `npm run test -- golden.test.ts` asserts NOI ≈ $12,486, Cash Flow ≈ −$4,444, Cap Rate ≈ 4.50%, COC ≈ −7.41%, GRM ≈ 11.9, DSCR ≈ 0.74 to ±$1/±0.01% precision. Zero circular self-reference assertions.

---

### R-02

**Severity:** P0  
**Domain:** Correctness  
**PRD ref:** Section 5.1 — "No metric is computed in more than one place"  
**Title:** Inline metric math in 5 files outside `/lib/metrics`

**File(s) and violations:**

| File | Lines | Violation |
|------|-------|-----------|
| `src/app/dashboard/panels/ExitPanel.tsx` | 62–72 | `noi`, `annualCashFlow`, `capRate` all computed inline from raw financials |
| `src/app/dashboard/panels/EvaluationPanel.tsx` | (verified by grep) | `noi = effectiveGrossIncome - operatingExpenses` inline |
| `src/app/dashboard/panels/PurchasePanel.tsx` | (verified by grep) | `noi = effectiveGrossIncome - operatingExpenses` inline |
| `src/app/dashboard/financials/page.tsx` | (verified by grep) | `noi = grossIncome - vacancyLoss - opexVal; cashFlow = noi - annualDebtService` inline |
| `src/app/dashboard/intelligence/comparison/page.tsx` | (verified by grep) | `noi = Math.max(0, annualRent - annualOpEx)` inline |

**What's required:**

PRD Section 5.1: *"No metric is computed in more than one place. Verified by code search for inline math; CI fails if duplicate found."*

All computation must go through `computeNOIMetric()`, `computeCashFlowMetric()`, etc. from `@/lib/metrics`.

**What needs to happen:**
1. For each file: replace inline math with the appropriate `computeXMetric(project)` call
2. If the component doesn't have the full `project` object, pass it down or read from store
3. Add a CI lint rule (grep-based) that fails if `noi\s*=\s*.*[+-]` appears outside `/lib/metrics`

**Test gate:** `grep -r "noi\s*=" src --include="*.ts" --include="*.tsx" | grep -v lib/metrics | grep -v __tests__ | grep -v "result\.\|metric\.\|data\."` returns 0 results.

---

### R-03

**Severity:** P0  
**Domain:** Correctness  
**PRD ref:** Section 4.2.2 — Metric #7, Section 5.1  
**Title:** IRR computed as CoC×1.35 proxy in Data Room

**File(s):**
- `src/app/dashboard/data-room/page.tsx:261`

**What exists:**
```ts
const irr = assetMetrics.cashOnCashReturn * 1.35; // Proxy model
```

**What's required:**

PRD Section 4.2.2: *"IRR: Discount rate where NPV of all cash flows = 0."*

The codebase has a correct Newton-Raphson IRR implementation at `src/lib/metrics/computeIRR.ts` and `src/lib/metrics/reiMetrics.ts` (`computeIRR`, `buildIRRCashFlows`). The proxy model in the Data Room bypasses it entirely, producing mathematically wrong values for every project where CoC × 1.35 ≠ actual IRR.

**What needs to happen:**
1. Replace the proxy model with `computeIRRMetric(project)` for the per-property IRR
2. See also R-04 for how portfolio IRR must be displayed (distribution, not scalar)

**Test gate:** Data Room's per-property IRR column matches `computeIRRMetric()` output for the seed project. Golden file confirms.

---

### R-04

**Severity:** P0  
**Domain:** Correctness  
**PRD ref:** Section 4.2.3 — "GRM, IRR: Distribution only — never aggregated to a scalar"  
**Title:** GRM and IRR collapsed to scalars in Data Room

**File(s):**
- `src/app/dashboard/data-room/page.tsx:349` (GRM)
- `src/app/dashboard/data-room/page.tsx:354` (IRR)

**What exists:**
```ts
const grm = totalRent > 0 ? totalValue / totalRent : 0;          // line 349
const irr = totalCapitalRaised > 0 ? weightedIRR / totalCapitalRaised : 0; // line 354
```
Both are surfaced as single scalar KPI cards in the portfolio view.

**What's required:**

PRD Section 4.2.3: *"GRM, IRR: Distribution only — never aggregated to a scalar."*

These two metrics must be rendered as distributions (histogram, range, or sparkline showing spread across projects), never as a single portfolio-level number.

**What needs to happen:**
1. Remove both scalar aggregations from `portfolioAggregates`
2. Replace the GRM and IRR KPI cards with distribution-style displays (bar chart of per-project values, or min/median/max range)
3. The Data Room Projects sub-tab can still show per-project GRM and IRR

**Test gate:** No component renders `portfolioAggregates.grm` or `portfolioAggregates.irr` as a headline scalar. Snapshot test confirms layout.

---

### R-05

**Severity:** P0  
**Domain:** Correctness  
**PRD ref:** Section 4.2.3  
**Title:** GRM and IRR collapsed to scalars in Insights Hub

**File(s):**
- `src/app/dashboard/insights/page.tsx:53-54` (metric definitions list)
- `src/app/dashboard/insights/page.tsx:634, 648–665` (aggregation implementation)

**What exists:**
```ts
{ id: 'GRM', ..., aggregation: 'weighted', weightField: 'grossRentalIncome' },
{ id: 'IRR', ..., aggregation: 'weighted', weightField: 'totalCashInvested' },
```
Both produce single weighted-average scalar values in portfolio scope.

**What's required:** Same as R-04 — distribution display only.

**What needs to happen:**
1. Remove GRM and IRR from the weighted aggregation loop
2. Replace with distribution-specific rendering in portfolio scope
3. Keep per-project values in Project and Compare scopes (those are correct)

**Test gate:** Insights portfolio scope renders GRM and IRR as distributions. Snapshot test confirms.

---

### R-06

**Severity:** P0  
**Domain:** Correctness  
**PRD ref:** Section 4.2.3 — "DSCR: Weighted by NOI, excluding all-cash properties from both numerator and denominator"  
**Title:** DSCR portfolio aggregation includes all-cash NOI in numerator

**File(s):**
- `src/app/dashboard/data-room/page.tsx:350`

**What exists:**
```ts
const dscr = totalDebtService > 0 ? totalNOI / totalDebtService : 0;
```
`totalNOI` is a sum across ALL projects including all-cash properties. When those properties have `loanAmount = 0`, their debt service is 0 but their NOI is still added to `totalNOI`, inflating the portfolio DSCR.

**What's required:**

PRD Section 4.2.3: DSCR is *"Weighted by NOI, excluding all-cash properties from both numerator and denominator."*

```ts
// Correct implementation:
const leveragedProjects = projects.filter(p => (p.financials?.loanAmount ?? 0) > 0);
const dscrNOI = leveragedProjects.reduce((s, p) => s + noi(p), 0);
const dscrDebt = leveragedProjects.reduce((s, p) => s + annualDebtService(p), 0);
const dscr = dscrDebt > 0 ? dscrNOI / dscrDebt : null; // null if all-cash portfolio
```

**Test gate:** Unit test: portfolio with 1 all-cash project + 1 leveraged project produces DSCR equal to the leveraged-only project's DSCR.

---

### R-07

**Severity:** P0  
**Domain:** Security / Feature  
**PRD ref:** Section 4.9 — "Document storage in Firebase Storage, encrypted at rest"  
**Title:** Document binary upload not implemented — metadata only

**File(s):**
- `src/components/engine/DocumentHub.tsx:109–120`

**What exists:**
```ts
// In production: upload to Firebase Storage or S3, get fileUrl
// For now we store metadata; fileUrl would come from the storage upload
const docData = { ... }; // fileUrl is empty
await addDoc(collection(db, 'projects', selectedProjectId, 'documents'), { ...docData });
```
The `File` object is never sent anywhere. `fileUrl` is always empty. Uploaded documents are un-downloadable.

**What's required:**

PRD Section 4.9:
- Upload binary to Firebase Storage at `projects/{projectId}/documents/{docId}/{filename}`
- Store the `gsUri` and a signed `fileUrl` (short-lived or via a proxy) in the Firestore doc
- Originals never deleted

**What needs to happen:**
1. Add `getStorage`, `ref`, `uploadBytesResumable` to `DocumentHub`
2. Upload file to Firebase Storage path before writing Firestore metadata
3. Store `gsUri` on the Firestore document; derive download URL via `getDownloadURL`
4. Show upload progress bar during upload
5. Firestore Storage security rules: only org members can read their project's documents

**Test gate:** Upload a real file in E2E; verify `fileUrl` is non-empty and the file is downloadable.

---

### R-08

**Severity:** P0  
**Domain:** Security  
**PRD ref:** Section 5.4 — "Webhook signatures verified on every payload"  
**Title:** Resend webhook signature verification bypassed

**File(s):**
- `src/app/api/webhooks/resend/route.ts:51–60`

**What exists:**
```ts
// In production, verify signature with @svix/server:
// const wh = new Webhook(webhookSecret);
// wh.verify(body, { ... });
// For now, we log the verification step and proceed
console.log('[Resend Webhook] Signature headers present, verification enabled');
```
The commented-out verification means any HTTP client can spoof Resend webhook events.

**What's required:** Uncomment and implement the `@svix/server` `Webhook.verify()` call. Return 401 if verification fails.

**Test gate:** Unit test: webhook handler returns 401 when signature header is forged. Integration test: valid Resend test event is accepted.

---

### R-09

**Severity:** P1  
**Domain:** Feature  
**PRD ref:** Section 4.6  
**Title:** Data-completion outreach engine: schema only, no engine

**File(s):**
- `src/lib/schemas/dataCompletionTaskSchema.ts` (schema exists)
- `src/app/api/cron/lifecycle-alerts/route.ts` (lifecycle alerts exist; not the same thing)
- Missing: any cron that creates `dataCompletionTasks` documents
- Missing: any cron that reads `dataCompletionTasks` and sends reminder emails

**What exists:** A Zod schema for the `dataCompletionTasks` collection. No engine creates tasks. No engine sends reminders. No escalation ladder.

**What's required (PRD 4.6 exactly):**

Trigger scenarios to implement:
1. LTR Project: current month's rent not logged by day 6 → email to assigned Property Manager
2. Project still has `purchasePriceState: "projected"` 30 days after creation → email to Owner to upload closing disclosure
3. OCR extraction unconfirmed for 7 days → email to Owner to confirm or correct
4. Valuation not updated in 6 months → email to Owner
5. Rehab line item assigned to vendor, no progress update in 14 days → email to GC, CC Owner

Escalation ladder: tactful at day N, firmer at day 2N, owner-CC at day 3N. Configurable per task type.

**What needs to happen:**
1. `src/app/api/cron/data-completion-scan/route.ts` — daily cron that evaluates each trigger scenario and creates/updates `dataCompletionTasks`
2. `src/app/api/cron/data-completion-send/route.ts` — cron that reads open tasks, applies escalation logic, sends emails via Resend
3. Email templates for each trigger scenario
4. `vercel.json` cron entries for both routes

**Test gate:** Unit test for each trigger: project fixture with missing field → task created at correct `nextDueAt`. Integration test: task at escalation level 2 sends "firmer" email copy.

---

### R-10

**Severity:** P1  
**Domain:** Feature  
**PRD ref:** Section 5.4 — "MFA available for all accounts, required for paid Team plan accounts"  
**Title:** MFA not implemented in auth flow

**File(s):**
- `src/app/(auth)/login/page.tsx` (no MFA challenge step)
- `src/app/(auth)/register/page.tsx` (no MFA enrollment)
- `src/app/dashboard/settings/` (no MFA settings page)
- `src/lib/cms/supportData.ts:90` (MFA described in help text as if it exists — misleading)

**What exists:** MFA is described in the help center as a feature. It is not implemented in any auth route.

**What's required:**
- Firebase Auth TOTP MFA enrollment flow in Settings → Security
- For paid Team plan accounts: MFA required on sign-in (middleware check)
- Authenticator app support (Firebase TOTP); SMS optional

**Test gate:** E2E test: Team plan user who hasn't enrolled MFA is redirected to enrollment on sign-in. Enrolled user completes TOTP challenge successfully.

---

### R-11

**Severity:** P1  
**Domain:** Feature  
**PRD ref:** Section 4.7 — "A metro is enabled for live Marketplace only when it has ≥5 vendors per primary vendor type"  
**Title:** Marketplace vendor-density gate not implemented

**File(s):**
- `src/actions/marketplace.ts` (vendor search — no density check)
- `src/app/dashboard/marketplace/page.tsx` (renders vendor list without density gate)
- Missing: any function that checks `≥5 vendors per primary type per metro`

**What exists:** The marketplace surfaces vendors by proximity. No gate checks vendor density. The graceful-degradation flow ("We're growing our vendor network in [city]") is not implemented.

**What's required (PRD 4.7):**
- Count vendors per primary type per metro before enabling live marketplace for that metro
- If count < 5: show graceful degradation message with contact form
- Primary vendor types: Lawyer, Loan Processor, Inspector, GC, Property Manager

**Test gate:** Unit test: metro with 4 GCs shows degradation UX. Metro with 5 shows live results.

---

### R-12

**Severity:** P1  
**Domain:** Analytics  
**PRD ref:** Section 7.2 — Activation funnel with 7 specific canonical events  
**Title:** PostHog activation funnel: 4 of 7 canonical events missing

**What exists vs what's required:**

| Event | Exists? | File |
|-------|---------|------|
| `landing_page_visited` | ✅ | `src/components/providers/PostHogProvider.tsx:55` |
| `signup_started` | ❌ | Missing |
| `signup_completed` | ✅ | `src/context/AuthContext.tsx:132,469` |
| `email_verified` | ❌ | Missing |
| `onboarding_intent_selected` | ✅ | `src/app/onboarding/intent/page.tsx:95` |
| `first_project_created` | ✅ (API) | `src/app/api/events/route.ts:22` |
| `first_metric_lit` | ✅ (API) | `src/app/api/events/route.ts:23,91` |
| `trial_converted_to_paid` | ❌ | Missing |

Missing events:
- `signup_started`: should fire when the registration form first renders
- `email_verified`: should fire in the email verification callback
- `trial_converted_to_paid`: should fire in the Stripe webhook when `subscription.status` transitions `trialing → active`

**Test gate:** Manual PostHog trace of the full sign-up → first metric → trial convert flow shows all 7 events in correct order with correct properties.

---

### R-13

**Severity:** P1  
**Domain:** UX  
**PRD ref:** Section 4.4  
**Title:** Dashboard layout does not match PRD Section 4.4 spec

**File(s):**
- `src/app/dashboard/page.tsx` (renders `CommandCenter`)
- `src/components/dashboard/command-center/CommandCenter.tsx`

**What exists:**
`CommandCenter` renders: greeting + live indicator, `CommandCenterKPIStrip`, `EquityPerformanceChart`, `AssetLifecycleCensus`, `ActivePipeline`, `TerminalAuditFeed`, `MarketHeatmap`, `RecentProjects`.

**What's required (PRD 4.4 exactly):**

| Component | Spec | Exists? |
|-----------|------|---------|
| Portfolio Pulse — 3 KPI cards (NOI m/m, Cash Flow this month, Active Projects by phase) | Required | Partial (KPIStrip exists but KPIs may differ) |
| Needs Attention feed — left 2/3 (DSCR <1.0, Occupancy <80%, negative CF, OER spike; lease renewals; document tasks; unconfirmed OCR) | Required | ❌ Not implemented as spec'd |
| Recent Activity feed — right 1/3, last 20 cross-Project entries | Required | `TerminalAuditFeed` may cover this, needs verify |
| Top Performers — horizontal bar (best Cap Rate, Cash Flow, Occupancy, Appreciation, COC) | Required | ❌ Not present |
| Quick Actions — 4 large buttons (+New Project, Upload document, Open Data Room, Run Tax Export) | Required | ❌ Not present |

**What needs to happen:** Audit each PRD-specified element against what CommandCenter renders. Build missing elements. Remove or repurpose elements that don't trace to the PRD spec (MarketHeatmap, AssetLifecycleCensus need PRD trace or removal).

**Test gate:** Snapshot of dashboard shows all 5 PRD-specified layout zones. Playwright test: Needs Attention feed shows ≥1 item for a project with DSCR <1.0.

---

### R-14

**Severity:** P1  
**Domain:** UX  
**PRD ref:** Section 4.5  
**Title:** Project Creation Wizard step structure does not match PRD 5-step spec

**File(s):**
- `src/lib/utils/projectWizardSchema.ts` (25+ individual question IDs)
- `src/components/project/ProjectCreationWizard.tsx`

**What exists:** The wizard is a flat list of questions with `condition` functions that show/hide based on earlier answers. There is no explicit "Step 1 of 5" grouping that corresponds to PRD's 5 steps.

**What's required (PRD 4.5):**

| Step | Name | Content |
|------|------|---------|
| 1 | Property identity | Address (Google Places), property type, nickname |
| 2 | Phase router | Which phase does this Project start in — **most important screen** |
| 3 | Strategy | Flip / Rental / BRRRR |
| 4 | Ownership | Slider for owner %, optional syndication expansion |
| 5 | Review & Enter | Summary card + preview + phase-colored CTA |

Additional requirements:
- Auto-save on every Continue
- Draft saving on dismiss
- Resume flow returns to last completed step
- Exits into phase kickoff screen

**What needs to happen:** Map the current question list onto the 5 named steps. Verify phase router (step 2) is surfaced prominently. Add summary review step. Verify auto-save and draft-resume logic.

**Test gate:** E2E wizard test completes all 5 named steps; dismissing mid-wizard and returning resumes at the last step; project created exits into the correct phase kickoff screen.

---

### R-15

**Severity:** P1  
**Domain:** UX / Navigation  
**PRD ref:** Section 4.1  
**Title:** REIL phase URL names are `phase-1/2/3/4` not Acquisition/Transaction/Rehab/Hold-Exit

**File(s):**
- `src/app/dashboard/projects/[id]/phase-1/page.tsx` (Acquisition)
- `src/app/dashboard/projects/[id]/phase-2/page.tsx` (Transaction — but page comment says "Purchase Workspace")
- `src/app/dashboard/projects/[id]/phase-3/page.tsx` (Rehab)
- `src/app/dashboard/projects/[id]/phase-4/page.tsx` (Hold/Exit)

**What exists:** Routes use ordinal names. Phase 2 is labeled "Purchase Workspace" in code comments, mismatching the PRD name "Transaction."

**What's required (PRD 4.1):** Phase names are Acquisition · Transaction · Rehab · Hold/Exit. URLs, headings, breadcrumbs, and code comments must use these names consistently.

**Recommended route structure:**
- `/dashboard/projects/[id]/acquisition`
- `/dashboard/projects/[id]/transaction`
- `/dashboard/projects/[id]/rehab`
- `/dashboard/projects/[id]/hold-exit`

With 301 redirects from `phase-1/2/3/4` during the migration window.

**Test gate:** Navigation contract test in `src/__tests__/navigationContract.test.tsx` updated to assert correct phase names. All `phase-N` references removed from breadcrumbs and headings.

---

### R-16

**Severity:** P1  
**Domain:** Marketing  
**PRD ref:** Amendment 1 — standing instruction: never deny "project management"  
**Title:** Amendment 1 violation: "risk mitigation platform" denial copy in FinalCTA

**File(s):**
- `src/components/landing/FinalCTA.tsx:11` (comment references the denial)
- `src/components/landing/FinalCTA.tsx:31` (copy: "A risk mitigation platform.")

**What exists:**
```tsx
// Re-anchors the value prop: "Not a project management tool. A risk mitigation platform."
...
A risk mitigation platform.
```

**What's required (Amendment 1):** This exact framing is replaced. The product is positioned as "real-estate-native project management" throughout. The denial pattern is removed.

**New positioning direction (per Amendment 1):** Hero/CTA copy should claim the category: "Project management for real estate investors. Built around the four phases that actually matter."

**Test gate:** `grep -r "risk mitigation platform\|not a project management" src` returns 0 results.

---

### R-17

**Severity:** P2  
**Domain:** Schema  
**PRD ref:** Section 6.2  
**Title:** Project schema shape does not match PRD Section 6.2 canonical structure

**File(s):**
- `src/types/schema.ts` (1400+ line flat schema)
- `src/lib/schemas/projectSchema.ts`

**What exists:** A large flat `ProjectFinancials` object with most data at the same level, plus some nested objects (`transaction`, `rehab`, `holdCost`, `exit`). The canonical PRD structure has `acquisition`, `transaction`, `rehab`, `exit` as first-class nested sub-objects on `Project`.

**What's required (PRD 6.2):**
```ts
Project {
  acquisition: { askingPrice, targetPurchasePrice, arv, mao, comps[], raise?, state }
  transaction:  { loanAmount, interestRate, loanTermMonths, closingCosts[], diligence[], ... }
  rehab:        { tier, lineItems[], contractorQuotes[], permits[], ... }
  exit:         { currentModality, modalityHistory[], sale?, stabilizedRevenue[] }
  holdCost:     { periods: HoldCostPeriod[] }
}
```

**Impact:** The flat schema makes it harder to enforce phase-specific write access for vendors, harder to serialize per-phase data for the wizard, and harder to enforce state propagation per section 6.3.

**Note:** This is a significant migration. Prioritize understanding the delta between current and canonical shape before deciding whether to migrate wholesale or shim.

**Test gate:** Schema migration plan committed in `/docs/architect/schema-migration-v2.md` with field mapping. Types pass `tsc --noEmit`.

---

### R-18

**Severity:** P2  
**Domain:** UX / Schema  
**PRD ref:** Section 6.3  
**Title:** State propagation (projected/actual/live/realized) not consistently applied in UI

**File(s):**
- All phase workspace pages
- `src/lib/metrics/types.ts` (MetricState partially covers this)

**What's required (PRD 6.3):**

| State | UI treatment |
|-------|-------------|
| `projected` | Italic text + hatched fill on chart bars |
| `actual` | Tabular normal + solid fill |
| `live` | Animated indicator |
| `realized` | Locked icon + final styling |

The metric wrappers return a `state` field. The UI must visually distinguish all four states.

**Test gate:** Storybook story showing all four states for a currency metric card. Visual regression test.

---

### R-19

**Severity:** P2  
**Domain:** Testing  
**PRD ref:** Section 7.7 — "Property-based test suite: ≥10,000 random inputs per metric pass without crash"  
**Title:** No property-based test suite

**File(s):** None — missing entirely.

**What's required:** Install `fast-check` and write property-based tests that generate random valid input sets for each of the 10 metric wrappers and assert: no crash, output is a valid `MetricResult` shape, values are within mathematically defensible bounds.

**Test gate:** `npm test -- --testPathPattern=property` runs 10,000 inputs per metric, zero crashes.

---

### R-20

**Severity:** P2  
**Domain:** Ops  
**PRD ref:** Section 4.10 — "idempotent via `billingEvents/{stripeEventId}` collision check"  
**Title:** Stripe idempotency collection named `stripe_events` not `billingEvents`

**File(s):**
- `src/app/api/stripe/webhook/route.ts:77–83`

**What exists:** Collection is `stripe_events`. Idempotency logic is correctly implemented.

**What's required:** PRD specifies `billingEvents`. Rename the collection for spec compliance.

**Note:** Low risk, purely a naming issue. Requires a Firestore collection rename and any queries that reference `stripe_events`.

**Test gate:** `grep -r "stripe_events" src` returns 0 results. `billingEvents` references pass TypeScript.

---

### R-21

**Severity:** P2  
**Domain:** Security  
**PRD ref:** Section 5.4  
**Title:** 9 Firestore collections lack explicit security rules

**File(s):**
- `firestore.rules`

**Collections needing rules:** `vendorAssignments`, `vendorInbox`, `stripe_events` / `billingEvents`, `pending_subscriptions`, `support_tickets`, `support_messages`, `teamInvitations`, `queued_emails`, `metricSnapshots`

**Per existing gap report G-02:** catch-all deny is in place (low immediate risk), but explicit rules needed per collection's access pattern.

**Test gate:** `firebase emulators:exec 'npx jest firestore.rules.test.ts'` passes for all 9 collections.

---

### R-22

**Severity:** P2  
**Domain:** Launch  
**PRD ref:** Section 10 — 15 launch criteria with per-criterion verification artifacts  
**Title:** Launch criterion artifacts missing from `/docs/launch/`

**File(s):**
- `/docs/launch/` (directory exists: `go-no-go-checklist.md`, `launch-day.md`, `launch-runbook.md`, `legal-checklist.md`, `post-launch-week.md`)
- Missing: `/docs/qa/golden-test-output.txt` (criterion #1)
- Missing: `e2e/critical-paths.test.ts` asserting real selectors (current version uses mocked state)
- Missing: Lighthouse CI report committed per criterion #3
- Missing: `/docs/launch/accepted-risks.md` (required for any criterion waiver)

**What needs to happen:** Audit each of the 15 launch criteria in PRD Section 10 and create the specific artifact each requires. The existing E2E test suite uses mocked DOM state and may not gate real regressions; it needs review.

**Test gate:** All 15 launch criteria have a corresponding artifact in `/docs/launch/` and a responsible owner assigned.

---

### R-23

**Severity:** P0  
**Domain:** Billing  
**PRD ref:** Section 4.10  
**Title:** Plan catalog in codebase does not match actual Stripe product catalog — displayed prices and plan IDs are wrong

**File(s):**
- `src/lib/stripe/plans.ts` (PLAN_CATALOG, DISPLAY_NAME_ALIASES)
- `src/components/landing/PricingSection.tsx` (hardcoded prices)
- `src/app/pricing/page.tsx` (hardcoded prices)

**The three-way mismatch:**

| Source | Plan 1 (cheapest) | Plan 2 | Plan 3 (most expensive) |
|--------|-------------------|--------|------------------------|
| **Stripe (source of truth)** | Vendor — $39/mo / $390/yr | Investor — $59/mo / $499/yr | Investment Team — $99/mo / $999/yr |
| **Codebase `plans.ts`** | individual (Solo) — $99/mo / $948/yr | team (Team) — $249/mo / $2,388/yr | vendor (Enterprise) — $499/mo / $4,788/yr |
| **PRD Section 4.10** | Solo — $39/mo / $390/yr | Investor — $89/mo / $890/yr | Team — $199/mo / $1,990/yr |

**Critical collision:** In Stripe, "Vendor" is the cheapest plan ($39/mo). In the codebase, the `vendor` plan ID is the most expensive plan (displayed as $499/mo "Enterprise"). The word "Vendor" points in opposite directions.

**What this means for live checkouts:**

The checkout route calls `resolveStripePriceId(planId, interval)` which reads env var price IDs and passes them directly to Stripe. What the customer is actually charged is determined by the Stripe price ID, not the displayed price. The `.env.local` has 6 price IDs configured:

```
STRIPE_PRICE_INDIVIDUAL_MONTHLY → price_1TL2o67gr...
STRIPE_PRICE_INDIVIDUAL_ANNUAL  → price_1TL35A7gr...
STRIPE_PRICE_TEAM_MONTHLY       → price_1TL3097gr...
STRIPE_PRICE_TEAM_ANNUAL        → price_1TL38C7gr...
STRIPE_PRICE_VENDOR_MONTHLY     → price_1TVy6p7gr...
STRIPE_PRICE_VENDOR_ANNUAL      → price_1TVyCi7gr...
```

These price IDs resolve to actual Stripe products. Until confirmed via Stripe Dashboard which price ID maps to which product name and price, we cannot know if the checkout charges the displayed amount or a completely different amount.

**Immediate risk:** A user clicking the "$99/mo Solo" plan might be charged $39, $59, or $99 depending on how the env vars were configured. The displayed price on the page has no bearing on what Stripe charges.

**Additional gap — `DISPLAY_NAME_ALIASES` is missing Stripe's product names:**
```ts
// Current aliases do NOT include Stripe's actual product names:
'vendor'   // → mapped to most expensive plan (WRONG direction)
// Missing:
'investor'            → should map to middle plan
'investment team'     → should map to top plan
```
If a checkout request arrives with `plan: "Investor"` (Stripe's product name), `resolvePlanId()` returns `null` and the checkout fails with 400.

**What needs to happen:**
1. **Coordinator confirms** the exact mapping: which of the 6 env var price IDs corresponds to which Stripe product (Vendor / Investor / Investment Team)
2. **Rewrite `plans.ts`** to use Stripe's actual product names and prices as the canonical reference
3. **Update `PricingSection.tsx` and `pricing/page.tsx`** to display actual Stripe prices
4. **Add Stripe product names to `DISPLAY_NAME_ALIASES`**
5. **Rename env vars** to match Stripe product names (with backward-compatible fallbacks during transition)

**Proposed new `PlanId` mapping (pending coordinator confirmation of price↔product mapping):**

| New `PlanId` | Stripe product name | Monthly | Annual |
|--------------|---------------------|---------|--------|
| `vendor` | Vendor | $39/mo | $390/yr |
| `investor` | Investor | $59/mo | $499/yr |
| `team` | Investment Team | $99/mo | $999/yr |

**Note on naming confusion:** Stripe's "Vendor" plan name conflicts with PaperWorking's concept of "marketplace vendors" (contractors, lawyers, etc.). Once the price mapping is confirmed, consider renaming the Stripe product to "Starter" or "Solo" to eliminate the collision.

**Test gate:** A Stripe test-mode checkout for each of the 3 plans charges the correct amount shown on the pricing page. Verified via Stripe Dashboard payment intent log.

---

## Build sequence (coordinator sign-off required before implementation begins)

The gaps must be closed in severity order. No P1 gap is started while any P0 gap is open.

### Phase 1 — P0 Correctness (unblock trust)

| Order | Gap | Estimated effort |
|-------|-----|-----------------|
| 1 | R-01: Fix golden test to assert PRD canonical values | S |
| 2 | R-02: Remove inline metric math from 5 files | M |
| 3 | R-03: Replace IRR proxy with `computeIRRMetric` in Data Room | S |
| 4 | R-04: Convert GRM + IRR to distributions in Data Room | M |
| 5 | R-05: Convert GRM + IRR to distributions in Insights Hub | M |
| 6 | R-06: Fix DSCR aggregation to exclude all-cash properties | S |

### Phase 2 — P0 Security

| Order | Gap | Estimated effort |
|-------|-----|-----------------|
| 7 | R-07: Implement Firebase Storage binary upload in DocumentHub | L |
| 8 | R-08: Implement Resend webhook signature verification | S |

### Phase 3 — P1 Features (after P0 gates are green)

| Order | Gap | Estimated effort |
|-------|-----|-----------------|
| 9 | R-16: Remove denial copy from FinalCTA (Amendment 1) | XS |
| 10 | R-12: Add 3 missing PostHog events | S |
| 11 | R-15: Rename phase routes to REIL names | M |
| 12 | R-13: Audit and align Dashboard to PRD 4.4 spec | L |
| 13 | R-14: Align wizard to PRD 5-step structure | M |
| 14 | R-11: Implement marketplace density gate | M |
| 15 | R-10: Implement MFA enrollment and enforcement | L |
| 16 | R-09: Build data-completion outreach engine | XL |

### Phase 4 — P2 (schema, testing, ops)

R-17, R-18, R-19, R-20, R-21, R-22 — sequenced after P1 phase is complete.

---

## Items confirmed as non-gaps (correct per PRD)

| Area | Status |
|------|--------|
| Stripe webhook idempotency logic | ✅ Correct (collection name mismatch is R-20, logic is sound) |
| Vendor vetting disclosure | ✅ Present in marketplace page, vendor side sheet, request modal, vendor profile, and project sidebar |
| Sentry frontend + backend config | ✅ `sentry.client.config.ts` and `sentry.server.config.ts` initialized |
| Auth (Firebase Auth + cookie session) | ✅ Shipped and working per handoff |
| Referral program | ✅ Shipped per handoff |
| Demo mode | ✅ Shipped at `/demo` |
| Stripe checkout + portal routes | ✅ Wired |
| OCR routes (settlement, inspection, GC bid, Phase I) | ✅ Routes exist, confirm-and-harden needs UI state verification |
| `landing_page_visited`, `signup_completed`, `onboarding_intent_selected`, `first_project_created`, `first_metric_lit` events | ✅ Present |
| Metrics engine — 10 individual metric wrappers | ✅ Exist at `/lib/metrics/compute*.ts` |
| Tax export routes | ✅ Shipping per Phase 6 handoff — verify against spec separately |

---

## Coordinator sign-off

**Before any gap is implemented:** Coordinator reviews this document and:

1. Confirms the PRD canonical seed property loan parameters (to resolve R-01's fixture question)
2. Confirms phase route rename strategy (R-15) — redirect approach vs. parallel routes
3. Prioritizes or defers any P1 gaps relative to launch date

**Signature block:**

| Role | Sign-off | Date |
|------|----------|------|
| Coordinator | | |
| Engineering lead | | |

---

*Document created by Claude Code — Logic Lens discipline. Do not modify gap IDs. Append findings below the last row; do not edit existing rows.*

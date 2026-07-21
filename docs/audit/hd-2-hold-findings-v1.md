# HD-2 · Hold-Phase Audit — Complete Findings Report

**Status:** Committed (Audit Authority)
**Date:** 2026-07-21
**Branch:** `feature/hold-hd-series`
**Author:** Antigravity AI / Engineering Team

This document is the authoritative built-vs-spec findings report for the Hold-phase build (REIL Phase 3). It maps every existing Hold surface, legacy label survivor, Fund→Hold gate implementation, variable registry state, permission/team foundation, messaging inventory, integration state, and document plane surface before any HD Series build code is written.

---

## 1. Existing Hold Surfaces & Disposition

| Surface / Route | Description | File Path | Disposition | Reason / Action |
|---|---|---|---|---|
| **Phase 3 Workspace Route** | Main Hold phase dashboard view | `src/app/dashboard/projects/[id]/phase-3/page.tsx` | **Relocate / Refactor** | Contains inline math, mock states, and legacy card structures. Relocate logic to single `deriveHoldOperations` engine (HD-4) and data-driven shell (HD-5). |
| **Hold Cards Component** | Hold intake and management cards | `src/components/project/HoldCards.tsx` | **Refactor / Conform** | Conform to 5-column H1–H5 layout and decision rules (HD-5..HD-17). Eliminate inline math. |
| **Hold Interview Helper** | Dynamic interview question retriever | `src/lib/project/holdInterview.ts` | **Keep / Refactor** | Refactor to respect Decision H-1 (`disposition_type` read-only, never re-asked). |
| **Hold Metrics Derivations** | Supplemental metrics for Hold | `src/lib/metrics/holdMetrics.ts` | **Relocate / Consolidate** | Consolidate all metric math into `deriveAllProjectMetrics` and non-matrix derivations into `deriveHoldOperations` (HD-4). |
| **Project Summary Card** | Project phase cards container | `src/components/project/ProjectCards.tsx` | **Keep** | Retain container structure, update phase-3 tab to trigger HD-5 shell. |

---

## 2. Legacy Label Survivors inside Hold Scope

| Legacy Term | Context / Location | Severity | Action |
|---|---|---|---|
| `"Closing"` | Test fixture `currentPhase: 'Closing'` (`src/__tests__/deferredIntegrations.test.tsx:69`) | Defect | Conform to canonical phase string `'fund'` or `Phase 2`. |
| `"Hold & Rehab"` | Legacy display string in components/tests | Defect | Replace with canonical phase label `Hold`. |
| `strategyType` | Extensively used across tests (`src/__tests__/holdInterview.test.ts`, `src/__tests__/projectWizard.test.ts`, etc.) and legacy models | Defect | Migrate all strategy references to canonical `disposition_type` (`SALE` \| `LEASE` \| `RENT`) per Decision H-1. |

---

## 3. Fund → Hold Boundary & Gate Implementation

- **Gate Implementation**: `src/lib/project/gateEvaluator.ts` / `src/app/api/projects/[id]/gate/route.ts`
- **Criteria Source**: Evaluated dynamically against required Fund fields (purchase price, loan terms, closing date, deed recording, cash-to-close reconciliation).
- **Carry-over Payload**:
  - `purchasePrice` (`currency · actual`)
  - `closingDate` (`date · actual`)
  - `loanAmount`, `interestRate`, `loanTermYears`, `annualDebtService` (`actual / derived` from Fund debt)
  - `holdingCostTaxes`, `holdingCostInsurance` (`currency · actual` pre-filled confirmations)
  - `capitalStructure` (`equity_party[]`, LP/GP splits)
- **DB Verification**: Verified via Prisma `Project` record carrying `currentPhase = 2` -> `currentPhase = 3` with `gatePassLogs` entry.

---

## 4. Variable Registry State for Hold-Owned Variables

| Variable Name | Type / Slot | Status in Codebase | Source / Notes |
|---|---|---|---|
| `renovation_tier` | `enum (5 tiers)` | Partial | Types exist; needs strict 5-tier enforcement (`Stage`, `Refurbish`, `Renovate`, `Gut`, `Develop`). |
| `rehab_budget` | `currency (projected)` | Exists | Pre-filled from Acquisition's renovation estimate. |
| `rehab_spend[]` | `array (actuals)` | Partial | Basic ledger exists; needs receipt refs, category tagging, and pending-approval status (HD-9, HD-21). |
| `rehab_completed_date` | `date` | Absent | To be added in HD-8 / HD-9. |
| `holding_cost_<category>` (8 canonical) | `currency (monthly)` | Exists | `tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`. (Management fee computed on gross scheduled rent via BUG-8 law). |
| `current_value` | `dated series` | Partial | Single value exists; dated series with source tag required (HD-14). |
| `target_rent` | `currency` | Exists | Sourced from Acquisition / Hold go-to-market. |
| `target_lease_terms` | `struct` | Absent | To be added in HD-16. |
| `list_price_sale` | `currency` | Partial | Basic price field exists; needs flip runway integration (HD-17). |
| `listing_ad_log[]` | `array` | Absent | To be added in HD-13. Excluded from NOI expense sum per Decision H-4. |
| `showings_log[]` | `array` | Absent | To be added in HD-13. |
| `occupancy_during_hold` | `enum` | Absent | To be added in HD-6. |
| `utilities_responsibility` | `enum` | Absent | To be added in HD-6. |
| `reserve_policies` | `structs` | Partial | Policy structs to be formalized per Decision H-3 (Vacancy & Credit Loss, R&M, Replacement Reserves). |

---

## 5. Team & Access Inventory

- **Role Model**: `src/lib/auth/roles.ts` (Lead Investor, Investment Team, Vendor).
- **Manager Preset**: `hold_manager` to be added as a Project-scoped, Hold-phase-scoped permission preset on existing team infrastructure (Decision H-5).
- **Invite Lifecycle**: `pending` → `accepted` → `active` / `revoked` in `src/lib/team/inviteService.ts`.
- **Audit Log**: Append-only log in `src/lib/db/auditLog.ts`.

---

## 6. Messaging Inventory

- **Resend Service**: `src/lib/email/resendClient.ts` with failure isolation (Decision H-6).
- **Inbox Event Types**: Internal notification records stored in Firestore `notifications` collection.
- **Job Queue / Scheduler**: Scheduled tasks via Next.js background workers / cron handlers.

---

## 7. Integrations & Documents Plane

- **Plaid Loop**: `src/lib/integrations/plaid.ts` for recurring cost proposals.
- **AVM Providers**: `src/lib/integrations/rentcast.ts` (RentCast primary, Zillow adapter-ready).
- **PostHog Telemetry**: `src/lib/telemetry/posthog.ts` for event tracking.
- **Firebase Storage**: `storage.rules` enforced server-side; signed URLs for document access in Data Room.

---

## 8. HD-3…HD-38 Dependency & Gap Matrix

| Dispatch | Scope / Dependency | Status | Action Required |
|---|---|---|---|
| **HD-3** | Hold Data Contract & Schemas | Partial | Add Prisma/Firestore migrations for Hold variables. |
| **HD-4** | Hold Operations Engine (`deriveHoldOperations`) + HX Fixtures | Absent | Implement single named engine; seed HX-1..HX-5 fixtures. |
| **HD-5** | Hold Workspace Shell (5 columns) | Partial | Conform layout to H1–H5 columns. |
| **HD-6** | Hold Entry Interview | Partial | Refactor to read `disposition_type` without re-asking. |
| **HD-7** | Financing & PITI Baseline | Exists | Ensure display-only from Fund actuals (Decision H-2). |
| **HD-8** | Column H1 — Renovation Plan | Partial | Enforce 5 scope tiers and budget approval state. |
| **HD-9** | Column H2 — Renovation Tracking | Partial | Itemized spend log with receipt slots and progress bar. |
| **HD-10** | Column H3 — Itemized Holding Costs | Partial | Canonical 8 categories with GSR management fee (BUG-8). |
| **HD-11** | Vacancy & Reserve Policies | Partial | Apply Decision H-3 pro-forma vocabulary and status chips. |
| **HD-12** | Plaid Recurring-Cost Proposals | Partial | Transaction proposal loop with category mapping. |
| **HD-13** | Marketing Spend & Showings Log | Absent | Listing/ad log excluded from NOI (Decision H-4). |
| **HD-14** | Column H4 — Current Value Series | Partial | Dated series with source tags. |
| **HD-15..17**| Column H5 — Strategy GTM Cards (Rent/Lease/Sale) | Partial | Strategy-specific cards and flip runway date. |
| **HD-18..24**| `hold_manager` Role, Invites, Approval Thresholds | Partial | Implement permission preset and $ threshold gating (Decision H-5). |
| **HD-25..30**| Notifications, Resend Emails, Reminders | Partial | Failure-isolated emails and reminder engine (Decision H-6). |
| **HD-31..33**| Compliance, Data Room, Document Capture | Partial | Document slots and side-by-side capture. |
| **HD-34..38**| Metrics Actualization, Widgets, Gate to Exit | Partial | Connect Hold actuals to `deriveAllProjectMetrics` and event-triggered gate. |

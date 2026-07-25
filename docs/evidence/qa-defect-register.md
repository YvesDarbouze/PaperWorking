# QA Defect Register — candidate/fund-hold-exit-build-2026-07-19

This document registers all QA defect findings compiled during the QA-5 Adversarial QA pass and updated during the QA-6 defect remediation pass.

---

## Defect Summary by Severity & Resolution

| Severity | Count | Definition | Status | Commit Hash |
|---|---|---|---|---|
| **P0** (Critical) | 1 | Next.js API Routes Bypass Firestore Role Checks | **FIXED** | `a94be592` |
| **P1** (Major) | 1 | Hold to Exit Transition Lacks Server-Side Event Gating | **FIXED** | `8f3e3287` |
| **P2** (Medium) | 2 | Negative Annual Debt Service Inflates Cash Flow | **FIXED** | `20be31ef` / `d5485eae` |
| **P2** (Medium) | 1 | Inconsistent Phase Status Derivation for Realized Projects | **FIXED** | `1d1ec237` |
| **P3** (Low) | 1 | Orphaned Debt Records on Modality Change | **FIXED** | `00ffe3e2` |

---

## Lane 1: Edge Inputs

### [P2] Negative Annual Debt Service Inflates Cash Flow
* **File/Line:** [src/lib/metrics/reiMetrics.ts:L983-L998](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/metrics/reiMetrics.ts#L983-L998)
* **Description:** The cash flow calculation engine accepted negative values for `annualDebtService`. Because cash flow is computed as `NOI - Annual Debt Service`, a negative debt service was mathematically added to the NOI.
* **Resolution:** FIXED in `20be31ef` and `d5485eae`. Enforced non-negative boundaries on project input schemas (`loanInterestRate`, etc.) and restricted direct updates to `annualDebtService` by making it read-only in the Zod boundary validation.

---

## Lane 2: Honesty Audit

### [P2] Inconsistent Phase Status Derivation for Realized Projects
* **File/Line:** [src/lib/firebase/deals.ts:L32-L52](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/firebase/deals.ts#L32-L52) and [src/app/api/projects/route.ts:L99-L115](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/route.ts#L99-L115)
* **Description:** The function `derivePhaseFromREIStatus` failed to map `'realized'` or `'Sold'` statuses, falling through to the `default` case and initializing projects in Phase 1: Acquisition instead of Phase 4: Exit.
* **Resolution:** FIXED in `1d1ec237`. Added explicit cases mapping `'realized'` and `'Sold'` statuses directly to Phase 4 (Exit).

---

## Lane 3: Security Probes

### [P0] Next.js API Routes Bypass Firestore Role Checks
* **File/Line:**
  * [src/app/api/projects/[id]/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/route.ts)
  * [src/app/api/projects/[id]/acquisition/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/acquisition/route.ts)
  * [src/app/api/projects/[id]/exit/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/exit/route.ts)
  * [src/app/api/projects/[id]/hold/auto-advance/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/hold/auto-advance/route.ts)
* **Description:** Next.js API server routes executing updates using the Firebase Admin SDK bypassed Firestore security rules, allowing any project member (including restricted roles like Observer or Vendor) to mutate project financials.
* **Resolution:** FIXED in `a94be592`. Refactored `project-guard.ts` to implement `determineAccessAndRole` and `authorizeProjectMutation`. Integrated these helpers across all API mutation endpoints to enforce role-based write access.

---

## Lane 4: Cross-Phase Flows

### [P1] Hold to Exit Transition Lacks Server-Side Event Gating
* **File/Line:** [src/app/api/projects/[id]/hold/auto-advance/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/hold/auto-advance/route.ts)
* **Description:** The server-side auto-advance endpoint advanced projects to Phase 4 without verifying that an exit-triggering database event (such as a rent entry, active lease, or contract of sale) actually existed.
* **Resolution:** FIXED in `8f3e3287`. Implemented database validations verifying active leases or sale events on the server before allowing advancement.

---

## Lane 6: Consistency

### [P3] Orphaned Debt Records on Modality Change
* **File/Line:** Firestore `/projects/{id}/loans` subcollection
* **Description:** Switching a project's modality (e.g. from Conventional to All Cash) left pre-existing loan documents orphaned in the `loans` subcollection.
* **Resolution:** FIXED in `00ffe3e2`. Modality adjustments are routed through the guarded reconciliation action, which automatically archives (marks as `'Archived'`) orphaned debt and equity entries.

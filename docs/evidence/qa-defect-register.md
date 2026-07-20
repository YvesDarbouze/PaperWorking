# QA Defect Register — candidate/fund-hold-exit-build-2026-07-19

This document registers all QA defect findings compiled during the QA-5 Adversarial QA pass. All findings have been investigated and classified by severity. Verdicts and actions on these findings are deferred to the founder.

---

## Defect Summary by Severity

| Severity | Count | Definition |
|---|---|---|
| **P0** (Critical / Security Bypass) | 1 | Access control bypass, direct database injection/mutation by unauthorized users |
| **P1** (Major / Logic Bypass) | 1 | Business logic gate bypass, event verification failure |
| **P2** (Medium / Metric Accuracy) | 2 | Calculation inaccuracies on extreme values, inconsistent phase status derivation |
| **P3** (Low / Polish) | 1 | Database cleanliness, orphaned records on state changes |

---

## Lane 1: Edge Inputs

### [P2] Negative Annual Debt Service Inflates Cash Flow
- **File/Line:** [src/lib/metrics/reiMetrics.ts:L983-L998](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/metrics/reiMetrics.ts#L983-L998)
- **Description:** The cash flow calculation engine accepts negative values for `annualDebtService`. Because cash flow is computed as `NOI - Annual Debt Service`, a negative debt service is mathematically added to the NOI, resulting in a cash flow value that exceeds the net operating income.
- **Reproduction:** Set `financials.annualDebtService = -5000` via form/direct API. The metrics calculator computes cash flow as `noi - (-5000) = noi + 5000`.
- **Evidence:**
  ```typescript
  const { annual: annualCashFlow } = computeCashFlow(noi, annualDebtService);
  // inside computeCashFlow:
  // return { annual: noi - annualDebtService, ... }
  ```

---

## Lane 2: Honesty Audit

### [P2] Inconsistent Phase Status Derivation for Realized Projects
- **File/Line:** [src/lib/firebase/deals.ts:L32-L52](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/firebase/deals.ts#L32-L52) and [src/app/api/projects/route.ts:L99-L115](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/route.ts#L99-L115)
- **Description:** The function `derivePhaseFromREIStatus` converts an `reiStatus` value to a project phase. If a project is `'realized'` (denoting a completed sale exit), the status does not match any of the Title Case cases (`Target`, `In Contract`, `Acquired`, `Rehabbing`, `Under Construction`, `Renting`, `For Sale`), falling through to the `default` case and initializing the project at Phase 1: Acquisition.
- **Reproduction:** Call the POST endpoint to create a project with `reiStatus: 'realized'`. The project will be initialized in Phase 1: Acquisition instead of Phase 4: Exit.
- **Evidence:**
  ```typescript
  function derivePhaseFromREIStatus(reiStatus?: string) {
    switch (reiStatus) {
      case 'Target':
        return { phaseStatus: 'Phase 1: Acquisition', currentPhase: 1, status: 'acquisition' };
      // missing 'realized' case
      default:
        return { phaseStatus: 'Phase 1: Acquisition', currentPhase: 1, status: 'acquisition' };
    }
  }
  ```

---

## Lane 3: Security Probes

### [P0] Next.js API Routes Bypass Firestore Role Checks
- **File/Line:**
  - [src/app/api/projects/[id]/route.ts:L68-L72](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/route.ts#L68-L72)
  - [src/app/api/projects/[id]/acquisition/route.ts:L77-L86](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/acquisition/route.ts#L77-L86)
  - [src/app/api/projects/[id]/exit/route.ts:L133-L142](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/exit/route.ts#L133-L142)
  - [src/app/api/projects/[id]/hold/auto-advance/route.ts:L61-L67](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/hold/auto-advance/route.ts#L61-L67)
- **Description:** Direct updates to Firestore via the client SDK are restricted by `firestore.rules` which ensures only users with role `Lead Investor` or `General Contractor` can write/update. However, the Next.js API server routes execute updates using the Firebase Admin SDK (`adminDb`), which bypasses Firestore security rules. The endpoints verify membership using `!!projectData?.members?.[uid]` but do NOT check the user's role on the project. Thus, any project member, including restricted roles such as "Observer" or "Vendor", can mutate project financials and status fields by hitting the API routes directly.
- **Reproduction:** Log in as a user with an "Observer" role on the project. Send a PATCH request to `/api/projects/[id]` or `/api/projects/[id]/acquisition` with updated financial data. The request completes successfully with code `200` and writes the changes.
- **Evidence:**
  ```typescript
  // src/app/api/projects/[id]/route.ts:
  const isProjectMember = !!projectData?.members?.[uid];
  if (!isOwner && !teamMember && !isProjectMember) {
    return { status: 403, error: 'Access denied.' };
  }
  // Bypasses checking of role (Lead Investor / General Contractor)
  ```

---

## Lane 4: Cross-Phase Flows

### [P1] Hold to Exit Transition Lacks Server-Side Event Gating
- **File/Line:** [src/app/api/projects/[id]/hold/auto-advance/route.ts:L69-L85](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/projects/[id]/hold/auto-advance/route.ts#L69-L85)
- **Description:** Rule 14 mandates that the Hold→Exit transition is triggered automatically by verified events (first rent payment, lease activation, or sale under contract). While the client-side UI hides the transition button when no event is satisfied, the server-side `/api/projects/[id]/hold/auto-advance` endpoint does not query the database to verify if any such event exists. It blindly updates the project status to `'exit'` and currentPhase to `4` with client-supplied values.
- **Reproduction:** Send a POST request to `/api/projects/[id]/hold/auto-advance` on a project in the Acquisition or Fund phase where no rent or lease exists. The project transitions directly to Phase 4: Exit.
- **Evidence:** In `route.ts`, the handler parses the body and updates the Firestore project document immediately:
  ```typescript
  await dealRef.update({
    phaseStatus: 'Phase 4: Exit',
    currentPhase: 4,
    status: 'exit',
    financials: financialsUpdates,
    updatedAt: new Date()
  });
  ```

---

## Lane 6: Consistency

### [P3] Orphaned Debt Records on Modality Change
- **File/Line:** Firestore `/projects/{id}/loans` subcollection
- **Description:** If a project starts under "Conventional Financing" and is later changed to "All Cash", the calculations correctly ignore the loan records. However, the pre-existing loan documents are left orphaned in the `loans` subcollection instead of being deleted or marked stale.
- **Reproduction:** Set up a project under "Conventional Financing", add a loan, then switch financing to "All Cash". The loan records remain under `projects/{id}/loans/`.
- **Evidence:** The client update only writes the top-level `financingType: 'All Cash'` field, leaving the subcollection documents in Firestore unchanged.

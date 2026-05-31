# Phase Reconciliation Plan

**Author**: Upstream Copy Strategist
**Date**: 2026-05-31
**Status**: Approved (Strategist Deliverable)

This document addresses the mismatch between the legacy four-phase marketing model ("Acquisition · Purchase · Hold · Exit") and the active development metrics engine phases ("Acquisition · Transaction · Rehab · Hold/Exit" / REIL v2).

---

## 1. Inventory of Phase References in codebase

Below is the inventory of public and dashboard-related files containing legacy phase nomenclature:

| File path | Location / Component | Current legacy text | Recommended REIL v2 text |
|---|---|---|---|
| `src/app/page.tsx:181-204` | Bento Hero Process Grid | `"Acquisition"`, `"Purchase"`, `"Hold"`, `"Exit"` | `"Acquisition"`, `"Transaction"`, `"Rehab"`, `"Hold/Exit"` |
| `src/components/landing/HowItWorks.tsx:19-51` | Lifecycle Phase Cards | `"Acquisition"`, `"Purchase"`, `"Hold"`, `"Exit"` | `"Acquisition"`, `"Transaction"`, `"Rehab"`, `"Hold/Exit"` |
| `src/app/how-it-works/page.tsx:9,13` | Page Meta Metadata | `"Acquisition, Purchase, Hold, and Exit"` | `"Acquisition, Transaction, Rehab, and Hold/Exit"` |
| `src/app/about/page.tsx:22-38` | Value Grid Component | `"Acquisition"`, `"Hold"`, `"Exit"` | `"Acquisition"`, `"Transaction"`, `"Rehab"`, `"Hold/Exit"` |
| `src/components/landing/LandingFooter.tsx:32-35` | Footer Navigation Links | Links pointing to old anchors | Redirected directly to registration paths or `/how-it-works` |

---

## 2. Reconciled Phase Copy Specifications

### Phase 1: Acquisition
- **Marketing Title**: `Acquisition`
- **Sub-caption**: `Know the real numbers before you sign.`
- **Narrative Focus**: Underwriting deals, generating initial offer contracts, and calculating debt stacks (LTV, CoC).

### Phase 2: Transaction
- **Marketing Title**: `Transaction` *(Replaces "Purchase")*
- **Sub-caption**: `Never blow a contingency deadline.`
- **Narrative Focus**: Escrow tracking, earnest money deposits, title validation, and closing timelines.

### Phase 3: Rehab
- **Marketing Title**: `Rehab` *(Replaces "Hold" / scopes explicitly to renovation work)*
- **Sub-caption**: `Manage contractor draws by milestone.`
- **Narrative Focus**: GC scope of work, budget variance logs, change order approvals, and milestone draws.

### Phase 4: Hold/Exit
- **Marketing Title**: `Hold/Exit` *(Replaces "Exit" / includes carrying cost burn rate)*
- **Sub-caption**: `CPA-Ready tax exports on closing.`
- **Narrative Focus**: Prorated daily holding costs, utility logging, market valuations, and final CPA hand-offs.

---

## 3. Decision Recommendation

**Verdict**: **Launch with the new REIL v2 model immediately.**

### Rationale:
- **Prevents Double Conversion Friction**: If the marketing copy claims Phase 3 is "Hold" but the in-app experience is "Rehab", or Phase 2 is "Purchase" but the app shows "Transaction," the user experiences immediate cognitive dissonance upon login.
- **Reduces Engineering Debt**: Launching with aligned copy means developers do not have to write translation maps or support legacy endpoints (`/purchase` and `/exit` vs `/transaction` and `/hold-exit`). Aligning copy first ensures clean component construction.

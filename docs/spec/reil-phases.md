# REIL v2 Phase Specification

**Status:** Locked (Canonical Reference)
**Last Updated:** 2026-07-10
**Owner:** Architecture Team

This document is the single source of truth for the PaperWorking deal lifecycle phase model.

---

## 1  The 4-Phase REIL v2 Model

| # | Key (code) | Label (UI) | Marketing Sub-caption | Semantic Color | Hex |
|---|------------|------------|----------------------|----------------|-----|
| 1 | `acquisition` | Acquisition | Know the real numbers before you sign. | Gold/Amber | `#F59E0B` |
| 2 | `transaction` | Transaction | Never blow a contingency deadline. | Blue | `#3B82F6` |
| 3 | `rehab` | Rehab | Manage contractor draws by milestone. | Orange | `#F97316` |
| 4 | `hold_exit` | Hold/Exit | CPA-Ready tax exports on closing. | Green | `#10B981` |

> [!IMPORTANT]
> The phase model is **frozen**. No agent may rename, reorder, add, or remove phases without explicit human override.

### 1.1  Phase Narrative Focus

| Phase | What the Operator Does | Key Artifacts |
|-------|----------------------|---------------|
| Acquisition | Underwriting deals, generating initial offer contracts, calculating debt stacks (LTV, CoC, MAO). | Offer letter, comp analysis, pre-approval docs |
| Transaction | Escrow tracking, earnest money deposits, title validation, closing timelines. | Purchase contract, title commitment, loan estimate, inspection reports |
| Rehab | GC scope of work, budget variance logs, change order approvals, milestone draws. | Draw requests, receipts, permits, site visit logs |
| Hold/Exit | Prorated daily holding costs, utility logging, market valuations, CPA hand-offs. Sale or rental stabilization. | Settlement ledger, tax estimate, CPA CSV export, closing disclosure |

---

## 2  Phase Status Enum (`phaseStatusEnum`)

The schema supports both v1 legacy and v2 REIL values for backward compatibility:

### v1 Legacy (existing Firestore documents)
```
'Phase 1: Find & Fund'
'Phase 3: Holding & Rehab'
'Phase 4: Closing & Exit'
'Phase 3: Rehab & Hold'
'Phase 4: Realized'
```

### v2 REIL (new documents + migration target)
```
'Phase 1: Acquisition'
'Phase 2: Acquisition'
'Phase 2: Transaction'
'Phase 3: Rehab'
'Phase 4: Hold / Exit'
```

> [!WARNING]
> `currentPhase` is stored as a **NUMBER (1–4)** or string enum `'acquisition' | 'transaction' | 'rehab' | 'hold_exit'`. Over 40 components depend on the numeric representation. Do NOT change to string-only.

---

## 3  Deal Pipeline State Machine

Independent of the 4-phase model, each project also tracks a granular pipeline status via `dealPhases.ts`:

```
Sourcing → Under Contract → Rehab → Listed → Sold
                                          ↘ Rented
```

### Pipeline Phase Definitions

| Phase | Order | Allowed Transitions | Required Documents | Completion Gate |
|-------|-------|--------------------|--------------------|----------------|
| Sourcing | 0 | Under Contract | — | MAO calculated and accepted · Offer letter sent |
| Under Contract | 1 | Rehab | Inspection Report, Title Commitment, Loan Estimate | Signed purchase contract uploaded · Title commitment received · Hard money loan pre-approval confirmed · All due-diligence inspections completed |
| Rehab | 2 | Listed, Rented | Inspection Report | All rehab tasks marked Complete · All draw requests approved by lender · Contingency budget reconciled · Final walkthrough site visit logged |
| Listed | 3 | Sold | Appraisal Report | MLS listing active · Appraisal report uploaded |
| Sold | 4 | — | Closing Disclosure, Title Commitment | Closing disclosure verified by lawyer · Wire confirmed · Title/deed transfer recorded · Payout waterfall fully settled |
| Rented | 4 | Sold | — | Lease executed · First month rent collected |

---

## 4  Project Status Enum

```typescript
'Active' | 'Lead' | 'Under Contract' | 'Renovating' |
'Listed' | 'Sold' | 'Rented' | 'closed_won' | 'closed_lost'
```

---

## 5  Acquisition Status Sub-Machine

```
PROSPECT → OFFER_MADE → UNDER_CONTRACT → DUE_DILIGENCE →
CLEAR_TO_CLOSE → PRE_POSSESSION (optional) → OWNED
```

---

## 6  Strategy & Asset Enums

| Enum | Values |
|------|--------|
| `strategyType` | Sell · Rent · Fix & Flip · Buy & Hold |
| `assetClass` | Residential · Multi-Family · Commercial · Land |
| `financingType` | Financed · All Cash |
| `exitStrategyType` | Sell · Rent |
| `exitType` | Sale · Stabilization · Refinance |
| `rehabTier` | Staging · Minor Cosmetic · Minor Rehab · Full Rehab · Gut Renovation · Ground-Up Construction |

---

## 7  Phase-Specific UI Route Map

| Phase | Dashboard Route | Description |
|-------|----------------|-------------|
| 1 — Acquisition | `/dashboard/projects/[id]/phase-1` | Deal analyzer, MAO calc, comp logging, offer management |
| 2 — Transaction | `/dashboard/projects/[id]/phase-2` | Escrow tracking, closing checklist, due-diligence timeline |
| 3 — Rehab | `/dashboard/projects/[id]/phase-3` | Budget variance, draw management, contractor milestone tracker |
| 4 — Hold/Exit | `/dashboard/projects/[id]/phase-4` | Settlement ledger, tax estimates, CPA export, exit waterfall |

---

## 8  Legacy Phase Nomenclature (Superseded)

| Old Label | Replaced By | Notes |
|-----------|-------------|-------|
| Purchase | Transaction | Broader: covers escrow, title, earnest money lifecycle |
| Hold | Rehab | Scoped explicitly to renovation work |
| Exit | Hold/Exit | Includes carrying cost burn rate + exit execution |
| Find & Fund | Acquisition | Marketing-aligned with operator language |

Any occurrence of legacy labels in UI, copy, or code comments should be updated to REIL v2 on contact.

---

## Source of Truth Files

| File | Path |
|------|------|
| Deal Phases Constants | `src/lib/constants/dealPhases.ts` |
| Phase Status Enum | `src/lib/schemas/projectSchema.ts` (lines 53–66) |
| Phase Snapshots Types | `src/types/schema.ts` (lines 9–43) |
| Phase Reconciliation | `docs/copy/phase-reconciliation.md` |
| REIL KanBan Board | `src/components/projects/REILKanBan.tsx` |
| Phase Progress Tracker | `src/components/project/PhaseProgressTracker.tsx` |

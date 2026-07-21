# REIL v2 Phase Specification

**Status:** Locked (Canonical Reference)
**Last Updated:** 2026-07-12
**Owner:** Architecture Team

This document is the single source of truth for the PaperWorking deal lifecycle phase model.

---

## 1  The 4-Phase REIL v2 Model

| # | Key (code) | Label (UI) | Marketing Sub-caption | Semantic Color | Hex |
|---|------------|------------|----------------------|----------------|-----|
| 1 | `acquisition` | Acquisition | Know the real numbers before you sign. | Gold/Amber | `#F59E0B` |
| 2 | `fund` | Fund | Capital raise, financing, and closing room. | Blue | `#3B82F6` |
| 3 | `hold` | Hold | Renovation budget, holding costs, and operations. | Orange | `#F97316` |
| 4 | `exit` | Exit | Sale, settlement, and realized ROI. | Green | `#10B981` |

> [!IMPORTANT]
> The phase model is **frozen**. No agent may rename, reorder, add, or remove phases without explicit human override.

### 1.1  Phase Narrative Focus

| Phase | What the Operator Does | Key Artifacts |
|-------|----------------------|---------------|
| Acquisition | Underwriting deals, generating initial offer contracts, calculating debt stacks (LTV, CoC, MAO). | Offer letter, comp analysis, pre-approval docs |
| Fund | Escrow tracking, capital raise room, title validation, financing, earnest money deposits, closing timelines. | Purchase contract, title commitment, loan estimate, lender approvals |
| Hold | GC scope of work, budget variance logs, change order approvals, milestone draws, renovation progress, monthly utility/holding cost logging. | Draw requests, receipts, permits, site visit logs, carrying cost periods |
| Exit | Property valuations, listing management, CPA hand-offs, sale settlement, cash payout waterfalls. | Settlement ledger, tax estimate, CPA CSV export, closing disclosure |

---

## 2  Phase Status Enum (`phaseStatusEnum`)

The schema supports both v1 legacy and v2/v3 REIL values for backward compatibility:

### v1 Legacy (existing Firestore documents)
```
'Phase 1: Find & Fund'
'Phase 3: Holding & Rehab'
'Phase 4: Closing & Exit'
'Phase 3: Rehab & Hold'
'Phase 4: Realized'
```

### v2/v3 REIL (new documents + migration target)
```
'Phase 1: Acquisition'
'Phase 2: Fund'
'Phase 3: Hold'
'Phase 4: Exit'
```

> [!WARNING]
> `currentPhase` is stored as a **NUMBER (1–4)** or string enum `'acquisition' | 'fund' | 'hold' | 'exit'`. Over 40 components depend on the numeric representation. Do NOT change to string-only.

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
| 2 — Fund | `/dashboard/projects/[id]/phase-2` | Escrow tracking, closing checklist, due-diligence timeline |
| 3 — Hold | `/dashboard/projects/[id]/phase-3` | Budget variance, draw management, contractor milestone tracker |
| 4 — Exit | `/dashboard/projects/[id]/phase-4` | Settlement ledger, tax estimates, CPA export, exit waterfall |

---

## 8  Legacy Phase Nomenclature (Superseded)

| Old Label | Replaced By | Notes |
|-----------|-------------|-------|
| Transaction | Fund | Focuses on capital raise, closing, and funding execution |
| Rehab | Hold | Reflects the broader asset hold/renovation period |
| Hold/Exit | Exit | Focuses explicitly on final property liquidation or stabilization |

Any occurrence of legacy/proposal labels in UI, copy, or code comments should be updated to REIL v3 on contact.

---

## Source of Truth Files

| File | Path |
|------|------|
| Deal Phases Constants | `src/lib/constants/dealPhases.ts` |
| Phase Status Enum | `src/lib/schemas/projectSchema.ts` (lines 53–66) |
| Phase Snapshots Types | `src/types/schema.ts` (lines 9–43) |
| REIL KanBan Board | `src/components/projects/REILKanBan.tsx` |
| Phase Progress Tracker | `src/components/project/PhaseProgressTracker.tsx` |

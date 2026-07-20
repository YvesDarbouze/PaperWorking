# REIL Dual-Write Ledger Specification

This document lists every mirrored database/schema field pair in the PaperWorking project, designates the canonical source of truth for each pair, and defines the access contract for reading and writing these fields.

## Mirrored Pairs & Canonical Mapping

| Canonical Field (Cents/Enums) | Legacy Mirror Field (Dollars/Aliases) | Design Option / Type | Canonical Source of Truth |
|-------------------|-----------------------------|----------------------|---------------------------|
| `rehab_budget` | `rehabBudget` | `number` (Cents vs. Dollars) | **Canonical (`rehab_budget`)** |
| `renovation_tier` | `rehabTier` | `enum` (RehabTier) | **Canonical (`renovation_tier`)** |
| `rehab_completion_target` | `rehabDoneDate` (As Target) | `Date` / `any` | **Canonical (`rehab_completion_target`)** |
| `rehab_completed_date` | `rehabDoneDate` (As Actual) | `Date` / `any` | **Canonical (`rehab_completed_date`)** |
| `holding_cost_tax` | `holdingCostTaxes` | `number` (Cents vs. Dollars) | **Canonical (`holding_cost_tax`)** |
| `holding_cost_insurance` | `holdingCostInsurance` | `number` (Cents vs. Dollars) | **Canonical (`holding_cost_insurance`)** |
| `holding_cost_maintenance` | `holdingCostMaintenance` | `number` (Cents vs. Dollars) | **Canonical (`holding_cost_maintenance`)** |
| `holding_cost_utilities` | `holdingCostUtilities` | `number` (Cents vs. Dollars) | **Canonical (`holding_cost_utilities`)** |
| `holding_cost_management` | `holdingCostManagement` | `number` (Cents vs. Dollars) | **Canonical (`holding_cost_management`)** |
| `holding_cost_hoa` | `hoaMonthly` | `number` (Cents vs. Dollars) | **Canonical (`holding_cost_hoa`)** |

## Read/Write Contract

1. **Reads**: All read operations across all dashboards, metrics engines, and reports MUST query the **Canonical** field. Legacy mirror fields are deprecated for reads.
2. **Writes (Dual-Write)**: All write operations (state updates, Firestore writes, form submissions) MUST update both the Canonical and Legacy fields simultaneously to ensure backward compatibility. Legacy fields are write-only.

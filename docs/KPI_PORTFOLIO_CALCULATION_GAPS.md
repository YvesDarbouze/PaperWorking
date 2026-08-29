# KPI / Portfolio Calculation Gaps

**Sprint:** 2 P2-6  
**Rule:** Do not invent business formulas. Prefer `null` / `unavailable` / `incomplete`.

---

## Metrics inventory

| Metric | Current implementation | Source data | Missing formula/data | Impact | Recommended implementation |
|--------|------------------------|-------------|----------------------|--------|----------------------------|
| Project `purchasePrice` | Returned as stored Prisma value | `Project.purchasePrice` | None for raw field | Low | Keep |
| Project `estimatedArv` | **Was** `purchasePrice * 1.25`; now `null` + `estimatedArvStatus: unavailable` | None | Real ARV / comps / AVM | High if faked | Wire RentCast/AVM or underwriting worksheet when product-approved |
| Project `estimatedEquity` | **Was** `×0.25`; now unavailable | None | Equity = ARV − debt − costs (unknown) | High if faked | Financial-engine + liabilities |
| Project `estimatedCashNeeded` | **Was** `×0.2`; now unavailable | None | Cash-to-close formula unknown | High if faked | Closing worksheet inputs |
| Project `currentPhase` | Phase number → name via repo | `Project.currentPhase` | Naming mapping only | Low | Keep |
| Portfolio `totalPurchasePrice` | Sum of accessible projects' purchase prices | Prisma projects in ACL scope | None | Low | Keep |
| Portfolio `estimatedPortfolioValue` | **Was** `total * 1.15`; now `null` + status unavailable | None | Portfolio valuation model | High if faked | Mark-to-model / AVM rollup |
| Portfolio `byPhase` / `activeCount` | Counts from phase/status | Project rows | None | Low | Keep |
| Insights `averagePurchasePrice` / `totalExposure` | Avg/sum of purchase prices | ACL-scoped projects | Exposure may need debt | Medium | Clarify definition vs debt-adjusted |
| Insights `topCities` / phase trends | Aggregates from project fields | city, currentPhase | None | Low | Keep |
| Reports period `transactions` / totals | Empty ledger stub | No Transaction table in Wave-1 | Ledger schema + ingest | High (empty) | Add transactions or keep honest empty |
| Reports `purchaseVolume` | Sum purchase prices in period window (window is calendar heuristic) | Projects | Period filter not based on tx dates | Medium | Real period from transactions |

---

## User-facing honesty

- KPI endpoint sets `incomplete: true` and `*Status: 'unavailable'` for invented fields.
- Portfolio metrics set `estimatedPortfolioValue: null` and `estimatedPortfolioValueStatus: 'unavailable'`.
- Do **not** present multiplier heuristics as production ARV/equity.
- **FE (2026-08-28):** `ProjectFolderCard` Est. Exit no longer uses `purchasePrice * 1.25`. Shows real `estimatedExitValue` or **Unavailable**.

---

## Follow-up (not this sprint)

1. Product-approved formulas for ARV / equity / cash-needed.
2. Wire `@paperworking/financial-engine` with real inputs.
3. Transaction ledger for period reports.
4. Event-id idempotency store for Stripe (separate from KPI).

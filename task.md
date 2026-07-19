# Phase 4 - Exit Tasks

## Sale under contract → closed (E1.S)
- [x] 1. Add fields to `ProjectFinancials` schema interface in `src/types/schema.ts`
- [x] 2. Update Zod validation in `src/lib/schemas/projectSchema.ts` for the new fields
- [x] 3. Create `src/components/project/SaleOperationsCard.tsx` component
- [x] 4. Render `SaleOperationsCard` under the Sell strategy path in `phase-4/page.tsx`
- [x] 5. Create unit test suite `src/__tests__/saleOperationsCard.test.tsx` verifying listed, under contract (contingencies tracker), and closed states
- [x] 6. Run compile checks and verify all tests pass successfully

## Operating actuals & Plaid expense feeds (E2.1)
- [x] 1. Add opex category arrays to `ProjectFinancials` schema in `src/types/schema.ts`
- [x] 2. Update Zod validation in `src/lib/schemas/projectSchema.ts`
- [x] 3. Update core financial metrics calculations in `src/lib/metrics/reiMetrics.ts` to compute actual NOI, actual OER, actual Rent and actual rehab spends from these arrays
- [x] 4. Create `src/components/project/OperatingActualsCard.tsx` dashboard component with categorized opex selectors, Plaid smart proposals (supporting BUG-8 gross scheduled PM fee calculations), manual entry tools, and expense tables
- [x] 5. Render `OperatingActualsCard` under both Rent and Lease strategy paths in `phase-4/page.tsx`
- [x] 6. Create unit test suite `src/__tests__/operatingActualsCard.test.tsx` asserting opex ledger operations and calculations
- [x] 7. Verify all compile checks and tests pass cleanly

## Value updates & Appreciation tracker (E3.1)
- [x] 1. Render `CurrentValueTracker` component inside the Rent and Lease paths of Phase 4 exit page `phase-4/page.tsx`
- [x] 2. Add valuation handlers `handleAddValuation` and `handleDeleteValuation` to `phase-4/page.tsx` to save entries to the `current_value` dated series and sync them with Firestore
- [x] 3. Create unit test suite `src/__tests__/currentValuePhase4.test.tsx` verifying that adding and deleting valuations calculates appreciation rates correctly
- [x] 4. Ensure tsc compiles clean and full test suite remains green

## Actual scorecard (E3.2)
- [x] 1. Create a dedicated `ActualScorecard` component that compares projected vs actual metrics side-by-side
- [x] 2. Set up dynamic metrics based on exit strategy (Rent/Lease vs Sell) with live variance badges
- [x] 3. Label IRR as "Projected IRR" (live) or "Actual IRR" (realized) based on project sale status
- [x] 4. Create unit tests for `ActualScorecard` component and verify that everything compiles and passes cleanly

## Archive (E3.3)
- [x] 1. Add E3.3 permanent categories (`Title Policy`, `Closing Sets`, `Warranties`, `Tax Documents`) to `DocumentCategory` union type in `src/types/schema.ts`
- [x] 2. Update `DocumentVault` render in `phase-4/page.tsx` with these canonical permanent categories
- [x] 3. Create unit test suite `src/__tests__/permanentRecordArchive.test.tsx` verifying category slot rendering, uploading, and deleting
- [x] 4. Verify all tests pass cleanly and type checker is green

## Sale Completion & Equity Distributions (E1.S / Decision F-1)
- [x] 1. Import and render `CrowdfundingReconciliation` upon sale realization in `phase-4/page.tsx`
- [x] 2. Append Decision F-1 disclaimer to `CrowdfundingReconciliation` footer to record movements off-platform
- [x] 3. Render a *Reinvestment Notice* explaining that reinvestment is tracked at the portfolio level rather than inside this project
- [x] 4. Re-label banners and headers to transition project state visually to "Project Complete"
- [x] 5. Create unit test suite `src/__tests__/saleCompletionReinvestment.test.tsx` asserting distribution outputs and Decision F-1 footer compliance
- [x] 6. Confirm tsc builds cleanly and jest runs green

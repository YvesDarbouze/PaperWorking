# Walkthrough: Agent 4 — Tax Datapoint Engine & Document Automation

## Summary of Accomplishments

Agent 4 constructed the 10-datapoint collection engine (D1 to D10), real estate tax calculation logic (quarterly P&L, 1040-ES, safe harbor, Schedule E, MACRS 27.5-yr depreciation, adjusted basis capital gains, 1031 exchange compliance, 1099-NEC thresholds), PDF tax form generator (Form 1040-ES, Schedule E, Form 4562, Schedule D, Form 8825, 1099-NEC, 1099-MISC), quarterly/year-end tax workflows, and 3-year IRS recordkeeping deletion protection.

---

## 1. Datapoint Collection Schema (`/src/lib/tax/datapoint-schema.ts`)

Wired 10 core datapoints for project-level and portfolio-level aggregation:
- **D1. Acquisition Metrics**: `deal_source`, `offers_sent`, `offer_acceptance_rate`, `crowdfunding_raised`, `investor_count`, `entity_formation_costs`.
- **D2. Purchase Metrics**: `purchase_price`, `closing_costs`, `loan_origination_fees`, `title_insurance`, `appraisal_fee`, `inspection_cost`, `attorney_fees`, `recording_fees`.
- **D3. Hold Metrics**: `rehab_labor`, `rehab_materials`, `rehab_permits`, `monthly_mortgage`, `monthly_insurance`, `monthly_property_tax`, `monthly_utilities`, `monthly_hoa`, `monthly_maintenance`, `rental_income`, `vacancy_months`, `property_mgmt_fees`, dates.
- **D4. Exit Metrics**: `sale_price`, `sale_date`, `marketing_costs`, `staging_costs`, `realtor_commission`, `buyer_concessions`, `holding_days_total`, `exit_strategy`.
- **D5. Quarterly Estimated Tax (1040-ES)**: `quarterly_net_income`, `estimated_tax_rate`, `prior_year_safe_harbor`, `prior_year_agi`, `payment_due_dates` `[Apr 15, Jun 15, Sep 15, Jan 15]`.
- **D6. Schedule E**: `rental_income_received`, `mortgage_interest_paid`, `property_tax_paid`, `insurance_premium`, `repairs_maintenance`, `depreciation_amount`, `other_expenses`.
- **D7. Depreciation (Form 4562)**: `property_basis`, `land_value`, `depreciable_basis`, `placed_in_service_date`, `method` (MACRS 27.5yr / 39yr), `annual_depreciation`, `capital_improvements`.
- **D8. Capital Gains / 1031 Exchange (Schedule D, Form 8825)**: `adjusted_basis`, `amount_realized`, `capital_gain_loss`, `holding_period_months`, `long_term_flag`, `replacement_property_1031`, `identified_date_1031`, `form_8825_income`, `form_8825_expenses`.
- **D9. Information Returns (1099 Series)**: `form_1099s_proceeds`, `contractors_paid`, `form_1099nec_required` (>$600), `form_1099misc_rent_paid`, `form_1098_mortgage_interest`, `form_1098_points`.
- **D10. Team/Vendor Costs**: `vendor_payments`.

---

## 2. Tax Calculation Engine (`/src/lib/tax/calculator.ts`)

- **Quarterly P&L**: Sums income minus itemized operating expenses per quarter.
- **Form 1040-ES & Safe Harbor**:
  - Calculates estimated tax due (`quarterly_net_income * tax_rate`).
  - Evaluates Safe Harbor qualification (100% or 110% multiplier if prior year AGI > $150k).
- **Schedule E**: Supplemental rental net income or loss calculation.
- **Form 4562 Depreciation**: MACRS 27.5-year residential straight-line depreciation excluding 20% land allocation.
- **Schedule D Capital Gains & Adjusted Basis**:
  - `Adjusted Basis = Purchase Price + Closing Costs + Rehab + Capital Improvements - Depreciation Taken`.
  - Classifies short-term (<12 mos, ordinary income) vs long-term (>=12 mos, capital gains rate).
- **1031 Exchange Rule Engine**: Evaluates 45-day identification window & 180-day closing rule for tax deferral compliance.
- **1099-NEC Thresholds**: Flagging contractor payments exceeding $600.

---

## 3. Document Automation (`/src/lib/tax/document-generator.ts`)

- PDFKit-powered generator producing clean IRS form worksheets & summary PDFs:
  - **Form 1040-ES** (Payment voucher & quarterly schedule)
  - **Schedule E** (Page 1 supplemental rental income & loss)
  - **Form 4562** (Depreciation and amortization schedule)
  - **Schedule D** (Form 8949 capital gains attachment)
  - **Form 8825** (Partnership / LLC rental income)
  - **Form 1099-NEC & 1099-MISC**
- PDF documents returned as binary Buffer stream for download and vault storage.

---

## 4. Tax Workflows & Recordkeeping (`/src/lib/tax/workflows.ts`)

- **Quarterly 1040-ES Workflow**: Detects quarter end and prompts user (`"Q[X] estimated tax payment of $[amount] due [date]. Generate 1040-ES?"`).
- **Year-End Package Workflow**: Auto-generates package manifest and alert (`"Your [Year] tax package is ready. [X] forms generated, [Y] 1099s need to be sent."`).
- **Recordkeeping Compliance (`enforceTaxRetention`)**: Blocks deletion of tax-relevant documents under 3 years old (`3 * 365 * 24 * 60 * 60 * 1000` ms lock).

---

## Deliverables & Files Created

| File Path | Purpose |
|---|---|
| [`src/lib/tax/datapoint-schema.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/tax/datapoint-schema.ts) | 10-datapoint collection schema (D1–D10) for project and portfolio level aggregation |
| [`src/lib/tax/calculator.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/tax/calculator.ts) | Real estate tax calculation engine for 1040-ES, Safe Harbor, Schedule E, MACRS depreciation, Capital Gains, and 1031 exchanges |
| [`src/lib/tax/document-generator.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/tax/document-generator.ts) | Automated PDF document generator for Form 1040-ES, Schedule E, Form 4562, Schedule D, 8825, and 1099-NEC |
| [`src/lib/tax/workflows.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/tax/workflows.ts) | Quarterly tax detection, year-end package generation, and 3-year recordkeeping deletion protection |
| [`src/app/api/tax/1040-es/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/tax/1040-es/route.ts) | API route returning downloadable Form 1040-ES PDF document |
| [`src/app/api/tax/package/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/tax/package/route.ts) | API route for automated year-end tax package generation |
| [`src/lib/tax/__tests__/calculator.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/tax/__tests__/calculator.test.ts) | Jest unit test suite for tax calculator engine (8 unit tests covering all 10 datapoint groups) |
| [`src/lib/tax/__tests__/document-generator.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/tax/__tests__/document-generator.test.ts) | Jest unit test suite verifying PDF document generation for 1040-ES, Schedule E, Form 4562, and Schedule D |
| [`e2e/tax-document-generation.spec.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/e2e/tax-document-generation.spec.ts) | Playwright E2E test verifying 1040-ES PDF generation and Schedule E year-end tax package workflows |
| [`docs/walkthroughs/AGENT-04-tax-engine.md`](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/walkthroughs/AGENT-04-tax-engine.md) | Agent 4 walkthrough evidence document |

---

## Verification Evidence

```bash
# 1. TypeScript Type Check
$ npx tsc --noEmit --skipLibCheck
Exit Code: 0 (Clean)

# 2. Jest Unit Tests
$ npx jest src/lib/tax/__tests__/calculator.test.ts src/lib/tax/__tests__/document-generator.test.ts
PASS src/lib/tax/__tests__/calculator.test.ts
PASS src/lib/tax/__tests__/document-generator.test.ts

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
Time:        0.313 s

# 3. Playwright E2E Test Suite
$ npx playwright test e2e/tax-document-generation.spec.ts
Running 1 test using 1 worker
  ✓  1 [chromium] › e2e/tax-document-generation.spec.ts:80:7 › Agent 4: Tax Datapoint Engine & Document Automation E2E › Generates 1040-ES PDF document and triggers year-end Schedule E tax package (3.1s)
1 passed (3.8s)
```

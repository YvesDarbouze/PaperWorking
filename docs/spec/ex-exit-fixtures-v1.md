# EX EXIT FIXTURES v1 — Locked Fixture Definitions

**Status:** Locked. Source of truth for Exit phase calculations and test assertions.
**Governing Authorities:** `SKILL.md` (unified 2026-07-18) · `docs/spec/reil-33-metrics-collection-matrix.md` · `docs/spec/ex-series-40-exit-prompts-v1.md`

---

## SECTION 1 — LOCKED INPUT FIXTURES

### EXX-1: Standard Single-Family Rental Operations (Golden Fixture)
- **Property:** 1042 Maple Ave (Single Family Residential)
- **Purchase Price:** $279,000
- **Down Payment:** 20% ($55,800) | **Cash Invested:** $60,000 (including closing costs)
- **Financing:** $223,200 @ 6.5% interest, 30-year fixed
- **Monthly Debt Service:** $1,410.79 ($16,929.48/yr)
- **Gross Scheduled Rent:** $1,950/mo ($23,400/yr)
- **Operating Expenses (Schedule E Actuals):**
  - `tax`: $2,800
  - `insurance`: $1,200
  - `management`: $2,340 (10% of gross scheduled rent)
  - `maintenance`: $2,340 (10% of gross scheduled rent)
  - `HOA`: $1,200
  - `capex`: $1,034
  - `utilities`: $0
  - `security`: $0
  - **Total OpEx:** $10,914

### EXX-2: Multi-Family Rent Roll & Occupancy
- **Property:** 412 Oak Street (4-Unit Multi-Family)
- **Purchase Price:** $520,000
- **Gross Potential Rent:** $1,200/mo × 4 units = $4,800/mo ($57,600/yr)
- **Actual Rent Receipts:** 3 units occupied 12 mos, 1 unit vacant for 2 mos ($46,800 + $8,400 = $55,200)
- **Realized Occupancy:** 46 unit-months occupied ÷ 48 total unit-months = **95.83%**
- **Operating Expenses:** $18,400/yr
- **Actual NOI:** $36,800/yr

### EXX-3: Triple-Net (NNN) Commercial Lease
- **Property:** 800 Commercial Blvd (Retail / Office)
- **Purchase Price:** $850,000
- **Base Rent:** $3,750/mo ($45,000/yr)
- **NNN Reimbursements:** $1,000/mo ($12,000/yr for taxes, insurance, maintenance paid by tenant)
- **Landlord OpEx:** $0 (fully reimbursed)
- **Actual NOI:** $45,000/yr

### EXX-4: Property Sale & Disposition
- **Property:** 1042 Maple Ave (Post-Hold Sale)
- **Sale Price:** $340,000
- **Selling Costs:** 6% broker commission + closing fees = $23,800
- **Mortgage Payoff Balance:** $210,000
- **Net Sale Proceeds:** $340,000 − $23,800 − $210,000 = **$106,200**
- **Initial Cash Invested:** $60,000
- **Hold Duration:** 3 Years

### EXX-5: Retrospective Mode Streamlined Intake
- **Property:** 714 Pine Street
- **Historical Purchase Price:** $200,000 (2021)
- **Renovation Cost:** $30,000
- **Current Debt Balance:** $140,000 @ 4.0% interest ($668.38/mo)
- **Current Rent:** $2,000/mo ($24,000/yr)
- **OpEx:** $8,000/yr

---

## SECTION 2 — EXPECTED OUTPUT DERIVATIONS (`deriveAllProjectMetrics`)

### EXX-1 Expected Outputs (Golden-File Validation)
- **Actual NOI:** $23,400 − $10,914 = **$12,486**
- **Actual Cap Rate:** $12,486 ÷ $279,000 = **4.5%**
- **Actual Annual Debt Service:** **$16,929.48**
- **Actual Cash Flow:** $12,486 − $16,929.48 = **−$4,443.48**
- **Actual DSCR:** $12,486 ÷ $16,929.48 = **0.74**
- **Actual Cash-on-Cash Return:** −$4,443.48 ÷ $60,000 = **−7.41%**
- **Actual Expense Ratio:** $10,914 ÷ $23,400 = **46.64%**

### EXX-2 Expected Outputs
- **Actual Occupancy:** **95.83%**
- **Actual NOI:** **$36,800**
- **Actual Cap Rate:** $36,800 ÷ $520,000 = **7.08%**

### EXX-3 Expected Outputs
- **Actual NOI:** **$45,000**
- **Actual Cap Rate:** $45,000 ÷ $850,000 = **5.29%**
- **Expense Ratio:** **0.00%**

### EXX-4 Expected Outputs
- **Net Disposition Proceeds:** **$106,200**
- **Total Net Profit:** ($106,200 + net operating cash flows) − $60,000
- **Final Actual IRR:** **18.4%**
- **Equity Multiple:** 2.22x

### EXX-5 Expected Outputs
- **Retrospective NOI:** $24,000 − $8,000 = **$16,000**
- **Cap Rate on Cost:** $16,000 ÷ $230,000 = **6.96%**
- **Actual Cash Flow:** $16,000 − $8,020.56 = **$7,979.44**

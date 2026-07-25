# reil-registry.md — Variable Registry & 33-Metric Collection Matrix (CANONICAL)
### The document AQ/DA prompts reference as "the 33-Metric Matrix." Part 2 defines the registry taxonomy. Commit to docs/spec/ alongside reil-metrics.md, reil-schema.md, reil-phases.md, reil-dod.md, reil-copy.md.

---

## Part 1 — Design principles

**P1. One variable, one home.** Every atomic input has exactly one canonical registry variable. Duplicates found in code (e.g., four rent variants) are migration targets: pick the canonical per Part 2, migrate readers, delete the rest.

**P2. Projected → Actual (A→U) lifecycle.** Variables born as assumptions in Acquisition are actualized by real events later (closing, spend, rent, sale). Such variables carry BOTH a `projected` and an `actual` slot. Pro-forma-vs-actual comparison is a product feature; the slots are its substrate.

**P3. Compute, never ask.** All 33 metrics are outputs of `deriveAllProjectMetrics`. Zero metrics are user-entered or stored as fields. Stored metric fields found in code are stale-by-design: derive, then delete the field.

**P4. Documents are data sources.** Settlement statements, loan notes, leases, tax bills carry multiple variables; ask for the document once, confirm extracted fields.

**P5. Ledgers, not fields.** Recurring metrics compute from three ledgers: Income Ledger (Exit), Expense Ledger (Hold/Exit; Plaid-fed), Tenant/Lease Registry (Exit).

**P6. Expense basis (LOCKED — golden-file provenance).** Management and maintenance defaults compute as % of GROSS SCHEDULED RENT, not effective rent. This basis is what reproduces the locked DEMO_FINANCIALS outputs: gross rent basis → management $2,340 + maintenance $2,340 → NOI **$12,486** → Cap **4.5%** ($12,486 ÷ $279,000) → debt service ≈ $16,930 ($223,200 @ 6.5%/30yr) → Cash Flow **−$4,444** → DSCR **0.74** → COC **−7.41%** (≈$60,000 cash invested). UI labels must state the basis: "Management (% of gross scheduled rent)." The spec wording, not these numbers, was the defect; any text implying effective-rent basis is superseded by this section.

---

## Part 2 — Registry taxonomy (the concepts AQ-1 builds)

**Every registry row:**
- `key` — canonical variable name (one home per P1)
- `project_id` — owning Project
- `scenario_id` — nullable; null = the Deal's active/canonical values (DA-5 scenarios set it)
- `source` — one of: `user_assumption` | `user_actual` | `document` | `derived` | `plaid`
- `projected` / `actual` — dual value slots where the lifecycle column below marks **A→U**; single-slot otherwise
- `unit_id` — nullable linkage for per-unit variables (rent rolls, unit expenses)
- timestamps; document attachment reference where source = `document`

**Canonical expense category tags (Schedule E-aligned, exhaustive):** `tax` · `insurance` · `security` · `maintenance` · `utilities` · `management` · `HOA` · `capex`.

### Group 1 — Property Identity *(Acquisition Col. 1; single-slot)*
address, APN, county, property_type, units, sqft, lot_size, year_built, condition, subject_listing_date/DOM.

### Group 2 — Income *(A→U)*
gross_rent_per_unit, other_income, vacancy_pct. Projected: AQ-12. Actualized: Income Ledger / Tenant Registry.

### Group 3 — Operating Expenses *(A→U; the eight tags)*
Projected: AQ-13 (insurance upgraded by AQ-26 quote, source `document`). Actualized: Expense Ledger. Basis per P6.

### Group 4 — Deal & Capital
asking_price (AQ-5) · offer_price (AQ-18) · agreed_price (AQ-20) · contract_price (AQ-21, `document`) · **actual purchase_price, closing_costs, cash_to_close, acquisition_date, commissions** (Fund Closing Capture, `document`) · loan_amount/rate/amortization/term (A→U: AQ-14 assumption → Fund loan docs) · current_value (purchase price → appraisal → annual re-valuation) · earnest_money (AQ-22).

### Group 5 — Capital Improvements *(A→U)*
rehab_budget (AQ-11, by the five scope tiers) → Renovation Spend Log actuals (Hold).

### Group 6 — Disposition & Leasing Events
own_listing_date, showings_count (Hold ads) · under_contract_date / lease_signed_date (Exit trigger) · sale_price, sale_commission, net_proceeds, sale_date (Exit Sale Closing Capture, `document`) · lease terms, move-ins/outs/renewals (Tenant Registry).

### Group 7 — Market & Compliance
comps[] (AQ-9) · market snapshot + hazard flags (AQ-7) · compliance checklist items (seeded AQ-21–26, refreshed Hold/Exit) · buy-box thresholds + verdict + override reason (AQ-16).

---

## Part 3 — The 33-Metric Matrix (metric → inputs → collection → actualization)

All formulas per reil-metrics.md; this matrix maps inputs to homes. **Bold** = requires a later-phase instrument.

| # | Metric | Inputs (Group) | Projected at | Actualized by |
|---|---|---|---|---|
| 1 | NOI | G2 income − G3 OpEx (basis P6) | AQ-12/13 | Income + Expense Ledgers |
| 2 | Cap rate | #1 ÷ current_value (G4) | AQ-15 | Appraisal → re-valuation |
| 3 | Cash-on-cash | #5 ÷ (cash_to_close + closing_costs + rehab actuals) | AQ-15 | **Closing Capture** + Spend Log |
| 4 | IRR | dated series: outlay (G4) + net flows (ledgers) + terminal (sale/current value) | AQ-15 | Continuous; final at sale |
| 5 | Cash flow | income − expenses − debt service − capex | AQ-15 | Ledgers + amortization |
| 6 | GRM | price ÷ gross annual rent | AQ-8 | Income Ledger |
| 7 | DSCR | #1 ÷ debt service (amortization from G4 loan) | AQ-15 | Fund loan actuals |
| 8 | LTV | loan balance ÷ current_value | AQ-15 | Amortization + re-valuation |
| 9 | OER | OpEx ÷ GOI | AQ-15 | Ledgers |
| 10 | Equity-to-value | inverse of #8; zero new inputs | AQ-15 | same |
| 11 | Interest coverage | #1 ÷ interest split (amortization) | Fund | Loan statements/Plaid |
| 12 | ROI | net return ÷ total invested | AQ-15 | Final at **Sale Closing Capture** |
| 13 | CapEx | Spend Log + capex-tagged ledger (product definition; PP&E accounting formula not used) | AQ-11 | **Renovation Spend Log** |
| 14 | GOI | potential rent + other income | AQ-12 | Income Ledger |
| 15 | AAR | total net return ÷ years (acquisition_date →) | — | Closing Capture starts clock |
| 16 | Equity multiple | (profit + investment) ÷ cash invested | AQ-15 | Sale Closing Capture |
| 17 | Revenue growth | Income Ledger period-over-period (needs ≥2) | — | Exit yr 2 |
| 18 | Occupancy | occupied ÷ units (G1) | AQ-12 (1 − vacancy) | **Tenant Registry** |
| 19 | Tenant turnover | vacated-&-re-leased ÷ avg units | — | Tenant Registry |
| 20 | Avg rent/property | portfolio income ÷ project count | — | Insights aggregate |
| 21 | Renewal rate | renewals ÷ leases up | — | Tenant Registry |
| 22 | Maintenance/unit | maintenance-tag ÷ units | AQ-13 | Expense Ledger |
| 23 | DOM | (a) subject: G1 · (b) own listing: G6 dates | AQ-5 | **Ads card → Exit** |
| 24 | Construction $/sqft | Spend Log ÷ sqft | AQ-11 | Spend Log |
| 25 | Portfolio value growth | dated re-valuations across Projects | — | **Annual Re-Valuation** |
| 26 | Payback period | cash invested ÷ annual net income | AQ-15 | Ledgers |
| 27 | YoY avg sold price | comps by year (G7) + own sales | AQ-9 | Market Pulse + sale records |
| 28 | Sold/inventory | market data — **DEFERRED**; return null + `MARKET_DATA_DEFERRED` | — | — |
| 29 | Demand growth | market data — **DEFERRED**; same code | — | — |
| 30 | Listing-to-meeting | showings ÷ listings (G6) | — | Ads card |
| 31 | Avg commission/sale | commissions ÷ sales | — | Sale Closing Captures |
| 32 | Risk score | composite: DSCR/LTV bands (fin) · hazard+market (mkt) · occupancy+maintenance trend (ops) · #33 (compliance); bands 1/3/5 averaged; constants in one config | AQ-30 gate | Recomputed each gate |
| 33 | Compliance rate | compliant ÷ total checklist items (G7) | AQ Col. 5 | Hold/Exit checklist |

---

## Part 4 — Reconciliation directives for the AQ-1 audit findings

1. **Duplicate fields (4 rent, 2 vacancy, 4 maintenance):** the canonical home is the Group 2/3 variable above. Migrate all readers to it, backfill values (prefer the field the locked outputs were computed from), delete duplicates. Report the mapping old→canonical per field.
2. **Stored metrics:** derive via `deriveAllProjectMetrics`, delete the stored fields after readers migrate.
3. **3 NOI + 3 MAO formulas:** canonical NOI per reil-metrics.md #1 with basis P6; canonical MAO = ARV × 0.70 − rehab (SALE guidance only). Migrate, delete the others. Golden-file check (P6 values) is the arbiter that reconciliation landed.
4. **Fake DSCR/Debt Yield in production:** Honesty Rule violation. Before the registry build proceeds, report WHICH user-facing surfaces render these values so the Lead can decide on an immediate hotfix. Debt Yield is not one of the 33 — if the surface stays, it computes properly in the single function or is removed.
5. **Agent's proposed group mapping:** reconcile against Part 2 above and report DELTAS ONLY. Where the proposal and this document differ, this document wins; where the proposal covers fields this document doesn't name, propose the group assignment for approval.

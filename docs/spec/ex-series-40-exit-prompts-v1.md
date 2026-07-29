# EX SERIES v1 — 40 Exit-Phase Dispatches for Antigravity (EX-0 … EX-40)

**Status:** COMMITTED & AUTHORITATIVE. `docs/spec/ex-series-40-exit-prompts-v1.md` is committed to `docs/spec/` and is the sole specification authority for all EX Series dispatches (EX-1…EX-40). Where any working draft or research document differs from this committed file, this file WINS.
**Companion documents:** `fd-series-40-fund-prompts.md`, `aq-series-30-acquisition-prompts.md`, `hd-series-40-hold-prompts-v1.md`
**Governing authorities:**
- `SKILL.md` (unified 2026-07-18)
- `docs/spec/reil-complete-four-phase-questions-tasks.md` (card-level authority)
- `docs/spec/reil-33-metrics-collection-matrix.md` (variable registry & 33 metrics matrix)

---

## SEQUENCING LAW & DISPATCH RULES

1. **One dispatch at a time.** A dispatch is sent ONLY when its `DISPATCH WHEN` condition is satisfied by a founder verdict on the prior evidence bundle.
2. **Dead-on-arrival precheck:** Every evidence bundle opens with the precheck: `git branch --show-current && git status --short`. A bundle missing this is void on arrival.
3. **Working branch:** `feature/exit-ex-series`, created at EX-1 off `Yves/feature-development`. Work found on any other branch or uncommitted work predating the dispatch is quarantined and reported.
4. **Resubmission rule:** Resubmission of rejected work opens with a conditions-addressed table mapping every hold condition to what changed. Unchanged resubmission is a process violation.

---

## GLOBAL RULES BLOCK — EXIT EDITION — prepend verbatim to every EX dispatch

```markdown
# GLOBAL RULES BLOCK — EXIT EDITION
Governing Specs: SKILL.md (2026-07-18) · docs/spec/reil-complete-four-phase-questions-tasks.md · docs/spec/reil-33-metrics-collection-matrix.md · docs/spec/ex-exit-fixtures-v1.md

1. Brand casing: PaperWorking — exactly. Never Paperworking, paperworking, Paper Working.
2. Canonical Phase labels: Acquisition, Fund, Hold, Exit. Never Closing, Purchase, or Hold & Rehab.
3. Single-function rule: ALL metric math lives in `deriveAllProjectMetrics`. If metric math is computed inline anywhere else — component, API route, report, seed — that is a defect.
4. Single disposition_type field: (SALE | LEASE | RENT) has two entry doors (Intake Card 0.4 for retrospective, Card 3.1 for forward-path). Never create a second strategy field.
5. Management fee basis: Computed strictly on GROSS SCHEDULED RENT, never effective rent (BUG-8, forever).
6. Money-movement prohibition: PaperWorking records, coordinates, and verifies capital events; it NEVER moves money. No payment processing, escrow, or wiring.
7. Projected vs Actual dual-slot lifecycle: Variables born in Acquisition as assumptions are actualized in Exit by real events (Income Ledger, Expense Ledger, Sale Settlement).
8. Retrospective Mode (Card 0.2 / 0.4 "already earning"): Skip-to-Exit streamlined backfill without asking Phase 1–3 Kanban questions.
9. Hold → Exit gate: EVENT-TRIGGERED automatically on first confirmed rent payment, activated lease, or sale under contract.
10. Exit Completion: A closed sale (Card E1.S) marks the Project status COMPLETED (final actual IRR). Reinvestment is a new Project event.
```

---

## DISPATCH PROTOCOL — the first lines of every EX dispatch

```markdown
# DISPATCH: EX-N
Working branch: feature/exit-ex-series
Base branch: Yves/feature-development
Governing specs: SKILL.md (2026-07-18) · reil-complete-four-phase-questions-tasks.md · reil-33-metrics-collection-matrix.md · ex-exit-fixtures-v1.md
Precheck: git branch --show-current && git status --short
```

---

## EXIT PHASE DECISIONS & VISIBLE DEFAULTS (E-1 … E-17)

### Decision E-1: Income Logging & Read-Only Plaid Integration (X-CONFLICT-2 Enforced)
Income (rent per unit or lease payments) is logged into `rent_received[]` or `lease_income[]`. When Plaid is connected, the system proposes transaction attributions for user confirmation; it never silently writes transaction records without explicit human approval.

**X-CONFLICT-2 Directive (CRITICAL — Plaid Boundary & Rule 10 Enforcement):**
Plaid is strictly a **read-only data source**, NEVER a payment rail or money-movement rail (Rule 10).
- **PERMITTED (Read-Only Data Capture):**
  - `/transactions/sync` (read transaction history for income/expense proposals)
  - `/accounts/balance/get` (read account balances)
  - `/liabilities/get` (read debt/mortgage balances and terms)
- **PROHIBITED (Stripped from Architecture):**
  - Plaid Auth product in `/link/token/create` (prohibited; exists for ACH routing numbers)
  - "Automated ACH collection" / "Automated rent collection" (prohibited; Rule 10 violation)
  - Micro-deposit verification & processing fee reduction claims (prohibited; unsourced & rail-adjacent)
  - `AUTH: DEFAULT_UPDATE` webhooks & auth endpoints (prohibited)
  - `USER_ACCOUNT_REVOKED` handling for outgoing ACH transfers (prohibited; no outgoing transfers exist)
  - NSF / R04 payment return code handling (prohibited; no payment execution exists to fail)
  - Plaid Asset Reports for tenant income verification (out of scope v1; FCRA / adverse action exposure)

### Decision E-2: Operating Actuals & Schedule E Categories (X-CONFLICT-1 Enforced)
Operating actuals (`opex_<category>[]`) are mapped strictly to the canonical 8 Schedule E tags: `tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`. 

**X-CONFLICT-1 Directive (CRITICAL):** External research formula M-06 (`Management Fee = NRI × PM %`, where `NRI = GPR − Vacancy − Bad Debt`) is **REJECTED**. NRI is effective rent; adopting M-06 re-opens **BUG-8** and breaks the golden NOI target of $12,486. Management fee is computed strictly on **GROSS SCHEDULED RENT** (`GPR`), never NRI or effective rent (SKILL.md Rule 8, forever). All downstream metrics inheriting management fee retain Gross Scheduled Rent as the basis.

### Decision E-3: Retrospective Mode Skip-to-Exit Router
When Intake Card 0.2/0.4 indicates an "already earning" property, the Kanban bypasses Phases 1–3 and invokes Column E0 (Cards E0.1–E0.3). After minimal backfill, the property lands in active operating status in Column E1/E2.

### Decision E-4: Project Completion vs Reinvestment
A closed sale (Card E1.S) transition marks the `Project` as `COMPLETED`. Final actual IRR is calculated. Equity waterfall distributions are computed and logged off-platform (per Decision F-1). Reinvestment of proceeds creates a new Project.

### Decision E-5: Value Series & Actual Scorecard
`current_value` is tracked as a dated series (Appraisal → Annual Re-valuation). The Actual Scorecard (Card E3.2) displays Acquisition projections side-by-side with Exit actuals. Unsold properties display projected IRR (labeled); sold properties display final actual IRR.

### Decision E-6: Permanent Data Room Document Archive
All title policies, deeds, closing statements, tenant leases, warranties, and tax returns are permanently archived in the Data Room under the Project container.

### Decision E-7: Locked Exit Fixtures (EXX-1 … EXX-5)
Exit calculations are verified against locked fixtures in `docs/spec/ex-exit-fixtures-v1.md`. Agents may read but never mutate fixture files.

### Decision E-8: Exit Realization Metric Set & 33 Matrix Lock (X-CONFLICT-3 Enforced)
**X-CONFLICT-3 Directive (CRITICAL — 33 Metric Matrix Lock):**
Research proposal M-01…M-33 collides numerically with `reil-33-metrics-collection-matrix.md`. The canonical metric count remains locked at **33**.

- **Canonical 33 Lock:** The 33 core metrics in `deriveAllProjectMetrics` and marketing copy are immutable. No net-new metrics alter the core matrix or renumber existing metrics.
- **Exit Realization Set:** Genuinely required Exit analytics (WALE, Net Sale Proceeds, Reserve Fund Balance, Maintenance Expense Variance, Economic Occupancy) enter as the named **Exit Realization Set**, rendered strictly in Insights by category per Rule 6.

### Decision E-9: Vendor Taxonomy & Revenue Destination (X-CONFLICT-4, Ruling X-4 & Ruling X-10 Enforced)
**X-CONFLICT-4 Directive (CRITICAL — Vendor Taxonomy & Dual Destination):**
External research keyed metrics directly to Plaid strings (e.g. `REPAIRS_AND_MAINTENANCE`, `OFFICE_EXPENSES`) and modeled Plaid purely as an expense feed. This is **REJECTED**.

**Two-Part Resolution:**
1. **Taxonomy & Ruling X-4 (Administrative & Legal Expenses):**
   - All vendor categories translate to the canonical 8 Schedule E tags at ingestion (`tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`).
   - Zero vendor/Plaid category strings leak to metrics, UI, or registry.
   - **Ruling X-4:** Operational legal fees (eviction, tenant disputes, routine legal advice) and office/administrative expenses map to **`management`** (or `maintenance` if servicing-related). They do not create a 9th tag.
2. **Revenue Destination & Ruling X-10 (Revenue Classification & Reconciliation):**
   - Plaid detects revenue deposits as well as recurring expenses.
   - **Ruling X-10:** Detected rent deposits resolve to revenue (`rent_received[]` / `lease_income[]`), feeding actual Gross Operating Income (GOI, Metric #14) and actual Occupancy (Metric #18).
   - **Reconciliation Law:** Detected revenue reconciles *against* expected lease terms collected in Kanban Cards E1.R / E1.L. A detected deposit proposes an attribution against the matching lease in the `TenantRegistry` for human confirmation — it NEVER silently overwrites established lease terms.

### Decision E-10: Plaid Function & Five Non-Negotiable Constraints (Founder-Governing)
Plaid does ONE job: detect recurring transactions in a connected bank account and classify each as either a payment from a renter or a recurring cost, deposited or deducted, so those values reach the canonical 33 without the investor typing them.

**Five Non-Negotiable Implementation Constraints:**
1. **Recurrence is the selection filter:** Non-recurring transactions are NOT ingested as metric inputs. The system isolates recurring rent deposits, mortgage debits, insurance premiums, tax draws, and HOA charges.
2. **Three destinations, and only three:** A detected recurring transaction resolves to revenue (`rent_received[]`/`lease_income[]`), to one of the eight operating expense categories (`tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`), OR to debt service (`mortgage_payment`). Debt service is strictly isolated below NOI to prevent OpEx contamination and NOI corruption.
3. **Institution coverage is a first-class surface:** Supported institutions are identifiable before a user attempts to connect; unsupported banks route seamlessly to manual/document upload paths without dead-ending.
4. **User-initiated refresh is mandatory:** Users can refresh dashboard logging on demand and view the timestamp of the last update. Background sync supplements this; it does not replace it.
5. **Output wires to existing 33:** Plaid feeds existing metrics in `deriveAllProjectMetrics`. It creates zero new metrics and justifies no registry expansion (reinforcing X-CONFLICT-3).

### Decision E-11: Rejection of Third-Party Design Dependencies (X-CONFLICT-5 Enforced)
**X-CONFLICT-5 Directive (HIGH — UX-0 Token Authority):**
Third-party template `"enterprise-dashboard-pro"` / `"Astradia Solutions"` is **REJECTED** as a dependency.

- **Rule 12 Styling Authority:** The UX-0 extracted token set (night theme) is the sole styling authority. Third-party design systems repeat the Stitch dependency defect and are prohibited.
- **Grid Map Exemption:** Its 12-column grid map survives ONLY as an information-architecture sketch for EX-35 (tax summary report layout), strictly subordinate to Rule 13 (Portfolio → Insights → Data Room) and Dashboard UX Standards D-1…D-8.

### Decision E-12: Contract-Time Exit Event Trigger (X-CONFLICT-6 Enforced)
**X-CONFLICT-6 Directive (HIGH — Rule 14 Event Gate):**
Research claim that Exit begins "the moment an investment property begins earning revenue" is **REJECTED**. Revenue-only gating would strand sale projects in Hold through their entire escrow period.

- **Rule 14 Governing Gate:** Hold → Exit transition occurs **AUTOMATICALLY** on the first of:
  1. First confirmed rent payment, OR
  2. Activated lease, OR
  3. **Sale under contract** (`under_contract_date`).
- **Contract-Time Trigger:** A sale under contract advances the project to Exit immediately upon contract execution, enabling Card E1.S (contract milestone tracking) during escrow prior to final sale closing revenue.

### Decision E-13: Dual Occupancy Representation & Ruling X-5 (X-CONFLICT-7 Enforced)
**X-CONFLICT-7 Directive (MEDIUM — Occupancy Metric Adjudication):**
Research separates Physical Occupancy (unit/sqft basis) from Economic Occupancy (revenue basis). The canonical 10 scorecard carries one Occupancy Rate (Metric #18).

**Ruling X-5 & Ruling X-10(a):**
1. **Headline Scorecard Authority (Metric #18):** The primary Occupancy Rate on the headline 10 scorecard is **Physical Occupancy** (`occupied_units / total_units`), computed from `TenantRegistry`.
2. **Economic Occupancy in Insights:** **Economic Occupancy** (`actual_collected_rent / gross_scheduled_rent`) is admitted into the **Exit Realization Set** and rendered in Insights under operational analytics.
3. **Delinquency vs Vacancy Law (Ruling X-10a):** Physical Occupancy derives strictly from lease status in `TenantRegistry` and never from deposit presence. Economic Occupancy derives from confirmed payment attributions. The absence of an expected rent deposit is a **delinquency signal**, NEVER evidence of physical vacancy.
4. This satisfies buyer diligence requirements in Insights without diluting the canonical 10 scorecard definition.

### Decision E-14: Ban on Unsourced Marketing Claims & Honesty Rule (X-CONFLICT-8 Enforced)
**X-CONFLICT-8 Directive (MEDIUM — Honesty Rule Protection):**
Unsourced research claims — specifically *"15 to 25% valuation premium"* on conversion and *"reduces processing fees by up to 40%"* — are **REJECTED** from all user-facing surfaces.

- **Rule 4 Honesty Rule:** No fabricated statistics, unevidenced percentages, or placeholder marketing claims presented as fact.
- **Banned Claims:** Neither percentage claim (`15-25% valuation premium`, `up to 40% fee reduction`) may appear in UI copy, marketing text, tooltips, empty states, seed data, or spec dispatches. They are internal unevidenced hypotheses only.

### Decision E-15: What-Not-How Principle & Live Vendor Docs Verification (X-CONFLICT-9 Enforced)
**X-CONFLICT-9 Directive (MEDIUM — Specification Discipline & Code Defect Guard):**
Research sample function `syncLedgerTransactions` is **DEFECTIVE** (unbounded recursion on pagination mutation errors, invalid array updates, timestamped idempotency keys) and is **REJECTED**.

- **What-Not-How Discipline:** Specs define behavior, outcomes, and constraints; they NEVER dictate code snippets. Antigravity writes clean, robust implementation code at dispatch time.
- **Live Documentation Law:** All Plaid SDK method calls, endpoint parameters, webhooks, and error-handling paths must be verified against official live Plaid documentation at implementation time rather than relying on static research snippets.

### Decision E-16: Jurisdictional & Agency Content Founder-Only Lock (X-CONFLICT-10 Enforced)
**X-CONFLICT-10 Directive (MEDIUM — Phantom-Spec Discipline & Product Boundary):**
Unverified legal, agency, or municipal citations introduced in research (e.g., CA Gov. Code § 66452.10, SF DPW, Middlesex Registry, IEBC, Fannie Mae CPM B4-2.2-02) are **REJECTED**.

- **Phantom-Spec Discipline:** Agents must NEVER author, reconstruct, approximate, or "improve" jurisdictional, agency, or legal spec content, nor accept unverified citations injected through dispatches. Spec content comes strictly from the founder.
- **Product Scope Boundary:** PaperWorking is a project-management + analytics platform for Real Estate Investors, **NOT** a legal, tax, or underwriting advisor. Legal and regulatory checklists are populated strictly from founder-committed specifications.

### Decision E-17: WACC Removal & Atomic Discount Rate Rule for NPV (X-CONFLICT-11 Enforced)
**X-CONFLICT-11 Directive (LOW — Atomic Variable Registry Law):**
Research metric `M-27 WACC` requires cost-of-equity / CAPM inputs that small real estate investors cannot defensibly supply. Asking users to input WACC violates SKILL.md Rule 6 (*"users enter only atomic inputs"*).

- **WACC Cut:** WACC is **CUT from v1**. No WACC fields or CAPM calculations exist in the system.
- **NPV Discount Rate Rule:** If NPV is calculated for the Exit Realization Set in Insights, it takes a single explicit `discount_rate` input tagged `user_assumption` and is clearly labeled **Projected**.

---

## RESEARCH → CANONICAL NORMALIZATION (contamination guard)

Before creating schema fields or UI text, cross-check against these 11 reusable normalization mechanisms:

1. **Management Fee Basis Guard (X-CONFLICT-1 & Decision E-2):**
   - *Formula Mechanism:* `Management Fee = Gross Scheduled Rent × PM %` (`GPR * (pm_pct / 100)`).
   - *Rejection:* `NRI × PM %` (M-06) is rejected. `NRI` is effective rent; using it breaks BUG-8 protection and invalidates golden NOI ($12,486).
2. **Plaid Money-Movement & Read-Only Boundary Guard (X-CONFLICT-2 & Decisions E-1, E-10):**
   - *Mechanism:* Plaid is read-only (`/transactions/sync`, `/accounts/balance/get`, `/liabilities/get`). Recurring transactions map to exactly **three destinations** (revenue, 8 OpEx tags, or debt service). Debt service is strictly isolated below NOI to prevent OpEx contamination and NOI corruption.
   - *Rejection:* Strip Plaid Auth (`/link/token/create`), ACH collection, micro-deposits, `AUTH: DEFAULT_UPDATE`, `USER_ACCOUNT_REVOKED` transfer handling, NSF/R04 return handling, and FCRA asset reports. Zero payment rails built or stubbed.
3. **Metric Matrix Lock Mechanism (X-CONFLICT-3 & Decision E-8):**
   - *Mechanism:* Core variable registry count is locked at 33 (`reil-33-metrics-collection-matrix.md`). Supplementary metrics (WALE, Net Sale Proceeds, Reserve Balance, Maintenance Variance, Economic Occupancy) route to the **Exit Realization Set** rendered in Insights by category.
   - *Rejection:* No research proposal may expand, renumber, or alter the canonical 33-metric matrix.
4. **Vendor Taxonomy & Three Destinations Mechanism (X-CONFLICT-4, Ruling X-4, Ruling X-10 & Ruling X-11, Decision E-9, Decision E-10):**
   - *Mechanism:* Ingested Plaid category strings map strictly to 8 Schedule E tags (`tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`). Administrative and legal expenses map to `management` (Ruling X-4). Detected rent deposits resolve to revenue (`rent_received[]`/`lease_income[]`) and reconcile *against* `TenantRegistry` terms with human confirmation (Ruling X-10). Mortgage debits map to debt service below NOI (Ruling X-11).
   - *Rejection:* Zero vendor category strings leak to UI/metrics. Silent overwriting of lease terms is prohibited. Mortgage debits must never land in OpEx.
5. **Styling Authority & Template Rejection Mechanism (X-CONFLICT-5 & Decision E-11):**
   - *Mechanism:* UX-0 extracted token set (night theme) is sole styling authority (Rule 12).
   - *Rejection:* `enterprise-dashboard-pro` and third-party templates are rejected. The 12-column grid survives only as an IA sketch for EX-35 tax export.
6. **Contract-Time Exit Gate Mechanism (X-CONFLICT-6 & Decision E-12):**
   - *Mechanism:* Hold → Exit gate triggers automatically on first confirmed rent, activated lease, OR sale under contract (`under_contract_date`).
   - *Rejection:* Revenue-only gating is rejected (would strand sale projects during escrow). Contract execution advances sale projects immediately (Rule 14).
7. **Dual Occupancy Representation Mechanism (X-CONFLICT-7, Ruling X-5, Ruling X-10a, Decision E-13):**
   - *Mechanism:* Headline 10 scorecard Occupancy Rate (Metric #18) is Physical Occupancy (`occupied_units / total_units`), derived from lease status in `TenantRegistry`. Economic Occupancy (`collected_rent / gross_scheduled_rent`) is placed in the Exit Realization Set in Insights.
   - *Delinquency Law:* The absence of an expected rent deposit is a **delinquency signal**, NEVER evidence of physical vacancy.
   - *Rejection:* Physical Occupancy is never replaced on headline scorecards, nor mutated by deposit presence/absence.
8. **Honesty Rule Marketing Claim Ban (X-CONFLICT-8 & Decision E-14):**
   - *Mechanism:* Ban `"15-25% valuation premium"` and `"up to 40% fee reduction"`.
   - *Rejection:* Neither claim may appear in UI copy, marketing text, tooltips, empty states, seed data, or prompts (Rule 4).
9. **What-Not-How & Live Docs Discipline (X-CONFLICT-9 & Decision E-15):**
   - *Mechanism:* Specs state behavior and constraints; Antigravity writes code at dispatch. All Plaid API endpoints, webhooks, and error codes MUST be verified against live Plaid docs at implementation time.
   - *Rejection:* Sample research code (`syncLedgerTransactions`) is rejected as defective.
10. **Founder-Only Jurisdictional Lock (X-CONFLICT-10 & Decision E-16):**
    - *Mechanism:* Legal and regulatory checklists are populated strictly from founder-committed specifications. PaperWorking is project management, not a legal or underwriting advisor.
    - *Rejection:* Unverified citations (`CA Gov. Code`, `SF DPW`, `Fannie Mae CPM`) are REJECTED. Phantom-spec discipline forbids agents injecting or inventing legal/underwriting spec content.
11. **WACC Removal & Atomic Discount Rate Rule (X-CONFLICT-11 & Decision E-17):**
    - *Mechanism:* WACC is CUT from v1 (asking users for WACC/CAPM inputs violates Rule 6). NPV uses a single atomic `discount_rate` input (`user_assumption`), labeled Projected.
    - *Rejection:* CAPM/WACC inputs are banned.
- **Disposition types:** Must match canonical 3: `SALE`, `LEASE`, `RENT`.

---

## THE EXIT COLUMN MAP (E0–E3)

```
[Column E0: Retrospective Intake] -> [Column E1: Income] -> [Column E2: Ongoing Costs] -> [Column E3: Performance & Archive]
   - E0.1: Purchase & Rehab             - E1.R: Rent Roll          - E2.1: Operating Actuals     - E3.1: Value Updates
   - E0.2: Financing & Debt             - E1.L: Lease Income                                     - E3.2: Actual Scorecard
   - E0.3: Archive & Title              - E1.S: Contract → Closed                                - E3.3: Document Archive
                                                                                                 - E3.4: Disposition Wrap
```

---

## INTERVIEW LAW — the TurboTax/Clerky pattern as testable requirements

1. One question per screen.
2. Clear "Why we ask" rationale line.
3. Plaid transaction proposals require explicit confirmation.
4. Edits to historical actuals recompute all 33 metrics in real-time.

---

## EX FIXTURES — locked expected values (`docs/spec/ex-exit-fixtures-v1.md`)

### EXX-1: Standard Single-Family Rental Operations (Golden Fixture)
- Purchase Price: $279,000 | Down Payment: 20% ($55,800) | Loan: $223,200 @ 6.5%/30yr ($1,410.79/mo)
- Gross Scheduled Rent: $1,950/mo ($23,400/yr)
- Actual Operating Expenses (Schedule E):
  - Tax: $2,800 | Ins: $1,200 | Mgmt (10% gross): $2,340 | Maint (10% gross): $2,340 | HOA: $1,200 | CaPex: $1,034 | Util: $0 | Sec: $0 → **Total OpEx: $10,914**
- **Actual NOI:** $23,400 − $10,914 = **$12,486**
- **Actual Cap Rate:** $12,486 ÷ $279,000 = **4.5%**
- **Actual Annual Debt Service:** $16,929.48
- **Actual Cash Flow:** $12,486 − $16,929.48 = **−$4,443.48**
- **Actual DSCR:** $12,486 ÷ $16,929.48 = **0.74**
- **Actual Cash-on-Cash:** −$4,443.48 ÷ $60,000 = **−7.41%**

### EXX-2: Multi-Family Rent Roll & Occupancy
- 4-unit property | $1,200/mo per unit ($57,600 gross potential) | 1 unit vacant for 2 mos | Realized Occupancy: **95.83%** | Actual Gross Income: $55,200.

### EXX-3: Triple-Net Commercial Lease
- 5-year lease | $45,000/yr base rent | NNN reimbursement: $12,000/yr | Actual Net Income: $45,000 | Tenant Expense Ratio: 0%.

### EXX-4: Property Sale & Final Disposition Wrap
- Sale Price: $340,000 | Selling Costs (6% commission + closing): $23,800 | Mortgage Payoff: $210,000 | Net Sale Proceeds: $106,200 | Total Invested Cash: $60,000 | Hold Period: 3 Years | **Final Actual IRR: 18.4%**.

### EXX-5: Retrospective Mode Backfill
- Streamlined intake: Purchase $200,000 (2021) | Rehab $30,000 | Current Debt $140,000 @ 4.0% | Current Rent $2,000/mo → Immediate active operating state in Exit.

---

# THE DISPATCHES

## WAVE 0 — FOUNDATIONS (EX-1 … EX-6)

### EX-1 · Commit the Exit spec set & fixtures
**Mission:** Commit `docs/spec/ex-series-40-exit-prompts-v1.md` and `docs/spec/ex-exit-fixtures-v1.md` to `docs/spec/`.
**ACs:** SHA256 checksum verification, `git status` clean, SKILL.md reference list updated.

### EX-2 · Exit-phase audit & Logic Lens report
**Mission:** Audit existing codebase for Exit-related schemas, routes, components, and legacy references.
**ACs:** Detailed audit report of `disposition_type`, rent rolls, expense ledgers, and scorecard implementations.

### EX-3 · Exit data plane migration
**Mission:** Implement Prisma schemas and Firestore data models for `IncomeLedger`, `ExpenseLedger`, `TenantRegistry`, and `SaleRecord`.
**ACs:** Database migration clean, dual-slot projected/actual variable support verified via tests.

### EX-4 · Exit Kanban scaffold & UI layout
**Mission:** Build Column E0, E1, E2, E3 visual containers in the Kanban interface matching night theme tokens.
**ACs:** Responsive layout rendering all columns and card slots cleanly.

### EX-5 · Live Hold → Exit Event Gate (X-CONFLICT-6 Enforced)
**Mission:** Wire automatic event-triggered phase transition from Hold to Exit upon first confirmed rent, active lease, OR sale under contract (`under_contract_date`). Gating occurs at contract execution for sales (Decision E-12 / Rule 14), enabling Card E1.S milestone tracking during escrow prior to revenue.
**ACs:** Automated transition test passing for rent, lease, AND sale under contract events without manual checkbox inputs or revenue-only delays.

### EX-6 · DEMO_FINANCIALS Exit extension & fixture seeding
**Mission:** Seed DEMO_FINANCIALS with EXX-1 golden-file operating actuals.
**ACs:** `deriveAllProjectMetrics` reproducing exact golden-file values ($12,486 NOI, 4.5% Cap Rate, −$4,444 Cash Flow).

---

## WAVE 1 — RETROSPECTIVE INTAKE (EX-7 … EX-10)

### EX-7 · Intake Card 0.4 Retrospective router & skip-to-Exit flow
**Mission:** Connect Card 0.4 "already earning" path to skip Phase 1–3 Kanban columns and open Column E0.
**ACs:** Flow test verifying zero Phase 1–3 questions asked for retrospective projects.

### EX-8 · Retrospective Card E0.1 — Purchase & Rehab Backfill
**Mission:** Build Card E0.1 to collect historical purchase price, acquisition date, and total renovation spend.
**ACs:** Atomic inputs saved to variable registry with `user_actual` source tags.

### EX-9 · Retrospective Card E0.2 — Financing & Debt Backfill
**Mission:** Build Card E0.2 to capture existing loan amount, interest rate, and remaining term.
**ACs:** Debt service and amortization schedule derived automatically via shared utility.

### EX-10 · Retrospective Card E0.3 — Archive & Title Backfill
**Mission:** Build Card E0.3 to upload historical deed, title policy, and closing documents directly to Data Room.
**ACs:** Document upload verified, project state transitioned to active Exit operating status.

---

## WAVE 2 — COLUMN E1: INCOME TRACKING & TENANT REGISTRY (EX-11 … EX-18)

### EX-11 · Card E1.R — Rent roll & multi-unit payment logging
**Mission:** Build Card E1.R for unit-by-unit rent receipt logging (`rent_received[]`).
**ACs:** Income Ledger populated with dated amounts and unit associations.

### EX-12 · Plaid auto-attribution proposal engine for rent payments (X-CONFLICT-2 Enforced)
**Mission:** Build read-only background transaction sync (`/transactions/sync`) attribution proposal UI for rent receipts. Requires explicit human confirmation before writing to Income Ledger. Plaid Auth, ACH collection, and micro-deposits are **PROHIBITED** per Rule 10 and X-CONFLICT-2.
**ACs:** Proposal UI tested with mock `/transactions/sync` feed; zero payment collection or ACH endpoints built or stubbed.

### EX-13 · Card E1.L — Lease income terms & escalations tracker
**Mission:** Build Card E1.L for commercial/residential lease agreement parameters (base rent, escalations, terms).
**ACs:** Lease schedule generated and integrated into projected/actual income forecasts.

### EX-14 · Tenant Registry engine & lease lifecycle data model (Ruling X-5 Enforced)
**Mission:** Implement `TenantRegistry` data structures to track tenant contact info, lease start/end, deposit, and unit status. Compute Physical Occupancy (`occupied_units / total_units`) for headline Metric #18 per Ruling X-5.
**ACs:** Physical Occupancy (Metric #18) dynamically computed from active unit leases in `TenantRegistry`.

### EX-15 · Card E1.S (Part 1) — Sale under contract & buyer milestone tracker
**Mission:** Build Card E1.S contract phase tracker (contract price, earnest money, buyer contingency deadlines).
**ACs:** Milestone status board rendering due diligence, financing, and appraisal deadlines.

### EX-16 · Card E1.S (Part 2) — Sale closing capture & net proceeds engine
**Mission:** Build Card E1.S final sale closing capture (final sale price, selling costs, closing date, net proceeds).
**ACs:** Net sale proceeds calculated accurately and recorded in disposition summary.

### EX-17 · Equity waterfall & investor distribution engine at disposition
**Mission:** Build capital distribution calculator for equity partners upon sale completion (Decision F-1 / E-4 off-platform logging).
**ACs:** Waterfall calculation matching hurdle/split parameters with zero-balance validation.

### EX-18 · Income ledger aggregator & occupancy calculator (Ruling X-5 Enforced)
**Mission:** Implement backend aggregator for total gross operating income (GOI, Metric #14), Physical Occupancy (headline Metric #18), and Economic Occupancy (`collected_rent / gross_scheduled_rent`) for the Exit Realization Set in Insights per Decision E-13 and Ruling X-5.
**ACs:** Metric #18 (Physical Occupancy) and Economic Occupancy (Exit Realization Set) passing unit test suite.

---

## WAVE 3 — COLUMN E2: OPERATING ACTUALS & EXPENSE LEDGER (EX-19 … EX-25)

### EX-19 · Card E2.1 — Operating actuals & 8-tag Schedule E breakdown
**Mission:** Build Card E2.1 for logging recurring operating expenses across canonical Schedule E tags.
**ACs:** Expense Ledger storing categorized actuals with timestamped receipt attachments.

### EX-20 · Plaid expense auto-attribution proposal engine (X-CONFLICT-2 & X-CONFLICT-4 Enforced)
**Mission:** Build read-only transaction classifier (`/transactions/sync`) matching expense transactions into the canonical eight Schedule E tags (`tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`) with human confirmation. Raw Plaid category strings are mapped at ingestion per Decision E-9 and X-CONFLICT-4; zero Plaid category strings leak to metrics or UI. Auth/ACH/payment rails are prohibited per X-CONFLICT-2.
**ACs:** Classifier mapping raw Plaid categories (`REPAIRS_AND_MAINTENANCE`, `OFFICE_EXPENSES`, `TAXES_REAL_ESTATE`) into canonical 8 tags; zero raw Plaid strings stored in registry or rendered on UI.

### EX-21 · Gross scheduled rent management fee engine (BUG-8 Guard & X-CONFLICT-1 Enforcement)
**Mission:** Enforce management fee calculations strictly on Gross Scheduled Rent (`GPR`) basis per SKILL.md Rule 8 and X-CONFLICT-1. Reject research formula M-06 (`NRI × PM %`).
**ACs:** Regression test verifying management fee = `GPR × PM %`, failing if management fee is calculated on effective rent (`NRI`) or net income; golden NOI **$12,486** reproduced.

### EX-22 · Maintenance & CaPex actuals vs renovation spend baseline
**Mission:** Build comparison engine between Hold renovation budget actuals and Exit ongoing maintenance/CaPex.
**ACs:** Spend variance alerts rendering on expense dashboard.

### EX-23 · Property tax & insurance actuals logging & document linking
**Mission:** Build annual tax bill and insurance premium actuals capture cards with document verification.
**ACs:** Updated OpEx automatically reflecting in live NOI calculations.

### EX-24 · Utility & HOA expense ledger tracker
**Mission:** Build utility and HOA fee logging interfaces supporting landlord vs tenant utility splits.
**ACs:** Net landlord utility expense correctly isolating billable items.

### EX-25 · Expense ledger aggregator & actual Operating Expense Ratio (OER) engine
**Mission:** Implement backend aggregator for total operating expenses and live OER computation (Metric #9).
**ACs:** Metric #9 (OER) updating dynamically on expense ledger mutations.

---

## WAVE 4 — COLUMN E3: PERFORMANCE, VALUE SERIES & ACTUAL SCORECARD (EX-26 … EX-32)

### EX-26 · Card E3.1 — Current value dated series & re-valuation tracker
**Mission:** Build Card E3.1 to track property valuation history (Appraisal, AVM, Manual Re-valuation).
**ACs:** Dated valuation series stored and plotted on property performance timeline.

### EX-27 · Actual Cap Rate & live LTV calculation engine
**Mission:** Wire live calculation of actual Cap Rate (Metric #2) and LTV (Metric #8) using actual NOI and current valuation series.
**ACs:** Metrics updating instantly when new value or expense entries are saved.

### EX-28 · Actual Cash-on-Cash & live Cash Flow engine
**Mission:** Wire live calculation of actual Cash Flow (Metric #5) and Cash-on-Cash Return (Metric #3).
**ACs:** Golden-file EXX-1 values (−$4,444 Cash Flow, −7.41% CoC) verified live on UI.

### EX-29 · Continuous projected IRR vs final actual IRR calculation engine
**Mission:** Build dual IRR engine: projected IRR during operation, actual IRR upon sale completion (Metric #4).
**ACs:** IRR rendering labeled "Projected" before sale, switching to "Actual" post-closing.

### EX-30 · Card E3.2 — The Actual Scorecard & Projected-vs-Actual side-by-side UI
**Mission:** Build Card E3.2 rendering Acquisition pro-forma projections side-by-side with Exit actuals across headline 10 metrics.
**ACs:** Side-by-side comparison table rendering cleanly with variance highlights.

### EX-31 · Portfolio Insights aggregator for Exit Phase metrics (X-CONFLICT-3 Enforced)
**Mission:** Feed Exit actuals into top-level Portfolio Insights analytics views. Render canonical 33 metrics in headline/category views, and render supplementary Exit realization metrics (WALE, Net Sale Proceeds, Reserve Balance, Maintenance Variance) in Insights by category as the named **Exit Realization Set** (Decision E-8).
**ACs:** Insights dashboard displaying portfolio-wide metrics cleanly without altering or renumbering the canonical 33-metric matrix.

### EX-32 · Long-Term Appreciation & valuation trajectory engine
**Mission:** Build appreciation metric engine (Metric #25) measuring compounding value growth over hold duration.
**ACs:** Trajectory chart rendering historical vs projected valuation curves.

---

## WAVE 5 — COLUMN E3: ARCHIVE, DISPOSITION WRAP & LIFECYCLE CLOSE (EX-33 … EX-40)

### EX-33 · Card E3.3 — Permanent Document Archive & Data Room handoff
**Mission:** Build Card E3.3 archiving all final disposition documents, deeds, warranties, and closing binders into permanent Data Room vault.
**ACs:** File tree in Data Room reflecting structured Exit archive subfolder.

### EX-34 · Post-sale capital event verifier (Decision F-1 / E-4 Compliance)
**Mission:** Build verification logging interface for off-platform bank transfers and debt payoffs post-sale.
**ACs:** Verification log recording confirmation references without executing money movements.

### EX-35 · Schedule E tax summary export & accounting report generator (X-CONFLICT-5 Enforced)
**Mission:** Build report generator exporting annual Schedule E expense summaries (PDF/CSV) for tax filing. Layout uses the 12-column grid information-architecture sketch per Decision E-11, strictly styled with UX-0 night theme tokens (Rule 12).
**ACs:** PDF/CSV report export rendering Schedule E form line items cleanly styled with UX-0 design system tokens.

### EX-36 · Retrospective Mode completion verification & dashboard landing
**Mission:** Verify end-to-end Retrospective flow landing user seamlessly on completed project dashboard.
**ACs:** E2E test verifying complete onboarding within 3 minutes for retrospective properties.

### EX-37 · Card E3.4 — Project completion wrap & lifecycle state locking
**Mission:** Build Card E3.4 locking project records upon final disposition completion.
**ACs:** Project status set to `COMPLETED`; mutation endpoints rejecting non-admin edits on locked projects.

### EX-38 · Multi-Project reinvestment event linker (Portfolio Plane)
**Mission:** Build reinvestment trigger offering prompt to launch new Acquisition Project using net sale proceeds.
**ACs:** One-click launch pre-filling equity capital assumption in new Acquisition Deal.

### EX-39 · Exit Phase end-to-end live integration test suite
**Mission:** Build comprehensive integration test suite covering all Exit workflows (Rent, Lease, Sale, Retrospective).
**ACs:** Full test suite passing green with 100% assertion success.

### EX-40 · Exit Phase UAT script execution & final evidence bundle
**Mission:** Execute complete UAT script for Exit phase, verify all 33 metrics, compile evidence bundle.
**ACs:** Comprehensive walkthrough recording, green test report, clean `git status`, founder sign-off bundle.

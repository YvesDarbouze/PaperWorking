# HD Hold Fixtures v1

**Status:** Locked (Canonical Reference — §1 Inputs)
**Updated:** 2026-07-21
**Owner:** Architecture / Finance Team

This document defines the deterministic expected values for all computation
engines built during the HD series (Hold Phase). Every calculation engine must
yield these exact values when evaluated against the inputs below.

**Single home.** This file is the only home for HX fixture definitions.
The HD Series pack (`docs/spec/hd-series-40-hold-prompts-v1.md`) cites this
file and never duplicates its content. If the two ever appear to disagree,
this file governs fixture content and the agent STOPs and reports.

## Custody and amendment rules

1. **§1 is locked at commit.** The input definitions below are locked the
   moment the founder commits this file. The agent never edits them.
2. **§2 is founder-commit-only.** Expected outputs are captured from the HD-4
   engine run, countersigned by the founder in the founder's terminal, and
   recorded into §2 by founder commit only. The agent never writes to this
   file — not §2, not anywhere. After that commit, the values are
   agent-immutable, exactly like the FX fixtures.
3. **Custody signal.** Any uncommitted change, unexpected diff, or
   agent-authored edit to this file is grounds to STOP the active dispatch and
   report — same class as an untracked spec file in the precheck.
4. **Namespace rule (FD-era seed lesson).** Fixture Projects seed under the
   fixture namespace and can never collide with the demo property or real
   users. HX-1 replicates the DEMO_FINANCIALS property under the fixture
   namespace — it is a copy with fixture identity, never the demo record
   itself.
5. **Vocabulary.** Definitions below name registry variables and stored
   policies. UI display vocabulary follows revised Decision H-3 (Vacancy &
   Credit Loss · Repairs & Maintenance (R&M) reserve · Replacement Reserves
   (CapEx) · statuses Funded / Partially Funded / Unfunded); registry
   variable names are unchanged. REIL phase labels — Acquisition · Fund ·
   Hold · Exit — are canon everywhere.

---

# §1 — Inputs (locked at commit)

---

## HX-1: Baseline Carry (Rental)

The DEMO_FINANCIALS property replicated under the fixture namespace exactly as
seeded, with Hold-phase configuration applied.

* **Property Basis (from DEMO_FINANCIALS seed):**
  * Purchase Price: $279,000
  * Loan Amount: $223,200 (80% LTV)
  * Interest Rate: 6.5% (Annual)
  * Loan Term: 30 years
  * Monthly Gross Rent: $1,950
  * Vacancy Rate: 7%
* **Hold Configuration:**
  * `disposition_type`: `RENT`
* **Eight Holding-Cost Categories (monthly, from seed expense figures):**
  * Tax (`holding_cost_tax`): $200/mo
  * Insurance (`holding_cost_insurance`): $58/mo
  * Security (`holding_cost_security`): $0/mo
  * Maintenance (`holding_cost_maintenance`): $195/mo
  * Utilities (`holding_cost_utilities`): $125/mo
  * Management (`holding_cost_management`): 10% of gross scheduled rent
  * HOA (`holding_cost_hoa`): $0/mo
  * CapEx (`holding_cost_capex`): $0/mo
* **Loan Carry:** From the seeded financing via the shared amortization
  utility (Annual Debt Service: $16,930 per FX-1).

---

## HX-2: Flip Runway (Sale)

Same property basis as HX-1, reconfigured for a sale-path flip context.

* **Hold Configuration:**
  * `disposition_type`: `SALE`
  * `renovation_tier`: `Renovate`
  * `rehab_budget`: $40,000
  * `rehab_completion_target`: seed date + 120 days
  * `list_price_sale`: $365,000
* **Holding-Cost Categories:** Same as HX-1.
* **Rehab Spend Entries:**
  * $9,500 (day 10)
  * $8,200 (day 32)
  * $5,800 (day 55)
  * **Spend to date:** $23,500

---

## HX-3: Budget Alert Threshold

HX-2 plus one additional spend entry that crosses the 80% budget threshold.

* **Base:** All HX-2 inputs.
* **Additional Spend Entry:**
  * $8,600 (day 70)
* **Total Spend to Date:** $32,100
* **Budget Threshold Fact:** $32,100 / $40,000 = 80.25% — crosses 80%.

---

## HX-4: Buffered Rent Projection

HX-1 with conservative reserve policies applied; no maintenance or CapEx
actuals recorded. Validates that reserve policies produce Projected-labeled
monthlies and that marketing spend is excluded from the NOI expense sum.

* **Base:** All HX-1 inputs.
* **Reserve Policies (Decision H-3 vocabulary):**
  * Vacancy & Credit Loss buffer: 8% (conservative)
  * Repairs & Maintenance (R&M) reserve policy: 10% of gross scheduled rent
  * Replacement Reserves (CapEx) policy: 10% of rent
* **Actuals:** No maintenance or CapEx actuals recorded.
* **Marketing / Listing Spend:**
  * $450 logged in the listing/ad log.
  * This spend must be proven ABSENT from the NOI expense sum (Decision H-4).

---

## HX-5: Approval Threshold

HX-1 with a `hold_manager` attached and an approval threshold controlling
which entries flow to actuals.

* **Base:** All HX-1 inputs.
* **Manager Configuration:**
  * `hold_manager`: attached
  * `approval_threshold`: $2,000
* **Manager-Posted Entries:**
  * $1,850 maintenance entry — flows to actuals (below threshold).
  * $2,400 maintenance entry — `pending_approval` (at or above threshold).

---

# §2 — Locked expected outputs (recorded at HD-4 countersign · FOUNDER COMMIT ONLY)

**Status: PENDING HD-4.** The agent captures candidate values in the HD-4
evidence bundle (direct terminal engine calls, side-by-side). The founder
verifies in the founder's terminal, then records the countersigned values
here in a founder commit. Until that commit lands, no HX golden exists and
no dispatch may claim one.

---

HX-1 goldens: — pending HD-4 countersign —

HX-2 goldens: — pending HD-4 countersign —

HX-3 goldens: — pending HD-4 countersign —

HX-4 goldens: — pending HD-4 countersign —

HX-5 goldens: — pending HD-4 countersign —

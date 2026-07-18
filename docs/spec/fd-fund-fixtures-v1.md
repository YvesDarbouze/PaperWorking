# FD Fund Fixtures v1

**Status:** Locked (Canonical Reference)
**Updated:** 2026-07-18
**Owner:** Architecture / Finance Team

This document defines the deterministic expected values for all computation engines built during the FD series (Fund Phase). Every calculation engine must yield these exact values when evaluated against the inputs below.

---

## FX-1: Canonical Mortgage Continuation

* **Inputs:**
  * Modality: Conventional Mortgage
  * Down Payment: $55,800 (20%)
  * Loan Amount: $223,200
  * Interest Rate: 6.5% (Annual)
  * Loan Term: 30 years
* **Derived Outputs:**
  * Annual Debt Service: $16,930 (Rounds consistently with existing golden files where NOI − Cash Flow = $12,486 − (−$4,444) = $16,930)
  * LTV: 80%

---

## FX-2: Co-Buy TIC Recalculation

All-cash TIC (Tenancy in Common) co-purchase:
* **Initial State:**
  * Purchase Price: $279,000
  * Party A Contribution: $167,400 (60.00%)
  * Party B Contribution: $111,600 (40.00%)
* **Capital Addition:**
  * Party B adds $10,000 capital.
  * New Basis: $289,000
* **Derived Shares:**
  * Party A Share: 57.92% (167,400 / 289,000)
  * Party B Share: 42.08% (121,600 / 289,000)
  * Total: 100.00% (Sum of percentages must equal exactly 100.00%)
* **JTWROS (Joint Tenancy with Right of Survivorship) Variant:**
  * Equal shares (50.00% / 50.00%) regardless of contribution.
  * Flagged with survivorship explainer in UI.

---

## FX-3: Syndication, Straight Split

* **Inputs:**
  * LP Capital: $900,000
  * Distributable Cash: $100,000
  * Split: 70% LP / 30% GP
* **Derived Outputs:**
  * LP Distributions: $70,000
  * GP Distributions: $30,000

---

## FX-4: Syndication, 7% Preferred (Non-Cumulative, Single Period)

* **Inputs:**
  * LP Capital: $900,000
  * GP Co-Investment: $0 (isolates mechanic)
  * Preferred Rate: 7.00% (Non-Cumulative)
  * Distributable Cash: $100,000
  * Remainder Split: 70% LP / 30% GP
* **Derived Outputs:**
  * LP Preferred Return: $63,000 ($900,000 × 7.00%)
  * Remainder Pool: $37,000 ($100,000 − $63,000)
  * LP Remainder Share: $25,900 ($37,000 × 70%)
  * GP Remainder Share: $11,100 ($37,000 × 30%)
  * LP Total: $88,900 ($63,000 + $25,900)
  * GP Total: $11,100
  * Total Distributed: $100,000

---

## FX-5: Syndication, 7% Preferred (Cumulative, Two Periods)

* **Inputs:**
  * LP Capital: $900,000
  * GP Co-Investment: $0
  * Preferred Rate: 7.00% (Cumulative)
  * Remainder Split: 70% LP / 30% GP
* **Period 1 (Year 1):**
  * Distributable Cash: $50,000
  * LP Distributed: $50,000
  * GP Distributed: $0
  * Preferred Due: $63,000
  * Accrued Shortfall: $13,000 ($63,000 − $50,000)
* **Period 2 (Year 2):**
  * Distributable Cash: $100,000
  * Year 2 Preferred Due: $76,000 ($63,000 current + $13,000 accrued shortfall)
  * LP Preferred Distributed: $76,000
  * Remainder Pool: $24,000 ($100,000 − $76,000)
  * LP Remainder Share: $16,800 ($24,000 × 70%)
  * GP Remainder Share: $7,200 ($24,000 × 30%)
  * LP Year 2 Total: $92,800 ($76,000 + $16,800)
  * GP Year 2 Total: $7,200
  * Two-Year Totals:
    * LP: $142,800 ($50,000 + $92,800)
    * GP: $7,200 ($0 + $7,200)

---

## FX-6: Distribution Waterfall (Three Tiers)

Cash-on-capital thresholds (not IRR) for v1:
* **Inputs:**
  * LP Capital: $900,000
  * Distributable Cash: $180,000
  * Tier 1: 100% to LP up to 7% ($63,000 threshold)
  * Tier 2: 70% LP / 30% GP up to 14% LP cumulative return ($126,000 total LP return threshold, i.e., an additional $63,000 to LP)
  * Tier 3: 50% LP / 50% GP
* **Calculation:**
  * **Tier 1:**
    * LP receives $63,000.
    * Pool remaining: $117,000 ($180,000 − $63,000).
    * Cumulative LP return: $63,000.
  * **Tier 2:**
    * LP needs an additional $63,000 to hit the 14% ($126,000) threshold.
    * Since split is 70/30, the total Tier 2 pool needed to pay LP $63,000 is $63,000 / 0.7 = $90,000.
    * Since remaining pool is $117,000 (which is $\ge \$90,000$), Tier 2 is fully satisfied.
    * LP receives $63,000.
    * GP receives $27,000.
    * Pool remaining: $27,000 ($117,000 − $90,000).
    * Cumulative LP return: $126,000 ($63,000 + $63,000).
  * **Tier 3:**
    * Split is 50/50.
    * LP receives: $13,500 ($27,000 × 50%).
    * GP receives: $13,500 ($27,000 × 50%).
* **Totals:**
  * LP Total: $139,500 ($63,000 + $63,000 + $13,500) — effective LP return = 15.50%
  * GP Total: $40,500 ($0 + $27,000 + $13,500)
  * Total Distributed: $180,000 (Sum LP + GP)

---

## FX-7: SBA 504 Structure

Project structure constraints (must always sum to exactly 100%):
* **Standard Variant:**
  * Bank (1st Lien): 50.00% ($500,000 on a $1,000,000 project)
  * CDC Debenture (2nd Lien): 40.00% ($400,000)
  * Borrower Injection: 10.00% ($100,000)
* **New-Business or Special-Purpose Variant:**
  * Bank (1st Lien): 50.00%
  * CDC Debenture (2nd Lien): 35.00% ($350,000)
  * Borrower Injection: 15.00% ($150,000)

---

## FX-8: Cash-to-Close Reconciliation

Reconciles the sources and uses of funds at closing. Closing complete is blocked if Variance $\neq 0$.
* **Formulas:**
  * $\text{Sources} = \text{Confirmed Equity} + \text{Locked Debt} + \text{Earnest Money Credit}$
  * $\text{Uses} = \text{Purchase Price} + \text{Closing Costs} + \text{Prepaids/Reserves}$
  * $\text{Variance} = \text{Sources} − \text{Uses}$
* **Inputs:**
  * Purchase Price: $279,000 (from DEMO_FINANCIALS)
  * Closing Costs: Mapped from DEMO_FINANCIALS (historically $4,200)
  * Earnest Money Credit: $5,000 (deposited during Acquisition)
  * Locked Debt: $223,200 (from FX-1 mortgage)
  * Confirmed Equity: $55,800
* **derived reconciliation check:**
  * Sources: $223,200 + $55,800 + $5,000 = $284,000
  * Uses: $279,000 + $4,200 + prepaids/reserves (if any)
  * Standard reconciliation without additional prepaids:
    * Uses = $283,200.
    * Sources = $284,000.
    * Variance must be reconciled to $0.

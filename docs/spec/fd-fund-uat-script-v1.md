# UAT Test Script — REIL Fund Phase (v1.0)

**Owner:** Founder / Architecture Team  
**Status:** Canonical Verification Script  
**Updated:** 2026-07-19  

This document provides the step-by-step User Acceptance Testing (UAT) script for verifying the entire Fund Phase of the Real Estate Investment Lifecycle (REIL) end-to-end. It details expected actions, UI indicators, and exact on-screen values.

---

## Scenario 1: Solo Conventional Mortgage (FX-1 Spine)

### Step 1.1: Phase Transition Gate-In
* **Action:** Select a project in the Sourcing/Acquisition phase (e.g., "Evergreen Terrace"). Navigate to the **Underwriting & Acquisition Checklist**.
* **Pre-conditions:**
  * Purchase Price: `$279,000`
  * Earnest Money Deposit (EMD): `$5,000` (deposited and verified)
  * Signed PSA uploaded
* **Action:** Click "Complete Phase" or "Proceed to Closing".
* **Expected Result:** The project transitions from `Acquisition` to `Fund` phase. The screen header updates to `Fund Phase · Closing Prep`.

### Step 1.2: Modality & Instruments Selection
* **Action:** Open the **Financing Modality Card** (F3.1).
* **Action:** Check **Conventional Mortgage** from the multi-select instruments list. Click "Save Modality".
* **Expected Result:** 
  * The modaltiy is saved as Conventional Mortgage.
  * Downstream cards (Lender Vault F3.2, Estimates Comparison F3.3, Underwriting milestones F3.4, Locked Terms F3.5) become visible.
  * SBA 504 Structure (F3.6) and Hard Money Terms (F3.7) remain hidden.

### Step 1.3: Lender Package & Custom Checklist
* **Action:** Open the **Lender Vault Card** (F3.2).
* **Expected Result:**
  * Shows default customary checklist items (e.g., "Signed PSA", "Proof of Funds", "Entity Docs").
  * A prominent informational advisory banner is visible: *"This checklist represents customary lender ask guidelines. Actual lender requests may vary."*
* **Action:** Add a custom item "Lender Survey" with a weekly reminder cadence.
* **Expected Result:** The custom item is added. An alert schedule is queued.

### Step 1.4: Loan Estimate Capture & Tabular Comparison
* **Action:** Navigate to **Loan Estimates comparison** (F3.3).
* **Action:** Click "Add Loan Estimate". Fill out parameters:
  * Estimate 1: Amount `$223,200`, Interest Rate `6.5%`, Term `30 years`, Points `1%`, Sourced via `Document` (upload a mock PDF).
  * Estimate 2: Amount `$225,000`, Interest Rate `6.75%`, Term `30 years`, Points `0.5%`, Sourced via `Manual`.
* **Expected Result:**
  * Sourced parameters display corresponding `DOC` or `MANUAL` badges next to them.
  * Side-by-side comparison table correctly computes:
    * Estimate 1 Payment: `$1,411` monthly payment / `$16,930` annual debt service.
    * Estimate 2 Payment: `$1,459` monthly payment / `$17,509` annual debt service.
* **Action:** Select **Estimate 1** and click "Choose This Loan".
* **Expected Result:** Estimate 1 values are promoted to the active LoanRecord. `sourceTags` are propagated.

### Step 1.5: Underwriting Milestones & Appraisal Capture
* **Action:** Navigate to **Loan processing milestones** (F3.4).
* **Action:** Select status `Appraisal-Received`. A modal appears.
* **Action:** Enter Appraised Value: `$279,000` (100% of purchase price) and upload appraisal document. Click "Save Transition".
* **Expected Result:**
  * The appraised value is saved.
  * Side-by-Side LTV Assessment Card displays:
    * Live LTV: `80.00%` (`$223,200 / $279,000`).
    * Stored LTV: `80.00%`.
  * The transition log displays the timestamp, note, and document download link.

### Step 1.6: Terms Lock & Registry Commit
* **Action:** Navigate to **Locked Terms** (F3.5).
* **Action:** Review the values (Amount: `$223,200`, Rate: `6.50%`, Term: `30 Years`, Points: `1.00%`) displaying `DOC` badges.
* **Action:** Click "Lock Terms & Commit to Registry".
* **Expected Result:**
  * The terms are transactionally committed to the project's financials registry.
  * Computed DSCR displays: `0.74` (NOI `$12,486` / Annual Debt Service `$16,930`).
  * A prominent warning chip (`AlertTriangle` / Amber) appears: *"Lender DSCR 0.74 is below the minimum threshold of 1.20."*

### Step 1.7: Closing Timeline & Business Days Math
* **Action:** Check the **Closing Timeline tab** in the sidebar.
* **Action:** Observe milestones target offsets (e.g. CD delivery targets closing date).
* **Action:** Set CD Received Date to 1 calendar day before Closing.
* **Expected Result:** A red warning alert displays: *"TRID Alert: Closing Disclosure delivered less than 3 business days prior to Closing."*
* **Action:** Set CD Received Date to 4 calendar days before Closing.
* **Expected Result:** The warning transitions to a green checkmark or disappears.

### Step 1.8: Cash-to-Close Reconciliation
* **Action:** Navigate to **Cash-to-Close Reconciliation** (F5.3).
* **Expected Result:**
  * Sources:
    * Locked Debt (Conventional): `$223,200`
    * Confirmed Equity (Down Payment): `$55,800`
    * Earnest Money Credit: `$5,000`
    * Total Sources: `$284,000`
  * Uses:
    * Purchase Price: `$279,000`
    * Closing Costs: `$4,200` (pre-filled from underwriting)
    * Prepaids/Reserves: `$800` (derived or manual)
    * Total Uses: `$284,000`
  * Variance: `$0` (Sources equal Uses).
* **Action:** Try to change uses to create a variance (e.g. modify prepaids to `$1,000`). Click "Proceed to Closing".
* **Expected Result:** The system blocks execution with a warning: *"reconciliation variance must be $0 to close."*
* **Action:** Correct prepaids to `$800` (Variance: `$0`). Click "Proceed to Closing".
* **Expected Result:** The Closing Room Modal opens.

### Step 1.9: Actualization Sweep & Gate-Out
* **Action:** Inside the Closing Room Modal, review side-by-side values (Projected vs Actuals).
* **Action:** Upload the executed Deed and Closing Disclosure (CD).
* **Action:** Click "Confirm & Close Project".
* **Expected Result:**
  * Actual values are swept into project financials.
  * All F5 column cards (`F5.1` through `F5.6`) are marked completed.
  * The project transitions to the `Hold` phase.

---

## Scenario 2: Syndication & Debt Hybrid

### Step 2.1: Roster & Cap Table Seeding
* **Action:** Open a project structured as a Syndication (e.g., "Ocean View Apartments") in the Fund phase.
* **Action:** Navigate to the **Partners & Roster** tab (F2.1).
* **Action:** Add two LPs to the roster:
  * LP 1: Email `lp1@example.com`, commitment `$600,000`.
  * LP 2: Email `lp2@example.com`, commitment `$300,000`.
* **Expected Result:** Roster lists both LPs at `'pledged'` status.

### Step 2.2: Economics & Waterfall Configuration
* **Action:** Navigate to the **Economics Config** (F2.2).
* **Action:** Define preferred return structures:
  * Preferred Rate: `7.00%` (Cumulative)
  * GP Co-Investment: `$0`
  * Split: `70% LP / 30% GP`
* **Action:** Review the fixture preview charts.
* **Expected Result:** Visual charts display the split ratios for multiple distributable cash pools.

### Step 2.3: Subscriptions E-Sign Chain
* **Action:** Navigate to **Soft Commits & Subscription Agreements** (F2.3).
* **Action:** Click "Generate Subscription Agreements" for LP 1.
* **Expected Result:** Agreement status transitions to `'sent'`.
* **Action:** Simulate LP 1 signing the document (trigger DocuSign mock webhook).
* **Expected Result:** Agreement status transitions to `'signed'`, then `'funds-confirmed'` upon Lead confirmation.

### Step 2.4: Contribution Ledger Rollups
* **Action:** Navigate to **Contribution Ledger** (F2.4).
* **Expected Result:**
  * LP 1 has `$600,000` cleared.
  * LP 2 has `$300,000` cleared.
  * Capital Stack progress bar displays `$900,000` equity raised, matching the required equity stack.

### Step 2.5: Waterfall Distribution Verification (Period 1 & 2)
* **Action:** Run a mock distribution calculation:
  * **Period 1 Cash Pool:** `$50,000`
    * Expected LP return: `$50,000` (Preferred return due `$63,000`, shortfall `$13,000` accrued).
    * Expected GP return: `$0`.
  * **Period 2 Cash Pool:** `$100,000`
    * Expected LP return: `$92,800` (Preferred due `$76,000` [Year 2 `$63,000` + shortfall `$13,000`] + Remainder share `$16,800` [70% of `$24,000` remainder]).
    * Expected GP return: `$7,200` (30% of `$24,000` remainder).
* **Expected Result:** Waterfall calculator matches the expected Period 1 and Period 2 splits exactly to the dollar.

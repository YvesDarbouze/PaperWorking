# Closing Timeline, Slippage Controls, Cash-to-Close Reconciliation, Actualization Sweep, Fund Wrap Gate, and Phase 3 Scope Tier (Cards F5.1 - H1.1) · Walkthrough

## Summary

Implemented closing milestones, timeline controls, Closing Disclosure parsing, reconciliation safeguards, actuals sweeps, Fund-to-Hold checklist gate validation, Phase 3 Strategy locking, and the **Phase 3 Hold Scope Tier (Card H1.1)** with dynamic execution compression.

---

## Part 1 — Closing Timeline & Slippage Controls (Cards F5.1 & F5.2)

1. **Modality Presets**: Automatically instantiates milestone lists from three templates:
   - **Conventional Financing** (Financing Approval → Title Clearance → Appraisal Completion → Conditions Cleared → Closing Disclosure → Closing).
   - **Cash & Hard Money** (Title Clearance → Funding Approval → Closing).
   - **SBA 504** (Financing Approval → Appraisal Completion → CDC/SBA Approval → Conditions Cleared → Closing Disclosure → Closing).
2. **Executed Contract Date Offsets**: Milestones are initialized relative to `psaEffectiveDate` offset days (e.g. +15 days, +25 days).
3. **Editable Targets**: Inline date inputs allowing users to override target dates, edit notes, and modify actual completion dates.
4. **Linked Events (Auto-Actuals)**: Listens to Firestore updates and automatically completes milestones (marking `completed = true` and setting `actualDate` to the current date) when specific system triggers occur:
   - Title verification cleared.
   - Appraisal received.
   - Financing pre-approved / conditions cleared / Clear-To-Close.
   - Closing Disclosure uploaded.
   - Project marked clear to close or advanced to Phase 3 (Hold).
5. **Overdue Milestone Flags & Customary Delay Guidance**:
   - Detects when a milestone is incomplete and has slipped past its target date.
   - Adds a flashing red "Overdue" visual indicator next to target dates.
   - Displays a premium slippage notification block with interactive customary causes chips ("Underwriting Backlog", "Title Defects", "Repair Negotiations") presenting actionable mitigation advice.
   - Allows users to append mitigation advice directly to the milestone notes with a single click.
6. **TRID Compliance Calculations**:
   - For financed templates (Conventional and SBA), calculates business-day separation between the Closing Disclosure delivery date and Closing Settlement, excluding Saturdays and Sundays.
   - Flags a TRID Compliance Warning (red alert) if the separation is less than 3 business days.
   - Flags a TRID Warning - Action Required (amber alert) if closing is scheduled within 7 calendar days but the Closing Disclosure is not yet recorded as delivered.
   - Formulates warnings factually as educational consumer-protection guidance.

---

## Part 2 — Closing Disclosure Capture Split-View (Card F5.3)

1. **Document Review Button**: Once a CD document is uploaded, a "Review & Capture" action button appears next to the "PDF Attached" badge.
2. **Split-View Canvas Layout**:
   - **Left Column**: Displays the uploaded file details and a visual document preview. Features a **Run Gemini AI OCR Scan** button.
   - **Right Column**: Displays the data capture form (Final Closing Costs, Cash to Close, Prepaids & Reserves).
3. **Interactive AI Extraction (Gemini OCR)**:
   - Calls the backend OCR route `/api/ocr/settlement` with the uploaded document URL to automatically parse final closing costs.
   - Computes prepaids/reserves and cash-to-close estimates automatically from the extracted settlement data.
   - Gracefully falls back to deal-specific underwriting estimates if the scan fails or the Gemini API is not configured, ensuring zero runtime disruptions.
4. **Source Attribution & Audit Trails**:
   - Each input is explicitly tagged with `Source: CD Document`.
   - Attributes capture timestamp, operator user ID, and operator displayName directly to the `closingRoom` record inside Firestore, creating a permanent audit trail.
5. **Operational Financials Actualization**:
   - Writes the captured final figures directly into the project's operational financials (`finalClosingCosts`, `finalCashToClose`, `finalPrepaidsReserves`), overriding initial estimates and updating downstream cash flow, DSCR, and cash-on-cash calculations.
   - Automatically synchronizes with the PostgreSQL ledger and project metrics engines.

---

## Part 3 — Cash-to-Close Reconciliation (Card F5.4)

1. **Unified Math Engine**: Created `src/lib/math/reconciliation.ts` containing the `reconcileProjectCapital(project: Project)` calculation engine. Derives all sources and uses without any component-level duplicate math, satisfying the "one reconciliation engine" constraint.
2. **Sources Breakdown**:
   - Confirmed Equity: Sums all approved/funded private money sources in the capital stack + all confirmed fractional investors contribution amounts.
   - Locked Debt: Sums all approved/funded conventional financing and hard money loan amounts.
   - Earnest Money Credit: Reads `emdAmount` (falling back to `loiEarnestAmount`), converting from cents to dollars.
3. **Uses Breakdown**:
   - Purchase Price: Underwriting purchase price.
   - Final Closing Costs: Captured actual closing costs from the CD.
   - Prepaids & Escrow / Reserves: Captured actual prepaids/reserves from the CD.
4. **Live Variance Bar**:
   - Displays in the Closing Room modal showing the exact discrepancy (`Sources - Uses`).
   - Adapts theme colors dynamically: green for balanced ($0 variance), red for unbalanced.
5. **Typed-Override Safeguards**:
   - If the variance is non-zero, it locks final signatures / e-sign actions, displaying a `Reconciliation Blocked` alert.
   - Enables users to type an override justification (e.g. sponsor covering remaining cash outside the stack) and save it to the project's closing room metadata.
   - Once saved, the block is cleared and e-signatures are unlocked, displaying the recorded reason.

---

## Part 4 — Closing Execution & Recording (Card F5.5)

1. **Closing Date & Signed Documents Checklist**:
   - Collects the actual closing date (`actualClosingDate`).
   - Tracks the upload and signature status for the executed documents (deed, promissory note, settlement statement/CD, title policy, entity/assignment docs).
   - Promissory note is optional if debt financing is not utilized (Cash Deals).
2. **Disbursement & Recording Confirmation**:
   - Logs disbursement state with the settlement statement as evidence.
   - Records county, filing date, and instrument number for deed recording confirmation.
3. **Data Room Archiving & Phase Transition**:
   - Automatically archives the executed package inside the project's `'Under Contract'` Data Room folder.
   - Advances project state to **Phase 3 (Hold)** with the status set to `'hold'` and phase status to `'Phase 3: Hold'`.

---

## Part 5 — Actualization Sweep & First Financial Reckoning (Card F5.6)

1. **Dual-Slot Variable Auditing**:
   - Collects and lists 8 primary Fund-owned variables: Purchase Price, Closing Costs, Prepaids & Escrow, Cash to Close, Earnest Money Deposit, Hazard Insurance Premium, Lender Loan Amount, and Lender Interest Rate.
   - Compares the underwritten (projected) slot side-by-side with the final (actual) slot.
2. **Auto-Satisfied Checks**:
   - Auto-populates and locks variables that were already parsed/supplied through Closing Disclosure capture (Closing Costs, Prepaids, Cash to Close) or Insurance Binder upload (Hazard Insurance), avoiding duplication of data entry.
   - Explicitly badges them as `Auto-satisfied` alongside their document source tags (e.g. `CD Capture` or `Insurance Binder`).
3. **Actual Prompts & Live Delta Calculations**:
   - Renders interactive number input fields for any actual slots that are not yet satisfied.
   - Calculates and displays live deltas (both dollar amounts and percentage changes) comparing actuals to projections.
   - Color-codes the deltas: green for cost savings or improved financing terms, red for cost overruns, and gray/balanced for perfect alignment.
4. **Commit & Downstream Synchronization**:
   - Saves manual entries directly to the project's financials and closing room metadata.
   - Synchronizes changes to downstream performance engines (DSCR, Cash-on-Cash, NOI, and cash flow forecasts), securing a verified financial handoff that Phase 3 (Hold) inherits.

---

## Part 6 — Fund &rarr; Hold Phase Gate (Column F6)

1. **Live Checklist Gate Evaluation**:
   - Evaluates the 8 mandatory covenants directly from live Firestore project data:
     - **Actual purchase price recorded** (`financials.purchasePrice > 0`).
     - **Total cash invested fully actualized** (`financials.totalCashInvested > 0` or `financials.finalCashToClose > 0`).
     - **Loan terms actual** (`loanAmount > 0` and `loanInterestRate > 0` for financed routes).
     - **Closing date recorded** (`actualClosingDate` present).
     - **Deed recording confirmed** (`deedRecordingCounty`, `deedRecordingDate`, and `deedRecordingInstrumentNumber` set).
     - **Required closing documents archived** (Deed, Promissory Note [if financed], Settlement Statement, Title Policy, Entity assignment documents uploaded and marked signed).
     - **Cash-to-close reconciled** ($0 variance or active typed override justification stored and displayed).
     - **Attorney requirement satisfied where mandated** (`lawyerVerified` checkbox checked).
2. **Failing Block Alert**:
   - Displays a structured, red transition block listing each individual named checklist criterion that is currently failing.
3. **Celebratory Passage & Baseline Handoff**:
   - Once all criteria are met, displays a premium green celebratory panel: **"Passage Cleared! Fund &rarr; Hold Baseline Ready"**.
   - Showcases the immutable baseline parameters handed off to Phase 3:
     - **Cost Basis** (Purchase Price + Final Closing Costs).
     - **In-service Date Candidate** (Closing Date).
     - **Debt Service Reference** (Principal amount and interest rate).
     - **Hazard Insurance Premium** (Annualized premium).
     - **Equity Structure** (Equity capitalization details, Sponsor/Private Money contributions + Fractional Investor holdings).

---

## Part 7 — Phase 3 (Hold) Strategy Locking (Phase 3 Core Rule)

1. **Locked Strategy Enforcement**:
   - Conformed the Hold Page workspace to read the active strategy directly from `project.dispositionType` (`RENT` or `LEASE` mapped as `'Rent'`, otherwise `'Sell'`), satisfying the constraint that strategy is never re-asked in subsequent phases.
2. **Interactive Toggle Removal**:
   - Removed the interactive `ExitStrategyToggle` component and the `handleStrategyChange` mutation logic from the Hold workspace.
3. **Locked Strategy Card View**:
   - Replaced the input toggle with a read-only card decorated with a lock icon, validating that the transaction's disposition strategy was locked during Acquisition and explaining its impact on downstream renovation schedules and operating costs.

---

## Part 8 — Scope Tier Selection & Compressed Execution (Card H1.1)

1. **Interactive Scope Tier Selector (Q: "What level of work does this property need?")**:
   - Integrated a beautiful card grid layout featuring 5 selectable levels with cost signaling:
     * **Stage** `($)` — Aesthetic touch-ups & furniture staging.
     * **Refurbish** `($$)` — Minor cosmetic repairs & painting.
     * **Renovate** `($$$)` — Full kitchen/bath updates & fixtures.
     * **Gut** `($$$$)` — Structural changes & total interior strip.
     * **Develop** `($$$$$)` — Addition of square footage or ground-up build.
   - Includes informational tooltip detailing that the selected tier dictates the budget conversation and timeline expectation.
   - Writes `renovation_tier` and convenience alias `rehabTier` synchronously on select to secure full backward compatibility.
2. **Compressed H2 View for Stage Tier**:
   - Implemented dynamic section toggles on the page layout. When a project is classified under the `Stage` tier:
     * Hides heavy general contractor bids, CapEx trackers, and draw schedule panels since Level 1 deals ($1k-$5k) do not use structured construction funding flows.
     * Renders a compressed workspace consisting only of the Scope of Work, Staging Expenses, and Site Visit Logs.
     * Displays a clean header banner clarifying the compressed layout is active.
   - For higher tiers (`Refurbish` and above), all trackers automatically reappear.

---

## Part 9 — Budget, Timeline & Contractor Slots (Card H1.2)

1. **Renovation Budget Input (Q: "What's the renovation budget?")**:
   - Renders a dollar input field in the hold dashboard, auto-confirming the underwritten figure from acquisition (projected/fallback rehab budget, reading Card S2.5's upfront figure) if not yet customized.
   - Tags the input with a `"Sourcing Underwriting Confirmation"` badge when using the default fallback to identify unconfirmed assumptions.
   - Saves overridden budget values to `rehab_budget` (cents) and top-level `rehabBudget` inside Firestore.
2. **Target Completion Date (Q: "Target completion date?")**:
   - Renders a calendar picker allowing users to select target completion dates, writing directly to `rehab_completion_target` and top-level `rehabDoneDate`.
3. **Contractor Slots per Tier**:
   - Generates dynamic contractor assignments based on the chosen renovation tier:
     - **Stage**: Staging Coordinator.
     - **Refurbish**: General Contractor, Cosmetic / Painter.
     - **Renovate**: General Contractor, Kitchen & Bath Specialist, Mechanical Sub.
     - **Gut**: General Contractor, Architect / Structural Engineer, Demolition Specialist, Mechanical Sub.
     - **Develop**: General Contractor / Builder, Architect / Designer, Civil Engineer, Permitting Consultant.
   - Integrates slot assignment cards where users can click "+ Assign" to open a structured inline form for Name, Firm Name, Phone, and Email, or edit/delete existing assignments, writing details to `rehab_contractors` within financials.

---

## Part 10 — Renovation Spend Tracker (Card H2.1)

1. **Running Spend Ledger (`rehab_spend[]`)**:
   - Built an interactive running spend ledger showing Name, Date, Category, and Notes for each transaction.
   - Saves transaction logs to `rehab_spend[]` in project financials inside Firestore.
   - Dynamically re-calculates total spent by summing up all `rehab_spend[]` entry values, rendering an honest budget-vs-actual progress bar at all times.
2. **CapEx vs Repairs/Maintenance Categorization**:
   - Restricts categories to `CapEx` (Capital Expenditures) or `Repairs & Maintenance`.
   - Incorporates a premium tax guidance header card with explicit warnings distinguishing improvements from repairs/maintenance:
     * *CapEx/Improvements*: Add permanent value, extend the useful life of the asset, or adapt it to new uses (depreciated).
     * *Repairs & Maintenance*: Keep the property in normal operating condition (expensed immediately).
     * *Disclaimer*: Clearly states the categories are for operational tracking only and do not constitute formal tax advice.
3. **Editable Spend Log with Audit History**:
   - Supports inline edits for all spend entries.
   - Automatically appends a change log record to `history[]` tracking modifications (updatedAt, updatedBy, previousValue), creating a transparent edit audit trail.
   - Displays a hoverable audit history popup showing historical changes next to the "Edited" badge.
4. **Plaid Auto-Attribution & Proposals Matcher**:
   - Simulates a connection to Plaid to search for timeline-matching transactions (e.g. from Home Depot, paint shops).
   - Generates interactive proposal cards in the tracker panel.
   - Prevents silent writes: the user must explicitly confirm a proposal as CapEx/Repairs, or dismiss/reject it, before it writes to the spend ledger.

---

## Part 11 — Renovation Completion (Card H2.2)

1. **Renovation Complete Question & Actual Date Input**:
   - Integrated the `RenovationCompletionCard` component to prompt: *"Renovation complete?"*.
   - Renders a Date input for the actual renovation completion date, writing to `rehab_completed_date` and `rehabDoneDate` in Firestore.
2. **Final Spend Confirmation & Budget Actualization**:
   - Displays the final calculated spend derived from all logged ledger transactions (`rehab_spend[]` sum).
   - Clicking **"Confirm & Lock Completion"** writes `rehab_spend_total` (cents) and synchronizes/actualizes `rehab_budget` and `rehabBudget` with the final spend total.
   - Shows a green success completion status alert highlighting the actual completed date and finalized total spent.

---

## Part 12 — Itemized Monthly Holding Costs (Card H3.1)

1. **Step-by-Step Wizard Layout**:
   - Implemented the `HoldingCostsWizard` component providing a multi-step user experience (one screen per category) for: Property Tax, Insurance, Security, Maintenance, Utilities, Management, HOA, and CapEx Reserve.
   - Saves itemized monthly recurring values to Firestore database fields: `holding_cost_tax`, `holding_cost_insurance`, `holding_cost_security`, `holding_cost_maintenance`, `holding_cost_utilities`, `holding_cost_management`, `holding_cost_hoa`, and `holding_cost_capex`.
   - Automatically synchronizes with legacy holding cost fields (`holdingCostTaxes`, `holdingCostInsurance`, `holdingCostMaintenance`, `holdingCostUtilities`, `holdingCostManagement`, `hoaMonthly`) for full backward compatibility.
2. **Fund Debt-Service carry display**:
   - Calculates and displays monthly carry derived from the Fund debt-service amortization formula (`annualDebtService / 12` or amortized `loanAmount`, `loanRate`, and `loanTermMonths`).
   - Renders as a prominent read-only display card inside the wizard to prevent duplicate entry.
3. **F4.4 Insurance Pre-fill & Confirmation**:
   - Dynamically pre-fills the monthly carry in the Insurance category step from the underwritten annual quotes in the Fund phase (`insuranceCost` divided by 12) if no cost has been customized yet.
4. **Plaid Cost Proposals**:
   - Integrates simulated Plaid recurring transactions (e.g. Con Edison utilities bill, ADT security monitoring, HOA HOA fee).
   - Allows users to click "Pre-fill" to automatically populate the input value with the suggested proposal amount.

---

## Part 13 — Current Estimated Value Series (Card H4.1)

1. **Current Valuation Series Panel**:
   - Implemented the `CurrentValueTracker` component allowing investors to record a dated sequence of estimated market value figures (`current_value: ValuationEntry[]`).
   - Supports 4 distinct valuation sources: User Assumption (`user_assumption`), Appraisal Report (`appraisal`), Broker Price Opinion (`bpo`), and Automated AVM (`avm`).
   - Displays real-time hold-period appreciation metrics (total dollar gain and percentage change) comparing the earliest and latest valuations in the series.
2. **Appraisal & BPO Document Attachments**:
   - Allows attaching a document name and simulated Firebase Storage URL (`documentUrl` and `documentName`) when adding a formal Appraisal or BPO valuation.
   - Renders clickable document files directly inline in the timeline with professional PDF icons.
3. **Legacy Fields Alignment**:
   - Adding or deleting a valuation automatically triggers sorting of the dated series (newest first).
   - Syncs the most recent valuation amount to the `estimatedCurrentValue` field to seamlessly update exit-gate validation rules.

---

## Part 14 — Go To Market Rent Path (Card H5.R)

1. **Rent Marketing Panel (`RentGoToMarket`)**:
   - Implemented a dedicated marketing card loaded dynamically when `dispositionType === 'RENT'` (Buy & Hold / Rental / BRRRR strategies).
   - Allows investors to define a target monthly lease rate, saved directly to the `target_rent` (cents) field in Firestore.
2. **Active Listing & Ad Logs**:
   - Created a listing ledger tracking active rental ads across platforms (Zillow, Craigslist, Facebook Marketplace, Apartments.com, etc.).
   - Saves entries with custom listed rents, listed dates, statuses (`active` | `paused` | `removed`), and links to live ad listings.
3. **Application Screening Requirements**:
   - Standardizes rental tenant placement with key checks: Credit Score Check, Criminal Background Check, Income & Employment Verification, Prior Eviction Search, and Landlord References.
   - Supports defining custom criteria checklists with checking/unchecking states, saved in the `screening_checklist` schema in Firestore.

---

## Part 15 — Go To Market Lease Path (Card H5.L)

1. **Commercial Lease Panel (`LeaseGoToMarket`)**:
   - Implemented a dedicated commercial marketing card displayed dynamically when `dispositionType === 'LEASE'`.
   - Collects target lease terms including Monthly Base Rate (`rateCents`), Lease Term (`termMonths`), sqft, and Lease Type (`type`: NNN / Modified Gross / Gross).
2. **Lease Listing Log Ledger**:
   - Tracks active advertisements and listings on commercial property sites (LoopNet, Crexi, CoStar, MLS, etc.).
   - Persists custom listed rents, listed dates, statuses (`active` | `paused` | `removed`), and listing links in the `listing_ads` collection.

---

## Part 16 — Go To Market Sale Path (Card H5.S)

1. **Sale Disposition Panel (`SaleGoToMarket`)**:
   - Implemented a dedicated sale path card displayed dynamically when `dispositionType === 'SALE'` (Fix & Flip / wholesale / Build & Sell routes).
   - Allows investors to set the target sale list price (`list_price_sale` in cents).
2. **Listing Agent Vendor Slot**:
   - Implemented a structured vendor card slot to assign a licensed Listing Agent (`listing_agent_vendor` as `F4VendorAssignment`).
   - Supports manual vendor input (Name, Company/Brokerage, Email, Phone) and clean unassignment features.
3. **Syndication Portal Ad Logs**:
   - Integrates the listing ad log ledger to track active MLS, Redfin, Zillow, or Realtor.com listings.
   - Logs custom listing prices, listed dates, statuses (`active` | `paused` | `removed`), and live listing links.

---

## Part 17 — Event-Triggered Hold Gate (Lifecycle Progression)

1. **Gating Dashboard & Indicators (`EventTriggeredHoldGate`)**:
   - Replaced the manual checkbox checklist component with an event-driven lifecycle gate.
   - Monitors the 3 specific exit transition events: first confirmed rent payment, activated lease, and sale under contract.
   - Embeds visual simulation triggers for testing (Record confirmed rent, Activate lease, Mark sale under contract).
2. **Auto-Advance server endpoint (`/api/projects/[id]/hold/auto-advance`)**:
   - Implemented a secure Next.js POST endpoint to transition the project to Phase 4 (Exit) once an event fires.
   - Calculates the operating baseline (acquisition cost basis + capitalized improvements + accumulated holding costs) and writes it alongside the specific triggering marketing outcome to the database.
   - Fires a `PHASE_TRANSITION` notification to the Lead Investor (project owner).
3. **Visual Celebration Overlay**:
   - Renders a gorgeous fullscreen confetti overlay when the transition fires to celebrate completing Phase 3 before redirecting.

---

## Part 18 — Retrospective Entry Wizard (E0)

1. **Confirmation-Style Wizard Component (`RetrospectiveWorkspace`)**:
   - Refactored the historical backfill entry screen into a step-by-step sequential wizard (5 distinct cards).
   - Card 1: **Core Purchase Details** (Acquisition price, acquisition date, address).
   - Card 2: **Renovation Costs** (Total CapEx / Rehab spend).
   - Card 3: **Financing Facts** (Leverage toggle: Cash vs Loan Amount, interest rate, amortization term).
   - Card 4: **Ongoing Carrying Costs & Exit** (Gross rent/Lease date or Actual sale price/Sold date, alongside itemized taxes, insurance, security, maintenance, utilities, management fee, HOA, capex reserve, other income).
   - Card 5: **Title & Closing Documents** (Archiving HUD-1, deeds, appraisal reports).
2. **Real-time Performance Metrics Display**:
   - Integrates live CCIM derived indicators (IRR, Cash Flow, Cap Rate, DSCR, Cash-on-Cash Return, and All-in Cost basis) directly recalculating in a side panel as the user types.
3. **Visual Stepper & Success Celebration**:
   - Includes a sleek, glass-morphic progress bar and page step indicator.
   - Triggers beautiful CSS-based falling confetti particles upon completing step 5 and committing to the database.

---

## Part 19 — Rent Roll & Occupancy Tracker (E1.R)

1. **Schema Updates (`schema.ts` & `projectSchema.ts`)**:
   - Added `RentReceivedEntry` interface and `rent_received` array to `ProjectFinancials`.
   - Enabled Zod validation schema `rentReceivedEntrySchema` and validation in `projectFinancialsSchema`.
2. **Interactive Rent Roll Component (`RentRollCard.tsx`)**:
   - Built a premium dashboard card for tracking rental income per unit (multi-family support).
   - Displays Plaid connection status with connected simulations. Proposes detected rent transactions matching unit rents.
   - Allows users to `[Confirm]` proposed transactions (instantly adding them to the verified ledger and updating occupancy stats) or `[Ignore]` them.
   - Includes manual rent payment entry: Unit ID, Tenant Name, Date, and Amount in dollars.
   - Renders a clean verified Rent Ledger table displaying receipt history.
3. **Days-Occupied Unit Ledger**:
   - Tracks occupied days vs total cycle days for each unit.
   - On change, aggregates total occupied/billing cycle days and updates `daysOccupied` and `totalHoldDays` in the database, automatically driving live occupancy rate calculations.

---

## Part 20 — Lease Operations & Payment Ledger (E1.L)

1. **Schema & Zod Validation Updates (`schema.ts` & `projectSchema.ts`)**:
   - Added `LeaseIncomeEntry` and `ActualLeaseTerms` interfaces to `ProjectFinancials`.
   - Enabled Zod validation schemas `leaseIncomeEntrySchema` and `actualLeaseTermsSchema` and wired them inside `projectFinancialsSchema`.
2. **Lease Operations Component (`LeaseOperationsCard.tsx`)**:
   - Built a high-fidelity card component displaying activated lease terms (Monthly Lease Rate, term in months, escalations description, and Lease Type: NNN, Modified Gross, Gross).
   - Simulates a Plaid connection stream proposing commercial lease transactions that can be confirmed or ignored.
   - Includes manual payment logger (Amount and Payment Date) and a verified payments table displaying logged receipts.
3. **Integration**:
   - Conditional rendering in Phase 4 Exit page triggers when `project?.dispositionType === 'LEASE'` and displays commercial lease metrics/inputs instead of residential.

---

## Part 21 — Sale Operations & Closing Checklist (E1.S)

1. **Schema & Zod Validation Updates (`schema.ts` & `projectSchema.ts`)**:
   - Added `sale_contract_price`, `sale_buyer_contingencies` (as an array of `Contingency` items), `sale_price`, `selling_costs`, and `sale_closed_date` to `ProjectFinancials`.
   - Enabled Zod validation for all newly added fields inside `projectFinancialsSchema`.
2. **Sale Operations Component (`SaleOperationsCard.tsx`)**:
   - Built a high-fidelity card component displaying three stages of a property transaction: Listed, Under Contract, and Closed.
   - **Listed State**: Allows marking a property under contract by entering a contract price.
   - **Under Contract State**: Displays contract price, renders the Buyer Contingency Tracker with custom date converters and waive/satisfy checkbox interactions, and displays document upload inputs for Sale Contract, Settlement Statement, and Deed Out.
   - **Close of Escrow**: Enforces document upload constraints before final validation. Saves the final sale price, selling costs, and closing date to the database, updating the project status to Phase 4 realized exit.
   - **Closed State**: Displays final realized metrics and clickable PDF slots for downloading transaction closing documents.
3. **Integration**:
   - Registered `SaleOperationsCard` under the `Sell` path of the main workspace page [`phase-4/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/projects/[id]/phase-4/page.tsx).

---

## Part 22 — Operating Actuals & Plaid Expense Attribution Feed (E2.1)

1. **Schema & Zod Validation Updates (`schema.ts` & `projectSchema.ts`)**:
   - Added canonical opex arrays (`opex_tax`, `opex_insurance`, `opex_security`, `opex_maintenance`, `opex_utilities`, `opex_management`, `opex_hoa`, `opex_capex`) containing `OpexEntry[]` items.
   - Wired schemas inside `projectFinancialsSchema` for strict type validation.
2. **Operations & Plaid Component (`OperatingActualsCard.tsx`)**:
   - Created the component displaying KPI grids for Actual Operating Revenue, Actual Operating Expense (OpEx), and Actual Net Operating Income (NOI).
   - Dynamically proposes Plaid bank feed attributions. Proposes management fees computed on gross scheduled rent (enforcing **BUG-8 Gross PM Fee** rule, e.g. 10% of monthly gross scheduled rent).
   - Provides a categorized ledger list on the left and a detailed list with manual additions and delete capabilities on the right.
3. **Core Metric Integrations (`reiMetrics.ts`)**:
   - Replaced fallback calculations to aggregate category opex inputs dynamically.
   - Computes actual NOI and actual Operating Expense Ratio (OER) based on the live confirmed categories.
4. **Integration**:
   - Registered `OperatingActualsCard` under the `Rent` and `Lease` panels of Phase 4 exit workspace [`phase-4/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/projects/[id]/phase-4/page.tsx).

---

## Part 23 — Value Updates & Appreciation Tracker (E3.1)

1. **Valuation Data Operations (`phase-4/page.tsx`)**:
   - Added `handleAddValuation` and `handleDeleteValuation` callbacks to handle adding and deleting entries in the `current_value` dated series.
   - Synchronizes `current_value` array and updates the `estimatedCurrentValue` value in Firestore.
2. **CurrentValueTracker Rendering**:
   - Registered and rendered the `CurrentValueTracker` component inside the `Rent` and `Lease` panels of Phase 4 exit workspace [`phase-4/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/projects/[id]/phase-4/page.tsx).
   - This component tracks chronological valuations, supports file attachments for appraisals, and calculates the appreciation percentage and cash gain dynamically.

---

## Part 24 — Actual Scorecard (E3.2)

1. **Comparison UI Component (`ActualScorecard.tsx`)**:
   - Created a dedicated `ActualScorecard` component that replaces the legacy flat KPI grids with side-by-side projected vs. actual comparison widgets.
   - Shows live variance badges for each metric (with context-specific coloring indicating outperformance/underperformance).
   - Dynamically shifts comparison variables depending on the strategy:
     - **Rent / Lease**: IRR, NOI, Cash-on-Cash, Cap Rate, Annual Cash Flow, Operating Expense Ratio (OER), and Occupancy Rate.
     - **Sell**: IRR, Net Profit, Net ROI, Total Appreciation, Renovation Costs, and Hold Timeline.
   - Supports scaling values by ownership share (`property` vs `myShare` toggles).
2. **IRR Lifecycle State Mapping**:
   - IRR is dynamically resolved based on the sale status. It renders as **Projected IRR** using underwriting assumptions prior to closing, and automatically locks/transforms to **Actual IRR** upon sale realization.
3. **Integration**:
   - Wired `ActualScorecard` inside [`phase-4/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/projects/[id]/phase-4/page.tsx) right column.

---

## Part 25 — Permanent Record Archive (E3.3)

1. **Document Categories Registration (`schema.ts`)**:
   - Added E3.3 archiving document categories to the `DocumentCategory` union type: `Title Policy`, `Closing Sets`, `Warranties`, and `Tax Documents`.
2. **Permanent Record Archive Integration**:
   - Integrated the `DocumentVault` at the bottom of the left column in [`phase-4/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/projects/[id]/phase-4/page.tsx) with the categories `['Deed', 'Title Policy', 'Closing Sets', 'Warranties', 'Tax Documents']`.
   - Title: **Permanent Record Archive**.
   - Description: **Store deed, title policy, closing sets, warranties, and tax documents for the project's permanent history.**
   - Configured to show "always" for all exit strategies (Rent, Lease, and Sell).

---

## Part 26 — Sale Completion & Equity Distributions (E1.S / Decision F-1)

1. **Reconciliation Integration (`phase-4/page.tsx`)**:
   - Rendered the `CrowdfundingReconciliation` component upon sale realization when a project has a fractional investor structure.
   - Shows the final wire payouts (original contribution + profit share) for each investor based on the terminal realized net profit.
   - Added a clear footer disclaimer aligning with Decision F-1: *Distribution movements are recorded off-platform per Decision F-1.*
2. **Reinvestment Notice**:
   - Rendered a custom *Reinvestment Notice* info card clarifying that reinvestment is tracked at the portfolio level (since every new acquisition is structured as a new, separate project).
3. **Status Banners & Reconciliation Header**:
   - Re-labeled Phase 4 page banners to transition the project title visually from "Archived & Locked" to **Project Complete** (e.g. `Project Complete · Sale Closed` sticky header status, `Project Complete` ready chip, and updated terminal summary descriptions).

---

## Part 27 — Appendices Integration

1. **Design System Documentation (`DesignSystem.md`)**:
   - Appended the **Appendices** (A, B, C, D) detailing phase ownership of headline-10 variables, canonical enumerations (phases, renovation tiers, disposition type, opex categories), gate transitions summary, and extension protocols.

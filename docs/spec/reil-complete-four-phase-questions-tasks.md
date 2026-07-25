# REIL — Complete Four-Phase Questions & Tasks
### v1.1 · The card-level authority for every question, task, and data point across the Real Estate Investment Lifecycle.
### File path (fixed — referenced by the skill and all build packs): `docs/spec/reil-complete-four-phase-questions-tasks.md`

**Provenance (read before building against this doc):** v1.1 supersedes the uncommitted v1 authored in the July 14 architecture session, which was never committed to the repository (the phantom-spec finding of the FD-1 pre-scan). This version is regenerated from the founder's REIL source description and the committed decision canon (the `paperworking-reil` skill, the AQ Series, the 33-metric collection matrix, the CD-series founder confirmations, and the FD Series pack). Two consequences:

1. **Acquisition reconciliation rule.** The Acquisition phase is already built (AQ-1…AQ-30, evidence-reviewed). Where this doc's Acquisition section diverges from the built system, **the built system wins** and this doc is corrected — never the reverse. FD-2 performs that reconciliation and reports divergences to the founder; agents never "fix" working Acquisition surfaces to match this text.
2. **Reconstruction markers.** Items marked ⚠ were reconstructed from memory of the architecture session rather than retrieved verbatim; they carry founder-review priority and FD-2 reconciliation priority.

**The REIL in the founder's words:** the REIL is the systematic project management system for Real Estate Investors — four phases. Acquisition targets and begins acquiring the property, including CrowdFunding by building an investor mailing list. Fund is where the project is funded — all-cash, or a partnership where each partner has equity in the deal. Hold logs the costs of holding, executes the renovation budget (Stage, Refurbish, Renovate, Gut, or Develop), and puts out ads per the strategy declared in Acquisition. Exit begins when the property starts to earn money — from Rent, Lease, or Sale — and records the property's performance thereafter. A user entering with an already-monetized property skips the Kanban and goes straight to Exit (Retrospective Mode), entering sale price, renovation costs, and ongoing costs so the system can chart, graph, and visualize the 33 key datapoints investors need.

---

## HOW TO READ THIS DOC — card anatomy

Every card below is specified in a fixed compact format:

> **Card X.Y — Name** · **Q:** the on-screen question, plain language · **Why:** the "why we ask" line shown beneath it · **Writes:** registry variables `(type · source-tag · slot)` · **Reveals:** condition, or "always" · **Docs/Vendors:** checklist items and vendor slots the card opens, if any

Governing laws (from the skill, restated once): one decision per screen; conditional cards render only when triggered; nothing asked twice — every variable has one home, pre-filled elsewhere as a confirmation; every input is atomic (users never enter a metric); all metric math lives in `deriveAllProjectMetrics`; projected and actual never conflate; `disposition_type` (SALE | LEASE | RENT) is one canonical field with exactly two entry doors (Intake Router, Declare Strategy card); expense categories are exactly `tax, insurance, security, maintenance, utilities, management, HOA, capex`; renovation tiers are exactly Stage, Refurbish, Renovate, Gut, Develop; save/resume everywhere; completed cards reopen and edits recompute downstream.

---

## PHASE 0 — INTAKE ROUTER (Create Project)

The router determines where in the lifecycle the property enters. It is not a phase; it is the front door.

**Card 0.1 — Property address** · **Q:** "What's the property's address?" · **Why:** the address names your Deal — the public face investors see; you command the Project it lives in. · **Writes:** `deal_address (text · user_actual)`; creates Project + Deal · **Reveals:** always (predictive address search per the PF Series entry point)

**Card 0.2 — Current stage** · **Q:** "Where does this property stand today?" — options: *Targeting it (not yet purchased) · Under contract / purchasing now · I own it — renovating or preparing it · It's already earning (rented, leased, or sold)* · **Why:** we start you exactly where the work is, and skip everything behind you. · **Writes:** `project_entry_point (enum · user_actual)` · **Routes:** Targeting → Acquisition (Target column) · Purchasing → Acquisition (Offer/DD columns, with Target/Underwrite presented as rapid confirmations) · Renovating/preparing → Hold (Fund presented as Retrospective capture of financing facts) · Already earning → **Retrospective Mode → Exit** (see Phase 4 entry E0)

**Card 0.3 — Property type** · **Q:** "What kind of property is this?" (single-family, multi-family units count, condo/HOA, commercial, land, mixed-use) · **Why:** property type decides which questions, documents, and vendors ever appear. · **Writes:** `property_type (enum · user_actual)`, `unit_count (int · user_actual)` if multi-family · **Reveals:** always

**Card 0.4 — Disposition door #1 (Retrospective entries only)** · **Q:** "How is it earning — or how did it conclude?" (Sold · Leased · Rented) · **Why:** this sets the strategy field the whole system keys on. · **Writes:** `disposition_type (enum · user_actual)` — the intake door of the two-door rule; for forward-path entries this card does NOT render (the Declare Strategy card is their door) · **Reveals:** entry point = already earning

---

## PHASE 1 — ACQUISITION ⚠ (built; reconciliation rule applies to this entire section)

**Purpose:** the user targets and begins the process of acquiring the property. Acquisition secures the *right and intent* to buy at known terms; it also hosts CrowdFunding — building the investor mailing list, sharing the Deal, and logging non-binding interest. Six columns, progressively revealed.

### Column A1 — TARGET

**Card 1.1 — List price** · **Q:** "What's the asking price?" · **Why:** first input to your screening math. · **Writes:** `list_price (currency · user_actual)` · **Reveals:** always

**Card 1.2 — Market rent estimate** · **Q:** "What could this property rent for?" (data-provider estimate offered where available, else user entry) · **Why:** rent versus price is the fastest go/no-go screen investors use. · **Writes:** `gross_annual_rent (currency · user_assumption or document · projected)` · **Reveals:** always — GRM becomes computable here, the screening metric that works before an offer exists

**Card 1.3 — Target basics** ⚠ · **Q:** short confirmations — beds/baths/sqft/year built (provider-prefilled where available) · **Why:** these drive which diligence and renovation questions you'll see later. · **Writes:** `property_facts (struct · document or user_actual)`, `year_built (int)` · **Reveals:** always

### Column A2 — UNDERWRITE

**Card 2.1 — Income assumptions** · **Q:** "Confirm or adjust the expected rent." · **Why:** every projection starts from income. · **Writes:** confirms `gross_annual_rent (projected)` · **Reveals:** always

**Card 2.2 — Vacancy assumption** · **Q:** "What vacancy should we assume?" (guidance chip: 5–10% is customary) · **Why:** nobody collects 100% of scheduled rent; this keeps your NOI honest. · **Writes:** `vacancy_rate (percent · user_assumption · projected)` · **Reveals:** always

**Card 2.3 — Operating expense assumptions** · **Q:** one screen per canonical category, only those relevant: tax, insurance, security, maintenance, utilities, management, HOA (if 0.3/HOA), capex reserve · **Why:** these eight buckets are the whole expense story — and they're the Schedule E story at tax time. · **Writes:** `expense_<category> (currency · user_assumption · projected)` ×8 · **Reveals:** category-conditional (HOA only if HOA property; management only if not self-managing — asked) · **BUG-8 law:** the management fee is computed on **gross scheduled rent**, never effective rent — this is a locked golden-file condition

**Card 2.4 — Purchase assumptions** · **Q:** "What do you expect to pay?" and "How much down / financed?" · **Why:** your offer strategy and the financing you'll actualize in Fund both start here. · **Writes:** `expected_purchase_price (currency · user_assumption · projected)`, `down_payment_pct (percent · user_assumption · projected)`, `est_rate (percent · user_assumption · projected)`, `est_term_years (int · user_assumption · projected)` · **Reveals:** always

**Card 2.5 — Closing & upfront cost assumptions** · **Q:** "Estimated closing costs?" and "Upfront repair budget before it's ready?" · **Why:** cash invested is more than the down payment — this is the rest of it. · **Writes:** `closing_costs (currency · user_assumption · projected)`, `upfront_rehab_budget (currency · user_assumption · projected)` · **Reveals:** always

**Card 2.6 — Hold assumptions** ⚠ · **Q:** "How long do you plan to hold?" and "What annual appreciation should we assume?" · **Why:** these power projected IRR and long-term appreciation. · **Writes:** `hold_period_years (int · user_assumption · projected)`, `appreciation_rate (percent · user_assumption · projected)` · **Reveals:** always

**Card 2.7 — The KPI scorecard** · not a question — the payoff screen: all 10 headline KPIs render **projected** from the live `deriveAllProjectMetrics` call (NOI, Cash Flow, Cap Rate, Cash-on-Cash, GRM, DSCR, IRR, Occupancy [shows the vacancy assumption's implication], Expense Ratio, Long-Term Appreciation) with benchmark guidance chips (cash-on-cash 8–12%, GRM 4–7, expense ratio 35–45%, cap rate 4–10% as guidance; DSCR below ~1.20–1.25× as a prominent warning since financing will hinge on it in Fund) · **Reveals:** when A2 income+expense+purchase cards complete

### Column A3 — DECLARE STRATEGY

**Card 3.1 — The strategy card (door #2)** · **Q:** "What's the plan for this property — Sell, Lease, or Rent?" · **Why:** everything downstream — Hold's work, Exit's tracking, even which vendors you'll meet — keys on this one answer. · **Writes:** `disposition_type (enum · user_actual)` — never re-asked anywhere, ever; the legacy `strategyType` field is a defect on sight · **Reveals:** always (hard gate: A3 must complete before A4 opens)

### Column A4 — OFFER / LOI

**Card 4.1 — Offer terms** · **Q:** "What are you offering?" (price, earnest money, key terms) · **Why:** the offer is the first real number of the deal. · **Writes:** `offer_price (currency · user_actual)`, `earnest_money (currency · user_actual)`, `offer_terms (text)` · **Reveals:** always in forward path

**Card 4.2 — Offer outcome** · **Q:** "Where does the offer stand?" (submitted → countered → accepted / rejected) · **Why:** acceptance is the moment the clock starts. · **Writes:** `accepted_price (currency · user_actual)` on acceptance (actualizes 2.4's expectation), `contract_executed_date (date · user_actual)` · **Reveals:** after 4.1 · **Docs:** executed purchase & sale agreement upload

### Column A5 — DUE DILIGENCE

**Card 5.1 — Inspection** · **Q:** "Schedule and record the inspection." · **Why:** what you learn here is negotiating leverage and a repair map. · **Writes:** `inspection_status`, `inspection_findings (text)` · **Docs:** inspection report · **Vendors:** home inspector slot · **Reveals:** contract executed

**Card 5.2 — Age-conditional tests** · **Q:** radon / lead / termite branch · **Why:** older homes carry these specific risks. · **Writes:** per-test status/results · **Reveals:** `year_built` before threshold or inspector flag · **Vendors:** environmental/pest

**Card 5.3 — Commercial environmental** · **Q:** Phase I ESA · **Why:** contamination can make a property un-financeable. · **Reveals:** `property_type = commercial/mixed` · **Docs:** ESA report · **Vendors:** environmental firm

**Card 5.4 — HOA branch** · **Q:** "Is there an HOA?" → dues, CC&Rs request · **Writes:** `hoa_dues (currency · projected→actual)` into the `HOA` category · **Reveals:** property type/0.3 flag · **Docs:** CC&Rs

**Card 5.5 — Title opening** ⚠ · **Q:** "Who's handling title?" (record/assign) · **Why:** title work starts now; Fund finishes it. · **Vendors:** title/escrow slot (carried into Fund F4) · **Reveals:** contract executed

**Card 5.11 — Contingency deadline tracker** · **Q:** enter each contingency and its deadline (inspection, appraisal, loan approval, others) · **Why:** missed contingency deadlines are the most common way deals and deposits are lost — this card alerts before that happens. · **Writes:** `contingency[] (name, deadline, status)` with deadline alerts · **Reveals:** contract executed

**Card 5.12 — Go / no-go** · **Q:** "All diligence in — do you proceed?" (proceed / renegotiate / walk, with reason) · **Why:** the recorded decision that closes diligence. · **Writes:** `dd_decision (enum · user_actual)`, reason text · **Reveals:** 5.11 contingencies resolved or waived

### Column A6 — CROWDFUNDING INTEREST (scope locked)

Mailing list + Deal one-pager + **non-binding** LOI/soft-commit logging ONLY. No payments, no escrow, no KYC, no wiring instructions — ever. Non-binding disclosure language locked on.

**Card 6.1 — Raise or solo?** · **Q:** "Funding this yourself, or inviting investors?" · **Writes:** `capital_intent (enum: solo | group | raise · user_actual)` — carried to Fund's modality card as a pre-fill · **Reveals:** always (may be answered "solo" and the column closes)

**Card 6.2 — Investor mailing list** · **Q:** build/import the list · **Why:** your raise is only as strong as the list you can reach. · **Writes:** mailing-list entries (AQ-29 structures) · **Reveals:** capital_intent ≠ solo

**Card 6.3 — The Deal one-pager** · **Q:** review the generated one-pager (Deal identity + projected scorecard, honestly labeled Projected) · **Reveals:** 2.7 complete + capital_intent ≠ solo

**Card 6.4 — Share & log interest** · **Q:** share to the Deal Marketplace and/or email the list; log LOIs and soft commitments against the equity target · **Writes:** `loi_log[] (investor, amount, date, status: soft-committed)`, `equity_target (currency)` · **Why:** interest now becomes subscriptions in Fund — nothing binding happens here. · **Reveals:** 6.2/6.3 complete

### GATE — Acquisition → Fund (checklist gate, evaluated from live data) ⚠ criteria 1–6 reconstructed; 7–8 canon-verbatim

1. Deal established: address, property type, entry point recorded. 2. Underwriting complete: scorecard 2.7 rendered from live derive call. 3. Strategy declared: `disposition_type` set. 4. Offer accepted at known terms: `accepted_price` + executed contract recorded. 5. Earnest money recorded. 6. Required diligence documents for the property type on file. **7.** All contingencies satisfied or waived within deadline, and a "proceed" go/no-go decision recorded — Cards 5.11 + 5.12 complete. **8.** Capital plan set: all-cash/solo confirmed, or (if crowdfunding/partnership) investor mailing list built, Deal shared, and investor LOIs/soft commitments logged sufficient to the equity target — Column 6 complete or explicitly bypassed.

**Explicitly deferred to Fund (canon-verbatim):** executing the loan/mortgage and lender closing conditions; collecting actual partner equity contributions; converting investor soft commitments into binding capital (and any KYC/accreditation/payment/escrow-funding mechanics that a real capital raise would require); final settlement, funds disbursement at closing, deed recording, and title transfer. *Acquisition secures the right and intent to buy at known terms; Fund moves the money and closes.*

Red criteria block; typed override reason unblocks, is stored, and is displayed. Passage celebrates and carries the payload: accepted price, capital intent, LOI log, DD artifacts (referenced, not copied).

---

## PHASE 2 — FUND (specified in this doc at full fidelity; built by the FD Series)

**Purpose:** the project is funded — all-cash, a partnership where each partner has equity in the deal, a syndication, debt, or a hybrid — and the transaction closes. Fund records, coordinates, and verifies capital events; it **never moves money** (Decision F-1: all wires and disbursements occur off-platform; PaperWorking stores the commitment, the status, and the evidence). Fund is also where Acquisition's financing assumptions become actuals. Six columns; a solo-cash Project renders only F1 → F4 → F5 → F6.

### Column F1 — CAPITAL PLAN

**Card F1.1 — Modality** · **Q:** "How is this purchase being funded?" (Solo cash · Co-buying group · Syndication GP/LP · Conventional mortgage · Hard money · Bridge · SBA 504 · Hybrid — compose multiple) · **Why:** this one answer shapes every card that follows — and hides every card that doesn't apply. · **Writes:** `funding_modality (enum[] · user_actual)` — pre-filled from Acquisition's `capital_intent` as a confirmation · **Reveals:** always · changing modality after downstream data exists triggers guarded reconciliation (affected records shown, archived, never silently deleted)

**Card F1.2 — Capital stack** · **Q:** compose the sources against the total project cost (price + closing costs [projected until actualized] + upfront rehab if financed) · **Why:** every dollar of the project accounted for — the gap you see is the gap that's real. · **Writes:** `capital_source[] (type, amount, seniority, status)`; stack ordered senior debt → junior debt → equity; unfunded gap displayed honestly · **Reveals:** F1.1 answered

**Card F1.3 — Total cash invested (assembly, never a field)** · not a question — the assembly display: down payment (Fund) + closing costs (Acquisition-projected, awaiting actual) + upfront rehab (Acquisition), each component deep-linking to its home card and labeled projected/actual · **Why shown:** this is your Cash-on-Cash denominator, built from its parts. · **Reveals:** F1.2 begun · there is never an editable "total cash invested" field anywhere

**Card F1.4 — Proof of funds** · **Q:** per equity source — "Upload proof of funds; mark it verified when reviewed." (status: requested → received → verified, set by the Lead Investor) · **Why:** sellers and agents move faster when the cash is evidenced. · **Writes:** `pof_status per source`, document ref · **Docs:** proof-of-funds upload to Data Room · **Reveals:** any cash/equity source exists · no Plaid Assets product; an in-scope Plaid balance may display as context only, never as verification (Decision F-2)

### Column F2 — EQUITY (reveals when modality includes any equity beyond solo)

**Card F2.1 — Party roster** · **Q:** "Who's in this deal?" (co-buyers / LPs / GP; individual or entity; contact; platform-linked via Investment Team or off-platform record) · **Why:** the people and their roles come before the percentages. · **Writes:** `equity_party[] (role, entity_type, linkage)` · Lead Investor defaults to GP in syndication; per-phase permissions govern linked parties' visibility · no KYC, no accreditation fields (Decision F-1)

**Card F2.2 — Title holding (co-buy)** · **Q:** "How will title be held — Tenants in Common, or Joint Tenancy with Right of Survivorship?" (plain-language explainers; the note that this choice belongs in counsel's hands) · **Why:** TIC allows unequal, independently transferable shares; JTWROS means equal shares with survivorship — the difference matters most on the worst day. · **Writes:** `title_holding (enum)`, per-party `ownership_pct` (TIC: entered or contribution-derived, sums to 100.00%; JTWROS: equal enforced) · **Reveals:** modality includes co-buying · **Docs:** co-ownership agreement (counsel-prepared upload; signature status tracked)

**Card F2.3 — Cap table (syndication)** · per-LP commitments, GP co-invest, equity %, status from the ledger; totals reconcile to the stack's equity requirement with an honest gap; "GPs conventionally co-invest ~10%" renders as guidance, never a block · **Reveals:** modality includes syndication

**Card F2.4 — Economics** · **Q:** one decision per screen — structure (straight split | preferred return + split | tiered waterfall), then its parameters (ratio; pref rate + cumulative/non-cumulative; cash-on-capital tiers) · **Why:** how distributions compute later, agreed now. · **Writes:** `distribution_structure (struct)` — computed by the single distribution engine; card preview runs the engine on a clearly labeled hypothetical amount; IRR-based tiers deferred (honest on-card note) · **Reveals:** syndication

**Card F2.5 — Subscriptions** · **Q:** advance each Acquisition soft commitment through `soft-committed → docs out → signed → funds confirmed (off-platform)` — every transition a recorded human action with date, actor, and evidence at signed/confirmed steps · **Why:** interest becomes capital here — on paper you can point to. · **Writes:** ledger transitions; cap table updates · **Docs:** subscription agreement (counsel-prepared; e-sign via DocuSign provider interface or manual signed-copy upload) · non-binding disclosure language remains until signature · **Reveals:** raise modality, seeded from the carried LOI log

**Card F2.6 — Contribution ledger** · the per-party record: committed vs confirmed amounts, status, evidence, dates; rollups drive equity % (where contribution-derived) and the stack's funded bar; exportable as the Capital Stack Statement PDF · **Reveals:** any equity party exists

### Column F3 — DEBT (reveals when modality includes any debt)

**Card F3.1 — Financing route** · **Q:** "Which instrument?" (Conventional · Hard money · Bridge · SBA 504; multi-loan for hybrids) with plain-language guidance chips (hard money: asset/ARV-based, fast, short; bridge: gap liquidity between a buy and a sale; SBA 504: owner-occupied commercial, three-part structure) · **Writes:** `loan_record[] (route)` · **Reveals:** debt in modality

**Card F3.2 — Lender package** · route-specific document checklist (conventional/SBA: 3yr personal & business returns, P&L, proforma, debt schedule, org docs, project cost breakdown; hard money/bridge: the shorter asset-focused set), each item upload-tracked with reminder cadence; labeled the *customary* package, adjustable to the actual lender's ask · **Docs:** the package, into the Data Room Debt folder

**Card F3.3 — Loan estimates** · **Q:** upload each Loan Estimate → split-view capture (lender, amount, rate, term, points, est. costs — all source-tagged `document`) → compare estimates side-by-side with implied debt service from the shared amortization utility → "choose this loan" · **Why:** compare on the same math, then commit. · **Writes:** estimate candidates (history kept), chosen → active `loan_record`

**Card F3.4 — Underwriting milestones** · status chain per loan: application submitted → processing → appraisal ordered → appraisal received (captures `appraised_value (currency · document)` → LTV) → conditions issued → conditions cleared → clear-to-close; transitions post to the timeline and fire notifications · **Why:** the loan's clock, visible.

**Card F3.5 — Locked terms** · **Q:** confirm the final amount / rate / term / points into `actual` slots · **Why:** this is the moment your projections become your deal — DSCR, Cash Flow, and Cash-on-Cash go live from here. · **Writes:** `loan_amount, rate, term, points (actual)`; `annual_debt_service (derived)` via the shared amortization utility; never user-enterable · DSCR lender-minimum warning (~1.20–1.25×) prominent when unmet

**Card F3.6 — SBA 504 route** · **Q sequence:** occupancy eligibility (existing ≥51% owner-occupied, or new construction ≥60% with 80% within ten years — captured as the borrower's attested projection); business-credit context (PAYDEX / FICO SBSS / Intelliscore as user-provided values, source noted — never fetched or fabricated; guidance chips: PAYDEX 80+, SBSS ≥165 prescreen); injection tier (10% standard · 15% new-business or special-purpose · 20% both) · **Writes:** two loan records (bank 50% first lien, CDC debenture second lien) + injection as equity; structure sums to 100% · **Vendors:** CDC slot opens in F4 · **Reveals:** SBA route · the platform organizes eligibility — it never determines it

**Card F3.7 — Hard money / bridge terms** · **Q:** ARV (`user_assumption` or `document` if an ARV appraisal uploads), loan-to-ARV %, points, rate, term months, interest-only flag, exit plan — which *reads* `disposition_type`, never re-asks it · **Writes:** the route's loan record; interest-only handled correctly by the shared utility; selects the compressed timeline template · **Reveals:** hard money / bridge route

### Column F4 — TITLE & CLOSING TEAM (reveals on Fund entry)

**Card F4.1 — Team slots** · the Fund vendor roster per this deal's needs: title/escrow (carried from 5.5 if assigned), closing attorney (jurisdiction-gated), appraiser (lender-triggered), environmental firm (commercial), CDC (SBA), surveyor, insurance broker, private/hard-money lender — each slot assignable from the Professional Marketplace or recorded off-platform · **Why:** the deal's team, discoverable when each expertise is actually needed.

**Card F4.2 — Attorney (jurisdiction-gated)** · **Q:** "This property is in an attorney-close state — assign your closing attorney." · language exactly: *attorney involvement is customary or required in this state; confirm with your title contact* · config-driven state list (seeded NY, GA, MA + commonly recognized set; founder-editable data, never a legal determination) · **Reveals:** Deal state in config list · blocking line in the F6 gate

**Card F4.3 — RFP & bids** · **Q:** issue an RFP to multiple marketplace vendors from any slot; compare bids (price, turnaround, notes); assign — assignment notifies the vendor, creates their task, posts to the timeline · reuses the quote-request synchronization

**Card F4.4 — Insurance binder** · **Q:** "Annual premium?" (actualizes on binder upload) + conditional riders (flood/earthquake, by zone question — zone determinations come from your lender/insurer) · **Writes:** premium → `insurance` expense category → NOI via the derive function (no side-channel math; BUG-8 vigilance) · **Docs:** binder with effective date · **Vendors:** insurance broker

**Card F4.5 — Title workflow** · chain: order opened → commitment received (split-view capture: policy amount, effective date, exceptions count) → defects/cure list (each resolvable with note/document) → cleared · manual with evidence; Qualia-shaped provider interface behind a flag, mock only — production shows the honest manual chain, never a simulated sync

### Column F5 — CLOSING (reveals when F1 complete)

**Card F5.1 — Closing timeline** · milestones instantiated from the modality template (financed conventional ≈ 30–60 days: financing/title/appraisal → conditions cleared → CD delivered → closing; cash & hard money ≈ 7–14 days; SBA extended with CDC/SBA approval milestones), offsets from the executed-contract date; target dates editable; linked events set actuals automatically · **Why:** the phase's clock, honest about where it stands.

**Card F5.2 — Slippage & the three-day rule** · overdue milestones flag and notify with customary-causes guidance (underwriting backlog, title defects, repair negotiations); for financed routes, the Closing Disclosure must precede closing by ≥3 business days — the card warns when violated or when closing approaches with no CD recorded (*consumer-protection fact, stated factually*)

**Card F5.3 — Closing Disclosure capture** · **Q:** upload the CD → split-view capture actualizes final closing costs, cash to close, prepaids/reserves (all source-tagged `document`) · **Why:** the CD is where estimates end and the real numbers arrive.

**Card F5.4 — Cash-to-close reconciliation** · sources (confirmed equity + locked debt + earnest money credit) must equal uses (price + closing costs + prepaids/reserves); the variance bar shows the exact over/under and **blocks closing-complete while nonzero** (typed-override for legitimate edge cases, stored and displayed); one reconciliation engine, no component math, never auto-balanced

**Card F5.5 — Closing execution & recording** · **Q:** closing date; executed-docs checklist (deed, note if financed, settlement statement/CD, title policy, entity/assignment docs — each an upload with signed status); disbursement recorded as fact with the settlement statement as evidence (the platform records that funds moved — it never moves them); deed recording confirmation (county, date, instrument number) · completion archives the package to the Data Room's permanent record

**Card F5.6 — Actualization sweep** · every Fund-owned variable still carrying only a `projected` slot, presented with its projection, its source, and an actual prompt (auto-satisfied where a document capture already answered it); the projected-vs-actual variance view side-by-side with deltas — the founder's first reckoning, and the pattern Hold inherits · nothing re-asked that a capture answered

### Column F6 — FUND WRAP

### GATE — Fund → Hold (checklist gate, evaluated from live data)

Actual purchase price recorded · total cash invested fully actualized · loan terms actual (financed routes) · closing date recorded · deed recording confirmed · required closing documents archived · cash-to-close reconciled (or typed override stored) · attorney requirement satisfied where mandated. Red criteria block with the named criterion; typed override stored and displayed; passage celebrates and hands Hold its baseline (referenced, never duplicated): cost basis, in-service date candidate (closing date), debt service schedule reference, insurance premium, equity structure.

---

## PHASE 3 — HOLD

**Purpose:** the investor logs all the costs of holding the property, executes the renovation the budget declared, and puts the property in front of its market per the strategy declared in Acquisition. Hold is the **pre-income** phase: it ends automatically the moment the property starts earning (the event-triggered gate below). The strategy is never re-asked — every Hold card reads `disposition_type`.

### Column H1 — RENOVATION PLAN

**Card H1.1 — Scope tier** · **Q:** "What level of work does this property need?" — exactly five tiers with cost signaling: **Stage ($) · Refurbish ($$) · Renovate ($$$) · Gut ($$$$) · Develop ($$$$$)** · **Why:** the tier sets the budget conversation and the timeline expectation. · **Writes:** `renovation_tier (enum · user_actual)` · **Reveals:** always (Stage-tier Projects see a compressed H2)

**Card H1.2 — Budget & timeline** · **Q:** "What's the renovation budget?" and "Target completion date?" · **Writes:** `rehab_budget (currency · user_assumption · projected)` (reads 2.5's upfront figure as the starting confirmation), `rehab_completion_target (date)` · **Vendors:** contractor slots per tier · **Reveals:** always

### Column H2 — RENOVATION TRACKING

**Card H2.1 — Spend tracker** · running, editable-with-change-history log of renovation spend; entries categorize to `capex` (improvements) with plain-language guidance distinguishing improvements from repairs (`maintenance`) — *guidance, not tax advice* · **Writes:** `rehab_spend[] (amount, date, category, note)`; budget-vs-actual bar honest at all times · Plaid transaction auto-attribution proposes matches where connected — proposals, confirmed by the user, never silent writes

**Card H2.2 — Completion** · **Q:** "Renovation complete?" (actual date; final spend confirmation) · **Writes:** `rehab_completed_date (actual)`, actualizes `rehab_budget → rehab_spend_total`

### Column H3 — HOLDING COSTS

**Card H3.1 — Itemized monthly holding costs** · **Q:** one screen per relevant category — tax, insurance (pre-filled from F4.4's premium as a confirmation), security, maintenance, utilities, management, HOA, capex reserve · **Why:** vacancy has a monthly price; knowing it is how you protect your margin. · **Writes:** `holding_cost_<category> (currency · user_actual, recurring)` · loan carry displays from the Fund debt-service derivation — **never re-entered** · Plaid-connected accounts propose recurring cost attributions for confirmation

### Column H4 — MARKET & VALUE

**Card H4.1 — Current value** · **Q:** "Current estimated market value?" (`user_assumption`, or `document` when an appraisal/BPO uploads) · **Why:** appreciation is a third of long-run returns — track it, don't guess it at Exit. · **Writes:** `current_value (currency, dated series)`

### Column H5 — GO TO MARKET (strategy-conditional; "puts out ads")

**Card H5.R — Rent path** · **Q:** "List it: target monthly rent, where you're advertising, application screening checklist." · **Writes:** `target_rent (currency · user_assumption)`, listing/ad log, screening checklist state · **Reveals:** disposition_type = RENT

**Card H5.L — Lease path** · **Q:** commercial listing details, target lease terms (rate, term, NNN/gross flag) · **Writes:** `target_lease_terms (struct)` , listing/ad log · **Reveals:** disposition_type = LEASE

**Card H5.S — Sale path** · **Q:** "List it: list price, listing agent, where it's marketed." · **Writes:** `list_price_sale (currency)`, listing/ad log · **Vendors:** listing agent slot · **Reveals:** disposition_type = SALE

### GATE — Hold → Exit (EVENT-TRIGGERED — not a checklist)

The Project advances **automatically** on the first of: first confirmed rent payment · activated lease · sale under contract. No user checkbox; the triggering event is the gate. The advance notifies the Lead Investor, celebrates, and hands Exit the operating baseline: cost basis + capitalized improvements, holding-cost history, current value series, the marketing outcome that triggered it.

---

## PHASE 4 — EXIT

**Purpose:** *this phase begins when the investment property starts to earn money — from Rent, Lease, or Sale.* Exit records the property's performance: income, ongoing costs after rent/lease, and (for sales) the disposition itself. Exit is also the landing point for Retrospective Mode. Actuals here complete the 33 datapoints — actual NOI, Cash Flow, Cash-on-Cash, Occupancy, Expense Ratio, and finally actual IRR.

**E0 — Retrospective entry (from Intake Card 0.2 "already earning")** · the skip-to-Exit path in the founder's words: the user no longer needs the Kanban process — they enter the essentials and the system lights up the visualizations. Minimal backfill sequence (each a single confirmation-style card): purchase price & date · total renovation costs · financing facts if any (amount/rate/term — the shared utility derives the rest) · then straight into the E-columns below for ongoing entries (taxes, insurance, security, maintenance, and the other canonical categories). Title and closing documents upload for archiving. Nothing else from Phases 1–3 is required or asked.

### Column E1 — INCOME (disposition-conditional)

**Card E1.R — Rent roll** · **Q:** log rent as it arrives (per unit where multi-family) — Plaid auto-attribution proposes renter payments for confirmation where connected · **Writes:** `rent_received[] (amount, date, unit)` — actual income series; days-occupied tracking per unit powers actual Occupancy · **Reveals:** RENT

**Card E1.L — Lease income** · **Q:** activated lease terms (rate, term, escalations, NNN/gross) and payment logging · **Writes:** `lease_income[] series`, `lease_terms (actual)` · **Reveals:** LEASE

**Card E1.S — Sale under contract → closed** · **Q:** contract price, buyer contingencies/deadlines (the 5.11 tracker pattern reused), then at close: final sale price, selling costs, closing date · **Writes:** `sale_price (actual)`, `selling_costs (actual)`, `sale_closed_date` · **Docs:** sale contract, settlement statement, deed out · **Reveals:** SALE

### Column E2 — ONGOING COSTS (rent/lease)

**Card E2.1 — Operating actuals** · **Q:** the property's costs after rent/lease, per canonical category — tax, insurance, security, maintenance, utilities, management, HOA, capex — recurring entries with Plaid-proposed attributions · **Writes:** `opex_<category>[] (actual series)` — actual Expense Ratio and actual NOI compute from here; management fee on **gross scheduled rent** (BUG-8, forever) · **Reveals:** RENT/LEASE

### Column E3 — PERFORMANCE & ARCHIVE

**Card E3.1 — Value updates** · continue the `current_value` dated series (assumption or document) — actual Long-Term Appreciation · **Reveals:** RENT/LEASE

**Card E3.2 — The actual scorecard** · not a question — all applicable KPIs render **actual** from the live derive call, side-by-side with their Acquisition projections (the projected-vs-actual story is the product's promise kept) · IRR becomes actual at sale; projected-IRR renders until then, labeled

**Card E3.3 — Archive** · **Q:** store Title and other documentation for the permanent record — deed, title policy, closing sets, warranties, tax documents · **Why:** the Project outlives the transaction; the archive is the investment's institutional memory. · **Docs:** to the Data Room permanent archive · **Reveals:** always

**Sale completion:** an E1.S closed sale marks the Project complete (final actual IRR, equity distributions computed by the distribution engine where a structure exists — computed and displayed, movements recorded off-platform per Decision F-1). A new acquisition is a new Project — reinvestment is a portfolio event, not a phase.

---

## APPENDICES

**A. Phase ownership of the headline-10 variables (aligned to the 33-metric collection matrix):** NOI — Acquisition (projected) / Exit (actual, rent-lease operations) · Cash Flow — first computable Fund (debt service) · Cap Rate — Acquisition · Cash-on-Cash — first computable Fund (cash invested + debt service) · GRM — Acquisition (screening) · DSCR — first computable Fund (a lender metric) · IRR — projected Acquisition, actual Exit · Occupancy — actual from operations (Exit for RENT; vacancy assumption proxies earlier) ⚠ *reconciliation note: an earlier matrix pass attributed occupancy to "Hold"; skill rule 14's event-triggered gate places operations in Exit — this doc follows the skill; FD-2/HD-1 verify the matrix doc's wording when committed* · Expense Ratio — Acquisition (projected) / Exit (actual) · Long-Term Appreciation — Hold + Exit value series.

**B. Canonical enumerations (exhaustive):** phases Acquisition · Fund · Hold · Exit — never "Closing," "Hold & Rehab," or "Purchase" · renovation tiers Stage · Refurbish · Renovate · Gut · Develop · `disposition_type` SALE | LEASE | RENT (one field, two doors: Card 0.4, Card 3.1) · expense categories tax · insurance · security · maintenance · utilities · management · HOA · capex.

**C. Gate summary:** Acquisition→Fund — checklist, live data (8 criteria above) · Fund→Hold — checklist, live data (F6) · Hold→Exit — **event-triggered**: first confirmed rent, activated lease, or sale under contract; automatic.

**D. Extension protocol:** the HD and EX build packs may extend Hold/Exit cards via committed addenda to this doc, following the FD pattern — committed before build, extending never overwriting, this doc always the card-level authority.

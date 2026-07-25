# DA SERIES v2 — DEAL ANALYZER BUILD PACK (Antigravity Dispatches)
### Seven dispatches. Reverse-engineers the category leader's capabilities into the PaperWorking Dashboard as part of the Acquisition phase, then distributes the Deal: posted to the PaperWorking Marketplace or emailed to followers and contacts.
### SUPERSEDES da-series-deal-analyzer.md. 47 discipline. Prepend the Global Rules Block to every dispatch. The `paperworking-reil` skill governs.

**Dependency chain:** AQ-1…AQ-3 and AQ-9…AQ-16 must be complete. Then DA-1 → DA-2 → DA-3 → DA-4 → DA-5 → DA-6 → DA-7 (DA-6/7 also require AQ-29's mailing-list structures).

**Registry pre-requisite (add to AQ-1 if not yet dispatched, else run as a micro-migration first):** variable rows carry an optional `scenario_id` (null = the Deal's active/canonical values). Cheap now, painful later.

**Standing reminders for every dispatch in this series:**
- Audit the named surfaces FIRST; report findings; if the audit contradicts spec, STOP and report.
- All metric math in `deriveAllProjectMetrics`. Zero exceptions. The analyzer is a *reader* of that function, never a calculator.
- One variable, one home: the analyzer writes the SAME registry variables as the AQ cards. No parallel data model.
- Every displayed value is registry-computed or labeled `Projected`. Honesty Rule everywhere.
- DoD = runtime evidence only: screenshots, recordings, DB query output. Never tsc, never tests, never self-certification.

---

## DA-1 — Deal Analyzer: Dashboard Surface + Quick Analyze Mode

**OBJECTIVE**
Give the Dashboard a "Deal Analyzer" surface: a single-screen, live-recomputing analysis workspace that IS Acquisition Columns 1–2 in a faster costume. Analyzing a deal creates a Project in "Target" — the analyzer and the Kanban are two views of one registry.

**AUDIT FIRST**
Report: current Dashboard nav and tiles; how Projects in Target/Underwrite state render today; which AQ-4/5/11/12/13/14 registry variables exist and their exact keys; any existing analyzer/calculator surfaces (list and flag for consolidation).

**DO**
1. Dashboard nav item + tile: **Deal Analyzer**. Landing = list of analyzed Deals (address, strategy chip, buy-box verdict chip, 3 headline KPIs) + primary action "Analyze a new Deal."
2. Quick Analyze workspace, one screen, two panes:
   - LEFT — grouped input panels in this order: **Property** (address, type, units, sqft, condition) · **Purchase** (asking/offer price, closing-cost estimate) · **Financing** (financed/cash toggle; down %, rate, term; cash nulls the rest) · **Rehab** (total or itemized; visible only when condition ≠ turnkey) · **Income** (rent per unit, other income, vacancy % default 5–8) · **Expenses** (exactly the eight canonical tags).
   - RIGHT — the 10-KPI scorecard, always visible, labeled `Projected`, recomputing live on every input change via `deriveAllProjectMetrics`. Render BOTH cap rates: **Purchase Cap** (NOI ÷ price) and **Pro Forma Cap** (NOI ÷ [price + rehab]).
3. Strategy selector at top = `disposition_type` + sub-strategy (single canonical field — if set at intake, pre-filled). SALE re-headlines to ARV / MAO / projected net profit; RENT/LEASE re-headlines to cap rate / cash flow / DSCR / occupancy.
4. Partial input = partial scorecard with honest locked states: "Add loan terms to unlock DSCR" deep-linking to the field.
5. Every Quick-Analyzed Deal is a Project in Target/Underwrite. Action **"Continue in REIL"** opens its Acquisition Kanban with the corresponding cards already completed from the entered values. Editing in either surface updates the other (same rows).

**DON'T**
- No parallel data model, no analyzer-local state that outlives the session unwritten.
- No math in components.
- No forced completion — the screener persona ("10 deals a week") must get a verdict from six fields.

**WRITES:** the same variables as AQ-4/5/11/12/13/14 (registry, `user_assumption`, projected slots).

**ACCEPTANCE (runtime evidence each)**
- AC1: DEMO_FINANCIALS values entered in Quick Analyze reproduce NOI $12,486 · Cap 4.5% · CF −$4,444 · DSCR 0.74 · COC −7.41%, shown beside the direct function call.
- AC2: Deal made in Quick Analyze → its Kanban AQ-12 card shows the same rent; edit rent on the card → analyzer reflects it (recording).
- AC3: SALE↔RENT toggle re-weights headlines (two screenshots).
- AC4: Cash toggle nulls financing, scorecard flips to unlevered set (recording).
- AC5: Six-field partial entry yields a partial scorecard with working deep-link locked states (recording).

---

## DA-2 — Projections Engine

**OBJECTIVE**
The long-view: year-by-year wealth projections for RENT/LEASE, holding-period profit curves for SALE — computed in the engine, charted in the analyzer.

**AUDIT FIRST**
Report: `deriveAllProjectMetrics` output shape; the shared amortization utility's interface; charting library present in the stack.

**DO**
1. Extend `deriveAllProjectMetrics` with a `projections` output block (pure derivation from registry inputs):
   - RENT/LEASE: per-year over the declared hold horizon — property value (appreciation assumption), loan balance (amortization utility), equity, annual cash flow, cumulative cash flow, IRR-to-date. Rent-growth and expense-growth assumptions default and editable, labeled.
   - SALE: per-holding-period (30/90/180/270 days, editable set) — accrued holding costs (financing carry + the eight expense tags), net profit, annualized ROI; break-even holding period flagged.
2. Analyzer renders the block as chart + table beneath the scorecard; every series labeled `Projected` with its assumptions inline.
3. Missing inputs → honest empty state naming what's needed, deep-linked.

**DON'T**
- No chart-side math. No unlabeled assumptions. No fabricated series.

**ACCEPTANCE**
- AC1: Year-5 equity equals hand-check from amortization + appreciation inputs (values side-by-side).
- AC2: Flip 90→270 days: profit decreases by exactly the accrued holding costs (before/after values).
- AC3: Appreciation assumption change redraws value/equity live (recording).

---

## DA-3 — Sensitivity Sliders + Offer Calculator (Reverse Valuation)

**OBJECTIVE**
The two interactions the category is loved for — with the three refinements the teardown exposed: multi-criteria simultaneous solve, the limiting criterion, and the "deal not possible" state. Plus the wholesale dual output.

**AUDIT FIRST**
Report: analyzer state management from DA-1 (exploration vs. persisted values); `offer_price` variable key and AQ-18's read of it.

**DO**
1. **Sensitivity:** sliders under the six highest-leverage inputs (offer price, rent, vacancy %, rehab total, rate, down %). Drag = full scorecard + projections recompute live. Slider positions are EXPLORATION state — registry untouched until an explicit **Apply** (which writes normally and syncs the Kanban card). "Reset to entered values" affordance.
2. **Offer Calculator:** criteria panel where the user enables any subset of: min cash flow $/mo · min cash-on-cash % · min cap rate · min DSCR · min net profit (SALE) · max cash needed. Solver iterates against `deriveAllProjectMetrics` (no closed-form duplicate math) to find the **maximum offer price satisfying ALL enabled criteria**.
3. Render the solve: **"Your max offer: $X"** · **"Limiting criterion: [the binding constraint]"** · per-criterion margin at the solved price.
4. Infeasible criteria set → **"Deal not possible under these criteria"** with offending criteria highlighted and one-tap disable/adjust. Never render a price that fails an enabled criterion.
5. `disposition_type` sub-strategy = wholesale → **dual output**: max offer to the seller AND the buyer price that hits the target assignment profit.
6. **"Set as offer price"** writes `offer_price` to the registry; AQ-18 reflects it.

**DON'T**
- Slider exploration never silently mutates stored values.
- The solver never re-implements a formula — it calls the single function.
- The solved price is the user's target made concrete, never presented as advice.

**ACCEPTANCE**
- AC1: Drag without Apply → registry unchanged (recording + DB before/after). Apply → written + Kanban card reflects (recording).
- AC2: Two criteria enabled, COC binds → limiting criterion shows COC; applied price yields COC ≥ target within rounding (values shown).
- AC3: Infeasible set renders the not-possible state; no price shown (screenshot).
- AC4: Wholesale dual output hand-checks (values shown).

---

## DA-4 — Deal Comparison + Branded Deal Report

**OBJECTIVE**
Side-by-side comparison of candidate Deals, and the professional shareable artifact that wins lenders and partners.

**AUDIT FIRST**
Report: Lead Investor profile assets (name/logo storage); the AQ-29 one-pager assembly pipeline (reuse it); PDF generation capability in the stack.

**DO**
1. **Comparison:** select 2–4 analyzed Deals → aligned table: the 10 KPIs, price, cash required, strategy chip; per-row best-value highlight; AQ-16 buy-box pass/fail chips. Deals with insufficient inputs appear flagged, never with fabricated values.
2. **Deal Report (per Deal, one click):** PDF containing — Lead Investor branding (name, logo, contact) · property summary + photos · the 10-KPI scorecard with `Projected` labels intact · projections chart (DA-2) · comps summary (AQ-9 if present) · assumptions appendix listing every input value and its source tag. Non-binding/informational disclosure locked on.
3. Share: download, or emailed link via Resend to consented recipients only.
4. Distinct from the CrowdFunding one-pager but built on the same assembly pipeline.

**DON'T**
- Nothing in the report that isn't registry-sourced. No label-stripping for polish. No emailing non-consented contacts.

**ACCEPTANCE**
- AC1: Three-Deal comparison, highlights match hand-check (screenshot).
- AC2: Generated PDF shows branding, all sections, labels, assumptions appendix (PDF shown).
- AC3: Insufficient-input Deal renders flagged in comparison (screenshot).

---

## DA-5 — Scenarios + Assumption Templates

**OBJECTIVE**
Scenario analysis INSIDE a Deal (beating the incumbents' copy-the-whole-property workaround) and reusable assumption templates for the high-volume screener.

**AUDIT FIRST**
Report: `scenario_id` presence on registry rows (the pre-requisite migration); how DA-1's analyzer selects which values it reads.

**DO**
1. **Scenarios:** "New scenario" clones the Deal's input variables into a named variant (`scenario_id` set). Examples: "25% down," "As a flip" — strategy conversion IS scenario creation with a different `disposition_type`. Scenarios recompute independently; compare side-by-side (reuse the DA-4 table); **Promote** copies a scenario's values into the canonical (null-scenario) projected slots, retaining prior values in scenario history. Kanban, scorecard, gate, one-pager, Insights read ONLY canonical values, always.
2. **Templates:** per-user assumption sets (closing-cost %, the eight expense lines, financing terms, rehab SOW line items). Savable from any Deal; offered on new Deal creation; application pre-fills `user_assumption` variables, all editable, never silently overwriting user-entered values.

**DON'T**
- Scenarios never fork the Project, its documents, or ledgers — assumptions only.
- Non-promoted scenarios never leak into any canonical surface.

**ACCEPTANCE**
- AC1: Deal + 2 scenarios → comparison shows all three; scorecard/Kanban show canonical only (recording).
- AC2: Promote scenario B → canonical values update, scorecard reflects, history retains prior (DB before/after + screenshot).
- AC3: RENT Deal's "as SALE" scenario re-headlines without touching the active Deal (recording).
- AC4: Template from Deal 1 pre-fills Deal 2; edits stick (recording).

---

## DA-6 — Post the Deal to the PaperWorking Marketplace

**OBJECTIVE**
The Deal Marketplace: a Lead Investor posts an analyzed Deal as a listing that other PaperWorking users can discover, follow, and express interest in — **interest-gauging and LOI collection ONLY. No payment rails, no escrow, no KYC. Ever.**

**AUDIT FIRST**
Report: current Marketplaces implementation state (the two-tab structure: Deals + Vendors); AQ-29 investor-LOI structures; account-role permissions (Investor / Investment Team / Vendor) as enforced today.

**DO**
1. **Post flow** from the analyzer or the Kanban's CrowdFunding column: "Post this Deal to the Marketplace." Listing auto-assembles from the registry — address (Deal identity), strategy, hold horizon, equity target, minimum ticket, the 10 KPIs labeled `Projected`, photos, Lead Investor profile. Non-binding disclosure language locked on and rendered on the listing. Lead Investor previews, can redact street-number granularity (show neighborhood-level) before publishing.
2. **Listing page** (visible to logged-in subscribers; Vendors excluded per role rules): the assembled content + actions: **Follow this Deal** · **Follow this Investor** · **Express Interest / Submit LOI** (amount, non-binding acknowledgment checkbox, expiration) · share link.
3. **Interest funnel:** every marketplace LOI/interest lands in the SAME investor-LOI log as AQ-29 (one funnel, source-tagged `marketplace`), rolling up against the equity target identically.
4. **Follow model:** users can follow a Deal (updates when the Lead Investor posts changes) and follow a Lead Investor (their future public Deals appear in the follower's feed and are addressable by DA-7 email sends). Follows are consent to in-app notification; email consent is separate and explicit (checkbox at follow time, revocable).
5. **Listing lifecycle:** draft → published → paused → closed (auto-closes when the Project leaves Acquisition, with a "funding in progress" end state on the listing). Lead Investor can close anytime.
6. Guardrails rendered, not just stored: every listing and LOI surface carries the non-binding disclosure; no dollar amounts change hands anywhere; no bank, wire, or payment fields exist in any form in this surface.

**DON'T**
- No payments, escrow, KYC, wiring instructions, or "reserve your spot with a deposit" mechanics — in UI, copy, or schema.
- No exposing a Deal the Lead Investor hasn't explicitly published. No Vendor access to Deal listings.
- No follower emails without the explicit email-consent flag.

**WRITES:** listing records, follow edges (user↔Deal, user↔Lead Investor, with `email_consent` flag), interest/LOI rows source-tagged `marketplace` into the AQ-29 log.

**ACCEPTANCE**
- AC1: Post flow assembles the listing from registry values (screenshot vs. registry query); redaction option works (screenshot).
- AC2: Second test account follows the Deal + submits an LOI → appears in the Lead Investor's AQ-29 log tagged `marketplace`; rollup updates (recording + DB row).
- AC3: Vendor test account cannot see Deal listings (recording from Vendor session).
- AC4: Project advances to Fund → listing auto-closes with the end state (recording).
- AC5: Full-surface walkthrough recording demonstrating zero payment-related UI.

---

## DA-7 — Send the Deal by Email to Followers & Contacts

**OBJECTIVE**
Distribution by email: the Lead Investor sends the Deal to a chosen audience — their AQ-29 mailing-list contacts, their marketplace followers with email consent, or both — via Resend, with engagement flowing back into the interest funnel.

**AUDIT FIRST**
Report: Resend integration state and existing templates; AQ-29 contact schema (consent flag); DA-6 follow edges and `email_consent`.

**DO**
1. **Send flow** from the analyzer, the CrowdFunding column, or the marketplace listing: "Email this Deal." Audience picker: (a) mailing-list contacts (consented only), (b) followers with email consent, (c) both, deduplicated; recipient list previewed with counts before send.
2. **Email content** assembled from the same pipeline as the listing/one-pager: Deal summary, headline KPIs labeled `Projected`, photo, Lead Investor branding, non-binding disclosure, and one primary CTA — the Deal's marketplace listing page (or the DA-4 report link if the Deal isn't posted). Plain, deliverability-sane HTML; unsubscribe link mandatory and functional (unsubscribe clears the consent flag everywhere).
3. **Engagement capture:** delivery/open/click events from Resend webhooks recorded per recipient per send; a recipient who clicks through and submits an LOI lands in the unified AQ-29 log source-tagged `email`. Send history per Deal: date, audience, counts, engagement summary.
4. **Rate sanity:** one send per Deal per audience per 24h (config constant), preventing accidental spam-blasts.

**DON'T**
- Never email a contact without the consent flag; never bury the unsubscribe.
- No engagement metrics invented — if a webhook isn't configured, show "not tracked," not zeros.
- No divergence from the registry: the email shows the same numbers as the listing and the scorecard.

**WRITES:** send records, per-recipient engagement events, LOI rows source-tagged `email`.

**ACCEPTANCE**
- AC1: Audience picker with 3 mailing-list contacts (2 consented) + 2 consented followers (1 overlapping) previews the correct deduplicated count and sends to exactly those addresses (Resend log).
- AC2: Received email (test inbox screenshot) shows KPIs matching the registry, `Projected` labels, disclosure, working unsubscribe.
- AC3: Unsubscribe click → consent cleared; contact excluded from the next send's preview (recording + DB before/after).
- AC4: Test recipient clicks through and submits an LOI → unified log shows it tagged `email`; rollup updates (DB row + screenshot).
- AC5: Second send inside 24h to the same audience is blocked with a clear message (recording).

---

## SERIES CLOSE-OUT — the master acceptance
After DA-7: one continuous recording — a fresh Deal entered in Quick Analyze (DA-1) → projections reviewed (DA-2) → max offer solved and applied (DA-3) → compared against a second Deal (DA-4) → a "as flip" scenario created and discarded (DA-5) → posted to the Marketplace (DA-6) → emailed to followers (DA-7) → a second account's LOI arriving in the unified funnel. That recording is the definition of the Deal Analyzer being DONE.

## Positioning notes (for the CD series, not Antigravity)
- "Other analyzers make you re-type your deal after you close. In PaperWorking, your analysis becomes your Project — and your pro forma grades itself against reality, automatically."
- "We don't paywall the math." (The incumbents gate the offer calculator and screening behind paid tiers; PaperWorking includes the full analyzer in every Investor subscription.)
- "Analyze it. Post it. Fund the interest." (Analyzer → Marketplace → LOI funnel, one motion.)

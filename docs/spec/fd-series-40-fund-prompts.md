# FD SERIES — 40 Dispatch Prompts to Build the FUND Phase
### PaperWorking REIL Phase 2. 47 discipline. One prompt = one dispatch = one evidenced increment.
### Sequenced in dependency order. Continues the template established by the AQ Series (Acquisition); the HD (Hold) and EX (Exit) series follow this same template.
### v1.1 — FD-1 amended after the pre-dispatch scan found `reil-complete-four-phase-questions-tasks.md` uncommitted: full spec inventory added, verbatim founder-supplied base-doc commits with checksum evidence, addendum-cannot-substitute rule made explicit; FD-2 gains an AQ spec-provenance spot-check.
### v1.2 — the founder chose regeneration: the questions doc is rewritten as v1.1 with the Fund card set folded in; the FD addendum is retired; FD-1 commits the founder-approved regenerated doc verbatim (checksum-evidenced); FD-2's provenance item upgraded to a full Acquisition reconciliation with the built-system-wins resolution rule.

**Phase charter (from the committed Acquisition gate definition):** *Acquisition secures the right and intent to buy at known terms; Fund moves the money and closes.* Everything the Acquisition gate explicitly deferred lands here: executing the loan and lender closing conditions, collecting actual partner equity contributions, converting investor soft commitments into confirmed subscriptions, final settlement, disbursement at closing, deed recording, and title transfer — plus the actualization of every financing assumption made during Acquisition.

**What Fund is NOT (Decision F-1, see Decisions):** PaperWorking records, coordinates, and verifies capital events. It never moves money. All wires, deposits, and disbursements occur off-platform (to the title company or attorney escrow, exactly as they do today); PaperWorking stores the commitment, the status, and the evidence document. No payment rails, no escrow, no KYC/AML, no FBO accounts, no BaaS integration — in any surface, including Fund.

---

## HOW TO DISPATCH

1. Dispatch one prompt at a time, in order. Do not batch. Do not dispatch out of dependency order (chain at the end of this file).
2. **Prepend the Global Rules Block (Fund edition, below) verbatim to every dispatch.**
3. Every dispatch opens with the invocation line and reading proof (Dispatch Protocol, below).
4. **Reference documents to attach to every dispatch:** `docs/spec/paperworking-reil-master-spec-v1.md` (governing) · `docs/spec/reil-complete-four-phase-questions-tasks.md` (card/question authority) · `docs/spec/reil-33-metrics-collection-matrix.md` (variable schema) · this file · `docs/spec/fd-fund-fixtures-v1.md` (created by FD-1).
5. When results come back, bring the evidence bundles for quality review against the ACs before the next dispatch goes out — same process as CD-12 and the UX series verdicts.

---

## GLOBAL RULES BLOCK — FUND EDITION — prepend verbatim to every FD dispatch

1. **Brand casing:** "PaperWorking" exactly. Never Paperworking, paperworking, or Paper Working.
2. **Phase labels are canonical and exhaustive:** Acquisition, Fund, Hold, Exit. Never "Closing," never "Hold & Rehab," and — specific to this series — never "Purchase" as a phase label. Any surviving "Purchase" phase labels in code, data, or UI are defects to be reported (FD-2 audits for them).
3. **Terminology:** "Project" = lifecycle container. "Deal" = the property (identified by address; public face for crowdfunding). "Lead Investor," "Investment Team," "Vendor" — exact casing. *Investors participate in the Deal; you command the Project.* Renovation scope tiers are exactly: Stage, Refurbish, Renovate, Gut, Develop.
4. **Honesty Rule:** No fabricated statistics, no invented data, no placeholder numbers presented as real. Every displayed value is computed from stored inputs or labeled "Projected." Projected and actual are never visually conflated. A metric lacking inputs shows what is missing and deep-links to the collecting card — never a fake value.
5. **Single-function rule:** ALL metric math lives in `deriveAllProjectMetrics`. If a metric value is computed anywhere else — a component, an API route, a report, a seed — that is a defect. The amortization schedule is one shared utility feeding that function. Fund-phase computations (debt service, equity splits, preferred-return accruals, waterfall distributions, sources-and-uses reconciliation) follow the same law: one home each, no inline math in components.
6. **Variable registry:** atomic inputs are typed and source-tagged (`user_assumption | user_actual | document | derived | plaid`), with `projected` and `actual` slots where the lifecycle demands. Fund is the phase where Acquisition's financing assumptions become actuals. One variable, one home — nothing asked twice. Users never enter a metric.
7. **Expense categories (canonical, exhaustive):** `tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`. Never invent category names.
8. **`disposition_type` (SALE | LEASE | RENT)** is ONE canonical field. Never create a second strategy field. Never re-ask if set. The legacy `strategyType` field is a known defect — report any encounter.
9. **Demo data:** all seeded/preview states derive from `DEMO_FINANCIALS`. Canonical seed property: $279,000 purchase, 20% down, 6.5%/30yr → NOI **$12,486**, Cap Rate **4.5%**, Cash Flow **−$4,444/yr**, DSCR **0.74**, COC **−7.41%**. These five values are the golden-file tripwire: if your work makes them unreproducible from a live `deriveAllProjectMetrics` call, your work is wrong. Never hardcode results, never rename fallbacks, never encode expected outputs as arithmetic expressions (the CD-12 evasion pattern is a named process violation).
10. **Money-movement prohibition (Fund edition of the CrowdFunding scope rule):** never build, stub, or hint at payments, escrow accounts, wiring instructions, KYC/AML, accreditation verification, or fund pooling. Capital events are recorded as statuses with evidence documents. Non-binding disclosure language on crowdfunding surfaces is locked on.
11. **UX law — the TurboTax/Clerky pattern (see Interview Law):** one decision per screen; plain language with a "why we ask" line; conditional cards appear only when triggered; every flow saves/resumes; completed cards reopen for editing and edits recompute downstream; gate passes are celebrated. Typography respects the UX-series readability floor — no small-text regressions.
12. **Styling authority:** the UX-0 extracted token set (night theme, antigravity.google/pricing reference) governs. No ad-hoc colors, fonts, or spacing values. (Supersedes the Stitch clause in the skill file — see Decision F-7.)
13. **Dashboard hierarchy:** Portfolio → Insights → Data Room. Fixed order, not interchangeable.
14. **Phase transitions:** Acquisition→Fund and Fund→Hold are checklist gates evaluated from live data — never user checkboxes. Red criteria block unless a typed override reason is stored.
15. **Security (v1.1 standard):** identity from the verified Firebase ID token, never the request body; failure isolation for non-critical side-effects; Vendors see only their assignments; Investment Team members see only what the Lead Investor's per-phase permissions grant.

---

## DISPATCH PROTOCOL — the first lines of every FD dispatch

Every FD dispatch begins, verbatim:

> **Invoke skill: `paperworking-reil`.**
> **Reading proof:** before submitting any plan, quote verbatim (1) the Global Rules Block items your work touches and (2) the governing section of the committed spec docs for this dispatch. If the committed docs do not contain the section this dispatch references, STOP and report — do not improvise and do not proceed against an uncommitted spec (phantom-spec discipline).
> **Audit first (Logic Lens):** audit the named existing surfaces and report findings before building. If the audit contradicts the spec, STOP and report — do not improvise reconciliation.

**Definition of Done — runtime evidence only.** An acceptance criterion is satisfied ONLY by evidence from the running app: screenshots, walkthrough recordings, or database query output. `tsc` passing, Jest passing, builds succeeding, and agent assertion satisfy nothing. When a criterion involves a computed value, show it on screen side-by-side with the direct `deriveAllProjectMetrics` (or named engine) call that produced it. Resubmitting rejected work unchanged without addressing hold conditions is a named process violation.

---

## DECISIONS & VISIBLE DEFAULTS (F-1 … F-7)

The Fund research document proposes several capabilities that conflict with locked PaperWorking decisions. Each conflict is resolved here as a **visible default** — Antigravity treats these as spec, and overriding any of them is a one-line edit by the founder, not an agent judgment call.

**F-1 · Track, don't transact (the load-bearing decision).** The research recommends Banking-as-a-Service integration (Treasury Prime/Unit/Synctera), FDIC-insured FBO accounts, in-app capital pooling via ACH/wire, automated distribution payouts, and built-in KYC/AML. **Default: none of it is built.** Rationale: (a) the founder-confirmed Deal Marketplace decision — all transactions occur off-platform between parties directly; (b) the locked positioning — PaperWorking is a project management tool whose outputs happen to be financial metrics, not a fintech; (c) money transmission, custody, and KYC obligations are a regulatory program, not a feature. Instead, Fund models every capital event as a **status + evidence document**: `committed → docs out → signed → funds confirmed (off-platform)`, with the confirmation recorded by the Lead Investor and the evidence (wire receipt, settlement statement line) attached. Ledger and party structures are designed so a future embedded-banking layer could attach behind a provider interface — the same adapter-ready pattern as Zillow — but zero payment code ships.

**F-2 · Proof of funds without Plaid Assets.** The research proposes Plaid `/asset_report/get` and `/investments/holdings/get` for automated proof-of-funds. Plaid scope is locked to Lite + Standard (transaction sync and auto-attribution — no Identity, no Assets). **Default:** proof of funds is a document-checklist item with a verification status set by the Lead Investor, uploaded to the Data Room. If the existing Plaid integration already surfaces an account balance within its locked scope, that balance may be *displayed* alongside the uploaded document as supporting context — but no new Plaid products are added, and no balance is ever presented as verified proof.

**F-3 · Integrations are adapter-only.** Qualia/Resware (title production), Encompass/Blend/Finastra (loan origination), and DocuSign-alternatives ship as **provider interfaces with mock implementations selected by environment flag** — the established vendor-agnostic pattern. DocuSign is the default e-signature provider behind its interface (swappable). No live Qualia or LOS credentials, contracts, or API calls in v1; title and underwriting status is tracked manually with document evidence until a partnership exists. Honest "integration coming" states only — never simulated sync.

**F-4 · Document-driven capture, not OCR.** The research proposes AI/OCR auto-ingestion of contracts. The governing philosophy stands — *manual entry the system could have captured from a document is a design failure* — but v1 implements it as **side-by-side document capture**: uploading a named document type (Loan Estimate, Closing Disclosure, executed note) opens a split view — document on one side, the specific typed fields it should populate on the other — and every captured value is source-tagged `document`. AI-assisted extraction is an interface behind a feature flag, default off, no OCR dependency shipped.

**F-5 · The platform never generates legal agreements.** Co-ownership agreements, operating agreements, subscription agreements, and PPMs are **uploaded artifacts prepared by counsel**, tracked by checklist with signature status. PaperWorking generates only internal, clearly-labeled summaries (Funding Plan Summary, Capital Stack Statement via `@react-pdf/renderer`). No template legal documents, no "generate my operating agreement" — that is legal advice territory and violates the Honesty Rule's spirit.

**F-6 · Attorney-close jurisdictions are config, not legal determination.** The mandatory-attorney rules engine reads from a maintained config list seeded with the states named in the research (New York, Georgia, Massachusetts) plus the commonly recognized attorney-closing states. The list is founder-editable data. The agent must NOT author a definitive 50-state legal determination — the UI language is "attorney involvement is customary or required in this state; confirm with your title contact," never a legal claim.

**F-7 · Skill-file amendment (pending founder confirmation).** `SKILL.md` rule 12 still names Stitch as the styling authority; the UX series superseded it with the UX-0 extracted token set. FD-1 includes the one-line skill amendment as a checklist item gated on founder confirmation. Until amended, this pack's Global Rules Block item 12 governs FD work.

---

## RESEARCH → CANONICAL NORMALIZATION (contamination guard)

The Fund research document uses a five-stage lifecycle vocabulary that is NOT PaperWorking's. Agents must never let these labels leak into code, data, copy, or plans — this is the same failure mode as the stale "REIL v2" doc that invented Transaction/Rehab phases. Mapping:

| Research-doc term | Canonical REIL home |
|---|---|
| "Pre-Acquisition" (research, identification, entity structuring, modeling) | **Acquisition** — Target + Underwrite columns (built, AQ Series) |
| "Acquisition and Funding" — contract, earnest money, due diligence, LOIs | **Acquisition** — Offer/LOI + Due Diligence + CrowdFunding Interest columns (built, AQ Series) |
| "Acquisition and Funding" — capital execution, underwriting, title, closing, disbursement, recording | **Fund** — this series |
| "Ownership" (stabilization, maintenance, NOI operations) | **Hold** (HD Series, next) |
| "Disposition" (sale, exit tax planning, 1031) | **Exit** (EX Series) |
| "Reinvestment" (deploying gains into new assets) | Not a phase — a new **Project**. Portfolio-level concern. |

Research timeline mapping: Days 1–10 of the research's transaction chronology (contract, earnest money, inspections, due diligence) are Acquisition territory and already built. The Fund timeline begins at the executed contract the Acquisition gate hands over: **financing/title/appraisal → conditions cleared → Closing Disclosure → closing & disbursement → deed recorded.** Earnest money is deposited during Acquisition but reappears in Fund as a credit line in the cash-to-close reconciliation (FD-31).

---

## THE FUND COLUMN MAP (F1–F6)

Fund follows the Acquisition pattern: a phase-colored Kanban of six progressively revealed columns, each column a conversational card sequence. The committed `reil-complete-four-phase-questions-tasks.md` (v1.1) is the card-level authority; its Fund section (Cards F1.1–F5.6 and the F6 gate) specifies every card this series builds, so no dispatch ever builds against an uncommitted card. FD-1 commits that doc before anything else runs.

| Column | Name | Purpose | Reveals when |
|---|---|---|---|
| F1 | **Capital Plan** | Actualize the funding structure declared in Acquisition: modality, capital stack, total cash required, proof of funds | Fund phase entered |
| F2 | **Equity** | Parties, splits, title-holding, cap table, subscriptions, contribution ledger | Modality includes any equity beyond solo |
| F3 | **Debt** | Lender package, loan estimates, underwriting milestones, locked terms → debt service; SBA 504 / hard money / bridge routes | Modality includes any debt |
| F4 | **Title & Closing Team** | Title/escrow, closing attorney (jurisdiction-gated), appraiser, environmental, CDC, surveyor, insurance — discovery, RFP, assignment | Fund phase entered |
| F5 | **Closing** | Timeline & milestones, CD review, cash-to-close reconciliation, execution, deed recording, actualization sweep | F1 complete |
| F6 | **Fund Wrap** | Gate to Hold: live-data checklist, variance review, archive | F5 in progress |

A pure solo-cash Project renders F1 → F4 → F5 → F6 and never sees F2/F3 — the research's 7–14-day cash timeline falls out of column conditionality, not a separate mode.

---

## INTERVIEW LAW — the TurboTax/Clerky pattern as testable requirements

Every FD card obeys all nine. These are acceptance criteria everywhere, restated once here instead of forty times:

1. **One decision per screen.** A card asks one primary question in plain language, with a one-line "why we ask" beneath it explaining what the answer powers (which metric, which document, which vendor trigger).
2. **Branch, never burden.** Conditional cards render only when a prior answer, the property type, the Deal's state, or the declared `disposition_type` triggers them. An irrelevant card never renders — a solo-cash buyer never sees a waterfall question; a non-SBA borrower never sees occupancy eligibility.
3. **Never ask twice.** Every input reads/writes one registry variable. Anything known from Acquisition (accepted price, projected closing costs, LOI log, declared capital intent) arrives pre-filled as a *confirmation*, not a question — the actualization pattern: "In Acquisition you projected $X. Confirm or update the actual."
4. **Save/resume anywhere.** Partial answers persist; returning restores position; the phase and column progress meters reflect reality.
5. **Editable history with downstream recompute.** Completed cards reopen. An edit recomputes every downstream derived value and visibly flags affected answers and metrics.
6. **Atomic inputs only.** Users enter variables (rate, term, amount, date, percentage) — never a metric. Typed, source-tagged, `projected`/`actual` slotted.
7. **Plain-language explainers.** Every term of art on a Fund card (preferred return, waterfall, TIC, JTWROS, debenture, ARV, clear-to-close, cash-to-close) carries an inline, statically authored plain-English explainer. No unexplained jargon reaches an investor.
8. **Celebrate the gates.** Column completion and phase-gate passes get the Clerky moment. Milestones feel like progress, not paperwork.
9. **Readability floor.** Type sizes respect the UX-series minimums. No dense multi-question forms — that is the anti-pattern this product exists to kill.

---

## FD FIXTURES — locked expected values (committed by FD-1 as `docs/spec/fd-fund-fixtures-v1.md`)

Every computation engine this series builds is verified against these deterministic fixtures from a live engine call, on screen. Exact-arithmetic values; display rounding is 2dp half-up and percentage sets must render summing to 100.00%.

**FX-1 · Canonical mortgage continuation (the golden five, extended).** The DEMO_FINANCIALS property enters Fund with: modality = conventional mortgage; down payment **$55,800** (20%); loan **$223,200** at **6.5% / 30yr**. The shared amortization utility derives annual debt service (implied by the locked goldens: NOI − Cash Flow = $12,486 − (−$4,444) = **$16,930**; the utility's value must round consistently with the committed golden file — the five golden values reproducing from a live `deriveAllProjectMetrics` call is the pass condition, per Global Rule 9). LTV renders **80%**.

**FX-2 · Co-buy TIC recalculation.** All-cash TIC co-purchase of the $279,000 property: Party A contributes **$167,400 (60.00%)**, Party B **$111,600 (40.00%)**. Party B later adds **$10,000** capital. New basis $289,000 → A = **57.92%**, B = **42.08%** (sum 100.00%). JTWROS variant: equal shares regardless of contribution, flagged with its survivorship explainer.

**FX-3 · Syndication, straight split.** LP capital $900,000; distributable cash $100,000; split 70/30 → **LP $70,000 / GP $30,000**.

**FX-4 · Syndication, 7% preferred (non-cumulative), single period.** LP capital $900,000 (GP co-invest $0 in this fixture to isolate the mechanic); pref = $63,000. Distributable $100,000 → LP pref **$63,000**, remainder $37,000 at 70/30 → LP **$25,900**, GP **$11,100**. Totals: **LP $88,900 / GP $11,100**.

**FX-5 · Syndication, 7% preferred (cumulative), two periods.** Year 1 distributable $50,000 → LP **$50,000**, GP **$0**, accrued shortfall **$13,000**. Year 2 distributable $100,000 → pref due $76,000 to LP; remainder $24,000 at 70/30 → LP $16,800, GP $7,200. Year-2 totals **LP $92,800 / GP $7,200**; two-year totals **LP $142,800 / GP $7,200**.

**FX-6 · Distribution waterfall, three tiers (cash-on-capital thresholds, not IRR, for v1).** LP capital $900,000. Tier 1: 100% to LP to 7% ($63,000). Tier 2: 70/30 until LP cumulative reaches 14% ($126,000). Tier 3: 50/50. Distributable $180,000 → T1: LP $63,000 · T2 pool $90,000: LP $63,000, GP $27,000 · T3 pool $27,000: LP $13,500, GP $13,500. Totals: **LP $139,500 / GP $40,500** (sum $180,000; LP effective return 15.5%).

**FX-7 · SBA 504 structure.** Project cost $1,000,000, standard: bank **$500,000 (50%)** first lien · CDC debenture **$400,000 (40%)** second lien · borrower injection **$100,000 (10%)**. New-business or special-purpose variant: injection **15% ($150,000)**, CDC **35% ($350,000)**, bank unchanged at 50%. Structure must always sum to 100%.

**FX-8 · Cash-to-close reconciliation.** Sources (confirmed equity + locked debt + earnest money credit) must equal uses (purchase price + closing costs + prepaids/reserves). Fixture: FX-1 property with earnest money $5,000 already deposited in Acquisition → sources: loan $223,200 + cash $55,800 + earnest credit $5,000; uses: price $279,000 + closing costs per DEMO_FINANCIALS + prepaids; the reconciliation bar must show the exact variance and block closing-complete while nonzero. (Closing-cost figure reads from committed DEMO_FINANCIALS — never restated here, never hardcoded.)

---
---

# THE DISPATCHES

## WAVE 0 — FOUNDATIONS (FD-1 … FD-6)

---

### FD-1 v1.2 · Commit the Fund spec set (kills the phantom-spec failure mode)

**v1.2 amendment context:** the pre-dispatch scan reported `reil-complete-four-phase-questions-tasks.md` absent from the repository. The founder chose regeneration over recovery: the questions doc was rewritten as **v1.1** from the founder's REIL source description and the committed decision canon, with the full Fund card set folded directly into the base doc — so the separate FD addendum no longer exists. The regenerated doc is founder-reviewed before this dispatch runs; it carries its own provenance rules, including the **Acquisition reconciliation rule** (the built system wins over reconstructed text — FD-2 executes it).

**Mission:** the repo, not the chat, is the spec authority. Commit every document this series builds against before any implementation dispatch runs.

**Build checklist (strict order):**
1. **Full spec inventory.** List every file in `docs/spec/`. Cross-check every path referenced by `.claude/skills/paperworking-reil/SKILL.md` and by this pack (master spec v1, four-phase questions doc, 33-metric matrix, AQ series, DA series). Additionally search the repo by *content signature* — distinctive strings such as "Card 5.11", "CrowdFunding Interest", "Declare Strategy" — to surface any near-miss file committed under a variant name. Report a table: referenced path → exists / missing / near-miss (with actual path). **If a near-miss of the questions doc exists, STOP** — the founder decides whether the found file or the regenerated v1.1 is canonical; never commit a second copy alongside a survivor. Two competing spec docs is a worse defect than one missing doc. If the inventory reports the master spec or the 33-metric matrix missing, report it — the founder will supply or regenerate those separately; do not proceed to dispatches that depend on a missing doc.
2. **Commit the founder-approved `reil-complete-four-phase-questions-tasks.md` (v1.1) verbatim.** The founder attaches the reviewed file to this dispatch. Commit byte-for-byte: no edits, no reformatting, no summarizing, no "improvements." Evidence of fidelity: sha256 of the attached file equals sha256 of the committed file. **If the file is not attached, STOP and report.** The agent never authors, reconstructs, or approximates spec content — that is the exact contamination path (cf. the stale "REIL v2" doc) this discipline exists to block.
3. Commit this pack as `docs/spec/fd-series-40-fund-prompts.md`.
4. Commit `docs/spec/fd-fund-fixtures-v1.md` containing the FX-1…FX-8 fixtures verbatim from this pack.
5. Update the skill's reference-documents list to include the new files.
6. **Gated on founder confirmation:** amend `SKILL.md` rule 12 per Decision F-7 (styling authority = UX-0 token set). If confirmation is not attached to this dispatch, skip and report the item as open.

**Don'ts:** no implementation code in this dispatch. No authoring or editing of spec content — the agent commits what the founder supplies, exactly. No second copies of near-miss docs. No edits to the master spec body.

**ACs (runtime evidence = repo state):** the step-1 inventory table with the search evidence behind each exists/missing/near-miss verdict; `git log` and file listing showing every committed doc; matching sha256 checksums (attached vs. committed) for the questions doc, shown side-by-side; a diff of the skill reference-list update.

---

### FD-2 · Fund-phase audit (report only — the Logic Lens dispatch)

**Mission:** map the true current state of everything Fund-adjacent before a single line is written. This dispatch produces a findings report, nothing else.

**Audit inventory:**
- Every occurrence of "Purchase" as a phase label in code, seed data, Firestore documents, Prisma schema, copy, or routes (the pre-canonical name for this phase; each is a defect to list, with location).
- Every survivor of the legacy `strategyType` field.
- What AQ-29/AQ-30 actually shipped at the Acquisition→Fund boundary: the LOI/soft-commit log structure, the declared capital-plan intent, the gate checklist implementation and its carry-over payload.
- **Acquisition reconciliation** (upgraded in v1.2 — the questions doc is now a regeneration, so this is a full pass, not a spot-check): confirm whether `docs/spec/aq-series-30-acquisition-prompts.md` is committed, then reconcile the built Acquisition phase against the v1.1 questions doc column by column at card level — presence, question intent, variables written, reveal conditions, and the gate criteria (the doc marks its reconstructed items ⚠, which get priority). Resolution rule, non-negotiable: **the built system wins** wherever it diverges from reconstructed text and the build was itself correct per its AQ evidence — the finding produces a doc correction proposal for the founder, never a code change. Only where the build violates a locked rule (brand casing, canonical enums, single-function rule) is the divergence a code defect. Every divergence is reported either way; the agent changes neither doc nor code in this dispatch.
- The variable registry: which Fund-owned variables from `reil-33-metrics-collection-matrix.md` (loan amount, rate, term, points, down payment, closing costs actual, annual debt service, total cash invested) already have rows, which have `projected` values from Acquisition, which are absent.
- The shared amortization utility: confirm it exists, is the single source, and note every call site.
- Existing vendor categories in the Professional Marketplace vs. the Fund set (title/escrow, closing attorney, appraiser, environmental, CDC, surveyor, insurance broker, private/hard-money lender).
- Data Room current structure and the open D1 decision's current disposition.
- Any existing timeline/milestone or notification machinery (job queue, Resend templates) reusable by FD-20/29/37.

**ACs:** a written findings report with file paths and DB query output for every claim; a STOP flag on any finding that contradicts the committed specs, with no reconciliation attempted.

---

### FD-3 · Fund data plane migration

**Mission:** create the structures every later dispatch writes into. Registry-first: variables before UI.

**Build checklist:**
- Structures for: FundingPlan (one per Project; modality set, hybrid-capable), CapitalSource (typed: solo_cash | co_buyer_equity | syndication_equity | conventional_loan | hard_money | bridge | sba_504_bank | sba_504_cdc | sba_504_injection; amount, status, seniority), EquityParty (person/entity, role: co_buyer | GP | LP, linked to Investment Team membership where applicable), LoanRecord (per debt source: lender, amount, rate, term, points, status chain), ContributionEntry (party, committed amount, status chain per Decision F-1, evidence document ref), TitleHolding (TIC | JTWROS + per-party percentages), MilestoneTimeline (templated milestone set with target/actual dates), ClosingRecord (dates, executed-docs checklist state, recording confirmation).
- Registry rows for every Fund-owned atomic variable per the metrics matrix, with `projected`/`actual` slots and source-tag support; Acquisition-projected values (closing costs, down-payment assumption) linked, not duplicated.
- Respect the dual-persistence split established in prior series: Prisma owns the REIL data plane; Firestore owns the workspace plane. State in the plan which plane each structure lives in and why, consistent with existing precedent found in FD-2's audit.

**Don'ts:** no UI. No second strategy field. No metric storage — metrics are derived, never persisted as user data.

**ACs:** migration applied to a dev database with query output showing each structure; registry query output listing every Fund variable row with its type, slots, and source-tag enum; the canonical demo Project shows linked (not duplicated) Acquisition projections.

---

### FD-4 · Fund Kanban scaffold

**Mission:** the six-column Fund board (F1–F6), phase-colored, progressively revealed, save/resume — the empty stage every card dispatch fills.

**Build checklist:** column shells with reveal conditions from the Column Map; phase header with stepper and completion meter consistent with the Acquisition board; column-level progress; card slots routed but honest — an unbuilt card renders as honestly "not yet available," never a dead control (the stub-button pack's law).

**ACs:** screen recording of a demo Project entering Fund showing: all-columns state for a hybrid modality; F2/F3 absent for a solo-cash modality; save/resume mid-column; completion meter moving as seeded cards complete.

---

### FD-5 · The Acquisition→Fund gate, wired live

**Mission:** the gate is a checklist evaluated from live data, and its passage carries the Acquisition payload into Fund.

**Build checklist:**
- Gate criteria per the committed Acquisition gate definition, each evaluated from live data (accepted offer at known terms; DD contingencies satisfied/waived with go decision recorded; capital plan set — solo confirmed or LOI/soft-commits logged to the equity target or explicitly bypassed). Red criteria block; a typed override reason unblocks and is stored and displayed.
- Carry-over payload on passage: accepted price → Fund's price actual-candidate; declared capital intent → FundingPlan modality pre-fill; LOI/soft-commit log → F2 subscription pipeline (FD-15); DD artifacts referenced (not copied) in the Fund Data Room view.
- The celebration moment on passage (Interview Law 8).

**Don'ts:** no user-checkbox gate. No re-asking anything the payload carries.

**ACs:** recording of a Project failing the gate with the blocking criterion named on screen; passing after data completion; the override path storing and displaying its typed reason; DB query output showing the carried payload landed in Fund structures.

---

### FD-6 · DEMO_FINANCIALS Fund extension + fixture seeding

**Mission:** seed the demo world this series is verified against.

**Build checklist:**
- Extend DEMO_FINANCIALS: the canonical property enters Fund with FX-1's conventional-mortgage scenario. The five golden values must reproduce from a live `deriveAllProjectMetrics` call with debt service now flowing from the seeded LoanRecord through the shared amortization utility — the same numbers, now powered by Fund-plane data.
- Seed the FX-2…FX-7 fixture families as separate, clearly demo-labeled Projects/structures available to engine tests and preview states.
- Golden-file test harness extended: the five canonical values plus each fixture's locked outputs, all asserted against live engine calls.

**Don'ts:** never hardcode expected outputs in product code; never encode them as arithmetic expressions (the named CD-12 evasion); fixtures live in seeds and tests only.

**ACs:** screenshot of the demo property's Fund board with the five goldens on screen beside the live function call output; test-run output listing each fixture assertion passing — accompanied by DB query output proving the fixture data exists as seeded records (the test run alone is insufficient per DoD).

---

## COLUMN F1 — CAPITAL PLAN (FD-7 … FD-10)

---

### FD-7 · The modality card

**Mission:** the single decision that shapes the whole phase: how is this purchase funded?

**Build checklist:**
- One card, options: Solo cash · Co-buying group · Syndication (GP/LP) · Conventional mortgage · Hard money · Bridge · SBA 504 · Hybrid (compose multiple). Pre-filled from the Acquisition capital-intent carry-over as a confirmation (Interview Law 3). Each option carries its plain-language explainer.
- Selection drives column reveal (Column Map conditions) and downstream card conditionality.
- Changing modality after downstream data exists triggers guarded reconciliation: show exactly what becomes orphaned (parties, loan records, ledger entries), require explicit confirmation, archive — never silently delete.

**ACs:** recording showing each modality's resulting column set; the pre-fill confirmation from carry-over; the guarded-change flow listing affected records with DB query output proving archived-not-deleted.

---

### FD-8 · Capital stack composer

**Mission:** the visual sources model — every dollar of the project cost accounted for, honestly.

**Build checklist:**
- Total project cost derived: purchase price + closing costs (projected until actualized) + upfront renovation budget if declared in Acquisition. Read from registry — never re-asked.
- CapitalSource rows compose the stack; ordered senior debt → junior debt → equity; running reconciliation bar showing funded vs. gap. An unfunded gap displays as an honest gap — never auto-filled, never hidden.
- SBA 504 modality renders the FX-7 three-part structure with the 50/40/10 (or 15% variant) proportions enforced as guidance validation.
- Stack math lives in one named engine function; components read it.

**ACs:** screenshots of a fully reconciled stack and of an honest-gap state; FX-7 both variants rendering with correct proportions from the live engine call; query output showing sources as data rows.

---

### FD-9 · Total cash invested, assembled

**Mission:** the CoC denominator, assembled from its atomic parts — never entered as a number.

**Build checklist:** a card that *shows the assembly*: down payment (Fund) + closing costs (Acquisition-projected, awaiting actual) + upfront rehab (Acquisition) = total cash invested, each component deep-linking to its home card, each labeled projected/actual per its current slot. The derived total flows to `deriveAllProjectMetrics`; CoC on the demo property must still read −7.41%.

**Don'ts:** no editable "total cash invested" field anywhere, ever.

**ACs:** screenshot of the assembly card with component provenance labels; CoC −7.41% on screen beside the live call; recording of editing down payment on its home card and watching the assembly and CoC recompute (Interview Law 5).

---

### FD-10 · Proof of funds (Decision F-2 pattern)

**Mission:** the cash-verification card, honest about what it is.

**Build checklist:** a checklist card per equity source: upload proof-of-funds document to the Data Room → Lead Investor sets verification status (requested → received → verified) with date; optional display of an existing in-scope Plaid balance as *context only*, visually distinct from verification. Status feeds the F1 completion meter.

**Don'ts:** no Plaid Assets/Investments products; no language presenting any balance as "verified"; no verification claims the platform didn't witness.

**ACs:** recording of the upload→verify flow; screenshot showing the context-balance treatment (if in scope) clearly distinguished; query output of the status chain with timestamps.

---

## COLUMN F2 — EQUITY (FD-11 … FD-16)

---

### FD-11 · Party roster & access

**Mission:** who is in this capital stack, and what can they see.

**Build checklist:**
- EquityParty roster card: add co-buyers/LPs/GP with role, entity type (individual/LLC/other), contact. Where a party is a platform user, link through Investment Team membership; the Lead Investor's per-phase permissions govern what they can view/edit (Global Rule 15). Off-platform parties exist as records with no access.
- The GP role: for syndication modality, the Lead Investor defaults to GP; GP co-invest amount is a distinct CapitalSource.
- Roster feeds F2 cards, the contribution ledger, and the FD-36 portal views.

**Don'ts:** no accreditation verification, no KYC fields (Decision F-1); collect only what coordination requires.

**ACs:** recording of adding platform-linked and off-platform parties; query output showing roster rows with role and linkage; a linked party's session showing only permission-granted surfaces.

---

### FD-12 · Co-buy split & title-holding

**Mission:** the TIC/JTWROS decision and the ownership ledger it creates.

**Build checklist:**
- One card: how will title be held? TIC (unequal shares allowed; independently transferable/inheritable) vs. JTWROS (equal shares; survivorship) — each with its plain-language explainer per Interview Law 7 and the guidance line that the choice belongs in counsel's hands (Decision F-5 tone).
- TIC: per-party percentages entered or derived from contribution amounts (founder's choice per group), must sum to 100.00%; JTWROS: equal shares enforced, contribution amounts still tracked separately from ownership share.
- Ownership ledger: additional capital events recompute TIC percentages per the FX-2 mechanic when the group has chosen contribution-derived shares.
- Co-ownership agreement checklist item: uploaded artifact, signature status tracked (Decision F-5).

**ACs:** FX-2 reproduced on screen from the live ledger engine (60/40 → add $10,000 → 57.92/42.08, sum 100.00%); JTWROS equal-share enforcement shown; the agreement checklist status chain in query output.

---

### FD-13 · Syndication cap table

**Mission:** the GP/LP capital structure as first-class data.

**Build checklist:** cap table view over the roster: per-LP commitment, GP co-invest, percentage of equity, status (from the ledger); totals reconcile to the stack's equity requirement with an honest gap indicator; the guidance chip that GPs conventionally co-invest ~10% renders as guidance, never a validation block.

**ACs:** screenshot of a seeded cap table reconciling to the FX-3 fixture's $900,000 LP capital; gap state shown when under-committed; query output of commitments.

---

### FD-14 · Economics configuration (splits, pref, waterfall)

**Mission:** how distributions will be computed — configured now, verified against fixtures, consumed later by Hold/Exit.

**Build checklist:**
- One card sequence (one decision per screen): structure choice — straight split | preferred return + split | tiered waterfall — then that structure's parameters (split ratio; pref rate + cumulative/non-cumulative; tier thresholds and ratios as cash-on-capital for v1 per FX-6).
- A single distribution engine function computes allocations from structure + distributable amount; a preview panel on the card runs the engine against the Project's configured structure with a clearly-labeled hypothetical amount ("Preview — hypothetical distributable cash," honest per Global Rule 4).
- Engine verified against FX-3, FX-4, FX-5, FX-6 exactly.

**Don'ts:** no IRR-based tiers in v1 (deferred; state honestly on the card if a user expects it); no inline distribution math anywhere outside the engine; the preview never renders as a promise of returns — locked disclosure language applies.

**ACs:** all four fixtures reproduced on screen from live engine calls, side-by-side with the call output; the preview's hypothetical labeling; recording of editing a tier and watching the preview recompute.

---

### FD-15 · Soft commitments → subscriptions

**Mission:** convert the Acquisition CrowdFunding column's LOI/soft-commit log into Fund's confirmed equity pipeline — the boundary the Acquisition gate deferred.

**Build checklist:**
- Pipeline view seeded from the carried LOI log (FD-5 payload): per-investor status chain `soft-committed → docs out → signed → funds confirmed (off-platform)` per Decision F-1; each transition records date, actor, and (for signed/funds-confirmed) an evidence document reference.
- Subscription agreement is an uploaded, counsel-prepared artifact (Decision F-5); e-signature routes through the provider interface with DocuSign default (Decision F-3) when the founder sends for signature, with manual "signed copy uploaded" as the always-available path.
- Confirmed subscriptions create/advance ContributionEntry rows and update the cap table.
- Non-binding disclosure language remains locked on every crowdfunding-facing surface until the moment of a signed subscription.

**Don'ts:** no payment collection, no wiring instructions, no accreditation gating (Decision F-1); no auto-conversion — every transition is a recorded human action.

**ACs:** recording of an LOI advancing the full chain with evidence attached at the required steps; query output of the status chain with timestamps and actors; the cap table reflecting the confirmation; disclosure language present pre-signature.

---

### FD-16 · Contribution ledger

**Mission:** the per-party money record — committed vs. confirmed, with evidence, without movement.

**Build checklist:** ledger view per Project: every ContributionEntry with party, amount, status, evidence link, date; per-party and total committed/confirmed rollups; confirmed totals drive equity percentages where contribution-derived (FD-12) and the stack's funded bar (FD-8); export to the Data Room as a Capital Stack Statement PDF via `@react-pdf/renderer` (Decision F-5's allowed generation).

**ACs:** ledger screenshot reconciling to the stack bar; the generated statement PDF opened, matching the on-screen ledger; query output of entries with evidence references.

---

## COLUMN F3 — DEBT (FD-17 … FD-23)

---

### FD-17 · Financing route card

**Mission:** which debt instrument(s), shaping the rest of F3.

**Build checklist:** one card per the modality: conventional | hard money | bridge | SBA 504, multi-loan capable for hybrid stacks; each route reveals only its own downstream cards; each with plain-language explainer including the research-grounded guidance chips (hard money: asset/ARV-based, days-fast, short-term; bridge: gap liquidity between buy and sell; SBA 504: owner-occupied commercial, three-part structure) rendered as guidance.

**ACs:** recording showing each route's revealed card set and the hybrid multi-loan case; query output of LoanRecord rows per route.

---

### FD-18 · Lender package checklist

**Mission:** the document gather, organized before it is requested.

**Build checklist:** per-route document checklists rendered as Data Room-connected items — conventional/SBA: 3 years personal & business returns, P&L, proforma, debt schedule, org documents, project cost breakdown (SBA); hard money/bridge: the shorter asset-focused set — each item upload-tracked with status and a configurable reminder cadence through the existing notification machinery; checklist definitions live as maintained config, founder-editable.

**Don'ts:** no invented "requirements" presented as lender mandates — items are labeled as the customary package, adjustable per actual lender ask.

**ACs:** screenshots of route-specific checklists; an item moving requested → uploaded with the document landing in the correct Data Room folder (query output); a reminder firing per its cadence config.

---

### FD-19 · Loan estimate capture & comparison

**Mission:** loan estimates enter as documents, become typed variables, and compare side-by-side.

**Build checklist:** document-driven capture per Decision F-4: uploading a Loan Estimate opens the split view (document | typed fields: lender, amount, rate, term, points, est. closing costs) with every value source-tagged `document`; up to N estimates compare in a table computing per-estimate implied debt service through the shared amortization utility; "choose this loan" promotes one estimate to the active LoanRecord — candidates persist as history.

**Don'ts:** comparison math routes through the shared utility — no inline payment math in the comparison component.

**ACs:** recording of two estimates captured and compared with implied debt service shown from live utility calls; the chosen-loan promotion reflected in query output; source tags visible on captured values.

---

### FD-20 · Underwriting milestone tracker

**Mission:** the loan's status chain, driving the timeline.

**Build checklist:** per-LoanRecord milestone chain: application submitted → processing → appraisal ordered → appraisal received → conditions issued → conditions cleared → clear-to-close; each transition is a recorded action with date and optional note/document; transitions fire the existing job-queue/notification machinery (timeline update FD-29, notification FD-37); appraisal-received captures appraised value as a `document`-tagged variable (feeding LTV).

**ACs:** recording of a chain advancing with the timeline and a notification visibly reacting; appraised value flowing to LTV on screen beside the live derive call; query output of the transition log.

---

### FD-21 · Locked terms → debt service (the first-computable moment)

**Mission:** the dispatch where Fund starts powering metrics — DSCR, Cash Flow, and CoC become computable, per the metrics matrix.

**Build checklist:** the locked-terms card confirms the chosen loan's final amount/rate/term/points into `actual`-slot registry variables; the shared amortization utility derives annual debt service as a `derived` variable; `deriveAllProjectMetrics` now computes Cash Flow, DSCR, CoC from Fund-plane actuals; the DSCR lender-minimum warning (~1.20–1.25×) renders as a prominent guidance chip when unmet, per the committed Acquisition-series design mandate.

**Don'ts:** debt service is never user-enterable; no second amortization implementation.

**ACs:** FX-1 on screen: the demo property's five goldens reproducing from the live call with debt service flowing from the Fund LoanRecord; the DSCR 0.74 warning chip visible; query output showing the actual-slot writes with source tags.

---

### FD-22 · SBA 504 route

**Mission:** the three-part structure and its eligibility interview, honestly scoped.

**Build checklist:**
- Cards (one decision per screen): occupancy eligibility (existing building ≥51% owner-occupied, or new construction ≥60% with 80% within ten years — captured as the borrower's projection, plainly labeled as SBA program requirements they attest to); business-credit context (PAYDEX, FICO SBSS, Intelliscore entered as user-provided values with source noted — the platform never fetches or fabricates a score; guidance chips give the customary thresholds: PAYDEX 80+, SBSS ≥165 prescreen); injection tier (10% standard; 15% new-business or special-purpose; 20% both — adjusting the FX-7 structure).
- The stack composer (FD-8) renders the resulting bank/CDC/injection structure; two LoanRecords (bank, CDC debenture) plus the injection as equity.
- CDC vendor slot opens in F4 (FD-24) when this route is chosen.

**Don'ts:** no eligibility *determination* — the platform captures and organizes; approval language belongs to the SBA/CDC/lender.

**ACs:** recording of the eligibility interview branching (existing vs. new construction); FX-7 both variants on the stack from live engine calls; query output of the two LoanRecords and injection source; the CDC slot visible in F4.

---

### FD-23 · Hard money & bridge routes

**Mission:** the fast-capital instruments, with their distinct variables and compressed clock.

**Build checklist:** route cards capturing: ARV (`user_assumption` or `document` if an ARV appraisal is uploaded), loan-to-ARV percentage, points, interest rate, term in months, interest-only flag, exit plan (linked to the existing `disposition_type` — never a second strategy field); debt service derivation handles interest-only correctly through the shared utility; choosing these routes selects the compressed timeline template in FD-29.

**ACs:** an interest-only hard-money fixture's monthly carry shown beside the live utility call; the exit-plan card reading (not re-asking) `disposition_type`; the compressed template active in the timeline (recording).

---

## COLUMN F4 — TITLE & CLOSING TEAM (FD-24 … FD-28)

---

### FD-24 · Fund vendor categories in the Professional Marketplace

**Mission:** the Fund-phase service ecosystem becomes discoverable and assignable.

**Build checklist:** extend the Professional Marketplace's category set with the Fund roster: title/escrow company, closing attorney, appraiser, environmental firm (Phase I ESA), Certified Development Company (CDC), surveyor, insurance broker, private/hard-money lender — reusing the existing vendor self-identification, matching-notification, and assignment mechanics found in FD-2's audit; vendors see only their assignments (Global Rule 15); each Fund column card that needs a vendor exposes an "assign from Marketplace" entry alongside "record an off-platform vendor" (a record, no access).

**Don'ts:** do not rebuild marketplace mechanics that exist — extend; the six seeded real vendor profiles remain untouched.

**ACs:** screenshots of the new categories in vendor self-identification and in Project-side discovery; a matching notification firing for a new Fund-category need; an assigned vendor's session showing only the assignment; query output of an off-platform vendor record.

---

### FD-25 · Jurisdiction rules engine (the attorney gate)

**Mission:** geographically aware requirements, per Decision F-6.

**Build checklist:** a config-backed rules engine keyed on the Deal's property state: attorney-close jurisdictions (seeded per F-6: NY, GA, MA + the commonly recognized set, founder-editable data) make the closing-attorney card mandatory in F4 and a blocking line in the F6 gate; the card's language follows F-6 exactly ("customary or required in this state; confirm with your title contact"); the engine is the single home for any future state-keyed rule.

**Don'ts:** no hardcoded state lists in components; no legal-determination language; the agent does not research or extend the state list beyond the seed — the list is founder data.

**ACs:** recording of the attorney card appearing for an NY Deal and absent for a non-listed state; the config file/collection in query output; the F6 gate line reacting to the assignment.

---

### FD-26 · RFP & multi-bid assignment

**Mission:** solicit, compare, assign — on the existing quote-request rails.

**Build checklist:** from any Fund vendor slot: issue an RFP to multiple marketplace vendors simultaneously (reusing the bidirectional quote-request synchronization shipped with the Professional Marketplace); received bids compare in one view (price, turnaround, notes); assignment closes the RFP, notifies the vendor, creates the vendor's task, and posts the slot's status to the timeline.

**ACs:** recording of a three-vendor RFP round-trip through bid to assignment; both sides of the sync shown (Project view and vendor view); query output of the bid and assignment records.

---

### FD-27 · Insurance binder card

**Mission:** coverage becomes a tracked, metric-feeding fact.

**Build checklist:** cards for: homeowners/property premium (annual, `actual` on binder upload — the premium writes to the `insurance` expense category, flowing to NOI through `deriveAllProjectMetrics`); conditional riders (flood/earthquake) revealed by a plain question about zone status (`user_actual`, with the honest note that zone determinations come from the lender/insurer); binder document to the Data Room with effective date; insurance-broker vendor slot links to F4 assignment.

**Don'ts:** BUG-8 vigilance — the premium flows through the expense engine exactly like every `insurance` entry; no side-channel math into NOI.

**ACs:** binder upload recording; the premium visible in the expense category and NOI recomputing on screen beside the live call (goldens intact on the demo property where its seeded premium already exists — no double-count, verified by query output).

---

### FD-28 · Title workflow tracking (adapter-only per Decision F-3)

**Mission:** the title process, tracked honestly without a Qualia contract.

**Build checklist:** per-Project title chain: order opened → commitment received → defects/cure list (line items, each resolvable with note/document) → cleared; each step manual with document evidence; the title/escrow vendor assignment (FD-24/26) owns the chain's counterpart visibility; a `TitleProvider` interface with a mock implementation behind the environment flag, shaped for a future Qualia adapter (order placement, status pull) — interface and mock only, no live calls; commitment upload is a Decision F-4 capture (policy amount, effective date, exceptions count).

**Don'ts:** no simulated "synced with Qualia" states; the mock is developer-facing only; production renders the honest manual chain.

**ACs:** recording of the chain with a defect raised and cured with evidence; query output of the chain and cure list; the provider interface and flag shown in code review output with production rendering the manual path.

---

## COLUMN F5 — CLOSING (FD-29 … FD-34)

---

### FD-29 · Closing timeline engine

**Mission:** the phase's clock — templated, editable, honest about slippage.

**Build checklist:**
- MilestoneTimeline instantiated from the modality/route template: financed conventional ≈ 30–60 days (financing/title/appraisal → conditions cleared → CD delivered → closing); cash and hard-money ≈ 7–14 days (title → CD/settlement statement → closing); SBA 504 extended (adds CDC/SBA approval milestones); templates are maintained config with target-date offsets from the executed-contract date carried at the gate.
- Every milestone: target date (editable), actual date (set by the linked event where one exists — e.g., FD-20's clear-to-close sets its milestone; otherwise recorded manually); the timeline renders on the F5 card and on the Project overview.
- Status-change wiring: linked events (FD-20 transitions, FD-26 assignments, FD-28 title steps) post to the timeline automatically through the job queue.

**ACs:** recordings of a conventional and a cash Project instantiating different templates; a linked event setting an actual date without manual entry; template config in query output; an edited target date persisting.

---

### FD-30 · Slippage detection & the three-day CD rule

**Mission:** the two alerts that save deals.

**Build checklist:** overdue detection — a milestone past target without actual raises a slippage flag on the timeline and a notification (FD-37 templates) to the Lead Investor with the customary-causes guidance line (underwriting backlog, title defects, repair negotiations) as guidance; the CD rule — for financed routes, a dedicated check that the Closing Disclosure's received date (FD-31 capture) precedes the closing-date milestone by at least three business days, warning prominently when violated or when closing approaches with no CD recorded; business-day math in one tested utility.

**Don'ts:** the CD warning is consumer-protection guidance, not legal advice — language stays factual ("lenders must provide the Closing Disclosure at least three business days before closing").

**ACs:** recording of a milestone crossing its target and flagging with the notification received; the CD warning firing at under-three-business-days and clearing when dates comply; the business-day utility's tests plus an on-screen date demonstration.

---

### FD-31 · Cash-to-close reconciliation (sources = uses)

**Mission:** the money truth-table — every dollar sourced equals every dollar used, or closing does not complete.

**Build checklist:** the reconciliation card assembles live: **sources** — confirmed equity contributions (FD-16 ledger), locked debt (FD-21), earnest money as a credit (carried from Acquisition); **uses** — purchase price, closing costs (projected until the CD/settlement capture actualizes them), prepaids/reserves (captured from the CD per Decision F-4); the variance bar shows the exact over/under and blocks the closing-complete action while nonzero (typed-override path per gate law for legitimate edge cases, stored and displayed); CD upload is the F-4 split-view capture actualizing closing costs, cash-to-close, and prepaid lines.

**Don'ts:** one reconciliation engine function; no component math; never auto-balance — a gap is shown, not solved.

**ACs:** FX-8 reproduced on screen from the live engine; recording of a nonzero variance blocking completion, then resolving via the CD capture; query output showing `document`-tagged actuals replacing projections.

---

### FD-32 · Closing execution & deed recording

**Mission:** the finish line as a record: executed, disbursed (off-platform), recorded, archived.

**Build checklist:** the closing card: closing date (actual); executed-documents checklist — deed, note (financed), settlement statement/CD, title policy, entity/assignment documents — each an upload with signed-status; disbursement is recorded as a fact with the settlement statement as evidence (Decision F-1 — the platform records that funds moved, it never moves them); deed recording confirmation: county, recording date, instrument/reference number; completion archives the package to the Data Room's permanent Project record and marks F5 complete.

**ACs:** recording of the full closing card completion on a test Project; query output of the ClosingRecord with recording details; the archived package visible in the Data Room with correct permissions.

---

### FD-33 · The actualization sweep

**Mission:** every Acquisition assumption meets its actual — the registry's projected→actual law, executed as one review.

**Build checklist:** a review card walking every Fund-owned variable that still carries only a `projected` slot: shown with its projection, its collecting source, and an actual-entry prompt (or auto-satisfied where a document capture already actualized it); a variance view: projected vs. actual side-by-side per variable with the delta, honestly labeled — this is the founder's first projected-vs-actual reckoning and the pattern Hold will inherit; completion recomputes everything downstream; nothing is re-asked that a capture already answered (Interview Law 3).

**ACs:** recording of the sweep on a Project with mixed states (some actualized by documents, some pending); the variance view with deltas on screen; query output showing both slots populated with correct source tags.

---

### FD-34 · The Fund→Hold gate

**Mission:** the phase exit, evaluated live, celebrated, and handing Hold a clean baseline.

**Build checklist:** gate criteria evaluated from live data: actual purchase price recorded · total cash invested fully actualized (FD-9 assembly all-actual) · loan terms actual (financed routes) · closing date recorded · deed recording confirmed · required closing documents archived · cash-to-close reconciled (or typed-override stored) · attorney requirement satisfied where FD-25 mandates; red criteria block with the named criterion; typed override stored and displayed; passage celebrates (Interview Law 8) and hands Hold its baseline payload: cost basis, in-service date candidate (closing date), debt service schedule reference, insurance premium, equity structure — referenced, never duplicated.

**ACs:** recording of a blocked gate naming its criterion, then passing after completion; the override path with stored reason displayed; query output of the Hold-baseline references; the celebration moment.

---

## CROSS-CUTTING & WRAP (FD-35 … FD-40)

---

### FD-35 · Fund metrics on Insights

**Mission:** the payoff surface — Fund's data makes metrics come alive where the investor looks.

**Build checklist:** phase-gated rendering per the established metrics-to-lifecycle mapping: Cash Flow, DSCR, and CoC transition from "insufficient data" to computed the moment FD-21's actuals exist — with their insufficient states, until then, naming exactly what is missing and deep-linking to the collecting card (Global Rule 4); LTV joins the Insights supplemental set fed by appraised value (FD-20) and loan amount; headline scorecard remains the canonical 10 — no additions; every Insights value reads `deriveAllProjectMetrics` (audit for any regression toward inline math while touching these surfaces).

**ACs:** recording of a Project crossing the FD-21 threshold and the three metrics switching from honest-missing (with working deep links) to computed; the demo property's goldens on the Insights surface beside the live call; LTV 80% for FX-1.

---

### FD-36 · Party portal views

**Mission:** what a co-buyer or LP sees — their slice, nothing else.

**Build checklist:** for platform-linked equity parties (FD-11), a Fund view scoped by role and the Lead Investor's per-phase permissions: own commitment status, own documents, own signature requests, the Project's public-facing Deal identity, and whatever the Lead Investor's permission grants beyond that — never another party's amounts or documents by default; enforcement at the rules/API layer per the v1.1 standard (verified token identity, never request-body), not by UI hiding; Vendors remain assignment-scoped (unchanged).

**ACs:** two linked LP sessions side-by-side showing mutual invisibility of amounts/documents; a direct API request for another party's resource rejected (response output); rules test output PLUS the live-session evidence (tests alone insufficient per DoD).

---

### FD-37 · Fund notifications & reminders

**Mission:** the phase's voice — timely, configurable, failure-isolated.

**Build checklist:** Resend templates for the Fund events wired throughout this series: underwriting transitions (FD-20), RFP/bid/assignment (FD-26), document-checklist reminders per cadence config (FD-18), slippage and CD-rule alerts (FD-30), signature requests and confirmations (FD-15), gate passages (FD-5/34); every send failure-isolated (a notification failure never blocks the underlying action — v1.1 standard); recipient logic respects roles (parties get their own events; the Lead Investor gets everything); cadence and toggles as maintained config; webhook signature verification stays fail-closed per the standing Resend rule.

**ACs:** each template rendered in evidence (screenshots of received messages for a representative set); a forced send-failure leaving the underlying action committed (recording + query output); config toggles suppressing a category.

---

### FD-38 · Fund Data Room structure

**Mission:** the phase's document home — organized by the work, permissioned by the roles.

**Build checklist:** Fund folder taxonomy in the existing Data Room (Firebase Storage): Capital Plan (proof of funds) · Equity (agreements, subscriptions) · Debt (lender package, estimates, appraisal, commitment) · Title & Insurance · Closing (CD, executed set, recording) — populated automatically by every upload flow this series built (audit each lands correctly); permissions inherit FD-36 scoping (a party sees their own subscription, not another's; vendors see their assignment's folder only); the Dashboard hierarchy stays Portfolio → Insights → Data Room. **Note:** the open D1 decision (Data Room's sidebar disposition) is a UX-series item — this dispatch changes no navigation; it structures content wherever Data Room currently lives. If D1 lands mid-series, navigation follows that dispatch, not this one.

**ACs:** query/listing output of the taxonomy with documents from prior dispatches landed in correct folders; permission-scoped sessions showing correct visibility; no navigation changes (before/after screenshots).

---

### FD-39 · Security & rules audit for the Fund plane

**Mission:** every new surface this series added, held to the v1.1 standard — audited, then fixed.

**Build checklist:** enumerate every new/changed API route, server action, Firestore collection/rule, and Storage path from FD-3 through FD-38; verify each: identity from the verified token; authorization by role/permission matrix (Lead Investor / Team member per-phase grant / equity party / vendor / anonymous); no client-trusted amounts or statuses (ledger and gate mutations validated server-side); failure isolation on side-effects; fix what fails, list what was fixed; run the golden tripwire and the FX suite after fixes.

**ACs:** the audit table (surface × checks) with evidence per row; before/after proof for each fix (rejected request output); goldens and fixtures passing post-fix via live calls with query output.

---

### FD-40 · Full-phase runtime walkthrough, regression sweep & UAT script

**Mission:** the phase proven end-to-end, on camera, against every locked value — and the founder's test script for doing it again.

**Build checklist:**
- Two complete recorded walkthroughs on freshly seeded Projects: (1) conventional-mortgage solo (FX-1 spine): gate-in → modality → stack → proof of funds → lender package → estimates → milestones → locked terms (goldens fire) → team/title → timeline → CD → reconciliation → closing → actualization sweep → gate-out; (2) syndication + debt hybrid: adds roster → cap table → economics (fixture previews) → subscriptions chain → ledger.
- Regression sweep: the five goldens from a live `deriveAllProjectMetrics` call; the full FX suite; BUG-8 regression explicitly re-evidenced (management fee computed on gross scheduled rent — show the expense inputs and the NOI derivation on screen); `strategyType` and "Purchase"-label absence re-checked against FD-2's findings.
- A written UAT script for the founder mirroring both walkthroughs step-by-step with expected on-screen values at each checkpoint, committed as `docs/spec/fd-fund-uat-script-v1.md`.
- A deploy-readiness statement listing any open items (from the Open Items register below plus anything discovered), each honestly marked shipped/deferred — discovery-first, per the D-2 pattern.

**ACs:** both recordings; every regression item evidenced on screen with its live call; the committed UAT script; the deploy-readiness statement reviewed by the founder before any deploy dispatch.

---
---

## DEPENDENCY CHAIN

FD-1 → FD-2 → FD-3 → FD-4 → FD-5 → FD-6 (strict; no exceptions) · then FD-7 → FD-8 → FD-9 → FD-10 · F2 (FD-11 → FD-12/13 → FD-14 → FD-15 → FD-16) and F3 (FD-17 → FD-18 → FD-19 → FD-20 → FD-21 → FD-22/23) may interleave after FD-7, but FD-15 additionally requires FD-5's payload and FD-29 additionally requires FD-20 · F4 (FD-24 → FD-25 → FD-26 → FD-27/28) after FD-4 · F5 strictly FD-29 → FD-30 → FD-31 → FD-32 → FD-33 → FD-34, with FD-31 requiring FD-16 + FD-21 · wrap strictly FD-35 → FD-36 → FD-37 → FD-38 → FD-39 → FD-40. When in doubt: numeric order is always safe.

## DISPATCH INDEX

| # | Dispatch | # | Dispatch |
|---|---|---|---|
| FD-1 | Commit the Fund spec set | FD-21 | Locked terms → debt service |
| FD-2 | Fund-phase audit (report only) | FD-22 | SBA 504 route |
| FD-3 | Fund data plane migration | FD-23 | Hard money & bridge routes |
| FD-4 | Fund Kanban scaffold | FD-24 | Fund vendor categories |
| FD-5 | Acquisition→Fund gate | FD-25 | Jurisdiction rules engine |
| FD-6 | Demo extension + fixtures | FD-26 | RFP & multi-bid |
| FD-7 | Modality card | FD-27 | Insurance binder |
| FD-8 | Capital stack composer | FD-28 | Title workflow (adapter-only) |
| FD-9 | Total cash invested assembly | FD-29 | Closing timeline engine |
| FD-10 | Proof of funds | FD-30 | Slippage + 3-day CD rule |
| FD-11 | Party roster & access | FD-31 | Cash-to-close reconciliation |
| FD-12 | Co-buy split & title-holding | FD-32 | Closing execution & recording |
| FD-13 | Syndication cap table | FD-33 | Actualization sweep |
| FD-14 | Economics config (splits/pref/waterfall) | FD-34 | Fund→Hold gate |
| FD-15 | Soft commits → subscriptions | FD-35 | Fund metrics on Insights |
| FD-16 | Contribution ledger | FD-36 | Party portal views |
| FD-17 | Financing route card | FD-37 | Notifications & reminders |
| FD-18 | Lender package checklist | FD-38 | Fund Data Room structure |
| FD-19 | Loan estimate capture | FD-39 | Security & rules audit |
| FD-20 | Underwriting milestones | FD-40 | Walkthrough, regression & UAT |

## OPEN ITEMS REGISTER (owed forward, tracked until evidenced)

1. **Decision F-7** — skill-file styling amendment awaits founder confirmation (FD-1 carries it).
2. **D1 (UX series)** — Data Room sidebar disposition; FD-38 is navigation-neutral until it lands.
3. **IRR-based waterfall tiers** — deferred from FD-14; honest on-card note; revisit at EX Series when actual IRR exists.
4. **Live title/LOS/e-sign integrations** — interfaces shipped (FD-28/FD-15); live adapters await partnerships (Decision F-3).
5. **AI-assisted document extraction** — flagged interface behind default-off feature flag (Decision F-4); enablement is its own future dispatch.
6. **Embedded banking** — permanently out unless the founder reopens Decision F-1; ledger/party structures are deliberately adapter-shaped if that day comes.
7. **Cross-referenced AC owed to HD Series:** FD-34's Hold-baseline payload must be consumed, not re-asked, by the first Hold cards — verify at HD-1.

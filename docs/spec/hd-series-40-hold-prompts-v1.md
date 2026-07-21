HD Series v1 — 40 Hold-Phase Dispatches for Antigravity

(PaperWorking · REIL Phase 3 · authored 2026-07-20 · commit to docs/spec/hd-series-40-hold-prompts-v1.md)

This pack is the specification authority for the Hold-phase build AND the paste
source. Each dispatch below is a complete, self-contained prompt between
=== PROMPT FOR ANTIGRAVITY · HD-N === and === END PROMPT === fences.
Copy everything between the fences, paste into Antigravity, send. No separate
run-book exists for the HD Series; there is exactly one authority for these
forty dispatches.

Companion documents (commit all three in the same commit):
1. docs/spec/hold-intake-conversational-architecture-v1.md — the founder's
conversational-intake design narrative for Hold ("the Clerky/TurboTax
architecture"). It is design intent, SUBORDINATE to
docs/spec/reil-complete-four-phase-questions-tasks.md and to SKILL.md
(Decision H-1 / H-7 below). Where they conflict, the questions doc and the
skill govern and the agent STOPs and reports.
2. docs/spec/hd-hold-fixtures-v1.md — the single home for Hold fixture
definitions (HX-1…HX-5). Defines locked §1 inputs and founder-commit-only §2
expected outputs (the FX law applied to Hold). The agent reads this file for
fixture definitions and NEVER edits it. If any prompt or code conflicts with it,
this file governs and the agent STOPs and reports.

Sequencing law


One dispatch at a time. A dispatch is sent only when its DISPATCH WHEN
condition is satisfied by a founder verdict on the prior evidence bundle.
Every evidence bundle opens with the dead-on-arrival precheck:
git branch --show-current && git status --short. A bundle without it is
void on arrival, unread.
Working branch: feature/hold-hd-series, created at HD-1 off
Yves/feature-development. Work found on any other branch, or uncommitted
work predating the dispatch, goes to a quarantine branch and is reported —
never merged, never silently adopted.
Resubmission of rejected work opens with a conditions-addressed table
mapping every hold condition to what changed. Unchanged resubmission is a
named process violation.
The Definition of Done is runtime evidence only: screenshots, walkthrough
recordings, DB query output. tsc, unit tests, builds, and agent assertions
satisfy zero criteria. Security-sensitive findings verify through the
founder's terminal (founder-runnable command blocks), the primary channel.

---

Global Rules Block (applies to every dispatch; the skill governs in full)


Brand casing: PaperWorking — exactly. Never any other casing.
Phase labels: Acquisition · Fund · Hold · Exit — canonical and
exhaustive. "Closing", "Hold & Rehab", "Purchase" — and industry synonyms
like "Stabilization", "Disposition", "Underwriting" — as phase labels are
defects on sight. No vocabulary directive anywhere in this pack ever
applies to phase labels.
Terminology: Project = lifecycle container; Deal = the property (address).
Lead Investor · Investment Team · Vendor are the role vocabulary.
Honesty Rule: no fabricated statistics, invented data, or placeholder
numbers presented as real. Every displayed value is computed from stored
inputs or labeled Projected. Missing inputs render an honest state that
names what is missing and deep-links to the collecting card.
Golden five (from DEMO_FINANCIALS, live deriveAllProjectMetrics call):
NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr ·
DSCR 0.74 · CoC −7.41%. If any dispatch makes these unreproducible,
that dispatch is wrong. Never hardcode results, rename fallbacks, or encode
expected outputs as arithmetic expressions.
Money-movement prohibition: PaperWorking records, coordinates, and verifies
capital events; it never moves money. No payments, escrow, KYC/AML,
accreditation, fund pooling, or wiring instructions anywhere in Hold.
Security v1.1: identity from the verified Firebase ID token only — never
the request body. All scoping enforced server-side. Vendors see only their
assignments. Never log document contents or secrets.
Expense categories, canonical and closed: tax, insurance, security,
maintenance, utilities, management, HOA, capex. Management fee
computes on gross scheduled rent (BUG-8, forever). Marketing/ad spend is
NOT an expense category (Decision H-4).
Pricing: never alter Stripe products, prices, or tier copy. Tier gating
questions STOP and report for founder decision.
Styling: the UX-0 extracted token set is the styling authority. Ad-hoc
colors, fonts, or spacing values are defects. Typography respects the
UX-series readability floor.
Single-function law: all metric math in deriveAllProjectMetrics; Hold
operational derivations in exactly one named engine (established HD-4).
Inline math in a component, route, report, or seed is a defect.
Telemetry: every new widget and notification event ships with its named
PostHog event (Dashboard UX Standard).

---

Governance (Decision H-7, HD Series pack): this document is design intent
for the Hold-phase conversational intake. It is SUBORDINATE to
docs/spec/reil-complete-four-phase-questions-tasks.md and to SKILL.md.
Where this narrative conflicts with either — including any question that
would re-ask disposition_type, re-collect Fund-actualized financing, or
imply money movement (any PaperWorking-held "escrow" account or feature —
lender-impound vocabulary per revised H-3 is permitted) — the questions doc
and the skill
govern, and the agent STOPs and reports. Decisions H-1 through H-7 in
docs/spec/hd-series-40-hold-prompts-v1.md record the reconciliations
already ruled.

---

=== PROMPT FOR ANTIGRAVITY · HD-1 ===

HD-1 · Custody, spec presence, and branch creation (zero build)
DISPATCH WHEN: immediately, as the first HD dispatch, after the founder commits this pack, the companion intake-architecture doc, and the companion fixture doc (docs/spec/hd-hold-fixtures-v1.md).

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: Yves/feature-development (this dispatch only; it creates the series branch). Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the 'Non-negotiable rules' header (rules 1–14) of SKILL.md, and the Governing set table of its Reference documents section.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): none — this dispatch verifies custody and presence; it builds nothing and changes nothing.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: establish a clean, verifiable starting state for the entire HD Series before any Hold work begins.

BUILD CHECKLIST:


Report the repo path of SKILL.md and the output of git hash-object on it, plus git log -1 --oneline for the file, for founder countersign.
Verify presence in the committed repo of: docs/spec/reil-complete-four-phase-questions-tasks.md (and that it contains a Hold/Phase 3 section with columns H1–H5 and the Hold→Exit gate), docs/spec/reil-33-metrics-collection-matrix.md, docs/spec/reil-kpi-formulas.md, docs/spec/fd-series-40-fund-prompts.md, docs/spec/fd-fund-fixtures-v1.md, docs/spec/hd-series-40-hold-prompts-v1.md, docs/spec/hold-intake-conversational-architecture-v1.md, and docs/spec/hd-hold-fixtures-v1.md. List any absent file — an absent file blocks the series.
Create branch feature/hold-hd-series off Yves/feature-development and push it. All HD work lives here until HD-40.
List every local branch and any branch containing work not attributable to an approved dispatch; propose quarantine moves for founder decision — move nothing yourself.


DON'TS: no code changes, no doc edits, no seed touches, no migrations. Reporting only, plus the one branch creation.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Terminal output: SKILL.md path + hash-object + last commit line.
Terminal output: ls / git ls-files proof for every named spec file, with the Hold section heading of the questions doc quoted.
Terminal output: branch creation and push, then the precheck run again showing feature/hold-hd-series clean.
Branch inventory table with quarantine proposals (or an explicit 'none found').


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-2 ===

HD-2 · Hold-phase audit — the complete findings report (report only)
DISPATCH WHEN: after the HD-1 bundle is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the HD-2 dispatch section of docs/spec/hd-series-40-hold-prompts-v1.md and the 'Working discipline' section of SKILL.md.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): this dispatch IS the audit; it builds nothing and changes nothing.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: map the true current state of everything Hold-adjacent before a single line is written, so no later dispatch rebuilds what exists or trusts what does not. Output is a findings report with file paths and DB query output behind every claim.

BUILD CHECKLIST:


Existing Hold surfaces: every route, component, and screen from earlier builds touching renovation tracking, holding costs, current value, listings, or a Hold workspace — including any legacy 'Hold & Rehab'-era screens. For each: keep-as-is / relocate / defect, with reasons. The default disposition for existing functionality is keep or relocate; rebuilding requires written justification.
Legacy label survivors inside Hold scope: any phase label other than the canonical four; any strategyType survivor; each listed with location.
The Fund→Hold boundary as actually shipped by the FD Series: the gate implementation, its criteria source, and the exact carry-over payload it produces (field list from code + one real gate-pass record from the DB).
Variable registry state for Hold-owned variables per the 33-metric matrix and the questions doc Hold section: renovation_tier, rehab_budget, rehab_spend[], rehab_completed_date, holding_cost_<category> for the eight canonical tags, current_value series, target_rent, target_lease_terms, list_price_sale, listing/ad log, showings log, vacancy/occupancy-during-hold, utilities responsibility, reserve policies. For each: row exists / carries a projected value from Acquisition / absent.
Team & access inventory (the property-manager foundation): invite lifecycle (pending/accepted/expired/revoked, mismatched-email), role and permission model, seat/tier enforcement points, Project-scoped access, assign-as-invite, vendor assignment scoping, offboarding/task-resurfacing, and the append-only audit log. Cite files and demonstrate one invite lifecycle in the running app or DB.
Messaging inventory: every Resend template in the repo with its trigger site; PaperWorking Inbox event types and storage; any notification-preference storage; the job-queue/scheduler available for digests and reminders.
Integrations state: Plaid transaction-attribution loop (what exists, where proposals surface); RentCast/Zillow provider interfaces and their mock/live selection; PostHog event registration pattern.
Documents plane: Firebase Storage rules, signed-URL pattern, existing per-Project document/Data Room surfaces and their access scoping.


DON'TS: change nothing — not a rename, not a lint fix, not a seed row. Partial findings already known do not substitute for this complete report.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Committed report at docs/audit/hd-2-hold-findings-v1.md with a file path or query output behind every claim.
A keep/relocate/defect disposition table for every existing Hold-adjacent surface.
The Fund→Hold carry-over payload shown from a real DB record.
A gap table: every HD-3…HD-38 dependency marked exists / partial / absent, so the founder can re-scope dispatches before they run.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-3 ===

HD-3 · Hold data contract — registry rows, persistence, migrations (no UI)
DISPATCH WHEN: after the HD-2 findings report is reviewed and any re-scoping verdicts are issued.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: rules 3, 7, and 8 of SKILL.md; the Hold section of docs/spec/reil-complete-four-phase-questions-tasks.md (every 'Writes:' line, quoted); the Hold-collected rows of docs/spec/reil-33-metrics-collection-matrix.md.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the HD-2 registry-state findings for Hold-owned variables; reconcile your plan against them line by line.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: give every Hold-owned variable exactly one typed, source-tagged home with projected/actual slots where the lifecycle demands, so nothing downstream is asked twice and nothing is stored twice.

BUILD CHECKLIST:


Create or complete registry rows and persistence for every Hold 'Writes:' variable: renovation_tier (five-tier enum), rehab_budget (projected, reading Acquisition's renovation estimate as the carried projection), rehab_spend[] entries (amount, date, category, note, vendor ref, receipt ref, edited-history), rehab_completed_date, holding_cost_<category> recurring monthlies for the eight canonical tags with optional due-day, current_value dated series with source tag, target_rent, target_lease_terms struct (rate, term, NNN|gross), list_price_sale, listing/ad log entries (date, channel, spend, note), showings/inquiry log, occupancy_during_hold enum (vacant_full_rehab | occupied | partial), utilities_responsibility enum (landlord | tenant | split), reserve policy structs (vacancy buffer %, maintenance reserve policy, capex reserve policy) and reserve funding status records (status + evidence doc refs only, per Decision H-3).
Every variable typed and source-tagged (user_assumption | user_actual | document | derived | plaid); projected values carried from Acquisition are marked as carriers, never duplicated.
Prisma migrations for the REIL data plane; Firestore document shape updates for the workspace plane where the audit says they belong; both documented in the bundle.
Prove one-home discipline: a grep/DB demonstration that no second field exists for strategy, financing terms, insurance premium, or any carried Acquisition assumption.


DON'TS: no UI. No second strategy field. No ninth expense category. No reserve 'balance' fields presented as accounts. No touch to DEMO_FINANCIALS values.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Migration output and prisma migrate status showing clean application.
DB query output listing the new registry rows with types and source tags.
Grep evidence: zero strategyType survivors in the new surface area; zero non-canonical expense category strings.
Golden five reproduced from a live deriveAllProjectMetrics call after migration (values unchanged).


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-4 ===

HD-4 · Hold operations engine + HX fixtures (one named engine, founder-locked goldens)
DISPATCH WHEN: after HD-3 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: rules 5, 6, and 9 of SKILL.md; the P6 chain section of docs/spec/reil-kpi-formulas.md; docs/spec/hd-hold-fixtures-v1.md (§1 inputs).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): locate every existing site computing carry, burn, variance, or runway-like values inline (components, routes, reports); list each as a defect to be routed through the engine.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: one named engine for Hold operational derivations, mirroring the Fund-plane one-engine law, with founder-locked HX fixtures so every later Hold surface has unfakeable expected values.

BUILD CHECKLIST:


Extend deriveAllProjectMetrics only where the 33-metric matrix assigns Hold-actualized values; formulas come from reil-kpi-formulas.md. If a needed formula is absent from committed docs, STOP and report — never invent one.
Create exactly one named Hold-operations engine (name it clearly, e.g. deriveHoldOperations) for non-matrix operational derivations: monthly carry (sum of the eight category monthlies + loan carry, where loan carry comes from the shared amortization utility / Fund-actualized annual debt service — never re-derived here), spend-to-date and budget variance, projected reserve monthlies from the H-3 policy structs (labeled Projected wherever actuals are absent), and — for SALE-path flip contexts — runway: the date at which cumulative carry + spend erodes the projected margin, derived strictly from stored inputs.
Seed the HX-1…HX-5 fixture Projects exactly as specified in docs/spec/hd-hold-fixtures-v1.md, namespaced so fixture identities can never collide with the demo property or real users (apply the namespace rule from the FD-era seed findings).
Run the engine against HX-1…HX-5; capture every output value in the bundle. Present these candidate values for founder terminal verification and countersign. The founder will record them into §2 of docs/spec/hd-hold-fixtures-v1.md via a founder commit. The agent never edits docs/spec/hd-hold-fixtures-v1.md.


DON'TS: no UI. No inline math left standing at any audited site. No expected values invented, hardcoded, or written as arithmetic expressions. No edits to FX fixtures or DEMO_FINANCIALS.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Side-by-side: direct engine call output for HX-1…HX-5 (terminal) — the founder-countersign target.
Defect list of former inline-math sites with their new engine-routed call sites.
Golden five reproduced from a live deriveAllProjectMetrics call (unchanged).
DB query showing fixture Projects exist under the fixture namespace, demo property untouched.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===


---

=== PROMPT FOR ANTIGRAVITY · HD-2 ===

HD-2 · Hold-phase audit — the complete findings report (report only)
DISPATCH WHEN: after the HD-1 bundle is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the HD-2 dispatch section of docs/spec/hd-series-40-hold-prompts-v1.md and the 'Working discipline' section of SKILL.md.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): this dispatch IS the audit; it builds nothing and changes nothing.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: map the true current state of everything Hold-adjacent before a single line is written, so no later dispatch rebuilds what exists or trusts what does not. Output is a findings report with file paths and DB query output behind every claim.

BUILD CHECKLIST:


Existing Hold surfaces: every route, component, and screen from earlier builds touching renovation tracking, holding costs, current value, listings, or a Hold workspace — including any legacy 'Hold & Rehab'-era screens. For each: keep-as-is / relocate / defect, with reasons. The default disposition for existing functionality is keep or relocate; rebuilding requires written justification.
Legacy label survivors inside Hold scope: any phase label other than the canonical four; any strategyType survivor; each listed with location.
The Fund→Hold boundary as actually shipped by the FD Series: the gate implementation, its criteria source, and the exact carry-over payload it produces (field list from code + one real gate-pass record from the DB).
Variable registry state for Hold-owned variables per the 33-metric matrix and the questions doc Hold section: renovation_tier, rehab_budget, rehab_spend[], rehab_completed_date, holding_cost_<category> for the eight canonical tags, current_value series, target_rent, target_lease_terms, list_price_sale, listing/ad log, showings log, vacancy/occupancy-during-hold, utilities responsibility, reserve policies. For each: row exists / carries a projected value from Acquisition / absent.
Team & access inventory (the property-manager foundation): invite lifecycle (pending/accepted/expired/revoked, mismatched-email), role and permission model, seat/tier enforcement points, Project-scoped access, assign-as-invite, vendor assignment scoping, offboarding/task-resurfacing, and the append-only audit log. Cite files and demonstrate one invite lifecycle in the running app or DB.
Messaging inventory: every Resend template in the repo with its trigger site; PaperWorking Inbox event types and storage; any notification-preference storage; the job-queue/scheduler available for digests and reminders.
Integrations state: Plaid transaction-attribution loop (what exists, where proposals surface); RentCast/Zillow provider interfaces and their mock/live selection; PostHog event registration pattern.
Documents plane: Firebase Storage rules, signed-URL pattern, existing per-Project document/Data Room surfaces and their access scoping.


DON'TS: change nothing — not a rename, not a lint fix, not a seed row. Partial findings already known do not substitute for this complete report.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Committed report at docs/audit/hd-2-hold-findings-v1.md with a file path or query output behind every claim.
A keep/relocate/defect disposition table for every existing Hold-adjacent surface.
The Fund→Hold carry-over payload shown from a real DB record.
A gap table: every HD-3…HD-38 dependency marked exists / partial / absent, so the founder can re-scope dispatches before they run.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-5 ===

HD-5 · Hold workspace shell — columns, card registry, progressive reveal
DISPATCH WHEN: after HD-4 outputs are countersigned and HX goldens are locked.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: rules 11 and 12 of SKILL.md; the Hold section header and every column/card heading (H1 through H5, all cards) of docs/spec/reil-complete-four-phase-questions-tasks.md; the Hold kickoff row of the committed post-wizard kickoff mapping (if that mapping is absent from committed docs, STOP and report).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the HD-2 disposition table for existing Hold surfaces; relocate what it says to relocate — do not rebuild kept components.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the Hold workspace exists as a data-driven shell: every committed column and card renders with its exact title, question intent, why-line, and reveal condition, inputs enabled dispatch-by-dispatch as HD-6+ land.

BUILD CHECKLIST:


Build the Hold workspace under the Project shell: phase chip, strategy chip (read-only, per Decision H-1), progress strip, and the committed columns in committed order.
Drive cards from a registry derived from the committed questions doc: id, title, question text, why-line, writes, reveal condition. Reveal conditions honored live: H5 shows only the card matching disposition_type; Stage-tier Projects see the compressed H2 the doc specifies.
Save/resume everywhere; completed cards reopen for editing; one decision per screen.
Kickoff screen per the committed mapping: landing in Hold surfaces the first-input screen that lights NOI, Cash Flow, and Expense Ratio, with the dismissible welcome banner behavior the mapping specifies.
Style exclusively from the UX-0 token set; respect the typography readability floor.


DON'TS: no card collection logic yet (HD-6+ owns it); no ad-hoc styling values; no placeholder metric numbers anywhere — un-collected states are honest empties.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshots: the Hold board for a RENT Project and a SALE Project, showing strategy-conditional reveal differing correctly.
Recording: save mid-card, leave, return, resume.
Screenshot: kickoff screen with honest empty metric states deep-linking to collecting cards.
Grep: zero hex colors or font sizes outside the token layer in new files.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-6 ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-6 ===

HD-6 · Hold Entry Interview — the strategy-aware router that reads, never re-asks
DISPATCH WHEN: after HD-5 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-1 of this pack; SKILL.md rule 3 (disposition_type law) and rule 11; §1 'The Strategy Gate' of docs/spec/hold-intake-conversational-architecture-v1.md; the Fund→Hold gate carry-over description in the questions doc.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): confirm from HD-2 where disposition_type and sub_strategy live and that the Declare Strategy card is their sole edit door.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: entering Hold opens a short conversational interview that displays the declared strategy and collects only the net-new operational facts the narrative's Strategy Gate is actually after — routing everything downstream without ever re-asking what the system knows.

BUILD CHECKLIST:


Opening screen DISPLAYS strategy: 'This Project's declared strategy: <RENT | LEASE | SALE><sub_strategy if set>' with a link to the Declare Strategy card for edits (completed cards reopen; strategy is never asked here). If the narrative's flip/buy-and-hold/short-term-rental distinction is not fully expressible from stored disposition_type + sub_strategy, STOP and report the gap for founder decision — do not add a field.
Ask, one decision per screen with a why-line, exactly the net-new facts: occupancy during the hold (Vacant — full rehab / Occupied / Partial → writes occupancy_during_hold); who pays utilities (Landlord / Tenant / Split → writes utilities_responsibility; SALE-path defaults to Landlord, still confirmable); HOA or special district if not already known (Yes → monthly fee writes to holding_cost_HOA as a carrier-aware confirmation + a bylaws document task).
Vacant-full-rehab answers create an insurance-fit task: plain-language note that vacancy can change the right policy type, a document slot for the current policy, and a suggested Insurance Broker vendor slot — phrased as a checklist item to verify with their broker, never as advice.
Interview answers set downstream context: General Contractor vendor slot surfaces for vacant/partial rehab; the compressed-vs-full column depth honors renovation tier once H1 sets it.
Each screen fires its named PostHog event; the interview is resumable and re-openable.


DON'TS: never render a strategy question. No second home for any variable already collected. No insurance-type recommendations — tasks and document slots only.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full interview on a RENT Project and on a SALE Project, showing the strategy display (not question) and differing defaults.
DB output: the three written variables with source tags after one run.
Screenshot: the insurance-fit task and bylaws task created with their document slots.
PostHog: event list for one complete run.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-7 ===

HD-7 · Financing & PITI baseline — display-only from Fund actuals
DISPATCH WHEN: after HD-6 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-2 of this pack; SKILL.md rules 5 and 7; the H3.1 loan-carry sentence of the questions doc ('displays from the Fund debt-service derivation — never re-entered'); §2 'The Baseline' of the intake-architecture doc.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: where Fund actuals live (loan terms, annual debt service, bound insurance premium, tax figures) and which are populated on the demo Project.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the narrative's 'How is this property financed?' and 'taxes and insurance' questions are answered by the system, not the user: a Baseline card renders the fixed monthly burn from Fund actuals, collects nothing Fund owns, and turns gaps into deep links.

BUILD CHECKLIST:


Baseline card in H3 territory rendering: financing structure and terms (from Fund), monthly loan carry (annual debt service ÷ 12, sourced from the engine/shared amortization utility — no component math, P6 rounding respected upstream), property tax monthly and insurance monthly pre-filled from Fund-actualized values as confirmations, HOA monthly if HD-6 captured it.
Confirmation semantics: pre-filled values show their source ('from your Fund closing record') and confirming writes the actual without duplicating the variable.
Document slots: current insurance policy, latest tax bill — archived to the Project's document plane.
Any absent Fund datum renders the honest missing state naming the datum and deep-linking to the collecting Fund card; the card never blocks on it.
A single monthly-fixed-burn readout at the bottom, computed by the HD-4 engine, labeled with exactly which components are actual vs Projected.


DON'TS: no editable loan fields. No re-derivation of debt service anywhere in the component tree. No invented tax or insurance defaults.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshot: Baseline card on the demo Project with sources labeled, next to a terminal call of the engine returning the same monthly carry figure.
Recording: a Project missing a Fund datum showing the deep-link path to the collecting card and back.
Grep: zero amortization or division-by-12 math in Hold components.
Golden five live-call output (unchanged).


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-8 ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-8 ===

HD-8 · Column H1 — Renovation Plan (scope tier, budget, timeline)
DISPATCH WHEN: after HD-7 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Column H1 of the questions doc, Cards H1.1 and H1.2, quoted in full; SKILL.md rule 3 (five tiers, exactly).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: any existing scope-tier or rehab-budget UI; relocate or supersede per the disposition table, with the registry rows from HD-3 as the single write targets.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the investor locks what is being done to the property and what it should cost, against the estimate they made in Acquisition — the first Hold decision that shapes everything downstream.

BUILD CHECKLIST:


Card H1.1: 'What level of work does this property need?' — exactly Stage ()⋅Refurbish() · Refurbish (
)⋅Refurbish($) · Renovate ($$$) · Gut ($$$$) · Develop ($$$$$), with the doc's cost signaling; writes renovation_tier; tier drives the compressed-H2 reveal and seeds tier-appropriate compliance expectations for HD-31.
Card H1.2: budget and target completion date; the budget field opens pre-filled from Acquisition's renovation estimate as the carried projection with variance-to-estimate displayed live; contingency % captured; writes rehab_budget (projected) and rehab_completion_target.
Budget approval state for the Lead Investor recorded (approved-by, timestamp) — a status, not a payment.
Vendor slots per tier surface (General Contractor and trade slots), wired for HD-22 assignment.


DON'TS: no sixth tier, no tier renames. No second budget field — the Acquisition estimate is a carrier, not a duplicate.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: selecting each of the five tiers, showing downstream reveal changes.
Screenshot: budget card pre-filled from the carried estimate with live variance display.
DB output: renovation_tier, rehab_budget, rehab_completion_target rows with source tags after one run.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-9 ===

HD-9 · Column H2 — Renovation Tracking (spend log with history, completion)
DISPATCH WHEN: after HD-8 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Column H2 of the questions doc, Cards H2.1 and H2.2, quoted in full; Global Rule 8 (capex vs maintenance guidance).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: any existing rehab spend tracker; keep/relocate per disposition; confirm rehab_spend[] rows from HD-3 are the sole write target.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: a running, honest record of renovation spend the investor can trust at a glance: every dollar dated, categorized, receipted, and reconciled against the approved budget.

BUILD CHECKLIST:


Card H2.1: spend entries (amount, date, category, note, vendor, receipt slot) — editable with visible change history; the plain-language improvements-vs-repairs guidance line distinguishing capex from maintenance (guidance, not tax advice) exactly as the doc frames it.
Budget-vs-actual bar computed by the HD-4 engine — honest at all times, including overspend states; entries above the HD-21 approval threshold (once that lands) respect pending status.
Card H2.2: 'Renovation complete?' — actual date and final spend confirmation; actualizes rehab_budget → rehab_spend_total and writes rehab_completed_date; closing the log feeds the Hold→Exit gate's 'renovation log closed or carried forward' confirmation.
Stage-tier compressed presentation honored per the doc.


DON'TS: no component math on the budget bar. No silent edits — every change appends to history. No blocking of entries after completion (completed cards reopen; edits recompute downstream).

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: add, edit (history visible), and receipt-attach a spend entry; budget bar moves via engine values.
Screenshot: overspend state rendering honestly.
DB output: a spend entry with its edit history; rehab_spend_total after completion on fixture HX-3 matching the locked HX golden.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-10 ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-10 ===

HD-10 · Column H3 — Itemized holding costs, one screen per category
DISPATCH WHEN: after HD-9 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Column H3, Card H3.1 of the questions doc, quoted in full; SKILL.md rule 8; Decision H-2.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: existing holding-cost forms/ledgers; the eight-category enum from HD-3 as the sole tag set.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the monthly burn is itemized without intimidation: one plain-language screen per relevant category, pre-filled where the system already knows, totaled by the engine.

BUILD CHECKLIST:


One screen per relevant category across exactly the eight canonical tags: tax, insurance, security, maintenance, utilities, management, HOA, capex — each with the doc's why-line framing ('vacancy has a monthly price; knowing it is how you protect your margin').
Pre-fill-as-confirmation wherever upstream data exists: insurance and tax from the HD-7 baseline, HOA from HD-6; loan carry renders as the display-only row from HD-7 — never an input.
Management screen: PM fee entered as a % with helper text that typical third-party management runs in the high-single-digit to low-double-digit percent range (framed as guidance, no fabricated precision); the computed fee derives on gross scheduled rent via the engine (BUG-8), shown with its basis labeled.
Utilities screen honors utilities_responsibility from HD-6 (tenant-paid renders the category with an informed zero-carry state rather than hiding it).
Recurring monthlies with optional due-day feed the HD-30 reminder engine; the monthly-carry total renders from the HD-4 engine only.


DON'TS: no ninth category ever, including 'marketing' (Decision H-4). No fee math outside the engine. No re-collecting loan, tax, or insurance figures Fund actualized.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full pass through the category screens on fixture HX-1; final carry total on screen side-by-side with the terminal engine call returning the identical figure (the locked HX-1 golden).
Screenshot: management screen showing the fee, its % input, and the gross-scheduled-rent basis label.
DB output: eight category rows with due-days where entered.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-11 ===

HD-11 · The Safety Net — vacancy buffer and reserve policies (no accounts)
DISPATCH WHEN: after HD-10 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-3 of this pack; Global Rule 6; §4 'The Safety Net' of the intake-architecture doc; SKILL.md rule 7 (one variable, one home — the vacancy assumption).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2/HD-3: where the vacancy % assumption from Acquisition lives; confirm the reserve policy structs exist per HD-3.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the investor budgets for the inevitable: vacancy, routine maintenance, and big-ticket CapEx become stored policies that shape projections — with any actual funding recorded as status and evidence, never as an account.

BUILD CHECKLIST:


Vacancy & Credit Loss screen (the vacancy buffer, under its standard pro-forma label): 5% (average) / 8% (conservative) / custom — a confirmation-or-update pass through the SAME vacancy assumption variable carried from Acquisition (one home; the screen shows the carried value and its origin). Writes flow into projected income adjustments via the engine.
Repairs & Maintenance (R&M) reserve policy: 1% of current value per year / 10% of gross scheduled rent / custom — stored as a policy struct; where maintenance actuals are absent, the engine surfaces the policy-derived monthly labeled Projected.
Replacement Reserves (CapEx) policy: 5% of rent / 10% of rent / custom — same mechanics; copy uses the standard terms 'Replacement Reserves' and 'reserve target'. Per revised Decision H-3, 'escrow' appears only where it truthfully describes the external lender impound of taxes and insurance, sourced from Fund — never a PaperWorking account or balance.
Reserve funding is a recorded status per reserve — chips Funded / Partially Funded / Unfunded, with as-of date — with optional evidence documents, presented as a status chip, never a balance ledger.
Why-lines match the narrative's spirit ('Properties don't stay full 365 days a year', 'Big ticket items break') in PaperWorking's plain voice.


DON'TS: no second vacancy variable. No dollar 'balances'. No 'escrow' outside the lender-impound context defined in revised Decision H-3 — and never as a PaperWorking account, feature, or code identifier. No interest, yield, or account projections. No renaming of registry variables — H-3's vocabulary governs display and copy only.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshot: vacancy screen showing the carried Acquisition value pre-selected with origin labeled, then updated.
Screenshot: a Projected-labeled maintenance monthly derived from policy on a Project with no maintenance actuals, disappearing once an actual exists (recording).
Grep for 'escrow' across Hold surface code and copy, raw output included: every occurrence describes the external lender impound per revised Decision H-3; zero occurrences name a PaperWorking account, balance, or feature; zero occurrences in code identifiers.
Engine call on fixture HX-4 returning the buffered projection matching the locked HX golden.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-12 ===

HD-12 · Plaid recurring-cost proposals for Hold — confirm, never silent-write
DISPATCH WHEN: after HD-11 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the Plaid sentences of Cards H2.1 and H3.1 in the questions doc ('proposals, confirmed by the user, never silent writes'); Decision F-2 in docs/spec/fd-series-40-fund-prompts.md (in-scope balances are context only).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: the current Plaid attribution loop — what it detects, where proposals surface today, and its provider-interface shape.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the governing user story does its work: costs the bank already saw arrive as proposals against the eight categories and the rehab log, one tap from confirmed — with the user always the author of record.

BUILD CHECKLIST:


A proposal tray on the Hold workspace: detected recurring transactions mapped to a proposed category (or to a rehab-spend proposal when matched to an assigned vendor), each showing source account, date, amount, and match rationale.
Confirm writes a ledger entry with source=plaid and the proposal's provenance; dismiss requires a one-tap reason (not mine / wrong category / one-off) that tunes future proposals.
Unmatched-transaction state is honest: items Plaid saw but could not map wait in the tray unlabeled rather than guessed.
Rent-like inflow detection is parked: flagged internally for the Exit-phase income ledger, never surfaced as a Hold proposal.
Failure isolation: Plaid outages degrade to manual entry with a status note, never blocking the ledgers.


DON'TS: no silent writes, ever. No balance displays used as verification. No auto-categorization above proposal confidence — ambiguity waits for the user.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: a proposal confirmed into the utilities category and one dismissed with reason, both visible in the DB with provenance.
Screenshot: the honest unmatched state.
DB output: a plaid-sourced entry showing source tag and provenance fields.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-13 ===

HD-13 · Marketing spend, listing/ad log, and showings — the shared H5 instrument
DISPATCH WHEN: after HD-12 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-4 of this pack; the 'listing/ad log' lines of Cards H5.R/H5.L/H5.S in the questions doc; §3's marketing row of the intake-architecture doc; the Marketing & Sales rows of the 33-metric matrix.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: any existing listing or marketing surfaces; the HD-3 listing/ad and showings log rows as sole targets.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: marketing effort becomes measurable: every ad dollar, channel, and showing logged once in the shared instrument all three H5 paths read — feeding days-on-market and listing-to-meeting metrics without ever polluting the expense categories.

BUILD CHECKLIST:


Listing/ad log entries: date, channel, spend, note — attachable to the active listing regardless of path; recurring ad spend supported as repeatable entries.
Showings/inquiries log: one-tap 'log a showing / serious inquiry' with date and optional note, per the doc's recurring question.
Days-on-market clock starts at listing-live (captured by the H5 cards in HD-15…17) and computes in the engine; listing-to-meeting ratio inputs recorded per the matrix.
A small marketing summary strip (spend to date, showings, DOM) reading engine values only.
Explicit boundary in code and copy: marketing spend routes to the Marketing & Sales metric family and is excluded from the NOI expense set — provable by grep and by the engine's category handling.


DON'TS: no 'marketing' expense category or tag string anywhere. No DOM math in components. No fabricated benchmark comparisons.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: log two ad entries and three showings; summary strip updates from engine values.
Terminal: engine call showing marketing spend absent from the NOI expense sum on fixture HX-4.
Grep: zero occurrences of a marketing expense tag in the category enum or ledger writes.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-14 ===

HD-14 · Column H4 — Current value as a dated, source-tagged series
DISPATCH WHEN: after HD-13 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Column H4, Card H4.1 of the questions doc, quoted in full; Decision F-3 (provider interfaces, adapter-only) in the FD pack.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: the RentCast/Zillow provider interfaces and any existing value display; the HD-3 current_value series rows.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: appreciation gets tracked, not guessed at Exit: the investor maintains a dated value series from their own estimates, documents, and clearly-labeled AVM proposals.

BUILD CHECKLIST:


Card H4.1: 'Current estimated market value?' — dated entries; manual entry writes source=user_assumption; uploading an appraisal/BPO to the card's document slot writes source=document with the doc linked.
An 'estimate from market data' action calls the existing provider interface (mock/live per environment flag) and returns a PROPOSAL labeled as a third-party estimate with provider and date — confirming writes the entry with provenance; it never auto-writes.
Series visualization: the value line over the hold with source-type markers, styled from tokens; the doc's why-line ('appreciation is a third of long-run returns') present.
The latest confirmed value feeds current-value-denominator metrics via the engine only.


DON'TS: no silent AVM writes. No provider branding presented as PaperWorking data — provenance always visible. No value edits without a new dated entry (the series is append-only; corrections are new entries with notes).

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: manual entry, document-sourced entry via upload, and an AVM proposal confirmed — three series points with three source markers.
DB output: the series rows with source tags and provenance.
Screenshot: a metric consuming the latest value, side-by-side with the engine call.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-15 ===

HD-15 · Card H5.R — Rent path go-to-market
DISPATCH WHEN: after HD-14 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Card H5.R of the questions doc, quoted in full, including its reveal condition.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): reveal wiring from HD-5; the shared HD-13 instrument as the ad/showings backend.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: a RENT-strategy Project lists with intent: target rent, channels, and a screening checklist — the listing-live moment that starts the clock toward the first-rent gate event.

BUILD CHECKLIST:


Card H5.R revealed only when disposition_type = RENT: target monthly rent (writes target_rent as user_assumption), advertising channels (writing through the HD-13 log), and the application screening checklist state per the doc.
Listing-live capture: date + channel set flips listing status, starts DOM, and fires the HD-25 'listing live' event (email lands with HD-27).
Leasing Agent vendor slot surfaced for HD-22 assignment.
Tenant-placed capture point: recording an executed lease with a start date (document slot for the lease) creates the lease-activation event the Hold→Exit gate consumes at HD-37 — recorded here, acted on there.


DON'TS: no reveal for SALE/LEASE Projects. No rent income ledger here — income is Exit's instrument. No screening-decision automation; the checklist records the investor's own process.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full H5.R pass on a RENT fixture — listing live, DOM starts (engine value shown), a lease recorded with document attached.
Screenshot: SALE Project proving H5.R absent.
DB output: target_rent, listing status, lease record with activation date.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-16 ===

HD-16 · Card H5.L — Lease path go-to-market
DISPATCH WHEN: after HD-15 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Card H5.L of the questions doc, quoted in full, including its reveal condition.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): reveal wiring; the HD-3 target_lease_terms struct.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: a LEASE-strategy Project goes to market with commercial clarity: target rate, term, and structure captured once, listing activity flowing through the shared instrument.

BUILD CHECKLIST:


Card H5.L revealed only when disposition_type = LEASE: commercial listing details and target lease terms — rate, term, NNN|gross flag — writing target_lease_terms; channels via the HD-13 log.
Listing-live capture identical in mechanics to H5.R (status, DOM, event).
Broker vendor slot surfaced; lease-execution capture point (document slot) creates the activated-lease event for HD-37.


DON'TS: no reveal outside LEASE. No lease-document generation — the platform stores, never drafts (Decision F-5 spirit). No rate benchmarks invented.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full H5.L pass on a LEASE fixture through listing-live and an executed lease recorded.
DB output: target_lease_terms struct populated; activation event row present.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-17 ===

HD-17 · Card H5.S — Sale path go-to-market
DISPATCH WHEN: after HD-16 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Card H5.S of the questions doc, quoted in full, including its reveal condition and the staged commission terms.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): reveal wiring; HD-13 as the shared backend; the HX-2 flip fixture.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: a SALE-strategy Project lists at a price with an agent and visible runway: the flip investor sees exactly how long the margin survives while the market decides.

BUILD CHECKLIST:


Card H5.S revealed only when disposition_type = SALE: list price (writes list_price_sale), listing agent Vendor slot with commission terms staged per the doc, channels via the HD-13 log.
Listing-live capture: status, DOM, event — identical mechanics.
Runway readout on the card for flip contexts: the HD-4 engine's margin-erosion date rendered with its inputs labeled (carry, spend, list price), honest about Projected components.
Offer-accepted capture point: recording an accepted offer (price, date, document slot) creates the sale-under-contract event HD-37 consumes.


DON'TS: no reveal outside SALE. No offer/negotiation workflow here — the PaperWorking Inbox owns negotiation threads; this card records the accepted outcome. No commission math outside the engine.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full H5.S pass on fixture HX-2 — listing live, runway readout matching the locked HX-2 golden (side-by-side with the terminal engine call), an accepted offer recorded.
DB output: list_price_sale, staged commission terms, sale-under-contract event row.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-18 ===

HD-18 · The hold_manager role — permission preset on existing Team infrastructure
DISPATCH WHEN: after HD-17 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-5 of this pack; SKILL.md rule 3 (role vocabulary) and Global Rule 7; the Team/access inventory section of docs/audit/hd-2-hold-findings-v1.md; the accounts section of docs/spec/paperworking-reil-master-spec-v1.md (if uncommitted, STOP and report).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): re-verify the HD-2 Team inventory against current code: role model shape, where permission checks live server-side, and whether phase-level scoping is expressible today.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the property manager exists as a first-class, least-privilege delegation: a Project-scoped, Hold-scoped permission preset on the infrastructure the platform already trusts — defined precisely before a single invite is sent.

BUILD CHECKLIST:


Define hold_manager as a preset in the existing role/permission system: scope = exactly one Project; CAN read the Hold workspace and that Project's scorecard; CAN write Hold cards, the renovation spend log, holding-cost entries, listing/ad and showings logs, value-series entries, and compliance item statuses; CAN upload to the Hold document slots; CANNOT touch Fund, CrowdFunding, Exit actions, gate overrides, Team administration, billing, or any other Project; CANNOT change strategy, budgets' approval state, or approval thresholds.
If the existing system cannot express phase-level scoping without structural change, STOP and report the smallest viable options for founder decision — a parallel permission system is prohibited.
Enforce server-side: Firestore rules and API guards updated so the preset's boundaries hold against direct requests, not just hidden UI.
Commit docs/spec/hold-manager-role-v1.md: the full can/cannot matrix above, verbatim, as the reference HD-19…HD-24 build against.


DON'TS: no UI in this dispatch. No new account type, no schema fork of roles. No client-side-only checks.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


The committed role doc.
Rules/guard diffs with file paths.
Founder-terminal verification block: authenticated requests as a hold_manager test user attempting one in-scope write (succeeds) and one out-of-scope read (rejected server-side), with raw responses.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-19 ===

HD-19 · Invite a Property Manager — email invite lifecycle on existing rails
DISPATCH WHEN: after HD-18 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: docs/spec/hold-manager-role-v1.md in full; the invite-lifecycle findings of the HD-2 report; Global Rule 9 (tier gating STOPs).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): walk the existing assign-as-invite lifecycle end-to-end in the running app before building; report exactly which states and emails already exist.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the Lead Investor hands Hold to a property manager in under a minute: an email invite that carries the Project and the hold_manager preset through the platform's existing pending → accepted lifecycle, seats and tiers respected.

BUILD CHECKLIST:


Entry points: 'Invite a Property Manager' on the Hold workspace header and on the Team page — both opening the same flow: email, optional name, the Project (pre-filled), the role (hold_manager, with its can/cannot summary shown to the Lead Investor before sending).
Reuse the existing invite lifecycle: pending → accepted (account created or matched) → active; expired frees the seat; revoked kills the link; the mismatched-email path behaves as the existing system defines. No second invite system.
Seat/tier enforcement per existing billing rules discovered in audit. If the tier entitlement for a hold_manager seat is undefined in existing rules, STOP and report for founder pricing decision — never improvise entitlements.
The invite email (Resend): PaperWorking-cased, plain-language — who invited them, which property (address as the Deal identity), what they will be able to do, a single accept CTA, and expiry. Render for founder copy approval in the bundle; no statistics, no marketing claims.
Acceptance lands the manager on that Project's Hold workspace; the audit log records invite sent/accepted/expired/revoked with actor and timestamp.


DON'TS: no role selection beyond the preset in this flow (broader Team invites keep their existing surface). No auto-provisioned passwords in email. No pricing or tier copy edits.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full lifecycle with two real accounts — send, receive (email screenshot from the Resend log), accept, land scoped.
Recording: revoke a pending invite; the link dies (shown).
DB/audit-log output for all four lifecycle states.
The rendered invite email screenshot for copy approval.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-20 ===

HD-20 · The manager's workspace — scoped view, visible attribution
DISPATCH WHEN: after HD-19 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the can/cannot matrix of docs/spec/hold-manager-role-v1.md; Global Rule 7.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): log in as the accepted hold_manager test user from HD-19 and inventory everything currently visible before changing anything; report leaks first.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the property manager sees exactly their job and nothing else — and everything they touch says so, permanently.

BUILD CHECKLIST:


Manager session scope: Project list shows only assigned Projects; navigation renders only in-scope destinations (Hold workspace, that Project's scorecard read-only, their Inbox, their profile); everything else absent — and absent server-side, not hidden.
Attribution: every ledger entry, log line, document upload, and status change stores and displays its author ('entered by <name> · <role>'); attribution survives offboarding.
Role badge on the manager's profile and beside their name wherever they appear to the Lead Investor.
The Lead Investor's view of Hold gains a quiet activity ribbon: latest manager actions with timestamps, reading the append-only audit log.


DON'TS: no scorecard edit paths (none exist for anyone — users never enter metrics — but verify no back door via ledger abuse of the demo Project: fixtures and demo remain untouchable by managers). No cross-Project queries reachable by URL manipulation.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshot pair: the same app as Lead Investor vs as hold_manager — nav and Project list differing per the matrix.
Recording: URL-manipulation attempt at another Project as the manager → server rejection shown raw.
Screenshot: an entry with attribution; DB row showing stored author.
Screenshot: the Lead Investor's activity ribbon reflecting the manager's actions.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-21 ===

HD-21 · Approval thresholds — the Lead Investor's control valve
DISPATCH WHEN: after HD-20 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the fixture HX-5 definition in docs/spec/hd-hold-fixtures-v1.md; Global Rule 4 (pending never conflates with actual); the audit-log findings of HD-2.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): confirm how ledger writes flow today so pending status can gate metric actualization at the engine boundary, not in components.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: delegation without surrender: the Lead Investor sets a dollar threshold above which a manager's entries wait for approval — pending work visible, actuals untouched until the nod.

BUILD CHECKLIST:


Per-Project setting (Lead Investor only): approval threshold, default off; edits audit-logged.
Manager entries at or above the threshold persist immediately with status pending_approval — visible in the ledgers with a pending chip, EXCLUDED from actuals by the engine until approved (Projected/actual conflation prohibited; pending is its own honest state).
Approve/reject with required reason on reject; both notify the manager (HD-25/27 events); all transitions append to the audit log.
The Lead Investor's Hold view surfaces a pending-approvals queue with one-tap approve.
Below-threshold entries flow untouched.


DON'TS: no approval flows for the Lead Investor's own entries. No engine-external filtering of pending amounts. No deletion of rejected entries — rejected is a preserved status with reason.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording on fixture HX-5: threshold set to the fixture's value; the manager posts the below-threshold entry (flows to actuals) and the above-threshold entry (pending); engine call shows actuals matching the locked HX-5 golden while pending is excluded; approve; engine call shows the post-approval golden.
Screenshot: rejected entry with reason preserved.
Audit-log query output for the full sequence.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-22 ===

HD-22 · Vendor slots and triggering across the Hold cards
DISPATCH WHEN: after HD-21 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: every 'Vendors:' line of the Hold section of the questions doc, quoted; the Triggered Vendors column of the intake-architecture doc; SKILL.md rule 3 (Vendor sees only assignments); the vendor-assignment findings of HD-2.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the existing vendor assignment and specialty-notification paths — what fires today when a matching need arises, per the HD-2 inventory.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: every Hold question that implies a professional surfaces the slot to engage one: assignable Vendors where accounts exist, clean contact records where they do not — each seeing exactly their assignment.

BUILD CHECKLIST:


Wire the per-card vendor slots the docs name: General Contractor and trades (H1/H2 by tier), Insurance Broker (HD-6 task), Property Management Co. (H3 management), Leasing Agent (H5.R), Broker (H5.L), Listing Agent (H5.S), plus handyman/plumber/electrician and roofer/HVAC slots on the maintenance and capex reserve contexts per the narrative's triggered-vendor column. Lender/Servicer renders as display-only contact context from Fund — never an assignable Hold slot.
Two fulfillment modes per slot: assign an existing Vendor account through the existing assignment path (assignment-scoped visibility holds), or store an external contact record (name, company, phone, email — no account, no access).
Where the existing specialty-notification path exists, a filled need may notify matching Vendors exactly as that path already works; where it does not exist for a specialty, external-contact mode only — report the gap, build no new marketplace mechanics.
Every assignment creates the manager/Lead-Investor-visible Inbox item (HD-25 event) and appears on the vendor's assignment view scoped to that task only.


DON'TS: no new notification marketplace. No vendor visibility beyond the assignment (verify, do not assume). No payment, invoice-settlement, or rate-agreement mechanics — document slots record agreements; money never moves.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: assign a Vendor account to a GC slot; log in as that vendor; exactly the assignment visible, nothing else (attempt one out-of-scope read, rejection shown).
Recording: external contact stored on the roofer slot with no access created (DB row shown).
Screenshot: the Inbox item from an assignment.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-23 ===

HD-23 · Offboarding, revocation, and no orphaned work
DISPATCH WHEN: after HD-22 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: docs/spec/hold-manager-role-v1.md; the offboarding/task-resurfacing findings of the HD-2 Team inventory.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): walk the existing member-removal path with a test user before extending it; report current behavior including token/session handling.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: ending the engagement is one clean action: access dies immediately, the seat frees, open work resurfaces to the Lead Investor, and the historical record stands untouched.

BUILD CHECKLIST:


Remove/revoke hold_manager from the Team surface and the Hold header: immediate server-side revocation (claims/session invalidation per the existing mechanism), seat freed per billing rules.
Open items assigned to the removed manager (tasks, pending approvals authored by them, reminder ownership) resurface in a reassignment queue for the Lead Investor — nothing orphans silently; pending entries remain pending awaiting the Lead Investor's verdict.
Historical attribution preserved everywhere ('entered by <name> · role at the time'); documents they uploaded remain, attributed.
Offboarding writes audit-log entries and fires the HD-25 events (manager notified of removal via the HD-26 template).


DON'TS: no data deletion on removal. No lingering valid tokens — prove revocation, do not assert it. No seat double-frees.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: full offboarding — the manager's live session loses access mid-use (attempted write post-revocation shown rejected raw).
Screenshot: reassignment queue showing the resurfaced items.
DB/audit output: revocation entries, preserved attributions, seat state.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-24 ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-24 ===

HD-24 · Permission enforcement — the adversarial evidence pack
DISPATCH WHEN: after HD-23 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the complete can/cannot matrix of docs/spec/hold-manager-role-v1.md, and Global Rule 7.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): this dispatch IS the adversarial audit of Stage E; it changes code only to fix failures it finds, each fix reported as a finding first.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: prove, adversarially and reproducibly, that the delegation surface holds at the API and rules layer — the founder's terminal, not the agent's word, is the instrument.

BUILD CHECKLIST:


Construct a founder-runnable verification block (curl/httpie + any needed test tokens minted by documented script): as hold_manager — read own Hold (200), write in-scope ledger (200), read another Project (denied), write a Fund variable (denied), read Team admin (denied), change approval threshold (denied), invite anyone (denied); as revoked ex-manager — any read (denied); as Vendor — own assignment (200), anything else (denied).
Run the block yourself first; paste raw request/response pairs for every line.
Any failure: STOP, report the finding, fix, re-run the entire block, report the fix as a finding with diff.
Firestore rules and API guard citations mapped line-by-line to each matrix row in a coverage table.


DON'TS: no UI-only demonstrations — every proof is a direct request. No test shortcuts that mint privileged tokens outside the documented script.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


The founder-runnable block as a committed script under a docs/verification/ path, plus your own full raw transcript of running it.
The matrix-to-enforcement coverage table.
Founder terminal is the countersign channel for this dispatch: the bundle is not approvable until the founder has run the block locally.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-25 ===

HD-25 · The Hold notification catalog — events, Inbox items, telemetry
DISPATCH WHEN: after HD-24 is countersigned by founder-terminal run.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-6 of this pack; Global Rule 12; the Inbox and messaging findings of the HD-2 report.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the existing Inbox item shapes and emission sites, so Hold events extend the existing system rather than a parallel one.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: every Hold moment that deserves attention is a named, recorded event flowing through one catalog: stored fact → Inbox item → (per preference) email → PostHog — nothing fires without a fact.

BUILD CHECKLIST:


Commit docs/spec/hold-notifications-catalog-v1.md enumerating the canonical Hold events with, for each: trigger fact, audience (Lead Investor / hold_manager / Vendor), Inbox item shape, email eligibility, and PostHog event name. Events: manager invite sent / accepted / revoked / removed; entry pending approval; entry approved / rejected; budget threshold crossed (80% and 100% of rehab_budget); listing live; showing logged (digest-only, no per-showing email); value entry added; document uploaded to a slot; compliance item expiring / lapsed; reminder due; Hold→Exit gate advanced.
Wire emission at the recorded-fact sites for every event that already has its fact recorded by prior dispatches; gate-advanced wiring lands with HD-37 (catalog row exists now, marked deferred).
Each emission writes the Inbox item via the existing system and fires its named PostHog event.
Duplicate suppression: one fact, one event — re-edits do not re-fire creation events.


DON'TS: no email sending in this dispatch (HD-26/27 own templates and sends). No event without a stored fact behind it. No second inbox.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


The committed catalog.
Recording: three distinct events performed in-app appearing as Inbox items.
PostHog screenshot: the fired events with names matching the catalog.
DB output: the stored facts behind each demonstrated event.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-26 ===

HD-26 · Resend lifecycle emails — invite-adjacent set, failure-isolated
DISPATCH WHEN: after HD-25 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-6; the Resend template inventory of HD-2; Global Rules 1 and 4 (casing; no fabricated content in copy).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): how existing Resend sends are triggered and logged, and where failure isolation already exists, so these follow the house pattern.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the delegation lifecycle speaks for itself: accepted, revoked, role-ended, and work-reassigned moments each land as a clean, honest email — and a failed send never touches the underlying fact.

BUILD CHECKLIST:


Templates (Resend, house pattern): invite accepted (to the Lead Investor), invite revoked/expired (to the invitee where appropriate per existing norms), access ended (to the removed manager — factual, respectful), reassignment summary (to the Lead Investor listing resurfaced items). The HD-19 invite email joins this template family if it shipped as a one-off.
Copy rules: PaperWorking casing, the Deal address as the property identity, plain language, no statistics, no urgency theater; every value in an email is a stored fact. Render all templates in the bundle for founder copy approval.
Failure isolation proven: with the Resend key disabled in dev, the triggering action still completes, the failure logs with context, and a visible send-status appears in the audit trail.
Send logging: every send recorded (template, recipient, event ref, status) — queryable.


DON'TS: no marketing content in transactional emails. No PII beyond what the recipient already owns. No blocking any write on email outcome.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshots of each rendered email from real triggers (Resend log).
Recording: the disabled-key run — action succeeds, failure logged (log line shown).
DB/log output: the send records.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-27 ===

HD-27 · Resend operational emails — approvals, budget alerts, listing live, gate celebration
DISPATCH WHEN: after HD-26 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-6; the catalog rows for these events in docs/spec/hold-notifications-catalog-v1.md; Global Rule 5 (all figures engine-computed).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): confirm the threshold-crossing facts (80%/100%) are derivable from engine values, not recomputed at the send site.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the emails an operator actually wants: approval asks and verdicts, budget lines crossed, the listing going live, and — when the day comes — the phase-advance celebration, every number in them born in the engine.

BUILD CHECKLIST:


Approval requested (to the Lead Investor: entry summary, one-tap deep link to the queue); approved / rejected-with-reason (to the manager).
Budget threshold crossed at 80% and at 100% of rehab_budget (to the Lead Investor + manager): spend-to-date, budget, variance — engine values only, fired once per threshold per budget version.
Listing live (to the Lead Investor when the manager lists, and vice versa): path, price-or-rent target, channels.
Gate-advance celebration template (Hold→Exit): congratulatory, factual — the triggering event, the date, what Exit now tracks. Template ships and renders now; its emission wires at HD-37.
All sends respect HD-29 preferences once those land (until then, default-on for these classes, noted in the bundle); all logged like HD-26.


DON'TS: no threshold math outside the engine. No celebration email without the gate fact. No repeated threshold fires on ledger edits below the line.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshots: each email from a real trigger on fixtures (HX-3 drives the 80% crossing — engine value visible in the email matching the locked golden).
Recording: the 80% fire, then an additional small entry not re-firing it.
Send-log query output.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-28 ===

HD-28 · The weekly Hold digest — one email that runs the property
DISPATCH WHEN: after HD-27 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-6; the job-queue findings of HD-2; Global Rule 4 (empty sections omitted honestly).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the existing scheduler/job-queue named by HD-2 — the digest schedules through it, not through a new cron.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: Monday morning, the Lead Investor (and manager) reads one honest page per property: what moved, what it costs to keep, what needs a decision — computed, never composed.

BUILD CHECKLIST:


Weekly per-Project digest to opted-in Lead Investor and hold_manager: spend this week (entries listed), budget remaining and variance, current monthly carry, upcoming due items in the next 14 days (from HD-30's schedule once live; section marked deferred until then), listing activity (DOM, showings this week) when listed, pending approvals count with deep link, latest value entry if new.
Every figure from the engine; sections with nothing to say are omitted — no padding, no zero-theater.
Scheduling through the existing job queue with per-user send-time in their timezone where the existing system supports it; otherwise a single documented send window.
Digest footer: preference link (HD-29) and unsubscribe for the digest class; sends logged.


DON'TS: no aggregate portfolio claims in v1 — per-Project only. No recomputation at render time diverging from the engine. No sending to users without Hold access to that Project.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshot: a real digest for fixture HX-3's Project with engine-matching figures.
Screenshot: a sparse-week digest showing honest omission of empty sections.
Job-queue/scheduler evidence of the recurring schedule; send-log output.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-29 ===

HD-29 · Notification preferences — per-user, per-Project, server-enforced
DISPATCH WHEN: after HD-28 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-6; the preference-storage findings of HD-2; Global Rule 7 (enforcement is server-side).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): whether any preference storage exists; extend it if so, create the minimal shape if not — one system either way.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: attention is the user's to allocate: a simple matrix decides what arrives where, and the send sites obey it without exception.

BUILD CHECKLIST:


Preference surface in existing account settings: event classes (delegation lifecycle, approvals, budget alerts, listing activity, digest, reminders) × channels (in-app always-on for approvals and delegation; email toggleable), plus a per-Project mute.
Enforcement at the send site, server-side: every HD-26/27/28 emission checks preferences before dispatching email; in-app Inbox items for approval and delegation classes are non-suppressible by design (stated in the UI).
Sensible defaults documented in the bundle; changes audit-logged.
Digest unsubscribe (HD-28 footer) writes the same preference — one system.


DON'TS: no per-template micro-toggles in v1 — classes only. No client-trusted preference reads at send time.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: toggle budget-alert email off; trigger a crossing; Inbox item appears, no email (send-log shows suppressed-by-preference).
Recording: per-Project mute honored while another Project still emails.
DB output: the preference document and an audit entry for the change.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-30 ===

HD-30 · The reminder engine — due dates, expirations, and honest nudges
DISPATCH WHEN: after HD-29 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision H-6; the due-day fields of HD-10 and the expiry fields of HD-31's items (compliance rows marked deferred if HD-31 has not run); the job-queue findings of HD-2.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): what scheduled work the existing queue runs today and its retry/idempotency behavior — reminders inherit it.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the platform remembers so the investor doesn't: recurring costs, expirations, and target dates surface as reminders exactly when useful, through the channels the user chose — and never pretend to have fired.

BUILD CHECKLIST:


Reminder sources: recurring holding costs with due-days (ahead-of-due nudge), rehab_completion_target approaching (14 days and 3 days), insurance policy and permit/registration expirations (from document/compliance metadata; compliance-sourced rows activate when HD-31 lands), listing-preparation nudge when renovation completes on a Project not yet listed.
Each reminder is an Inbox item (catalog event) + email per HD-29 preferences; snooze (7 days) and done states; done on a recurring source rolls to the next occurrence.
Idempotent scheduling through the existing queue: re-runs never double-fire; missed windows fire once with honest 'was due' framing, never backdated as if on time.
Reminder history queryable per Project.


DON'TS: no reminders without a stored date behind them. No 'sent' status without a send record. No new scheduler.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: a due-day reminder firing in dev-accelerated time — Inbox + email (screenshots), snoozed, re-fires post-snooze.
DB output: reminder rows with states across the cycle; the idempotency proof (forced double-run, single fire).
Screenshot: the honest 'was due' framing on a deliberately missed window.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-31 ===

HD-31 · Compliance checkpoint — permits, inspections, insurance, registrations
DISPATCH WHEN: after HD-30 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the compliance-checkpoint content of the Hold section of docs/spec/reil-complete-four-phase-questions-tasks.md, quoted in full. If the committed Hold section contains no compliance card, STOP and report — the founder will amend the questions doc before this dispatch re-runs; do not build compliance from this pack alone.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): from HD-2: any existing compliance or checklist instruments; the risk-band and compliance-rate rows of the 33-metric matrix.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: nothing critical lapses quietly: a recurring checkpoint tracks what must stay current, seeded by renovation scope, feeding the compliance and risk metrics, and arming the reminder engine with real dates.

BUILD CHECKLIST:


The recurring compliance card per the committed doc: items with statuses compliant / lapsed / N-A, expiry dates, and an evidence document slot per item; scope-tier seeding per the doc (e.g., permit items appearing for the heavier tiers).
Item metadata (expiry dates) registers with the HD-30 reminder engine; lapses fire the catalog event.
Compliance rate and the risk-band refresh compute in the engine per the matrix — never in the card.
Critical-item lapses render prominently on the Hold workspace and surface at the gate's confirmation step per the doc's framing; nothing here blocks mid-phase work.


DON'TS: no legal determinations — items and statuses record the investor's own compliance process. No jurisdiction-specific rule engines. No metric math in components.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: tier-seeded items appearing on a Gut-tier fixture; a status set with evidence attached; a lapse rendering and firing its event.
Terminal: engine call showing compliance rate over the fixture's items.
Screenshot: the reminder created from an item's expiry date.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-32 ===

HD-32 · Hold document checklist and the Data Room within Insights
DISPATCH WHEN: after HD-31 is countersigned (or after HD-30 if HD-31 STOPped, by founder instruction).

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the Hold document lists of the questions doc, quoted; SKILL.md rule 13 (Portfolio → Insights → Data Room); the documents-plane findings of HD-2.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the existing per-Project document surfaces and storage rules — the Hold slots archive into the existing plane, never a parallel store.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the paper trail assembles itself: every Hold document lands in its slot once and appears in the Project's Data Room within Insights, complete-ness always honest, access always scoped.

BUILD CHECKLIST:


Wire every Hold document slot the docs name — scope of work, contractor bids and agreements, permits, receipts/invoices (rehab and holding), updated appraisal/BPO, HOA bylaws, insurance policy, listing agreements, executed lease or accepted offer — each attached at its collecting card and archived to the Project's document plane with type metadata.
The Data Room view within Insights lists Hold documents by type with upload date, uploader attribution, and the linked card; the completeness indicator reflects only slots relevant to this Project's strategy and tier — honest, never padded.
Access follows roles: hold_manager uploads/reads Hold documents on their Project; Vendors read only documents attached to their assignment; signed-URL discipline per existing storage rules.
Uploads fire the catalog event; document metadata (expiries where present) feeds HD-30/31.


DON'TS: no second storage bucket or parallel document model. No public URLs. No completeness theater — irrelevant slots are absent, not checked.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: upload at a card → appears in the Data Room with attribution and card link.
Screenshot: RENT vs SALE Projects showing strategy-appropriate slot sets.
Recording: Vendor account seeing only its assignment's documents (out-of-scope fetch rejected raw).


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-33 ===

HD-33 · Side-by-side document capture for Hold — the F-4 pattern
DISPATCH WHEN: after HD-32 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: Decision F-4 in docs/spec/fd-series-40-fund-prompts.md (document-driven side-by-side capture; AI extraction behind a default-off flag), and Global Rule 4.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): how the Fund implementation of F-4 works today — Hold reuses its mechanics, not a reinvention.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: an invoice becomes a ledger entry without retyping: the document on one side, the proposed entry on the other, the user always the author — extraction assisting only where the flag allows.

BUILD CHECKLIST:


Apply the existing F-4 capture pattern to Hold's paper: uploading an invoice/receipt at the spend or holding-cost contexts opens the side-by-side view — document left, proposed entry fields right (amount, date, category, vendor), user confirms or corrects, entry writes with source=document and the doc linked.
AI extraction pre-fills the proposal only when the existing default-off flag is on; flag off, fields start empty beside the document.
Category proposals respect the eight-tag law and the capex-vs-maintenance guidance line.
Works identically for hold_manager (approval threshold from HD-21 still applies to the resulting entry).


DON'TS: no silent extraction writes. No new flag — the F-4 flag governs. No document parsing logged with contents.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: flag off — manual side-by-side capture to a confirmed entry with doc linked.
Recording: flag on — pre-filled proposal corrected by the user before confirm.
DB output: the entry with source=document and provenance.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-34 ===

HD-34 · Metrics actualization — Hold data flows to the engine, goldens stand
DISPATCH WHEN: after HD-33 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: SKILL.md rules 5, 6, and 9; the Hold-collected rows of the 33-metric matrix with their projected→actual lifecycle notes, quoted; the P6 chain of reil-kpi-formulas.md.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): trace, in code, each Hold-collected variable from its write site to its engine consumption; list any gap or any surviving inline consumer as a defect.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the payoff promised since Acquisition: Hold's real numbers actualize the projections — NOI, Cash Flow, Expense Ratio and their families turning from assumption to fact on screen, with the golden five untouched behind them.

BUILD CHECKLIST:


Verify and complete the flow: holding-cost actuals → operating-expense actuals (NOI, Cash Flow, Expense Ratio actual states); rehab spend → capex and the total-cash-invested chain; current-value series → the current-value-denominator family and appreciation; vacancy/occupancy context staged for the Exit-computed occupancy per the matrix.
Projected vs actual render per the matrix lifecycle: distinct visual states, never conflated; a metric mid-transition labels which components remain Projected.
Pending-approval amounts (HD-21) excluded from actuals at the engine boundary — re-proven here on HX-5.
Scorecard and Insights reflect actualization on the fixtures; the demo Project remains all-Projected exactly as seeded.


DON'TS: no engine forks, no component fallbacks, no cached values bypassing live derivation (the stale-NOI class of bug is a named prior defect — prove its absence).

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Side-by-side for three named metrics on fixture HX-1: screen value vs terminal engine call, matching the locked HX goldens.
Recording: an actual replacing a Projected component live (label transition shown).
Golden five live-call output — unchanged — plus a cache-bust proof (edit an input, value updates without reload tricks).


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-35 ===

HD-35 · Hold widgets per the Dashboard UX Standard
DISPATCH WHEN: after HD-34 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the committed Dashboard UX Standard (D-1…D-8) — if absent from docs/spec/, STOP and report; Global Rules 10 and 12; the locked HX goldens.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): existing dashboard widget patterns (Featured Metric module, expandable data points) from the UX/PF work — Hold widgets extend the established module system.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the Hold story at a glance, each widget answering a business question with a decision line: what it costs to hold, whether the budget survives, how long the flip breathes, and how the market is responding.

BUILD CHECKLIST:


Widgets, each per the D-standard (decision line, PostHog event, business-question evidence in the DoD): Budget vs Actual (rehab), Monthly Carry, Flip Runway (SALE contexts with the HX-2 engine derivation), Days on Market + showings (once listed), Reserve status (policy targets vs funding status chips per Decision H-3).
Strategy- and state-aware visibility: runway absent on RENT/LEASE; DOM absent before listing; every empty state honest with a deep link to the collecting card.
All values from the engines; all styling from tokens; expandable per the established module system.
Each widget's decision line phrased as the action it informs (e.g., carry: what one more month of vacancy costs).


DON'TS: no widget math. No benchmark lines without a committed source for the benchmark. No always-on widgets ignoring strategy state.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Screenshots: the widget set on HX-2 (flip) and HX-4 (rent) showing correct presence/absence; runway matching the locked HX-2 golden beside the terminal call.
PostHog: the widget events firing on interaction.
The business-question evidence note per widget, per the D-standard DoD.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-36 ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-36 ===

HD-36 · Insights integration — Hold's contribution to the 33
DISPATCH WHEN: after HD-35 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: SKILL.md rules 6 and 13; the five-category taxonomy and Hold-fed rows of the 33-metric matrix; the Insights structure shipped by the UX/PF work (audit, do not re-architect).
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the current Insights surface — where each category renders and how drilldowns work today.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: Insights absorbs Hold: every Hold-fed metric renders in its category with drillable evidence, and every metric still starving names its missing input with a road back to the exact card.

BUILD CHECKLIST:


Hold-fed metrics render in their taxonomy categories within the existing Insights structure; the headline scorecard continues surfacing the canonical ten per rule 6.
Drilldowns for Hold instruments: spend log behind the capex family, value series behind appreciation, listing/showings log behind the Marketing & Sales rows.
Missing-input states across Insights deep-link to the specific Hold card that collects the input (not to the phase generally).
Per-widget telemetry continues per the D-standard.


DON'TS: no Insights re-architecture. No category renames. No fabricated placeholders where inputs are missing.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: category → Hold metric → drilldown → the underlying log, on fixture HX-3.
Recording: a missing-input metric deep-linking to its exact collecting card and back.
Screenshot: scorecard still surfacing the canonical ten.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-37 ===

HD-37 · The Hold→Exit gate — event-triggered, celebrated, complete handoff
DISPATCH WHEN: after HD-36 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the GATE — Hold → Exit section of the questions doc, quoted in full; SKILL.md rule 14; the gate-advanced rows of the notification catalog.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the three event capture points shipped in HD-15/16/17 (lease activation, executed lease, sale under contract) and the FD-era gate implementation pattern — one gate implementation, never two.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the property starts earning and the platform notices: the first qualifying recorded event advances the Project to Exit automatically — no checkbox — with the celebration, the notice, and the operating baseline delivered whole.

BUILD CHECKLIST:


The gate listens to the recorded facts: first confirmed rent, activated lease, or sale under contract — whichever lands first advances the Project. No user checkbox exists; the event is the gate, exactly per the doc.
Advance executes the doc's confirmations: renovation log closed or carried forward, ledgers current, listing outcome recorded with DOM computed at trigger, risk score recomputed via the engine.
The carry-over payload hands Exit precisely what the doc names: cost basis plus capitalized improvements, holding-cost history, the current-value series, and the marketing outcome that triggered — payload shape documented and shown from a real advance.
Celebration moment in-app for the Lead Investor; the HD-27 gate email fires; the catalog event and PostHog fire; hold_manager scope after advance follows the role doc (report if the role doc is silent — founder decision, do not improvise).
Exactly one gate implementation — if the audit finds a second gate path, STOP and report before building.


DON'TS: no manual advance control. No partial payloads. No re-derivation of DOM or risk outside the engine.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: on a RENT fixture, recording the activated lease auto-advances the Project — celebration shown, Inbox item, email screenshot.
Recording: on fixture HX-2, an accepted offer advances the SALE path identically.
DB output: the gate record with the full payload; DOM value beside the terminal engine call.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.
=== END PROMPT ===

=== PROMPT FOR ANTIGRAVITY · HD-38 ===

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-38 ===

HD-38 · Fund→Hold entry and the mid-lifecycle backfill wizard
DISPATCH WHEN: after HD-37 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the Fund→Hold gate section of the questions doc and the intake router row 'Owned — renovating or marketing', both quoted; the HD-2 findings on the FD-shipped carry-over payload.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): how a Project actually arrives in Hold today — both through the FD gate and through intake — and what the carry-over payload contains versus what Hold consumes.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: both doors into Hold work honestly: the gate handoff consumed field-by-field, and the mid-lifecycle investor backfilled in minutes through confirmations — nothing asked twice on either path.

BUILD CHECKLIST:


Gate-arrival: Hold consumes the FD carry-over payload — every field lands in its one home (financing actuals feeding HD-7's baseline, insurance premium feeding H3 pre-fills); any payload field without a consumer, or consumer without a field, is reported as a boundary defect with a proposed disposition.
Intake-arrival: the 'Owned — renovating or marketing' route lands in Hold with the purchase-essentials backfill wizard — confirmation-style single-question screens writing the same one-home variables (purchase price and date, financing facts or all-cash, insurance) before opening the H columns; save/resume; progressive disclosure law throughout.
Red-criteria override on the Fund gate (where the doc defines it) stores its typed reason and audit-logs it — verify, and repair if the FD implementation drifted.
Backfill never re-asks anything present: partially-known Projects see only their gaps.


DON'TS: no second wizard framework — reuse the interview mechanics from HD-6. No gate criteria edits without STOP-and-report. No silent payload drops.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Recording: a Project passing the Fund gate and arriving with the baseline pre-populated (fields traced to payload in the bundle).
Recording: a fresh intake through the owned-renovating route, backfill to an opened Hold board.
DB output: an override record with typed reason (if the doc defines overrides on this gate).


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-39 ===

HD-39 · Hold QA sweep — two full lifecycles, greps, goldens, roles, mail
DISPATCH WHEN: after HD-38 is countersigned.

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the Definition of Done section of SKILL.md, quoted in full.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): this dispatch IS the sweep; defects found are reported as findings for founder-scoped fix dispatches — never silently patched inside this one.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: the phase proves itself end to end, twice: one rental, one flip, from Fund handoff to the Exit advance — with the unfakeable instruments (greps, live calls, raw requests, send logs) closing the loop.

BUILD CHECKLIST:


Walkthrough recording 1 — RENT lifecycle on a fresh fixture: Fund gate → entry interview → H1/H2 with a manager invited mid-stream → approvals exercised → ledgers with a Plaid proposal → listing → activated lease → auto-advance with celebration and email.
Walkthrough recording 2 — SALE flip on HX-2: baseline → spend to the 80% alert → runway widget → listing → accepted offer → advance.
Grep set, raw output: zero non-canonical phase labels in Hold scope; zero strategyType; 'escrow' only in the lender-impound context of revised Decision H-3, every occurrence listed; zero marketing expense tag; zero ad-hoc style values in new files.
Golden five live call; all five HX goldens re-derived live and matching their locked values.
Role spot re-proof: three adversarial requests from the HD-24 block re-run raw.
Mail: the send log for both lifecycles with screenshots of each distinct template that fired; PostHog event roster for both runs.
Findings list: every defect observed, severity-tiered, fix-dispatch proposed — no fixes applied here.


DON'TS: no fixing during the sweep. No cut recordings — continuous walkthroughs. No asserting where an instrument can show.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


Both recordings, continuous.
All raw grep, live-call, and request outputs.
The send-log and PostHog rosters.
The severity-tiered findings list (or an explicit clean report).


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

---

=== PROMPT FOR ANTIGRAVITY · HD-40 ===

HD-40 · Merge readiness — evidence index, custody close-out, founder verification block
DISPATCH WHEN: after HD-39's findings are resolved by founder verdict (fix dispatches complete or waived in writing).

PRECHECK (dead-on-arrival rule — a bundle without this is void, unread): open
your evidence bundle with the raw output of
git branch --show-current && git status --short.
Expected branch: feature/hold-hd-series. Anything unexpected — wrong branch, dirty tree,
untracked spec files — STOP and report before doing anything else.

Invoke the skill paperworking-reil and follow it in full.

READING PROOF — quote verbatim, before planning: the Definition of Done and Working discipline sections of SKILL.md; the sequencing law of this pack's header.
If any named file or section is missing from the committed repo, STOP and
report. Never build from memory of a chat; never author or reconstruct spec
content — spec content comes from the founder only.

AUDIT FIRST (Logic Lens): the full HD-1…HD-39 evidence trail and the branch history — this dispatch consolidates; it builds nothing.
Report audit findings before building. If the audit contradicts the spec,
STOP and report — never improvise reconciliation.

CORE LAWS (digest — the skill governs in full):


Casing: PaperWorking — exactly.  2. Phases: Acquisition · Fund · Hold · Exit — only.
Honesty: every displayed value is computed from stored inputs or labeled
Projected; missing inputs show what is missing and deep-link to the
collecting card — never a fake value, never a stub presented as working.
Goldens: NOI $12,486 · Cap Rate 4.5% · Cash Flow −$4,444/yr · DSCR 0.74 ·
CoC −7.41% must reproduce from a live deriveAllProjectMetrics call.
Money-movement: record, coordinate, verify — never move money; no payments,
escrow, KYC, pooling, or wiring instructions anywhere.
Security v1.1: identity from the verified Firebase ID token only — never the
request body; all scoping enforced server-side; Vendors see only assignments.


MISSION: one document lets the founder decide the merge in minutes: every dispatch's evidence indexed, every open item owned, the branch clean, and the verification block ready for the founder's terminal — the merge itself is the founder's hand.

BUILD CHECKLIST:


Commit docs/audit/hd-40-merge-readiness-v1.md: a table of HD-1…HD-39 — verdict, evidence bundle reference, open cross-referenced ACs, resubmission conditions-addressed links; an open-items ledger with owner and disposition; the quarantine report (any non-series work found, where it was parked).
Branch state: feature/hold-hd-series rebased or merged-forward per the house pattern the founder names, tree clean, migrations status clean — outputs pasted.
The founder verification block, runnable in the founder's terminal: golden five live call; the five HX live derivations; three HD-24 adversarial requests; the grep set; prisma migrate status; the Hold board render check instructions (Acquisition · Fund · Hold · Exit visible, Hold columns per doc).
The --no-ff merge command block into Yves/feature-development — written, explained, and NOT executed. The founder runs it after the verification block passes on the founder's machine.


DON'TS: do not merge. Do not squash or rewrite series history without founder instruction. Do not close open items by assertion.

ACCEPTANCE CRITERIA — runtime evidence only (screenshots, walkthrough
recordings, DB query output; tsc/tests/builds/assertions satisfy nothing):


The committed readiness document.
Terminal outputs: branch state, status, migrate status — clean.
The verification block as a committed script with your own passing transcript.
Final precheck output as the bundle's last line: branch and clean tree.


Deliver the evidence bundle for founder review and STOP. Do not begin the next dispatch.

=== END PROMPT ===

Appendix A — HX fixture definitions (cited data contract — see docs/spec/hd-hold-fixtures-v1.md)

Hold fixture definitions (HX-1…HX-5) live strictly in docs/spec/hd-hold-fixtures-v1.md.
Per the single home law, this pack cites that file and does not duplicate its content.
If the two ever appear to disagree, docs/spec/hd-hold-fixtures-v1.md governs and the agent STOPs and reports.

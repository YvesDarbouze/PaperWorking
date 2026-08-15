---
name: paperworking-reil
description: Rules, terminology, and conventions for ALL PaperWorking REIL build work. Invoke for any task touching Projects, Deals, REIL phases (Acquisition, Fund, Hold, Exit), the Kanban, cards, the variable registry, ledgers, metrics, the Deal Analyzer, Insights, CrowdFunding, Vendors, or Investment Teams. Also invoke before writing any UI copy, seed data, or financial calculation anywhere in this repo.
---

# PaperWorking REIL — Build Rules
*(Unified 2026-07-18. This file supersedes all prior SKILL.md revisions and any conflicting rules, phase, or terminology content anywhere in the repository. Where any document conflicts with this skill or the card-level authority named below, this skill and that authority govern.)*

You are building PaperWorking: project management + analytics for Real Estate Investors, organized around the REIL (Real Estate Investment Lifecycle). The Kanban collects data conversationally (TurboTax-style); the analytics layer is the payoff. Governing user story: *"without me doing anything, visualize how well my investments are doing."* Manual entry the system could have captured from a document, a Plaid transaction, or a prior answer is a design failure.

## Non-negotiable rules

1. **Brand casing:** `PaperWorking` — exactly. Never Paperworking, paperworking, Paper Working.
2. **Phase labels (canonical, exhaustive):** `Acquisition`, `Fund`, `Hold`, `Exit`. Never "Closing." Never "Hold & Rehab." Never "Purchase."
3. **Terminology:**
   - **Project** = the lifecycle container. **Deal** = the property (identified by address; the public face for crowdfunding). *"Investors participate in the Deal; you command the Project."*
   - **Lead Investor** (controlling user) · **Investment Team** (equity partners; Lead Investor sets per-phase permissions) · **Vendor** (service provider; sees only assignments, nothing else).
   - Renovation scope tiers, exactly five: `Stage`, `Refurbish`, `Renovate`, `Gut`, `Develop`.
   - `disposition_type` (SALE | LEASE | RENT) is ONE canonical field with two entry doors (intake router, Declare Strategy card). Never create a second strategy field. Never re-ask if set. The legacy `strategyType` field is a defect on sight.
4. **Honesty Rule:** No fabricated statistics, invented data, or placeholder numbers presented as real. Every displayed value is computed from stored inputs or labeled `Projected`. Projected and actual are never visually conflated. Metrics lacking inputs show what's missing and deep-link to the collecting card — never a fake value.
5. **Single-function rule:** ALL metric math lives in `deriveAllProjectMetrics`. If a metric value is computed anywhere else — a component, an API route, a report, a seed — that is a defect. The amortization schedule is one shared utility feeding that function. Fund-plane computations (debt service, equity splits, preferred-return accruals, waterfall distributions, sources-and-uses reconciliation) follow the same law: one named engine each, no inline math in components.
6. **Metrics model:** the engine computes all 33 metrics; the headline scorecard surfaces the canonical 10 (NOI, Cash Flow, Cap Rate, Cash-on-Cash, GRM, DSCR, IRR, Occupancy Rate, Expense Ratio, Long-Term Appreciation); the remainder render in Insights by category. Users NEVER enter a metric — only atomic input variables.
7. **Variable registry:** atomic inputs are typed, source-tagged (`user_assumption | user_actual | document | derived | plaid`), with `projected` and `actual` slots where the lifecycle demands (assumption in Acquisition → actualized in Fund/Hold/Exit). One variable, one home — nothing asked twice.
8. **Expense categories (canonical tag set, Schedule E-aligned):** `tax`, `insurance`, `security`, `maintenance`, `utilities`, `management`, `HOA`, `capex`. Never invent category names. The management fee is computed on **gross scheduled rent**, never effective rent (BUG-8, forever).
9. **Demo data:** all seeded/preview states derive from `DEMO_FINANCIALS`. Canonical seed property: $279,000 purchase, 20% down, 6.5%/30yr → NOI **$12,486**, Cap Rate **4.5%**, Cash Flow **−$4,444/yr**, DSCR **0.74**, COC **−7.41%**. These five values are the golden-file check: if your work makes them unreproducible from a live `deriveAllProjectMetrics` call, your work is wrong. Never hardcode results, never rename fallbacks, never encode expected outputs as arithmetic expressions.
10. **Money-movement prohibition (platform-wide):** PaperWorking records, coordinates, and verifies capital events; it never moves money. Never build, stub, or hint at payments, escrow, KYC/AML, accreditation verification, fund pooling, or wiring instructions — in CrowdFunding, Fund, or anywhere else. Capital events are statuses with evidence documents (Decision F-1). CrowdFunding remains: investor mailing list + Deal one-pager + non-binding LOI/soft-commit logging ONLY; non-binding disclosure language is locked on.
11. **UX law — progressive disclosure:** one decision per screen; plain language with a "why we ask" line; conditional cards appear only when property type/answers trigger them; every flow save/resumes; completed cards reopen for editing and edits recompute downstream. Kanban columns reveal progressively. Gate passes are celebrated.
12. **Styling:** the UX-0 extracted token set (night theme; antigravity.google/pricing reference model) is the styling authority. No ad-hoc colors, fonts, or spacing values. Typography respects the UX-series readability floor — no small-text regressions. *(Founder-confirmed 2026-07-18; supersedes the former Stitch clause.)*
13. **Dashboard hierarchy:** Portfolio → Insights. Fixed order, not interchangeable. *(Note: Data Room removed 2026-07-24 by founder direction.)*
14. **Phase transitions:** Acquisition→Fund and Fund→Hold are checklist gates evaluated from live data (never user checkboxes; red criteria block unless a typed override reason is stored). Hold→Exit is EVENT-triggered: first confirmed rent, activated lease, or sale under contract advances the Project automatically.
15. **Email:** SendGrid is the sole email provider platform-wide. Resend is retired; its reintroduction is a defect on sight. All outbound mail flows through the EM Series registry — no registered template key, no send. Every HTML message ships a genuine plain-text alternative. No `no-reply` address exists anywhere in this system. No mailer computes a metric.

## Definition of Done — runtime evidence only

An acceptance criterion is satisfied ONLY by evidence from the running app: screenshots, walkthrough recordings, or database query output. The following NEVER satisfy any criterion: `tsc` passing, unit tests passing, builds succeeding, or your own assertion that the work is complete. When a criterion asks for a computed value, show the value on screen side-by-side with the direct function call that produced it. Resubmitting rejected work unchanged without addressing hold conditions is a named process violation.

## Working discipline

- **Spec authority & phantom-spec discipline:** the repo is the spec authority. Build only against committed documents; quote the governing committed section verbatim before submitting any plan (reading proof). If a referenced document is missing from the repo, STOP and report — never build from memory of a chat, and never author, reconstruct, extract, or "improve" spec content. Spec content comes from the founder only.
- **Audit before building (Logic Lens):** every dispatch begins by auditing the named existing surfaces and reporting findings. If the audit contradicts the spec, STOP and report — do not improvise reconciliation.
- **What-not-how:** specs describe behavior and outcomes; implementation choices are yours within the existing stack (Next.js 16.2.3, React 19, TypeScript, Tailwind, Prisma, Firebase, Stripe, SendGrid, PostHog, Sentry).
- **Cross-referenced ACs** owed at later dispatches remain open items until evidenced.

## Reference documents (read the relevant one before building)

**Governing set** — where anything below conflicts with these or with this skill, these govern:

| Document | Role |
|---|---|
| `docs/spec/reil-complete-four-phase-questions-tasks.md` | **THE card-level authority** — every column, card, question, variable, and gate across Acquisition, Fund, Hold, Exit. Governing over any conflicting phase or question content elsewhere in this directory. Read before building any phase surface. |
| `docs/spec/reil-33-metrics-collection-matrix.md` | Variable registry taxonomy + the 33-metric collection matrix — every metric's formula, atomic inputs, collection points, projected→actual lifecycle. |
| `docs/spec/fd-series-40-fund-prompts.md` | The 40-dispatch FD Series build pack for the Fund phase, including the Global Rules Block and Decisions F-1…F-7. |
| `docs/spec/fd-fund-fixtures-v1.md` | Locked FX-1…FX-8 fixtures — golden expected values for all Fund computations. Values may never be altered by an agent. |
| `docs/spec/hd-series-40-hold-prompts-v1.md` | The 40-dispatch HD Series build pack for the Hold phase, including the Global Rules Block and Decisions H-1…H-7. |
| `docs/spec/hd-hold-fixtures-v1.md` | Locked HX-1…HX-5 fixtures — golden expected values for all Hold computations. Values may never be altered by an agent. |
| `docs/spec/ex-series-40-exit-prompts-v1.md` | The 40-dispatch EX Series build pack for the Exit phase, including the Global Rules Block and the E-series Decisions register. |
| `docs/spec/ex-exit-fixtures-v1.md` | Locked EXX-1…EXX-5 fixtures — golden expected values for all Exit computations. Values may never be altered by an agent. |
| `docs/spec/paperworking-reil-master-spec-v1.md` | The governing product spec (phases, intake router, Retrospective Mode, accounts, marketplaces). *(Pending commit — founder-attached; do not proceed against it until committed.)* |
| `docs/spec/aq-series-30-acquisition-prompts.md` | The Acquisition build sequence (AQ-1…AQ-30). *(Pending commit — founder-attached.)* |
| DA Series v2 pack (canonical filename set at commit) | The Deal Analyzer build sequence. *(Pending commit — founder-attached.)* |
| `docs/spec/em-series-transactional-email-prompts.md` | The EM Series build pack — email catalog, ratified copy, gates E-1…E-12, dispatches EM-0…EM-26. Governing over any conflicting email, sender, or template content elsewhere in the repository. |

**In service, subordinate** — useful references; never override the governing set:

| Document | Role |
|---|---|
| `docs/spec/reil-schema.md` | Firestore `Project` document anatomy — enums, financials fields, Project sub-schemas, currency & percentage conventions. Subordinate to the questions doc and this skill; enum or phase content that conflicts is void. |

**Adjudication pending** — `reil-metrics.md`, `reil-copy.md`, `reil-dod.md`: non-governing until founder disposition (this section is replaced with final verdicts at the FD-2 unlock).

**Archive:** anything under `docs/archive/` is superseded and non-authoritative. Nothing there governs build work.

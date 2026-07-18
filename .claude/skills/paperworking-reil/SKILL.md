---
name: paperworking-reil
description: >
  PaperWorking Real Estate Investment Lifecycle (REIL) — canonical spec surface.
  Trigger on ANY task touching: Projects, project cards, phase stepper, phase pages,
  lifecycle pipeline, Kanban board, KPI metrics, metric cards, metric deep-dives,
  intelligence routes, financial calculators, deal analyzers, command center widgets,
  portfolio dashboards, UI copy on marketing or dashboard screens, pricing tiers,
  testimonials, credibility claims, landing page sections, CTA copy, badge labels,
  phase colors, project creation wizard, property data displays, report generation,
  or Firestore project/metric schemas.
---

# PaperWorking REIL — Canonical Specification Surface

> **What this skill does:** It injects the locked product spec, golden-file values,
> voice & tone rules, phase definitions, metric formulas, and runtime-evidence
> Definition of Done into every agent dispatch that touches PaperWorking Projects,
> phases, metrics, cards, or UI copy. No manual pasting required.

---

## 1  Quick-Reference Spec Map

Read these documents **before writing any code** in the affected areas.
All five live under `docs/spec/` and are the single source of truth.

| Spec Document | Governs |
|---------------|---------|
| [reil-metrics.md](docs/spec/reil-metrics.md) | All 10 hero + 11 supplemental KPIs — formulas, benchmarks, status zones, MetricResult contract, and golden-file seed values. |
| [reil-schema.md](docs/spec/reil-schema.md) | Firestore `Project` document anatomy — enums, financials fields, Project sub-schemas, currency & percentage conventions. |
| [reil-copy.md](docs/spec/reil-copy.md) | Voice & tone, banned-word index, phase copy, landing/pricing page canonical strings, credibility framing, CTA templates. |
| [reil-dod.md](docs/spec/reil-dod.md) | Runtime-evidence Definition of Done — the 12-point checklist every feature must pass before merge. |
| [fd-fund-fixtures-v1.md](docs/spec/fd-fund-fixtures-v1.md) | fixtures = locked FX values never alterable by an agent |
| [reil-complete-four-phase-questions-tasks.md](docs/spec/reil-complete-four-phase-questions-tasks.md) | questions doc = THE card-level authority, governing over any conflicting content in this directory |
| [fd-series-40-fund-prompts.md](docs/spec/fd-series-40-fund-prompts.md) | FD pack = the 40-dispatch build pack incl. Global Rules Block and Decisions F-1…F-7 |

---

## 2  When This Skill Fires

This skill auto-triggers whenever you are:

1. **Building or modifying** a Project page, phase page (`phase-1/` … `phase-4/`), or the Project Creation Wizard.
2. **Adding or editing** any metric card, deep-dive chart, KPI strip, or intelligence route.
3. **Touching the Command Center**, portfolio widgets, or report builder.
4. **Writing or reviewing** any public-facing copy (landing, pricing, about, how-it-works, CTAs, testimonials).
5. **Modifying** the `projectSchema.ts`, `reiMetrics.ts`, metric taxonomy, or deal-phase constants.
6. **Creating** new Kanban board columns, phase badges, or lifecycle visualizations.

---

## 3  Non-Negotiable Rules (inherited from AGENTS.md + spec docs)

### 3.1  Phase Model Lock

The REIL v2 phase model is **locked**:

| # | Key | Label | Marketing Sub-caption | Color |
|---|-----|-------|----------------------|-------|
| 1 | `acquisition` | Acquisition | Know the real numbers before you sign. | `#F59E0B` (Amber) |
| 2 | `fund` | Fund | Capital raise, financing, and closing room. | `#3B82F6` (Blue) |
| 3 | `hold` | Hold | Renovation budget, holding costs, and operations. | `#F97316` (Orange) |
| 4 | `exit` | Exit | Sale, settlement, and realized ROI. | `#10B981` (Green) |

**No agent may rename, reorder, add, or remove phases.**
Legacy labels (`Purchase`, `Fund`, `Hold`, `Exit` alone) are superseded; update them on sight.

### 3.2  Golden-File Seed Values (Locked)

Every metric test and demo must use these inputs unless the user explicitly overrides:

| Input | Value |
|-------|-------|
| Purchase Price | $279,000 |
| Down Payment | $55,800 (20%) |
| Total Cash Invested | $60,000 |
| Loan Amount | $223,200 |
| Interest Rate | 6.5% |
| Loan Term | 30 years |
| Monthly Gross Rent | $1,950 |
| Vacancy Rate | 7% |
| Property Management | 10% |
| Annual Property Taxes | $2,400 |
| Annual Insurance | $696 |
| Annual Utilities | $1,500 |

**Locked metric outputs:** NOI $12,486 · Cap Rate 4.5% · DSCR 0.74 · GRM 11.9 · CoC −7.41%

### 3.3  Voice & Tone (see `docs/spec/reil-copy.md`)

- Talk like a **seasoned RE operator**, not a SaaS marketer.
- **Banned words:** robust, streamline, leverage, seamlessly, cutting-edge, holistic, empower, navigate, institutional-grade.
- No unverified statistics. No fabricated testimonials.

### 3.4  Schema Conventions

- **Currency:** USD floats (dollars, NOT cents). Planned migration to cents is NOT executed.
- **Percentages:** Whole numbers (12.5 = 12.5%), except legacy `contingencyBufferPercentage` (decimal).
- **`currentPhase`:** NUMBER 1–4 or string enum. **40+ components depend on this. Do NOT change to string-only.**

### 3.5  Design System (see `DesignSystem.md` + `docs/design/system.md`)

- Font: Hanken Grotesk (sans) / Plus Jakarta Sans (display) / JetBrains Mono (tabular)
- Cards: frosted glass `rgba(255,255,255,0.02)`, 24px blur, 16px radius
- Theme: `data-theme` on `<html>` + `useTheme()` from `@/lib/utils/ThemeProvider`
- Status zones: healthy `#3f7d20` · watch `#F59E0B` · alert `#F06543`
12. Styling: Design reference is https://antigravity.google/pricing (clean, minimalist). All styling from the token layer defined in DesignSystem.md / globals.css — no ad-hoc colors, fonts, weights, or spacing values anywhere. New tokens require a DesignSystem.md entry before use.

---

## 4  File Map

| Purpose | Path |
|---------|------|
| Metrics Engine | `src/lib/metrics/reiMetrics.ts` |
| Metric Taxonomy | `src/lib/metrics/metricTaxonomy.ts` |
| Metric Types | `src/lib/metrics/types.ts` |
| Project Schema (Zod) | `src/lib/schemas/projectSchema.ts` |
| Schema Types | `src/types/schema.ts` |
| Deal Phases | `src/lib/constants/dealPhases.ts` |
| Phase Messages | `src/lib/constants/phaseMessages.ts` |
| Color Constants | `src/lib/constants/colors.ts` |
| REIL KanBan | `src/components/projects/REILKanBan.tsx` |
| KPI Dash Strip | `src/components/dashboard/command-center/KPIDashStrip.tsx` |
| Project Creation Wizard | `src/components/project/ProjectCreationWizard.tsx` |
| Phase Progress Tracker | `src/components/project/PhaseProgressTracker.tsx` |
| Project Layout | `src/app/dashboard/projects/[id]/layout.tsx` |
| Voice & Tone | `docs/copy/voice-and-tone.md` |
| Phase Reconciliation | `docs/copy/phase-reconciliation.md` |
| Landing Page v2 | `docs/copy/landing-page-v2.md` |
| Pricing Page v2 | `docs/copy/pricing-page-v2.md` |
| Copy Audit Inventory | `docs/copy/audit-inventory.md` |

---

## 5  Agent Instructions

When dispatched on any task covered by this skill:

1. **Read** the relevant spec document(s) from `docs/spec/` first.
2. **Verify** your implementation against the golden-file values and phase model.
3. **Check** all UI copy against the banned-word index and voice guidelines.
4. **Run** the 12-point Definition of Done checklist from `docs/spec/reil-dod.md`.
5. **Do NOT** introduce new marketing jargon, unverified statistics, or mock data that contradicts locked specifications.
6. **Do NOT** add, remove, or reorder navigation items (see Global Navigation Contract in `AGENTS.md`).
7. **Do NOT** change `currentPhase` from number to string-only representation.

# PF-0: Wireframe Ingestion, Component Mapping & Conflict Audit

> **Purpose.** Anchor the redesign in the repo and surface every conflict between the wireframe and the built app BEFORE any layout work.
>
> **Status:** NO CODE CHANGES — deliverable is this map + conflict register.

---

## 🔍 Verification & Skill Diagnostics

### 1. Wireframe Asset Verification

- **File Path:** [portfolio-wireframe-v1.png](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/spec/assets/portfolio-wireframe-v1.png)
- **Git Status:** Committed in repository at `docs/spec/assets/portfolio-wireframe-v1.png` (276,346 bytes)
- **Dimensions & Format:** PNG format, structural arrangement definition for Portfolio dashboard canvas

### 2. Skill Load Verification

- **`ui-ux-pro-max` Skill Status:** ✅ **VERIFIED LOADED**
- **Location:** [.gemini/skills/ui-ux-pro-max/SKILL.md](file:///Users/yvesdarbouze/Documents/PaperWorking/.gemini/skills/ui-ux-pro-max/SKILL.md) (12,992 bytes)
- **Contents:** 362-line design system & UX intelligence guide — 50+ styles, 97 color palettes, 57 font pairings, 99 UX guidelines across 9 tech stacks
- **Sub-assets:** `data/`, `scripts/` directories present
- **Frontmatter Confirms:** `name: ui-ux-pro-max`, `description: "Comprehensive design guide for web and mobile applications..."`

---

## 🗺️ Region-to-Component Mapping

### Source Files Inspected

| File | Lines | Size |
|------|-------|------|
| [Sidebar.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/layout/Sidebar.tsx) | 461 | 18.3 KB |
| [CommandCenter.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/CommandCenter.tsx) | 2,177 | 84.3 KB |

---

### Region Map (All 9 Wireframe Regions)

| # | Wireframe Region | Current Component | File Path | Disposition | Rationale / Citations |
|---|---|---|---|---|---|
| R1 | **Sidebar — PORTFOLIO group** (Portfolio, Projects, Data Room, Insights, Reports, Inbox, Team) | `PRIMARY_NAV` array (L29–37) | `Sidebar.tsx` | **KEEP-IN-PLACE** | Sidebar already renders the canonical navigation contract in exact order. No layout changes required. |
| R2 | **Sidebar — ACCOUNT group** (Profile, Billing, Settings) | `ACCOUNT_NAV` array (L39–43) | `Sidebar.tsx` | **KEEP-IN-PLACE** | Matches canonical navigation contract exactly. |
| R3 | **Profile Card** (portrait, avatar, identity, followers list) | `ProfileCard` function | `CommandCenter.tsx` | **MODIFY** (PF-2) | Card exists and renders identity block, followers list, and stats. PF-2 tunes to 9:16 portrait proportion and verifies real user/account data. Grid: `lg:col-span-3 lg:row-span-2`. |
| R4 | **Assigned Tasks** | `AssignedTasksChecklist` function (L1538–1616) | `CommandCenter.tsx` | **KEEP-IN-PLACE** | Inlined above the fold (`lg:col-span-3`, Row 1 Col 2) per UX-7. Renders real Firestore tasks with direct inline checkbox toggling. |
| R5 | **Recent Messages** | `RecentMessagesWidget` function | `CommandCenter.tsx` | **KEEP-IN-PLACE** | Inlined above the fold (`lg:col-span-3`, Row 1 Col 3) per UX-7. Shows recent inbox activity stream. |
| R6 | **Featured Metric** | `FeaturedMetricSlot` function (L1656–1724) | `CommandCenter.tsx` | **KEEP-IN-PLACE** | Inlined above the fold (`lg:col-span-3`, Row 1 Col 4) per UX-8. Interactive dual category/KPI dropdowns derived via `deriveAllProjectMetrics`. |
| R7 | **KPIs / Metrics module** (3-tab card with period selector) | `EarningsLossesCard` / `KPIMetricsModule` function | `CommandCenter.tsx` | **KEEP-IN-PLACE** | Implements 3 internal tabs (Financial, Operational, Marketing) with period selector. Grid: `lg:col-span-6`, Row 2. |
| R8 | **Deal Map** | `DealMapCard` function wrapping `DealMap` (dynamic import, `ssr: false`) | `CommandCenter.tsx` + `DealMap.tsx` | **KEEP-IN-PLACE** | Dynamically imported with `{ ssr: false }`. Grid: `lg:col-span-3`, Row 2 Col 4. |
| R9 | **Four Metric Slots** (Portfolio IRR, Equity Multiple, Total NOI, Monthly Cash Flow) | `KPICard` ×4 in bottom strip (L1994–2043) | `CommandCenter.tsx` | **KEEP-IN-PLACE** | Located in bottom container: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`. Interactive whole-card click-through to `/dashboard/insights`. |

---

### Components Present But NOT in Wireframe (Disposition Rationale)

| # | Component | File Path | Current State | Disposition | Rationale |
|---|---|---|---|---|---|
| X1 | `NeedsAttentionFeed` | `NeedsAttentionFeed.tsx` | Rendered at `lg:col-span-12` | **KEEP-IN-PLACE** | Conditional alert feed for projects requiring attention. Orthogonal to static wireframe. |
| X2 | `ActivePipeline` | `ActivePipeline.tsx` | Rendered at `lg:col-span-8` | **KEEP-IN-PLACE** | Critical funnel visualization adding deal pipeline value below mapped regions. |
| X3 | `TopPerformersWidget` | `TopPerformersWidget.tsx` | Rendered at `lg:col-span-4` | **KEEP-IN-PLACE** | Complements `ActivePipeline` in Zone 4. |
| X4 | `RecentActivityFeed` | `CommandCenter.tsx` | Rendered at `lg:col-span-12` | **KEEP-IN-PLACE** | Live Firestore activity feed at page bottom. |

---

## ⚡ Conflict Register & Owner Decisions

### Conflict C1: Wireframe Sidebar Hierarchy vs. Canonical Sidebar Contract

> [!IMPORTANT]
> **Conflict C1:** The wireframe sidebar lists `Projects`, `Insights`, `Reports`, `Inbox`, `Team`. The canonical navigation contract in [`Sidebar.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/layout/Sidebar.tsx#L29-L37) and [`AGENTS.md`](file:///Users/yvesdarbouze/Documents/PaperWorking/AGENTS.md) specifies:
> `Portfolio` → `Projects` → `Data Room` → `Insights` → `Reports` → `Inbox` → `Team`.
> `Portfolio` (item 1) and `Data Room` (item 3) do not appear in the wireframe.

- **Owner Decision (D1):** **RETAIN CANONICAL CONTRACT.** Keep all 7 items in `Sidebar.tsx` in exact order. The canonical contract supersedes wireframe omissions.

---

### Conflict C2: Top Nav "New Project" Control

> [!IMPORTANT]
> **Conflict C2:** The wireframe top header shows breadcrumbs and profile but omits a visible "New Project" button. The actual app renders a primary "New Project" header CTA button + contextual empty state CTA (standardized in UX-5, max 2 entry points).

- **Owner Decision (D2):** **RETAIN HEADER CTA.** Keep the high-visibility `New Project` header action button (UX-5 standardized, limited to 2 total entry points).

---

### Conflict C3: "Marketing" Tab Data Source Alignment

> [!IMPORTANT]
> **Conflict C3:** The `EarningsLossesCard` renders a "Marketing" tab. In `METRIC_TAXONOMY` and `docs/spec/reil-33-metrics-collection-matrix.md`, the corresponding category name is **`Marketing & Sales`**.

- **Reconciliation:** Map "Marketing" tab telemetry to `Marketing & Sales` matrix category (`followCount`, `viewCount`, listing status counts from deal listings).

---

### Conflict C4: UX-5 Handoff Relocation (AssetLifecycleCensus & Transactions)

> [!IMPORTANT]
> **Conflict C4:** The UX-5 handoff proposed relocating `AssetLifecycleCensus` (donut chart) and the Transactions ledger. Neither component has a dedicated layout slot in the wireframe.

- **Owner Decision (D4):** **RELOCATE TO INSIGHTS / REPORTS.** Relocate `AssetLifecycleCensus` to `/dashboard/insights` as a portfolio-wide distribution view; Transactions ledger is covered by `/dashboard/reports`.

---

## 📋 Owner Decisions Summary

| ID | Conflict / Topic | Recommended Disposition | Decision |
|---|---|---|---|
| **D1** | Sidebar hierarchy (`Portfolio` & `Data Room` missing in wireframe) | Retain canonical contract in `Sidebar.tsx` (7 items) | ✅ **APPROVED** |
| **D2** | Top header `New Project` control (omitted in wireframe) | Retain header primary action (UX-5 standardized) | ✅ **APPROVED** |
| **D3** | "Marketing" KPI tab category name | Map to `Marketing & Sales` taxonomy category | ✅ **RECONCILED** |
| **D4** | `AssetLifecycleCensus` & Transactions ledger destinations | Relocate to `/dashboard/insights` & `/dashboard/reports` | ✅ **APPROVED** |

---

*Generated: 2026-07-21 · Deliverable: Region Map & Conflict Register · Zero Code Changes Made*

# PF-0: Wireframe Ingestion, Component Mapping & Conflict Audit

> **Purpose.** Anchor the redesign in the repo and surface every conflict between the wireframe and the built app BEFORE any layout work.
>
> **Status:** NO CODE CHANGES — deliverable is this map + conflict register.

---

## 🔍 Verification & Skill Diagnostics

### 1. Wireframe Asset Verification

- **File:** [portfolio-wireframe-v1.png](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/spec/assets/portfolio-wireframe-v1.png)
- **Git status:** `A` (staged, ready to commit)
- **Source:** Copied from `PaperWorking Dashboard UX.png` at workspace root

### 2. Skill Load Verification

- **`ui-ux-pro-max` Skill Status:** ✅ **LOADED**
- **Location:** [.agents/skills/ui-ux-pro-max/SKILL.md](file:///Users/yvesdarbouze/Documents/PaperWorking/.agents/skills/ui-ux-pro-max/SKILL.md) (12,992 bytes)
- **Contents:** 362-line design intelligence guide — 50+ styles, 97 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 9 technology stacks
- **Sub-assets:** `data/`, `scripts/` directories present
- **Frontmatter confirms:** `name: ui-ux-pro-max`, `description: "Comprehensive design guide for web and mobile applications…"`

---

## 🗺️ Region-to-Component Mapping

### Source files

| File | Lines | Size |
|------|-------|------|
| [Sidebar.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/layout/Sidebar.tsx) | 456 | — |
| [CommandCenter.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/CommandCenter.tsx) | 1,689 | 68,678 B |

### Region Map

| # | Wireframe Region | Current Component | File | Disposition | Rationale / Citations |
|---|---|---|---|---|---|
| R1 | **Sidebar — PORTFOLIO group** (Projects, Insights, Reports, Inbox, Team) | `PRIMARY_NAV` array (L29–35) + `<SectionLabel label="Portfolio" />` (L271) | Sidebar.tsx | **KEEP-IN-PLACE** | Sidebar already renders these 5 items in exactly the order the wireframe specifies. No changes required. |
| R2 | **Sidebar — ACCOUNT group** (Profile, Billing, Settings) | `ACCOUNT_NAV` array (L38–40) + `<SectionLabel label="Account" />` (L299) | Sidebar.tsx | **KEEP-IN-PLACE** | Already matches wireframe exactly. |
| R3 | **Profile Card** (portrait, avatar, identity, followers, projects footer) | `ProfileCard` function (L683–831) | CommandCenter.tsx | **MODIFY** (PF-2) | Card exists and renders identity block, followers list, and active/past stats. PF-2 adjusts to 9:16 portrait proportion and verifies all data sourced from real user/account records. Grid position: `lg:col-span-3 lg:row-span-2`. |
| R4 | **Assigned Tasks** | `AssignedTasksChecklist` function (L1147–1287) | CommandCenter.tsx | **KEEP-IN-PLACE** | Already in correct grid position (`lg:col-span-3`, Row 1 Col 2). Renders real Firestore tasks. |
| R5 | **Recent Messages** | `RecentMessagesWidget` function (L1074–1143) | CommandCenter.tsx | **KEEP-IN-PLACE** | Already in correct grid position (`lg:col-span-3`, Row 1 Col 3). Shows last 3 inbox messages. |
| R6 | **Featured Metric** | `FeaturedMetricSlot` function (L1326–1361) | CommandCenter.tsx | **KEEP-IN-PLACE** | Already in correct grid position (`lg:col-span-3`, Row 1 Col 4). UX-8 placeholder (Yield Performance Index). |
| R7 | **KPIs / Metrics module** (3-tab card with period selector) | `EarningsLossesCard` function (L835–1016) | CommandCenter.tsx | **KEEP-IN-PLACE** | Already implements 3 internal tabs (Financial Performance, Operational Efficiency, Marketing) with period selector. Grid: `lg:col-span-6`, Row 2. |
| R8 | **Deal Map** | `DealMapCard` function (L1020–1070) wrapping `DealMap` (dynamic import L28, `ssr: false`) | CommandCenter.tsx + [DealMap.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/marketplace/DealMap.tsx) | **KEEP-IN-PLACE** | Already dynamically imported with `{ ssr: false }`. Grid: `lg:col-span-3`, Row 2 Col 4. |
| R9 | **Four Metric Slots** (Portfolio IRR, Equity Multiple, Total NOI, Monthly Cash Flow) | `KPICard` ×4 in bottom strip (L1627–1682) | CommandCenter.tsx | **KEEP-IN-PLACE** | Already in separate container below main grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`. Uses `var(--color-surface)` token. |

### Components Present But NOT in Wireframe (disposition required)

| # | Component | File | Current State | Disposition |
|---|---|---|---|---|
| X1 | `NeedsAttentionFeed` | [NeedsAttentionFeed.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/NeedsAttentionFeed.tsx) | Rendered at `lg:col-span-12` (L1566–1578) | **KEEP-IN-PLACE** — Alerts/attention feed is orthogonal to wireframe layout; renders conditionally when projects need attention. |
| X2 | `ActivePipeline` | [ActivePipeline.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/ActivePipeline.tsx) | Rendered at `lg:col-span-8` (L1583–1603) | **KEEP-IN-PLACE** — Pipeline funnel is critical portfolio feature not explicitly in wireframe but adds value below the mapped regions. |
| X3 | `TopPerformersWidget` | [TopPerformersWidget.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/TopPerformersWidget.tsx) | Rendered at `lg:col-span-4` (L1605–1608) | **KEEP-IN-PLACE** — Complements ActivePipeline in zone 4. |
| X4 | `RecentActivityFeed` | Inline in CommandCenter.tsx (L466–620) | Rendered at `lg:col-span-12` (L1613–1623) | **KEEP-IN-PLACE** — Live Firestore activity feed at bottom of page. |

### Orphaned Files (exist but NOT imported or rendered)

| File | Size | Notes |
|------|------|-------|
| [AssetLifecycleCensus.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/AssetLifecycleCensus.tsx) | 3,281 B | Donut chart — was in Assets tab, removed with UX-5. See **Conflict C4**. |
| [KPIDashStrip.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/KPIDashStrip.tsx) | 4,897 B | Superseded by inline `KPICard` ×4 strip. Safe to delete. |
| [PortfolioClustersGrid.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/PortfolioClustersGrid.tsx) | 4,047 B | Never used. Safe to delete. |
| [RecentProjects.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/RecentProjects.tsx) | 4,524 B | Superseded by ActivePipeline. UX-5 removed its "+ New Project" button. Safe to delete. |
| [EquityPerformanceChart.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/command-center/EquityPerformanceChart.tsx) | 5,221 B | Never used in CommandCenter. May belong in Insights. |

### Dead Imports in CommandCenter.tsx (imported but never rendered)

| Import | Line | Status |
|--------|------|--------|
| `InsightsTab` (dynamic) | L27 | Dead — page-level Insights tab removed in UX-5 |
| `TerminalAuditFeed` | L15 | Dead — imported but no JSX reference |
| `MarketHeatmap` | L16 | Dead — imported but no JSX reference |

---

## ⚡ Conflict Register & Owner Decisions

### Conflict C1: AGENTS.md "Portfolio" NavItem vs. Actual Sidebar

> [!IMPORTANT]
> The [AGENTS.md global navigation contract](file:///Users/yvesdarbouze/Documents/PaperWorking/AGENTS.md) specifies a clickable **"Portfolio"** nav item at route `/dashboard/command-center` with icon `space_dashboard`. In reality, `Sidebar.tsx` renders "Portfolio" as an **uppercase section label** (group header), and `/dashboard/command-center` is only reachable via the **brand logo** link. There is no `space_dashboard` icon in the sidebar.

- **Impact:** The wireframe matches the actual sidebar (section label, not clickable item). The AGENTS.md contract is the outlier.
- **Owner Decision Required (D1):** Update AGENTS.md to reflect reality (section label + logo link), or add a clickable "Portfolio" NavItem to the sidebar?

### Conflict C2: "Data Room" Route Exists Only in Mobile Nav

> [!WARNING]
> The route `/dashboard/data-room` exists in [TopAppBar.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/layout/TopAppBar.tsx) (L24, L55, L105) — the **mobile** navigation bar — but is **absent** from `Sidebar.tsx` (desktop) and absent from the AGENTS.md global navigation contract. The wireframe does not include Data Room.

- **Impact:** Data Room is reachable on mobile but NOT on desktop. This is an inconsistency.
- **Owner Decision Required (D2):**
  - **Option A:** Remove Data Room from `TopAppBar.tsx` to match sidebar + wireframe (consistent absence).
  - **Option B:** Add Data Room to `Sidebar.tsx` under a logical parent (e.g., under Projects or as a sub-route) to make it universally accessible.
  - **Option C:** Data Room is deprecated — remove from all navigation.

### Conflict C3: Missing "Create Project" Header Button in Wireframe

- **Context:** The CommandCenter header (L1446–1531) renders a "Create Project" CTA button linking to `/dashboard/projects/new`. The wireframe header shows breadcrumbs and user profile but no visible "Create Project" button.
- **Current state:** Two entry points exist: (1) header CTA, (2) `EmptyPortfolio` empty-state CTA. UX-5 already removed the third (`RecentProjects` button).
- **Owner Decision Required (D3):**
  - **Option A (Recommended):** Keep the header "Create Project" CTA — high-visibility onboarding flow, limited to 2 total entry points (UX-5 compliant).
  - **Option B:** Remove to match wireframe literally.

### Conflict C4: UX-5 Handoff — Transactions Ledger & AssetLifecycleCensus Disposition

> [!IMPORTANT]
> The [UX-5 handoff](file:///Users/yvesdarbouze/Documents/PaperWorking/.agents/handoff.md) (L23–28) proposed:
> - **Assets Donut Chart** (`AssetLifecycleCensus`): Embed into the Overview grid or bento layout.
> - **Transactions Ledger**: Relocate to `/dashboard/reports` or integrate below the pipeline.
>
> **Wireframe verdict:** Neither component has a layout slot in the wireframe. Both were removed when the tab bar was deleted (UX-5), and their files are now orphaned.

- **Current state:** `AssetLifecycleCensus.tsx` exists (3,281 B) but is not imported. No dedicated `TransactionLedger` component file exists (only a comment reference in `RehabTracker.tsx` L163).
- **Owner Decision Required (D4):**
  - **Option A (Recommended):** Relocate `AssetLifecycleCensus` to `/dashboard/insights` as a portfolio-wide asset distribution view. Accept that the Transactions ledger was never built as a standalone component — scope it as a future Insights or Reports feature.
  - **Option B:** Embed both into CommandCenter below the mapped wireframe regions (adds content not in wireframe).

### Conflict C5: Marketing Tab Data Source

- **Context:** The `EarningsLossesCard` has a "Marketing" tab (L835–1016). The project schema's 33-metric collection matrix does not carry a specific "Marketing" category.
- **Resolution (no owner decision needed):** Map to marketplace listing telemetry — `followCount`, `viewCount`, listing status counts from deal listings collection. This is already partially implemented in the Marketing tab's rendering logic.

---

## 📋 Owner Decisions Required — Summary

| ID | Topic | Options | Blocking |
|----|-------|---------|----------|
| **D1** | AGENTS.md "Portfolio" NavItem discrepancy | Update AGENTS.md (recommended) / Add clickable NavItem | PF-1 |
| **D2** | Data Room route (mobile-only, absent from wireframe) | Remove from mobile / Add to sidebar / Deprecate entirely | PF-1 |
| **D3** | "Create Project" header button absent from wireframe | Keep (recommended) / Remove | PF-2+ |
| **D4** | AssetLifecycleCensus + Transactions Ledger after UX-5 tab removal | Move to Insights (recommended) / Embed below wireframe regions | PF-2+ |

---

## 🧹 Cleanup Candidates (non-blocking, can proceed independently)

| Action | File | Rationale |
|--------|------|-----------|
| Delete dead import | `InsightsTab` (CommandCenter.tsx L27) | Imported dynamically, never rendered |
| Delete dead import | `TerminalAuditFeed` (CommandCenter.tsx L15) | Imported, never rendered |
| Delete dead import | `MarketHeatmap` (CommandCenter.tsx L16) | Imported, never rendered |
| Delete orphan file | `KPIDashStrip.tsx` | Superseded by inline KPICard strip |
| Delete orphan file | `PortfolioClustersGrid.tsx` | Never imported anywhere |
| Delete orphan file | `RecentProjects.tsx` | Superseded by ActivePipeline |
| Evaluate orphan | `EquityPerformanceChart.tsx` | May belong in Insights — owner to decide |

---

*Generated: 2026-07-16 · No code changes made · Deliverable: map + conflict register*

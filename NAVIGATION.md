# Global Navigation Contract — PaperWorking App

> **Status**: FINALIZED / BINDING
> **Authority File**: `src/components/layout/Sidebar.tsx`

This document defines the strict, non-negotiable contract for the persistent left-side navigation system in the PaperWorking SaaS application. No developer or AI agent is authorized to modify, redesign, reorder, rename, combine, add, or remove navigation items or groups.

---

## 1. Visual Hierarchy & Specifications

The persistent navigation is rendered top-to-bottom as a single left-side panel matching the **Luminous Glass** design system rules.

### 1.1 Brand Area (Top)
- **PaperWorking logo mark**: Rendered via `<Logo size="lg" />`.
- **PaperWorking wordmark**: Styled using the **Plus Jakarta Sans** typography tokens.

### 1.2 Primary Group
All items are case-sensitive and must be ordered exactly as follows:

| Order | Label | Route / Canonical Href | Icon | Casing |
|---|---|---|---|---|
| 1 | **Portfolio** | `/dashboard/command-center` | `folder_shared` | Title Case |
| 2 | **Projects** | `/dashboard/projects` | `assignment` | Title Case |
| 3 | **Data Room** | `/dashboard/data-room` | `inventory_2` | Title Case |
| 4 | **Inbox** | `/dashboard/inbox` | `inbox` | Title Case (with numeric unread badge) |
| 5 | **Team** | `/dashboard/team` | `group` | Title Case |
| 6 | **Reports** | `/dashboard/reports` | `assessment` | Title Case |
| 7 | **Deal Analyzer** | `/dashboard/deal-analyzer` | `analytics` | Title Case |

*Note: The `Inbox` menu item includes a numeric badge styled dynamically based on the unread notifications count from `NotificationContext`.*

### 1.3 Section Divider
- Labeled **Account** (exact text).
- Text styled as tracking uppercase (`uppercase tracking-widest text-[10px] font-bold text-on-surface-variant/40`).
- Provides a clean visual break between primary utility groups and account/settings groups.

### 1.4 Account Group
All items are case-sensitive and must be ordered exactly as follows:

| Order | Label | Route / Canonical Href | Icon | Casing |
|---|---|---|---|---|
| 1 | **Profile** | `/dashboard/settings/profile` | `account_circle` | Title Case |
| 2 | **Billing** | `/dashboard/settings/billing` | `payments` | Title Case |
| 3 | **Settings** | `/dashboard/settings` | `settings` | Title Case |

*Note: The **Settings** item is active only when on `/dashboard/settings` and NOT on its sub-routes `/dashboard/settings/profile` or `/dashboard/settings/billing`.*

### 1.5 Bottom Area
- **Workspace Switcher**:
  - Displays label: `acting as: Me` (for personal accounts) or `acting as: [Team Account Name]` (for team organizations).
  - Contains a dropdown selector allowing the user to switch between active tenant memberships.
- **Profile Menu**:
  - Displays user avatar (with initial).
  - Displays User Display Name and Role (e.g., Owner, Member).
  - Integrates the `<LogoutButton />` component for session termination.

---

## 2. Rules & Enforcement for AI Agents

1. **Re-use, Don't Recreate**: Do not write custom sidebar components for new pages. All dashboard screens MUST inherit or utilize the default Next.js layout (`src/app/dashboard/layout.tsx`) which embeds `Sidebar.tsx`.
2. **Active State Matching**:
   - Items in the primary/account groups are styled as active when `pathname.startsWith(item.href)` is true.
   - For Settings, it should be active only if starting with `/dashboard/settings` but not matching `/dashboard/settings/profile` or `/dashboard/settings/billing`.
3. **No Added Items**: Contextual page actions (e.g. "Create Project") must not be added to the sidebar navigation. They must reside in page headers or floating context action bars.
4. **No Reordering**: The visual balance of any layout must adapt to the navigation contract, never the other way around.

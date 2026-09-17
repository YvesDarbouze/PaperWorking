# PaperWorking Design System: Button Audit & Migration Map

> **Status:** Foundation & Audit (Read-Only Migration Map)  
> **Constitutional Rule:** Every future button in PaperWorking must derive from `components/ui/Button.tsx`.  
> **Single Primary Rule:** Maximum **ONE** primary button (`variant="primary"`) visible per view/section.

---

## 1. Visual Hierarchy & Functional Roles

| Variant | Purpose | Visual Spec | Constraints |
|---|---|---|---|
| **Primary** | The single most important action on a screen/section | Solid `--accent` (`#00DD94`), dark text (`#0a0a0f`), subtle shadow + hover green glow | **Max 1 per view/section** |
| **Secondary** | Supporting / alternative / utility actions | 1px `--border-subtle` outline, transparent background, `--text-primary` (`#fdfffc`) | Default variant for all standard actions |
| **Tertiary** | Low-priority actions, in-place text actions, contextual links | Ghost/text-only, `--text-secondary` (`#9E9DA0`) &rarr; `--text-primary` on hover | Use for inline edits, view toggles, breadcrumb actions |
| **Danger** | Destructive / irreversible actions | Solid or bordered `--danger` (`#EF4444`), white text | Requires confirmation flow (`confirmDanger`) |

### Functional Roles (Composed via Props)
- **`roleVariant="cta"`**: Conversion shortcut &mdash; enforces `variant="primary"` + `size="lg"`.
- **`roleVariant="icon"` / `isIconOnly`**: Square button (`32px`, `40px`, or `48px`). Requires `aria-label` when no text child is present.
- **`roleVariant="dropdown"` / `isDropdown`**: Appends disclosure chevron `expand_more`.
- **`roleVariant="toggle"` / `isPressed`**: Binary state button with `aria-pressed`.
- **`loading`**: Replaces label with spinner and locks width to prevent layout shifts (`aria-busy="true"`).

---

## 2. Comprehensive Inventory of Current Buttons

### A. Top Navigation Bar (`DashboardTopBar.tsx`)

| Element / Action | Current Implementation | Target Component Call | Classification | Notes |
|---|---|---|---|---|
| **Search Deals Trigger** | `<input>` wrapped in search bar with `<button aria-label="Open search">` | `<Button roleVariant="icon" variant="tertiary" size="sm" isIconOnly aria-label="Search" />` | **Tertiary (Icon)** | Embedded inside search input container |
| **Deals Pill** | `<Link href="/dashboard/deals" className="border border-white/10 px-3 py-2 text-xs font-semibold text-white/70">` | `<Button variant="secondary" size="sm">Deals</Button>` | **Secondary** | Utility navigation pill in top search bar |
| **Vendors Pill** | `<Link href="/dashboard/marketplace" className="border border-white/10 px-3 py-2 text-xs font-semibold text-white/70">` | `<Button variant="secondary" size="sm">Vendors</Button>` | **Secondary** | Utility navigation pill in top search bar |
| **Support Link** | `<Link href="/support" className="border border-white/10 px-3 py-2 text-sm text-white/75">` | `<Button variant="secondary" size="sm">Support</Button>` | **Secondary** | Support link in header utility group |
| **Account Menu** | `<button className="border border-white/10 bg-white/5 ...">` + chevron | `<Button variant="secondary" size="sm" roleVariant="dropdown">Account</Button>` | **Secondary (Dropdown)** | Account drawer disclosure button |

---

### B. Dashboard Command Center (`CommandCenterPanel.tsx`)

| Element / Action | Current Implementation | Target Component Call | Classification | Conflict / Competing Primary? |
|---|---|---|---|---|
| **Deal Calculator** | `<Link href="/dashboard/deals" className="border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[12px] font-semibold text-white/70">` | `<Button variant="secondary" size="sm" icon={<span className="material-symbols-outlined text-[15px]">query_stats</span>}>Deal Calculator</Button>` | **Secondary** | None. Correct supporting action. |
| **New Project (Header)** | `<Link href="/projects" className="border border-white/12 bg-[#454955]/90 px-3.5 py-2 text-[12px] font-semibold text-[#fdfffc]">` | `<Button variant="secondary" size="sm" icon={<span className="material-symbols-outlined text-[15px]">add</span>}>New Project</Button>` | **Secondary** | ⚠️ See Conflict Analysis below. |
| **Explore Deals** | `<Link href="/dashboard/deals" className="bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950">` | `<Button variant="primary" size="md">Explore Deals</Button>` | **Primary (Competing)** | 🚨 **DIRECT CONFLICT** with "Create new Project". |
| **Create new Project** | `<Link href="/projects/new" className="bg-[#00DD94] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0a0a0f]">` | `<Button variant="primary" size="md">Create new Project</Button>` | **Primary (Competing)** | 🚨 **DIRECT CONFLICT** with "Explore Deals". |
| **edit (Profile Card)** | `<Link href="/dashboard/settings/profile" className="text-[11px] font-semibold text-[#7A9EAA]">edit</Link>` | `<Button variant="tertiary" size="sm">edit</Button>` | **Tertiary** | Low-priority contextual inline link. |
| **Open inbox &rarr;** | `<Link href="/dashboard/inbox" className="text-[11px] font-semibold text-[#7A9EAA]">Open inbox &rarr;</Link>` | `<Button variant="tertiary" size="sm">Open inbox &rarr;</Button>` | **Tertiary** | Contextual section header link. |
| **Open insights &rarr;** | `<Link href="/dashboard/insights" className="text-[11px] font-semibold text-[#7A9EAA]">Open insights &rarr;</Link>` | `<Button variant="tertiary" size="sm">Open insights &rarr;</Button>` | **Tertiary** | Contextual section header link. |
| **+ New Project (Section)** | `<Link href="/projects/new" className="border border-white/10 bg-white/5 text-xs font-semibold">` | `<Button variant="secondary" size="sm">+ New Project</Button>` | **Secondary** | Card header action button. |

---

## 3. Competing Primaries Audit & Contextual Primary Resolution

### 🚨 Conflict Identified: Quick Launch Dual-CTA Row
In `CommandCenterPanel.tsx` (lines 203–275):
```
[ Deals Marketplace Card ]                 [ Create new Project Card ]
...                                         ...
[ Explore Deals ] (Solid Emerald Green)    [ Create new Project ] (Solid Accent Green)
```
- **The Issue:** Previously, both cards styled their action buttons with high-contrast solid green fills (`bg-emerald-500` #10B981 and `bg-[#00DD94]`). Both competed simultaneously in the same viewport section.
- **Constitutional Violation:** Violates *"Hard rule: max ONE primary button visible per view/section"*.

### Implemented Resolution: Contextual Primary Resolution
To satisfy the Single Primary Rule while serving different user personas natively, PaperWorking established the **Contextual Primary Resolution** pattern:

1. **Role-Aware Primary Promotion:**
   - **Investor Persona (`role === 'investor'`)**: The primary conversion action is exploring market inventory.
     - **"Explore Deals"** &rarr; `variant="primary"` (`#00DD94` solid fill, dark text).
     - **"Create New Project"** &rarr; `variant="secondary"` (outline, transparent fill).
   - **Operator / Admin / Team Persona (`role === 'operator' | 'admin' | 'team'`)**: The primary conversion action is launching a deal underwriting workspace.
     - **"Create New Project"** &rarr; `variant="primary"` (`#00DD94` solid fill, dark text).
     - **"Explore Deals"** &rarr; `variant="secondary"` (outline, transparent fill).
2. **Zero Layout Shift (CLS = 0) Loading State:**
   - While session/profile is loading or role is unresolved, **both buttons render as `variant="secondary"`** with identical `size="md"` (40px height, identical padding).
   - Once the role resolves, exactly one button is upgraded to `variant="primary"`. Because the dimensions and typography are strictly width-stable, this results in **zero layout shift (CLS = 0)**.
3. **Precedent Notice:**
   - This Quick Launch row is the **ONLY** place in PaperWorking where one-of-two actions is promoted by role. All other views must declare a single static primary button. Future screens requiring dual actions must cite this section as "contextual primary resolution".

---

## 4. Other App Areas Migration Roadmap

1. **Deals Marketplace (`apps/web/components/marketplace/`):**
   - "Broadcast Deal": Primary CTA on modal / header.
   - "Filter / Sort / Search": Secondary controls.
   - "Save Deal / Follow": Toggle buttons (`roleVariant="toggle"`, `isPressed`).
   - "View Deal Details": Secondary or Tertiary.
2. **Team Directory (`TeamDirectoryPanel.tsx`):**
   - "Invite Team User": Primary action for the Team section.
   - "Downgrade Tier": Danger secondary with `confirmDanger`.
   - "Remove / Change Role": Tertiary actions in table rows.
3. **Settings & Billing (`settings/`, `billing/`):**
   - "Save Changes" / "Upgrade Plan": Primary action.
   - "Cancel Subscription": `variant="danger"` with `confirmDanger={true}`.
   - "Cancel" / "Back": `variant="secondary"`.

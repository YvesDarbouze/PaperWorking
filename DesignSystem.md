# PaperWorking Design System

This document outlines the strict guidelines for UI component construction across the PaperWorking platform.

## 1. Centralized Theme Variables

We rely on a central custom theme configured in `tailwind.config.ts`.
**Arbitrary values (e.g. `text-[13px]`, `bg-[#123]`) are strictly banned.**

If you need a specific styling aspect that does not currently correspond to a mapped design token, you must update the global design system tokens instead of using an inline arbitrary value.

### Typography
- **Primary Font**: Hanken Grotesk
  - **Title (h1)**: Thin (100)
  - **Heading (h2, h3)**: Light (300)
  - **Sub-Heading (h4, h5, h6)**: ExtraLight (200)
  - **Body**: Regular (400)
- We use predefined scalable text variables. Instead of inline `text-[something]`, use `text-xs`, `text-sm`, `text-base`, `text-lg`.
- **Institutional Styling**: When standardizing, we rely heavily on uppercase tracking configurations. Example: `uppercase tracking-widest text-xs font-black`.

### Colors
We strictly rely on the "Antigravity" aesthetic (Black and White with a specific brand accent).

- `pw-black` : Foreground black. Replaces custom grays (e.g., `#111`, `#111111`, `#1a1a1a`, `#0a0a0a`).
- `pw-white` : Background white.
- `pw-bg` : Subtle off-white background used for contrast without heavy lines.
- `pw-border` : Subtle border logic.
- `pw-muted` : Distinct muted text logic.
- `pw-subtle` : Fainter text logic.
- `pw-accent` : Core brand interaction state color (Replaces indigo, emerald, distinct non-brand choices).

### Deal Lifecycle Phases (Authorized Scale)
Strict semantic colors for deal status states:
- `phase-sourcing` : #F2F2F2
- `phase-contract` : #CCCCCC
- `phase-rehab`    : #A5A5A5
- `phase-listed`   : #7F7F7F
- `phase-closed`   : #595959

## 2. Layout Aesthetics

- **Strict 1px Borders**: Replace shadows with strict solid lines (`border border-pw-black` or `border border-pw-border`).
- **Zero Border Radius**: Eliminating the 'startup' aesthetic. Eliminate `rounded-lg`, `rounded-xl`, `rounded-2xl`, etc. Everything must use absolute sharp edges (`rounded-none`).
- **Dense Spacing**: Rely on structured spacing (e.g. `px-6 py-4`) instead of arbitrary margins.

## 3. Ban on Direct Tailwind Arbitrary Brackets
Do NOT use `\[xx\]` arbitrary brackets anywhere in page-level components unless absolutely strictly required by dynamic runtime calculations. All text sizing, backgrounds, opacities, and spacing must map to the structured config or utility classes.

## 4. UI Library Governance

All atomic components (buttons, dialogs, inputs) must be managed centrally or pulled from a designated robust component library (e.g., Radix/shadcn).

_Note: This document must be read prior to creating or modifying any new modules in PaperWorking._

---

## 5. Contrast Engine (`src/lib/utils/contrast.ts`)

All text must automatically render in the highest-contrast opposite color of its background container.

### Usage — TypeScript

```ts
import { getContrastColor, useContrastColor } from '@/lib/utils/contrast';

// Pure function (server components, utils)
const textColor = getContrastColor('#7f7f7f'); // → '#ffffff'

// React hook (client components)
function Panel({ bg }: { bg: string }) {
  const color = useContrastColor(bg);
  return <div style={{ background: bg, color }}>{children}</div>;
}
```

### Usage — CSS classes (pre-computed for palette)

Apply to a **container** and children inherit the correct text color automatically:

| Class | Background | Text color |
|-------|-----------|------------|
| `.pw-surface-light` | `#f2f2f2` | `#0d0d0d` |
| `.pw-surface-dark`  | `#0d0d0d` | `#ffffff` |
| `.pw-surface-mid`   | `#7f7f7f` | `#ffffff` |
| `.pw-phase-sourcing` | `#f2f2f2` | `#0d0d0d` |
| `.pw-phase-contract` | `#cccccc` | `#0d0d0d` |
| `.pw-phase-rehab`    | `#a5a5a5` | `#0d0d0d` |
| `.pw-phase-listed`   | `#7f7f7f` | `#ffffff` |
| `.pw-phase-closed`   | `#595959` | `#ffffff` |

Use `.pw-text-on-light` / `.pw-text-on-dark` on individual text elements when you can't modify the container.

---

## 6. Interaction State System

### Composition pattern

Every interactive element **must** compose two classes:

```html
<!-- button -->
<button class="pw-interactive pw-btn pw-btn--primary">Label</button>

<!-- tab -->
<button class="pw-tab" aria-selected="true">Tab</button>

<!-- menu item -->
<button class="pw-menu-item pw-menu-item--active">Item</button>
```

### Button variants

| Class | Surface | Use case |
|-------|---------|----------|
| `.pw-btn--primary`   | Black bg / white text | Primary action, one per view |
| `.pw-btn--secondary` | Light gray / dark text | Secondary actions |
| `.pw-btn--ghost`     | Transparent / inherits | Toolbar actions, icon buttons |
| `.pw-btn--outline`   | Border only / dark text | Tertiary actions |
| `.pw-btn--danger`    | Red / white text | Destructive: delete, revoke |

All variants adapt automatically inside `.pw-surface-dark`, `.pw-phase-listed`, `.pw-phase-closed` containers.

### Size modifiers

| Class | Padding | Use case |
|-------|---------|----------|
| `.pw-btn--sm` | `6px 14px` | Dense toolbars, inline actions |
| _(default)_   | `12px 28px` | Standard |
| `.pw-btn--lg` | `16px 36px` | Hero CTAs |
| `.pw-btn--icon` | `10px` square | Icon-only |
| `.pw-btn--pill` | _+ border-radius: full_ | Landing page CTAs only |
| `.pw-btn--block` | _+ width: 100%_ | Full-width form submit |

### Required states — ALL interactive elements must have all four

| State | Mechanism |
|-------|-----------|
| Default | Base variant class |
| Hover | `:hover:not(:disabled)` — background shift, no opacity hacks |
| Focus/Active | `:focus-visible` — 2px `#1a73e8` ring, 3px offset; `:active` — `scale(0.97)` |
| Disabled | `disabled` attr, `aria-disabled="true"`, or `.disabled` class → `opacity: 0.38`, `cursor: not-allowed`, `pointer-events: none` |

### Tab system

```html
<div class="pw-tabs">                         <!-- underline style -->
  <button class="pw-tab pw-tab--active" aria-selected="true">Active</button>
  <button class="pw-tab">Inactive</button>
  <button class="pw-tab disabled">Disabled</button>
</div>

<div class="pw-tabs pw-tabs--pill">           <!-- pill/capsule style -->
  <button class="pw-tab pw-tab--active" aria-selected="true">Monthly</button>
  <button class="pw-tab">Annual</button>
</div>
```

### Menu item system

```html
<button class="pw-menu-item" aria-current="page">Dashboard</button>
<button class="pw-menu-item pw-menu-item--danger">Delete Project</button>
<span class="pw-menu-label">Settings</span>
<button class="pw-menu-item">Account</button>
```

### Input system

```html
<input class="pw-input" placeholder="Enter value" />
<input class="pw-input pw-input--error" />
```

### Backward compatibility

`.ag-button` and `.ag-button-secondary` remain functional. They now inherit focus and disabled states from the new system. **New components must use `.pw-btn` variants.**


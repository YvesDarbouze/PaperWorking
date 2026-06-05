# PaperWorking Design System

This document outlines the strict guidelines for UI component construction across the PaperWorking platform.

## 1. Centralized Theme Variables

We rely on a central custom theme configured in `tailwind.config.ts`.
**Arbitrary values (e.g. `text-[13px]`, `bg-[#123]`) are strictly banned.**

If you need a specific styling aspect that does not currently correspond to a mapped design token, you must update the global design system tokens instead of using an inline arbitrary value.

### Typography
- **Primary Font**: Inter (sans-serif)
  - Used for body text, labels, general interface elements, and inputs.
  - Weights: 100 to 900 (Regular: 400, Medium: 500, SemiBold: 600, Bold: 700).
- **Pairing Font**: Merriweather (serif)
  - Used for headers (h1, h2, h3, h4, h5, h6) and specific display elements.
  - Weights: 300, 400, 700, 900 (utilizing Regular/Medium/Bold/Black weights).
- We use predefined scalable text variables. Instead of inline `text-[something]`, use `text-xs`, `text-sm`, `text-base`, `text-lg`.
- **Institutional Styling**: When standardizing, we rely heavily on uppercase tracking configurations. Example: `uppercase tracking-widest text-xs font-bold`.

### Colors
We strictly rely on the new PaperWorking color scheme. **All text and interactive elements must ensure a minimum contrast ratio of 4.5:1 against their background.**

- **Primary Brand Color**: `#454955` (Used for primary buttons, active states, main branding).
- **Secondary Accent**: `#20B2AA` (Used for secondary elements, borders, highlights, subtle inputs).
- **Background (Dark Mode)**: `#0d0a0b`
- **Background (Light Mode)**: `#FDFFFC`
- **Text Colors**: `#FDFFFC` (on dark backgrounds) / `#0d0a0b` (on light backgrounds).
- **Semantic Market/Performance Status**:
  - `#3f7d20` Green: indicates "up" or positive performance.
  - `#F06543` Red: indicates "down", negative performance, or cancel/destructive functions.
- **Banned Hues**: Under no circumstances use any purple, violet, or magenta colors in variables, styles, or classes.

- `pw-black` : Foreground black (`#0d0a0b`). Replaces custom grays.
- `pw-white` : Background white (`#FDFFFC`).
- `pw-bg` : Base background color (`#FDFFFC` in light mode, `#0d0a0b` in dark mode).
- `pw-border` : Subtle border logic using secondary accent overlays.
- `pw-muted` : Distinct muted text logic.
- `pw-accent` : Core brand interaction state color (`#454955`).

### Deal Lifecycle Phases (REIL v2 Authorized Scale)
Strict semantic colors for deal status states matching the 4-phase color system:
- `phase-acquisition` : #F59E0B (Gold/Amber)
- `phase-transaction` : #3B82F6 (Blue)
- `phase-rehab`       : #F97316 (Orange)
- `phase-hold-exit`   : #3f7d20 (Performance Green)

## 2. Layout Aesthetics (Luminous Glass)

- **Glass Borders**: Use subtle glass borders (`border border-pw-border`) instead of heavy `border-pw-black`. For elevated containers, use frosted glass edges (`border-white/20`).
- **Radius Scale (Luminous Glass)**: Use the Stitch-extracted radius tokens:
  - `--radius-sm` (4px / `rounded-sm`): Small elements like checkboxes, badges
  - `--radius-DEFAULT` (8px / `rounded-lg`): Buttons, inputs, small cards
  - `--radius-md` (12px / `rounded-xl`): Medium containers, dropdowns
  - `--radius-lg` (16px / `rounded-2xl`): Dashboard cards, panels, modals
  - `--radius-xl` (24px / `rounded-3xl`): Hero sections, large feature cards
  - `--radius-full` (9999px): Pills, avatars, status badges
- **DO NOT use `rounded-none`** on cards, buttons, or containers. Sharp edges belong to the retired Obsidian Terminal system.
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
| `.pw-surface-light` | `#FDFFFC` | `#0d0a0b` |
| `.pw-surface-dark`  | `#0d0a0b` | `#FDFFFC` |
| `.pw-surface-mid`   | `#454955` | `#FDFFFC` |
| `.pw-phase-acquisition` | `#F59E0B` | `#0d0a0b` |
| `.pw-phase-transaction` | `#3B82F6` | `#FDFFFC` |
| `.pw-phase-rehab`       | `#F97316` | `#FDFFFC` |
| `.pw-phase-hold-exit`   | `#3f7d20` | `#FDFFFC` |

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

### Button variants (Luminous Glass Theme)

| Class | Light Theme | Dark Theme | Use case |
|-------|-------------|------------|----------|
| `.pw-btn--primary` / raw `button` | Primary Brand (`#454955`), `#FDFFFC` text | Primary Brand (`#454955`), `#FDFFFC` text | Primary action, one per view (or default raw button) |
| `.pw-btn--secondary` | Frosted glass background, `#0d0a0b` text | Frosted glass background, `#FDFFFC` text | Secondary actions |
| `.pw-btn--outline` | Transparent, `#20B2AA` border, `#0d0a0b` text | Transparent, `#20B2AA` border, `#FDFFFC` text | Tertiary actions |
| `.pw-btn--ghost` | Transparent, no border, inherits color | Transparent, no border, inherits color | Toolbar actions, icon buttons |
| `.pw-btn--danger` | Red (`#F06543`), `#0d0a0b` text | Red (`#F06543`), `#0d0a0b` text | Destructive: delete, revoke |

All buttons feature a subtle inner glow (`inset 0 1px 1px rgba(255, 255, 255, 0.15)`) to enhance the 3D glass effect, and adapt automatically inside `.dark` and container overrides.

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

All form inputs (`input[type="text"]`, `input[type="email"]`, `input[type="password"]`, `input[type="search"]`, `input[type="number"]`, `input[type="tel"]`, `input[type="url"]`, `input[type="date"]`), `textarea` elements, `select` elements, and elements with `.pw-input` are globally styled to conform to the Luminous Glass specifications:

- **Border Radius**: 8px (`var(--radius-DEFAULT)`) — overriding sharp edges for inputs specifically, as per the Stitch design specifications.
- **Glass Transparency**: Backdrop blur (`blur(20px)`) and semi-transparent background (`var(--pw-glass-bg)`).
- **Transitions**: Smooth transitions on `border-color`, `box-shadow`, and `background-color`.
- **States**:
  - *Hover*: Borders highlight to `var(--color-outline)`.
  - *Focus*: Focus rings highlight to secondary accent (`#20B2AA`) or brand primary (`#454955`) with a custom `box-shadow` glow: `0 0 8px var(--input-focus-glow-color)`.
  - *Disabled*: Reduced opacity to `0.38` with `pointer-events: none` and `cursor: not-allowed`.
  - *Error*: Border accentuates to error color (`var(--color-error)` or `#F06543`).

#### Base Selector Usage
```html
<!-- Input, Textarea or Select will automatically style correctly without any extra wrapper classes! -->
<input type="text" placeholder="Enter value" />
<textarea placeholder="Write message"></textarea>
```

#### Custom Input Wrapper System (e.g. for Prefix/Suffix inputs)
For compound inputs, wrap the layout elements using the `.pw-input-wrapper` container:
```html
<div class="pw-input-wrapper">
  <span class="prefix">$</span>
  <input class="bg-transparent outline-none" />
</div>
```

### Backward compatibility

`.ag-button` and `.ag-button-secondary` remain functional. They now inherit focus and disabled states from the new system. **New components must use `.pw-btn` variants.**

---

## 7. Branding & Naming Guidelines

### Authorized Brand Assets
- **Only Brand Name**: `PaperWorking` (CamelCase, single word, no spaces).
- **Banned Names**: Do NOT use any developer placeholder names.
- **Logo Description**: A stylized, minimalist desktop tray icon (inbox tray) with clean, stacked horizontal sheets of paper rising vertically above it, representing structure, organization, and a document-driven real estate workflow.
- **Brand Text Styling**: Always render the text `PaperWorking` using structural headings (e.g., `font-headline-md tracking-tighter`) instead of generic serif fonts or standard body text.

---

## 8. Drag-and-Drop File Upload Zones

All drag-and-drop uploader panels and file input zones are styled following the Luminous Glass specifications:

- **Outer Container**: Translucent frosted-glass card style with a dual-border layout.
  - Tailwind Classes: `relative overflow-hidden group min-h-[180px] flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all bg-surface-container/30 backdrop-blur-xl border-t border-l border-white/10 shadow-lg rounded-xl`
- **Inner Dashed Border Overlay**: An absolute-positioned overlay to represent the drop boundaries without blocking mouse event handling.
  - HTML/React Markup: `<div className="absolute inset-3 border-2 border-dashed rounded-lg transition-all duration-300 pointer-events-none" />`
  - Idle/Normal State: `border-outline-variant/40 group-hover:border-primary/40 group-hover:bg-primary/5`
  - Active/Drag-over State: `border-primary bg-primary/10` (or dynamic matching colors based on progress/state).
- **Icons & circular container wrapper**: Nested circular background container to give depth:
  - Tailwind Classes: `w-14 h-14 mb-3 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shadow-lg shadow-primary/10 group-hover:scale-110 transition-transform duration-300`
- **Interactive Buttons**: Action buttons use the `.pw-btn` system or `.luminous-button` pattern.
- **Preservation of Event Handlers**: All dropzone event handlers (`onDragOver`, `onDragLeave`, `onDrop`), file inputs, and backend uploads (Firestore/REST) must remain completely unchanged.

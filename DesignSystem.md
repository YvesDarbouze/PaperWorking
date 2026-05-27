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

### Button variants (Luminous Glass Theme)

| Class | Light Theme | Dark Theme | Use case |
|-------|-------------|------------|----------|
| `.pw-btn--primary` / raw `button` | Status Info Blue (`#163144`), white text | Status Info Blue (`#004395`), white text | Primary action, one per view (or default raw button) |
| `.pw-btn--secondary` | Frosted glass (`rgba(255,255,255,0.4)`), `#002a43` text | Frosted glass (`rgba(255,255,255,0.03)`), `#dae4ec` text | Secondary actions |
| `.pw-btn--outline` | Transparent, outline border, `#002a43` text | Transparent, outline border, `#dae4ec` text | Tertiary actions |
| `.pw-btn--ghost` | Transparent, no border, inherits color | Transparent, no border, inherits color | Toolbar actions, icon buttons |
| `.pw-btn--danger` | Red (`#ba1a1a`), white text | Red (`#ffb4ab`), dark red (`#690005`) text | Destructive: delete, revoke |

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
  - *Focus*: Focus rings highlight to `var(--color-brand-primary)` (teal `#2dd4bf` in dark, brand primary `#1b405b` in light) with a custom `box-shadow` glow: `0 0 8px var(--input-focus-glow-color)`.
  - *Disabled*: Reduced opacity to `0.38` with `pointer-events: none` and `cursor: not-allowed`.
  - *Error*: Border accentuates to error color (`var(--color-error)` or `#ba1a1a`).

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

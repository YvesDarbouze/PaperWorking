# PaperWorking Design System

This document outlines the strict guidelines for UI component construction across the PaperWorking platform.

## 1. Centralized Theme Variables

We rely on a central custom theme configured in `tailwind.config.ts`.
**Arbitrary values (e.g. `text-[13px]`, `bg-[#123]`) are strictly banned.**

If you need a specific styling aspect that does not currently correspond to a mapped design token, you must update the global design system tokens instead of using an inline arbitrary value.

### Typography
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

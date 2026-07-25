# PaperWorking — Design System
## Source of Truth: `src/app/globals.css` + design reference https://antigravity.google/pricing

> **Every UI decision must match what is defined here and in globals.css.** This document is derived directly from the design tokens and variables in `globals.css`. Where code and this doc conflict, **the code wins**.

### Changelog
* **2026-07-21**: Added UX-3 Button Spacing System (8-pt grid gaps, 40x40px minimum touch target floor, ButtonGroup primitive requirement).
* **2026-07-15**: Stitch palette retired, superseded by the Antigravity-reference design language.
* **2026-06-27**: Document initialized with custom property tokens.

---

## 1. Themes

PaperWorking is night-theme only. Never generate a light variant. The `<html>` tag carries `data-theme="dark"` and class `dark` permanently. All styles are optimized for a high-fidelity obsidian/dark canvas.

---

## 2. Color Palette

All values are CSS custom properties. **Never hard-code a hex color that isn't also defined as a token below.**

### 2.1 Brand / Accent

| Token | Night Value | Usage |
|-------|-------------|-------|
| `--color-primary` | `#3279F9` | Revalued brand blue accent, interactive highlights, primary CTAs |
| `--color-on-primary` | `#FFFFFF` | Text on primary-colored surfaces |
| `--color-primary-container` | `rgba(50,121,249,0.14)` | Tinted badge/chip backgrounds |
| `--color-on-primary-container` | `#3279F9` | Text inside primary containers |
| `--color-inverse-primary` | `#2269E9` | Accent on opposite-theme surfaces |
| `--pw-accent` (alias) | `#3279F9` | Use this alias in components for brand-accented highlights |

> **Rule**: There is no purple, violet, or magenta anywhere in PaperWorking. If you see purple: it's a bug.

### 2.2 Surfaces

| Token | Night Value | Usage / Description |
|-------|-------------|---------------------|
| `--color-background` | `#0d0a0b` | Base page canvas background |
| `--color-surface` | `#121317` | Standard surface container background |
| `--color-surface-dim` | `#0d0a0b` | Dimmed surface background |
| `--color-surface-container-lowest` | `#0d0a0b` | Lowest surface container background |
| `--color-surface-container-low` | `#15161a` | Low surface container background |
| `--color-surface-container` | `#18191D` | Default surface container background |
| `--color-surface-container-high` | `#1f2127` | Elevated surface container background |
| `--color-surface-container-highest` | `#282a32` | Highest surface container background |
| `--pw-bg` (alias) | `#0d0a0b` | Primary backdrop alias |
| `--pw-surface` (alias) | `#121317` | Standard container alias |
| `--pw-forest` (alias) | `#18191D` | Deep surface alias |

### 2.3 On-Surface Text

| Token | Night Value | Description |
|-------|-------------|-------------|
| `--color-on-surface` | `#FFFFFF` | Primary text color |
| `--color-on-surface-variant` | `#9E9DA0` | Secondary / muted text color |
| `--pw-black` (alias) | `#FFFFFF` | Primary text alias |
| `--pw-muted` (alias) | `#9E9DA0` | Muted text alias |

### 2.4 Outlines / Borders

| Token | Night Value | Description |
|-------|-------------|-------------|
| `--color-outline` | `#45474D` | General borders |
| `--color-outline-variant` | `rgba(230,234,240,0.12)` | Subtle borders |
| `--pw-border` (alias) | `rgba(230,234,240,0.12)` | Component borders |

### 2.5 Semantic Colors

| Token | Night Value | Usage |
|-------|-------------|-------|
| `--pw-success` | `#00DD94` | The single surviving green success token, live indicator, positive change |
| `--color-positive` | `#00DD94` | Maps directly to `--pw-success` |
| `--color-error` | `#F06543` | Market down, losses, errors, negative cash flow |
| `--color-tertiary` | `#C4A35A` | Warm amber — warnings, cautions |

### 2.6 Glass System Tokens

| Token | Night Value | Description |
|-------|-------------|-------------|
| `--color-glass-bg` | `rgba(18,19,29,0.65)` | Backdrop glass fill |
| `--color-glass-border` | `rgba(230,234,240,0.12)` | Subtle glass divider |
| `--color-glass-card-bg` | `linear-gradient(135deg, rgba(30,27,32,0.65), rgba(13,10,11,0.82))` | Card glass gradient |
| `--color-glass-card-border` | `rgba(253, 255, 252, 0.08)` | Card glass border |
| `--color-glass-card-shadow` | `0 8px 32px 0 rgba(0,0,0,0.35)` | Elevation shadow |
| `--color-glass-panel-bg` | `rgba(255,255,255,0.03)` | Dialog background |
| `--color-glass-panel-border` | `rgba(255,255,255,0.10)` | Frosted dialog outline |
| `--color-bento-bg` | `rgba(255,255,255,0.02)` | Grid cell backdrop |
### 2.7 Green Semantics Policy (UX-4 Rule)

> **Verbatim Policy:** Green is reserved for exactly three uses: (1) a passing/success state, (2) a positive-signal status chip (e.g., LIVE), (3) the single primary call-to-action on a surface, at most one per view. Green never appears on headings, tab labels, section titles, borders-as-decoration, or body text. The Hold phase color is a distinct token and is exempt — but it is only used for phase identification, never for emphasis.

---

## 3. Typography

**All text is Inter.** JetBrains Mono is for data/terminal values only.

```css
--font-sans: var(--font-inter), system-ui, sans-serif;
--font-mono: var(--font-jetbrains-mono), monospace;
```

**Inter OpenType features always active on body:**
```css
font-feature-settings: "ss01", "zero", "tnum", "liga", "calt";
letter-spacing: -0.011em;
```

### Type Scale

| Role | Tag / Class | Size | Weight | Line Height | Letter Spacing |
|------|-------------|------|--------|-------------|----------------|
| Display Hero | `.font-display-hero` | 72px | **450** (Medium/Regular-Plus) | 80px | −0.04em |
| Headline XL | `h1` | 56px | **450** (Medium/Regular-Plus) | 64px | −0.03em |
| Headline LG | `h2` | 36px | **700** | 44px | −0.025em |
| Headline LG Mobile | `h3` | 28px | **700** | 36px | −0.02em |
| Headline MD | `h4` | 24px | **700** | 32px | −0.015em |
| Title MD | `h4` variant | 20px | **600** | 28px | −0.01em |
| Body LG | `p` | 18px | 400 | 28px | — |
| Body MD | — | 16px | 400 | 24px | — |
| Body SM | — | 14px | **500** | 20px | — |
| Label / Nav | `label`, `.ag-label` | 14px | **700** | 18px | +0.02em |
| Caption / Badge | — | 12px | **600** | 16px | +0.06em |

**Label pattern:** Always uppercase + tracked. `letter-spacing: 0.02–0.06em`.
**Data values:** `font-family: var(--font-mono)` with `font-variant-numeric: tabular-nums`.

### Hero Headline Anatomy (from live site)
```html
<h1>
  Manage the Project.
  <span class="text-primary luminous-text">PaperWorking Automates the Profits</span>
</h1>
```
Pattern: dark/neutral opening line + primary-colored luminous second line.

---

## 4. Component Patterns

### 4.1 Glass Card (`.glass-card`)

```css
background: var(--color-glass-card-bg);
backdrop-filter: blur(24px);
border: 1px solid var(--color-glass-card-border);
box-shadow: var(--color-glass-card-shadow);
border-radius: var(--radius-lg); /* 16px in dashboard */
```

The `::before` pseudo-element adds an inner glow edge using `mask-composite: exclude`.

### 4.2 Glass Panel (`.glass-panel`)

Lighter variant for nav, floating cards, tooltips:
```css
background: var(--color-glass-panel-bg);
backdrop-filter: blur(20px);
border: 1px solid var(--color-glass-panel-border);
```

### 4.3 Glass Panel Elevated (`.glass-panel-elevated`)

Uses the card bg with `blur(32px)` — for modals and drawers.

### 4.4 Inputs (`.glass-input`)

```css
background: var(--pw-glass-bg);
border: 1px solid var(--pw-border);
border-radius: var(--radius-DEFAULT); /* 8px */
backdrop-filter: blur(20px);

/* Focus */
border-color: var(--color-primary);
box-shadow: 0 0 8px var(--input-focus-glow-color);
```

---

## 5. Button System

Three tiers + danger. All use CSS variables — **never hard-code button colors**.

### Primary (`.luminous-button`)

| Theme | Background | Text | Shadow |
|-------|-----------|------|--------|
| Night | `#3279F9` (blue) | `#FFFFFF` | `0 0 20px -5px rgba(69,73,85,0.4)` |
| Hover | shift bg + `translateY(-1px)` | — | stronger shadow |
| Active | `scale(0.97)` | — | — |

Shimmer sweep on hover (inside the button):
```html
<span class="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent
             -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
```

Border radius: `rounded-xl` (12px) for CTA; `rounded-full` for pill buttons (`.ag-button`).

### Secondary

```css
background: var(--pw-btn-secondary-bg);   /* glass bg */
color: var(--pw-btn-secondary-text);
border: 1px solid var(--pw-btn-secondary-border);
```

### Tertiary

```css
background: transparent;
color: var(--pw-btn-tertiary-text);
border: 1px solid rgba(50,121,249,0.15);
```

### Danger

```css
background: var(--color-error);  /* #F06543 */
color: #0d0a0b;
```

---

## 6. Layout Constants

| Token | Value |
|-------|-------|
| `--spacing-container-max` | `1280px` |
| `--spacing-container-padding` | `20px` |
| `--spacing-gutter-desktop` | `24px` |
| `--spacing-gutter-mobile` | `16px` |
| `--spacing-stack-lg` | `32px` |
| `--spacing-stack-md` | `16px` |
| `--spacing-stack-sm` | `8px` |
| Nav height | `72px` desktop · `64px` mobile |

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Micro — badges, dots |
| `--radius-default` | 8px | Inputs, small elements |
| `--radius-md` | 12px | Buttons |
| `--radius-lg` | 16px | Dashboard cards |
| `--radius-xl` | 24px | Large panels |
| `--radius-2xl` | 32px | Marketing feature cards |
| `--radius-3xl` | 40px | Hero carousel |
| `--radius-full` | 9999px | Pills, round buttons |

> **Context split**: Landing page uses `--radius-2xl` / `--radius-3xl`. Dashboard uses `--radius-lg`. Never mix.

---

## 7. Background Texture

```css
.mesh-bg {
  background-image:
    radial-gradient(at 0% 0%,    rgba(69,73,85,0.12) 0px, transparent 50%),
    radial-gradient(at 100% 0%,  rgba(69,73,85,0.06) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(13,10,11,0.10) 0px, transparent 50%),
    radial-gradient(at 0% 100%,  rgba(69,73,85,0.08) 0px, transparent 50%);
  background-attachment: fixed;
}
```

Noise texture overlay: `/noise.png` at `opacity: 0.03`.

---

## 8. Motion & Animation

Standard easing: `cubic-bezier(0.19, 1, 0.22, 1)` for reveals (fast out, ease in).
Hover transitions: `transition: all 0.3s ease` on buttons and cards.
Scale on press: `scale(0.97)`. Lift on hover: `translateY(-1px)` to `translateY(-2px)`.

```css
/* Page reveal */
.reveal-up { animation: revealUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
```

---

## 9. Navigation Header

```css
position: fixed; top: 0; z-index: 50;
height: 72px desktop / 64px mobile;
background: color-mix(in srgb, var(--color-background) 90%, transparent);
backdrop-filter: blur(16px);
border-bottom: 1px solid color-mix(in srgb, var(--color-on-background) 7%, transparent);
```

Nav link style: `font-size: 13.5px; font-weight: 500; opacity: 0.65;` No underlines.

Logo: `<span font-weight:700>Paper</span><span font-weight:100>Working</span>` — Inter, 1.0625rem, letter-spacing: 0.

---

## 10. Icon System

Material Symbols Outlined (Google variable font).

```html
<span class="material-symbols-outlined"
      style="font-variation-settings:'FILL' 1; font-size: 20px;">
  arrow_forward
 </span>
```

`FILL 0` = outlined. `FILL 1` = filled.
Sizes: 11px badges · 13–16px small UI · 18–22px standard · 24px+ hero/CTA.

---

## 11. Status / Badge Pattern

```css
background: var(--color-primary-container);
color: var(--color-primary);
border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
font-size: 10px; font-weight: 700; text-transform: uppercase;
letter-spacing: wider; border-radius: var(--radius-full);
```

---

## 12. Financial Display Rules

- Positive values: `color: var(--pw-success)` (`#00DD94`)
- Negative values: `color: var(--color-error)` (`#F06543`)
- All numbers: `font-family: var(--font-mono); font-variant-numeric: tabular-nums;`
- Missing inputs: show `"Awaiting Purchase Price"` — never `$0`
- Demo data: always show "Illustrative demo data" badge

```css
.health-band-fill  { background: var(--color-primary); box-shadow: 0 0 10px var(--color-primary); }
.health-band-positive { border-left: 4px solid var(--pw-success); }
.health-band-warning  { border-left: 4px solid var(--color-tertiary-container); }
```

---

## 13. Focus & Selection

```css
/* WCAG 2.1 §2.4.11 */
*:focus-visible {
  outline: 2px solid rgba(253,255,252,0.75);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
::selection { background: var(--color-primary-container); color: var(--color-on-primary-container); }
```

---

## 14. Dashboard vs. Marketing Context

| | `.marketing-context` | `.dashboard-context` |
|---|---------------------|---------------------|
| Card radius | `--radius-2xl` to `--radius-3xl` | `--radius-lg` (16px) |
| Feel | Soft, editorial, large | Sharp, FinTech, dense |
| Glass blur | `blur(24–32px)` | `blur(20px)` |

---

## 15. DO / DON'T

| DO | DON'T |
|----|-------|
| Use `var(--color-primary)` for accents/highlights | Hard-code `#3279F9` |
| Use `.glass-card` / `.glass-panel` for surfaces | Plain `background-color` on floated panels |
| Use `.luminous-button` for primary CTAs | Create bespoke button styles |
| Match `border-radius` to context | Use `rounded-2xl` in the dashboard |
| `var(--pw-success)` / `var(--color-error)` for financials | Hardcoded green/red |
| `font-mono` + `tabular-nums` for all financial figures | `font-sans` for data display |
| Uppercase + tracked labels for section heads | Mixed-case labels for data categories |
| PaperWorking is night-theme only. Never generate a light variant. | Generate or support a light variant |
| "Illustrative demo data" badge on all demo surfaces | Display demo numbers without disclosure |

---

## 16. Quick Reference — Token Cheat Sheet

```
PRIMARY ACCENT (BLUE)
  Night: #3279F9   → var(--color-primary)

BACKGROUND
  Night: #0d0a0b   → var(--color-background)

SURFACE
  Night: #121317   → var(--color-surface)

SURFACE CONTAINER
  Night: #18191D   → var(--color-surface-container)

TEXT PRIMARY
  Night: #FFFFFF   → var(--color-on-surface)

TEXT MUTED
  Night: #9E9DA0   → var(--color-on-surface-variant)

SUCCESS (GREEN)
  Night: #00DD94   → var(--pw-success)

NEGATIVE (RED)
  Night: #F06543   → var(--color-error)

BORDER
  Night: rgba(230,234,240,0.12)    → var(--pw-border)

GLASS BG
  Night: rgba(18,19,29,0.65)       → var(--color-glass-bg)
```

---

## 17. Green Semantics Policy

Green is reserved for exactly three uses: (1) a passing/success state, (2) a positive-signal status chip (e.g., LIVE), (3) the single primary call-to-action on a surface, at most one per view. Green never appears on headings, tab labels, section titles, borders-as-decoration, or body text. The Hold phase color is a distinct token and is exempt — but it is only used for phase identification, never for emphasis.

---

## 18. Spacing & Button Group Policy (UX-3)

Buttons across the dashboard must follow a structured spacing system on the 8-pt grid:
- **Related Buttons**: Minimum `8px` between related buttons in a group (mapped to `--spacing-btn-gap-related`).
- **Unrelated Buttons**: `16px` between unrelated button groups (mapped to `--spacing-btn-gap-unrelated`).
- **Content Spacing**: `24px` between a control group and adjacent content blocks (mapped to `--spacing-btn-gap-content`).

All interactive button clusters must use the `<ButtonGroup>` layout primitive in `src/components/ui/ButtonGroup.tsx` which automatically enforces these gaps:
```tsx
import { ButtonGroup } from '@/components/ui';

<ButtonGroup variant="related">
  <button>Save</button>
  <button>Cancel</button>
</ButtonGroup>
```

### Touch Targets
All buttons and icon buttons must have a minimum physical or virtual touch/click hit area of `40x40px` (applied via absolute positioning of the button's `::after` pseudo-element where appropriate, to avoid expanding visual dimensions).

---

## 19. Portfolio Navigation & Creation Policy (UX-5)

### Navigation Tabs
To prevent layout clutter and hierarchy confusion, secondary pill navigation tabs (e.g., Overview, Assets, Transactions, Insights) on main pages must be avoided. The default overview must render unconditionally, and other sections must be reachable via the primary left-side sidebar (e.g., Reports for Transactions and Insights for Yield Analytics).

### Project Creation Controls
To avoid visual redundancy, there must be **no more than 2** project creation controls on any single view:
1. **Primary**: One control in the page header action area.
2. **Contextual**: One control in the empty-state block (if zero projects exist).

Both controls must be labeled identically as **"Create Project"**. All other secondary/inline project creation buttons (such as in Recent Projects list headers) must be removed.

---

## 20. Appendices

For the complete four-phase questions, tasks, enumerations, gates, and phase rules, see [reil-complete-four-phase-questions-tasks.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/spec/reil-complete-four-phase-questions-tasks.md).


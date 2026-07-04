# PaperWorking — Design System
## Source of Truth: `src/app/globals.css` + live site https://paperworking.co

> **Every UI decision must match what ships at paperworking.co.** This document is derived directly from `globals.css` (verified 2026-06-27). Where code and this doc conflict, **the code wins** — but flag and reconcile.

---

## 1. Themes

The app defaults to **dark mode**. The `<html>` tag carries `data-theme="dark"` and class `dark`. A toggle switches to light. **Both themes must look correct** — never hard-code dark-only hex values.

Set theme via: `document.documentElement.setAttribute('data-theme', 'dark' | 'light')` + toggle `.dark` class.

---

## 2. Color Palette

All values are CSS custom properties. **Never hard-code a hex color that isn't also defined as a token below.**

### 2.1 Brand / Accent

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | `#00CE8E` | `#00DD94` | All accents, CTAs, interactive highlights |
| `--color-on-primary` | `#0d0a0b` | `#0d0a0b` | Text on primary-colored surfaces |
| `--color-primary-container` | `rgba(0,206,142,0.08)` | `rgba(0,221,148,0.14)` | Tinted badge/chip backgrounds |
| `--color-on-primary-container` | `#00CE8E` | `#00DD94` | Text inside primary containers |
| `--color-inverse-primary` | `#00DD94` | `#00CE8E` | Accent on opposite-theme surfaces |
| `--pw-accent` (alias) | `#00CE8E` | `#00DD94` | Use this alias in components |

> **Rule**: There is no purple, violet, or magenta anywhere in PaperWorking. If you see purple: it's a bug.

### 2.2 Surfaces

| Token | Light | Dark |
|-------|-------|------|
| `--color-background` | `#FFFFFF` | `#0d0a0b` |
| `--color-surface` | `#FFFFFF` | `#121317` |
| `--color-surface-dim` | `#F8F9FC` | `#0d0a0b` |
| `--color-surface-container-lowest` | `#FFFFFF` | `#0d0a0b` |
| `--color-surface-container-low` | `#F8F9FC` | `#15161a` |
| `--color-surface-container` | `#F8F9FC` | `#18191D` |
| `--color-surface-container-high` | `#F0F1F5` | `#1f2127` |
| `--color-surface-container-highest` | `#EFF2F7` | `#282a32` |
| `--pw-bg` (alias) | `#FFFFFF` | `#0d0a0b` |
| `--pw-surface` (alias) | `#FFFFFF` | `#121317` |
| `--pw-forest` (alias) | `#F8F9FC` | `#18191D` |

### 2.3 On-Surface Text

| Token | Light | Dark |
|-------|-------|------|
| `--color-on-surface` | `#121317` | `#FFFFFF` |
| `--color-on-surface-variant` | `#45474D` | `#9E9DA0` |
| `--pw-black` (alias) | `#121317` | `#FFFFFF` |
| `--pw-muted` (alias) | `#45474D` | `#9E9DA0` |

### 2.4 Outlines / Borders

| Token | Light | Dark |
|-------|-------|------|
| `--color-outline` | `#CDD4DC` | `#45474D` |
| `--color-outline-variant` | `rgba(33,34,38,0.12)` | `rgba(230,234,240,0.12)` |
| `--pw-border` (alias) | `rgba(33,34,38,0.12)` | `rgba(230,234,240,0.12)` |

### 2.5 Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-positive` | `#3f7d20` | `#3f7d20` | Market up, gains, positive cash flow |
| `--color-error` | `#C43D1A` | `#F06543` | Market down, losses, errors, negative cash flow |
| `--color-tertiary` | `#7A5500` | `#C4A35A` | Warm amber — warnings, cautions |

### 2.6 Glass System Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--color-glass-bg` | `rgba(255,255,255,0.75)` | `rgba(18,19,29,0.65)` |
| `--color-glass-border` | `rgba(33,34,38,0.12)` | `rgba(230,234,240,0.12)` |
| `--color-glass-card-bg` | `linear-gradient(135deg, rgba(255,255,255,0.85), rgba(240,241,245,0.90))` | `linear-gradient(135deg, rgba(30,27,32,0.65), rgba(13,10,11,0.82))` |
| `--color-glass-card-border` | `rgba(33,34,38,0.08)` | `rgba(253,255,252,0.08)` |
| `--color-glass-card-shadow` | `0 8px 32px 0 rgba(69,73,85,0.08)` | `0 8px 32px 0 rgba(0,0,0,0.35)` |
| `--color-glass-panel-bg` | `rgba(255,255,255,0.75)` | `rgba(255,255,255,0.03)` |
| `--color-glass-panel-border` | `rgba(33,34,38,0.12)` | `rgba(255,255,255,0.10)` |
| `--color-bento-bg` | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.02)` |
| `--color-bento-border` | `rgba(33,34,38,0.08)` | `rgba(255,255,255,0.08)` |
| `--pw-glass-bg` (alias) | → `--color-glass-bg` | → `--color-glass-bg` |

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
| Display Hero | `.font-display-hero` | 72px | **100** (Thin) | 80px | −0.04em |
| Headline XL | `h1` | 56px | **100** (Thin) | 64px | −0.03em |
| Headline LG | `h2` | 36px | **700** | 44px | −0.025em |
| Headline LG Mobile | `h3` | 28px | **700** | 36px | −0.02em |
| Headline MD | `h4` | 24px | **600** | 32px | −0.015em |
| Title MD | `h4` variant | 20px | **500** | 28px | −0.01em |
| Body LG | `p` | 18px | 400 | 28px | — |
| Body MD | — | 16px | 400 | 24px | — |
| Body SM | — | 14px | 400 | 20px | — |
| Label / Nav | `label`, `.ag-label` | 11–13px | **500–600** | 16px | +0.05–0.06em |

**Label pattern:** Always uppercase + tracked. `letter-spacing: 0.05–0.06em`.
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
border-color: var(--color-brand-primary);
box-shadow: 0 0 8px var(--input-focus-glow-color);
/* dark: rgba(0,221,148,0.4)  light: rgba(0,206,142,0.3) */
```

---

## 5. Button System

Three tiers + danger. All use CSS variables — **never hard-code button colors**.

### Primary (`.luminous-button`)

| Theme | Background | Text | Shadow |
|-------|-----------|------|--------|
| Light | `#0d0a0b` (black) | `#FFFFFF` | `0 0 20px -5px rgba(69,73,85,0.4)` |
| Dark | `#00DD94` (green) | `#0d0a0b` | same |
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
/* hover bg: rgba(0,221,148,0.08) */
```

### Tertiary

```css
background: transparent;
color: var(--pw-btn-tertiary-text);
border: 1px solid rgba(0,221,148,0.15);  /* dark */
         rgba(0,206,142,0.20);             /* light */
```

### Danger

```css
background: var(--color-error);  /* #C43D1A light / #F06543 dark */
color: #FFFFFF;   /* light */
color: #0d0a0b;   /* dark */
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

- Positive values: `color: var(--color-positive)` (`#3f7d20`)
- Negative values: `color: var(--color-error)` (`#C43D1A` light / `#F06543` dark)
- All numbers: `font-family: var(--font-mono); font-variant-numeric: tabular-nums;`
- Missing inputs: show `"Awaiting Purchase Price"` — never `$0`
- Demo data: always show "Illustrative demo data" badge

```css
.health-band-fill  { background: var(--color-primary); box-shadow: 0 0 10px var(--color-primary); }
.health-band-positive { border-left: 4px solid var(--color-primary); }
.health-band-warning  { border-left: 4px solid var(--color-tertiary-container); }
```

---

## 13. Focus & Selection

```css
/* WCAG 2.1 §2.4.11 */
*:focus-visible {
  outline: 2px solid rgba(253,255,252,0.75); /* dark */
  outline: 2px solid #454955;                 /* light */
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
::selection { background: #454955; color: #FDFFFC; }
```

---

## 14. Dashboard vs. Marketing Context

| | `.marketing-context` | `.dashboard-context` |
|--|---------------------|---------------------|
| Card radius | `--radius-2xl` to `--radius-3xl` | `--radius-lg` (16px) |
| Feel | Soft, editorial, large | Sharp, FinTech, dense |
| Glass blur | `blur(24–32px)` | `blur(20px)` |

---

## 15. DO / DON'T

| DO | DON'T |
|----|-------|
| Use `var(--color-primary)` for accents | Hard-code `#00DD94` or `#00CE8E` |
| Use `.glass-card` / `.glass-panel` for surfaces | Plain `background-color` on floated panels |
| Use `.luminous-button` for primary CTAs | Create bespoke button styles |
| Match `border-radius` to context | Use `rounded-2xl` in the dashboard |
| `var(--color-positive)` / `var(--color-error)` for financials | Hardcoded green/red |
| `font-mono` + `tabular-nums` for all financial figures | `font-sans` for data display |
| Uppercase + tracked labels for section heads | Mixed-case labels for data categories |
| Both light and dark themes correct | Design for dark only |
| "Illustrative demo data" badge on all demo surfaces | Display demo numbers without disclosure |

---

## 16. Quick Reference — Token Cheat Sheet

```
PRIMARY ACCENT
  Light: #00CE8E   Dark: #00DD94   → var(--color-primary)

BACKGROUND
  Light: #FFFFFF   Dark: #0d0a0b   → var(--color-background)

SURFACE
  Light: #FFFFFF   Dark: #121317   → var(--color-surface)

SURFACE MID
  Light: #F8F9FC   Dark: #18191D   → var(--color-surface-container)

TEXT PRIMARY
  Light: #121317   Dark: #FFFFFF   → var(--color-on-surface)

TEXT MUTED
  Light: #45474D   Dark: #9E9DA0   → var(--color-on-surface-variant)

POSITIVE
  Both:  #3f7d20                   → var(--color-positive)

NEGATIVE
  Light: #C43D1A   Dark: #F06543   → var(--color-error)

BORDER
  Light: rgba(33,34,38,0.12)
  Dark:  rgba(230,234,240,0.12)    → var(--pw-border)

GLASS BG
  Light: rgba(255,255,255,0.75)
  Dark:  rgba(18,19,29,0.65)       → var(--color-glass-bg)
```

# PaperWorking Canonical Design System Reference

This document serves as the single source of truth for the styling, component construction, and visual layout parameters across all public and authenticated surfaces of the PaperWorking platform.

## 1. Design Tokens

### 1.1 Color Palette
We enforce a strict pure-dark "Luminous Glass" visual identity. Light/day mode overrides or selectors are disabled.
- **Deep Background (Obsidian)**: `#060f15` (enforced via `.terminal-grid` body background)
- **Secondary Surfaces (Charcoal)**: `#0b141a` (base card background)
- **Borders & Outlines**: `rgba(255, 255, 255, 0.08)` (subtle divider borders)
- **Glass Panel Borders (Frosted)**: `rgba(255, 255, 255, 0.12)` (elevated dialogs/modals)
- **Interactive Focus Border**: `#2dd4bf` (teal glow, HSL primary container)

### 1.2 Deal Lifecycle Phases (REIL v2)
Every status indicator, progress track, and period-aware chart uses the locked four-phase semantic system:
- **Acquisition**: `#F59E0B` (Gold/Amber) — *Source, evaluate, and secure*
- **Transaction**: `#3B82F6` (Blue) — *Due diligence, underwriting, and entity closing*
- **Rehab**: `#F97316` (Orange) — *Construction management, draw tracking, and scope verification*
- **Hold/Exit**: `#10B981` (Green) — *Operating hold period optimization or final deal execution*

### 1.3 Typography Scale
The typography is built around **Hanken Grotesk** (`font-sans`) and **Plus Jakarta Sans** (`font-display`) for high-contrast presentation:
- **Display XL** (Hero headers): `56px` size, `64px` line-height, `-0.03em` tracking, ExtraBold
- **Headline LG** (Main page titles): `32px` size, `40px` line-height, `-0.01em` tracking, Bold
- **Headline MD** (Section headings): `24px` size, `32px` line-height, SemiBold
- **Body LG** (Intro text): `18px` size, `28px` line-height, Regular
- **Body MD** (Default content): `16px` size, `24px` line-height, Regular
- **Label MD** (Caps metadata): `14px` size, `16px` line-height, `0.02em` letter-spacing, SemiBold
- **Label SM** (Tabular data, numbers): `12px` size, `14px` line-height, `0.05em` letter-spacing (JetBrains Mono)

### 1.4 Spacing Grid
All padding, margin, and gap configurations align to an 8-pt grid system:
- `stack-sm`: `8px` (elements within components)
- `stack-md`: `16px` (spacing between paragraphs / small list rows)
- `stack-lg`: `32px` (gap between major content panels)
- `gutter-mobile`: `16px` (sides of viewport on viewport < 768px)
- `gutter-desktop`: `24px` (sides of viewport on viewport >= 768px)
- `container-max`: `1280px` (maximum layout bounds)

---

## 2. Shared Component Anatomies

### 2.1 Buttons (`.pw-btn`)
- **Anatomy**: Frosted background container with a 1px border, tabular-friendly padding, and 3D inner inset shadow (`inset 0 1px 1px rgba(255,255,255,0.15)`).
- **Interactive States**:
  - *Default*: `.pw-btn--secondary` is the default visual state.
  - *Hover*: `.pw-btn--secondary:hover` scales up and enhances backdrop opacity.
  - *Focus*: Focus visible adds a 2px teal focus ring with a 3px offset.
  - *Active*: Transition translates button down slightly (`scale(0.97)`).
  - *Disabled*: Reduced opacity to `38%` and pointer events disabled.

### 2.2 Inputs (`.pw-input`)
- **Anatomy**: Frosted glass background container (`rgba(255,255,255,0.03)`) with 8px radius (`rounded-lg`), subtle outline, and backdrop filter blur.
- **Affordances**: Prefixes (`$`) and suffixes (`%`) are enclosed inside a flex row wrapper `.pw-input-wrapper` with inset borders.

### 2.3 Cards (`.bento-card` / `.ag-card`)
- **Anatomy**: Backed by `rgba(255,255,255,0.02)` frosted glass, 24px blur, and 16px corner radius (`rounded-2xl`). High contrast hover border (`border-primary/30`) triggers on cursor interaction.

### 2.4 Modals & Dialogs
- **Anatomy**: Backed by elevated frosted glass panels (`.glass-panel-elevated`), 24px corner radius (`rounded-3xl`), and 60% black overlay backdrop filter (`backdrop-blur-md`). Focus is locked in the modal container.

### 2.5 Tables
- **Anatomy**: Dense, clean grids using light gray borders (`border-white/5`), sticky table header rows, and tabular figures for numerical comparison. Column data aligns right for numbers, left for text.

### 2.6 Charts
- **Anatomy**: Structured, compact bar/line/waterfall diagrams with zero gradients or decorative illustrations. Every grid line is low-opacity. Phase colors are mapped directly to data items.

### 2.7 State-Pills
- **Anatomy**: High contrast compact capsules (`rounded-full`) displaying current state (e.g., status, role, phase) with low-opacity container backgrounds and matching solid text.

### 2.8 Navigation
- **Anatomy**: Persistent left sidebar layout. Navigation includes top brand area, primary group links (Portfolio, Projects, Data Room, Inbox, Team, Reports, Deal Analyzer), account group sections (Profile, Billing, Settings), and profile menu bottom bounds.

---

## 3. Web Accessibility (WCAG 2.1 AA)

All page markup and component interactions must strictly enforce the following properties:
1. **Color Contrast**: Normal body text must meet or exceed a contrast ratio of `4.5:1` against the deep black background. Inactive indicators or descriptive texts use `#859490` (contrast ratio `4.9:1`).
2. **Keyboard Navigation**: Interactive tables, project select tabs, and forms must be reachable via `Tab` ordering with visible focus rings.
3. **Screen Readers**: Form inputs must have explicitly associated labels (not just placeholders), and decorative graphics must be marked with `aria-hidden="true"`.

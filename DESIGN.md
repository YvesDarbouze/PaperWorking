# PaperWorking Design System & Style Guide

> **MANDATORY DESIGN SYSTEM SPECIFICATION**  
> Single Source of Truth: **[https://ui.shadcn.com/create?preset=buFzlTs](https://ui.shadcn.com/create?preset=buFzlTs)**  
> Preset Code: `buFzlTs`

All user interface development, components, styling, tokens, and animations across PaperWorking must strictly adhere to the default styling of shadcn preset `buFzlTs`. Custom design interpretations, one-off component variants, and ad-hoc styling are strictly forbidden.

---

## 1. Preset Parameters & Tokens

The preset `buFzlTs` is decoded using shadcn's official bit-packing configuration:

| Dimension | Specification | Implementation / Token Value |
|---|---|---|
| **Base Component Primitives** | `radix` | Radix UI primitives (`radix-ui`) |
| **Style** | `lyra` (`radix-lyra`) | Architectural, high-density, crisp precision geometry |
| **Base Color** | `neutral` | Pure OKLCH neutrals (`oklch(1 0 0)` to `oklch(0.145 0 0)`) |
| **Theme** | `neutral` | Neutral dark & light themes; no colored or neon backgrounds |
| **Chart Color** | `neutral` | Monochromatic neutral chart sequence |
| **Icon Library** | `phosphor` | Phosphor Icons (`@phosphor-icons/react`) |
| **Font Body** | `inter` | `--font-sans: 'Inter', system-ui, sans-serif` |
| **Font Heading** | `inherit` | Inter typography across headings and body |
| **Radius** | `default` | Base `0.625rem` (`10px`), crisp `rounded-none` controls in Lyra |
| **Menu Accent** | `subtle` | Subtle neutral hover and selection states |
| **Menu Color** | `default` | Neutral background matching app surface |

---

## 2. Color System & CSS Variables

PaperWorking uses OKLCH neutral tokens defined by shadcn `buFzlTs`.

### Light Mode (`:root`)
```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-heading: var(--font-sans);
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

### Dark Mode (`.dark`)
```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

---

## 3. Strict Anti-Slop Directives

Per project requirements and antislop rules:

1. **No Artificial Neon Glows**:
   - The legacy neon emerald (`#00DD94`) and glowing button borders (`box-shadow: 0 0 16px ...`) are forbidden.
   - All interactive controls use crisp, understated focus rings: `focus-visible:ring-1 focus-visible:ring-ring/50`.

2. **No Pill-Everything (Lyra Crisp Geometry)**:
   - Buttons and badges use Lyra's crisp precision radius (`rounded-none` or subtle default `rounded-md`), never `rounded-full` or pill capsules (`pw-pill-cta`).

3. **No Background Grids or Trend-Stacking**:
   - Backgrounds are clean and solid neutral with optional clean border separators (`border-border`).
   - Blueprint lines, dot grids, radial colored orbs, and glassmorphic blur stacked on every surface are strictly rejected.

4. **Typography & Readability**:
   - Clean Inter sans typography.
   - Text sizes follow high-density institutional guidelines (`text-xs` for controls, `text-sm` for cards, `text-base` for body).
   - Headings are tight, dignified, and legible without artificial wide tracking (`tracking-[0.2em]`).

5. **Icon Standard**:
   - Phosphor Icons (`@phosphor-icons/react`) are the sole icon system.
   - Lucide or ad-hoc custom SVG icons must be mapped to their Phosphor equivalents.

---

## 4. Component Standards (`apps/web/components/ui/`)

All UI elements must use the official shadcn Radix-Lyra components:
- `Button`: Official `buttonVariants` (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`), sizes (`default`, `xs`, `sm`, `lg`, `icon`), with `data-slot="button"`.
- `Card`: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` with `data-slot="card"`, `ring-1 ring-foreground/10`.
- `Badge`: Crisp, rectangular status indicators (`h-5`, `text-xs`).
- `Input`: Precision form inputs (`h-11 min-h-[44px] md:h-8 md:min-h-0 text-base md:text-xs`, `border-input`, `bg-transparent`).
- `Table`, `Tabs`, `Dialog`, `Separator`, `Sheet`: Built with Radix primitives.

No one-off bespoke design components are permitted.

---

## 5. The Responsive & Mobile Design Gospel (Core Best Practices)

All pages, layouts, modals, sheets, and interactive elements across PaperWorking must strictly follow these six responsive laws:

### 1. The Container Rule
- Always use fluid CSS percentages (`w-full` / `width: 100%`) for outer wrappers combined with `max-width` properties rather than fixed pixel widths to eliminate horizontal scrolling on small screens.
- Never use fixed pixel widths (e.g. `w-[420px]`, `w-[500px]`, `w-[800px]`) on outer containers or cards that could exceed viewport widths on mobile.
- Use `min-w-0` on flex and grid children to permit truncation and prevent blowout.

### 2. Media Queries (Mobile-First Approach)
- Build using a mobile-first approach: declare base CSS classes for mobile screens first, then apply `min-width` media queries (`sm:`, `md:`, `lg:`, `xl:`) to add layout complexity (e.g., transitioning from single-column stack to multi-column grids) as the viewport expands.
- Avoid desktop-first overrides (`max-sm:`, `max-md:`) unless handling browser-specific touch overrides.

### 3. Typography & Touch Targets
- **Body Copy**: Set readable body copy around 16px–18px (`text-base` to `text-lg` / `leading-relaxed`) for marketing prose and descriptions.
- **Touch Targets**: All interactive elements, buttons, menu triggers, and links on touch screens must maintain a minimum touch hitbox of 44×44px (`min-h-[44px]`, `min-w-[44px]`, or `.touch-target`).
- **iOS Safari Auto-Zoom Prevention**: All form input fields, selects, and textareas must be at least 16px font size (`text-base` / `16px`) on mobile viewports (< 768px). Any input rendered smaller than 16px on iOS triggers automatic viewport zoom, destroying user layout framing.

### 4. Desktop / Laptop Standard (1200px to 1920px)
- **Screen Width Range**: 1200px to 1920px (standard frames: 1366px, 1440px; Full HD: 1920×1080).
- **Container Max-Width**: Keep core text, landing page sections, and application dashboards inside a centered container bounded between 1140px and 1200px (`max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8`) to prevent text lines from stretching uncomfortably wide on ultra-wide screens.

### 5. Tablet Standard (Portrait & Landscape: 768px to 1024px)
- **Screen Width Range**: 768px to 1024px (Common targets: 768×1024 portrait, 1024px landscape / small laptops).
- **Layout**: Single-column or transitioning 2-column grids with calibrated gutter spacing and touch-friendly padding.

### 6. Mobile Phone Standard (360px to 480px)
- **Screen Width Range**: 360px to 480px (Common targets: 360×800, 390×844, 414×896, 430×932).
- **Layout**: Clean single-column stacked layout, collapsible drawer/bottom navigation menus, full-width touch CTAs (`w-full min-h-[44px]`), and safe-area inset preservation (`env(safe-area-inset-bottom)`).


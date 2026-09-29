# PaperWorking Agent Directives

## Design System & Style Guide Directive
All UI generation, modification, and styling across the entire PaperWorking application MUST strictly follow the design system defined in `DESIGN.md`:
**https://ui.shadcn.com/create?preset=buFzlTs** (Radix Lyra style, Neutral base/theme, Phosphor icons, Inter font, crisp precision radius).
Do NOT use custom design interpretations or one-off components. Adhere to default shadcn Radix-Lyra styling and animations implicitly.

## Responsive & Mobile Design Gospel (Inviolable Law)
All engineers and agents must enforce the 6 responsive laws:
1. **Container Rule**: Fluid CSS percentages (`w-full` / `width: 100%`) for outer wrappers combined with `max-width` properties (`max-w-[1200px]`, `max-w-[1140px]`). No fixed pixel widths on outer containers or cards causing horizontal scrolling.
2. **Media Queries (Mobile-First)**: Always build mobile-first with `min-width` queries (`sm:`, `md:`, `lg:`, `xl:`).
3. **Typography & Touch Targets**: Body copy 16px–18px (`text-base` to `text-lg`). Touch targets minimum 44×44px (`min-h-[44px]`, `touch-target`). Form inputs, selects, and textareas must be at least 16px on mobile viewports (< 768px) to extinguish iOS Safari auto-zooming.
4. **Desktop / Laptop Standard**: 1200px–1920px (1366px, 1440px, 1920×1080 FHD). Core content bounded in a 1140px–1200px centered container (`max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8`).
5. **Tablet Standard**: 768px–1024px. Single-column or transitioning 2-column grids with adjusted padding.
6. **Mobile Phone Standard**: 360px–480px. Single-column stacked layouts, touch-reach CTAs, bottom nav/drawers, and safe-area insets.

<!-- antislop:start -->
<!-- Do not edit this block. Managed by antislop. -->
This project uses antislop to stop generic AI output in UI, copy, and code comments.
Read `.agents/plugins/antislop/skills/antislop/SKILL.md` before generating UI or copy.
<!-- antislop:end -->



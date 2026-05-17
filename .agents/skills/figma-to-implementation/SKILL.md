---
name: figma-to-implementation
description: Translate Figma designs into production-ready code with accurate token mapping, responsive behavior, and component architecture. Use when given a Figma URL, screenshot, or design spec to implement. Handles design-to-code handoff, token extraction from design, and component structure decisions.
---

# Figma to Implementation

Translate Figma designs into production-ready, maintainable code. Work from Figma URLs (via MCP), screenshots, or design descriptions.

## Step 1: Read the Design

**If a Figma URL is provided and Figma MCP is available:**
- Use `get_design_context` with the nodeId and fileKey from the URL
- Review the screenshot, Code Connect mappings, and design annotations
- Check for design tokens as CSS variables

**If a screenshot or description is provided:**
- Identify: layout structure, spacing rhythm, typography, color palette, interactive states
- Note any annotations or measurements
- Identify component boundaries (what should be a reusable component vs. one-off layout)

## Step 2: Map Design to Code

Before writing code, declare your mapping decisions:

```
## Design Mapping
- Layout: CSS Grid (2-col) + Flexbox for internal alignment
- Spacing rhythm: 8px base unit — 16, 24, 32, 48px observed
- Typography: Display = "Fraunces" (h1–h2), Body = "Inter" (p, labels)
- Color tokens extracted: --color-primary: #1a1a2e; --color-accent: #e94560
- Components identified: Card (reusable), HeroSection (layout-specific), CTAButton (variant: primary/ghost)
- Responsive: 3-col grid → 1-col at <768px
```

## Step 3: Component Architecture Decisions

Apply these rules:

**Create a separate component when:**
- Same pattern appears 2+ times
- Has internal state (hover, open/closed, loading)
- Has variants (primary/secondary, sizes, states)

**Keep inline when:**
- Used exactly once
- No variants or state
- Tightly coupled to parent layout

**TypeScript interface for every component:**
```tsx
interface CardProps {
  title: string
  description: string
  href: string
  variant?: 'default' | 'featured'
  className?: string
}
```

## Step 4: Implementation Rules

**Spacing:** Use the detected spacing rhythm. If Tailwind: use scale values (`p-4`, `gap-6`). If CSS: use token variables.

**Typography:** Match exact weights and sizes. If font is not installed, note it: `/* Fraunces: add to _document.tsx via next/font */`

**Colors:** Extract all unique values into CSS custom properties at the top. Never use raw hex in component code.

**Responsive:** Implement mobile-first. State the breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px).

**Interactive states:** Every button/link needs `:hover`, `:focus-visible`, `:active`. Never ship without these.

**Pixel precision:** Match measurements within ±4px. Note intentional deviations: `/* 20px in Figma; using 24px to match 8px grid */`

## Step 5: Output Structure

```
/components
  /<ComponentName>/
    index.tsx        — component implementation
    <ComponentName>.types.ts  — props interface (if complex)

/styles
  tokens.css         — CSS custom properties (if using CSS modules)
```

For page-level implementation, output a single file with inline component definitions.

## Handoff Notes

Always append:
```
## Handoff Notes
- [ ] Fonts: [list fonts needed + how to install]
- [ ] Images: [list image placeholders to replace]
- [ ] Icons: [icon library assumed]
- [ ] Breakpoints verified: 390px, 768px, 1280px
- [ ] Missing: [anything that wasn't in the design but needs implementation decision]
```

## When Figma MCP Is Not Available

State explicitly: "Figma MCP not available — implementing from screenshot/description. Measurements are approximated to nearest 8px grid value. Verify against source design before shipping."

---
name: accessibility-quick-audit
description: Fast WCAG 2.2 accessibility checklist for new components or pages. Use when asked for a quick a11y check, accessibility review, or before shipping a component. Returns pass/fail/fix per criterion in under 2 minutes of review time. Not a comprehensive audit — for that, use the accessibility skill.
---

# Accessibility Quick Audit

A rapid, checklist-based accessibility review for components and pages. Works on code, screenshots, or descriptions.

## The 12-Point Quick Audit

Run each check. Mark PASS / FAIL / N/A. For every FAIL, give one concrete fix.

---

**1. Color Contrast — Text**
- Body text vs background: ≥ 4.5:1 (WCAG AA)
- Large text (18px+/bold 14px+): ≥ 3:1
- Tool: `color-contrast(#foreground, #background)` or use WebAIM Contrast Checker
- Common fail: gray body text on white (`#9ca3af` on `#ffffff` = 2.5:1 — FAIL)
- Fix: darken text to `#6b7280` minimum, or `#4b5563` for guaranteed pass

**2. Color Contrast — UI Elements**
- Buttons, input borders, focus rings, icons: ≥ 3:1 against adjacent color
- Focus ring visibility: must be distinguishable from background
- Fix: Use `outline: 2px solid #2563eb; outline-offset: 2px` for focus

**3. Keyboard Navigation**
- All interactive elements reachable via Tab
- Tab order matches visual reading order
- No keyboard traps (modal closes with Escape)
- Fix: Add `tabindex="0"` to custom interactive elements; ensure `tabindex="-1"` is not removing focusable elements incorrectly

**4. Focus Indicators**
- Visible focus ring on ALL interactive elements
- Must not use `outline: none` without a custom focus style replacement
- Fix: `*:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }`

**5. Semantic HTML**
- Buttons are `<button>`, not `<div onClick>`
- Links are `<a href>`, not `<span onClick>`
- Lists use `<ul>/<li>`, not styled `<div>`s
- Form inputs have `<label>` elements (not just placeholder text)
- Fix: Replace `<div role="button" onClick>` with `<button type="button">`

**6. ARIA Labels**
- Icon-only buttons have `aria-label`
- Images have meaningful `alt` text (or `alt=""` if decorative)
- Landmark regions present: `<nav>`, `<main>`, `<header>`, `<footer>`
- Fix: `<button aria-label="Close dialog"><XIcon /></button>`

**7. Heading Hierarchy**
- One `<h1>` per page
- Headings do not skip levels (h1 → h2 → h3, never h1 → h3)
- Headings are structural, not styling choices
- Fix: Use CSS classes for visual size; use correct heading level for structure

**8. Form Error Handling**
- Errors identified in text (not color alone)
- Error messages linked to inputs via `aria-describedby`
- Required fields marked (not just with color or placeholder `*`)
- Fix: `<input aria-describedby="email-error" aria-invalid="true" />`

**9. Motion and Animation**
- Animations respect `prefers-reduced-motion`
- No flashing content (> 3 flashes/second can trigger seizures)
- Fix: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`

**10. Touch Targets**
- Minimum 44×44px touch target for all interactive elements (WCAG 2.5.5)
- Spacing between targets: ≥ 8px
- Fix: `min-height: 44px; min-width: 44px; padding: 12px;`

**11. Zoom and Text Resize**
- Page usable at 200% browser zoom
- Text resizes with browser font size (use `rem`, not `px` for font sizes)
- No horizontal scroll at 320px viewport width
- Fix: Replace `font-size: 16px` → `font-size: 1rem`

**12. Dynamic Content**
- Status messages announced to screen readers via `aria-live`
- Modals trap focus and restore it on close
- Loading states have accessible text (`aria-busy`, loading spinner `role="status"`)
- Fix: `<div aria-live="polite" aria-atomic="true">{statusMessage}</div>`

---

## Output Format

```
## Quick Audit: [Component/Page Name]

| # | Check | Result | Fix |
|---|-------|--------|-----|
| 1 | Color contrast — text | FAIL | Darken body text from #9ca3af to #6b7280 |
| 2 | Color contrast — UI | PASS | — |
...

## Critical Issues (ship-blockers)
<List WCAG A violations here>

## Recommended Improvements (WCAG AA)
<List AA issues>

## Estimated Fix Time
<e.g., "30 minutes — 2 CSS changes + 3 ARIA labels">
```

For a comprehensive WCAG 2.2 audit covering all 50+ criteria, use the `accessibility` skill.

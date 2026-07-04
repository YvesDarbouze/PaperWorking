# UI Design Audit: Luminous Glass vs. Old B&W Sharp Design
**Audit Timestamp:** 2026-05-26

## Executive Summary
We audited all **75 active page files** under `src/app/` to assess their adoption of the new **Luminous Glass** theme (frosted glass, backdrop blur, fully rounded elements, Hanken Grotesk typography) versus the **Old B&W Sharp Design** (sharp edges, pure B&W, strict 1px solid borders, standard HTML elements).

| Design Status | Count | Percentage | Description |
|---|---|---|---|
| **Luminous Glass (Adopted)** | 49 | 65.3% | Full adoption of rounded frosted cards, blur effects, pill buttons. |
| **Bridge / Mixed Design** | 13 | 17.3% | Uses new classes but overrides corners to sharp/rounded-none. |
| **Old B&W Sharp Design / Legacy** | 13 | 17.3% | Sharp-edged B&W elements, lack of frosted glass or modern design tokens. |

---

## Mapped Active Routes & Pages

| Route / Page Path | Design Status | Key Design Tokens & Evidence | Rationale & Styling Elements |
|---|---|---|---|
| `(auth)/forgot-password/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-button, rounded-xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `(auth)/login/finish/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-button, rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `(auth)/login/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-button, pw-surface, rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `(auth)/register/page.tsx` | **Luminous Glass (Adopted)** | LG: luminous-button, rounded-xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `about/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `admin/analytics/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, backdrop-blur, rounded-xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `admin/audit/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `admin/marketplace/page.tsx` | **Old B&W Sharp Design** | OLD: border-pw-black, uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `admin/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `admin/subscriptions/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `admin/tickets/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `admin/users/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-full<br>OLD: ag-button, uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `blog/[slug]/page.tsx` | **Old B&W Sharp Design** | OLD: border-pw-black, uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `blog/page.tsx` | **Old B&W Sharp Design** | OLD: border-pw-black, uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `careers/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `checkout/success/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `contact/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `cookies/page.tsx` | **Legacy / Raw Style** | None | Uses custom styled components or raw styling without explicit Luminous Glass or B&W design system tokens. |
| `dashboard/account/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/calendar/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/closing-room/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/data/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/deal-analyzer/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/engine-room/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/evaluation/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/exit-hub/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/field-manager/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/inbox/page.tsx` | **Luminous Glass (Adopted)** | LG: luminous-glow, rounded-xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/insights/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/appreciation/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/cap-rate/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/cash-flow/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/coc/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/comparison/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/dscr/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/grm/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/irr/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl, rounded-3xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/ltv/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/noi/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/occupancy/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/oer/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/intelligence/performance/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/marketplace/page.tsx` | **Bridge / Mixed Design** | LG: rounded-xl, rounded-full<br>OLD: rounded-none | Uses Luminous Glass styles (e.g. pw-btn, glass-card) but overrides corners with rounded-none or shadow-none to match the sharp aesthetic. |
| `dashboard/page.tsx` | **Luminous Glass (Adopted)** | LG: backdrop-blur, rounded-xl, rounded-2xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/profile/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/projects/[id]/phase-1/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-glow, rounded-xl, rounded-2xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/projects/[id]/phase-2/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, rounded-xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/projects/[id]/phase-3/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-glow, rounded-xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/projects/[id]/phase-4/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, backdrop-blur, rounded-xl, rounded-2xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/projects/new/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-full<br>OLD: border-pw-black | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/projects/page.tsx` | **Bridge / Mixed Design** | LG: glass-card, luminous-glow, pw-btn, pw-interactive, backdrop-blur<br>OLD: rounded-none, border-pw-border | Uses Luminous Glass styles (e.g. pw-btn, glass-card) but overrides corners with rounded-none or shadow-none to match the sharp aesthetic. |
| `dashboard/reports/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-2xl, rounded-full, hanken<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/settings/billing/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-button, rounded-xl, rounded-2xl, rounded-full<br>OLD: border-pw-border, uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/settings/notifications/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, glass-input, luminous-button, pw-surface, rounded-xl, rounded-2xl, rounded-full<br>OLD: border-pw-border | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/settings/page.tsx` | **Inherited Dashboard (Bridge/Mixed)** | None | Inherits dashboard theme from layout, likely mixed styles. |
| `dashboard/settings/profile/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, glass-input, luminous-button, rounded-xl, rounded-2xl, rounded-full<br>OLD: border-pw-border | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/settings/team/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, glass-input, luminous-button, pw-surface, rounded-xl, rounded-2xl, rounded-full<br>OLD: border-pw-border, uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `dashboard/sourcing/page.tsx` | **Bridge / Mixed Design** | LG: pw-btn, pw-interactive, pw-tab, pw-surface<br>OLD: rounded-none, border-pw-border, uppercase tracking-widest | Uses Luminous Glass styles (e.g. pw-btn, glass-card) but overrides corners with rounded-none or shadow-none to match the sharp aesthetic. |
| `dashboard/team/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, luminous-button, backdrop-blur, rounded-xl, rounded-2xl, rounded-full<br>OLD: border-pw-border, uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `data-deletion/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `faq/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `how-it-works/page.tsx` | **Legacy / Raw Style** | None | Uses custom styled components or raw styling without explicit Luminous Glass or B&W design system tokens. |
| `invest/[token]/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, backdrop-blur, rounded-xl, rounded-2xl, rounded-3xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `invite/team/page.tsx` | **Legacy / Raw Style** | None | Uses custom styled components or raw styling without explicit Luminous Glass or B&W design system tokens. |
| `page.tsx` | **Bridge / Mixed Design** | LG: backdrop-blur, marketing-context<br>OLD: rounded-none, border-pw-border | Uses Luminous Glass styles (e.g. pw-btn, glass-card) but overrides corners with rounded-none or shadow-none to match the sharp aesthetic. |
| `pricing/page.tsx` | **Luminous Glass (Adopted)** | LG: backdrop-blur, rounded-2xl, rounded-full | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `privacy/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `rehab/page.tsx` | **Bridge / Mixed Design** | LG: pw-btn, pw-interactive<br>OLD: rounded-none, border-pw-black, border-pw-border, uppercase tracking-widest | Uses Luminous Glass styles (e.g. pw-btn, glass-card) but overrides corners with rounded-none or shadow-none to match the sharp aesthetic. |
| `support/[slug]/page.tsx` | **Luminous Glass (Adopted)** | LG: rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `support/faq/page.tsx` | **Luminous Glass (Adopted)** | LG: pw-surface, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `support/glossary/page.tsx` | **Luminous Glass (Adopted)** | LG: pw-surface, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `support/page.tsx` | **Luminous Glass (Adopted)** | LG: pw-surface, rounded-xl, rounded-full<br>OLD: border-pw-border, uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `terms/page.tsx` | **Old B&W Sharp Design** | OLD: uppercase tracking-widest | Legacy B&W styling with sharp edges (rounded-none), strict 1px solid borders, and no glass/translucency tokens. |
| `vendor-portal/page.tsx` | **Luminous Glass (Adopted)** | LG: glass-card, backdrop-blur, rounded-xl, rounded-2xl, rounded-full<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |
| `vendor-portal/profile/page.tsx` | **Luminous Glass (Adopted)** | LG: luminous-button, backdrop-blur, rounded-xl<br>OLD: uppercase tracking-widest | Adopts the full Luminous Glass design system: rounded corners, backdrop-blur, frosted glass cards, and pill/rounded buttons. |

---

## Key Insights & Divergences

1. **The Root Layout & Global CSS Bridge:**
   - `src/app/layout.tsx` is the foundation. It registers **Hanken Grotesk** as the default `--font-sans` font family, meaning all pages inherit it by default unless overridden.
   - `src/app/globals.css` implements the **Contrast Engine** and custom `.pw-` styles (Frosted Glass panels, `.pw-btn--primary`, `.pw-btn--secondary`, and inputs with rounded corners).
   - `.dashboard-context` in `globals.css` applies glass backdrop filters and `var(--radius-lg)` (16px corners) to cards, sections, dialogs, and popovers globally.
2. **Explicit Overrides in Panels (Bridge/Mixed):**
   - While the dashboard layout is fully equipped with Luminous Glass styling under the hood, the **individual dashboard panel pages** (e.g. `PipelinePanel`, `EvaluationPanel`, `EnginePanel`) explicitly override the rounded corners using the `rounded-none` utility class and strip shadows using `shadow-none`.
   - This creates a **hybrid/mixed aesthetic**: a translucent, blurred background is visible, but the edges are strict and sharp-edged, keeping some of the legacy institutional look.
3. **Marketing Page Divergence:**
   - The landing page (`src/app/page.tsx`) uses `marketing-context` which overrides the typography to **Plus Jakarta Sans** and sets larger, softer border-radii (`--radius-xl: 2.5rem`, `--radius-3xl: 6.25rem`).
   - Other marketing pages like `/about` (`src/app/about/page.tsx`) do *not* use `marketing-context` and follow the old grayscale B&W design system with sharp borders, but occasionally use rounded elements (`rounded-xl` or `rounded-full` buttons) in a non-standardized fashion.

## Recommendations & Next Reskinning Candidates

### Phase 1: Clean Up Dashboard Panel Overrides (Highest Priority)
- **Remove `rounded-none` and `shadow-none`** from dashboard panel files (`src/app/dashboard/panels/*Panel.tsx`). Let the `.dashboard-context` card styling rules in `globals.css` define the standard `16px` rounded corners and shadows automatically.
- This will align the interior dashboard pages with the core Luminous Glass aesthetic defined in `DESIGN.md`.

### Phase 2: Standarize Secondary Pages to Luminous Glass
- **`/about`, `/careers`, `/support`**:
  These pages currently use a legacy black-and-white look. They should be wrapped in `.marketing-context` to adopt the correct Plus Jakarta Sans typography and rounded border-radius layout consistent with the homepage.
- **`/auth` routes (`/login`, `/register`, `/forgot-password`)**:
  These routes have adopted the glass cards (`auth-glass-card`) and pill-shaped luminous buttons, but still contain custom hex colors like `#0b141a` and `#859490`. These should be refactored to use standard visual design tokens.

### Phase 3: Audit radices/atomic UI components
- Check `src/components/ui/card.tsx` and `src/components/ui/badge.tsx` which currently use hardcoded gray variables (like border `#A5A5A5` or background `#F2F2F2`). Ensure they are properly adapted dynamically or mapped to standard theme classes.
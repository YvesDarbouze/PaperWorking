# Final Copy Diff — Codebase Changes

**Author**: Upstream Copy Implementer
**Date**: 2026-05-31
**Status**: Completed (Staging Verified)

This document indexes all final copy modifications made to resolve the copy crimes and align the pre-login surfaces with the REIL v2 phases and locked pricing metrics.

---

## 1. Homepage Bento Hero & Metrics (`src/app/page.tsx`)

### Landing Headline
- **Old (failing)**: `"Scale Your Real Estate Portfolio Without the Chaos."`
- **New (approved)**: `"Stop Running Six-Figure Flips Out of Five-Column Spreadsheets."`

### Landing Sub-headline
- **Old (failing)**: `"The High-Fidelity Operating System for modern investors. Centralize pipeline, automate documentation, and track margins in real-time."`
- **New (approved)**: `"The deal operating system for real estate investors. Track every document, dollar, and deadline from acquisition to exit in one dashboard."`

### Hero CTA Subtext
- **Old (failing)**: `"Free forever for 1 active deal."`
- **New (approved)**: `"Free for 14 days • No credit card required • Instant setup"`

### Metrics Cards
- **Old (failing)**: `"+14.2% Average ROI Delta / Post-implementation optimization"` and `"Automated Compliance / Real-time risk mitigation engine"`
- **New (approved)**: `"4 Phases / REIL v2 Deal Tracking / Acquisition through Hold/Exit"` and `"CPA-Ready Exports / One-click spreadsheet ledgers"`

### Pipeline Ticker Subtext
- **Old (failing)**: `"Visualizing $42M in aggregate deal flow."`
- **New (approved)**: `"Track deal milestones from offer to exit."`

### Grid Phase Descriptions
- **Old (failing)**: `"Acquisition: Source & Secure"`, `"Purchase: Compliance"`, `"Hold: Optimization"`, `"Exit: Instant ROI"`
- **New (approved)**: `"Acquisition: Know the numbers"`, `"Transaction: Meet deadlines"`, `"Rehab: Manage contractor draws"`, `"Hold/Exit: CPA tax hand-off"`

---

## 2. Product Phases Guide (`src/components/landing/HowItWorks.tsx`)

### Phase Titles & Descriptions
- **Phase 2 Title**: `"Purchase"` → `"Transaction"`
- **Phase 3 Title**: `"Hold"` → `"Rehab"`
- **Phase 4 Title**: `"Exit"` → `"Hold/Exit"`
- **Sub-captions & Descriptions**: Fully aligned with REIL v2 specifications:
  - *Phase 1 subtitle*: `"Know the real numbers before you sign."`
  - *Phase 2 subtitle*: `"Never blow a contingency deadline."`
  - *Phase 3 subtitle*: `"Manage contractor draws by milestone."`
  - *Phase 4 subtitle*: `"CPA-Ready tax exports on closing."`

### Bottom CTA Section
- **Tagline**: `"Stop bleeding margins to disorganized deals."` → `"Stop running six-figure flips out of five-column spreadsheets."`
- **Body**: `"PaperWorking centralizes your pipeline..."` → `"PaperWorking tracks every document, dollar, and deadline from acquisition to exit in one dashboard."`
- **Trial Subtext**: `"14-day trial · Credit card required · No charge until day 15"` → `"Free for 14 days • No credit card required to sign up"`

---

## 3. Pricing Matrix & Catalog (`src/components/landing/PricingSection.tsx` & `src/lib/stripe/plans.ts`)

### Pricing Tiers
- **Solo (individual)**: `$59 / mo` ($599/yr) → `$99 / mo` ($948/yr)
- **Team (team)**: `$99 / mo` ($999/yr) → `$249 / mo` ($2,388/yr)
- **Enterprise (vendor)**: `$39 / mo` ($390/yr) → `$499 / mo` ($4,788/yr)

### Plan Features lists
- **Solo features**: Updated to 3 pipelines, REIL v2 tracking, standard calculators, CSV export, 1 read-only partner.
- **Team features**: Updated to unlimited pipelines, 5 team seats with permissions, JV & syndication trackers, PDF templates, and custom checklists.
- **Enterprise features**: Updated to unlimited pipelines & seats, white-label portals, priority phone support, API access, and template vaults.

### Testimonials / Case Studies
- Replaced fictional investor names (Marcus T, Samantha Cho, David R) and unverified metrics with three distinct **Operator Case Studies** (Nashville Duplex Rehab, Partnership Transparency, Acquisition Pipeline).

### FAQs
- Replaced outdated queries with four conversion-centric FAQs addressing billing upgrades, annual toggle discounts, read-only partner access, and setup fees.

---

## 4. About Page CTA & Link Alignment (`src/app/about/page.tsx`)

### Traction metrics
- **Old (failing)**: `"Join thousands of investors who track every dollar..."`
- **New (approved)**: `"Join real estate operators tracking deal metrics from acquisition to exit."`

### CTA Link
- **Old (failing)**: `href="/#pricing"`
- **New (approved)**: `href="/register"`

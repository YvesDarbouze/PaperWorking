# Staff Product Design Audit: PaperWorking Deals Marketplace

> **Auditor:** Staff Product Designer & Information Architect  
> **Platform:** PaperWorking ("Bloomberg Terminal for Real Estate Investment")  
> **Scope:** Deal Discovery & Marketplace UX (`/dashboard/deals`, `/deals`, `/dashboard/marketplace`)  
> **Reference Benchmarks:** CrowdStreet & RealtyMogul (RE Deal Discovery), Airbnb (Omnibox Search & Facets), Linear & Stripe (Dark-Themed Craft & Density)  
> **Terminology Policy:** Strictly "Operator" / "Deal Originator" (Zero "Sponsor" terminology)

---

## Executive Summary

PaperWorking positions itself as the **Bloomberg Terminal for Real Estate Investment** — dense, dark, quantitative, and mission-critical. Real estate investors operate on numbers: **IRR, Equity Multiple, Cash-on-Cash, Cap Rate, Hold Period, Minimum Check Size, and Operator Provenance**.

However, the current Deals Marketplace implementation suffers from a critical disconnect between the product promise and the actual user experience:
1. **Critical Investor Metrics Missing Above the Fold:** Current cards display only a generic "Target" and "Projected ROI". Key underwriting metrics (IRR, Equity Multiple, Hold Period, Min Investment, Debt/Equity Structure) are absent.
2. **Zero Visual Information Scent:** Deal cards contain no imagery, street view, or architectural renders, rendering the discovery browsing experience sterile and unengaging.
3. **Severe Information Architecture (IA) Collision:** The sidebar presents "Marketplace" (which unexpectedly routes to vendor services) and "Deals" (which hosts the actual deals marketplace), creating immediate user confusion.
4. **Non-Functional Search Promise:** The dashboard promises "Search any street address...", but the search bar has no geocoding or autocomplete, and pressing enter triggers an unexpected collision check that navigates the user away from discovery to an deal creation form.

---

## Severity-Rated Findings Matrix

| ID | Dimension | Severity | Current State | Benchmark Reference | Specific Recommendation | Affected Component / File |
|---|---|---|---|---|---|---|
| **F-01** | **Metrics & Scent** | **P0** | Cards show generic "Target" & "Projected ROI". Missing IRR, Equity Multiple, Hold Period, Min Check, & CoC. | **CrowdStreet / RealtyMogul** | Implement standard 4-metric investor grid on each card: Target IRR, Equity Multiple, Min Investment, & Hold Period. | [`DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) |
| **F-02** | **Visual Scent** | **P0** | No property photography, site renderings, or satellite maps on deal cards. Pure text boxes. | **Fundrise / CrowdStreet** | Add 16:9 property photo container with asset class overlay badge, status tag, and fallback map placeholder. | [`DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) |
| **F-03** | **Search UX** | **P0** | Plain text input; no geocoding/places autocomplete. Hitting Enter triggers collision check and forces navigation away to `/deals/[slug]`. | **Airbnb / Zillow** | Decouple collision linker from marketplace search. Implement predictive geocoded autocomplete filtering results in-place. | [`AddressSearch.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/deals/AddressSearch.tsx) |
| **F-04** | **Navigation & IA** | **P0** | Sidebar features "Marketplace" (vendors) and "Deals" (deals marketplace). Header card calls deals "Deals Marketplace". | **Linear / Stripe** | Disambiguate IA: Rename sidebar item to **"Deals Marketplace"** and rename vendor hub to **"Vendor Directory"**. | [`nav-contract.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/lib/navigation/nav-contract.ts), [`DashboardSidebar.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/dashboard/DashboardSidebar.tsx) |
| **F-05** | **Filtering & Facets** | **P1** | Only 1 filter (Asset Class pills derived client-side). No IRR slider, min investment, hold period, or state/market filters. Not synced to URL params. | **Airbnb / Linear** | Build combinable, URL-synced multi-select filter bar with range facets (IRR, Min Investment, Hold Period, Market) and result counts. | [`DealsMarketplacePanel.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealsMarketplacePanel.tsx) |
| **F-06** | **Sort & Density** | **P1** | No sorting options. Fixed grid order. No dense list/table view for institutional triage. | **Bloomberg Terminal / Linear** | Add sort dropdown (Highest IRR, Closing Soonest, Lowest Min Check) and a high-density tabular toggle. | [`DealsMarketplacePanel.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealsMarketplacePanel.tsx) |
| **F-07** | **Operator Provenance** | **P1** | Operator name (`creatorName`) is in data payload but omitted from card. Zero operator credibility indicators. | **CrowdStreet** | Add Operator line with avatar, entity name, and "Verified Operator" badge. | [`DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) |
| **F-08** | **Card Actions** | **P1** | Competing secondary actions ("View deal" pill + "Share analysis" button). No save/bookmark (♡) toggle. | **RealtyMogul / Airbnb** | Single primary action: `variant="secondary"` "View Deal Details" spanning width, plus top-right heart toggle (`roleVariant="toggle"`). | [`DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) |
| **F-09** | **States & Feedback** | **P2** | Loading is a plain `Loading deals…` div. No skeleton screens. Empty state is a basic message with no alternative triage. | **Linear / Stripe** | Implement dark pulse skeleton cards (`bg-white/[0.04]`). Build actionable empty state with "Save Search Alert" CTA. | [`DealsMarketplacePanel.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealsMarketplacePanel.tsx) |
| **F-10** | **Accessibility (a11y)**| **P2** | Borderline text contrast on labels (`text-white/45` = 4.1:1). Missing keyboard focus rings on card wrappers and filter pills. | **WCAG 2.1 AA** | Update text tokens to `--text-secondary` (`#9E9DA0`) and `--text-muted` (min 4.5:1). Bind `focus-visible` rings on all cards. | [`globals.css`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/app/globals.css), [`DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) |

---

## Detailed 10-Dimension Teardown

### 1. First Impression & Information Scent
- **Current Experience:** An investor clicking "EXPLORE DEALS" from the dashboard lands on `/dashboard/deals`. They are greeted with a bulky header, an address input card, two tab pills ("Discover" / "My Activity"), and an asset class pill bar. Below, cards present an address, target dollar figure, and "Projected ROI".
- **The Defect:** Professional real estate capital allocation does not make decisions on "Projected ROI" alone. Is that 18% ROI annualized? Over a 5-year hold? Is it equity IRR or total return? Does it pay quarterly distributions? What is the minimum check size ($10k vs $250k)?
- **Benchmark Contrast:** **CrowdStreet** places the 4 "decision numbers" front-and-center in bold tabular typography: **Target IRR (17.5%)**, **Target Equity Multiple (1.8x)**, **Distribution (Quarterly)**, and **Min Investment ($25k)**. The investor can triage 20 deals in 60 seconds without clicking in.

### 2. Search Experience
- **Current Experience:** The search bar in `AddressSearch.tsx` captures input and immediately executes a collision check against `/api/deals/exists?slug=...`. If the address doesn't exist, pressing Enter or submitting triggers a navigation event directly to `/deals/[slug]` — which is a Deal Underwriting creation form!
- **The Defect:** An investor searching "Austin" or "Elm Street" expecting to filter the marketplace instead gets yanked into an deal submission workflow with an amber collision banner. This violates search predictability and destroys exploration momentum.
- **Benchmark Contrast:** **Airbnb / Zillow** treat search as non-destructive exploration. Typing triggers real-time predictive suggestions (city, market, asset name). Selecting a suggestion filters the active list in place.

### 3. Filtering & Faceting
- **Current Experience:** Filtering is limited to a single horizontal list of asset class pills generated from current deals (`All assets`, `Single-family`, `Multi-family`). Filters are stored in local React state and completely lost on page refresh.
- **The Defect:** Real estate investors need multi-dimensional slicing:
  - *Risk Profile:* Core, Core-Plus, Value-Add, Opportunistic (Flip).
  - *Target IRR:* Min slider (e.g. `> 15%`).
  - *Hold Period:* `< 2 yrs`, `2–4 yrs`, `5+ yrs`.
  - *Geographic Market:* State / MSA multi-select.
  - *Check Size:* Maximum minimum investment amount.
- **Benchmark Contrast:** **Linear / Airbnb** make filters combinable, bookmarkable via URL search parameters (`?assetClass=multifamily&minIrr=15&market=tx`), and display badge counts next to options.

### 4. Deal Card Anatomy ("The 5-Second Test")
- **Current Scoring:** **FAIL (1.5 / 5.0)**
  - *Visual Anchor:* None (0/1). No property imagery or visual hierarchy.
  - *Operator Identity:* None (0/1). `creatorName` is omitted; investors do not know who is executing the business plan.
  - *Decision Metrics:* Weak (0.5/1). Shows "Target" and "Projected ROI" only.
  - *Status Clarity:* Moderate (0.5/1). Status badge is small and grey.
  - *Action Clarity:* Conflicted (0.5/1). "View deal" competes with "Share analysis".
- **Benchmark Contrast:** High-density dark cards with a 16:9 media container, clear status badge (`LIVE FUNDING` / `CLOSING SOON`), verified operator row, 2x2 metric matrix, and a full-width interactive CTA.

### 5. Sort & Scan
- **Current Experience:** The interface defaults to an arbitrary database array order. There is no sort control, and the "Map" toggle opens a static placeholder screen indicating un-wired geo adapters.
- **The Defect:** Without sort controls (e.g. Highest IRR, Lowest Minimum, Most Funded, Newest), investors are forced into manual sequential scanning.
- **Benchmark Contrast:** **Bloomberg Terminal / Linear** provides instant column headers / sort controls (`Sort by: IRR ↓`, `Sort by: Funding % ↓`) and a dense table view toggle for institutional analysts.

### 6. Trust & Transparency
- **Current Experience:** Deals appear as plain cards with user-generated numbers. There is no indicator of whether the deal was verified, audited, or backed by pro-forma rent comps.
- **The Defect:** In syndications, trust is the primary conversion gate. An unvetted listing creates skepticism.
- **Benchmark Contrast:** **CrowdStreet / Fundrise** feature an "Operator Tier" or "Verified Originator" badge, SEC regulatory exemption type (`Reg D 506(c)`), and data provenance tags (e.g. `RentCast Comps Verified`, `Title Clear`).

### 7. Empty, Loading, and Error States
- **Current Experience:**
  - Loading: A plain text container `Loading deals…` causing layout jitter.
  - Error: Unstyled red banner.
  - No Results: "No deals match this tab or filter" with a "Reset filters" link.
- **Benchmark Contrast:**
  - Shimmering skeleton cards preserving 100% of the grid geometry.
  - Engaging zero-state: "No deals found in Austin under Multifamily" with actions: "Save Search Alert" or "Clear Asset Filter".

### 8. Navigation & Wayfinding (IA Resolution)
- **Current Experience:**
  - Dashboard Sidebar:
    - `Marketplace` &rarr; `/dashboard/marketplace` (Services / Vendors directory)
    - `Deals` &rarr; `/dashboard/deals` (Deals marketplace)
  - Top Bar:
    - Search pills: `Deals` vs `Vendors`
  - Dashboard Card:
    - Header: "Deals Marketplace" &rarr; links to `/dashboard/deals`.
- **The Root Cause of Confusion:** In common commercial real estate parlance, "The Marketplace" refers to where properties and investment deals trade. Calling the vendor directory "Marketplace" and relegating deals to "Deals" confuses operators and investors alike.
- **IA Resolution:**
  1. Primary Nav: Rename item `deals` to **"Deals Marketplace"** (`/dashboard/deals`).
  2. Primary Nav: Rename item `marketplace` to **"Vendor Directory"** (`/dashboard/marketplace` or `/dashboard/vendors`).
  3. Keep top bar quick-links as `Deals` and `Vendors` for brevity.

### 9. Accessibility (a11y)
- **Contrast Ratios:** Muted text on cards uses `text-white/45` on `#121014`, yielding a contrast ratio of ~4.1:1. All muted secondary text must be elevated to `--text-secondary` (`#9E9DA0`, 5.4:1 contrast) to satisfy WCAG AA.
- **Keyboard Traversal:** The entire card must serve as a semantic card with a single primary focus target (the title or dedicated button) rather than trapping users in multiple internal links.
- **Live Regions:** Filter updates and live loading indicators must declare `aria-live="polite"`.

### 10. Performance Perception
- **Optimization Strategy:**
  - Replace blocking loading states with CSS pulse skeletons using `--bg-surface` and `--bg-elevated`.
  - Add `next/image` with blur placeholder for property photos.
  - Establish a pagination / infinite query contract (`page=1&limit=12`) rather than client-side array filtering.

---

## Canonical "Deal Card" Wireframe (Markdown Architecture)

Below is the design-token compliant wireframe for the ideal PaperWorking deal card:

```markdown
+--------------------------------------------------------------------------+
|  [ PROPERTY IMAGE / RENDERING (16:9 aspect-ratio) ]                      |
|                                                                          |
|  [ MULTIFAMILY · VALUE-ADD ]                       ( ♡ SAVE / BOOKMARK ) |
|  [ LIVE FUNDING · 68% ]                                                  |
+--------------------------------------------------------------------------+
|  Apex Heights Living                                                     |
|  1247 Elm Street, Austin, TX 78702                                       |
|                                                                          |
|  OPERATOR: [Avatar] Apex Capital Management  [ ✓ VERIFIED OPERATOR ]     |
|  ----------------------------------------------------------------------  |
|  TARGET IRR        EQUITY MULTIPLE    HOLD PERIOD       MIN INVESTMENT   |
|  18.4%             1.85x              3–5 Years         $25,000          |
|  ----------------------------------------------------------------------  |
|  FUNDING PROGRESS: $1,250,000 / $1,850,000                   (68% FUNDED)|
|  [========================================------------] 14 Investors     |
|  ----------------------------------------------------------------------  |
|  [ VIEW DEAL UNDERWRITING → ] (Canonical Secondary Button / Full-Width)  |
+--------------------------------------------------------------------------+
```

### Component Structure Breakdown
1. **Media Header:** 16:9 container, progressive image load with fallback gradient (`linear-gradient(135deg, rgba(0,221,148,0.1), rgba(18,16,20,0.9))`).
2. **Badge Row:** Asset Class pill (e.g. `Multifamily · Value-Add`), Status pill with green live dot (`● LIVE FUNDING`), and floating top-right bookmark button (`roleVariant="toggle"`, `aria-pressed`).
3. **Identity Row:** Property name (`text-[16px] font-bold text-[#fdfffc]`), address (`text-[13px] text-[#9E9DA0]`), and Operator trust line (`creatorName` + Verified badge).
4. **Investor Metric Matrix:** 4-column structured metrics in tabular mono (`JetBrains Mono`), highlighting the 4 triage numbers.
5. **Funding Meter:** Visual progress bar with `--accent` (`#00DD94`), amount committed vs target, and investor count.
6. **Unified Action:** A single canonical button spanning width (`variant="secondary"`, hover accent border and green glow).

---

## Prioritized Implementation Roadmap (For Next Build Task)

### Phase 1: High-Impact Card & Layout Modernization (P0)
1. **Rebuild `DealCard.tsx`:**
   - Incorporate property image banner (with graceful placeholder fallback).
   - Display Operator provenance row with avatar and verification badge.
   - Render the 4 core underwriting metrics: Target IRR, Equity Multiple, Minimum Investment, and Hold Period.
   - Add save/bookmark button utilizing canonical `Button` (`roleVariant="toggle"`).
   - Standardize CTA using canonical `Button` (`variant="secondary"` full-width).
2. **Disambiguate Navigation (IA):**
   - Update `nav-contract.ts` to rename `deals` to **"Deals Marketplace"** and `marketplace` to **"Vendor Directory"**.
   - Align sidebar labels in `DashboardSidebar.tsx`.

### Phase 2: Search & Filter Modernization (P1)
3. **Decouple & Enhance Search (`AddressSearch.tsx`):**
   - Separate the collision detection workflow from marketplace discovery search.
   - Support instant predictive search by property title, street address, city, and operator name.
4. **Build Faceted Filter Bar:**
   - Introduce Asset Class, Min IRR slider, Min Investment, and Hold Period filters.
   - Sync filter state bidirectionally with URL query parameters (`?tab=discover&asset=multifamily&minIrr=15`).
   - Add clear all / active filter chip dismissal.

### Phase 3: Institutional Power Features (P2)
5. **Sort Controls & Density Toggle:**
   - Add sorting menu (`Highest IRR`, `Lowest Minimum`, `Closing Soonest`, `Newest`).
   - Add Grid vs Dense Table view toggle for power analysts.
6. **Skeleton Skeletons & Empty States:**
   - Add pulse loading skeleton cards matching exact card geometry.
   - Build rich empty state with "Clear Filters" and "Create Deal Alert".

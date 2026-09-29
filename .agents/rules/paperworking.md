---
trigger: always_on
description: PaperWorking product mission context, stack rules, design language, and the no-mock contract
---

# PAPERWORKING — PRODUCT MISSION CONTEXT (applies to ALL agent work)

## What PaperWorking is
PaperWorking is project-management software built specifically for serious real-estate investors and investment teams — "a Bloomberg terminal for real-estate investors."
It is organized around the REAL ESTATE INVESTMENT LIFECYCLE (REIL), four phases, one system:
- ACQUISITION — hunt for investment opportunities, optionally crowdfund a deal with serious investors, underwrite deals with the Deal Calculator, and track outcomes of individual Deals through exit.
- FUND — fund the project and compile the documentation/paperwork for a real-estate transaction: contingency deadlines, earnest money, contracts in one vault, alerts before dates go hard.
- HOLD — own it and improve it: link milestones to budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.
- EXIT — how the investor exited: complete sale, or keep as rental / lease / Airbnb / pop-up / commercial — and prove what it made with a performance record a buyer, lender, or appraiser expects.

Core surfaces: Marketing site (Landing, How It Works, Pricing), the authenticated App (Projects = the central activity, Deal Calculator, Portfolio Insights, REIL phase views), and the Support Center (FAQ, PaperWorking Glossary, "Pepper" AI assistant, suggestions / feature requests, call-back requests).

## Stack rule
Before writing any code, inspect the repository and detect the existing stack (framework, language, styling system, state management, backend/DB, auth, test runner). Conform to it exactly. Never introduce a second framework, styling system, or state library. If the repo has no backend for a feature that needs one, build the minimal real backend in the existing stack (schema + migration + API + tests) — do not simulate one on the client.

Use Google Cloud / Firebase products exclusively. Standing exception: SendGrid for email (Google has no email product). Where no Google-native offering exists, choose the Google Cloud option (e.g., PostgreSQL -> Cloud SQL for PostgreSQL). Any third-party service requires an explicit founder waiver.

## Design language
The authoritative design system and style guide is **https://ui.shadcn.com/create?preset=buFzlTs** (Radix Lyra style, Neutral base/theme, Phosphor icons, Inter font).
Professional, data-dense, architectural: OKLCH neutral palette, crisp precision radius (`rounded-none` controls/badges, subtle border rings), generous whitespace, clear typographic hierarchy.
Strictly prohibited: AI slop, neon emerald glows (`#00DD94`), glowing button borders, blueprint grids, gradient meshes, pill-everything shapes, and one-off bespoke design components.
Mobile must feel like a native app (bottom nav, thumb-reach CTAs, sheets, safe areas).

## Responsive & Mobile Design Gospel (INVIOLABLE LAW)
1. **The Container Rule**: Use fluid CSS percentages (`w-full` / `width: 100%`) for outer wrappers combined with `max-width` properties rather than fixed pixel widths to stop horizontal scrolling on small screens. Never use fixed widths (e.g., `w-[420px]`, `w-[500px]`, `w-[800px]`) that overflow on mobile.
2. **Media Queries (Mobile-First)**: Build using a mobile-first approach, applying `min-width` CSS media queries (`sm:`, `md:`, `lg:`, `xl:`) to add layout complexity (e.g., multi-column grids) as the screen size scales up.
3. **Typography & Touch Targets**: Set body copy around 16px–18px (`text-base` to `text-lg`), keep interactive elements/buttons at a minimum height of 44×44px for touch accessibility (`touch-target`, `min-h-[44px]`), and ensure form input fields, selects, and textareas are at least 16px font-size (`text-base` / `16px`) on mobile viewports (< 768px) to permanently prevent iOS Safari auto-zooming.
4. **Desktop / Laptop Standard**: Screen width 1200px to 1920px (standard frames: 1366px, 1440px; Full HD: 1920×1080). Keep core text, landing page content, and dashboards inside a 1140px to 1200px centered container (`max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8`) to prevent text lines from stretching too wide.
5. **Tablet Standard**: Screen width 768px to 1024px (768×1024 portrait, 1024px landscape). Single-column or transitioning 2-column grids with adjusted responsive padding.
6. **Mobile Phone Standard**: Screen width 360px to 480px (360×800, 390×844, 414×896, 430×932). Single-column layout, stacked grids, bottom navigation/drawer menus, and full safe-area insets (`env(safe-area-inset-bottom)`).


## THE NO-MOCK CONTRACT (violations are blockers — work is rejected)
1. No dead UI: every button, link, tab, form, and menu item must be fully wired to real logic and real state. No `href="#"`, no `console.log` handlers, no `alert("coming soon")`.
2. No placeholder content: no lorem ipsum, no "TODO/FIXME", no grey boxes, no stock/placeholder image URLs. Generate real imagery with the image-generation tool.
3. No hardcoded fake data standing in for a data layer: if a screen shows data, that data must come from the real store / API / database. Seed scripts for demos are allowed, but they must insert through the real API into the real DB.
4. No fake calculations: every number shown must be computed by the real calculation logic from real inputs. Marketing demos must use the real engine with a realistic demo dataset.
5. If an external service needs credentials you don't have (e.g., email provider, property-data API): implement the real adapter + typed interface + config flag, show an honest "not configured" state, and flag it in the Walkthrough as REQUIRES CREDENTIALS. Never silently fake a send/fetch.
6. No feature is "done" until: (a) tests for it pass (write the test block first), and (b) the browser subagent has clicked through it and saved screenshots/a recording.

## Verification ritual (every task)
- Produce an Implementation Plan artifact and wait for review before coding.
- Organize work as a Task List; keep it updated.
- After implementing: run the full test suite + build; fix all failures and type errors.
- Use the /browser subagent to click through the affected flows at desktop AND mobile widths; save screenshots (and a recording for flows) as artifacts.
- Produce a Walkthrough artifact listing: what changed, files touched, test results, verification evidence, and anything flagged REQUIRES CREDENTIALS.

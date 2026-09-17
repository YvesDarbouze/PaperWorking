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
Professional, data-dense but calm: low-saturation palette, warm neutrals, generous whitespace, clear typographic hierarchy. No blue-purple gradients, no highly saturated background fills.
Mobile must feel like a native app (bottom nav, thumb-reach CTAs, sheets, safe areas).

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

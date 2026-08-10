# Walkthrough — Tax Intelligence Hub

**Date:** 2026-08-05
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — Prompt 5
**Route:** `/dashboard/reports`

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx jest` | ⚠️ 2801/2813 — same **2 pre-existing** DB suites, **+51 new tests** |
| `npx eslint` on all Prompt-5 files | ✅ **0 errors** |
| `e2e/tax-intelligence.spec.ts` | ✅ **8/8** |
| All five sprint e2e suites | ✅ **30/30** |

---

## 1. The Headline: 70% of this already existed, orphaned

Before writing anything, a survey found the feature had already been built —
and wired to nothing:

| Asset | Lines | Status on arrival |
|---|---:|---|
| `lib/reports/reportEngine.ts` | 994 | P&L, Balance Sheet, Cash Flow, Rent Roll, SREO, CapEx, 1040-ES, Budget-vs-Actuals generators |
| `lib/reports/cpaPackageEngine.ts` | 701 | Schedule E mapping, Depreciation, Closing Docs, 1099 |
| `components/reports/ReportCatalogGrid.tsx` | — | **All 14** report types from reqs 2–5 |
| `components/reports/ReportViewModal.tsx` | 1,062 | Full report tables per report id |
| 4 jest suites | — | Engine coverage already green |

`ReportCatalogGrid` and `ReportViewModal` had **zero importers anywhere in
`src/`**. The live page was a separate 2,234-line bento dashboard (NOI trend,
cash-flow intelligence, capital-gains calculator) that imported none of it.

**Agreed approach: wire the existing engines, build only the real gaps.** That
kept 2,345 tested lines in play instead of duplicating them.

---

## 2. Architecture

```
app/dashboard/reports/page.tsx          ← Tax Intelligence hub (NEW)
  ├── useAllDealsSync()                 ← hydrates projects + ledgerItems
  ├── 5 period tabs → TAB_CATEGORIES    ← Monthly | Quarterly | Yearly | Overall | By Property
  ├── project filter  ─────────────────► scopedProjects / scopedTransactions
  ├── lib/reports/plaidPhaseTagging.ts   (NEW) REIL phase tagging + readiness
  ├── lib/reports/estimatedTaxDates.ts   (NEW) 1040-ES deadlines + 30-day alert
  ├── lib/reports/taxReportPdf.ts        (NEW) branded jsPDF export
  ├── components/reports/ReportCatalogGrid
  │     └── lib/reports/reportPreview.ts (NEW) top-3 line previews
  │           └── reportEngine.ts        (EXISTING, reused)
  └── components/reports/ReportViewModal (EXISTING, reused)
        └── reportEngine.ts + cpaPackageEngine.ts
```

Previews read the **same generators** the modal uses, so a card can never
disagree with the report it opens.

---

## 3. PDF Generation

`lib/reports/taxReportPdf.ts` — built on `jspdf` + `jspdf-autotable`, both
already in `package.json`. `pdfGenerator.ts` was not reused: it renders metric
dashboards and has no branding, pagination, or report context.

Every page carries, per requirement 6:

| Element | Implementation |
|---|---|
| PaperWorking wordmark | Header left, bold 13pt |
| Report title | Header left, under the wordmark |
| Generation date | Header right, `Generated August 5, 2026` |
| Property / deal context | Header right, e.g. `3 properties · Monthly` |
| Page numbers | Footer right, `Page N of M` |
| Tax disclaimer | Footer left, overridable |

Two deliberate choices:

- **jsPDF is imported dynamically.** It is ~350kB; a static import would land
  in the initial client bundle for every visitor who never exports.
- **Header/footer are stamped after the body.** The total page count is unknown
  until autotable has laid out every row, so "Page N of **M**" requires a
  second pass over `getNumberOfPages()`.

Insufficient-data handling: `canExportReport(projectCount, transactionCount)`
drives one disabled state and one tooltip — *"Add more transactions to generate
this report."* `exportTaxReportPdf` also throws on empty sections, so reaching
it with no data is a bug rather than a silent blank PDF.

---

## 4. Plaid Project Tagging

`lib/reports/plaidPhaseTagging.ts` — React-free and unit-tested.

| REIL phase | Label | Matches |
|---|---|---|
| Acquisition | Find & Fund | earnest, due diligence, inspection, appraisal, title search, origination, closing cost, survey, attorney/loan/underwriting fee |
| Hold | Operating | rent, tenant, lease, utilities, repairs, maintenance, management fee, HOA, insurance, property tax, CapEx, mortgage interest |
| Exit | Disposition | capital gains, sale proceeds, seller credit, disposition, realtor/sales commission, escrow payout, payoff |

Rules are **ordered, first-match-wins**, so specific patterns beat general ones
— "closing cost" resolves to Acquisition rather than being swallowed by a
looser rule.

**Unmatched transactions default to Hold but are flagged `confident: false`**
and counted in `unconfidentCount`, which the phase cards surface as *"N need
review"*. A silently mis-bucketed transaction is a wrong tax figure, so the
guess is always visible rather than hidden.

Scoping: `scopeToProject`, `untaggedTransactions`, and `allTransactionsScoped`
back the project filter and the *"N transactions not tagged to a project"*
warning.

> **Data-source note:** transactions live in the store as `ledgerItems`, keyed
> by projectId — *not* on the project object. `amount` is in dollars and
> expenses are positive, so the page converts to signed cents (expenses
> negative) before tagging.

---

## 5. Requirements

| # | Requirement | Status |
|---|---|---|
| 1 | Title, subtitle, 5 tabs, Export PDF | ✅ |
| 2 | P&L / Balance Sheet / Cash Flow / Rent Roll cards, last-updated, top-3 preview, View Full Report → modal | ✅ |
| 3 | 1040-ES voucher, Budget vs Actuals, **30-day due alert** | ✅ (chart is the modal's, see §8) |
| 4 | Schedule E, Depreciation, Closing Docs, 1099, Log Books | ✅ all five in the catalog |
| 5 | SREO, CapEx Tracker | ✅ · **Custom Checklist — NOT built (§8)** |
| 6 | Branded PDF, insufficient-data tooltip | ✅ |
| 7 | Project tagging, filter, REIL phases, inline Connect CTA | ✅ |
| 8 | Both empty states | ✅ |

The 30-day alert is date-driven: on 2026-08-05 the next deadline (Sep 15) is 41
days out, so it correctly stays silent in the screenshots. Both sides are
unit-tested.

---

## 6. Bugs Found and Fixed

### The page would have been empty for every user
The rewrite initially dropped `useAllDealsSync()`, which the old page called to
hydrate the store. Without it `projects` is always `[]` and **every user sees
"Add your first property."** Caught because two e2e tests skipped rather than
passed — the skip was the symptom, not the problem.

### Balance Sheet reported NEGATIVE total assets
The card preview rendered **"Total assets −$162,000.00"**. In
`generateBalanceSheet`:

```js
const loan = fin.loanAmount || Math.round(price * 0.75);
const downPayment = price - loan;          // negative when price is missing
cashAndEquivalents += downPayment * 0.15;  // −1,080,000 × 0.15 = −162,000
```

Seeded projects carry `loanAmount` but no `purchasePrice`, so the implied down
payment went negative and dragged total assets below zero — on a CPA-facing
balance sheet. Fixed with `Math.max(0, price - loan)` and pinned by
`balanceSheetNegativeAssets.test.ts` (5 tests). All four pre-existing engine
suites still pass.

### Report cards rendered white on a dark page
`ReportCatalogGrid` styled itself with `dark:` variants. **This app's dark mode
does not use them** — see §7. Converted to the app's CSS-variable tokens.

### 14 bright-green CTAs
The catalog's "Generate Report" button was `bg-emerald-600`. With up to 14 cards
on screen that is 14 green CTAs against the sprint's one-per-view rule. Now
neutral slate, and relabelled **"View Full Report"** per req 2.

---

## 7. ⚠️ Repo-wide finding: `dark:` utilities do not work

`ThemeProvider` forces dark and sets **both** `data-theme="dark"` and
`class="dark"` on `<html>`. But Tailwind v4 defaults the `dark` variant to
`prefers-color-scheme`, and `globals.css` registers no
`@custom-variant dark`. So:

> **All 905 `dark:` utilities across 42 files compile to
> `@media (prefers-color-scheme: dark)`.** They only take effect when the
> user's *operating system* is in dark mode — not because the app is.

Any component styled `bg-white dark:bg-[#16141a]` renders **white** for a
light-OS user despite the app being dark. This is why the report cards looked
wrong.

The one-line fix is `@custom-variant dark (&:where(.dark, .dark *));` in
`globals.css`, which would correct all 42 files at once — but it changes the
appearance of a large surface area simultaneously, so it was **not** applied
mid-prompt. Recommended as its own change with a visual pass.

---

## 8. Not Built — deliberate gaps

| Item | Why |
|---|---|
| **Custom Checklist** (req 5) — checklist by portfolio size & strategy | No catalog entry or engine exists; it is the one report in reqs 2–5 with no backing model. Needs a data model decision (which strategies, which line items) before it can be built honestly. |
| **Budget-vs-Actuals bar chart** (req 3) | The variance *data* is generated and the full report opens in the modal; the prompt's per-property **bar chart** specifically is not rendered on the card. |
| **Closing Statements** data | `loanDoc` / `closingStatement` return **zero** matches in the type layer. The catalog card exists and the engine has `ClosingDocumentIndexData`, but it can only produce an honest empty state until documents are modelled. |
| Per-section Export PDF (req 6 "every section") | Export is currently page-level, covering the active tab's scope. Per-card export would reuse `exportTaxReportPdf` directly — the exporter already takes arbitrary sections. |

---

## 9. Files Changed

**New (8)**
- `src/lib/reports/plaidPhaseTagging.ts`
- `src/lib/reports/taxReportPdf.ts`
- `src/lib/reports/reportPreview.ts`
- `src/lib/reports/estimatedTaxDates.ts`
- `src/__tests__/plaidPhaseTagging.test.ts` (22)
- `src/__tests__/taxReportPdf.test.ts` (12)
- `src/__tests__/estimatedTaxDates.test.ts` (12)
- `src/__tests__/balanceSheetNegativeAssets.test.ts` (5)
- `e2e/tax-intelligence.spec.ts` (8)

**Modified (4)**
- `src/app/dashboard/reports/page.tsx` — 2,234-line bento dashboard → Tax Intelligence hub
- `src/components/reports/ReportCatalogGrid.tsx` — controlled filtering, previews, theme tokens, de-greened CTA
- `src/lib/reports/reportEngine.ts` — negative-asset fix
- `src/__tests__/scenarioIRRNoMultiplier.test.ts` — retargeted, see below

### A test guarded code that moved
`scenarioIRRNoMultiplier.test.ts` read `reports/page.tsx` from disk and asserted
the page used `computeAllScenarioIRRs` rather than fake multiplier-scaled IRRs.
The rewrite removed IRR scenarios from that page entirely, so four assertions
failed.

Verified before changing anything that the capability is not lost:
`/dashboard/intelligence/irr` models scenarios with the real engine
(`computeIRR(buildIRRCashFlows(...))`), so the original regression cannot
reappear there. The assertions were retargeted at that page plus a check that
the reports page no longer computes IRR at all — preserving the property that
mattered rather than the file it used to live in.

> **Now orphaned:** `src/lib/projections/scenarioIRR.ts`. The reports page was
> its only non-test consumer; the intelligence page implements IRR
> independently via `reiMetrics`. Worth a follow-up decision.

---

## 10. Screenshots

`screenshots/tax-intelligence/` — one per tab: `tab-monthly.png`,
`tab-quarterly.png`, `tab-yearly.png`, `tab-overall.png`, `tab-by-property.png`.

---

## 11. Recommended Next

1. **Register the `dark` custom variant** (§7) and do a visual pass. It is one
   line and currently 905 utilities are silently inert.
2. **Model closing/loan documents** so the Closing Docs Index can return real
   rows instead of an empty state.
3. **Decide on the Custom Checklist** data model, or drop it from the spec.
4. **"By Property" currently mirrors "Overall".** It shows every report with the
   project filter applied; a genuinely per-property layout (one column per
   property) would be a better use of the tab.
5. **Resolve orphaned `scenarioIRR.ts`** — delete it, or adopt it on the
   intelligence IRR page in place of that page's own implementation.

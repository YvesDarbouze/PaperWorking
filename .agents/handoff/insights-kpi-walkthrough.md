# Walkthrough — Insights KPI Dashboard

**Date:** 2026-08-05
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — Prompt 6
**Route:** `/dashboard/insights`

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx jest` | ⚠️ 2835/2847 — same **2 pre-existing** DB suites, **+34 new tests** |
| `npx eslint` on new files | ✅ **0 errors** (insights page holds 7 pre-existing `any`; count unchanged at 9 vs HEAD) |
| `e2e/insights-kpi.spec.ts` | ✅ **8/8**, no skips |

---

## 1. The KPI Set — reconciling two conflicting "33"s

The prompt's 33 KPIs and the codebase's 33 overlapped on only ~12.

`METRICS_REGISTRY` (33 entries) is backed by `KPI33Block` in `reiMetrics.ts`, a
deliberately numbered system: 1–17 Financial, 18–24 Operational, 25–29
Portfolio, 30–31 Marketing, 32–33 Risk & Compliance. Five of those are
**brokerage** measures, not investor KPIs.

**Agreed approach:** keep the registry as the source of truth, hide the
brokerage metrics from the investor view, and add the missing investor KPIs.

### Why the extensions live at the registry layer

`KPI33Block` sits deep inside `reiMetrics.ts`, is consumed across the app, and
extending it would mean surgery on the derivation chain. `MetricRegistryEntry`
already permits **any** `compute` function — `createCompute` is merely one
helper — so the 23 new metrics compute from project financials at the registry
layer. **`reiMetrics.ts` was not modified.**

### Composition

```
investorMetrics() = METRICS_REGISTRY (33)
                  − BROKERAGE_METRIC_IDS (5)
                  + INVESTOR_METRIC_ENTRIES (23)
                  = 51 investor KPIs
```

Hidden as brokerage: `sold_per_inventory`, `demand_growth`,
`listing_to_meeting`, `avg_commission`, `compliance_rate`. They still compute
and remain available elsewhere.

### The 23 added

| Metric | Formula |
|---|---|
| Return on Assets | NOI ÷ Property Value × 100 |
| Yield on Cost | Stabilised NOI ÷ (Price + Rehab) × 100 |
| Debt-to-Income | Annual Debt Service ÷ EGI × 100 |
| Break-Even Ratio | (OpEx + Debt Service) ÷ EGI × 100 |
| Rent-to-Value | Monthly Rent ÷ Property Value × 100 |
| Expense Ratio | OpEx ÷ EGI × 100 |
| Vacancy Rate | Vacant Units ÷ Total Units × 100 |
| Price per Door | Purchase Price ÷ Units |
| Cost per Sq Ft | Purchase Price ÷ Square Footage |
| Replacement Reserve | Annual Reserve ÷ Units |
| Management Fee Efficiency | Mgmt Fees ÷ EGI × 100 |
| Collection Loss | Uncollected Rent ÷ PGI × 100 |
| Effective Gross Income | PGI − Vacancy & Collection Loss |
| Potential Gross Income | Monthly Rent × 12 at 100% occupancy |
| Operating Expense per Unit | Annual OpEx ÷ Units |
| Debt Service per Unit | Annual Debt Service ÷ Units |
| Profit Margin | Net Cash Flow ÷ EGI × 100 |
| Return on Equity | Annual Cash Flow ÷ Equity Invested × 100 |
| Net Income Multiplier | Property Value ÷ NOI |
| Break-Even Occupancy | (OpEx + Debt Service) ÷ PGI × 100 |
| Loan Constant | Annual Debt Service ÷ Loan Amount × 100 |
| Holding Period | Planned or elapsed ownership, years |
| Exit Cap Rate | Stabilised NOI ÷ Projected Sale Price × 100 |

**Not added:** Points/Fees, Prepayment Penalty, Sale Proceeds, Tax Liability,
Rent Growth, Turnover Rate, Appreciation. Each needs a data model that does not
exist — inventing formulas over absent inputs would produce confident-looking
fiction. Several near-equivalents already exist in the registry (`aar` for
appreciation, `tenant_turnover` for turnover, `revenue_growth` for rent growth).

---

## 2. The null contract — no misleading zeros

Every extension returns `null` when an input is missing, never `0`.
`formatMetricValue` renders `null` as an em dash (`—`) for all five units, and a
**real** zero still renders as `$0` / `0.0%`. NaN and Infinity are treated as
missing. This is requirement 5, and it is unit-tested in both directions.

**RESOLVED (follow-up pass).** Registry metrics now honour the same contract.
`computeSingleMetric` gained a `REQUIRED_INPUTS` guard: each metric declares
input GROUPS, and every group must be satisfied by at least one present field.
A ratio therefore needs both sides — **LTV with a loan but no property value is
`null`, not 0% leverage**. A recorded `0` counts as a data gap, since no real
record has a $0 purchase price. `reiMetrics.ts` is still untouched; the guard
lives entirely at the registry layer. Pinned by
`src/__tests__/metricNullContract.test.ts` (12 tests).

---

## 3. Trend arrows — green means "good", not "up"

`computeTrend` reports pure arithmetic direction. `trendTone` then decides
colour, because **direction is not the same as improvement**:

- Green (`positive`) — genuinely favourable movement
- Red (`negative`) — unfavourable
- Gray (`neutral`) — flat, or no prior period to compare

`LOWER_IS_BETTER_IDS` inverts 15 metrics, so **a rising LTV is red, not green**.
Colouring it green because the number went up would be actively misleading on a
leverage metric. Tested across every inverted id.

Colour appears nowhere else on a card: flat surface, white value, gray label.

---

## 4. Architecture

```
app/dashboard/insights/page.tsx
  ├── useAllDealsSync()                    ← ADDED (see §5)
  ├── scope toggle + project <select>       (existing)
  ├── "Viewing insights for: …"            ← ADDED
  └── components/insights/KpiSectionGrid    ← NEW
        └── lib/metrics/investorKpiView.ts  ← NEW  sections, format, trend, tone
              ├── lib/metrics/metricRegistry.ts   (existing, unmodified)
              └── lib/metrics/investorMetrics.ts  ← NEW  23 computes + brokerage list
```

Sections render Core / Leverage & Risk / Operational / Growth at exactly four
cards each, then an **Additional KPIs** section holding everything else — so no
computed metric is silently dropped. Verified by a test asserting every metric
appears exactly once across all sections.

Responsive: 1 column at 375px, 2 at 768px, 4 at 1440px — asserted by reading
`gridTemplateColumns` at each width.

---

## 5. Bug Found — pre-existing, page-breaking

**The Insights page never hydrated the project store.** It read
`useProjectStore(s => s.projects)` but never called `useAllDealsSync()`.
Consequence: `projects` was always `[]`, so `hasProjects` was false, **the scope
toggle and project selector never rendered at all**, and every KPI resolved to
an em dash.

Confirmed pre-existing — `git show HEAD:…/insights/page.tsx | grep -c
useAllDealsSync` returns **0**. This is the same class of bug found on the
Reports page in Prompt 5.

Surfaced only because a Playwright test **skipped** rather than failed. Skips on
acceptance criteria were treated as failures throughout this sprint, which is
what exposed it.

Also fixed: switching scope to "Project" left `selectedProjectId` empty while
the `<select>` already displayed the first project — the label read "Selected
project" instead of its name. Scope switching now defaults to the first project.

---

## 6. Theming — the `dark:` variant bug again

The Insights page container was `bg-slate-50 dark:bg-[#121014]/30`, and its
heading `text-slate-900 dark:text-white`. Because this app registers **no
`@custom-variant dark`** (see the handoff warning — 905 `dark:` utilities across
42 files are inert), the page rendered **light** while the KPI cards rendered
dark. Four containers converted to CSS-variable tokens.

This is the second prompt in a row where that root cause produced a visible
defect. The one-line global fix remains recommended and unapplied.

---

## 7. Deviation from the agreed plan — stated plainly

The chosen option was "wire the orphaned `KPIInsightsDashboard` and reskin it".
**I did not do that.** After building the tested `investorKpiView` layer it
became clear that:

- the orphan (2,799 lines) computes via `deriveAllMetrics` directly and does
  **not** use `METRICS_REGISTRY`, so it cannot render the composed investor set
  without substantial rework;
- its UI is gauge-based (`SvgGauge`, `PctGauge`), and reskinning that into the
  Reports card language would be a larger, riskier edit than composing the
  layer already under test.

So `KpiSectionGrid` (≈240 lines) was built on `investorKpiView` instead. It
reuses the orphan's **card contract** (title, value, status, formula,
benchmark), not its code.

**`KPIInsightsDashboard.tsx` (2,799), `KPIDatapointExplorer.tsx` (487) and
`InsightsDatapointGrid.tsx` (154) remain orphaned** — 3,440 lines with zero
importers. They are now unlikely ever to be adopted; recommend deletion in a
follow-up.

---

## 8. Files Changed

**New (4)**
- `src/lib/metrics/investorMetrics.ts` — 23 computes + brokerage exclusion list
- `src/lib/metrics/investorKpiView.ts` — composition, sections, format, trend, tone
- `src/components/insights/KpiSectionGrid.tsx` — cards + detail drawer
- `src/__tests__/investorKpiView.test.ts` — 34 tests
- `e2e/insights-kpi.spec.ts` — 8 tests

**Modified (1)**
- `src/app/dashboard/insights/page.tsx` — hydration, viewing-context label, KPI
  grid mount, scope-switch default, theme tokens, de-greened CSV button

---

## 9. Screenshots

`screenshots/insights-kpi/insights-desktop.png`, `insights-mobile.png`.

---

## 10. Recommended Next

2. ~~Wire `priorValues`~~ **DONE (follow-up pass).** A Month/Quarter/Year
   selector drives `usePortfolioMetricSnapshots(trendPeriod, projects)`;
   `priorPeriodValues()` maps snapshot fields onto registry metric ids and
   returns the period **before** the latest. With fewer than two periods it
   returns `{}` so arrows stay neutral rather than comparing against nothing.
   The drawer states the basis ("Arrows compare vs last month.").
3. **Trend charts** (NOI line, Cash Flow stacked bar) are not part of this
   change; `TimeSeriesSection` still renders below the grid.
4. **Delete the three orphaned insights components** (§7) — 3,440 lines.
5. ~~Register the `dark` custom variant~~ **DONE (follow-up pass).** See §11.


---

## 11. Follow-up pass — the three open items, closed

### `dark:` variant registered globally
`@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));`
now sits directly under `@import "tailwindcss"` in `globals.css`. All **905
`dark:` utilities across 42 files** are live for the first time.

Both selectors are honoured so the class and the attribute stay
interchangeable — `ThemeProvider` sets both.

> **`@custom-variant` is a BUILD-TIME directive.** After adding it the running
> dev server still served the old CSS and cards measured
> `rgb(255,255,255)`. It took a dev-server restart before the same card
> measured `oklab(… / 0.03)`. Anyone verifying this must restart, not just
> hard-refresh.

**Verification:** all six e2e suites re-run with the variant active — **38/38**.
The legacy "Portfolio Metrics" cards and heading, previously white-on-dark and
dark-on-dark respectively, now render correctly.

### Paywall precedence bug found while fixing the null contract
Making registry metrics return `null` broke `reports.test.ts`. Root cause was a
pre-existing ordering flaw, not the null change:

```js
if (rawVal === null) { row.push('N/A'); return; }   // ← ran first
if (isSensitive && !isPremium) { row.push('[Locked]'); return; }
```

A locked metric with no data emitted `N/A` and never reached the lock. Beyond
the failing test this is a small information leak: `N/A` vs `[Locked]` tells a
non-subscriber **which properties have figures behind the paywall**. The
paywall check now runs first in `csvBuilder.ts` and at **both** sites in
`pdfGenerator.ts`, which had the same nesting.

### Flaky e2e hardened
`search-redesign`'s keyboard test used a fixed `waitForTimeout(900)` after
Enter. It passed alone but flaked when six suites shared one dev server. Now
`waitForURL(/\/dashboard\/projects\/stub-/)` — waiting on the condition, not
the clock.

### Still open
- The two legacy "Portfolio Metrics" cards read `0` / `$0`. Those come from
  `lib/insights/kpiEngine.ts` (`calculateKPIs`), a **second** KPI system the
  page still uses for that strip — not the registry, so the new guard does not
  reach them. Consolidating onto the registry would retire that engine.

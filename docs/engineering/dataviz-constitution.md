# Data Visualization Constitution (Chart & Graph Standards)

**Status:** Authoritative Engineering Standard  
**Governing Surfaces:** Insights Trends charts, Project Comparison chart, KPI card sparklines/deltas, `KpiDetailModal` visualizations, Marketplace deal cards, and all chart surfaces across `apps/web`.  
**Prerequisites:** Button Constitution, PaperWorking Semantic Tokens (`apps/web/app/globals.css`).

---

## Preamble

Data visualization in PaperWorking serves institutional investors, syndicators, and real estate developers who make multi-million dollar underwriting decisions. Every visual mark must communicate rigorous mathematical truth. Chartjunk, truncated scales, ambiguous units, arbitrary color splashes, and un-accessible graphics are strictly prohibited.

---

## Article 1 — Contextual Elements (No Guessing)

1. **Descriptive Title on Every Chart:**
   - Every full-size chart must feature an explicit, unambiguous title combining the metric name and the active timeframe (e.g., *"Net Operating Income — Last 24 Months"*, *"Project Comparison — Cap Rate"*).
   - Where an analytical takeaway or conclusion exists, the title or accompanying subtitle must state it directly.

2. **Explicit Axis Titles:**
   - Both X-axis and Y-axis must name their respective variable and dimension explicitly (e.g., Y: *"NOI ($ / Month)"*, X: *"Historical & Projected Months"*).
   - Sparklines (inline micro-charts) are exempt per Article 5.

3. **Units of Measure Always Visible:**
   - Every chart must display its unit of measure prominently:
     - Currency: `$` with standardized K/M/B compact abbreviations (e.g., `$1.2M`, `$450K`).
     - Percentage: `%` (e.g., `8.5%`).
     - Multiple: `x` or `×` (e.g., `1.85×`).
     - Duration: `yrs` or `mo` (e.g., `5.0 yrs`, `24 mo`).
   - Unit formatting is centralized in `@/lib/viz/format.ts` (`formatCurrency`, `formatPercent`, `formatMultiple`, `formatRatio`). Ad-hoc string interpolation of unformatted raw numbers is prohibited.

4. **Legend / Key Rules:**
   - A legend is required whenever two or more data series, color encodings, or pattern encodings are present.
   - Single-series charts **must omit** the legend (it is redundant chartjunk) and rely on the chart title and axis labels for context.

---

## Article 2 — Accurate Scales & Framing (Mathematical Honesty)

1. **Mandatory Zero Baseline for Bar / Column Charts:**
   - Bar and column charts encode values by length. Truncating the value axis misrepresents proportional differences and is an absolute constitution violation.
   - The value axis on all bar/column charts must start at zero (`0.0`).

2. **Line Chart Baseline Constraints:**
   - Line charts encode values by position, not length. A non-zero baseline is permitted **only** when:
     1. The chart is explicitly a trend/fluctuation view (not a magnitude comparison).
     2. The Y-axis is explicitly labeled with its visible domain range `[min, max]`.
     3. The zero-suppression does not exaggerate minor noise into false volatility.

3. **Consistent Intervals & "Nice Numbers":**
   - Tick increments across axes must be uniform, evenly spaced, and rounded to standard cognitive intervals:
     - Multiples of 1, 2, 5, 10, 20, 25, 50, 100 (e.g., `0, 25, 50, 75, 100`, never arbitrary ticks like `0, 17, 34`).
   - Calculated via the `niceTickRange` utility in `@/lib/viz/format.ts`.

4. **Subdued Gridlines:**
   - Gridlines must provide spatial orientation without competing with data.
   - Gridlines must use subdued styling: `color-mix(in srgb, var(--border-subtle) 50%, transparent)` (fallback `rgba(255, 255, 255, 0.05)`).
   - Horizontal gridlines only by default; vertical gridlines are prohibited unless aligning discrete time phases.
   - Gridlines must never be visually darker or heavier than data marks.

5. **Base Case Reference in Sensitivity & Stress Charts:**
   - Any sensitivity matrix, stress curve, or scenario analysis must visually anchor to the **Base Underwritten Case**.
   - The base case must feature an explicit visual marker (reference line, badge, or distinct border) with label so perturbations read relative to underwritten reality.

---

## Article 3 — Clear Data Representation

1. **High-Contrast Semantic Color Palette:**
   - Series markers must maintain high contrast against `--bg-surface` (`#121014`):
     - **Primary Series:** `var(--accent)` (`#00DD94`).
     - **Secondary / Comparison Series:** `var(--text-secondary)` (`#9E9DA0`) or elevated neutrals (`rgba(255, 255, 255, 0.4)`).
     - **Caution / Underperformance:** `var(--status-caution)` (`#F06543`).
     - **Danger / Severe Stress:** `var(--danger)` (`#EF4444`).
   - Color encodes semantic **meaning**, never arbitrary ornamentation.
   - Maximum 4 series per chart to avoid visual noise.

2. **Data Labels at Critical Decision Points:**
   - Data labels must be rendered directly at key decision points:
     - Series endpoints on line charts.
     - Tops of bars for discrete bar charts with $\le 12$ bars.
     - Waterfall tier breakdown values and equity split percentages.
   - All numerical data labels must use tabular numerals (`tabular-nums` / `font-mono`) to prevent layout jitter.

3. **Logical Ordering:**
   - Categorical bars must be sorted **descending by value**, unless the category possesses a natural intrinsic order (chronology, waterfall tier progression, construction phase sequence).
   - Arbitrary or random category ordering is a constitution violation.

---

## Article 4 — Functional Design & Accessibility (Kill Chartjunk)

1. **High Data-to-Ink Ratio:**
   - 3D charts, drop shadows on data marks, unnecessary bevels, and decorative borders are banned.
   - Gradients on data marks (bars, lines) are forbidden; gradients are allowed solely in non-data decorative empty/placeholder states.

2. **Accessibility & Screen Reader Support:**
   - Every chart must have a non-visual text alternative:
     - Container must specify `role="figure"` or `role="region"`.
     - Graphical element must provide `role="img"` and a descriptive `aria-label` summarizing metric, range, trend direction, and current value.
     - Full-size charts must include a visually hidden HTML data table (`<table className="sr-only">`) containing the exact data series, enabling screen reader navigation.
   - Color is never the sole carrier of information: combine color with text labels, dashed line styles, or geometric markers.
   - Interactive elements (tooltips, bars) must be keyboard-focusable and inspectable.

3. **Source Attribution & Provenance Caption:**
   - Every full-size chart must feature a provenance footer stating the origin of the data:
     - e.g., *"Source: 24-Month Project Underwriting Model · Computed {date}"* or *"Source: Authoritative 33-KPI Financial Engine"*.
   - Mock or derived data must never render without an explicit provenance caption.

---

## Article 5 — Exemptions

1. **Sparklines:**
   - Micro-charts $\le 120\text{px}$ wide embedded inline within KPI cards or table cells are exempt from:
     - Explicit X and Y axis titles.
     - Legends.
     - Dedicated chart titles (the parent card or table row supplies context).
     - Provenance footers.
   - **Mandatory Requirement:** Sparklines must still provide `role="img"` with an `aria-label` describing the metric name, current value, and trend direction (e.g., `aria-label="Cap Rate 24-month trend: 7.8% to 8.4%, trending upward"`).

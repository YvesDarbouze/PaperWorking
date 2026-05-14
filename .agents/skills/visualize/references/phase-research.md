# Phase 2: Research

Assess data, plan encoding, select engine and template, and confirm the approach with the
user before implementation. Deep consideration here prevents rework later.

## Entry Conditions

Phase 1 (Think) complete:

- Argument sentence
- Viewer and task
- Cognitive mode (inference or recognition)
- Constraints, editorial integrity check, and data status

## Instructions

Execute steps 1–2 sequentially, then steps 3–4 in parallel.

### 1. Assess Data

Classify each data attribute:

| Type | Description | Meaningful Operations | Example |
|------|-------------|----------------------|---------|
| **Quantitative (Q)** | Continuous numeric with meaningful arithmetic | Difference, ratio, sum | Revenue ($M), temperature (°C), counts |
| **Ordinal (O)** | Ordered categories, intervals not meaningful | Greater-than, less-than | Satisfaction (1-5), education level |
| **Nominal (N)** | Categories with no inherent order | Identity (same/different) | Country names, product categories |
| **Temporal (T)** | Time-based values | Sequence, duration, interval | Dates, timestamps |

Then identify:

- **Shape** — tabular, hierarchical, network, geographic, temporal series
- **Volume** — row count, attribute count, expected visual density
- **Quality** — missing values, outliers, formatting issues, duplicates
- **Key relationships** — which attributes the argument requires comparing
- **Units** — what unit each attribute measures (mandatory for all axes and labels)

Load [mode-encode.md](mode-encode.md) for the full encoding methodology.

### 2. Plan Encoding

Map data attributes to visual channels using the encoding hierarchy from SKILL.md core
principles: position > length > angle > area > luminance > hue.

**Produce an encoding table:**

| Data Attribute | Type | Unit | Visual Channel | Scale | Notes |
|---------------|------|------|----------------|-------|-------|
| *(filled per analysis)* | | | | | |

Before presenting to the user, validate:

- Does the most important variable use the highest-ranked channel?
- Do channel types match data types (no area for categories, no hue for quantities)?
- Are units specified for every encoded attribute?
- Is the palette OpenColors? Are redundant encodings present for accessibility?

### 3. Select Engine and Template (parallel with step 4)

Determine engine using [engine-selection.md](engine-selection.md):

- **Default: Vega** — declarative, handles most chart types
- **D3** — when you need full DOM control, custom keyboard nav, or sankey

Select template from the appropriate directory:

| Relationship | Vega templates | D3 templates |
|-------------|---------------|-------------|
| Comparison | `assets/vega/templates/comparisons/` | `assets/d3/templates/comparisons/` |
| Composition | `assets/vega/templates/compositions/` | `assets/d3/templates/compositions/` |
| Distribution | `assets/vega/templates/distributions/` | `assets/d3/templates/distributions/` |
| Temporal | `assets/vega/templates/temporal/` | `assets/d3/templates/temporal/` |
| Geographic | `assets/vega/templates/geographic/` | `assets/d3/templates/geographic/` |
| Hierarchical | `assets/vega/templates/hierarchical/` | `assets/d3/templates/hierarchical/` |
| Network | `assets/vega/templates/networks/` | `assets/d3/templates/networks/` |
| Relationship | `assets/vega/templates/relationships/` | `assets/d3/templates/relationships/` |

For chart types not in the template library, use the Custom Template Workflow in SKILL.md.

**Tiebreakers** (in priority order):

1. Prefer simpler — bar chart over bubble chart when both work
2. Prefer familiar — viewers read known chart types faster
3. Prefer the argument — choose what best serves the specific comparison
4. Consider the medium — interactive web handles more complexity than a static slide

### 4. Plan Data Transforms (parallel with step 3)

| Transform | When Needed | Example |
|-----------|-------------|---------|
| **Pivot** | Wide-to-long or long-to-wide | Columns per year → rows per year |
| **Aggregate** | Raw data too granular | Transactions → daily totals |
| **Derive** | Calculated fields | Percentage of total, running average |
| **Coerce** | Type mismatches | String dates → Date objects |
| **Filter** | Subset needed | Remove outliers, select date range |
| **Nest/Group** | Hierarchical encoding | Flat rows → nested tree structure |

Document the transformation sequence. Order matters: filter before aggregate produces
different results than aggregate before filter.

Load [data-preparation.md](data-preparation.md) for implementation patterns.

## No-Data-Yet Flow

When data is not yet available:

1. Ask about data shape and format — columns, types, approximate volume
2. Offer to generate synthetic sample data matching expected schema
3. If user can describe schema → provisional encoding plan with synthetic data
4. If not → infer plausible schemas from argument, suggest options

When real data arrives, return to step 1. Provisional decisions are hypotheses — expect
real data to reveal unexpected distributions, missing values, and type mismatches.

## User Review Checkpoint

Present for user approval before implementation:

1. **Encoding table** — every attribute mapped to a channel with units
2. **Engine and template** — Vega or D3, which template, rationale
3. **Transformation plan** — ordered list of transforms
4. **Accessibility notes** — OpenColors palette, redundant encoding plan, WCAG level

Do not proceed without explicit user approval. The encoding plan is the contract between
intent and artifact.

## Exit

Proceed to **Phase 3: Build** with:

- Confirmed encoding table (with units)
- Selected engine and template
- Ordered transformation plan
- User approval recorded

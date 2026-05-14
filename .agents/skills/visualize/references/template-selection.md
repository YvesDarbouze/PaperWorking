# Template Selection

Choose the right template based on your data and the question you're answering. Each
chart type has at least one Vega and one D3 variant; many also have a markdown
variant for pull requests, READMEs, tickets, and other markdown surfaces. Default
to Vega for browser output; default to the markdown engine when the destination is
a markdown surface (see [engine-selection.md](engine-selection.md)).

## Quick Selection

| Question | Template | Example |
|----------|----------|---------|
| "Compare amounts across categories" | **bar-chart** | Sales by product |
| "Show trend over time" | **line-chart** | Revenue by month |
| "Find relationship between variables" | **scatter-plot** | Height vs weight |
| "Show value distribution" | **histogram** | Age distribution |
| "Show parts of a whole" (≤5 slices) | **pie-chart** | Market share |
| "Show flow between stages" | **sankey** (D3 only) | Budget allocation |

## Decision Tree

```
What's your primary question?
  ├── "How do values compare?"
  │   ├── One series → bar-chart
  │   ├── One series, precision matters → dot-plot (lollipop)
  │   ├── Before/after or min/max range → dumbbell-chart
  │   ├── Multiple series, side-by-side → grouped-bar
  │   └── Multiple series, stacked → stacked-bar
  │
  ├── "How does something change over time?"
  │   ├── Trend → line-chart
  │   ├── Cumulative → area-chart
  │   ├── Before/after comparison → slope-chart
  │   ├── Compact inline trends → sparkline
  │   └── Financial OHLC → candlestick
  │
  ├── "What's the relationship between variables?"
  │   ├── Two variables → scatter-plot
  │   ├── Three variables (x, y, size) → bubble-chart
  │   ├── Two categorical axes + intensity → heatmap
  │   ├── 4+ dimensions, precision matters → parallel-coordinates
  │   └── 4+ dimensions, radial layout → radar-chart (⚠️ perceptually weak)
  │
  ├── "How are values distributed?"
  │   ├── One variable → histogram
  │   ├── Compare distributions → box-plot
  │   └── Distribution shape → violin-plot
  │
  ├── "What proportion is each part?"
  │   ├── Flat, ≤5 categories → pie-chart
  │   ├── Flat, precise percentages → waffle-chart
  │   ├── Hierarchical proportions → sunburst
  │   └── Area-based hierarchy → treemap
  │
  ├── "How do quantities flow?" → sankey (D3 only)
  │
  ├── "What's the geographic pattern?" → choropleth
  │
  ├── "What's the hierarchy?" → tree-diagram
  │
  └── "How are things connected?" → force-graph
```

If no template fits, use the Custom Template Workflow in SKILL.md.

## Markdown engine quick selection

When the destination is a markdown surface, route to one of these:

| Question                                  | Markdown template     |
| ----------------------------------------- | --------------------- |
| "Compare items across columns"            | comparison-table      |
| "Compare amounts at a glance"             | unicode-bar-chart     |
| "Top-N with deltas"                       | ranked-list           |
| "Show a trend over time inline"           | sparkline-row         |
| "Bin values by two categorical axes"      | emoji-heatmap         |
| "Show a hierarchy"                        | ascii-tree            |
| "Show a process or flow"                  | mermaid-flowchart     |
| "Show a sequence between actors"          | mermaid-sequence      |
| "Show a project timeline"                 | mermaid-gantt         |

For mermaid templates, choose `.md` if the surface auto-renders mermaid
(GitHub, GitLab, Notion, Obsidian, recent VS Code) and `.html` otherwise.
See [markdown-patterns.md](markdown-patterns.md) for the surface matrix and the honesty checklist.

## Data Shape Examples

### bar-chart

```json
[{"category": "Product A", "value": 120, "unit": "sales ($K)"}]
```

### line-chart

```json
[{"date": "2024-01-01", "value": 100, "unit": "revenue ($M)"}]
```

### scatter-plot

```json
[{"x": 25, "y": 150, "category": "Group A", "x_unit": "age (years)", "y_unit": "weight (kg)"}]
```

### histogram

```json
[{"value": 23, "unit": "response time (ms)"}]
```

## Template Directory

All templates at `assets/vega/templates/` (Vega), `assets/d3/templates/` (D3),
and `assets/markdown/templates/` (Markdown). The full engine ↔ chart mapping
lives in [engine-selection.md](engine-selection.md). The summary:

- 25 Vega specs (`.vg.json`)
- 26 D3 templates (`.html`) — sankey is D3-only
- 9 Markdown templates (6 plain-text + 3 mermaid in `.md` and `.html` variants)

## Tiebreakers (in priority order)

1. **Prefer simpler** — bar chart over bubble chart when both work
2. **Prefer familiar** — viewers read known chart types faster
3. **Prefer the argument** — choose what best serves the specific comparison
4. **Consider the medium** — interactive web handles more complexity than a static slide

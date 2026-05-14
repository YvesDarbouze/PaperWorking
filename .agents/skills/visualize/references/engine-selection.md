# Engine Selection

Three engines: **Markdown** (text + mermaid for markdown surfaces), **Vega**
(declarative JSON, default for browser-runnable charts), and **D3** (imperative
JavaScript, full DOM control). Architecture is extensible for future engines
(Graphviz, Plot, etc.).

## Decision Tree

```
Level 0: Where will this render?
  ├── Markdown surface (PR, README, ticket, Notion, Slack, *.md file) → Markdown engine
  ├── Browser / standalone HTML / dashboard                            → Vega or D3 (Level 2)
  └── Unknown                                                          → Markdown without mermaid,
                                                                         or ask the user

Level 1 (Markdown branch): What's being shown?
  ├── Quantitative values  → comparison-table | unicode-bar-chart | ranked-list | sparkline-row | emoji-heatmap
  ├── Process / structure  → mermaid-flowchart | mermaid-sequence | mermaid-gantt | ascii-tree
  └── (Mermaid output format depends on target rendering: see Level 1.5)

Level 1.5 (Mermaid only): Does the surface auto-render mermaid?
  ├── Yes (GitHub, GitLab, Notion, Obsidian, recent VS Code) → emit `.md` with ```mermaid block
  ├── No  (Slack, email, generic chat, plain ticket)         → emit `.html` with mermaid.js
  └── Unknown                                                → emit `.html` (works wherever HTML opens)

Level 2: Which data-viz engine for browser output?
  ├── Need full DOM control, custom keyboard nav, or sankey? → D3
  └── Everything else                                        → Vega (default)
```

Pick the highest level whose answer is concrete. If the surface is a markdown
file, you stop at Level 0 — there is no need to consider Vega vs D3.

## When to Use Each Engine

**Markdown.** The surface only renders markdown (and maybe mermaid). Real
examples: pull request descriptions, READMEs, GitHub or Jira tickets, Notion
pages, Slack posts, wiki articles, plain text exports. The output is a `.md`
file or, for diagrams that need SVG, an `.html` file with mermaid.js bundled.
See [markdown-patterns.md](markdown-patterns.md) for the surface matrix and template catalogue.

**Vega.** Default for any browser-runnable chart. Vega is declarative JSON —
less code, fewer bugs, easier to audit. It handles bar, line, scatter, area,
pie, histogram, box plot, violin, heatmap, bubble, treemap, sunburst,
choropleth, force graph, tree diagram, candlestick, and more through its
transform and layout system.

**D3.** When you need full DOM control that Vega's SVG renderer cannot
provide. This means: sankey diagrams (no Vega transform exists), full
keyboard navigation of data points, ARIA roles on individual marks,
pixel-precise custom layouts, or very large datasets where Canvas 2D API is
needed.

## Capability Matrix

| Capability                                  | Markdown            | Vega                      | D3                        |
| ------------------------------------------- | ------------------- | ------------------------- | ------------------------- |
| Renders without JavaScript                  | Yes (plain text)    | No                        | No                        |
| Renders inside a markdown surface           | Yes                 | No                        | No                        |
| Quantitative comparison (≤10 items)         | Yes (unicode bars)  | Yes                       | Yes                       |
| Trend over time                             | Yes (sparklines, ≤20 pts) | Yes                 | Yes                       |
| Hierarchical layouts                        | ASCII tree          | Yes (transforms)          | Yes                       |
| Process / sequence / gantt                  | Yes (mermaid)       | No                        | No                        |
| Geographic projections                      | No                  | Yes                       | Yes                       |
| Sankey                                      | No                  | No                        | Yes (d3-sankey)           |
| Full keyboard navigation                    | N/A                 | No (renders own SVG)      | Yes                       |
| ARIA on individual marks                    | N/A                 | No                        | Yes                       |
| Custom animations                           | No                  | Limited (signal transitions) | Full control          |
| Declarative conciseness                     | Highest             | High                      | Low (imperative)          |

## Template Assignment

Every quantitative chart type has at least one path. Sankey is D3-only; the
markdown engine has its own short list focused on what works in plain text.

| Category              | Chart                  | Markdown                       | Vega                                                | D3                                              |
| --------------------- | ---------------------- | ------------------------------ | --------------------------------------------------- | ----------------------------------------------- |
| **Comparisons**       | bar chart              | unicode-bar-chart              | `assets/vega/templates/comparisons/bar-chart.vg.json`     | `assets/d3/templates/comparisons/bar-chart.html`     |
|                       | grouped bar            | comparison-table               | `assets/vega/templates/comparisons/grouped-bar.vg.json`   | `assets/d3/templates/comparisons/grouped-bar.html`   |
|                       | stacked bar            | comparison-table               | `assets/vega/templates/comparisons/stacked-bar.vg.json`   | `assets/d3/templates/comparisons/stacked-bar.html`   |
|                       | dot plot               | ranked-list                    | `assets/vega/templates/comparisons/dot-plot.vg.json`      | `assets/d3/templates/comparisons/dot-plot.html`      |
|                       | dumbbell               | comparison-table               | `assets/vega/templates/comparisons/dumbbell.vg.json`      | `assets/d3/templates/comparisons/dumbbell-chart.html` |
| **Compositions**      | pie chart              | comparison-table               | `assets/vega/templates/compositions/pie-chart.vg.json`    | `assets/d3/templates/compositions/pie-chart.html`    |
|                       | sunburst               | ascii-tree                     | `assets/vega/templates/compositions/sunburst.vg.json`     | `assets/d3/templates/compositions/sunburst.html`     |
|                       | treemap                | ascii-tree                     | `assets/vega/templates/compositions/treemap.vg.json`      | `assets/d3/templates/compositions/treemap.html`      |
|                       | waffle                 | emoji-heatmap                  | `assets/vega/templates/compositions/waffle.vg.json`       | `assets/d3/templates/compositions/waffle-chart.html` |
| **Distributions**     | histogram              | unicode-bar-chart              | `assets/vega/templates/distributions/histogram.vg.json`   | `assets/d3/templates/distributions/histogram.html`   |
|                       | box plot               | comparison-table               | `assets/vega/templates/distributions/box-plot.vg.json`    | `assets/d3/templates/distributions/box-plot.html`    |
|                       | violin plot            | —                              | `assets/vega/templates/distributions/violin-plot.vg.json` | `assets/d3/templates/distributions/violin-plot.html` |
| **Geographic**        | choropleth             | —                              | `assets/vega/templates/geographic/choropleth.vg.json`     | `assets/d3/templates/geographic/choropleth.html`     |
| **Hierarchical**      | tree diagram           | ascii-tree                     | `assets/vega/templates/hierarchical/tree-diagram.vg.json` | `assets/d3/templates/hierarchical/tree-diagram.html` |
| **Networks**          | force graph            | —                              | `assets/vega/templates/networks/force-graph.vg.json`      | `assets/d3/templates/networks/force-graph.html`      |
|                       | sankey                 | —                              | —                                                   | `assets/d3/templates/networks/sankey.html`           |
| **Process / flow**    | flowchart              | mermaid-flowchart              | —                                                   | —                                               |
|                       | sequence diagram       | mermaid-sequence               | —                                                   | —                                               |
|                       | gantt                  | mermaid-gantt                  | —                                                   | —                                               |
| **Relationships**     | scatter plot           | —                              | `assets/vega/templates/relationships/scatter-plot.vg.json` | `assets/d3/templates/relationships/scatter-plot.html` |
|                       | heatmap                | emoji-heatmap                  | `assets/vega/templates/relationships/heatmap.vg.json`     | `assets/d3/templates/relationships/heatmap.html`     |
|                       | bubble chart           | —                              | `assets/vega/templates/relationships/bubble-chart.vg.json` | `assets/d3/templates/relationships/bubble-chart.html` |
|                       | parallel coordinates   | —                              | `assets/vega/templates/relationships/parallel-coords.vg.json` | `assets/d3/templates/relationships/parallel-coordinates.html` |
|                       | radar chart            | —                              | `assets/vega/templates/relationships/radar.vg.json`       | `assets/d3/templates/relationships/radar-chart.html` |
| **Temporal**          | line chart             | sparkline-row                  | `assets/vega/templates/temporal/line-chart.vg.json`       | `assets/d3/templates/temporal/line-chart.html`       |
|                       | area chart             | sparkline-row                  | `assets/vega/templates/temporal/area-chart.vg.json`       | `assets/d3/templates/temporal/area-chart.html`       |
|                       | candlestick            | —                              | `assets/vega/templates/temporal/candlestick.vg.json`      | `assets/d3/templates/temporal/candlestick.html`      |
|                       | slope chart            | comparison-table               | `assets/vega/templates/temporal/slope-chart.vg.json`      | `assets/d3/templates/temporal/slope-chart.html`      |
|                       | sparkline              | sparkline-row                  | `assets/vega/templates/temporal/sparkline.vg.json`        | `assets/d3/templates/temporal/sparkline.html`        |

A dash means no template exists in that engine for that chart type. The
markdown engine intentionally does not cover every chart — for charts that
require pixel-precise rendering (choropleth, scatter, force graph, etc.), use
Vega or D3 even if the destination claims to be a markdown surface.

## When to Override the Default

- **Markdown surface, but the chart needs SVG fidelity.** Emit a Vega/D3
  visualization separately and link to it from the markdown artifact.
- **Accessibility priority.** If the user specifically needs keyboard
  navigation or screen-reader support for individual data points, use D3
  regardless of chart type.
- **Performance.** Vega handles tens of thousands of points. For hundreds of
  thousands, use D3 with Canvas 2D API. See [canvas-patterns.md](canvas-patterns.md).
- **Pixel-precise layout.** Infographic-style designs where exact placement
  matters → D3.
- **Custom interactivity.** Complex drag interactions, custom brush shapes →
  D3 gives more control than Vega signals, though Vega signals handle most cases.

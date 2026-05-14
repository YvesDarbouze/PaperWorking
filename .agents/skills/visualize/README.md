# visualize

Create data visualizations for the surface where they will actually be read. Three engines: **Vega** (declarative, default for browser charts), **D3** (imperative, full control), and **Markdown** (tables, unicode bars, sparklines, mermaid diagrams that drop into pull requests, READMEs, tickets, and Slack posts). Every browser output is a standalone HTML file — no build step, no server. The workflow is principles-first: find the claim before touching data.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/visualize/` into `~/.claude/skills/visualize/`.

## Usage

Full visualization workflow:

```
/visualize create a bar chart showing quarterly revenue by region
```

Targeted entry — jump into a specific phase:

```
/visualize make this chart accessible
/visualize refine this visualization
/visualize what chart type should I use for this time series data?
```

Visualization management (requires Python 3):

```
"save this visualization"    → registers in ~/.visualizations/
"list my charts"             → shows all stored visualizations
"search for revenue"         → finds matching visualizations
```

Storage moved from `~/.visualizer-skill/visualizations/` to `~/.visualizations/`. The new layout is flat (no chart-type subdirectories) and accepts both `.html` and `.md` outputs. To migrate prior data manually:

```bash
mkdir -p ~/.visualizations
find ~/.visualizer-skill/visualizations -name '*.html' -exec mv {} ~/.visualizations/ \;
```

## Why use this instead of prompting?

A plain prompt will produce a chart, but it skips the work that makes a chart good — identifying what claim the visualization supports, choosing encodings that match the data's structure, adding units and context, checking accessibility. This skill enforces a six-phase workflow (context, research, implement, refine, present, save) so the output communicates clearly, not just renders correctly.

## What's included

- **25 Vega templates** — declarative JSON specs across 8 chart categories
- **26 D3 templates** — standalone HTML with keyboard navigation and ARIA support; sankey is D3-only
- **9 Markdown templates** — comparison tables, unicode bars, ranked lists, sparklines, emoji heatmaps, ASCII trees, plus mermaid flowchart / sequence / gantt in both `.md` and `.html` formats
- **HTML wrapper** — renders Vega specs via `vegaEmbed` (Vega + Vega-Lite + Vega-Embed)
- **D3 build pipeline** — [`scripts/build_d3.py`](scripts/build_d3.py) regenerates the 25 deduplicated D3 templates from shared scaffolding (`assets/d3/_shared/`) plus per-chart fragments (`assets/d3/fragments/`)
- **Reference docs** — encoding, composition, narrative, accessibility, interaction, refinement, plus the markdown surface matrix (`markdown-patterns.md`)
- **Python CLI** ([`scripts/visualizer.py`](scripts/visualizer.py)) — visualization storage and management for `.html` and `.md` outputs

## Templates

| Category      | Charts                                                        | Vega          | D3   | Markdown                                |
| ------------- | ------------------------------------------------------------- | ------------- | ---- | --------------------------------------- |
| Comparisons   | bar, grouped-bar, stacked-bar, dot-plot, dumbbell             | Yes           | Yes  | unicode-bar-chart, comparison-table, ranked-list |
| Compositions  | pie, sunburst, treemap, waffle                                | Yes           | Yes  | comparison-table, ascii-tree, emoji-heatmap |
| Distributions | histogram, box-plot, violin-plot                              | Yes           | Yes  | unicode-bar-chart, comparison-table     |
| Geographic    | choropleth                                                    | Yes           | Yes  | —                                       |
| Hierarchical  | tree-diagram                                                  | Yes           | Yes  | ascii-tree                              |
| Networks      | force-graph, sankey                                           | force-graph only | Yes (sankey D3-only) | —                            |
| Process/flow  | flowchart, sequence, gantt                                    | —             | —    | mermaid-flowchart / mermaid-sequence / mermaid-gantt |
| Relationships | scatter-plot, heatmap, bubble-chart, parallel-coords, radar   | Yes           | Yes  | emoji-heatmap (heatmap)                 |
| Temporal      | line-chart, area-chart, candlestick, slope, sparkline         | Yes           | Yes  | sparkline-row, comparison-table         |

## References

The skill loads these files conditionally during the workflow. Each focuses on a single topic and is loaded only when the relevant phase, mode, engine, or specialization applies.

| Reference | Purpose |
|-----------|---------|
| [phase-context.md](references/phase-context.md) | Phase 1 — find the claim, identify the viewer, honesty check |
| [phase-research.md](references/phase-research.md) | Phase 2 — classify data, plan encoding, select engine and template |
| [phase-implement.md](references/phase-implement.md) | Phase 3 — write spec or HTML, apply the build subtasks |
| [phase-refine.md](references/phase-refine.md) | Phase 4 — mandatory second draft and verification protocol |
| [phase-present.md](references/phase-present.md) | Phases 5 and 6 — produce the final output and persist it |
| [mode-encode.md](references/mode-encode.md) | Channel ranking, scales, marks, encoding hierarchy |
| [mode-compose.md](references/mode-compose.md) | Layout, spatial hierarchy, whitespace, grouping |
| [mode-narrate.md](references/mode-narrate.md) | Titles, annotations, story devices, alt text |
| [mode-access.md](references/mode-access.md) | ARIA, keyboard navigation, color access, data table fallback |
| [mode-interact.md](references/mode-interact.md) | Tooltips, brushing, filtering, responsive layout |
| [mode-refine.md](references/mode-refine.md) | Audit checklist, editorial integrity check, fix routing |
| [engine-selection.md](references/engine-selection.md) | Markdown, Vega, and D3 capability matrix and selection criteria |
| [template-selection.md](references/template-selection.md) | Decision tree from question type to template |
| [vega-patterns.md](references/vega-patterns.md) | Full Vega spec patterns — signals, transforms, force layouts |
| [d3-patterns.md](references/d3-patterns.md) | D3 standalone HTML patterns for sankey and template-crafter |
| [markdown-patterns.md](references/markdown-patterns.md) | Surface matrix, honesty checklist, markdown engine catalogue |
| [base-vega-wrapper.md](references/base-vega-wrapper.md) | Vega and Vega-Lite HTML wrapper structure |
| [base-template.md](references/base-template.md) | D3 base HTML template structure |
| [data-preparation.md](references/data-preparation.md) | Data transforms: pivot, aggregate, derive, coerce, filter |
| [network-patterns.md](references/network-patterns.md) | Force-directed layouts, edge bundling, hairball mitigation |
| [canvas-patterns.md](references/canvas-patterns.md) | Canvas 2D rendering for hundreds of thousands of points |

## Design system

- **Palette**: OpenColors (colorblind-safe combinations)
- **Spacing**: Generous margins (40px body, 32px container, adequate internal padding)
- **Units**: Mandatory on all axes, tooltips, and annotations
- **Accessibility**: WCAG AA contrast, redundant encoding, data table fallback, keyboard navigation (D3)

## Prerequisites

- **Required**: None
- **Optional**: Python 3.6+ (for visualization management CLI)

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`visualize.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/visualize.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

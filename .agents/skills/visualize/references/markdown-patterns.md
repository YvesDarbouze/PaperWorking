# Markdown Patterns

Many real consumers of a visualization render markdown but not arbitrary HTML — pull
requests, READMEs, tickets, Slack messages, Notion pages, wiki posts. The markdown
engine emits a `.md` file (or, for diagrams that need SVG, an `.html` file with
mermaid.js bundled) that lands cleanly on those surfaces.

## When to use the markdown engine

Use it whenever the rendering target is a markdown surface, not a browser. Concrete
signals from the user:

- "for the README", "for the PR description", "in the ticket", "for the wiki"
- "in markdown", "as a markdown table", "as a code block"
- "make a diagram for the GitHub issue"
- "post this to Slack"
- the destination is a `.md` file path

If the destination is `file://path.html`, a Chrome window, a dashboard, or a
standalone deliverable, use Vega or D3 instead — the markdown engine cannot show
SVG-quality charts.

## Rendering-target matrix

The most important question for a markdown output is whether the target surface
auto-renders mermaid (and other formats). When in doubt, default to plain-text-safe
techniques.

| Surface              | GFM tables | Mermaid in `.md` | Notes |
| -------------------- | ---------- | ---------------- | ----- |
| GitHub (issues, PRs, READMEs) | Yes        | Yes              | Mermaid renders inline.  |
| GitLab               | Yes        | Yes              | Mermaid since 10.3. |
| Notion               | Yes        | Yes              | Mermaid since 2024. |
| Obsidian             | Yes        | Yes              | Built-in mermaid plugin. |
| VS Code Markdown Preview | Yes    | Yes (recent)     | Requires markdown-mermaid extension on older versions. |
| Confluence (wiki)    | Yes        | No               | Plugin-dependent; assume no. |
| Slack                | Partial (no nested tables) | No | No mermaid; degrade to ASCII or unicode bars. |
| Email (most clients) | Partial    | No               | Mermaid will appear as raw text. |
| Plain ticket / chat  | Sometimes  | No               | When unsure, use plain-text-safe formats. |
| `*.md` file rendered by ??? | depends | depends         | If the target is unknown, prefer plain-text-safe and HTML for mermaid. |

**Hard rule:** never emit a `.md` file containing a mermaid block to a surface that
does not auto-render mermaid. The user will see raw text. When in doubt, choose the
`.html` variant — it works wherever HTML opens, including a local browser.

## Template catalogue

Nine templates in `assets/markdown/templates/`. Six are markdown-only; three are
mermaid diagrams emitted in either format depending on the surface.

| Template            | `.md` | `.html` | Use when |
| ------------------- | :---: | :-----: | -------- |
| comparison-table    |   ✓   |   —     | Side-by-side rows with consistent columns |
| unicode-bar-chart   |   ✓   |   —     | Quantitative comparison; want a glanceable bar shape inline |
| ranked-list         |   ✓   |   —     | Top-N with deltas; safest fallback that always renders |
| sparkline-row       |   ✓   |   —     | Trend per metric; up to ~20 data points per row |
| emoji-heatmap       |   ✓   |   —     | Discrete categorical bins (3–5 levels); never continuous gradients |
| ascii-tree          |   ✓   |   —     | Hierarchy when mermaid is unavailable |
| mermaid-flowchart   |   ✓   |   ✓     | Process or decision flow |
| mermaid-sequence    |   ✓   |   ✓     | Inter-actor message sequences |
| mermaid-gantt       |   ✓   |   ✓     | Project timeline with dependencies |

## Plain-text-safe techniques

These work everywhere, including plain-text exports and screen readers.

### GFM tables

Use right-alignment for numeric columns (`---:`). Always include units in column
headers or as a trailing sentence.

```markdown
| Region    | Q1 ($K) | Q2 ($K) |
| --------- | ------: | ------: |
| Northeast |   1,245 |   1,302 |
| West      |   1,431 |   1,512 |
```

### Unicode bar characters

Eight steps from `▁` to `█` (`▁▂▃▄▅▆▇█`) and eight horizontal blocks
(`█▉▊▋▌▍▎▏`). Pair the bars with the underlying numeric value so readers don't
have to count blocks.

### Sparklines

Same eight-step scale used in a single line per series: `▁▂▃▄▅▆▇█`. Limit to
roughly 20 data points; longer rows compress until adjacent values merge.

### Emoji heatmaps

Use a discrete 3–5 step palette and label every step explicitly. Emoji colour
mapping is not a continuous gradient — readers cannot resolve fine differences,
so do not use this format for high-resolution magnitude comparisons. Discrete
bins only.

### ASCII trees

Use box-drawing characters (`├──`, `└──`, `│`) to make hierarchy visible. Pair
each node with a numeric label so the tree carries quantitative weight.

## Mermaid output

### When to emit `.md` vs `.html`

```
Does the surface auto-render mermaid?
├── Yes (GitHub, GitLab, Notion, Obsidian, recent VS Code) → emit `.md` with ```mermaid block
├── No  (Slack, email, generic chat, plain ticket)         → emit `.html` with mermaid.js
└── Unknown                                                → emit `.html` (works wherever HTML opens)
```

### Supported diagram types

Mermaid supports more than these three; the templated set focuses on the diagrams
most useful for software work:

- **flowchart** — process or decision flow.
- **sequenceDiagram** — message exchange between actors.
- **gantt** — project timeline with dependencies.

Other types (classDiagram, stateDiagram, erDiagram, journey, etc.) are valid
mermaid input. To use one, copy a templated `.html` variant and replace the
content of the `<pre class="mermaid">` block; everything else (CDN import,
initialization, noscript fallback) stays the same.

### HTML wrapper requirements

Every mermaid HTML output must include:

- `<pre class="mermaid">` block with the diagram source — `<pre>` preserves
  whitespace, which the mermaid parser depends on.
- `<noscript>` block describing the diagram in prose — readers without
  JavaScript still get the meaning.
- ESM import of mermaid: `import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";`
- `mermaid.initialize({ startOnLoad: true });` — runs on DOMContentLoaded.

## Honesty checklist

- [ ] **Units** — every numeric value has a unit, either in the column header or
      adjacent to the value. Numbers without units are decoration.
- [ ] **Source** — every chart ends with a one-line source attribution naming the
      dataset and the date range it covers.
- [ ] **Bar baselines** — unicode bars start at zero; partial-block rendering
      represents proportional value.
- [ ] **Sort by value** — ranked lists, comparison tables, and bar charts are
      sorted by the value being compared, not alphabetically.
- [ ] **Show the underlying values** — every chart that renders a visual
      summary (unicode bars, sparklines, emoji grids) is paired with the raw
      values somewhere in the same artifact, either inline or in a "View
      data" table.
- [ ] **One claim per chart** — the title states the takeaway. If the chart
      needs a paragraph to explain, split it into two charts.

## Phase 4 verification (markdown variant)

After producing a markdown output, verify by reading it back and checking:

- [ ] Frontmatter present with all required fields (`name`, `description`,
      `chart-type`, `engine`, `project`, `created`)
- [ ] Title states the takeaway, not the topic
- [ ] Units present on all numeric columns / bars / labels
- [ ] Sort order matches the value being compared
- [ ] Source line present
- [ ] If the target is a mermaid-aware surface and the output is a `.md` with
      ```` ```mermaid ```` block, confirm the mermaid block parses (open the
      committed file in a renderer or paste into the GitHub markdown preview)
- [ ] If the output is `.html` with mermaid, open in Chrome and confirm the
      diagram renders to SVG without console errors
- [ ] If the output is plain-text-safe, view it in the destination surface
      (or a generic markdown previewer) and confirm character alignment holds

## Cross-references

- **Engine selection (Vega vs D3 vs Markdown)** — [engine-selection.md](engine-selection.md)
- **Template selection inside the markdown engine** — see the catalogue above
- **HTML wrapper for mermaid** — see `assets/markdown/templates/mermaid-flowchart.html.tmpl`

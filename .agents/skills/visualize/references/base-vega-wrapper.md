# Base Vega Wrapper

Browser-runnable HTML wrapper for Vega-Lite (`.vl.json`) and full Vega (`.vg.json`) specs. The wrapper loads the Vega stack from CDN, injects the spec, renders to SVG, and auto-generates an accessibility data table. For D3-based visualizations (sankey and template-crafter), see [base-template.md](base-template.md).

## Wrapper HTML

The wrapper source lives at `assets/vega/wrapper.html`. That file is the single source of truth — copy it directly when producing a Vega visualization. This document describes how to use it; the file itself contains the markup.

## How to Inject a Spec

1. Copy `assets/vega/wrapper.html` to the output location.
2. Replace `const spec = { /* JSON spec injected here */ };` with `const spec = <full JSON>;` where `<full JSON>` is the complete Vega-Lite or Vega spec object.
3. Fill in the frontmatter comment at the top of the file.
4. Fill in the `<title>` element with a descriptive chart title.

The wrapper auto-detects whether the spec is Vega-Lite or full Vega based on the `$schema` field. vegaEmbed compiles Vega-Lite to Vega before rendering, so both formats work identically in this wrapper.

## Frontmatter Fields

Every visualization must include an HTML comment frontmatter block at the very top of the file, before `<!DOCTYPE html>`.

```html
<!--
name: Sales by Region Q4 2024
description: Quarterly sales comparison across geographic regions
chart-type: bar-chart
engine: vega-lite
project: sales-dashboard
created: 2026-03-15T10:30:00.000Z
-->
```

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Human-readable visualization title |
| `description` | Yes | Brief description of what the visualization shows |
| `chart-type` | Yes | Chart type: `bar-chart`, `line-chart`, `scatter-plot`, `histogram`, `pie-chart`, etc. |
| `engine` | Yes | Rendering engine: `vega-lite` or `vega` (not used for D3 visualizations) |
| `project` | Yes | Project identifier for grouping related visualizations |
| `created` | Yes | ISO 8601 timestamp |

The `engine` field is the only addition over the D3 `base-template.md` frontmatter. It tells downstream tooling which spec format is embedded.

## CDN Versions

The wrapper loads three libraries from jsDelivr. All three are required even when embedding a full Vega spec, because vegaEmbed depends on both libraries. All CDN pins use `@latest` to track the most recent stable release.

| Library | CDN URL | Purpose |
|---|---|---|
| Vega | `https://cdn.jsdelivr.net/npm/vega@latest` | Runtime: parses Vega specs, runs the dataflow, renders marks |
| Vega-Lite | `https://cdn.jsdelivr.net/npm/vega-lite@latest` | Compiler: translates Vega-Lite specs to full Vega |
| Vega-Embed | `https://cdn.jsdelivr.net/npm/vega-embed@latest` | Helper: handles spec detection, compilation, rendering, and action links |

## vegaEmbed Options

The wrapper passes an options object to `vegaEmbed()`. Key fields:

| Option | Default in wrapper | Description |
|---|---|---|
| `renderer` | `'svg'` | `'svg'` produces DOM-accessible marks (preferred for accessibility). `'canvas'` renders to a single `<canvas>` element (better performance for large datasets, but marks are not individually accessible). |
| `actions.export` | `true` | Show "Save as SVG" and "Save as PNG" links below the chart. |
| `actions.source` | `false` | Hide "View Source" link (spec is already in the page source). |
| `actions.compiled` | `false` | Hide "View Compiled Vega" link. |
| `actions.editor` | `true` | Show "Open in Vega Editor" link for debugging. |
| `theme` | (none) | Optional. Pass `'dark'`, `'quartz'`, `'vox'`, etc. to apply a built-in theme. |

To override, modify the options object in the `vegaEmbed()` call:

```js
vegaEmbed('#vis', spec, {
  renderer: 'canvas',         // switch to canvas for performance
  actions: false,              // hide all action links
  theme: 'quartz'             // apply Quartz theme
});
```

## Accessibility Features

### What works

- **SVG renderer produces DOM-accessible marks.** Each bar, point, or line segment is a real SVG element that assistive technology can traverse. This is why the wrapper defaults to `renderer: 'svg'`.

- **Spec-level `title` and `description` map to SVG `<title>` and `<desc>`.** Include both in every spec:

  ```json
  {
    "title": "Monthly Revenue by Product Line",
    "description": "Bar chart showing revenue for three product lines from Jan to Dec 2025."
  }
  ```

  vegaEmbed writes these into the SVG root element, which screen readers announce.

- **Auto-generated data table in `<details>`.** The wrapper script reads the rendered dataset from the Vega view and builds an HTML `<table>` inside a collapsed `<details>` element. Screen readers can expand this to access raw values when the chart itself is not navigable.

- **`config.aria: true` is the default.** Vega automatically adds `aria-label` attributes to marks and `role="graphics-document"` to the SVG root. No opt-in is needed.

### Known gaps

- **No keyboard navigation of marks.** Individual bars, points, and lines are not focusable. Tooltips are hover-only (`mouseover`/`mouseout`) and cannot be reached with keyboard or touch. This is a limitation of the Vega rendering pipeline.

- **No `role="list"` / `role="listitem"` on data marks.** SVG marks are not grouped into list semantics, so screen readers cannot announce "list of 12 bars" or navigate between items with list shortcuts.

These gaps mean the auto-generated data table is the primary accessible path to the data. Always ensure the table is present and populated.

## Dashboard Mode

To embed multiple charts on one page, call `vegaEmbed` multiple times targeting different container elements. Use CSS Grid or Flexbox for layout.

```html
<style>
  .dashboard {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .dashboard .panel {
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
</style>

<div class="dashboard">
  <div class="panel">
    <div id="vis1"></div>
  </div>
  <div class="panel">
    <div id="vis2"></div>
  </div>
  <div class="panel">
    <div id="vis3"></div>
  </div>
  <div class="panel">
    <div id="vis4"></div>
  </div>
</div>

<script>
  vegaEmbed('#vis1', spec1, { renderer: 'svg' });
  vegaEmbed('#vis2', spec2, { renderer: 'svg' });
  vegaEmbed('#vis3', spec3, { renderer: 'svg' });
  vegaEmbed('#vis4', spec4, { renderer: 'svg' });
</script>
```

Each `vegaEmbed` call is independent. Specs can mix Vega-Lite and full Vega on the same page. Add a `<details>` data table after each panel if accessibility tables are needed per chart.

## Cross-references

- **D3 HTML pattern** (sankey and template-crafter mode): see [base-template.md](base-template.md)
- **Engine selection criteria**: see [engine-selection.md](engine-selection.md)
- **Chart type selection**: see [template-selection.md](template-selection.md)

## Sources

- Vega-Embed documentation — <https://github.com/vega/vega-embed>
- Vega-Lite specification — <https://vega.github.io/vega-lite/docs/spec.html>
- Vega accessibility configuration — <https://vega.github.io/vega/docs/config/#aria>
- vegaEmbed options reference — <https://github.com/vega/vega-embed#options>
- SVG Accessibility API Mappings — <https://www.w3.org/TR/svg-aam-1.0/>

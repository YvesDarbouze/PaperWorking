# Compose Mode

Implementation guidance for layout, spacing, grouping, and multi-view composition.
SKILL.md defines the principles. This doc tells you how to execute them.

## Quick Reference

- [ ] Single primary element has disproportionate visual weight
- [ ] Related elements closer together than unrelated ones
- [ ] Same encoding means the same thing across all panels
- [ ] Reading path flows top-left → bottom-right (Western audiences)
- [ ] SVG layers: background → grid → marks → annotations → labels
- [ ] Margins, gutters, padding follow the spacing spec below
- [ ] Aspect ratio suits the chart type
- [ ] Dashboard has one hero element; everything else is subordinate

## Gestalt Applied to Data Viz

**Proximity — group related bars tighter.** Within a grouped bar cluster, gap = 1-2px.
Between clusters, gap ≥ bar-width. The ratio communicates structure without legends.
In dashboards, related charts share an edge; unrelated charts get a full gutter.

**Similarity — consistent encoding for same category.** If "actual" is oc-blue-7 in one
panel, it is oc-blue-7 in every panel. Same shape, same dash pattern. Distinguish
categories with maximally different marks (circle vs square vs triangle), not subtle
variants (circle vs ellipse).

**Continuity — align elements to create reading paths.** Left-aligned labels create a
vertical scan line. Consistent spacing creates rhythm. Leader lines connect annotations
to referents when proximity is not possible. Break false alignment with deliberate offset.

**Closure — imply structure, don't draw it.** Tick marks suggest gridlines without
drawing them edge-to-edge. Sparklines work because the brain infers missing axes. When
precision matters, draw explicitly.

**Figure-ground — data is figure, everything else is ground.** Data marks: saturated,
full opacity. Gridlines: oc-gray-2, 1px. Axes: oc-gray-5, 1px. Background: white or
oc-gray-0. If gridlines are heavier than data marks, hierarchy is inverted.

**Common region — subtle enclosure when spacing is constrained.** oc-gray-0 background
with 1px oc-gray-2 border, or 8px padding on oc-gray-1. Keep stroke ≤ 1px, ≤ oc-gray-3.

**Connectedness — lines between related nodes are the strongest grouper.** Overrides
proximity, similarity, and common region (Palmer & Rock, 1994). In networks, edge
visibility communicates relationship — prioritize edge clarity over node styling. In
sankeys, connecting paths carry the primary information. Encode weight or category on
the connection itself (stroke-width, color).

## Spacing Specifications

Values assume 960px chart width. Scale proportionally.

### Chart Margins

| Edge | px | Notes |
|------|----|-------|
| Top | 40-60 | Title + subtitle |
| Right | 20-30 | More if right-aligned labels |
| Bottom | 40-60 | Axis labels + source line |
| Left | 50-70 | Wider for long category names |

### Internal Spacing

| Element | Spec |
|---------|------|
| Bar gap (within group) | 1-2px |
| Bar gap (between groups) | ≥ bar-width, min 12px |
| Tick label → axis line | 6-8px |
| Axis title → tick labels | 10-14px |
| Title → chart area | 16-20px |
| Legend item spacing | 16-20px horiz, 6-8px vert |
| Annotation → mark | 4-8px; leader line if > 30px |

### Dashboard Spacing

| Element | Spec |
|---------|------|
| Panel gutter | 16-24px |
| Panel padding | 16-20px |
| Outer margin | 24-32px |
| Panel background | oc-gray-0 or white |
| Panel border | 1px oc-gray-2 or none |
| Hero element | 50-60% viewport width, top row |

### Gridlines and Reference

| Element | Spec |
|---------|------|
| Gridline | oc-gray-2 `#e9ecef`, 0.5-1px |
| Axis line | oc-gray-5 `#868e96`, 1px |
| Zero line | oc-gray-6, 1px |

## Layout Patterns

### Reading Order

Primary insight at top-left. Z-pattern: top-left → top-right → bottom-left →
bottom-right. Break only for deliberate emphasis.

### Hero Element (dashboards)

One chart or metric dominates: top row, 50-60% width, strongest figure-ground contrast.
Supporting panels are smaller and quieter (thinner strokes, lighter labels). **5-second
test:** glance for five seconds — if the hero is not what you recall, reduce weight on
everything else.

### Small Multiples

Shared axes mandatory. Each panel varies one dimension while keeping all other encodings
identical. Remove redundant axis labels from interior panels — label outer edges only.
Identical scale ranges across all panels.

### Hierarchy Failures

| Symptom | Fix |
|---------|-----|
| Eye wanders randomly | Pick one primary, reduce everything else |
| Decoration noticed before data | Lighten gridlines, thin borders, desaturate backgrounds |
| Eye bounces between two elements | Demote one to secondary |
| Data hard to find | Reduce non-data elements until data is figure |

## SVG Layer Order

SVG renders in document order — later elements paint on top.

```
1. Background   — fill rect, subtle shading
2. Grid         — gridlines, reference lines, zero line
3. Marks        — bars, points, lines, areas
4. Annotations  — reference bands, callout lines
5. Labels       — direct labels, annotation text
6. Interactive  — tooltips, brush overlays
```

**D3:** Append `<g>` layers in this order. **Vega:** Order entries in the `marks` array
— `rule` (grid) before `rect`/`symbol`/`line` (data) before `text` (labels).

Labels over marks intercept pointer events. Use `"interactive": false` (Vega) or
`pointer-events: none` (D3) on text elements.

## Multi-View Composition (Vega)

Vega has no `hconcat`/`vconcat`. Use **group marks** for panels and faceting.

### Faceted Layout

Use a group mark with a `facet` data source. Position panels via a `band` scale.

```json
{"marks": [{
  "type": "group",
  "from": {"facet": {"name": "series", "data": "source", "groupby": "region"}},
  "encode": {"enter": {
    "x": {"scale": "layout", "field": "region"},
    "width": {"signal": "panelWidth"}, "height": {"signal": "panelHeight"}
  }},
  "marks": [{"type": "line", "from": {"data": "series"}, "encode": {}}],
  "axes": [{"orient": "bottom", "scale": "x"}, {"orient": "left", "scale": "y"}]
}]}
```

Define shared `y` scale at top level and reference inside groups so magnitudes compare.

### Dashboard Pattern

Multiple Vega specs targeting separate `<div>` containers. CSS Grid for layout:

```css
.dashboard { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; padding: 24px; }
.hero { grid-column: 1 / -1; }
```

Each `vegaEmbed()` uses `"width": "container"` and `"autosize": {"type": "fit",
"contains": "padding"}` for responsive sizing.

## Aspect Ratio

For line charts, bank to 45°: choose an aspect ratio where average segment slopes
approach 45°, maximizing rate-of-change perception. Gradual trends → wide (3:1, 4:1).
Volatile data → taller (16:9, 2:1). Default when unsure: 16:9.

### By Chart Type

| Chart type | Ratio | Reason |
|------------|-------|--------|
| Line chart | 2:1 – 3:1 | Bank to 45° |
| Bar chart | Bars ≥ 12px wide | Readability drives width |
| Scatter plot | 1:1 | Preserves spatial relationships |
| Heatmap | Cells ≈ 1:1 | Unbiased comparison |
| Small multiples | Uniform across panels | Consistent encoding |
| Dashboard hero | 2:1 – 3:1, 50-60% width | Prominence without dominating height |
| Sparkline | 4:1 – 6:1 | Inline, trend shape |

In Vega: set `"width"` / `"height"` explicitly. For responsive sizing, compute from
`containerSize()[0]` and divide for the target ratio.

## Phase Transition

**Narrate** — annotations. **Access** — tab order matches hierarchy. **Refine** — if cluttered.

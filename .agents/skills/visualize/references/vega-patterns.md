# Vega Spec Patterns

Full Vega specifications for complex visualizations that exceed Vega-Lite's declarative grammar. Vega provides low-level control over signals, data transforms, scales, axes, and marks. Use Vega when you need force simulations, hierarchical layouts, kernel density estimation, custom drag interactions, or geographic projections with full control.

## When to Use Vega vs Vega-Lite

| Requirement | Engine |
|-------------|--------|
| Standard chart (bar, line, scatter, area, heatmap) | Vega-Lite |
| Pie/donut chart, boxplot, histogram | Vega-Lite |
| Grouped or stacked bars | Vega-Lite |
| Candlestick / layered charts | Vega-Lite |
| Faceted small multiples | Vega-Lite |
| Interactive selections (brush, click highlight) | Vega-Lite |
| Force-directed network graph | **Vega** |
| Treemap | **Vega** |
| Sunburst / icicle / partition layout | **Vega** |
| Tree / dendrogram / cluster layout | **Vega** |
| Violin plot (KDE) | **Vega** |
| Choropleth map with full projection control | **Vega** |
| Custom drag-and-drop interactions | **Vega** |
| Signal-driven animation | **Vega** |

Rule of thumb: if Vega-Lite can express it, use Vega-Lite. Drop to Vega only when you need a transform, layout, or interaction model that Vega-Lite does not expose.

## Grammar Overview

A Vega spec is a JSON object with these top-level properties:

| Property | Required | Purpose |
|----------|----------|---------|
| `$schema` | Yes | `"https://vega.github.io/schema/vega/v6.json"` |
| `description` | No | Accessible text summary |
| `width` / `height` | Yes | Canvas dimensions in pixels |
| `padding` | No | Outer padding (number or `{top, right, bottom, left}`) |
| `autosize` | No | `"pad"`, `"fit"`, `"fit-x"`, `"fit-y"`, `"none"` |
| `signals` | No | Reactive variables driven by events or expressions |
| `data` | Yes | Named datasets with inline values, URLs, or transforms |
| `scales` | No | Maps data values to visual values |
| `axes` | No | Axis guides for scales |
| `legends` | No | Legend guides for scales |
| `marks` | Yes | Visual elements (rect, symbol, path, arc, text, etc.) |
| `title` | No | Chart title (string or object with subtitle) |
| `config` | No | Theme-level defaults |

Minimal working spec:

```json
{
  "$schema": "https://vega.github.io/schema/vega/v6.json",
  "width": 400,
  "height": 200,
  "data": [
    {
      "name": "table",
      "values": [
        {"category": "A", "value": 10},
        {"category": "B", "value": 20},
        {"category": "C", "value": 15}
      ]
    }
  ],
  "scales": [
    {"name": "x", "type": "band", "domain": {"data": "table", "field": "category"}, "range": "width"},
    {"name": "y", "type": "linear", "domain": {"data": "table", "field": "value"}, "range": "height", "nice": true}
  ],
  "axes": [
    {"orient": "bottom", "scale": "x"},
    {"orient": "left", "scale": "y"}
  ],
  "marks": [
    {
      "type": "rect",
      "from": {"data": "table"},
      "encode": {
        "enter": {
          "x": {"scale": "x", "field": "category"},
          "width": {"scale": "x", "band": 1, "offset": -1},
          "y": {"scale": "y", "field": "value"},
          "y2": {"scale": "y", "value": 0},
          "fill": {"value": "steelblue"}
        }
      }
    }
  ]
}
```

## Signals

Signals are reactive variables. They update in response to events (mouse, timer) or when their dependencies change.

### Static Signal

```json
{
  "name": "nodeRadius",
  "value": 8
}
```

### Computed Signal

```json
{
  "name": "cx",
  "update": "width / 2"
}
```

### Event-Driven Signal

```json
{
  "name": "hovered",
  "value": null,
  "on": [
    {"events": "symbol:pointerover", "update": "datum"},
    {"events": "symbol:pointerout", "update": "null"}
  ]
}
```

### Bound to Input Widget

```json
{
  "name": "bandwidth",
  "value": 0,
  "bind": {"input": "range", "min": 0, "max": 10, "step": 0.1}
}
```

Bind types: `"range"` (slider), `"select"` (dropdown), `"radio"`, `"checkbox"`, `"text"`, `"number"`, `"date"`, `"color"`.

## Data and Transforms

Data sources are named and can reference other sources. Transforms are applied in array order.

```json
{
  "data": [
    {
      "name": "raw",
      "values": [...]
    },
    {
      "name": "filtered",
      "source": "raw",
      "transform": [
        {"type": "filter", "expr": "datum.value > 0"}
      ]
    }
  ]
}
```

### stratify -- Convert flat tables to hierarchies

Converts a flat array with `id` and `parent` fields into a tree structure required by hierarchical transforms (`treemap`, `partition`, `tree`).

```json
{
  "type": "stratify",
  "key": "id",
  "parentKey": "parent"
}
```

Input format -- flat array:

```json
[
  {"id": "root", "parent": null, "value": null},
  {"id": "A", "parent": "root", "value": null},
  {"id": "A1", "parent": "A", "value": 100},
  {"id": "A2", "parent": "A", "value": 200}
]
```

Root node has `parent: null`. Only leaf nodes need numeric values -- branch nodes derive values from children via sum aggregation in downstream transforms.

### treemap -- Rectangular subdivision layout

Subdivides a rectangular area into nested rectangles where area encodes value. Requires `stratify` upstream.

```json
{
  "type": "treemap",
  "field": "value",
  "method": "squarify",
  "ratio": 1.6180339887,
  "paddingInner": 2,
  "paddingOuter": 4,
  "paddingTop": 20,
  "round": true,
  "size": [{"signal": "width"}, {"signal": "height"}]
}
```

| Property | Purpose |
|----------|---------|
| `method` | Tiling algorithm: `"squarify"` (near-square cells, best for comparison), `"binary"` (alternating horizontal/vertical), `"dice"` (horizontal only), `"slice"` (vertical only), `"slicedice"` (alternating by depth) |
| `ratio` | Target aspect ratio for squarify. Golden ratio (1.618) is the default. |
| `paddingTop` | Space at top of groups for category labels |
| `paddingInner` | Space between sibling nodes |
| `paddingOuter` | Space around the outer edge |

Output fields: `x0`, `y0`, `x1`, `y1` (rectangle bounds), `depth`, `children`.

Filtering leaves and branches for separate rendering:

```json
{
  "name": "leaves",
  "source": "tree",
  "transform": [{"type": "filter", "expr": "!datum.children"}]
},
{
  "name": "branches",
  "source": "tree",
  "transform": [{"type": "filter", "expr": "datum.children && datum.depth === 1"}]
}
```

### partition -- Radial or rectangular hierarchical layout

Used for sunburst and icicle charts. Requires `stratify` upstream.

```json
{
  "type": "partition",
  "field": "value",
  "sort": {"field": "value", "order": "descending"},
  "size": [6.283185307179586, 270],
  "as": ["a0", "r0", "a1", "r1", "depth", "children"]
}
```

For sunburst: `size` is `[2*PI, outerRadius]`. Output fields `a0`, `a1` are start/end angles; `r0`, `r1` are inner/outer radii.

For icicle (rectangular): set `size` to `[{"signal": "width"}, {"signal": "height"}]` and use `x0`, `y0`, `x1`, `y1` output fields.

### tree -- Tidy tree and cluster layouts

Positions nodes for tree diagrams and dendrograms. Requires `stratify` upstream.

```json
{
  "type": "tree",
  "method": "tidy",
  "size": [{"signal": "height"}, {"signal": "width - 160"}],
  "separation": true,
  "as": ["y", "x", "depth", "children"]
}
```

| Method | Behavior |
|--------|----------|
| `"tidy"` | Variable spacing, aesthetically balanced. Reingold-Tilford algorithm. |
| `"cluster"` | All leaf nodes aligned at the same depth. Useful for dendrograms. |

For horizontal (left-to-right) trees, swap x and y in the `as` array: `"as": ["y", "x", "depth", "children"]`. This maps tree depth to the x-axis and sibling position to the y-axis.

### treelinks + linkpath -- Generate connecting paths between parent and child nodes

```json
{
  "name": "links",
  "source": "tree",
  "transform": [
    {"type": "treelinks"},
    {
      "type": "linkpath",
      "orient": "horizontal",
      "shape": "diagonal"
    }
  ]
}
```

`linkpath` shape options:

| Shape | Description | Best for |
|-------|-------------|----------|
| `"line"` | Straight line between source and target | Force-directed graphs |
| `"curve"` | Cubic Bezier curve | Smooth aesthetic connections |
| `"arc"` | Circular arc | Arc diagrams |
| `"orthogonal"` | Right-angle bends (Manhattan routing) | Org charts, circuit diagrams |
| `"diagonal"` | Cubic Bezier with axis-aligned tangents | Tree diagrams (default) |

`orient` controls the primary axis: `"horizontal"` (left-to-right) or `"vertical"` (top-to-bottom).

For force-directed graphs, `linkpath` uses explicit coordinates instead of `treelinks`:

```json
{
  "type": "linkpath",
  "require": {"signal": "force"},
  "shape": "line",
  "sourceX": "datum.source.x",
  "sourceY": "datum.source.y",
  "targetX": "datum.target.x",
  "targetY": "datum.target.y"
}
```

### force -- Force-directed layout simulation

Wraps d3-force for network graph positioning. Applied as a mark-level transform on symbol marks.

```json
{
  "type": "force",
  "iterations": 300,
  "restart": {"signal": "dragged"},
  "signal": "force",
  "forces": [
    {
      "force": "center",
      "x": {"signal": "cx"},
      "y": {"signal": "cy"}
    },
    {
      "force": "collide",
      "radius": {"signal": "nodeRadius + 2"}
    },
    {
      "force": "nbody",
      "strength": {"signal": "nbodyStrength"}
    },
    {
      "force": "link",
      "links": "link-data",
      "distance": {"signal": "linkDistance"}
    }
  ]
}
```

Available forces:

| Force | Purpose | Key parameters |
|-------|---------|----------------|
| `"center"` | Pulls nodes toward a center point | `x`, `y` |
| `"collide"` | Prevents node overlap | `radius`, `strength`, `iterations` |
| `"nbody"` | Charge-based repulsion/attraction (wraps d3.forceManyBody) | `strength` (negative = repel, typically -30 to -200) |
| `"link"` | Spring-like attraction between connected nodes | `links` (data source name), `distance`, `strength` |
| `"x"` | Pulls toward a target x position | `x`, `strength` |
| `"y"` | Pulls toward a target y position | `y`, `strength` |

`iterations` controls simulation steps per render. Higher values (300+) produce more stable layouts. The `restart` signal re-runs the simulation when the value changes (used for drag).

The `signal` property exposes the force simulation state so that `linkpath` transforms can reference it via `"require": {"signal": "force"}`.

### kde -- Kernel density estimation

Computes a smooth density curve from discrete observations. Used for violin plots.

```json
{
  "type": "kde",
  "field": "value",
  "groupby": ["group"],
  "bandwidth": {"signal": "bandwidth"},
  "extent": [40, 100]
}
```

| Property | Purpose |
|----------|---------|
| `field` | Numeric field to estimate density for |
| `groupby` | Compute separate densities per group |
| `bandwidth` | Smoothing parameter. `0` = automatic (Scott's rule). Too small = noisy. Too large = over-smoothed. |
| `extent` | `[min, max]` range for density estimation |

Output fields: `value` (x position) and `density` (estimated density).

**Scott's rule** (`bandwidth = 0`): `h = 1.06 * stdev * n^(-1/5)`. Assumes roughly normal distribution. For multimodal data, manual bandwidth may produce better results.

Minimum sample size per group: ~10 for meaningful estimation.

### geoshape -- Geographic projection of GeoJSON/TopoJSON

Applied as a mark-level transform to render geographic features.

```json
{
  "type": "shape",
  "from": {"data": "counties"},
  "encode": {
    "update": {
      "fill": {"scale": "color", "field": "rate"},
      "stroke": {"value": "#fff"},
      "strokeWidth": {"value": 0.3}
    }
  },
  "transform": [
    {
      "type": "geoshape",
      "projection": "projection"
    }
  ]
}
```

Requires a `projections` definition at the top level:

```json
{
  "projections": [
    {
      "name": "projection",
      "type": "albersUsa"
    }
  ]
}
```

Common projection types:

| Projection | Use case |
|------------|----------|
| `"albersUsa"` | US with Alaska/Hawaii insets |
| `"albers"` | US contiguous, equal-area |
| `"mercator"` | Web maps. Distorts area at poles. |
| `"equalEarth"` | World maps, area-preserving |
| `"naturalEarth1"` | World maps, balanced distortion |
| `"orthographic"` | Globe view |
| `"stereographic"` | Polar regions |
| `"transverseMercator"` | UTM zones |
| `"conicConformal"` | Mid-latitude regions |
| `"conicEqualArea"` | Continental maps |
| `"gnomonic"` | Great circle routes |
| `"azimuthalEqualArea"` | Polar projections |
| `"azimuthalEquidistant"` | Centered distance maps |
| `"identity"` | Pre-projected coordinates (already in pixels) |

For pre-projected TopoJSON (like `counties-albers-10m.json` from us-atlas), use `"type": "identity"`.

Loading TopoJSON data:

```json
{
  "name": "counties",
  "url": "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json",
  "format": {"type": "topojson", "feature": "counties"},
  "transform": [
    {
      "type": "lookup",
      "from": "values",
      "key": "id",
      "fields": ["id"],
      "values": ["rate"]
    }
  ]
}
```

The `lookup` transform joins your data values to the geographic features by matching ID fields.

## Mark Types

Vega marks use a different encoding model than Vega-Lite. Properties are set in `encode` blocks with `enter` (initial), `update` (reactive), and `hover` (pointer over) states.

### Common Mark Types

| Type | Purpose | Key properties |
|------|---------|----------------|
| `arc` | Pie slices, sunburst segments | `startAngle`, `endAngle`, `innerRadius`, `outerRadius` |
| `area` | Filled regions (violin shapes, areas) | `x`, `y`, `y2` or `xc`/`width` for horizontal |
| `group` | Container for nested marks (faceting) | `from.facet`, sub-`marks` array |
| `image` | Positioned images | `url`, `x`, `y`, `width`, `height` |
| `line` | Connected points | `x`, `y`, `stroke` |
| `path` | Arbitrary SVG path strings | `path` (SVG path data) |
| `rect` | Rectangles (treemap cells, bars) | `x`, `y`, `x2`, `y2` or `xc`/`width` |
| `rule` | Straight lines (axes, reference lines) | `x`, `y`, `x2`, `y2` |
| `shape` | Geographic shapes | Requires `geoshape` transform |
| `symbol` | Points (circle, square, cross, etc.) | `x`, `y`, `size`, `shape` |
| `text` | Labels and annotations | `x`, `y`, `text`, `fontSize`, `align`, `baseline` |
| `trail` | Variable-width lines | `x`, `y`, `size` |

### Encode Blocks

```json
{
  "type": "symbol",
  "from": {"data": "node-data"},
  "encode": {
    "enter": {
      "fill": {"scale": "color", "field": "group"},
      "stroke": {"value": "#fff"},
      "strokeWidth": {"value": 2},
      "tooltip": {"signal": "{'Name': datum.name, 'Group': datum.group}"}
    },
    "update": {
      "x": {"field": "x"},
      "y": {"field": "y"},
      "size": {"signal": "pow(2 * nodeRadius, 2)"},
      "cursor": {"value": "pointer"}
    },
    "hover": {
      "stroke": {"value": "#333"},
      "strokeWidth": {"value": 3}
    }
  }
}
```

Property value sources:

- `{"value": "#fff"}` -- constant value
- `{"field": "x"}` -- data field
- `{"scale": "color", "field": "group"}` -- scaled data field
- `{"signal": "width / 2"}` -- expression result
- `{"test": "datum.depth === 0", "value": "transparent"}` -- conditional

### Group Marks (Faceting)

Group marks create nested sub-visualizations. Used for violin plots (one group per category) and similar faceted displays.

```json
{
  "type": "group",
  "from": {
    "facet": {
      "data": "density",
      "name": "violin",
      "groupby": "group"
    }
  },
  "encode": {
    "enter": {
      "xc": {"scale": "layout", "field": "group", "band": 0.5},
      "width": {"signal": "plotWidth"},
      "height": {"signal": "height"}
    }
  },
  "marks": [
    {
      "type": "area",
      "from": {"data": "violin"},
      "encode": {
        "update": {
          "xc": {"signal": "plotWidth / 2"},
          "width": {"scale": "hscale", "field": "density"},
          "y": {"scale": "yscale", "field": "value"}
        }
      }
    }
  ]
}
```

The `facet` property splits the data source into groups. Each group gets its own sub-coordinate system defined by the group mark's `encode`.

## Signal-Driven Interactivity

### Drag Interaction

The canonical pattern for node dragging in force-directed graphs:

```json
{
  "signals": [
    {
      "name": "dragged",
      "value": null,
      "on": [
        {"events": "symbol:pointerdown", "update": "datum"},
        {"events": "window:pointerup", "update": "null"}
      ]
    },
    {
      "name": "fx",
      "value": null,
      "on": [
        {"events": "symbol:pointerdown", "update": "datum.x"},
        {
          "events": "[symbol:pointerdown, window:pointerup] > window:pointermove",
          "update": "dragged ? clamp(x(), 0, width) : fx"
        },
        {"events": "window:pointerup", "update": "null"}
      ]
    },
    {
      "name": "fy",
      "value": null,
      "on": [
        {"events": "symbol:pointerdown", "update": "datum.y"},
        {
          "events": "[symbol:pointerdown, window:pointerup] > window:pointermove",
          "update": "dragged ? clamp(y(), 0, height) : fy"
        },
        {"events": "window:pointerup", "update": "null"}
      ]
    }
  ]
}
```

The `fx` and `fy` signals feed into the force simulation's fixed-position properties:

```json
{
  "encode": {
    "update": {
      "fx": {"signal": "dragged === datum ? fx : null"},
      "fy": {"signal": "dragged === datum ? fy : null"}
    }
  }
}
```

The event selector `[symbol:pointerdown, window:pointerup] > window:pointermove` means: capture pointermove events between pointerdown on a symbol and pointerup on the window.

### Hover Highlighting

Highlight connected elements on hover:

```json
{
  "signals": [
    {
      "name": "hovered",
      "value": null,
      "on": [
        {"events": "symbol:pointerover", "update": "datum"},
        {"events": "symbol:pointerout", "update": "null"}
      ]
    }
  ]
}
```

Use in mark encoding to dim unrelated elements:

```json
{
  "strokeOpacity": {
    "signal": "hovered == null ? 0.6 : (hovered === datum.source || hovered === datum.target ? 1 : 0.1)"
  }
}
```

### Tooltips via Signal

```json
{
  "tooltip": {
    "signal": "{'Name': datum.name, 'Value': format(datum.value, ',.0f'), 'Pct': format(datum.value / totalValue * 100, '.1f') + '%'}"
  }
}
```

The signal expression builds a JavaScript object whose keys become tooltip labels.

## Scales

Vega scales are explicit objects (not inferred from encoding like in Vega-Lite).

```json
{
  "scales": [
    {
      "name": "x",
      "type": "band",
      "domain": {"data": "table", "field": "category"},
      "range": "width",
      "padding": 0.2
    },
    {
      "name": "y",
      "type": "linear",
      "domain": {"data": "table", "field": "value"},
      "range": "height",
      "nice": true,
      "zero": true
    },
    {
      "name": "color",
      "type": "ordinal",
      "domain": {"data": "table", "field": "group"},
      "range": {"scheme": "tableau10"}
    }
  ]
}
```

Scale types: `"linear"`, `"log"`, `"sqrt"`, `"pow"`, `"symlog"`, `"time"`, `"utc"`, `"ordinal"`, `"band"`, `"point"`, `"quantize"`, `"quantile"`, `"threshold"`, `"sequential"`.

Special range values: `"width"` (maps to `[0, width]`), `"height"` (maps to `[height, 0]` -- inverted for SVG coordinates).

### Quantize Scale for Choropleth

```json
{
  "name": "color",
  "type": "quantize",
  "domain": [0, 0.15],
  "range": {"scheme": "blues", "count": 7}
}
```

Divides a continuous domain into equal-width bins, each mapped to a discrete color.

## Axes and Legends

```json
{
  "axes": [
    {
      "orient": "bottom",
      "scale": "x",
      "title": "Category",
      "zindex": 1
    },
    {
      "orient": "left",
      "scale": "y",
      "title": "Value",
      "format": ",.0f",
      "zindex": 1
    }
  ]
}
```

```json
{
  "legends": [
    {
      "fill": "color",
      "title": "Department",
      "orient": "top-left",
      "encode": {
        "symbols": {
          "update": {
            "size": {"value": 100},
            "strokeWidth": {"value": 0}
          }
        }
      }
    }
  ]
}
```

Legend orient options: `"left"`, `"right"`, `"top"`, `"bottom"`, `"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`, `"none"`.

## Complete Patterns

### Force-Directed Network

Data format: two arrays -- nodes with `name` and `group`, edges with `source` and `target` (zero-based indices).

Key components:

1. Signals for `cx`, `cy`, `nodeRadius`, `nbodyStrength`, `linkDistance`, drag (`fx`/`fy`), hover
2. Data: `node-data` (values), `link-data` (values)
3. Scales: ordinal color by group
4. Marks rendered in order: edges (path with linkpath transform), nodes (symbol with force transform), labels (text from nodes)

The force transform is applied on the symbol marks (nodes). Edge paths reference the force simulation via `"require": {"signal": "force"}`.

### Treemap

Data format: flat array with `id`, `parent`, `value` (leaves only).

Key components:

1. Data pipeline: raw values -> stratify -> treemap transform
2. Derived datasets: `leaves` (no children), `branches` (depth === 1)
3. Marks: branch rectangles (background), branch labels, leaf rectangles, leaf labels, leaf values
4. Text visibility gated by cell dimensions: `"text": {"signal": "(datum.x1 - datum.x0) > 40 && (datum.y1 - datum.y0) > 25 ? datum.id : ''"}`

### Sunburst

Data format: same as treemap (flat array with `id`, `parent`, `value`).

Key components:

1. Data pipeline: raw values -> stratify -> partition transform with `size: [2*PI, radius]`
2. Marks: arc marks with `startAngle`, `endAngle`, `innerRadius`, `outerRadius` from partition output
3. Color by depth: full opacity at depth 1, reduced at deeper levels
4. Root node (depth 0) rendered transparent
5. Text positioned at arc center using `theta` and `radius` signals
6. Small arcs hidden: `"text": {"signal": "(datum.a1 - datum.a0) > 0.2 && datum.depth > 0 ? datum.id : ''"}`

### Tree Diagram

Data format: flat array with `id`, `parent`, `name`.

Key components:

1. Data pipeline: raw values -> stratify -> tree transform (tidy or cluster)
2. Links derived via: source tree -> treelinks -> linkpath (diagonal, horizontal)
3. Marks: path (links), symbol (nodes), text (labels)
4. Horizontal layout: swap x/y in tree `as` field, use `"orient": "horizontal"` for linkpath
5. Label alignment: internal nodes right-aligned (to the left), leaf nodes left-aligned (to the right)

### Violin Plot

Data format: array of observations with `group` and `value` fields. Minimum ~10 per group.

Key components:

1. Data pipeline: raw observations -> KDE transform (grouped) -> density curves
2. Separate stats dataset: aggregate with `q1`, `median`, `q3` operations
3. Group mark: one group per category via facet
4. Within each group: mirrored area (density shape), rect (IQR box), symbol (median dot)
5. Area uses `xc` and `width` encoding for mirrored display around center
6. Bandwidth parameter optionally bound to slider for exploration

### Choropleth Map

Data format: values array with region IDs and rates; TopoJSON for geography.

Key components:

1. Data: values dataset, geographic features loaded from URL with topojson format
2. Lookup transform joins values to features by ID
3. Projection defined at top level
4. Shape marks with geoshape transform
5. Quantize scale maps continuous rates to discrete color bins
6. Null-data regions styled with `#ddd` fallback via conditional encoding
7. Hover state highlights borders

## Common Pitfalls

**Pitfall: Mark render order matters.** Marks render in array order. For force graphs, edges must be defined before nodes so nodes render on top. Use `zindex` for finer control.

**Pitfall: Force simulation produces different layouts each run.** Force-directed layouts are stochastic. Node positions carry no semantic meaning. Perceived clusters should be verified with graph metrics.

**Pitfall: Missing `require` on linkpath.** When using linkpath with force simulation, you must include `"require": {"signal": "force"}` so edges wait for node positions to be computed.

**Pitfall: Treemap labels overflow small cells.** Always gate text visibility on cell dimensions. Check both width and height: `(datum.x1 - datum.x0) > threshold && (datum.y1 - datum.y0) > threshold`.

**Pitfall: Sunburst root node visible.** The root node (depth 0) should be transparent. Add `{"test": "datum.depth === 0", "value": "transparent"}` to the fill encoding.

**Pitfall: KDE bandwidth too small or too large.** Bandwidth 0 (automatic) uses Scott's rule, which assumes normality. For multimodal data, experiment with manual bandwidth values. Bind to a slider for interactive exploration.

**Pitfall: Choropleth using raw counts instead of rates.** Large geographic regions dominate visually. Always normalize to rates, densities, or percentages.

**Pitfall: Pre-projected TopoJSON with non-identity projection.** Files like `counties-albers-10m.json` are already projected to pixel coordinates. Use `"type": "identity"` projection to pass coordinates through unchanged.

## Sources

- Vega documentation -- <https://vega.github.io/vega/docs/>
- Vega examples -- <https://vega.github.io/vega/examples/>
- Vega schema v6 -- <https://vega.github.io/schema/vega/v6.json>
- Vega transforms -- <https://vega.github.io/vega/docs/transforms/>
- d3-force documentation -- <https://d3js.org/d3-force>

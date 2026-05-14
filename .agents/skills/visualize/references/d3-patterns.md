# D3 Browser-Runnable Patterns

> **Scope:** This reference applies to the sankey template (`assets/d3/templates/networks/sankey.html`) and custom D3 charts created by template-crafter. For Vega/VL patterns, see [vega-patterns.md](vega-patterns.md).

Create standalone HTML files with D3.js visualizations that run directly in the browser with no build step. Verify D3 API usage, CDN import URLs, and SVG accessibility attributes against current documentation before deploying.

## The Standalone HTML Template

Every browser-runnable visualization follows this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Visualization Title</title>
  <style>
    /* Embedded styles for portability */
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
    }

    #container {
      max-width: 960px;
      margin: 0 auto;
    }

    /* Chart-specific styles */
    .axis text {
      font-size: 12px;
    }

    .axis path,
    .axis line {
      stroke: #ccc;
    }
  </style>
</head>
<body>
  <div id="container">
    <h1>Visualization Title</h1>
    <div id="chart"></div>
  </div>

  <script type="module">
    // ESM imports from CDN
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

    // ============================================
    // DATA
    // Embed data directly for standalone operation
    // ============================================
    const data = [
      { category: "A", value: 100 },
      { category: "B", value: 200 },
      { category: "C", value: 150 }
    ];

    // ============================================
    // CONFIGURATION
    // Centralize dimensions and settings
    // ============================================
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // ============================================
    // SCALES
    // Define data-to-pixel mappings
    // ============================================
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([height, 0])
      .nice();

    // ============================================
    // SVG SETUP
    // Create responsive container
    // ============================================
    const svg = d3.select("#chart")
      .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // ============================================
    // AXES
    // ============================================
    svg.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    svg.append("g")
      .attr("class", "axis y-axis")
      .call(d3.axisLeft(yScale));

    // ============================================
    // MARKS
    // The actual data visualization
    // ============================================
    svg.selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => xScale(d.category))
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScale(d.value))
      .attr("fill", "steelblue");

    // ============================================
    // LABELS (Optional)
    // ============================================
    svg.selectAll(".value-label")
      .data(data)
      .join("text")
      .attr("class", "value-label")
      .attr("x", d => xScale(d.category) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.value) - 5)
      .attr("text-anchor", "middle")
      .text(d => d.value);
  </script>
</body>
</html>
```

## ESM Import Patterns

### Core D3 (Full Library)

```javascript
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
```

This imports the entire D3 library. Use when you need multiple D3 modules.

### Selective Imports (Smaller Bundle)

```javascript
// Only what you need
import { select, selectAll } from "https://cdn.jsdelivr.net/npm/d3-selection@3/+esm";
import { scaleLinear, scaleBand } from "https://cdn.jsdelivr.net/npm/d3-scale@4/+esm";
import { axisBottom, axisLeft } from "https://cdn.jsdelivr.net/npm/d3-axis@3/+esm";
import { max, extent } from "https://cdn.jsdelivr.net/npm/d3-array@3/+esm";
```

### Additional Libraries

```javascript
// D3 Annotation
import { annotation, annotationCallout } from "https://cdn.jsdelivr.net/npm/d3-svg-annotation@2/+esm";

// Topojson for maps
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// D3 Sankey layout
import { sankey, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";
```

## Responsive SVG Pattern

Use `viewBox` instead of fixed dimensions for responsive scaling:

```javascript
const svg = d3.select("#chart")
  .append("svg")
  // viewBox defines the coordinate system
  .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
  // preserveAspectRatio controls scaling behavior
  .attr("preserveAspectRatio", "xMidYMid meet")
  // Optional: set a max-width in CSS
  .style("max-width", "100%")
  .style("height", "auto");
```

**Why viewBox works**:

- SVG scales to container width
- Aspect ratio is preserved
- Coordinates remain consistent
- No JavaScript resize handlers needed

## Data Embedding Strategies

### Inline JavaScript Object

Best for small datasets (<100 rows):

```javascript
const data = [
  { date: "2024-01-01", value: 100 },
  { date: "2024-01-02", value: 120 },
  // ...
];
```

### CSV String with d3.csvParse

For tabular data:

```javascript
const csvString = `date,value
2024-01-01,100
2024-01-02,120
2024-01-03,110`;

const data = d3.csvParse(csvString, d => ({
  date: new Date(d.date),
  value: +d.value
}));
```

### JSON String with JSON.parse

For nested structures:

```javascript
const jsonString = `{
  "name": "root",
  "children": [
    {"name": "A", "value": 100},
    {"name": "B", "value": 200}
  ]
}`;

const data = JSON.parse(jsonString);
```

### External File Fetch

When data is too large to embed:

```javascript
// Note: Requires serving from a web server (not file://)
const data = await d3.csv("data.csv", d => ({
  date: new Date(d.date),
  value: +d.value
}));
```

## Common D3 Chart Patterns

> Standard chart types (bar, line, scatter, area, pie, histogram) are now Vega-Lite templates — see `assets/vega/templates/`. The patterns below cover D3-only chart types used for sankey and custom template-crafter work.

### Force-Directed Graph

Force-directed networks require specific patterns for visibility and interaction. See [network-patterns.md](network-patterns.md) for comprehensive coverage.

**Basic setup:**

```javascript
// Data structure
const nodes = [
  { id: "a", label: "Node A" },
  { id: "b", label: "Node B" },
  { id: "c", label: "Node C" }
];

const links = [
  { source: "a", target: "b", weight: 1 },
  { source: "b", target: "c", weight: 2 }
];

// Force simulation
const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(80))
  .force("charge", d3.forceManyBody().strength(-200))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide().radius(20));
```

**Layer order (critical):**

```javascript
// Links MUST be appended before nodes
const linkLayer = svg.append("g").attr("class", "links");
const nodeLayer = svg.append("g").attr("class", "nodes");
const labelLayer = svg.append("g").attr("class", "labels");
```

**Edge rendering with visibility thresholds:**

```javascript
const allLinks = linkLayer.selectAll("line")
  .data(links)
  .join("line")
  .attr("stroke", "#666")           // NOT #999 (fails contrast)
  .attr("stroke-width", d => Math.max(1.5, weightScale(d.weight)))
  .attr("stroke-opacity", 0.6);     // NOT 0.2 (imperceptible)
```

**Tick function:**

```javascript
simulation.on("tick", () => {
  allLinks
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  allNodes.attr("transform", d => `translate(${d.x},${d.y})`);
});
```

**Interactive highlighting:**

```javascript
allNodes
  .on("mouseover", (event, d) => {
    allLinks
      .style("stroke-opacity", l =>
        (l.source.id === d.id || l.target.id === d.id) ? 1.0 : 0.1)
      .style("stroke", l =>
        (l.source.id === d.id || l.target.id === d.id) ? "#e63946" : "#666");
  })
  .on("mouseout", () => {
    allLinks
      .style("stroke-opacity", 0.6)
      .style("stroke", "#666");
  });
```

## Accessibility in Browser-Runnable Files

Always include accessibility attributes:

```javascript
const svg = d3.select("#chart")
  .append("svg")
  .attr("role", "img")
  .attr("aria-labelledby", "chart-title chart-desc");

svg.append("title")
  .attr("id", "chart-title")
  .text("Monthly Sales by Category");

svg.append("desc")
  .attr("id", "chart-desc")
  .text("Bar chart showing Category A at 100, Category B at 200, Category C at 150.");
```

## Color Schemes

Use D3's built-in accessible color schemes:

```javascript
// Categorical (up to 10 categories)
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Sequential (quantitative)
const color = d3.scaleSequential(d3.interpolateBlues)
  .domain([0, maxValue]);

// Diverging (quantitative with midpoint)
const color = d3.scaleDiverging(d3.interpolateRdBu)
  .domain([minValue, 0, maxValue]);
```

## Common Pitfalls

### Pitfall: Script runs before DOM ready

**Problem**: Script executes before `#chart` exists.

**Solution**: Use `type="module"` (deferred by default) or wrap in DOMContentLoaded:

```javascript
document.addEventListener("DOMContentLoaded", () => {
  // D3 code here
});
```

### Pitfall: Data types from CSV

**Problem**: CSV values are strings, not numbers.

**Solution**: Always parse in the row accessor:

```javascript
const data = d3.csvParse(csv, d => ({
  date: new Date(d.date),
  value: +d.value  // Coerce to number
}));
```

### Pitfall: SVG doesn't scale

**Problem**: Fixed width/height prevents responsive behavior.

**Solution**: Use `viewBox` instead of `width`/`height` attributes.

### Pitfall: Axes disappear

**Problem**: Axes render at (0,0), outside visible area.

**Solution**: Remember to transform the axis group:

```javascript
svg.append("g")
  .attr("transform", `translate(0,${height})`)  // Move x-axis to bottom
  .call(d3.axisBottom(xScale));
```

### Pitfall: Data binding doesn't update

**Problem**: Using `.append()` instead of `.join()` means no update/exit.

**Solution**: Always use `.join()` for data binding:

```javascript
// Wrong
svg.selectAll("rect").data(data).append("rect")...

// Right
svg.selectAll("rect").data(data).join("rect")...
```

## Testing Locally

To test standalone HTML files locally:

```bash
# Python 3
python -m http.server 8000

# Node.js (with npx)
npx serve

# Then open http://localhost:8000/your-file.html
```

Note: `file://` URLs have CORS restrictions that prevent external data loading. Always use a local server for development.

## Sources

- D3.js documentation — <https://d3js.org/getting-started>
- D3 API Reference — <https://github.com/d3/d3/blob/main/API.md>
- SVG Accessibility API Mappings — <https://www.w3.org/TR/svg-aam-1.0/>
- WAI-ARIA 1.2 specification — <https://www.w3.org/TR/wai-aria-1.2/>

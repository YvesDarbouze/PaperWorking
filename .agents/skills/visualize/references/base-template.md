# Base HTML Template

> **Scope:** This reference covers the D3 HTML template structure used by the sankey template and template-crafter. For the Vega/VL wrapper pattern, see [base-vega-wrapper.md](base-vega-wrapper.md).

Browser-runnable HTML structure for D3 visualization templates. Copy and customize for custom D3 chart types. Verify D3.js CDN import URLs and API usage against the current D3 documentation before deploying.

## Frontmatter Metadata

Every visualization must include an HTML comment frontmatter block at the very top of the file. This metadata enables CLI storage and searchability.

```html
<!--
name: Sales by Region Q4 2024
description: Quarterly sales comparison across geographic regions
chart-type: bar-chart
project: sales-dashboard
created: [current-timestamp-ISO-8601]
-->
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Human-readable visualization title |
| `description` | Yes | Brief description of what the visualization shows |
| `chart-type` | Yes | Chart type: `bar-chart`, `line-chart`, `scatter-plot`, `histogram`, `pie-chart`, etc. |
| `project` | Yes | Project identifier for grouping related visualizations |
| `created` | Yes | ISO 8601 timestamp (use `new Date().toISOString()`) |

## Template Structure

```html
<!--
name: [Descriptive Name]
description: [What the visualization shows]
chart-type: [bar-chart|line-chart|scatter-plot|histogram|pie-chart|...]
project: [project-name]
created: [ISO timestamp]
-->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>[Chart Type] — Visualizer Template</title>
  <style>
    /* ============================================
       STYLES
       Modify colors, fonts, dimensions here
       ============================================ */
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      background: #fafafa;
    }

    #container {
      max-width: 960px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    h1 {
      margin-top: 0;
      font-size: 1.5rem;
      color: #333;
    }

    /* Chart-specific styles */
    .axis text { font-size: 12px; }
    .axis path, .axis line { stroke: #ccc; }

    .tooltip {
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div id="container">
    <h1>[Chart Title]</h1>
    <div id="chart"></div>
  </div>
  <div class="tooltip" id="tooltip"></div>

  <script type="module">
    // ============================================
    // IMPORTS
    // D3.js loaded via CDN (ESM format)
    // ============================================
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

    // ============================================
    // DATA
    // Replace this with your own data
    // Expected format: [documented shape]
    // ============================================
    const data = [
      // Sample data here
    ];

    // ============================================
    // CONFIGURATION
    // Adjust dimensions, colors, and settings
    // ============================================
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Color scheme (colorblind-safe by default)
    const colors = d3.schemeTableau10;

    // ============================================
    // SCALES
    // Data-to-pixel mappings
    // ============================================
    // Scale definitions here

    // ============================================
    // SVG SETUP
    // Responsive container with viewBox
    // ============================================
    const svg = d3.select("#chart")
      .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img")
      .attr("aria-labelledby", "chart-title chart-desc")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Accessibility: title and description
    svg.append("title")
      .attr("id", "chart-title")
      .text("[Descriptive title for screen readers]");

    svg.append("desc")
      .attr("id", "chart-desc")
      .text("[Description of what the chart shows]");

    // ============================================
    // AXES
    // ============================================
    // Axis rendering here

    // ============================================
    // MARKS
    // The data visualization elements
    // ============================================
    // Mark rendering here

    // ============================================
    // TOOLTIP
    // Hover interaction for details
    // ============================================
    const tooltip = d3.select("#tooltip");

    function showTooltip(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .html(`[Tooltip content]`);
    }

    function hideTooltip() {
      tooltip.style("opacity", 0);
    }
  </script>
</body>
</html>
```

## Section Guidelines

| Section | Purpose | Customization |
|---------|---------|---------------|
| STYLES | Visual appearance | Colors, fonts, spacing |
| IMPORTS | CDN dependencies | Add libraries as needed |
| DATA | Sample dataset | Document expected shape |
| CONFIGURATION | Dimensions, colors | Chart-specific settings |
| SCALES | Data-to-pixel mapping | Match data types |
| SVG SETUP | Responsive container | Keep viewBox pattern |
| AXES | Axis labels and ticks | Adjust formats |
| MARKS | Visual elements | Chart-type specific |
| TOOLTIP | Hover details | Content formatting |

## Required Patterns

- **ESM imports**: Use `import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"`
- **viewBox responsiveness**: Never use fixed `width`/`height` on SVG
- **D3 margin convention**: `margin`, `width`, `height` constants with transform
- **`.join()` for data binding**: Not `.append()` in loops
- **Colorblind-safe defaults**: `d3.schemeTableau10` or similar

## See Also

- **[base-vega-wrapper.md](base-vega-wrapper.md)** — Vega/VL HTML wrapper template used for all standard chart types (bar, line, scatter, pie, histogram, etc.). Most new visualizations should use the Vega-Lite wrapper instead of this D3 base template.

## Sources

- D3.js documentation — <https://d3js.org/getting-started>
- D3 API Reference — <https://github.com/d3/d3/blob/main/API.md>
- SVG Accessibility API Mappings — <https://www.w3.org/TR/svg-aam-1.0/>

# Canvas Patterns

Use Canvas when SVG becomes slow. Canvas renders pixels directly, enabling visualizations with thousands to millions of points. Verify Canvas API methods and D3 integration patterns against the current D3 and MDN documentation before implementing.

## When to Use Canvas vs SVG

| Factor | SVG | Canvas |
|--------|-----|--------|
| Data points | < 1,000 | > 1,000 |
| Interactivity | Built-in (DOM events) | Manual (hit testing) |
| Styling | CSS applies | Programmatic only |
| Accessibility | Screen readers work | Requires manual description |
| Export | Vector (PDF, print) | Raster (PNG) |
| Animation | Transitions built-in | Manual redraw |

**Rule of thumb**: Start with SVG. Switch to Canvas when performance degrades.

## Basic Canvas Setup

```javascript
const canvas = document.getElementById("chart");
const context = canvas.getContext("2d");

// Handle high-DPI displays
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
canvas.style.width = width + "px";
canvas.style.height = height + "px";
context.scale(dpr, dpr);
```

## Drawing Patterns

### Clear and Redraw

Canvas is immediate mode—you must clear and redraw on every update:

```javascript
function draw() {
  // Clear the canvas
  context.clearRect(0, 0, width, height);

  // Draw all elements
  data.forEach(d => {
    context.beginPath();
    context.arc(xScale(d.x), yScale(d.y), 3, 0, 2 * Math.PI);
    context.fillStyle = colorScale(d.category);
    context.fill();
  });
}
```

### Batching by Style

Minimize state changes by grouping elements with the same style:

```javascript
function draw() {
  context.clearRect(0, 0, width, height);

  // Group data by category
  const byCategory = d3.group(data, d => d.category);

  // Draw each category as a batch
  byCategory.forEach((points, category) => {
    context.fillStyle = colorScale(category);
    context.beginPath();

    points.forEach(d => {
      context.moveTo(xScale(d.x) + 3, yScale(d.y));
      context.arc(xScale(d.x), yScale(d.y), 3, 0, 2 * Math.PI);
    });

    context.fill();
  });
}
```

### Lines

```javascript
function drawLine(points) {
  context.beginPath();
  context.moveTo(xScale(points[0].x), yScale(points[0].y));

  points.slice(1).forEach(d => {
    context.lineTo(xScale(d.x), yScale(d.y));
  });

  context.strokeStyle = "steelblue";
  context.lineWidth = 2;
  context.stroke();
}
```

### Rectangles (Bar Chart)

```javascript
function drawBars() {
  data.forEach(d => {
    const x = xScale(d.category);
    const y = yScale(d.value);
    const barWidth = xScale.bandwidth();
    const barHeight = height - y;

    context.fillStyle = "steelblue";
    context.fillRect(x, y, barWidth, barHeight);
  });
}
```

### Text

```javascript
context.font = "12px system-ui";
context.fillStyle = "#333";
context.textAlign = "center";
context.textBaseline = "middle";
context.fillText("Label", x, y);
```

## Hit Testing for Interactivity

Canvas doesn't have DOM events per element. You must implement hit testing.

### Quadtree for Points

```javascript
const quadtree = d3.quadtree()
  .x(d => xScale(d.x))
  .y(d => yScale(d.y))
  .addAll(data);

canvas.addEventListener("mousemove", function(event) {
  const [mx, my] = d3.pointer(event);
  const radius = 10;  // Hit radius
  const nearest = quadtree.find(mx, my, radius);

  if (nearest) {
    showTooltip(nearest, event);
  } else {
    hideTooltip();
  }
});
```

### Binary Search for Bars

For bar charts with x-axis categories:

```javascript
canvas.addEventListener("mousemove", function(event) {
  const [mx, my] = d3.pointer(event);

  // Find which bar was hit
  const hitBar = data.find(d => {
    const x = xScale(d.category);
    const y = yScale(d.value);
    const barWidth = xScale.bandwidth();
    const barHeight = height - y;

    return mx >= x && mx <= x + barWidth &&
           my >= y && my <= y + barHeight;
  });

  if (hitBar) {
    showTooltip(hitBar, event);
  } else {
    hideTooltip();
  }
});
```

### Hidden Canvas for Complex Shapes

For complex hit testing, use a hidden canvas with unique colors:

```javascript
const hiddenCanvas = document.createElement("canvas");
const hiddenContext = hiddenCanvas.getContext("2d");
hiddenCanvas.width = width;
hiddenCanvas.height = height;

// Color-to-data mapping
const colorToData = new Map();

function drawHidden() {
  data.forEach((d, i) => {
    // Unique color per element
    const color = `rgb(${Math.floor(i / 256 / 256) % 256}, ${Math.floor(i / 256) % 256}, ${i % 256})`;
    colorToData.set(color, d);

    hiddenContext.fillStyle = color;
    // Draw same shape as visible canvas
    hiddenContext.beginPath();
    hiddenContext.arc(xScale(d.x), yScale(d.y), 3, 0, 2 * Math.PI);
    hiddenContext.fill();
  });
}

canvas.addEventListener("mousemove", function(event) {
  const [mx, my] = d3.pointer(event);
  const pixel = hiddenContext.getImageData(mx, my, 1, 1).data;
  const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  const hitData = colorToData.get(color);

  if (hitData) showTooltip(hitData, event);
});
```

## Performance Optimization

### Avoid Per-Frame Allocations

```javascript
// Bad: creates new array each frame
function draw() {
  const filtered = data.filter(d => d.visible);  // Allocation!
  filtered.forEach(d => drawPoint(d));
}

// Good: reuse arrays
const visiblePoints = [];
function draw() {
  visiblePoints.length = 0;  // Clear without allocation
  data.forEach(d => {
    if (d.visible) visiblePoints.push(d);
  });
  visiblePoints.forEach(d => drawPoint(d));
}
```

### Use requestAnimationFrame

```javascript
let needsRedraw = false;

function scheduleRedraw() {
  if (!needsRedraw) {
    needsRedraw = true;
    requestAnimationFrame(() => {
      draw();
      needsRedraw = false;
    });
  }
}

// Call scheduleRedraw() instead of draw() directly
data.forEach(d => d.x += 1);
scheduleRedraw();
```

### OffscreenCanvas for Heavy Computation

```javascript
const offscreen = new OffscreenCanvas(width, height);
const offscreenContext = offscreen.getContext("2d");

// Draw to offscreen
offscreenContext.drawImage(/* complex rendering */);

// Blit to visible canvas
context.drawImage(offscreen, 0, 0);
```

### Web Workers for Data Processing

```javascript
// main.js
const worker = new Worker("worker.js");

worker.postMessage({ data: rawData, type: "process" });

worker.onmessage = function(event) {
  const processedData = event.data;
  draw(processedData);
};

// worker.js
self.onmessage = function(event) {
  const { data, type } = event.data;
  if (type === "process") {
    const result = heavyProcessing(data);
    self.postMessage(result);
  }
};
```

## Hybrid SVG + Canvas

Use SVG for axes and labels, Canvas for data:

```html
<div id="chart" style="position: relative;">
  <canvas id="data-layer" style="position: absolute;"></canvas>
  <svg id="ui-layer" style="position: absolute; pointer-events: none;">
    <!-- Axes, labels, annotations -->
  </svg>
</div>
```

```javascript
// Draw data on canvas
const canvas = document.getElementById("data-layer");
const ctx = canvas.getContext("2d");
drawData(ctx, data);

// Draw axes with D3 on SVG
const svg = d3.select("#ui-layer");
svg.append("g").call(d3.axisBottom(xScale));
svg.append("g").call(d3.axisLeft(yScale));
```

## Sources

- D3.js documentation — <https://d3js.org/getting-started>
- D3 API Reference — <https://github.com/d3/d3/blob/main/API.md>
- MDN Canvas API — <https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API>

## Complete Example: Large Scatterplot

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #chart { position: relative; }
    #canvas { position: absolute; top: 0; left: 0; }
    #svg { position: absolute; top: 0; left: 0; pointer-events: none; }
    .tooltip {
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      padding: 8px;
      pointer-events: none;
      opacity: 0;
    }
  </style>
</head>
<body>
  <div id="chart">
    <canvas id="canvas"></canvas>
    <svg id="svg"></svg>
  </div>
  <div class="tooltip" id="tooltip"></div>

  <script type="module">
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

    // Generate 10,000 random points
    const data = d3.range(10000).map(i => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      category: ["A", "B", "C"][Math.floor(Math.random() * 3)],
      id: i
    }));

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 800;
    const height = 600;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);
    const colorScale = d3.scaleOrdinal().domain(["A", "B", "C"]).range(d3.schemeTableau10);

    // Canvas setup
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);

    // Draw points
    function draw() {
      ctx.clearRect(0, 0, width, height);

      const byCategory = d3.group(data, d => d.category);
      byCategory.forEach((points, category) => {
        ctx.fillStyle = colorScale(category);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        points.forEach(d => {
          ctx.moveTo(xScale(d.x) + 3, yScale(d.y));
          ctx.arc(xScale(d.x), yScale(d.y), 3, 0, 2 * Math.PI);
        });
        ctx.fill();
      });
    }

    draw();

    // SVG axes
    const svg = d3.select("#svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    // Quadtree for hit testing
    const quadtree = d3.quadtree()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .addAll(data);

    // Tooltip
    const tooltip = document.getElementById("tooltip");

    canvas.addEventListener("mousemove", function(event) {
      const [mx, my] = d3.pointer(event);
      const nearest = quadtree.find(mx, my, 10);

      if (nearest) {
        tooltip.style.opacity = 1;
        tooltip.style.left = (event.pageX + 10) + "px";
        tooltip.style.top = (event.pageY - 10) + "px";
        tooltip.textContent = `Category: ${nearest.category}, X: ${nearest.x.toFixed(1)}, Y: ${nearest.y.toFixed(1)}`;
      } else {
        tooltip.style.opacity = 0;
      }
    });
  </script>
</body>
</html>
```

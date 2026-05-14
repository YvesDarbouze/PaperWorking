# Network Visualization Patterns

Force-directed graphs and network visualizations require specific patterns for visibility, layering, and interaction. This reference provides the foundational patterns that prevent common rendering failures. Verify D3 force simulation APIs and WCAG contrast requirements against current documentation before implementing.

## SVG Layer Composition

SVG renders elements in DOM order—elements appended later render on top. For network graphs, incorrect ordering causes edges to block node interaction or labels to be obscured.

### Required Layer Order

```javascript
const svg = d3.select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// 1. Background layer (optional: grid, reference lines)
const bgLayer = svg.append('g').attr('class', 'background');

// 2. Edges MUST be appended before nodes
const linkLayer = svg.append('g').attr('class', 'links');

// 3. Nodes after edges
const nodeLayer = svg.append('g').attr('class', 'nodes');

// 4. Labels last (always visible on top)
const labelLayer = svg.append('g').attr('class', 'labels');
```

**Why this matters:**

- Edges appended after nodes render on top, blocking clicks
- Labels appended before nodes become obscured by node fills
- Incorrect order breaks interaction even when visual output appears correct

### Verification

Inspect the DOM to confirm correct ordering:

```html
<svg>
  <g class="background">...</g>
  <g class="links">...</g>      <!-- Must come before nodes -->
  <g class="nodes">...</g>
  <g class="labels">...</g>
</svg>
```

## Edge Visibility Requirements

Edges frequently fail to render visibly due to insufficient contrast, opacity, or stroke-width. Apply these minimum thresholds:

| Property | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| stroke-width | 1.5px | 2px | WCAG AA compliance at 2px |
| opacity | 0.4 | 0.5-0.6 | Below 0.3 is imperceptible |
| contrast ratio | 3:1 | 4.5:1 | Against background color |

### Safe Edge Colors

Colors tested against white background (#fff):

| Color | Contrast | Status |
|-------|----------|--------|
| #333 | 12.63:1 | Excellent |
| #555 | 7.46:1 | Good |
| #666 | 5.74:1 | Acceptable |
| #777 | 4.54:1 | Minimum for text |
| #888 | 3.54:1 | Borderline |
| #999 | 2.85:1 | **Fails WCAG** |
| #aaa | 2.32:1 | **Fails WCAG** |

**Recommendation:** Use #666 or darker for edge strokes.

### Edge CSS Baseline

```css
.link {
  fill: none;
  stroke: #666;
  stroke-width: 1.5px;
  stroke-opacity: 0.6;
  stroke-linecap: round;
}
```

### Path vs Line Elements

Use `<path>` elements with arc curves when edges may overlap—arcs visually distinguish parallel connections:

```javascript
// Line elements (simple, straight)
linkLayer.selectAll('line')
  .data(links)
  .join('line')
  .attr('stroke', '#666')
  .attr('stroke-width', d => weightScale(d.weight))
  .attr('stroke-opacity', 0.6);

// Path elements with arcs (distinguishable when overlapping)
linkLayer.selectAll('path')
  .data(links)
  .join('path')
  .attr('fill', 'none')
  .attr('stroke', '#666')
  .attr('stroke-width', d => weightScale(d.weight))
  .attr('stroke-opacity', 0.6);

// Tick function for arc paths
simulation.on('tick', () => {
  allLinks.attr('d', d => {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;  // Arc radius
    return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
  });
});
```

## Force Simulation Setup

### Basic Configuration

```javascript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links)
    .id(d => d.id)
    .distance(80))                          // Target link length
  .force('charge', d3.forceManyBody()
    .strength(-200))                        // Repulsion strength
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide()
    .radius(d => d.radius + 4))             // Prevent overlap
  .alphaDecay(0.02)                         // Slower = more stable layout
  .velocityDecay(0.4);                      // Damping reduces oscillation
```

### Tick Function

Update positions on each simulation tick:

```javascript
simulation.on('tick', () => {
  // Update line positions
  allLinks
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  // Update node positions
  allNodes.attr('transform', d => `translate(${d.x},${d.y})`);
});
```

### Constraining to Viewport

Prevent nodes from escaping bounds:

```javascript
simulation.on('tick', () => {
  nodes.forEach(d => {
    d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
    d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
  });

  // Update positions...
});
```

### Stopping and Restarting

```javascript
// Stop when stable
simulation.on('end', () => {
  console.log('Simulation stabilized');
});

// Restart on data change
function updateData(newNodes, newLinks) {
  simulation.nodes(newNodes);
  simulation.force('link').links(newLinks);
  simulation.alpha(1).restart();
}
```

## Node Sizing

Use area-based perception for node size encoding—human perception judges area, not radius:

```javascript
// Wrong: linear radius makes large values appear disproportionately bigger
const radiusScale = d3.scaleLinear()
  .domain([0, maxValue])
  .range([4, 30]);

// Correct: sqrt scale for area-based perception
const radiusScale = d3.scaleSqrt()
  .domain([0, maxValue])
  .range([4, 30]);
```

### Minimum Node Sizes

| Target | Minimum Radius | Minimum Diameter |
|--------|----------------|------------------|
| Click target | 4px | 8px |
| Touch target | 6px | 12px |
| Comfortable interaction | 8px | 16px |

## Label Positioning

Labels must not block node interaction:

```javascript
labelLayer.selectAll('text')
  .data(nodes)
  .join('text')
  .text(d => d.label)
  .attr('dx', d => d.radius + 4)           // Offset from node edge
  .attr('dy', '.35em')                      // Vertical center
  .attr('text-anchor', 'start')             // Left-align
  .style('pointer-events', 'none')          // CRITICAL: pass through clicks
  .style('font-size', '11px')
  .style('paint-order', 'stroke')           // Text outline effect
  .style('stroke', 'white')
  .style('stroke-width', '3px');
```

### Position Strategies

| Strategy | Code | Best For |
|----------|------|----------|
| Right of node | `dx = radius + 4` | Left-to-right reading |
| Above node | `dy = -(radius + 4)` | Horizontal layouts |
| Below node | `dy = radius + 14` | Top-heavy graphs |
| Centered | `text-anchor: middle` | Isolated nodes |

### White Outline for Readability

```css
.node-label {
  font-size: 11px;
  pointer-events: none;
  fill: #333;
  paint-order: stroke;
  stroke: white;
  stroke-width: 3px;
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

## Interactive Highlighting

Network graphs require hover feedback to reveal connections:

```javascript
// Precompute adjacency for O(1) lookup
const linkedByIndex = new Set();
links.forEach(d => {
  linkedByIndex.add(`${d.source.id},${d.target.id}`);
  linkedByIndex.add(`${d.target.id},${d.source.id}`);
});

function isConnected(a, b) {
  return a.id === b.id || linkedByIndex.has(`${a.id},${b.id}`);
}

// Hover handlers
allNodes
  .on('mouseover', (event, d) => {
    // Highlight connected edges
    allLinks
      .style('stroke-opacity', l =>
        (l.source.id === d.id || l.target.id === d.id) ? 1.0 : 0.1)
      .style('stroke', l =>
        (l.source.id === d.id || l.target.id === d.id) ? '#e63946' : '#666');

    // Highlight connected nodes
    allNodes.style('opacity', n => isConnected(n, d) ? 1.0 : 0.3);
  })
  .on('mouseout', () => {
    // Reset all
    allLinks
      .style('stroke-opacity', 0.6)
      .style('stroke', '#666');
    allNodes.style('opacity', 1.0);
  });
```

### Highlight CSS Classes

Define styles for interactive states:

```css
.link {
  transition: stroke-opacity 0.15s, stroke 0.15s;
}

.link.highlighted {
  stroke: #e63946 !important;
  stroke-opacity: 1 !important;
}

.link.faded {
  stroke-opacity: 0.1;
}

.node {
  transition: opacity 0.15s;
}

.node.faded {
  opacity: 0.3;
}
```

## Drag Behavior

Enable node dragging for exploration:

```javascript
function drag(simulation) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

// Apply to nodes
allNodes.call(drag(simulation));
```

## Filtering and Controls

Dense networks benefit from filtering controls:

```javascript
// Weight threshold slider
const slider = d3.select('#weight-filter')
  .attr('type', 'range')
  .attr('min', 0)
  .attr('max', maxWeight)
  .attr('value', minWeight)
  .on('input', function() {
    const threshold = +this.value;
    updateVisibility(threshold);
  });

function updateVisibility(threshold) {
  allLinks
    .style('display', d => d.weight >= threshold ? null : 'none');

  // Hide orphaned nodes (no visible connections)
  const connectedNodes = new Set();
  links.filter(d => d.weight >= threshold).forEach(d => {
    connectedNodes.add(d.source.id);
    connectedNodes.add(d.target.id);
  });

  allNodes
    .style('display', d => connectedNodes.has(d.id) ? null : 'none');
}
```

## Accessibility

### ARIA Labeling

```javascript
const svg = d3.select('#chart')
  .append('svg')
  .attr('role', 'img')
  .attr('aria-labelledby', 'network-title network-desc');

svg.append('title')
  .attr('id', 'network-title')
  .text('Topic Co-occurrence Network');

svg.append('desc')
  .attr('id', 'network-desc')
  .text(`Network showing ${nodes.length} topics with ${links.length} connections`);
```

### Keyboard Navigation

```javascript
allNodes
  .attr('tabindex', 0)
  .attr('role', 'button')
  .attr('aria-label', d => `${d.label}: ${d.connections} connections`)
  .on('keydown', (event, d) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      highlightConnected(d);
    }
  })
  .on('focus', (event, d) => highlightConnected(d))
  .on('blur', resetHighlight);
```

### Data Table Alternative

Provide a table view for screen readers:

```html
<details>
  <summary>Data table view</summary>
  <table>
    <caption>Network connections</caption>
    <thead>
      <tr><th>From</th><th>To</th><th>Weight</th></tr>
    </thead>
    <tbody>
      <!-- Populated by JS -->
    </tbody>
  </table>
</details>
```

```javascript
const tbody = d3.select('details tbody');
tbody.selectAll('tr')
  .data(links)
  .join('tr')
  .html(d => `<td>${d.source.label}</td><td>${d.target.label}</td><td>${d.weight}</td>`);
```

## Performance Considerations

| Node Count | Recommendation |
|------------|----------------|
| < 100 | SVG with full interactivity |
| 100-500 | SVG with simplified labels |
| 500-1000 | Consider canvas hybrid |
| > 1000 | Use canvas or WebGL |

### Canvas Fallback

For large graphs, render edges to canvas while keeping nodes as SVG for interactivity:

```javascript
const canvas = d3.select('#chart')
  .append('canvas')
  .attr('width', width)
  .attr('height', height)
  .style('position', 'absolute');

const context = canvas.node().getContext('2d');

simulation.on('tick', () => {
  // Clear and redraw edges on canvas
  context.clearRect(0, 0, width, height);
  context.strokeStyle = '#666';
  context.globalAlpha = 0.6;

  links.forEach(d => {
    context.beginPath();
    context.moveTo(d.source.x, d.source.y);
    context.lineTo(d.target.x, d.target.y);
    context.stroke();
  });

  // Update SVG nodes (overlay)
  allNodes.attr('transform', d => `translate(${d.x},${d.y})`);
});
```

## Common Problems and Solutions

| Problem | Symptom | Cause | Solution |
|---------|---------|-------|----------|
| Edges not visible | Lines don't appear | opacity < 0.3, contrast < 3:1, stroke-width < 1px | Set opacity ≥ 0.5, use #666 or darker, stroke-width ≥ 1.5px |
| Edges block clicks | Can't click nodes | Links appended after nodes | Append link layer before node layer |
| Labels overlap nodes | Text covers circles | No offset, wrong anchor | Set dx = radius + 4, text-anchor: start |
| Labels block clicks | Can't click under labels | Labels capture events | Set pointer-events: none on labels |
| Layout never stabilizes | Nodes keep moving | alphaDecay too low | Increase alphaDecay to 0.02-0.05 |
| Nodes fly off screen | Layout expands | No bounds constraint | Clamp x/y in tick function |
| No hover feedback | Can't trace connections | Missing interaction | Implement mouseover/mouseout handlers |
| Poor performance | Laggy, dropped frames | Too many DOM elements | Use canvas for > 500 nodes |

## Verification Checklist

Before finalizing a network visualization:

**Structure:**

- [ ] Link layer appears before node layer in DOM
- [ ] Labels have pointer-events: none

**Visibility:**

- [ ] Edge stroke-width ≥ 1.5px (check computed value)
- [ ] Edge opacity ≥ 0.4
- [ ] Edge color passes 3:1 contrast vs background
- [ ] Node radius ≥ 4px for click targets

**Interaction:**

- [ ] Hover highlights connected edges
- [ ] Hover de-emphasizes unconnected elements
- [ ] Nodes are draggable
- [ ] Dense graphs have filtering controls

**Accessibility:**

- [ ] SVG has role="img" and aria-labelledby
- [ ] Nodes have tabindex, role, aria-label
- [ ] Keyboard navigation works (Enter/Space to select)
- [ ] Data table alternative is present

**Performance:**

- [ ] Graph with 100 nodes loads in < 1s
- [ ] Interaction feels responsive (30fps+)
- [ ] Canvas fallback for graphs > 500 nodes

## Sources

- D3.js documentation — <https://d3js.org/getting-started>
- D3 API Reference — <https://github.com/d3/d3/blob/main/API.md>
- WCAG 2.2 Quick Reference — <https://www.w3.org/WAI/WCAG22/quickref/>
- WAI-ARIA 1.2 specification — <https://www.w3.org/TR/wai-aria-1.2/>

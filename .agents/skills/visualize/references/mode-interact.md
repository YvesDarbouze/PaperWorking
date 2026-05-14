# Interact Mode

Add tooltips, selection, filtering, zoom/pan, and responsive behavior. Load this during
Phase 3 (Build) when signals indicate interactivity ("hover", "filter", "brush", "zoom",
"linked views"). Verify D3 interaction APIs (d3.brush, d3.zoom, d3.drag) against current
D3 docs before implementing.

## Interaction Vocabulary

- **Selection/highlighting** — hover for details on demand; click to create persistent focus;
  brushing to select regions by extent
- **Filtering** — hide data outside a condition; use external controls (slider, dropdown) or
  in-chart brush to drive transforms
- **Navigation** — zoom changes detail level; pan moves the viewport; both can be coordinated
  across views
- **Linked views** — a selection or brush in one view propagates highlight or filter to others
  sharing the same data dimension

---

## Vega Interaction Patterns

Vega interaction is built on **signals** — reactive named values that update on events and
drive mark properties via expressions.

### Tooltip via signal + vegaEmbed plugin

Set `{"tooltip": {"signal": "datum"}}` on any mark. vegaEmbed's tooltip plugin renders it
automatically. Use a signal expression to control which fields appear:

```json
{
  "marks": [{
    "type": "rect",
    "encode": {
      "update": {
        "tooltip": {"signal": "{'Name': datum.name, 'Value': format(datum.value, ',.0f')}"}
      }
    }
  }]
}
```

For a fully custom in-SVG tooltip (no plugin), add a `text` mark driven by a `tooltip` signal
(`"on": [{"events": "rect:pointerover", "update": "datum"}, {"events": "rect:pointerout", "update": "{}"}]`)
and conditional opacity.

### Hover highlight via signal + conditional opacity

```json
{
  "signals": [
    {
      "name": "hovered", "value": null,
      "on": [
        {"events": "symbol:pointerover", "update": "datum.category"},
        {"events": "symbol:pointerout",  "update": "null"}
      ]
    }
  ],
  "marks": [{
    "type": "symbol",
    "encode": {
      "update": {
        "opacity": {"signal": "hovered === null || hovered === datum.category ? 1 : 0.2"}
      }
    }
  }]
}
```

### Click filtering via signal + data filter

```json
{
  "signals": [
    {
      "name": "selected", "value": null,
      "on": [
        {"events": "rect:click", "update": "selected === datum.category ? null : datum.category"}
      ]
    }
  ],
  "data": [{
    "name": "filtered",
    "source": "source",
    "transform": [
      {"type": "filter", "expr": "selected === null || datum.category === selected"}
    ]
  }]
}
```

### Brush selection via signals

```json
{
  "signals": [
    {"name": "brushStart", "value": 0, "on": [{"events": "mousedown", "update": "x()"}]},
    {"name": "brushEnd",   "value": 0, "on": [{"events": "mouseup",   "update": "x()"}]}
  ],
  "data": [{
    "name": "brushed",
    "source": "source",
    "transform": [{
      "type": "filter",
      "expr": "brushStart === brushEnd || (scale('xscale', datum.value) >= min(brushStart, brushEnd) && scale('xscale', datum.value) <= max(brushStart, brushEnd))"
    }]
  }]
}
```

Add a `rect` mark driven by `min(brushStart, brushEnd)` / `max(brushStart, brushEnd)` to
render the selection rectangle visually.

---

## D3 Interaction Patterns

D3 is imperative — attach listeners to selections, update DOM on events.

### Hover tooltip

```js
const tip = d3.select("body").append("div")
  .style("position", "absolute").style("visibility", "hidden")
  .style("background", "#fff").style("border", "1px solid #ccc")
  .style("padding", "6px 10px").style("font-size", "13px");

svg.selectAll("circle")
  .on("pointerover", (event, d) => tip.style("visibility", "visible")
      .html(`<strong>${d.name}</strong>: ${d3.format(",.0f")(d.value)}`))
  .on("pointermove", e => tip.style("top", `${e.pageY - 28}px`).style("left", `${e.pageX + 12}px`))
  .on("pointerout", () => tip.style("visibility", "hidden"));
```

### Transitions

```js
svg.selectAll("rect").data(newData).join("rect")
  .transition().duration(400).ease(d3.easeCubicOut)
    .attr("y", d => yScale(d.value))
    .attr("height", d => height - yScale(d.value));
```

### Zoom and pan

```js
svg.call(d3.zoom().scaleExtent([1, 8]).on("zoom", e => g.attr("transform", e.transform)));
```

### Brush

```js
const brush = d3.brushX()
  .extent([[0, 0], [width, height]])
  .on("brush end", ({selection}) => {
    if (!selection) return;
    const [x0, x1] = selection.map(xScale.invert);
    updateDetail(x0, x1); // filter data to [x0, x1] and re-render
  });
svg.append("g").call(brush);
```

---

## Temporal States

Visualizations exist across time, not in a single rendered frame. Design for the sessions
where data isn't present or well-formed — roughly 30% of real-world usage.

**Loading state.** Show chart structure before data arrives — skeleton with axis placeholders
and muted grid. Never show an empty axis with no explanation.

**Error state.** Communicate failure clearly and non-technically. The error display IS a
visual claim — "something went wrong" is better than a blank chart that implies "nothing
to see."

**Empty state.** When filters return zero results, explain why and suggest recovery actions
(broaden filters, check date range). A blank chart says "nothing to see" — often wrong.

**Partial data.** Indicate completeness visually. Incomplete data is not neutral — the brain
fills ambiguity with confabulation, inventing patterns in gaps. Use dashed lines, reduced
opacity, or explicit "data through [date]" annotations.

**Staleness.** When data hasn't refreshed, communicate age. A dashboard showing yesterday's
data without saying so is making a false currency claim.

---

## Responsive Behavior

**Vega autosize.** Set `"autosize": {"type": "fit", "contains": "padding"}` and `"width": "container"`.
The wrapper HTML must have a defined-width parent element.

**D3 viewBox.** Set `viewBox="0 0 W H" preserveAspectRatio="xMidYMid meet"` on `<svg>` and size
it to 100% width. No resize listener needed. Add a ResizeObserver only when re-projecting geographic
data or recomputing scales.

**Mobile considerations:**

- Tap replaces hover — attach `click` (or `pointerup`) as the tooltip trigger on touch targets
- Touch targets must be at least 44px; increase Vega mark size accordingly
  (`"mark": {"type": "point", "size": 200}`)
- Simplify brush interactions on mobile — multi-finger gestures conflict with scroll
- Consider landscape vs portrait layout adaptation for wide charts

---

## Phase Transition

After adding interactions:

- **Access** — verify keyboard accessibility of all interactions
- **Refine** — ensure interactions don't clutter or confuse

# Narrate Mode

Implementation guidance for titles, annotations, and narrative structure in standalone HTML
output. For principles (insight titles, annotate context, show uncertainty), see SKILL.md
§Narrative. This document covers how to build it.

## Story vs Exploration

One decision shapes everything: is this chart telling a story or enabling exploration?

**Story** (author-driven): Title states the insight. Annotations create a reading path.
Visual hierarchy guides the eye — primary bold/colored, secondary lighter, tertiary barely
visible. The viewer receives one clear takeaway without interaction.

**Exploration** (reader-driven): Title describes the data. Tooltips reveal detail on demand.
Filters and consistent scales support self-directed discovery. No annotations dictate
interpretation.

**Most charts are hybrid.** Deliver one clear insight by default (title + 1-3 annotations),
let tooltips reveal depth. That covers nearly every standalone HTML chart this skill produces.

When uncertain, default to story. A chart with a clear point that also supports exploration
beats a chart that supports exploration but makes no point.

## Title Craft

### Title types

| Type | Pattern | When |
|------|---------|------|
| Insight | "Northeast drives 60% of growth" | Default. Chart exists to make a point. |
| Descriptive | "Revenue by Region" | Dashboard tile; context established elsewhere. |
| Question | "What drives regional growth?" | Exploration-first; answer varies by viewer. |

Default to insight titles. 5-10 words max for the headline.

### Subtitle

Context the title assumes: time range, data source, scope. "Monthly revenue, North America,
2020-2024." The subtitle is where "Revenue by Region" belongs — as supporting detail under the
actual insight.

### The screenshot test

If someone screenshots this chart with no surrounding context, does the title + subtitle make
it interpretable? If not, revise. The title is the most-read element. The subtitle is the
second-most-read element. Everything else is optional.

### Vega title spec

```json
{
  "title": {
    "text": "Northeast drives 60% of revenue growth",
    "subtitle": "Monthly revenue by region, 2020-2024",
    "anchor": "start",
    "fontSize": 16,
    "subtitleFontSize": 12,
    "subtitleColor": "#868e96"
  }
}
```

## Annotation Implementation

### Annotation density

- Labels: 3-7 words. "30% higher than 2019."
- Callouts: 1-2 sentences max. Title (2-5 words bold) + body.
- Total: 1-3 primary annotations per chart. 2-4 secondary if needed.
- When annotations cover more area than data, step back. Wrong chart type or too much to say.

### Annotation hierarchy

| Level | Treatment | Example |
|-------|-----------|---------|
| Primary | Bold, oc-blue-7 or oc-red-7, larger font | The main insight callout |
| Secondary | Regular weight, oc-gray-6 | Supporting context, event markers |
| Tertiary | Small, oc-gray-5, no connector | Axis clarifications, source notes |

### Vega: text marks for labels

Position text marks relative to data using the same scales. `dx`/`dy` offset from the anchor.

```json
{
  "type": "text",
  "from": {"data": "annotations"},
  "encode": {
    "enter": {
      "x": {"scale": "x", "field": "date"},
      "y": {"scale": "y", "field": "value"},
      "dx": {"value": 5},
      "dy": {"value": -10},
      "text": {"field": "label"},
      "fontSize": {"value": 11},
      "fontWeight": {"value": "bold"},
      "fill": {"value": "#1864ab"},
      "align": {"value": "left"},
      "baseline": {"value": "bottom"}
    }
  }
}
```

For a single hardcoded annotation, skip the data source and use `signal` or `value`:

```json
{
  "type": "text",
  "encode": {
    "enter": {
      "x": {"signal": "scale('x', datetime(2020, 2, 15))"},
      "y": {"signal": "scale('y', 142)"},
      "text": {"value": "COVID-19 lockdowns begin"},
      "fontSize": {"value": 11},
      "fill": {"value": "#868e96"},
      "align": {"value": "left"}
    }
  }
}
```

### Vega: rule marks for reference lines

Horizontal threshold, vertical event marker, or connecting line between annotation and data.

```json
{
  "type": "rule",
  "encode": {
    "enter": {
      "y": {"scale": "y", "value": 80},
      "x": {"value": 0},
      "x2": {"signal": "width"},
      "stroke": {"value": "#e03131"},
      "strokeDash": {"value": [4, 4]},
      "strokeWidth": {"value": 1}
    }
  }
}
```

Vertical event marker (e.g., product launch date):

```json
{
  "type": "rule",
  "encode": {
    "enter": {
      "x": {"scale": "x", "signal": "datetime(2024, 2, 1)"},
      "y": {"value": 0},
      "y2": {"signal": "height"},
      "stroke": {"value": "#868e96"},
      "strokeDash": {"value": [6, 3]},
      "strokeWidth": {"value": 1}
    }
  }
}
```

### Vega: rect marks for highlight regions

Shade a region to draw attention to a time period or value range.

```json
{
  "type": "rect",
  "encode": {
    "enter": {
      "x": {"scale": "x", "signal": "datetime(2024, 0, 1)"},
      "x2": {"scale": "x", "signal": "datetime(2024, 5, 30)"},
      "y": {"value": 0},
      "y2": {"signal": "height"},
      "fill": {"value": "#1864ab"},
      "fillOpacity": {"value": 0.07}
    }
  }
}
```

### Vega: leader lines (text + rule pair)

When the label can't sit next to the data point, draw a thin rule from data to label.

```json
[
  {
    "type": "rule",
    "encode": {
      "enter": {
        "x": {"scale": "x", "signal": "datetime(2023, 5, 1)"},
        "y": {"scale": "y", "value": 142},
        "x2": {"scale": "x", "signal": "datetime(2023, 7, 1)"},
        "y2": {"scale": "y", "value": 170},
        "stroke": {"value": "#adb5bd"},
        "strokeWidth": {"value": 1}
      }
    }
  },
  {
    "type": "text",
    "encode": {
      "enter": {
        "x": {"scale": "x", "signal": "datetime(2023, 7, 1)"},
        "y": {"scale": "y", "value": 172},
        "text": {"value": "Record high: unprecedented demand"},
        "fontSize": {"value": 11},
        "fill": {"value": "#495057"}
      }
    }
  }
]
```

### D3: positioning and collision avoidance

For D3 charts, append annotation elements after data marks so they render on top.

**Positioning strategy**: Default to upper-right of the data point (dx > 0, dy < 0). Fall
back: upper-left, lower-right, lower-left. Avoid crossing data lines with connector paths.

**Collision avoidance**: When annotations cluster, route leader lines in the same direction
before diverging (parallel exit pattern). Manual `dx`/`dy` offsets are more reliable than
algorithmic placement for static charts.

**Implementation**: Standard D3 — append `<text>`, `<line>`, `<rect>` elements positioned via
the same scales used for data. The `d3-annotation` library exists but Claude knows the API;
use it when the chart has 4+ annotations that benefit from structured connector routing.

## What Cannot Be Built in Standalone HTML

These narrative techniques appear in references and tutorials but require frameworks or
infrastructure our output format does not include.

| Technique | Why it fails | What to do instead |
|-----------|-------------|-------------------|
| Scrollytelling | Requires scroll-step observer framework (Scrollama, GSAP ScrollTrigger) | Show all annotations at once; use opacity hierarchy |
| Slide shows / steppers | Requires stepper UI with state management | Single annotated view with the key frame |
| Martini glass (stem→bowl) | Requires transition from author-driven to reader-driven mode | Hybrid: annotations visible by default, tooltips for depth |
| Animated reveal sequences | Requires orchestrated transitions with timing | Static chart with visual hierarchy doing the work |

What standalone HTML CAN do:

- **Selection-driven highlighting**: Vega signals + conditional encoding to highlight on
  click/hover while dimming everything else.
- **Tooltip-based progressive disclosure**: Primary annotations always visible; secondary
  detail in tooltips on hover.
- **Layered annotations**: All visible at once, but hierarchy (bold/light, large/small,
  colored/gray) creates a natural reading order.

## Phase Transition

After adding narrative, consider:

- **Access** — text alternatives for annotations (screen readers need annotation content)
- **Interact** — if users should explore beyond the authored story
- **Refine** — verify annotations don't clutter or obscure data

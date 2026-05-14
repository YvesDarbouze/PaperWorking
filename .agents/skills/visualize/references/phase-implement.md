# Phase 3: Build

Build the visualization across five subtasks. Load mode docs one at a time as needed.

## Entry Conditions

Phase 2 (Research) complete with user approval:

- Encoding table (with units)
- Selected engine (Vega or D3) and template
- Ordered transformation plan

## Engine Paths

**Vega:** Define data transforms, signals, scales, axes, marks in a `.vg.json` spec.
Load [vega-patterns.md](vega-patterns.md) for syntax reference.

**D3:** Implement scales, axes, marks, interaction in standalone HTML.
Load [d3-patterns.md](d3-patterns.md) for syntax reference.

**Load ONE pattern doc. Never load both.**

## Subtask Dependency Graph

```
encode → compose → ┬─ narrate ─┐→ access-audit
                    └─ interact ─┘
```

Narrate and interact run in parallel. Access-audit runs after both complete.

## Subtasks

### 1. Encode — Scales, Marks, Data

Apply the encoding table from Phase 2.

1. Apply the transformation plan (pivot, aggregate, derive, coerce, filter)
2. Define scales: domain from data extent, range from layout. Use `"nice": true`.
3. Define marks matching the encoding table
4. Generate axes with labels that include units
5. Apply OpenColors palette. Verify no red-green pairs without redundant encoding.

**Color accessibility during encoding:**

- Verify palette uses OpenColors colorblind-safe combinations
- If custom colors needed, verify no distinction depends on color alone
- Check contrast: graphical objects ≥ 3:1 against adjacent colors in the code

Load [mode-encode.md](mode-encode.md) for encoding methodology.

### 2. Compose — Layout and Hierarchy

Arrange encoded elements into a coherent spatial layout.

1. Set margins: top 60px (title), right 40px, bottom 50px (axis), left 60px (axis). Adjust for content.
2. Apply visual hierarchy: primary data prominent, secondary lighter, tertiary near-invisible
3. Position axes, legends, controls. Prefer direct labels over legends.
4. Group related elements with proximity. Separate groups with whitespace.
5. For Vega: add `"role": "img"` and `"aria-labelledby"` on SVG root via config
6. For D3: add semantic SVG roles (`role="img"`, `aria-labelledby`, group data with `role="list"`)

Load [mode-compose.md](mode-compose.md) for composition methodology.

### 3. Narrate — Titles, Annotations, Story (parallel with interact)

1. Write title stating the takeaway (not the topic). 5-10 words.
2. Write subtitle with context: time range, data source, units
3. Annotate key insights: outliers, inflection points, comparisons. Use "30% higher than 2019" not just "45%".
4. For Vega: `text` marks for labels, `rule` marks for reference lines
5. For D3: positioned annotations with leader lines, collision avoidance
6. Write `<title>` and `<desc>` SVG elements describing the insight
7. Create data table fallback in `<details>` / `<summary>`

**What NOT to attempt:** scrollytelling, slide shows, animated revelation sequences.
The output format is standalone HTML — narrative works through title, annotations, and tooltips.

Load [mode-narrate.md](mode-narrate.md) for annotation methodology.

**Skip condition:** Dashboard component where narration lives in surrounding UI. Still write alt text.

### 4. Interact — Tooltips, Filters, Response (parallel with narrate)

1. Tooltips: show details on hover, position near but not obscuring the element. Include units.
2. Selection/brushing if exploration is needed (Vega signals, D3 event listeners)
3. Filtering controls if data density requires subsetting
4. Responsive layout: Vega `autosize`, D3 `viewBox`
5. Temporal states: loading skeleton, error display, empty state

Load [mode-interact.md](mode-interact.md) for interaction patterns.

**Skip condition:** Static medium (print, slide, PDF).

### 5. Access Audit — Integration Check

Verify accessibility holds together across all subtasks.

**Structural checks (verify by reading the code):**

- [ ] Palette uses OpenColors colorblind-safe combinations
- [ ] Contrast values in code meet 3:1 for graphical objects, 4.5:1 for text
- [ ] SVG has `<title>` and `<desc>` elements
- [ ] Data table fallback exists in `<details>` block
- [ ] Units present on all axes and tooltips
- [ ] Redundant encoding present (color + shape, or color + label)

**D3 additional checks:**

- [ ] `tabindex` and `keydown` handlers present for interactive elements
- [ ] Focus indicators: 2px solid outline, visible on all backgrounds
- [ ] `aria-label` on data groups
- [ ] Tab order follows visual scanning pattern

**Vega limitations (honest):** Vega renders its own SVG — you cannot add ARIA roles to
individual marks, implement keyboard navigation of data points, or manage focus. The data
table fallback and SVG `<title>`/`<desc>` are the primary accessible paths for Vega charts.

Load [mode-access.md](mode-access.md) for full accessibility methodology.

## Exit

Proceed to **Phase 4: Verify** with a complete draft HTML file.

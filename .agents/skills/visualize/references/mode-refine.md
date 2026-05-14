# Refine Mode

Audit and fix a visualization. Load this when improving an existing chart, responding to
"what's wrong with this", or running the mandatory Phase 4 second-draft pass.

Fix priority: **misleading > encoding mismatches > clarity > polish.** Never polish first.
A chart that's honest and correctly encoded but cluttered is better than a beautiful chart
that lies.

---

## Editorial Integrity

Check this first — before any structural or perceptual audit. These failures misrepresent
through framing rather than geometry. They are harder to detect because the geometry may
be technically correct.

### Threshold-based pre-interpretation

Continuous data collapsed into categories ("Good / Warning / Critical", "Confident / Still
collecting / Call it off") pre-interprets data before the viewer arrives. This is a lie
factor operating at the semantic level — formally honest, potentially manipulative.

**Legitimate when:** (1) criteria documented before data collection, (2) underlying evidence
one click away, (3) user can verify the threshold logic.

**Manipulative when:** thresholds were set after seeing results, no disclosure path, framing
serves organizational narrative rather than viewer comprehension.

Ask: did you choose thresholds that support your narrative, or did you commit to thresholds
before the data arrived?

### Metric selection bias

Choosing which metrics to display is itself an argument. The metrics excluded shape
interpretation as much as the metrics included.

**Fix:** Ask: would this metric be included if it showed the opposite trend? If no, its
absence is editorial, not practical.

### Designer's epistemic commitment

After spending time with data, you've formed conclusions. The visualization foregrounds
"interesting" findings and backgrounds inconvenient variance. Diagnostic: asymmetric visual
salience — important findings in pre-attentive channels, contradictory data in footnotes.

**Fix:** "Would this simplification survive if the finding went the other way?"

- If yes → clarity.
- If no → comfort. Remove the comfort.

---

## Fix Priority Order

| Priority | Category | What it covers |
|----------|----------|----------------|
| 1 | Misleading | Truncated bar axes, dual y-axes, 3D distortion, cherry-picked windows |
| 2 | Encoding mismatches | Wrong channel for data type, area for precise quantities |
| 3 | Clarity | Chart junk, legend vs. direct labels, color overload, sort order |
| 4 | Polish | Alignment, font consistency, spacing uniformity |

---

## Structural Audit — Verifiable by Reading Code

These checks require reading the Vega spec or HTML source only. No rendering needed.

- [ ] Encoding matches data type — length/position for quantities, hue for categories only
- [ ] Bar charts: `"zero": true` on the quantitative axis (or domain starts at 0)
- [ ] Units present on all axis labels and tooltips
- [ ] OpenColors palette in use — categorical: oc-blue-7, oc-orange-7, oc-teal-7, oc-red-7
- [ ] No dual y-axes — two series that need comparison use two stacked panels
- [ ] Categories sorted by value, not alphabetically (no `"sort": "ascending"` on nominal field)
- [ ] Title states the insight ("Northeast drives 60% of growth"), not the topic ("Revenue by Region")
- [ ] Redundant encoding present for colorblind accessibility — hue paired with shape, pattern, or label
- [ ] No 3D mark types or perspective transforms

---

## Perceptual Audit — Verifiable by Reasoning About the Spec

These checks require reasoning about what the spec will render, not running it.

- [ ] Primary insight is the visually loudest element — highest contrast, largest mark, or most prominent position
- [ ] Three-level hierarchy holds: primary (insight) / secondary (context) / tertiary (reference)
- [ ] Gridline stroke width and opacity are lighter than data mark stroke width
- [ ] Direct labels used where feasible — legends force round-trips between data and key
- [ ] If a glance at the spec shows equal visual weight across all series, the hierarchy is flat — that is a problem
- [ ] Spacing between groups is more generous than spacing within groups

---

## Regression Check — After Every Fix

Verify that the fix didn't introduce new problems:

- [ ] Color accessibility not broken — if palette changed, confirm OpenColors and no red-green pairs
- [ ] Annotations still accurate — if data or axes changed, re-read every annotation value
- [ ] Layout still balanced — if elements were removed, verify remaining elements fill space intentionally
- [ ] Units still present — if axis labels were edited, confirm units weren't dropped
- [ ] If a legend was removed, confirm categories are labeled directly

---

## Phase Routing After Refine

- Accessibility not verified → load [mode-access.md](mode-access.md)
- Fundamental encoding problem found → load [mode-encode.md](mode-encode.md)
- Structural problems revealed by refine pass → return to Phase 3 (Build)

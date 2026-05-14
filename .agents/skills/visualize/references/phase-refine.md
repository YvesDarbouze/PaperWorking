# Phase 4: Verify

Mandatory second draft. Every visualization gets two verification paths in parallel, a
fix pass, and re-verification before presenting to the user.

## Entry Conditions

Phase 3 (Build) complete. A draft HTML visualization exists.

## Verification Protocol (both paths, consensus required)

### Path A: Structural Verification

Read back the generated HTML file. Check:

- [ ] Vega spec is valid JSON (or D3 code has no syntax errors)
- [ ] Data fields in the spec match the encoding table from Phase 2
- [ ] Units present on all axis labels and tooltips
- [ ] OpenColors palette used (verify hex values)
- [ ] Title states the insight, not the topic
- [ ] Bar charts start at zero
- [ ] Categories sorted by value, not alphabetically
- [ ] No dual y-axes
- [ ] Redundant encoding for accessibility (color + shape or color + label)
- [ ] SVG `<title>` and `<desc>` elements present
- [ ] Data table fallback in `<details>` block

### Path B: Visual Verification

Open the chart in Chrome and inspect the rendered output:

```bash
open -a "Google Chrome" <path-to-html>
```

Read the screenshot. Check:

- [ ] Chart renders without errors
- [ ] Correct chart type visible
- [ ] Labels readable at normal zoom
- [ ] Spacing generous — margins adequate, elements not crowded
- [ ] Color contrast sufficient — data marks distinct from background
- [ ] Tooltips appear on hover with correct data and units
- [ ] Primary insight is the visually loudest element
- [ ] Three-level hierarchy visible (primary / secondary / tertiary)

### Consensus

Both paths must agree the chart is correct. If structural says "units missing" but visual
looks fine, trust structural — the code is ground truth. If visual shows rendering errors
but structural says the spec is valid, trust visual — the rendered output is what users see.

Fix all issues found by either path.

## Editorial Integrity Check

After structural and visual checks, load [mode-refine.md](mode-refine.md) for the full audit:

- **Threshold-based pre-interpretation:** Did you choose breakpoints that support the narrative?
- **Metric selection bias:** Would this metric be included if it showed the opposite trend?
- **Designer's epistemic commitment:** Are contradictory findings suppressed while "interesting"
  findings get prominence?

## Fix Priority

1. **Misleading** — truncated axes, hidden distribution, cherry-picked windows
2. **Encoding mismatches** — wrong channel for data type, missing units
3. **Clarity** — weak title, missing annotations, poor hierarchy
4. **Polish** — alignment, spacing, font consistency

## Second Draft

After fixing, produce a second draft and re-verify both paths. Apply `/frontend-design`
for a style pass on the second draft. Only proceed to Phase 5 after the second draft passes.

## Regression Check

After fixes: color accessibility intact? Annotations accurate? Layout balanced? Units present?

## Exit

- **Passing** → Phase 5: Present
- **Structural issues** → Phase 3 (specific subtask)
- **Encoding fundamentally wrong** → Phase 2 for re-planning

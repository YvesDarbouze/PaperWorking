# Encode Mode

Implementation guidance for encoding decisions. For core principles (channel ranking, data-type matching,
sqrt scaling, zero baselines), see SKILL.md. This document covers HOW to apply those principles.

## Contents

1. [Encoding Anti-Patterns](#encoding-anti-patterns)
2. [Quick Reference](#quick-reference)
3. [Encoding Process](#encoding-process)
4. [Cognitive Mode Strategy](#cognitive-mode-strategy)
5. [Scale Selection](#scale-selection)
6. [Channel Combinations](#channel-combinations)
7. [Density-Aware Encoding](#density-aware-encoding)
8. [Network Encoding](#network-encoding)

---

## Encoding Anti-Patterns

Read these BEFORE making encoding decisions.

| Mistake | Why It Fails | Fix |
|---------|-------------|-----|
| Area for precise comparison | ~20-50% error; psychophysical compression makes 2x area look like 1.5x | Use position or length; if area required, add value labels |
| Hue for magnitude | No perceptual ordering — "is red more than blue?" has no answer | Use luminance or saturation for magnitude; reserve hue for categories |
| Length for categories | Implies one category is "more" than another when no order exists | Use hue, shape, or spatial region |
| Encoding > 3 variables on one mark | Overwhelms working memory; viewers cannot decompose more than 3 channels simultaneously | Split into small multiples or separate panels |
| Same channel for two variables | Viewers cannot separate the two signals | Use separable channel pairs (see combinations table) |
| Linear radius for circles | Quadratic area distortion — 2x radius = 4x visual area | Scale radius by sqrt of value |

---

## Quick Reference

### Data Type → Channel

| Data Type | Best Channels | Avoid |
|-----------|---------------|-------|
| **Quantitative (Q)** | Position, length, area, luminance | Hue, shape (no magnitude) |
| **Ordinal (O)** | Position, length, luminance, saturation | Hue, shape (no order) |
| **Nominal (N)** | Hue, shape, spatial region | Length, area (false magnitude) |
| **Temporal (T)** | Position on x-axis (time scale) | — |

### Channel Effectiveness Ranking (quantitative)

| Rank | Channel | Typical Error | Use When |
|------|---------|--------------|----------|
| 1 | Position, common scale | ~2-5% | Primary variable — always first choice |
| 2 | Position, unaligned scale | ~5-10% | Small multiples, faceted comparison |
| 3 | Length | ~5-10% | Bar charts (requires zero baseline) |
| 4 | Angle / slope | ~10-20% | Trends (line slope), proportions (pie, ≤5 slices) |
| 5 | Area | ~20-50% | Third variable (bubbles), hierarchical (treemap) |
| 6 | Luminance / saturation | ~50%+ | Heatmaps, choropleths — ordinal "more/less" only |

For **nominal data**, use identity channels: spatial region, hue, shape, motion (sparingly).

---

## Encoding Process

### Step 1 — Classify every data attribute

- **Q (Quantitative):** Continuous, arithmetic meaningful. Revenue, temperature, counts.
- **O (Ordinal):** Ordered, intervals meaningless. Education level, satisfaction rating, size (S/M/L).
- **T (Temporal):** Time-based. May behave as Q (durations) or O (named months). Decide which matters.
- **N (Nominal):** Unordered categories. Country, product type, user ID.

Classification determines what channels are legal. Getting this wrong produces misleading charts.

### Step 2 — Determine cognitive mode

See [Cognitive Mode Strategy](#cognitive-mode-strategy). This changes which channels get priority.

### Step 3 — Assign channels top-down

1. Map the primary variable to the highest-ranked available channel (position first).
2. Map the secondary variable to the next available channel that is separable from the first.
3. If a third variable exists, use a channel separable from both (or switch to small multiples).
4. For each assignment, verify expressiveness: does this channel type match the data type?

### Step 4 — Choose scales

See [Scale Selection](#scale-selection). Match scale type to data classification and distribution shape.

### Step 5 — Validate

- **Accuracy:** Can the viewer extract values at the precision the task requires?
- **Comparison:** Are the quantities being compared on the same scale?
- **Discrimination:** Can the viewer distinguish all categories at real data density?
- **Accessibility:** Simulate deuteranopia/protanopia — if distinctions vanish, add redundant encoding.

---

## Cognitive Mode Strategy

Before applying the channel hierarchy, determine what the viewer needs to DO with the chart. This is
the single most important encoding decision after data classification.

### Inference mode — "arrive at a conclusion"

The viewer holds information in working memory, reasons about relationships, extracts values.

- **Prioritize accuracy:** Use highest-ranked channels (position, length).
- **Structure the reading path:** Title states the claim → primary data confirms it → secondary data provides context.
- **Reduce working memory load:** Direct labels on marks. Bring compared elements close together.
- **Minimize channel interference:** Use separable pairings only.

Example: "Q3 revenue grew 12% driven by Northeast expansion" — the viewer needs to verify the 12%
claim, compare regions, identify the Northeast contribution. Position on common scale, direct labels.

### Recognition mode — "make a decision"

The viewer needs to pattern-match and act. The answer should fire before reading any text.

- **Prioritize pre-attentive channels:** Saturated color, size contrast, spatial isolation.
- **Make the signal categorical:** Normal/abnormal, above/below threshold, in/out of range.
- **Use pop-out:** One saturated element in a field of muted tones. The critical item should be
  visually "loud" relative to everything else.
- **Accept lower accuracy:** The viewer doesn't need the exact number — they need the category.

Example: "Server latency exceeded SLA" — the viewer needs to spot which servers are red, not read
the exact millisecond values. Threshold coloring, large marks for violations.

### Diagnostic

Ask: "Is the viewer supposed to arrive at a conclusion, or make a decision?"

Conflating these modes produces charts that are technically accurate but cognitively wrong — inference
charts with decorative color that distracts from the reading path, or recognition charts with precise
axes that slow down the pattern match.

---

## Scale Selection

Choose scales based on data distribution and perceptual goals, not API convenience.

### When to use each scale type

| Scale | Data Shape | Why | Watch Out |
|-------|-----------|-----|-----------|
| **Linear** | Evenly distributed, meaningful zero | Preserves proportional reasoning; "twice as far = twice the value" | Poor for data spanning 3+ orders of magnitude |
| **Log** | Spans multiple orders of magnitude (1, 10, 100, 1000) | Equal visual distance = equal multiplicative change | Cannot include zero; misleads viewers unfamiliar with log scales — label clearly |
| **Sqrt** | Right-skewed counts, frequencies | Compresses high end less aggressively than log; zero-safe | Uncommon — viewers may not expect it |
| **Band** | Categorical axis (bars) | Equal-width bands with padding for discrete items | Implies no ordering unless you enforce sort |
| **Point** | Categorical axis (dots) | Equal spacing, no bandwidth — cleaner for dot plots | No bar width available |
| **Time** | Dates, timestamps | Handles irregular intervals, DST, leap years correctly | Axis tick formatting needs explicit attention |
| **Diverging** | Deviation from center (profit/loss, above/below average) | Two-hue color scale meeting at a neutral midpoint | Midpoint must be meaningful, not just the data median |
| **Quantize / Threshold** | Continuous → discrete bins | Converts smooth gradient to stepped classes for choropleths | Bin boundaries change the story — choose deliberately |

### Perceptual guidance

- **Default to linear.** Only switch when the data distribution makes linear unreadable.
- **Log scales require justification.** If the viewer doesn't understand logarithms, the chart fails.
  Always add a note: "Log scale — each gridline is 10x the previous."
- **Sqrt for area encoding.** When area represents quantity, apply sqrt to the underlying scale so
  visual area is proportional to data value.
- **Quantized/threshold scales editorialize.** Where you place bin boundaries determines what the map
  "says." Document the binning rationale.

---

## Channel Combinations

### Separable pairs — viewers judge each independently

| Channel A | Channel B | Good For |
|-----------|-----------|----------|
| Position (x, y) | Hue | Scatter with categories |
| Position (x, y) | Size | Bubble chart (third Q variable) |
| Position (x, y) | Shape | Scatter with few nominal groups |
| Hue | Shape | Redundant nominal encoding (accessibility) |
| Hue | Size | Category + magnitude |

### Integral pairs — viewers perceive as single gestalt

| Channel A | Channel B | The Problem |
|-----------|-----------|-------------|
| Width | Height | Perceived as area, not two independent values |
| Red channel | Green channel | Fuse into single color percept |
| Hue | Saturation | Difficult to separate; "light blue" vs "desaturated blue" |
| Size | Shape | Larger marks change shape appearance; asymmetric interference |

### Redundant encoding

Using two channels for the SAME variable (hue + shape for category) improves accessibility and speeds
recognition. Use when the variable is critical to the chart's message.

---

## Density-Aware Encoding

How many data points changes which channels work.

| Data Points | What Works | What Breaks | Strategy |
|-------------|-----------|-------------|----------|
| **< 20** | Everything — all channels discriminable | Nothing | Direct-label every mark. Consider whether a table is clearer. |
| **20–200** | Position, color, size all effective | Shape past ~50 points starts blurring | Standard multi-channel encoding. This is the sweet spot. |
| **200–10K** | Position dominates. Hue: ~8 categories max. | Area unreliable for comparison. Shape useless. Individual labels impossible. | Use transparency (alpha 0.2–0.5) to reveal density. Aggregate where possible. |
| **10K+** | Position + density encoding | Individual marks meaningless. Color categories merge. | Aggregate: heatmap, hexbin, contour, density plot. Or sample. See [canvas-patterns.md](canvas-patterns.md) for rendering. |

---

## Network Encoding

Force-directed and node-link diagrams use channels differently than statistical charts.

### Node channels

| Channel | Encodes | Scale | Notes |
|---------|---------|-------|-------|
| Radius | Degree, importance, value | **sqrt** (area perception) | Min 4px (click), 6px (touch), 8px (comfortable) |
| Fill | Category, cluster | Ordinal | Pair with shape for accessibility |
| Stroke | Selection state, highlight | Manual | 3:1 contrast against fill |
| Shape | Entity type | Ordinal | ≤ 5 shapes |

### Edge channels

| Channel | Encodes | Range | Notes |
|---------|---------|-------|-------|
| Stroke width | Weight, strength | 1.5–10px | Min 1.5px for visibility |
| Opacity | Confidence, secondary | 0.4–1.0 | Below 0.3 disappears |
| Color | Category, direction | Ordinal | Must pass 3:1 contrast against background |
| Dash pattern | Edge type (binary) | Solid/dashed | Two states only |

### Network-specific rules

- Node radius MUST use sqrt scale — viewers judge area, not radius.
- Edge opacity below 0.4 is invisible at normal zoom. Set 0.4 as floor.
- Edge stroke-width below 1.5px renders as hairline on most screens. Set 1.5px as floor.
- Interactive states (hover, focus) should produce ≥ 2x visual change from resting state.

---

## Phase Transition

After encoding, proceed to:

- **Compose** — arrange encoded elements with visual hierarchy and spacing
- **Access** — verify colorblind safety of the chosen palette and encoding redundancy
- **Refine** — if encoding choices feel uncertain, audit against these criteria

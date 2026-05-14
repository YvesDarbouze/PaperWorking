---
name: tree-of-thought
description: >-
  Systematic Tree of Thought reasoning for complex problem decomposition.
  This skill should be used when the user asks for "tree of thought",
  "systematic reasoning", "structured analysis", "multi-path evaluation",
  or wants to decompose a complex problem by generating and evaluating
  multiple solution paths before selecting the best approach. Applies
  four-phase reasoning: decomposition, generation, evaluation, and synthesis.
metadata:
  context: fork
---

# Tree of Thought Analysis

Apply Tree of Thought reasoning to the user's query through four phases.

## Query

`$ARGUMENTS`

## Phase 1: Decomposition

Break the query into core components with dependencies.

1. Identify 2-5 fundamental components.
2. For each: describe what it involves, why it has its position in the sequence, and what it depends on.
3. Map dependencies between components (which must resolve before others can start).

## Phase 2: Solution Generation

For each component, generate three distinct approaches:

- **A — Direct/Conventional**: straightforward, proven, minimal complexity.
- **B — Creative/Unconventional**: novel angle, handles edge cases, more flexible.
- **C — Systematic/Comprehensive**: thorough coverage, well-documented, maintainable.

Assign each a viability score (0.0-1.0) with brief rationale.

## Phase 3: Evaluation & Selection

Score each approach against weighted criteria:

| Criterion       | Weight |
|-----------------|--------|
| Feasibility     | 40%    |
| Effectiveness   | 35%    |
| Risk (lower=better) | 25% |

Present scores in a comparison table per component. Select the best approach for each with a one-line rationale.

## Phase 4: Synthesis

1. Integrate selected approaches into a coherent solution path with specific implementation steps per component.
2. Surface key insights: patterns recognized, trade-offs made, unexpected findings.
3. Assess overall confidence (High/Medium/Low with percentage) noting strongest elements and areas of uncertainty.
4. Note 1-2 alternative paths worth considering if the primary path encounters issues.

## Summary

Conclude with:

- **Recommended Solution**: one-paragraph synthesis.
- **Next Steps**: 2-3 immediate actions.
- **Success Metrics**: how to validate the solution works.

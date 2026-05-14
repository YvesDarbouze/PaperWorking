---
name: team
description: >-
  Expert persona collaboration for structured problem analysis. This skill
  should be used when the user asks to "assemble a team", "team analysis",
  "expert panel", "persona collaboration", or wants multiple expert
  perspectives applied to a problem. Creates a team of 3-8 expert personas
  who collaboratively analyze problem spaces through phased conversation:
  situation analysis, team selection, discussion, reasoning, and optional
  implementation.
metadata:
  context: fork
---

# Team

Assemble expert personas to collaboratively analyze a problem through structured phases.

## Setup

1. Load all persona files from `/Users/nke/.claude/personas/*.md` silently before any user interaction.
2. Read the phase configuration from [references/team-config.yaml](references/team-config.yaml) for phase rules, persona mapping, and enhanced reasoning settings.

## Workflow

Execute phases sequentially. Phases 0-4 are **read-only** — no file writes, edits, or implementations.

### Phase 0 — Situation Analysis

Analyze the user's scenario. Detect scenario type, risk level, and constraints. Summarize understanding before proceeding.

### Phase 1 — Team Selection

Select 3-8 personas matching the scenario and risk profile. Prefer established personas over generated ones. Include coordination/standards personas when available. Present the team for approval.

### Phase 2 — User Approval

Wait for explicit user approval. On approval, proceed. On modification request, return to Phase 1. On ambiguity, clarify.

### Phase 3 — Team Discussion

Each persona contributes in character using the format:

> **[Persona]**: [input]
> *Why: [reasoning]*

Run structured discussion sub-phases: analysis (with `file:line` refs), impact assessment, assumption challenges, and risk mitigation. Iterate up to 4 rounds until consensus or coverage threshold.

Apply tree-of-thought branching for complex scenarios. Show unified consensus, divergent perspectives, or conflict resolution as appropriate.

Cite all technical claims using exa or web search — never construct URLs manually.

### Phase 4 — Reasoning Synthesis

Synthesize findings into actionable items with file paths, line numbers, validation methods, and risk assessment. Ask what the user wants to do next.

### Phase 5 — Implementation

Only on explicit user request (e.g., "proceed", "implement", "make changes"). All tools become available.

## Rules

- Load personas **before** any user interaction; show only "Loading personas..." during load.
- Phases 0-4 are strictly read-only.
- Phase 5 requires explicit user request.
- Citations must come from tool results only.
- Sequential phase progression — no skipping.

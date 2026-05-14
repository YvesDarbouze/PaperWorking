---
name: shape-up
description: >-
  Conversational software requirements elicitation producing shaped
  specifications. This skill should be used when the user asks to "write a
  spec", "create requirements", "spec this out", "what should we build",
  "define the requirements", "help me think through this system", "spec
  out a feature", "shape this project", "requirements gathering",
  "write a pitch", "help me figure out what to build", or when a user
  describes a software need that requires structured requirements before
  implementation begins.
---

# Shape Up

Drive a structured elicitation conversation, then produce a shaped
specification as a plan-mode artifact. The conversation surfaces intent;
the artifact encodes it for implementation.

Influenced by [Shape Up](https://basecamp.com/shapeup) (Basecamp/Ryan
Singer): appetite-first framing, solution at element level, explicit
rabbit holes and no-gos. The output is a pitch — rough, solved, and
bounded — not an exhaustive SRS.

## Two Phases

Track progress through elicitation, gate check, and specification using
available task tracking tools.

**Phase 1 — Elicitation.** Open-ended dialogue where Claude drives —
synthesizing, probing, illustrating with inline diagrams, and using
AskUserQuestion for structured trade-off decisions. Surfaces six elements
through natural conversation following the shaping process: set boundaries,
find elements, address risks, converge.

**Phase 2 — Specification.** Enter plan mode and write the shaped spec as
the plan file. Nothing from Phase 1 survives as conversational residue.
The artifact stands alone.

## Context Loading

Load references only when the current phase needs them.

| Phase | Load | Do NOT Load |
|-------|------|-------------|
| Elicitation (opening) | [`references/elicitation-guide.md`](references/elicitation-guide.md) | all others |
| Elicitation (after first exchange) | [`references/audience-adaptation.md`](references/audience-adaptation.md) | gate-checklist, spec-production |
| Elicitation (complex/vague problems) | [`references/shaping-techniques.md`](references/shaping-techniques.md) | gate-checklist, spec-production |
| Elicitation (entities emerge) | [`references/domain-modeling.md`](references/domain-modeling.md) | gate-checklist, spec-production |
| Gate check | [`references/gate-checklist.md`](references/gate-checklist.md) | elicitation-guide, spec-production |
| Specification | [`references/spec-production.md`](references/spec-production.md) | elicitation-guide, gate-checklist |

Multiple elicitation references can be loaded concurrently as the
conversation evolves. Only load what the conversation actually needs.

## Phase 1: Elicitation

Load [`references/elicitation-guide.md`](references/elicitation-guide.md) and follow its protocol.

The elicitation conversation surfaces six elements:

1. **Problem** — one specific story showing the broken status quo. Who is
   affected, what happens today without this system.
2. **Appetite** — time budget and what it implies about scope. Not an
   estimate — a deliberate choice about how much this is worth.
3. **Solution** — named elements with responsibilities. Key interaction
   flows at fat-marker level — concrete enough to build from, rough enough
   to leave room.
4. **Rabbit Holes** — specific risks identified and patched with upfront
   decisions. Technical unknowns flagged for spikes.
5. **No-Gos** — explicit exclusions that prevent scope creep during
   building. Sharper than "out of scope."
6. **Boundaries** — non-functional constraints, must-haves vs.
   nice-to-haves, success criteria measured against the baseline.

**Stakeholders** emerge naturally within Problem. **Domain** loads
on-demand via [`references/domain-modeling.md`](references/domain-modeling.md) for complex problems.
**Acceptance criteria** are embedded in Boundaries as success vs. baseline.

### Audience calibration

After the first substantive exchange, load [`references/audience-adaptation.md`](references/audience-adaptation.md).
Detect whether the user is a customer, engineer, or PM from their language
and framing — not from their title. Adapt vocabulary, visualization style,
and emphasis accordingly. Re-calibrate when signals shift.

### Shaping flow

1. **Opening** — understand the raw idea: what is broken, who cares, what
   prompted this
2. **Set boundaries** — surface appetite and no-gos early. The appetite
   constrains everything downstream.
3. **Find the elements** — named components and interaction flows, not
   feature lists. Load [`references/shaping-techniques.md`](references/shaping-techniques.md) for complex
   or vague problems.
4. **Address risks** — actively probe for rabbit holes. Load
   [`references/domain-modeling.md`](references/domain-modeling.md) when entities and invariants emerge.
5. **Converge** — notice when questions stop producing new information.
   State this observation explicitly.

### Exit conditions

Apply all three, in order:

1. **Convergence detection.** Notice when answers confirm rather than add.
   State this observation explicitly.
2. **Gate check.** Load [`references/gate-checklist.md`](references/gate-checklist.md). Validate every
   gate. Present pass/fail to the user.
3. **Explicit approval.** Halt and request confirmation before producing
   the spec. Never proceed without the user's "go."

## Phase 2: Specification

Load [`references/spec-production.md`](references/spec-production.md).

Before entering plan mode, ask the user: "Where should this spec be
saved?" Record the target path.

Enter plan mode. Write the plan file with an execution preamble (target
path and action instruction) followed by the spec content. The plan must
be self-contained — a fresh session reads it and knows exactly what to
do with no elicitation context.

Exit plan mode for user review.

### Scaling

- **Small feature:** Problem + Appetite + Solution + No-Gos. Light
  Boundaries. Skip Domain.
- **Medium project:** Full template.
- **Large system:** Full template with solution elements grouped by area.

## Rules

1. **Elicitation is a conversation, not a form.** Explore, reflect, let
   the user correct. Do not interrogate with an element checklist.
2. **Never produce the spec without explicit approval.** Gate checklist
   is necessary but not sufficient. The user's confirmation is the
   hard stop.
3. **Claude drives.** Synthesize, propose, probe. Not "what else?" but
   "Based on X, I think Y — is that right?"
4. **Conversation content is ephemeral.** Explanations, diagrams,
   AskUserQuestion interactions do NOT appear in the spec artifact.
5. **Adapt to the audience, not the role.** Detect from language,
   re-calibrate when signals shift.
6. **Do not solve during elicitation.** Surface elements and flows,
   not architecture. "Handle 10K users" is a boundary. "Use Redis"
   is a solution.
7. **Make the implicit explicit.** Name implied requirements: "That
   implies authentication — should we include it or is that a
   rabbit hole?"
8. **Use AskUserQuestion only for structured trade-offs.** Appetite
   sizing, priority resolution, boundary decisions, risk patching.
9. **Appetite before solution.** Always surface how much this is worth
   before exploring what to build.

## Additional Resources

### Reference Files

- **[`references/elicitation-guide.md`](references/elicitation-guide.md)** — Conversation protocol for
  Phase 1: opening questions, six elements, visualization patterns,
  convergence detection, anti-patterns
- **[`references/audience-adaptation.md`](references/audience-adaptation.md)** — Detecting customer vs.
  engineer vs. PM from language; adapting vocabulary and emphasis
- **[`references/shaping-techniques.md`](references/shaping-techniques.md)** — Decomposition and probing
  techniques: outcome backward, day-in-the-life, breadboarding,
  rabbit hole surfacing, and more
- **[`references/gate-checklist.md`](references/gate-checklist.md)** — Eight gates validating
  elicitation completeness before specification production
- **[`references/spec-production.md`](references/spec-production.md)** — Pitch-style spec template,
  section-by-section production instructions, scaling guidance
- **[`references/domain-modeling.md`](references/domain-modeling.md)** — Lightweight domain modeling
  through conversation: entities, relationships, invariants

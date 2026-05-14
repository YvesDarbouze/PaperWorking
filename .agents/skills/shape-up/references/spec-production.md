# Spec Production

Produce the shaped specification artifact from elicitation output. The
plan file must be self-contained — a fresh Claude session reads it and
knows exactly what to do with no elicitation context.

Before entering plan mode, ask the user: "Where should this spec be
saved?" Record the target path.

Enter plan mode. Write the plan file with an execution preamble followed
by the spec content. Exit plan mode for user review.

## Plan File Structure

```markdown
# Shaped Spec: [Project Name]

## Execution

Write this specification to [target path]. This is a shaped pitch —
rough, solved, and bounded. It is ready for implementation planning.

---

[The spec content follows below.]
```

The execution preamble tells a fresh session what to do with the spec.
The spec content follows the template below.

## The Ephemeral Content Rule

Nothing from the Phase 1 conversation survives as conversational residue
in the spec artifact. No "as we discussed," no "based on our conversation,"
no explanatory asides, no ASCII diagrams that were used during elicitation.

The artifact reads as if written by someone who already knew the
requirements. It is a standalone document that can be handed to a builder
with no additional context.

## Spec Template

```markdown
# [Project Name]

## Problem

[One specific story showing the broken status quo. Name who is affected
and what their experience looks like today. 2-4 sentences.]

[Baseline: what happens today without this system. This is what "success"
is measured against.]

## Appetite

[Time budget and what it implies about scope.]
[What "good enough" looks like given this budget — not perfect, not
minimal, but right-sized.]

## Solution

### Elements

[Named components with responsibilities. Each element gets a name and a
one-sentence description of what it does. Fat-marker level — concrete
enough to build from, rough enough to leave room for the builder.]

| Element | Responsibility |
|---------|---------------|
| [Name] | [What it does] |

### Key Flows

[Interaction sequences showing how elements work together. Use numbered
steps: user does X → system does Y → user sees Z.]

[Include happy path and critical edge cases. Not every edge case — just
the ones that shape the solution.]

### Technical Context

[Only if relevant: existing systems, APIs, schemas, or infrastructure
that the solution must integrate with or build on.]

## Rabbit Holes

[Risks identified during shaping. Each entry: the risk, how it was
patched (or flagged for a spike).]

| Risk | Resolution |
|------|-----------|
| [What could go wrong] | [Patched: decision made / Spike: needs investigation] |

## No-Gos

[Explicit exclusions — things deliberately left out of this spec.
Bulleted list. Each no-go should be specific enough that a builder
can recognize when they're about to violate it.]

## Boundaries

### Constraints

[Non-functional requirements with measurable thresholds where possible.]

| Type | Constraint | Threshold |
|------|-----------|-----------|
| Performance | [e.g., page load time] | [e.g., p95 < 2s] |
| Security | [e.g., PII handling] | [e.g., encrypted at rest] |
| Compliance | [e.g., GDPR] | [e.g., right to deletion within 30 days] |

### Must-haves vs. Nice-to-haves

[If scope was trimmed during shaping, distinguish what must ship from
what can be cut if time runs short.]

- **Must:** [capability]
- **Must:** [capability]
- ~**Nice:** [capability]~
- ~**Nice:** [capability]~

### Success

[How to know this is good enough, measured against the baseline from
the Problem section. Not "it works" — a specific observable condition.]

## Open Questions

[Anything surfaced during elicitation that remains unresolved. These
are honest about what is NOT known. Each question should name what
decision it blocks.]

[If no open questions exist, omit this section entirely.]
```

## Section-by-Section Production Instructions

### Problem

Distill the opening conversation into a narrative. One specific story —
not a list of features, not a persona template. Name the affected
stakeholders inline. State the baseline explicitly: this is what success
is measured against.

### Appetite

State the time budget. If appetite was set during elicitation, reproduce
it. If it was a soft-fail in the gate check, note: "Appetite not
constrained — scope reflects full requirements without time budget."

### Solution — Elements

Each named element from the shaping conversation becomes a row. Use the
names that emerged during conversation — they form the ubiquitous
language for the project. Do NOT rename for consistency unless the user
confirmed the rename during elicitation.

### Solution — Key Flows

Distill the scenario traces and breadboard sketches from elicitation
into numbered flow steps. Include only flows that shape the solution —
not exhaustive use case documentation. Happy path + critical edge cases.

### Solution — Technical Context

Include only if technical context emerged during elicitation (existing
APIs, schemas, deployment constraints). For customer-facing specs, this
section may be minimal or omitted.

### Rabbit Holes

Each risk from the risk-probing phase becomes a row. State both the risk
and the resolution. "Patched" means a decision was made upfront. "Spike"
means investigation is needed before committing.

### No-Gos

Convert exclusions into specific, recognizable statements. "No mobile
app" is good. "No unnecessary features" is not — it's too vague to
enforce during building.

### Boundaries

Group constraints by type. Include measurable thresholds where they were
surfaced. Use the must-have / nice-to-have distinction only if scope was
explicitly trimmed during elicitation.

### Success

This is the single most important sentence in the spec. It must be
measurable against the baseline stated in the Problem section. "Users
can self-serve order status in under 10 seconds, eliminating 90% of
support emails" — measured against "customers currently email support and
wait 4 hours."

### Open Questions

Only include if there are genuinely unresolved questions. Each question
should name what decision it blocks. This prevents the spec from
pretending completeness where uncertainty exists.

## Scaling Guidance

### Small feature (single capability, tight scope)

Use a minimal template:

- Problem (2-3 sentences)
- Appetite (one line)
- Solution — elements + one flow
- No-Gos (2-3 exclusions)
- Success (one sentence)

Omit: Rabbit Holes (if none), Technical Context (if trivial),
Boundaries table (if standard defaults), Open Questions (if none).

### Medium project (feature set, moderate complexity)

Full template as shown above.

### Large system (multi-area, many stakeholders)

Full template with Solution elements grouped by area:

```markdown
### Elements

#### [Area 1: e.g., Order Management]
| Element | Responsibility |
|---------|---------------|
...

#### [Area 2: e.g., Reporting]
| Element | Responsibility |
|---------|---------------|
...
```

Key Flows section may also be grouped by area.

## Domain Model Inclusion

If [`references/domain-modeling.md`](domain-modeling.md) was loaded during elicitation and
entities were modeled, include a Domain Model subsection within Solution:

```markdown
### Domain Model

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| [Name] | [What it represents] | [Important attributes] |

**Relationships:** [ASCII diagram or prose description]

**Invariants:**
- [Business rule that must always hold]
```

For simple systems where domain modeling was not needed, omit this
section entirely.

## Plan-Mode Formatting

The plan file starts with the execution preamble (`## Execution` with
target path), followed by the spec content. Format the spec for
scannability:

- Use headers, tables, and lists — minimize prose paragraphs
- Every section should be scannable in under 10 seconds
- Tables for structured data (elements, constraints, risks)
- Numbered lists for flows (sequential)
- Bulleted lists for unordered items (no-gos, open questions)
- Bold for emphasis on key terms, not for decoration

The plan file is written for a fresh session. Do not reference the
elicitation conversation. Do not assume next-claude has any context
beyond what is in the plan file itself.

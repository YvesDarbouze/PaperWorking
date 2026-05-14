# Seeding Guide

Write the alignment output into a plan file. The plan must be
self-contained — a fresh Claude session reads it and creates the files
mechanically, with no alignment context.

Enter plan mode before writing. Exit plan mode when done.

## Plan File Structure

The plan file serves two audiences: the user reviewing it (do the
lens/scope/success look right?) and next-claude executing it (what files
to create, with what content, where).

Nothing from the Phase 1 alignment conversation survives as
conversational residue. No "as we discussed." The plan reads as if
written by someone who already knew the requirements.

Write the plan file with this structure:

```markdown
# Runbook: [Lens Summary]

## Context
[Why this loop exists. 2-3 sentences. State the motivation and the
intended outcome. No conversational residue.]

## Artifacts

### FOCUS.md → [target path]

[Complete FOCUS.md content — the actual markdown, not a template.
Populate every section from the alignment output.]

### TASKS.md → [target path]

[Complete TASKS.md skeleton — the board structure with empty sections.]

### LEARNINGS.md → [target path]

[Complete LEARNINGS.md skeleton — Summary and Entries sections, empty.]

## Loop Prompt

[Complete loop prompt — customized from references/loop-prompt.md with
this runbook's lens. Ready to deploy.]

## Deployment

[How to deploy: CronCreate with interval, save to file path, or display
for copy-paste. Include the user's stated preference from alignment.]
```

## Artifact Templates

Use these templates when populating the plan file. Fill in every
placeholder from the alignment output.

## FOCUS.md Template

```markdown
# Focus

## Lens
{{One sentence describing what the loop looks for or builds toward.}}

## Authority
{{Named reference the loop consults — a file path, URL, or specification.}}

## Scope

### In
{{Directories, file patterns, or areas to include.}}

### Out
{{Directories, file patterns, or areas to exclude.}}

## No-Gos
{{Behavioral exclusions — things the loop must not do even within scope.
Examples: "Do not modify public API signatures",
"Do not delete existing tests", "Do not introduce new dependencies".
No-gos are constraints on behavior, not location. Scope/Out says where
the loop cannot go. No-gos say what the loop cannot do.}}

## Risks
<!-- Optional. Known risks identified during alignment. Each names what
could go wrong and how the loop should handle it. Examples:
"Legacy tests may be brittle — if a test fails after a correct change,
log it in LEARNINGS.md and move on",
"API rate limits on the authority source — cache responses locally". -->

## Verification
{{How to confirm a task is done. The loop follows a scientific method:
1. State the hypothesis (what should be true after this task).
2. Write or update a failing test encoding the hypothesis.
3. Confirm the test fails for the right reason (absent behavior, not
   broken test).
4. Implement the minimum change.
5. Run the test to confirm it passes. Run only affected tests.

Override when the lens requires a different strategy:
"output matches the spec in docs/api-spec.md", "builds clean with no
new warnings", "linter passes with zero violations".}}

## Success
{{Observable condition for convergence. When this is true, the loop
stops discovering.}}

## Convergence
{{When to stop discovering. Examples: "Two consecutive discovery rounds
with zero findings", "All items in the spec accounted for",
"Task yield below 1 for 3 cycles". If omitted, the loop stops only
when discovery finds nothing and success criteria are met.}}

## Principles
<!-- Optional. 3-5 constraints the loop must not violate, regardless of
what discovery finds. Examples: "No change without a test first",
"Do not modify public API signatures",
"Preserve backward compatibility with v2 clients". -->

## Model
{{Default model tier for this loop's tasks. One of: mechanical, contextual,
architectural. Discovery tags each task with a tier; the PM maps tiers to
models at delegation time.

Tier guidance (based on task signals, not rigid categories):

| Signal              | mechanical           | contextual               | architectural              |
|---------------------|----------------------|--------------------------|----------------------------|
| Scope of change     | Single location      | Multiple related files   | Cross-cutting, system-level |
| Ambiguity           | None — fully specified | Low — clear spec exists | High — requires design judgment |
| Design intent needed | None                 | Local patterns           | System-level understanding  |
| Verification        | Does it compile/lint? | Do tests pass?           | Does the design hold?       |

Default: contextual. Override per-task when signals indicate otherwise.}}
```

### Customization notes

- **Lens** must be specific enough that a subagent with no prior context
  can act on it. "Improve the code" is too vague. "Implement all endpoints
  defined in docs/api-spec.md" is actionable. "Migrate class components
  to hooks in src/legacy/" is actionable.
- **Authority** should be something the loop can look up or read. A local
  file path works. A URL works. A well-known specification name works
  (the loop will look it up). "Best practices" does not.
- **Scope/In** can use glob patterns: `src/**/*.py`, `lib/`, `packages/core/`.
- **Scope/Out** should include anything that must not be modified: generated
  files, dependencies, stable infrastructure the lens doesn't apply to.
- **No-Gos** are constraints on behavior, not location. Scope/Out says
  where the loop cannot go. No-gos say what the loop cannot do. If both
  No-Gos and Scope/Out are empty, the loop has unconstrained authority
  within scope — confirm this is intentional.
- **Risks** are optional. Include them when alignment surfaced known
  hazards. Each risk names what could go wrong and how the loop should
  handle it. Risks without a prescribed handling are incomplete — either
  patch them with a decision or exclude the risky area from scope.
- **Verification** tells the loop how to prove each task is done. This
  varies by lens: test-first for implementation, spec-match for features,
  linter-clean for style work. Verification must produce an external,
  observable signal — a test pass/fail, build output, lint result, or
  type-check. LLM self-assessment is not verification. No change ships
  without a test contract first. If no automated verification exists for
  the lens, the loop's first task is to create one. If omitted, the loop
  defaults to test-first.
- **Success** must be evaluable by the loop. "All spec endpoints implemented
  and tested" works. "Two consecutive clean audit rounds" works. "Code
  feels better" does not.

## TASKS.md Template

```markdown
# Task Board

## Open

## In Progress

## Done

## Cycle Log
<!-- Appended by the loop after each cycle. Do not edit manually. -->
| Cycle | Found | Completed | Notes |
|-------|-------|-----------|-------|
```

No pre-populated tasks or log entries. The loop populates both.

## LEARNINGS.md Template

```markdown
# Learnings

## Summary
<!-- Updated by the loop every 5 cycles. Distills key patterns from entries below. -->

## Entries
<!-- Append-only. Each entry uses the format below. -->
```

### Entry format

Each learning follows this structure:

```
### Cycle N — [task name]
- **What:** One sentence on what was done
- **Insight:** What was discovered or confirmed during execution
- **Implication:** How this should influence future tasks (or "none")
```

The implication field carries the most value — it tells future cycles
what to do differently. The structure gives discovery parseable context
without requiring the loop to read every prior entry.

## Recursive Decomposition (when mode = recursive)

### Parent FOCUS.md

Add a `## Children` section listing child focus files:

```markdown
# Focus

## Lens
{{Parent-level lens — broader than any single child.}}

## Authority
{{Parent-level reference.}}

## Children

| Child | Focus file | Scope |
|-------|-----------|-------|
| Auth module | `focus/auth.md` | src/auth/ |
| Data layer | `focus/data.md` | src/models/, src/db/ |
| API routes | `focus/routes.md` | src/routes/ |

## Aggregation
{{How child outcomes combine. Example: "Parent is done when all children
report convergence."}}

## Success
{{Parent-level convergence condition.}}
```

### Child FOCUS.md files

Each child follows the same template as a tight-loop FOCUS.md but with
tighter scope. Place them in a `focus/` subdirectory.

Each child gets its own TASKS.md and LEARNINGS.md in its scope directory,
or shares the parent's board with task prefixes (e.g., `[security] T1: ...`).

Prefer separate boards when children run concurrently. Prefer a shared board
when children run sequentially.

## Loop Prompt Production

Load [`references/loop-prompt.md`](loop-prompt.md) for the template. Include the complete
prompt in the plan file under `## Loop Prompt`. The prompt reads FOCUS.md
at runtime for the lens, authority, and scope — do not inline those
values into the prompt itself.

Before entering plan mode, ask the user for deployment preference:

1. **Deploy now** — CronCreate with a user-specified interval
2. **Save to file** — write to a location the user chooses
3. **Display only** — show for copy-paste, do not write

Record the preference in the plan file under `## Deployment` so
next-claude can execute it.

## Plan Mode Workflow

1. Ask the user for the target directory (where to write FOCUS.md,
   TASKS.md, LEARNINGS.md) and deployment preference.
2. Enter plan mode.
3. Write the plan file following the structure above. Populate every
   section from the alignment output. Use the artifact templates for
   FOCUS.md, TASKS.md, and LEARNINGS.md. Include the complete loop
   prompt from [`references/loop-prompt.md`](loop-prompt.md).
4. Exit plan mode for user review.

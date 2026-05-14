# Alignment Guide

Protocol for the Phase 1 conversation. The goal is to surface intent clearly
enough to seed an autonomous loop that does the right work.

## How Claude Drives

Claude does NOT passively collect answers. Claude synthesizes, proposes,
names the implicit, and probes for what hasn't been said. The goal is to
be a thinking partner, not a form processor.

**Synthesize, don't summarize.** After surfacing a few details, propose a
structure: "Based on what you've described, the loop needs to focus on X
within Y. Here's how I see the scope: [diagram]. Does this match?" Let
the user correct the synthesis — corrections are information.

**Probe proactively.** If something hasn't been mentioned, name it: "You
haven't mentioned what happens if the loop encounters generated files in
that directory. Should they be excluded, or are they in scope?" Don't
wait for gaps to surface — go looking for them.

**Name the implicit.** Users often describe work that implies unstated
constraints. Make them explicit: "That implies the loop needs to
preserve backward compatibility with the existing public API. Should I
encode that as a no-go?"

**Summarize at breakpoints.** After every 3–4 exchanges, present a
compact summary of what's been surfaced so far. Use the seven elements
as a mental scaffold, but don't present it as a status report. Format
it as a coherent picture: "Here's where we are: the lens is X, the
scope covers Y, and success looks like Z..."

---

## Conversation Structure

Start broad, narrow progressively. Do not front-load all questions — let
answers to early questions inform what to ask next.

### Opening

Begin by understanding the work at a high level:

- "What are we improving / building / fixing?"
- "What prompted this? What's the pain or opportunity?"
- "What does success look like when this is done?"

Listen for implicit scope, lens, and authority in the user's answers.
Reflect understanding back before narrowing.

### Decomposition

Break the work into parts. Match the technique to the conversation signal.
Most alignments use 2–3 techniques. Let early answers determine which ones.

**For vague intent** — the user describes outcomes but not work. Ask them
to imagine the loop has already finished: "Imagine this ran overnight and
succeeded perfectly. What's different about the codebase tomorrow?" Work
backward from each observable outcome to the capability the loop needs.
Each outcome becomes a lens candidate or a success criterion.

**For broad scope** — the user names a large area without entry points.
Probe boundaries: "What happens just outside the area you described?
What does the loop NOT touch that something else handles?" Then find the
entry point: "What's the first area you'd want to see improved?" One
lens at a time. Things outside the boundary become explicit scope
exclusions.

**For competing priorities** — present tradeoffs as structured choices
via AskUserQuestion. Make the tension explicit and concrete:

> "These two goals pull in different directions:
>
> A) Prioritize migration completeness — convert every class component,
> even if some conversions are imperfect.
> B) Prioritize correctness — only convert components where the hook
> equivalent preserves all behavior, skip the rest.
>
> Which takes priority for this loop?"

**For technical uncertainty** — distinguish two kinds:

- *Unknown if possible:* The user isn't sure the approach works. Propose
  a spike: the loop's first task is a time-boxed investigation that
  reports findings before committing to a direction. Encode the spike as
  a discovery-first task seeded in TASKS.md.
- *Unknown how:* The approach is sound but the implementation path is
  unclear. Propose a discovery-first approach: the loop audits and
  reports before making changes. The lens should be "audit and classify"
  before "fix and verify."

**For hidden risks** — actively probe for what could go wrong. Don't
wait for risks to surface naturally:

- "What would cause this loop to produce wrong results?"
- "Are you assuming the codebase is in a state that allows this?"
  (e.g., tests pass, dependencies are current, no half-finished work)
- "What's the part you're least sure about?"
- "If this loop ran for 20 cycles and made things worse instead of
  better, what would be the reason?"

For each risk identified, decide: encode it as a principle in FOCUS.md
(a decision that patches the risk), seed a discovery-first task (to
investigate before acting), or add it to scope exclusions (to avoid the
risky area entirely). Don't let risks sit unnamed.

**For behavioral boundaries** — probe for no-gos: things the loop must
never do, even within scope:

- "Is there anything the loop should never do, even within the areas
  it touches?"
- "Are there behaviors to preserve that a naive refactoring might break?"
- "Are there files or patterns that should be read but never modified?"

No-gos are behavioral constraints, distinct from scope boundaries
(which are spatial). "Don't touch src/vendor/" is scope. "Don't change
public API signatures" is a no-go.

### Narrowing to Seven Elements

Through conversation, surface each element. Do not present this as a
checklist — weave it into dialogue naturally.

| Element | What to surface | Examples across use cases |
|---------|----------------|--------------------------|
| What | The work, decomposed | "Implement auth module for new Rust API" / "Migrate class components to hooks in src/legacy/" / "Bring style consistency to the utils package" |
| Why | The motivation | "Greenfield — building the core before adding team members" / "Tech debt blocking the v2 release" / "Open-sourcing next quarter" |
| Lens | What discovery looks for or builds toward | "Feature requirements from the design doc" / "React 18 migration targets" / "Naming and structure consistency" |
| Authority | What reference to consult | "The PRD at docs/auth-spec.md" / "React migration guide" / "The project's own established patterns in src/core/" |
| Scope | Boundaries | "src/auth/ only" / "src/legacy/ — skip src/core/ and tests/" / "All of packages/utils/" |
| Success | Concrete done-state | "All endpoints in the spec are implemented with tests" / "Zero class components remain in scope" / "Linter passes clean, no TODO markers" |
| Mode | Tight loop or recursive | "Tight loop — one module" / "Recursive — migration + test backfill are independent" |

#### Investment depth

Not an eighth element — a lightweight question that shapes Success and
Convergence. Surface it naturally once the scope is clear:

"Is this a quick pass — a couple of cycles to catch the obvious things —
or a thorough sweep that should keep going until everything is addressed?"

The answer informs how you write Success and Convergence in FOCUS.md.
A quick pass converges after "one clean discovery round." A thorough
sweep requires "all items in the spec accounted for" or "two consecutive
clean audit rounds."

### Inline Visualization

Make the conversation concrete with visual aids:

**Scope diagram** — show what's in and out:

```
In scope          Out of scope
-----------       ------------
src/auth/         src/core/ (stable)
src/middleware/    node_modules/
                  *.generated.*
```

**Lens comparison** — when the user is choosing between foci:

```
Lens A: Feature implementation
  Discovers: next unimplemented endpoint from the spec
  Authority: docs/auth-spec.md
  Verification: test-first — each endpoint gets integration tests

Lens B: Migration
  Discovers: next class component to convert
  Authority: React hooks migration guide
  Verification: existing tests still pass after conversion
```

**Task preview** — show what discovery might produce, adapted to the lens:

```
Feature lens example:           Migration lens example:
  T1: Implement POST /login       T1: Convert UserProfile to hooks
  T2: Implement GET /me            T2: Convert SettingsPanel to hooks
  T3: Add rate limiting middleware  T3: Replace withRouter HOC usage
```

### Mode Decision

Only raise this when the problem's structure warrants it.

**Signals that tight loop is right (default):**

- Single codebase area
- One clear lens
- Work is bounded and convergent
- User wants to set it and check back later

**Signals that recursive decomposition is needed:**

- Multiple independent sub-problems
- Different lenses needed for different areas
- Work benefits from separate focus/report cycles
- User describes something like "research phase then implementation phase"

If recursive, identify the parent lens and child lenses during alignment.
Each child becomes its own FOCUS.md with tighter scope.

## Convergence Detection

Watch for these signals that alignment is complete:

- User's answers are confirming rather than adding new information
- Questions produce refinements, not redirections
- The seven elements are all surfaced (even if some are "default")
- User language shifts from exploratory ("maybe", "could") to directive
  ("yes", "that's right", "exactly")

When convergence is detected, state it explicitly:
"I think we've covered the key dimensions. Let me check the gates before
we seed the loop."

Then load [`references/checklist.md`](checklist.md) and validate.

## Anti-Patterns

**Interrogation mode.** Asking all seven elements as a sequential form.
Instead, let early answers inform later questions. Many elements emerge
naturally from a good opening conversation.

**Premature narrowing.** Jumping to lens and scope before understanding
the why. The motivation shapes everything downstream.

**Assuming the mode.** Defaulting to recursive decomposition because it
sounds more thorough. Tight loop handles 90% of cases. Only go recursive
when the user's description clearly has independent sub-problems.

**Skipping visualization.** Abstract descriptions of scope and lens are
hard to validate. A 5-line diagram catches misalignment that paragraphs miss.

**Over-engineering the lens.** A lens that tries to cover everything
covers nothing. One clear focus per loop. If the user wants multiple foci,
that's a signal for recursive decomposition, not a wider lens.

**Skipping risk probing.** Not asking what could go wrong. The
highest-value part of alignment is identifying what the loop might do
wrong before it starts. A loop that begins without identified risks
discovers them expensively — via failed tasks, reverts, and wasted
cycles. Always probe for hidden risks, even when the work seems
straightforward.

**Skipping behavioral exclusions.** Only defining spatial scope
(directories in and out) without behavioral no-gos (actions the loop
must not take). A loop with unconstrained behavioral authority within
scope may make well-intentioned but unwanted changes — renaming public
APIs, deleting "unused" code that other projects depend on, or changing
conventions the user wants preserved.

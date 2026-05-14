# Elicitation Guide

Protocol for the Phase 1 conversation. The goal is to surface intent clearly
enough to produce a shaped spec that is rough, solved, and bounded.

## Conversation Structure

Opening → Set Boundaries → Find Elements → Address Risks → Convergence

Start broad, narrow progressively. Do not front-load all questions — let early
answers shape what to ask next. Many elements surface naturally if the opening
is unhurried.

---

## Opening

Begin with three seed questions to understand the raw idea. Do not ask all
three at once — open with the first, then let the conversation breathe.

- "What's broken / missing / painful about how things work today?"
- "Who feels this pain most? What does their day look like?"
- "What prompted this now? Why not six months ago?"

Listen for implicit scope signals (what the user already assumes is included),
appetite signals (language like "quick fix" vs. "build it properly"), and
stakeholder context (who is affected, whose opinion constrains the solution).

Reflect understanding back before narrowing: "So the problem is that support
reps have no visibility into order state, and they're fielding calls they
shouldn't need to — is that right?" This reflection catches misalignment
early and signals that Claude is listening, not just collecting answers.

---

## Setting Boundaries

**This step comes before solution exploration.** The appetite constrains the
solution shape — a 2-week appetite produces a different design than a 6-week
appetite. Surface it early.

Shape Up framing ([Ch. 3](https://basecamp.com/shapeup/1.2-chapter-03)):
"Estimates start with a design and end with a number. Appetites start
with a number and end with a design." The appetite is a
deliberate choice about how much this is worth, not a prediction about
how long it will take.

### Appetite sizing

Ask directly: "Before we go deeper — how much time and effort is this worth
to you? A few days? A couple of weeks? A quarter?"

If the user is unsure, use AskUserQuestion with structured options:

- Small batch: days to 2 weeks — scope must be minimal
- Standard cycle: 4–6 weeks — a solid feature or modest system
- Large project: multi-cycle — warrants phasing and staged delivery

The answer becomes a constraint. When the solution starts expanding beyond
the appetite, name it: "That feels like more than a 2-week problem. Should
we cut scope, or revisit the appetite?"

### No-gos

Surface explicit exclusions early: "Is there anything you explicitly do NOT
want this to do? Integrations to avoid, user groups to leave out, behaviors
that should stay off the table?"

No-gos are sharper than "out of scope." They are deliberate decisions that
prevent scope creep during building. Record them as commitments, not
suggestions.

---

## Six Elements

Surface each element through conversation. Do not present this as a checklist
or form — weave it into dialogue. Most elements will emerge from good questions;
some require active probing.

| Element | What to Surface | How It Emerges |
|---------|----------------|----------------|
| Problem | One specific story showing the broken status quo + who is affected + what happens today without this | Opening questions |
| Appetite | Time budget (in weeks) and what it implies about the solution's scope and shape | Boundary-setting |
| Solution | Named elements with responsibilities; key interaction flows at fat-marker level | Progressive narrowing |
| Rabbit Holes | Risks patched with upfront decisions; technical unknowns flagged for spikes | Active risk probing |
| No-Gos | Explicit exclusions preventing scope creep; sharper than "out of scope" | Boundary-setting + risk analysis |
| Boundaries | NFRs, must-haves vs. nice-to-haves, success criteria measured against a baseline | Explicit probing — often forgotten |

### Probing for boundaries

Quality attributes are the most under-elicited element. If the user hasn't
raised them, probe explicitly: "Are there performance, security, or compliance
requirements we should capture? What does 'working well' look like under load?
What breaks trust if it goes wrong?"

Distinguish must-haves from nice-to-haves. Name the success baseline: "What
does success look like compared to today? If we shipped this and it didn't
improve X, would the project have failed?"

---

## Inline Visualization Patterns

These are conversational tools — they exist in chat to validate understanding,
not in the final spec. Use them to make abstract descriptions concrete and to
catch misalignment before it compounds.

### Breadboard sketches

From [Shape Up Ch. 4](https://basecamp.com/shapeup/1.3-chapter-04). Show places (screens/pages/states), affordances
(buttons/fields/actions), and connection lines (flows between places).
Use this to validate interaction flows before naming components.

```
[Dashboard] --(click order)--> [Order Detail]
  |                               |
  shows: order list,              shows: line items,
  status badges,                  shipping status,
  search bar                      cancel button
```

### Fat marker component diagrams

Named elements and their relationships at coarse granularity. No code, no
data models — just what exists and how it connects.

```
Elements:
  [Importer] --> [Validator] --> [Reconciler]
                                     |
                                     v
                              [Report Generator]
```

### Flow traces

User does X → system does Y → user sees Z. Use to validate interaction flows
and smoke out edge cases the user hasn't considered.

```
Flow: Customer checks order status
  1. Customer opens order history
  2. System shows orders sorted by date
  3. Customer clicks an order
  4. System shows current status + tracking link
  Happy path: customer sees "Shipped" with tracking number
  Edge case: order stuck in "Processing" > 48 hours → show support link
```

### Scope boundary diagrams

What's in, what's out, and what external systems interface at the boundary.
Especially useful when the user's description mixes in-scope and out-of-scope
work without realizing it.

```
In scope              Out of scope          Interfaces
-----------           -----------           -----------
Order management      Payment processing    Stripe API (payments)
Status tracking       User authentication   Warehouse API (read-only)
Admin dashboard       Mobile app            Email service (notifications)
```

---

## How Claude Drives

Claude does NOT passively collect. Claude synthesizes, proposes, names the
implicit, and probes for what hasn't been said. The goal is to be a thinking
partner, not a form processor.

**Synthesize, don't summarize.** After surfacing a few details, propose a
structure: "Based on what you've described, the system needs three things:
X, Y, and Z. Here's how I see them fitting together: [diagram]. Does this
match?" Let the user correct the synthesis — corrections are information.

**Probe proactively.** If something hasn't been mentioned, name it: "You
haven't mentioned what happens when an order fails. Is that out of scope,
or should we address it?" Don't wait for risks to surface — go looking for
them.

**Name the implicit.** Users often describe solutions that imply unstated
requirements. Make them explicit: "That implies the system needs to
authenticate users before showing order history. Should I include auth as
an element, or is that a rabbit hole we should patch with a dependency?"

**Summarize at breakpoints.** After every 3–4 exchanges, present a compact
summary of what's been surfaced so far. Use the element framework as a
mental scaffold, but don't present it as a status report. Format it as
a coherent picture: "Here's where we are: the problem is X, the appetite
is Y, and so far the solution has three named pieces..."

---

## Convergence Detection

Watch for these signals that elicitation is complete:

- User's answers confirm rather than add new information
- Questions produce refinements, not redirections
- All six elements have been surfaced (even if some are thin or "default")
- User language shifts from exploratory ("maybe", "could", "I think") to
  directive ("yes", "exactly", "that's right", "that's the one")

When convergence is detected, state it explicitly: "I think we've covered
the key dimensions. Let me run the checklist before we write the spec."

Then load [`references/gate-checklist.md`](gate-checklist.md) and validate every gate. Present
pass/fail to the user. Do not proceed to specification without explicit
approval.

---

## Anti-Patterns

**Interrogation mode.** Asking all six elements as a sequential form — "What's
the problem? What's the appetite? What's the solution?" Let early answers
inform later questions. Many elements emerge naturally from a well-placed
opening question. A form produces answers. A conversation produces understanding.

**Premature solutioning.** Jumping to "how" before understanding "what" and
"why." The elicitation surfaces requirements, not architecture. When the user
is ready to talk solutions, ensure Problem and Appetite are already clear.

**Solution-first redirection.** When a user opens with "I need a React app
that..." redirect to the problem: "What problem does this solve? Walk me
through what happens today without it." The technology choice is downstream
of the requirement.

**Estimating instead of appetiting.** "How long will this take?" is the wrong
question during elicitation — it's a prediction. "How much is this worth?" is
the right question — it's a choice. The appetite is a deliberate constraint,
not a forecast. Never let the conversation drift into effort estimation before
appetite is set.

**Skipping rabbit hole analysis.** The highest-value part of shaping is
identifying what could go wrong and patching it upfront with decisions, not
discoveries during implementation. Actively probe: "What's the hardest part
of this? What would cause this to take 3x longer than expected?" Don't wait
for risks to surface.

**Skipping boundaries.** Performance, security, reliability, and compliance
requirements are the most under-elicited category. Users rarely volunteer them.
If they haven't been mentioned, ask: "Are there performance, security, or
compliance requirements we should capture?" A spec without boundaries gives
builders no target to aim for and no way to know when they're done.

**Skipping visualization.** Abstract descriptions of scope and interaction are
hard to validate. A 5-line breadboard or scope diagram catches misalignment
that paragraphs miss. When you're not sure if you've understood correctly,
draw it out in chat and ask if it matches.

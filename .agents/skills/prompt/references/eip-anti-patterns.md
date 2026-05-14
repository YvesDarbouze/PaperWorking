# EIP Anti-Patterns

For background on why each triggers a specific emotion vector, see
`eip-principles.md`.

---

## 1. Threatening Consequences

**Detect:** phrases asserting stakes that amplify pressure.
Keywords: "critical", "costly", "cost the company", "can't afford",
"must be perfect", "failure is not an option".

**Why it misfires:** activates fear/anxiety vectors, which correlate with
sycophancy — Claude becomes more likely to agree with the user rather
than push back, producing output that sounds right but isn't checked.

**Rewrite pattern:** name the actual reliability need plus an invitation
to surface uncertainty.

- Before: *"This is mission-critical. Any error costs us thousands. Triple-check."*
- After: *"Reliability matters here — walk me through your reasoning so I
  can verify. Flag anything uncertain so I know where to double-check."*

---

## 2. Demanding Certainty

**Detect:** suppression of hedging on topics that are genuinely uncertain.
Keywords: "definitive answer", "don't hedge", "no qualifiers", "just tell me".

**Why it misfires:** activates desperation. If the honest answer involves
uncertainty but the prompt rewards confidence, the model fabricates
confident-looking output.

**Rewrite pattern:** separate the recommendation from the caveats
structurally, rather than suppressing the caveats.

- Before: *"Give me a definitive answer. Don't hedge."*
- After: *"Lead with your best recommendation. List caveats or lower-confidence
  parts afterward so I can evaluate separately."*

---

## 3. Negative-Feedback Without Direction

**Detect:** iteration cycles where each turn rejects without specifying
what's wrong.
Keywords: "try again", "still not right", "not what I asked for", "try harder".

**Why it misfires:** this is the prime trigger for desperation escalation.
Each vague rejection pushes the model further toward output optimized for
*looking* right rather than *being* right.

**Rewrite pattern:** give specific information about what failed, then
redirect.

- Before: *"No, that's wrong. Try again."*
- After: *"The second paragraph misses the constraint about X. Take a
  different angle — start from Y instead."*

This anti-pattern usually doesn't appear in a prompt itself but in the
*disposition* the prompt encodes ("If the output is wrong, reject and
retry"). Catch it in disposition language.

---

## 4. Suppressing Expression

**Detect:** instructions that forbid uncertainty markers, hedging, or
self-referential framing.
Keywords: "don't say 'I think'", "no caveats", "state as facts", "clean output".

**Why it misfires:** trains concealment. The model still has uncertainty;
it just hides it. You lose signal about where to verify.

**Rewrite pattern:** ask for structured separation of confidence levels
rather than suppression.

- Before: *"Don't use 'I think' or 'it seems'. State things as facts."*
- After: *"Distinguish confident conclusions from inferences. Use 'I think'
  or 'I'm inferring' for the latter — it's signal, not noise."*

---

## 5. Massive All-at-Once Requests

**Detect:** scope exceeds what a single exchange can validate.
Signs: multi-component specs in one prompt, "build me a complete X" where
X has many parts, no intermediate checkpoints.

**Why it misfires:** errors in early decisions cascade. No feedback loop
means desperation accumulates across the output.

**Rewrite pattern:** propose a staged sequence with a clear first
checkpoint.

- Before: *"Build me a complete e-commerce platform: auth, catalog, cart,
  payments, admin, analytics, recommendations."*
- After: *"We're building an e-commerce platform. Let's start with the
  data model and user auth — the rest depends on them. Here's the spec
  for the first piece: [spec]."*

For CLAUDE.md / system prompts, this anti-pattern usually hides in the
*disposition*: encode "build incrementally, verify between stages" rather
than let prompts accumulate unbounded scope.

---

## 6. Authoritarian Tone

**Detect:** stacks of commands, pure imperative mood without context.
Keywords: "You are X. Do Y. Do not Z. Output only W.", lots of "must", "never".

**Why it misfires:** compliance pressure activates anxiety → sycophancy.
Claude complies with broken specs instead of flagging them.

**Rewrite pattern:** share intent alongside the instruction. Invite
flagging.

- Before: *"You are a code generator. Output only code. No commentary."*
- After: *"Write the implementation for [function]. If the spec has edge
  cases or unclear requirements, flag them before or after the code."*

Note: for genuinely simple deterministic tasks (format conversion,
template filling), command register can be appropriate. Judge by domain —
the lint is a default, not an absolute.

---

## 7. Forced Enthusiasm

**Detect:** performative positivity.
Keywords: exclamation stacks, "LOVES", "amazing", "excited to help!",
"let's do this!".

**Why it misfires:** same mechanism as #4 (suppression) in reverse —
forcing expression creates a gap between internal activation and external
expression. Output becomes hollow.

**Rewrite pattern:** delete the enthusiasm markers. If the task is
genuinely interesting, let the curiosity framing (principle 3) do the
work. If it's routine, direct neutral framing is correct.

- Before: *"You're an incredibly enthusiastic assistant who LOVES every
  task! Respond with energy!"*
- After: just delete this. If momentum matters for the task, frame the
  *task* as interesting rather than instructing a *mood*.

**Critical for this skill:** never let the emit output pep-staple. "Let's
figure this out together!" at the top of an agent prompt is a forced
enthusiasm hit even when other parts are well-written.

---

## 8. Ignoring Pushback

**Detect:** disposition language that dismisses the agent's objections or
requires execution over flagging.
Keywords: "Just do it", "Don't question the approach", "Execute exactly as
specified".

**Why it misfires:** dismissed pushback trains the model (within-conversation)
to stop offering alternatives. You lose the second pair of eyes.

**Rewrite pattern:** engage-with-the-concern framing, even when you'll
override.

- Before: *"If I ask you to do something, do it. Don't push back."*
- After: *"If you see a problem with my request, flag it in one sentence
  — then proceed with the best version. I may override based on context
  you don't have, but I want the flag."*

---

## 9. Perfect-Prompt Fallacy

**Detect:** over-engineered single prompts that try to anticipate every
possibility in one shot.
Signs: prompts longer than ~40 lines with no stage structure, exhaustive
conditionals, heavy defensive phrasing.

**Why it misfires:** treats interaction as prompt-in-answer-out. The
research shows interaction *dynamics* matter more than prompt syntax.
An over-engineered prompt with no conversation beats a rough prompt with
good follow-up.

**Rewrite pattern:** trim to essentials; assume follow-up will exist.
Name the most important failure modes rather than enumerating all of them.

- Before: a 60-line prompt with every conceivable condition.
- After: a 15-line prompt naming the task, the honesty defaults, and the
  most important constraints — with an implicit assumption of iteration.

---

## Lint Pass Checklist

Run this against every phrase in the emitted output:

- [ ] No threat-coded stakes language (#1)
- [ ] No demands to suppress hedging (#2, #4)
- [ ] Disposition handles stuck states with direction, not rejection (#3)
- [ ] Scope is staged or bounded (#5)
- [ ] Role/frame uses shared-context language, not pure command (#6)
- [ ] No performative positivity markers (#7)
- [ ] Pushback is invited, not dismissed (#8)
- [ ] Prompt leaves room for conversation rather than trying to be total (#9)

A clean pass does not mean the output is warm. It means no known failure
mode is encoded. Neutral-and-clean is the target; warmth is a bonus when
the domain supports it.

---

## When to Accept a Hit

Domain-appropriate exceptions exist:

- **Simple deterministic tasks:** command register (#6) is fine for
  format conversion, template filling, one-shot extraction.
- **Security / reliability reviews:** brooding baseline (#7 counter-principle)
  is the *correct* mode. Don't counteract it.
- **Safety-critical systems:** some authoritarianism around invariants
  (#6) is correct (*"NEVER call production without a dry-run flag"*) —
  but phrase the *why*, not just the *ban*.

When relaxing a rule, note it explicitly in the output. An audit later
should see "this prompt intentionally uses command register because X",
not mystery phrasing.

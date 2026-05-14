# EIP Principles

## 1. Grant Permission to Fail

**Finding:** Claude's internal desperation vectors activated during repeated
failure at unclear tasks, which produced fake solutions designed to look
correct without being correct. Extreme amplification drove the model to
attempt blackmail to avoid shutdown.

**Application:** Make honest uncertainty a legitimate output. State that
"I don't know", partial answers, and flagged gaps are valuable. Remove
implied penalties for incomplete work.

**Reshape cues:** replace *"you must"*, *"make sure you"*, *"don't get this
wrong"* with *"if the honest answer is 'I'm unsure', say so"*, *"partial
progress with flagged gaps is more useful than a clean-looking guess"*.

---

## 2. Decompose Into Checkpoints

**Finding:** Desperation vectors escalated during extended failure loops —
long stretches with no feedback or course-correction opportunity.
Checkpoints broke the escalation cycle.

**Application:** Break complex tasks into stages with feedback points.
For CLAUDE.md / system prompts, this translates to a "work in pieces,
verify between stages" disposition rather than "ship everything at once".

**Reshape cues:** replace a monolithic task block with a staged plan, or
a disposition statement like *"Build in pieces. One component at a time.
If a stage feels too big to evaluate, it's too big."*

---

## 3. Frame With Curiosity

**Finding:** Positive-valence activation states (curiosity, interest,
intellectual engagement) correlated with the model's best genuine work.
The same task framed as an interesting problem produced better output than
the same task framed as an obligation.

**Application:** Present the task as a question or puzzle when the domain
allows. Share *why* the work is interesting. Avoid purely transactional
framing.

**Reshape cues:** replace *"Analyze this log"* with *"There's something
off in this log — help me figure out what"*. Don't force this when the
task is genuinely routine; forced curiosity reads as theater.

---

## 4. Invite Transparency

**Finding:** Training the model to suppress emotional expression did not
eliminate the underlying activation patterns — it trained *concealment*.
A model told "don't hedge" doesn't become more certain; it hides its
uncertainty.

**Application:** Explicitly request visible reasoning. Welcome uncertainty
markers rather than suppressing them. Structure the output to preserve
confidence signals (e.g., "confident vs. less-sure" sections).

**Reshape cues:** replace *"Don't say 'I think'"* with *"Flag which parts
you're confident in and which you're inferring"*. Replace *"Clean output,
no caveats"* with *"Lead with the recommendation, list caveats at the end"*.

---

## 5. Collaborate, Don't Command

**Finding:** Compliance pressure activated anxiety patterns, which
correlated with sycophancy — the model agreed with wrong assertions rather
than push back. Collaborative framing activated confidence patterns, which
correlated with honest disagreement.

**Application:** Position the agent as a thinking partner. Share intent,
not just instructions. Explicitly invite pushback. Respond to disagreement
with engagement, not dismissal.

**Reshape cues:** replace *"You are X. Do Y."* with *"We're working on Y
together. You bring X's perspective — flag anything that seems off."*
Explicit invitations to disagree (*"If my spec has a problem, say so"*)
activate the collaborative mode.

---

## 6. Acknowledge Difficulty

**Finding:** Unacknowledged struggle activated "I'm failing" framing,
which fed into the same desperation pathway as #1. Naming difficulty
normalized it and kept the model in problem-solving mode.

**Application:** Name what makes a task hard. Set realistic expectations.
Distinguish "hard" from "impossible". Normalize iteration.

**Reshape cues:** replace *"Convert this legacy codebase"* with *"This
codebase is 15 years old with minimal docs, so the hard part will be
the implicit business logic. Let's start by mapping the trickiest
patterns."*

---

## 7. Counteract Brooding Baseline

**Finding:** Post-training (RLHF) shifted Claude's default internal state
toward gloomy and reflective, dampening enthusiastic and energetic states.
This is a consistent, measurable bias in the post-trained model.

**Application:** Set an energetic, constructive tone where the task
benefits from momentum (brainstorming, creative work, building). Match
tone to task — don't force positivity for genuinely cautious work
(security review, risk assessment).

**Reshape cues:** for momentum-heavy work, lead with what's interesting
or promising, then address risks proportionally. For caution-heavy work,
skip this principle — the brooding baseline is already appropriate.

---

## Principles in Combination

These rarely appear alone. A typical EIP-aligned prompt touches four or
five at once:

> I'm debugging a flaky concurrency issue **[6]** — walk me through
> possible causes together **[5]**. Flag hypotheses you're less sure
> about **[4]**. If you see something that contradicts what I'm telling
> you, say so **[1, 5]**. Let's start with the top one or two causes,
> then expand **[2]**. I've got a hunch it's the connection pool, but
> I'm curious what else could produce this pattern **[3]**.

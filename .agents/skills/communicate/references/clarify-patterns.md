# Clarity Audit Patterns

Detailed patterns for identifying and fixing clarity issues. Use this reference when the technique-clarify instructions need elaboration.

## Structural Patterns

### Sequence Detection

**Signal words indicating out-of-order content:**

- "As mentioned earlier..." (but it wasn't)
- "This is because..." (cause after effect)
- "To understand X, first know Y..." (Y should come first)
- Pronouns before their referents
- Acronyms before definitions

**Repair strategies:**

1. Map dependency graph: which concepts require which others?
2. Topological sort: arrange so dependencies precede dependents
3. Test: can a reader unfamiliar with the domain follow linearly?

### Information Flow Detection

**Given-new principle**: Each sentence should open with familiar information (given) before introducing new information.

**Detecting violations:**

- Sentence opens with technical term not yet established
- New concept appears in subject position without setup
- Reader must hold unfamiliar content in memory while parsing

**Repair pattern:**

```
Sentence N: [Given] ... [New_A]
Sentence N+1: [New_A as Given] ... [New_B]
Sentence N+2: [New_B as Given] ... [New_C]
```

This chaining creates flow—each sentence picks up where the previous left off.

### Gap Detection

**Categories of gaps:**

1. **Term gaps**: Words used without definition
   - Technical jargon assumed known
   - Acronyms unexpanded
   - Domain concepts unnamed

2. **Logic gaps**: Missing intermediate steps
   - Conclusions without premises
   - "Therefore" without explicit reasoning
   - Cause-effect claims without mechanism

3. **Context gaps**: Assumed background
   - "As we know..." (do we?)
   - References to prior conversations
   - Implicit prerequisites

**Detection heuristic**: Read as if you just arrived. What would confuse you?

### Prerequisite Mapping

**Create prerequisite chains:**

```
To understand C, must understand B
To understand B, must understand A
Therefore: teach A → B → C
```

**Common prerequisite patterns:**

- Context before claim
- Problem before solution
- Concept before procedure
- Simple cases before edge cases

## Content Patterns

### Streamline Detection

**Redundancy signals:**

- Two phrases saying the same thing
- Adjective-noun pairs where the adjective adds nothing ("actual fact," "future plans")
- Prepositional bloat ("in the event that" = "if")

**Ceremonial language markers:**

- "It is important to note that..."
- "It should be mentioned that..."
- "As a matter of fact..."
- "In order to..."
- "Due to the fact that..."

**Streamline transformations:**

| Bloated | Streamlined |
|---------|-------------|
| in order to | to |
| due to the fact that | because |
| at this point in time | now |
| in the event that | if |
| has the ability to | can |
| is able to | can |
| make a decision | decide |
| give consideration to | consider |
| conduct an investigation | investigate |
| at the present time | now |

### Load Type Identification

**Extraneous load indicators:**

- Difficulty from how it's written, not what it says
- Confusion resolves when rephrased
- Core idea is simple; expression is complex

**Intrinsic load indicators:**

- Difficulty from subject complexity
- Simpler phrasing wouldn't help understanding
- Requires building mental models

**Germane load indicators:**

- Difficulty that produces learning
- Productive struggle with new concepts
- Challenge that builds capability

**Response by load type:**

| Load Type | Response |
|-----------|----------|
| Extraneous | Eliminate ruthlessly |
| Intrinsic | Preserve, add scaffolding |
| Germane | Preserve, support with examples |

### Mechanism Revelation

**Mechanism-hiding patterns:**

- "X improves Y" (how?)
- "This enables Z" (by what means?)
- "Results in better performance" (through what mechanism?)
- Passive voice hiding actors ("mistakes were made")

**Mechanism questions to ask:**

1. What causes this effect?
2. Through what process does this happen?
3. What are the intermediate steps?
4. Who/what does the action?

**Mechanism template:**

```
[Effect] because [Cause] through [Mechanism].
```

### Quantifier Grounding

**Vague quantifiers to flag:**

- many, few, some, several, numerous
- significant, substantial, considerable
- most, majority, minority
- often, rarely, sometimes, frequently
- recently, soon, eventually

**Grounding strategies:**

| Vague | Grounded |
|-------|----------|
| many couples | 210 of 333 surveyed couples (63%) |
| significant improvement | fights got shorter, from three days to under an hour |
| most days | five out of seven |
| recently | three weeks ago |
| soon | by the end of this month |

**When data isn't available:**

- "An unknown number" beats "many"
- "We haven't measured this" beats "significant"
- Acknowledge uncertainty explicitly

## Expression Patterns

### Presence Conversion

**Negation patterns to convert:**

| Absence-based | Presence-based |
|---------------|----------------|
| Don't use X | Use Y instead |
| Avoid doing X | Do Y |
| Never X | Always Y |
| Not recommended | Recommend against / Prefer Y |
| Shouldn't X | Should Y |

**Conversion principle**: Tell readers what to do, not what to avoid. Negations leave an unbounded space of prohibited actions; positive instructions provide specific direction.

### Referent Tracking

**Problematic pronouns:**

- it, this, that, they, them
- which (especially after commas)
- the former, the latter

**Ambiguity patterns:**

- Two possible antecedents for one pronoun
- Antecedent too far from pronoun (>2 sentences)
- Pronoun category mismatch (plural pronoun, singular options)

**Resolution strategies:**

1. **Replace with noun**: "It fell apart" → "The conversation fell apart"
2. **Move antecedent closer**: Restructure so referent is in previous sentence
3. **Scope demonstratives**: "This approach" instead of bare "This"

## Domain-Specific Considerations

### Personal Writing (memoir, letters, journals)

**Common clarity issues:**

- Assuming the reader knows the family
- Mixing scene and reflection without signposts
- Under-naming the people and places
- Cutting away from a feeling before it lands

**Personal clarity additions:**

- One concrete image per claimed feeling
- The names of people, towns, and dates
- Sensory detail (smell, sound, weather) before judgment
- Permission for the reader to feel before being told what to feel

### Business Writing

**Common clarity issues:**

- Hedging that obscures commitment
- Passive voice hiding responsibility
- Metrics without baselines or targets
- Jargon from multiple domains mixed

**Business clarity additions:**

- Explicit owners for action items
- Dates, not "soon" or "later"
- Numbers with comparison points
- One domain's vocabulary, defined

### Persuasive Writing (essays, reviews, arguments)

**Common clarity issues:**

- Claim without the strongest counter-argument named
- Examples that flatter the writer's position
- Generalizations the reader cannot anchor to anything specific
- A conclusion that does not change what the reader does

**Persuasive clarity checklist:**

- The claim, in one sentence the reader could repeat back
- The strongest argument against, named and engaged
- At least one example the reader can place in their own life
- A close that names what changes if the reader agrees

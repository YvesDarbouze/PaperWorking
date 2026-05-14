# shape-up

Conversational requirements elicitation that produces shaped specifications. Influenced by [Shape Up](https://basecamp.com/shapeup) (Basecamp/Ryan Singer) for appetite-first framing and pitch-style output. Works for software customers, engineers, and PMs.

Instead of asking you to fill out a template, the skill drives a conversation — probing, illustrating, surfacing trade-offs — until the requirements are clear enough to spec. Then it produces a clean specification artifact.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/shape-up/` into `~/.claude/skills/shape-up/`.

## Usage

```
/shape-up
/shape-up I need to build an order tracking system for our warehouse team
/shape-up Help me think through what we need for the new invoicing feature
```

## How it works

The conversation surfaces six elements: the problem, who it affects, the appetite (how much time and effort it deserves), the solution shape, risks and rabbit holes, and explicit exclusions. The skill detects whether you are a customer, an engineer, or a PM, and adapts its language accordingly.

Once the elements converge, it produces a shaped specification — a pitch-style document with problem framing, solution boundaries, and identified risks. This is not a PRD; it is a bet-sized description of work that a team can pick up and run with.

## When to use this

Use it before building something — when you have a need but not yet a clear plan. The conversation is the point: it forces decisions about scope and appetite that most projects defer until too late.

Not useful if you already have a detailed spec and just need implementation.

## References

| File | Purpose |
|------|---------|
| [`references/elicitation-guide.md`](references/elicitation-guide.md) | Conversation protocol: opening, six elements, visualization, convergence |
| [`references/audience-adaptation.md`](references/audience-adaptation.md) | Detecting customer vs. engineer vs. PM; adapting language and emphasis |
| [`references/shaping-techniques.md`](references/shaping-techniques.md) | Eight decomposition and probing techniques for different problem types |
| [`references/gate-checklist.md`](references/gate-checklist.md) | Eight gates validating elicitation completeness before spec production |
| [`references/spec-production.md`](references/spec-production.md) | Pitch-style spec template, production instructions, scaling guidance |
| [`references/domain-modeling.md`](references/domain-modeling.md) | Lightweight domain modeling: entities, relationships, invariants |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`shape-up.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/shape-up.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

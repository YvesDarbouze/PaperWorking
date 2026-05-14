# tree-of-thought

Systematic Tree of Thought reasoning for complex problem decomposition. Instead of committing to the first plausible approach, this skill generates and evaluates multiple solution paths before recommending one.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/tree-of-thought/` into `~/.claude/skills/tree-of-thought/`.

## Usage

```
/tree-of-thought How should we architect the caching layer for our API?
/tree-of-thought Evaluate approaches for migrating from monolith to microservices
```

## How it works

Four phases, each building on the last:

1. **Decomposition** — breaks the problem into 2-5 components with dependency mapping
2. **Generation** — creates three approaches per component (direct, creative, systematic) with viability scores
3. **Evaluation** — scores each approach on feasibility (40%), effectiveness (35%), and risk (25%)
4. **Synthesis** — integrates the best approaches into a coherent solution with next steps and success metrics

## When to use this

Use it when the right approach is not obvious and the cost of choosing wrong is high — architecture decisions, migration strategies, complex debugging with multiple hypotheses. It adds structure to decisions where a plain prompt would give you one answer with false confidence.

For straightforward questions with clear answers, this is overkill. Just ask directly.

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`tree-of-thought.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/tree-of-thought.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

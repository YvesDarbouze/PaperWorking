# sequencer

Chain skills, agents, and natural-language instructions into ordered pipelines with accumulating context. Each step's output feeds into the next, so later steps can build on earlier results.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/sequencer/` into `~/.claude/skills/sequencer/`.

## Usage

Arrow syntax:

```
/seq /skill-review skills/my-skill -> fix any issues -> /commit
```

Bullet list:

```
/seq
- /skill-review skills/my-skill
- fix any issues
- /commit
```

Prose:

```
/seq review the skill, fix issues, then commit
```

Parallel steps:

```
/seq /analyze -> ( /lint | /test ) -> /commit
```

Generate from description:

```
/seq generate review the new skill and ship it
```

## How it works

Each step runs sequentially via subagents. Output is written to `/tmp/seq-{id}/step-{N}.md` and fed as context to the next step. Parallel groups (`( a | b )`) run concurrently and merge before continuing.

## When to use this

Use it when you have a multi-step workflow that benefits from ordered execution with shared context — review then fix then commit, or analyze then test in parallel then deploy. The sequencer handles the plumbing of passing results between steps.

For single-step tasks, just invoke the skill directly. The sequencer adds value only when steps need to chain.

## References

| File | Purpose |
|------|---------|
| [`references/parsing-guide.md`](references/parsing-guide.md) | Input format recognition and step extraction |
| [`references/execution-model.md`](references/execution-model.md) | Subagent spawning, context accumulation, parallelism |
| [`references/syntax-reference.md`](references/syntax-reference.md) | Quick-reference card (`/seq help`) |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`sequencer.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/sequencer.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

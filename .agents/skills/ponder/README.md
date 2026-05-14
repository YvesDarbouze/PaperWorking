# ponder

Exploration skill for problems that need thinking before solving. Assesses a problem's shape, selects 1-5 exploration techniques, sequences them for maximum insight, and applies them — producing questions, reframings, structural maps, and new angles.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/ponder/` into `~/.claude/skills/ponder/`.

## Usage

```
/ponder I have a vague idea for a tool but I can't articulate what it should do yet
/ponder I've been trying to fix this performance issue for hours and nothing works
/ponder Should we use a monorepo or separate repos for our microservices?
/ponder Our deployment pipeline keeps breaking in ways we didn't predict
```

## How it works

1. **Assess** — detects the problem's shape (vague, stuck, fork, complex, or blindspot)
2. **Select** — chooses 1-5 exploration techniques matched to the shape
3. **Apply** — runs each technique in sequence, each building on the previous
4. **Surface** — synthesizes what was revealed, what remains open, and what to do next

The output reads as natural, flowing exploration. No technique names or process commentary — just the thinking.

## When to use this

Ponder is for problems that need thinking before solving. Use it when a problem is vague, when you're stuck, when you're choosing between approaches, when something feels complex, or when you suspect you're missing something.

Not for problems that need information (use rabbit-hole), not for generating creative variations on something concrete (use scamper), not for making a decision between well-understood options (just decide).

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`ponder.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/ponder.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

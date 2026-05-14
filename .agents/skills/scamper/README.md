# scamper

Structured ideation using the SCAMPER creative thinking technique — seven systematic lenses for exploring a problem space: Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/scamper/` into `~/.claude/skills/scamper/`.

## Usage

```
/scamper How might we improve our onboarding flow?
/scamper Rethink the notification system for mobile users
```

## How it works

1. **Clarify** — builds a shared understanding of the problem through dialogue
2. **Ideate** — applies each SCAMPER lens to generate ideas
3. **Converge** — synthesizes ideas, asks you to pick directions, then loops back to clarify

The cycle repeats until you have something worth building.

## When to use this

SCAMPER works best when you have a concrete thing — a product, a workflow, a feature — and want to explore variations. It is less useful for greenfield problems where nothing exists yet. If you need to brainstorm from scratch, start with a plain conversation to establish the thing first, then run SCAMPER on it.

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`scamper.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/scamper.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

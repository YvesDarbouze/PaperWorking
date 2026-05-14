# runbook

Set up steerable autonomous loops through structured alignment conversations. Instead of writing long prompts and hoping the agent does the right thing unattended, this skill walks you through a conversation that surfaces your actual intent, then produces the artifacts that drive the loop.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/runbook/` into `~/.claude/skills/runbook/`.

## Usage

```
/runbook set up a hardening pass for the shell scripts in lib/
/runbook create an autonomous loop to implement the endpoints in docs/api-spec.md
```

## How it works

Two phases:

**Alignment** — a conversation that surfaces seven elements: the work, the motivation, what the loop looks for (the lens), what reference it consults (the authority), what's in and out of scope, what success looks like, and whether to use a tight loop or recursive decomposition. This is a dialogue, not a form — the skill explores, reflects, and lets you correct before moving on.

**Seeding** — produces three files and a loop prompt:

| Artifact | Purpose |
|----------|---------|
| `FOCUS.md` | Lens, authority, scope, success criteria |
| `TASKS.md` | Task board skeleton (Open / In Progress / Done) |
| `LEARNINGS.md` | Append-only memory for the loop to write and you to read |
| Loop prompt | Customized from a template, deployable via cron or manual use |

## When to use this

Use it when you want an agent to work autonomously over a sustained period — implementing a feature from a spec, hardening a codebase against a checklist, migrating patterns across files. The alignment conversation is the investment; the loop is the payoff.

Not useful for one-off tasks you can describe in a single prompt.

## References

| File | Purpose |
|------|---------|
| [`references/alignment-guide.md`](references/alignment-guide.md) | Conversation protocol: decomposition, question patterns, visualization |
| [`references/checklist.md`](references/checklist.md) | Gates validating alignment completeness before seeding |
| [`references/seeding-guide.md`](references/seeding-guide.md) | Artifact templates and production instructions |
| [`references/loop-prompt.md`](references/loop-prompt.md) | Autonomous loop prompt template |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`runbook.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/runbook.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

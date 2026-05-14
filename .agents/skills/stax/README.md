# stax

Agent Skill for [stax](https://github.com/cesarferreira/stax) (v0.27.0) — a fast Rust CLI for stacked Git branches and PRs. When loaded, agents route all branch, rebase, push, and PR operations through stax instead of raw git.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/stax/` into `~/.claude/skills/stax/`.

## Usage

The skill activates automatically when agents encounter git branch, rebase, push, or PR operations.

```sh
stax create feature-name -m "Add feature"   # create a stacked branch
stax modify                                  # stage all changes and amend
stax submit --yes --no-prompt                # submit stack for review
stax cascade                                 # sync, restack, and submit
stax merge --yes --when-ready                # merge the stack
```

## What it does

- Routes common git operations (branch, rebase, push, PR) through stax equivalents
- Provides a fallback table for operations stax does not cover (selective staging, stash, blame, cherry-pick, tags)
- Ensures agent-safe invocation with `--yes --no-prompt --quiet` flags
- Includes 12+ composable workflows for stacked development

## When to use this

Use it in any repository where stax is installed and you want agents to manage branches through stacks rather than raw git. The skill makes stacked development the default path — agents do not need to be told to use stax for each operation.

Not useful if the repository does not use stax.

## Prerequisites

- stax v0.27.0+ installed (`cargo install stax` or via release binary)
- GitHub authentication configured (`stax auth`)

## References

| File | Purpose |
|------|---------|
| [`references/commands.md`](references/commands.md) | Complete command reference — every command, every flag |
| [`references/workflows.md`](references/workflows.md) | 12+ composable step-by-step workflows |
| [`references/concepts.md`](references/concepts.md) | Mental model: stacks, trunk, parent/child, risk classification |
| [`references/stax-first.md`](references/stax-first.md) | Exhaustive git-to-stax operation mapping |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`stax.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/stax.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

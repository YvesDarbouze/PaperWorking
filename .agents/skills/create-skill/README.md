# create-skill

Research-first pipeline for producing Agent Skills that meet the [Agent Skills Specification](https://agentskills.io/specification). Every skill it creates is backed by cited documentation, with workflow templates for procedural tasks and anti-hallucination rules that prevent agents from inventing patterns.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/create-skill/` into `~/.claude/skills/create-skill/`.

## Usage

```
/create-skill a skill for writing Terraform modules
/create-skill build a skill for Apache Kafka consumer patterns
/create-skill make a skill for React Server Components
```

## How it works

The pipeline runs in nine stages:

1. **Load guidance** — reads the official skill-development best practices
2. **Bootstrap** — clones or updates the Agent Skills Specification repo
3. **Research** — finds and catalogs all official documentation for the skill's domain
4. **Requirements** — asks you what the skill should do and where to write it
5. **Author** — creates the complete skill directory with all files
6. **Optimize** — runs the Anthropic skill-creator for description testing
7. **Review** — validates against quality criteria and spec compliance
8. **Refine** — applies fixes from review and re-validates (up to 2 cycles)
9. **Report** — presents findings with any remaining issues

## Why use this instead of writing a skill by hand?

The Agent Skills Specification is detailed — frontmatter fields, progressive disclosure rules, description voice requirements, file structure conventions. Getting all of it right manually means reading the spec cover to cover. This skill does the research first, then builds the skill to match what the documentation actually says, rather than what an agent guesses it says.

## References

| File | Purpose |
|------|---------|
| [`references/workflow-research.md`](references/workflow-research.md) | Subagent prompt for research phase |
| [`references/workflow-requirements.md`](references/workflow-requirements.md) | Inline prompt for requirements gathering |
| [`references/workflow-author.md`](references/workflow-author.md) | Subagent prompt for skill authoring |
| [`references/workflow-review.md`](references/workflow-review.md) | Subagent prompt for post-creation review |
| [`references/workflow-refine.md`](references/workflow-refine.md) | Subagent prompt for fix-and-reverify loop |
| [`references/quality-criteria.md`](references/quality-criteria.md) | Quality bar: what makes a good skill |
| [`references/shell-script-standards.md`](references/shell-script-standards.md) | Shell style rules for scripts |

## Scripts

| File | Purpose |
|------|---------|
| [`scripts/ensure_spec_repo.sh`](scripts/ensure_spec_repo.sh) | Clone or update the Agent Skills Spec repo to `~/.agent-skills-spec` |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`create-skill.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/create-skill.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

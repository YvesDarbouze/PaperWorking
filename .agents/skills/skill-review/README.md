# skill-review

Audit Agent Skill directories against the [Agent Skills Specification](https://agentskills.io/specification). Produces a structured pass/fail report with specific fix instructions for each failure.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/skill-review/` into `~/.claude/skills/skill-review/`.

## Usage

```
/skill-review path/to/skill
```

Or describe what you want reviewed:

```
Review the skill at ~/.claude/skills/my-skill/
```

## What it checks

- **Frontmatter** — name format, description voice, reserved words, required fields
- **Progressive disclosure** — SKILL.md size, conditional loading, reference depth
- **URLs** — fetches and verifies every URL in reference files
- **Scripts** — audits shell scripts against style standards
- **README** — validates completeness
- **Workflows** — checks metadata and task tracking instructions

## When to use this

Run it after creating or modifying a skill, before publishing. The spec has enough rules that manual verification misses things — especially URL reachability and frontmatter formatting. This catches those before someone else installs the skill and hits the errors.

## References

| File | Purpose |
|------|---------|
| [`references/checks-spec.md`](references/checks-spec.md) | Frontmatter and spec compliance checks |
| [`references/checks-references.md`](references/checks-references.md) | Reference file quality and URL reachability |
| [`references/checks-scripts.md`](references/checks-scripts.md) | Shell script standards |
| [`references/checks-structure.md`](references/checks-structure.md) | README, task tracking, progressive disclosure, workflow metadata |
| [`references/report-template.md`](references/report-template.md) | Output report format |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`skill-review.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/skill-review.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

# team

Assemble a team of 3-8 expert personas who collaboratively analyze a problem through structured discussion phases. Each persona contributes in character with visible reasoning, so you can see where experts agree, where they disagree, and why.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/team/` into `~/.claude/skills/team/`.

## Usage

```
/team Analyze the security implications of our new auth flow
/team Review the migration plan for the database schema changes
```

## How it works

1. **Situation Analysis** — analyzes scenario type, risk level, and constraints
2. **Team Selection** — picks 3-8 personas matching the problem profile
3. **User Approval** — presents the team for your confirmation before proceeding
4. **Discussion** — structured rounds: analysis, impact assessment, assumption challenges, risk mitigation
5. **Synthesis** — actionable items with file paths, line numbers, and validation methods
6. **Implementation** — only on your explicit request

Phases 0-4 are read-only. All technical claims are cited via web search.

## When to use this

Use it when a decision benefits from multiple expert perspectives — architecture reviews, security assessments, migration planning, anything where a single viewpoint risks missing important considerations. The structured phases surface assumptions and risks that a solo analysis tends to overlook.

Not useful for questions with clear, unambiguous answers. The overhead of assembling a team only pays off when the problem has genuine complexity or competing concerns.

## Prerequisites

Requires persona files in `~/.claude/personas/*.md`.

## References

| File | Purpose |
|------|---------|
| [`references/team-config.yaml`](references/team-config.yaml) | Phase rules, persona mapping, reasoning settings |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`team.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/team.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

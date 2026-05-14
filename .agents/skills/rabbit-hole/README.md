# rabbit-hole

Multi-agent investigation pipeline for deep research questions. Separates cheap territory-mapping from expensive deep investigation, validates every citation, and presents findings with explicit confidence levels.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/rabbit-hole/` into `~/.claude/skills/rabbit-hole/`.

## Usage

```
/rabbit-hole How does React's concurrent rendering actually work under the hood?
/rabbit-hole What are the tradeoffs between SQLite and DuckDB for embedded analytics?
```

## How it works

```
TRIAGE → SCOUT → INVESTIGATE → VALIDATE → REPORT
```

1. **Triage** — simple questions get answered directly; complex ones enter the pipeline
2. **Scout** — a fast agent finds 3-15 leads across all available sources (codebase, web, docs, academic)
3. **Investigate** — 1-3 parallel agents read sources and extract cited findings
4. **Validate** — citations are verified, sources ranked by tier, findings synthesized
5. **Report** — convergence, divergence, and gaps presented; you can go deeper on any branch

The skill is read-only — it never modifies files. Every claim is cited. Every citation is validated.

## When to use this

Use it when a question needs more than a single search — when you want to understand a topic from multiple angles, compare sources, or verify claims before acting on them. The pipeline is deliberately expensive; it trades speed for thoroughness.

For quick factual lookups, just ask directly.

## Contents

| File | Purpose |
|------|---------|
| [`scripts/validate_sources.py`](scripts/validate_sources.py) | Deterministic citation validator (stdlib only) |
| [`references/research-hierarchy.md`](references/research-hierarchy.md) | Source tier definitions and conflict resolution rules |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`rabbit-hole.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/rabbit-hole.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

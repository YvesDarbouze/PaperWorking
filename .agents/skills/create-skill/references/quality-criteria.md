# Quality Criteria

What makes a skill "good enough" — the quality bar every created skill must meet before delivery.

Criteria are grouped by source: **Spec** items come from the [Agent Skills Specification](https://agentskills.io/specification) and [Anthropic platform best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). **Convention** items are create-skill practices that go beyond the spec.

## Spec Compliance

*Source: <https://agentskills.io/specification>*

- [ ] `name` in frontmatter uses lowercase alphanumeric + hyphens, ≤ 64 chars, matches directory name
- [ ] `name` does not start/end with hyphen, no consecutive hyphens, no reserved words (`anthropic`, `claude`)
- [ ] `description` in frontmatter is present and < 1024 characters
- [ ] `description` is written in **third person** ("Processes Excel files", not "I can help you" or "Use this to…") — Source: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>
- [ ] `description` includes trigger phrases describing both what the skill does AND when to use it
- [ ] SKILL.md body exists and contains actionable instructions
- [ ] SKILL.md is < 500 lines (spec recommendation for optimal performance)
- [ ] File references from SKILL.md are one level deep (no nested reference chains)
- [ ] No `.skill` file created unless explicitly requested
- [ ] Scripts avoid interactive prompts (hard requirement — agents run in non-interactive shells) — Source: <https://agentskills.io/skill-creation/using-scripts.md>

## Progressive Disclosure

*Source: <https://agentskills.io/specification>*

- [ ] Details live in `references/`, not crammed into SKILL.md
- [ ] SKILL.md loads references conditionally (table or if/then) — not all at once
- [ ] Reference files are self-contained: an agent reading one file gets what it needs for that topic

## Reference File Requirements

*Convention: create-skill anti-hallucination practice (not spec-required)*

- [ ] Every claim about an external technology cites a URL
- [ ] Reference files instruct the consuming agent to follow cited URLs rather than relying on patterns
- [ ] Each reference file covers one coherent topic (not a kitchen-sink dump)
- [ ] URLs are reachable (verified via fetch, not assumed)
- [ ] If official docs are unavailable, the reference file says so explicitly — no silent fabrication

## Workflow Template Requirements

*Convention: create-skill orchestration practice (not spec-required)*

- [ ] Procedural tasks have step-by-step workflow files in `references/` or `assets/workflows/`
- [ ] Each workflow file declares execution metadata at the top:
    - `execution: subagent | inline` — whether it runs as a spawned subagent or inline in main context
    - `parallelism: sequential | parallel | batch` — whether it can run alongside other workflows
    - `needs-user-interaction: true | false` — whether it requires user input (forces inline)
- [ ] Workflows that need user interaction are marked `execution: inline`
- [ ] Workflow prompts follow agent-prompting conventions: Role, Task, Onboarding, Perspective, Success, Why

## Task Tracking

*Convention: Claude Code workflow practice (not spec-required)*

- [ ] Skills with 3+ step procedures instruct the consuming agent to track progress
- [ ] Task instructions appear in SKILL.md body, not buried in a reference file

## README Requirements

*Convention: repo standard (not spec-required — spec only requires SKILL.md)*

- [ ] `README.md` exists at skill root
- [ ] Contains install command: `claude install-skill github:...` or path-based install
- [ ] Describes what the skill does (2-4 sentences)
- [ ] Lists references in a table (file | purpose)
- [ ] Includes 1-2 usage examples
- [ ] No placeholder or stub content

## Script Standards

*Extends: <https://agentskills.io/skill-creation/using-scripts.md> and <https://google.github.io/styleguide/shellguide.html>*

- [ ] Scripts follow Google Shell Style Guide
- [ ] Scripts output what they are about to do before doing it *(convention)*
- [ ] Scripts warn before destructive or side-effect operations *(convention)*
- [ ] Scripts are non-destructive by default *(convention)*
- [ ] Scripts use `set -euo pipefail`
- [ ] Scripts are idempotent — safe to run multiple times *(Source: agentskills.io scripts guide)*
- [ ] Scripts exit 0 on success, non-zero on failure with clear error messages to stderr
- [ ] Scripts avoid interactive prompts *(spec hard requirement)*

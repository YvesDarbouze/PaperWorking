---
name: create-skill
description: >-
  Create research-backed, spec-compliant Agent Skills with cited references,
  workflow templates, and anti-hallucination guardrails. Use when asked to
  "create a skill", "make a new skill", "build a skill for X", or when
  designing specialized Claude capabilities.
---

# Create Skill

Research-first pipeline for producing Agent Skills that meet the [Agent Skills Specification](https://agentskills.io/specification). Every created skill is backed by cited documentation, includes workflow templates for procedural tasks, and never lets the agent substitute patterns for real docs.

## Context Loading

Load references based on what the current phase needs. Do NOT load everything upfront.

| Phase | Load | Do NOT Load |
|-------|------|-------------|
| Research (Phase 3) | [`references/workflow-research.md`](references/workflow-research.md) | workflow-author, workflow-review, workflow-refine |
| Requirements (Phase 4) | [`references/workflow-requirements.md`](references/workflow-requirements.md) | workflow-author, workflow-review, workflow-refine |
| Authoring (Phase 5) | [`references/workflow-author.md`](references/workflow-author.md), [`references/quality-criteria.md`](references/quality-criteria.md) | workflow-research, workflow-review, workflow-refine |
| Review (Phase 7) | [`references/workflow-review.md`](references/workflow-review.md), [`references/quality-criteria.md`](references/quality-criteria.md) | workflow-research, workflow-author, workflow-refine |
| Refinement (Phase 8) | [`references/workflow-refine.md`](references/workflow-refine.md), [`references/quality-criteria.md`](references/quality-criteria.md) | workflow-research, workflow-author |

**Skip guidance based on skill type:**

| Skill Type | Skip | Why |
|------------|------|-----|
| Conceptual / methodology | Scripts phase, `shell-script-standards.md` | No scripts needed |
| Simple (< 4 files) | Task tracking | Overhead exceeds value |
| Claude-native feature | External doc research — use Anthropic docs only | No third-party tech |
| Pure wrapper around one tool | Workflow templates | Not procedural |

## Orchestration Flow

Follow these phases in order. Each phase depends on the previous one's output. Track progress through each phase using available task tracking tools — this is a 9-phase process and always qualifies for task tracking.

### Phase 0: Load Skill-Development Guidance

Ground the pipeline in official skill development best practices:

1. Search for a local skill-development plugin: look for `skill-development/SKILL.md` under `~/.claude/plugins/`
2. **If found locally**: invoke `Skill("plugin-dev:skill-development")` and read its references
3. **If not found locally**: fetch from the official plugins marketplace:
   - `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/plugin-dev/skills/skill-development/SKILL.md`
   - `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/plugin-dev/skills/skill-development/references/skill-creator-original.md`
4. Keep this guidance in context — the authoring phase needs it

**If fetch fails**: proceed without it. The quality-criteria.md and workflow-author.md contain enough guidance. Note the gap in the requirements document.

### Phase 1: Bootstrap

```bash
bash skills/create-skill/scripts/ensure_spec_repo.sh
```

This ensures `~/.agent-skills-spec` contains the latest Agent Skills Specification.

**If clone/pull fails**: check network connectivity. If offline, check if `~/.agent-skills-spec` already exists from a prior run. If it does, proceed with stale data and note it. If it doesn't exist at all, warn the user — spec compliance cannot be verified without it.

### Phase 2: Install Skill-Creator

Check if `~/.claude/skills/skill-creator/SKILL.md` exists. If not:

```bash
claude install-skill github:anthropics/skills/skills/skill-creator
```

**If install fails**: skip Phase 6 (skill-creator optimization). Note the gap — description won't be machine-tested.

### Phase 3: Research *(subagent, general-purpose)*

Spawn a research subagent:

```
Role: Domain researcher
Task: Research {{SKILL_TOPIC}} exhaustively using references/workflow-research.md
Onboarding: Read references/workflow-research.md, then read ~/.agent-skills-spec
Success: Research report with cited sources covering all aspects of {{SKILL_TOPIC}}
Why: The research report is the foundation — every fact in the final skill traces back to it
```

Replace `{{SKILL_TOPIC}}` with the user's requested skill topic. Wait for the research report.

**If research finds no official docs**: the skill must be marked as "community-sourced" in its reference files. Warn the user that anti-hallucination guardrails are weaker without official documentation. Ask whether to proceed or narrow scope.

### Phase 4: Requirements *(inline — needs user interaction)*

Follow [`references/workflow-requirements.md`](references/workflow-requirements.md) directly. Do NOT spawn a subagent — this requires user input.

1. Read the research report from Phase 3
2. Present a summary of what was found
3. Ask the user scoping questions using AskUserQuestion
4. **Ask where to write the skill** (personal `~/.claude/skills/`, project `.claude/skills/`, or custom path)
5. Produce a requirements document

Wait for user answers before proceeding.

### Phase 5: Author *(subagent, general-purpose)*

Spawn an authoring subagent:

```
Role: Skill author and spec implementer
Task: Create the complete skill at {{SKILL_PATH}} following references/workflow-author.md
Onboarding: Read references/workflow-author.md, the research report, the requirements doc,
            the skill-development guidance from Phase 0, and ~/.agent-skills-spec
Success: Complete skill directory with all files passing quality-criteria.md
Why: This produces the actual deliverable — quality here determines whether agents using the skill succeed
```

Pass in: `{{SKILL_NAME}}`, `{{SKILL_PATH}}`, research report, requirements doc, skill-development guidance from Phase 0.

If the skill involves more than 3 files, the subagent must track each file as a separate task.

**If target path already exists**: stop. Report to user. Never overwrite.

### Phase 6: Skill-Creator Optimization *(skip if install failed in Phase 2)*

```
Invoke Skill("skill-creator") targeting the skill at {{SKILL_PATH}}
```

Validates the description triggers correctly and suggests improvements.

### Phase 7: Review *(subagent, general-purpose)*

Spawn a review subagent:

```
Role: Quality auditor
Task: Review the skill at {{SKILL_PATH}} following references/workflow-review.md
Onboarding: Read references/workflow-review.md, references/quality-criteria.md, ~/.agent-skills-spec
Success: Review report with pass/fail per criterion and specific fix instructions
Why: Review is the last line of defense — a skill that passes review is safe to publish
```

### Phase 8: Refine *(subagent if fixes needed, skip if review passes)*

If the review report contains required fixes:

Spawn a refinement subagent:

```
Role: Skill fixer
Task: Apply all required fixes from the review report following references/workflow-refine.md
Onboarding: Read references/workflow-refine.md, the review report, references/quality-criteria.md
Success: All required fixes applied and verified. Change summary produced.
Why: A review that finds problems but doesn't fix them is incomplete
```

**Max 2 refinement cycles.** If still failing after 2, present remaining issues to user for judgment.

If the review report is all-pass, skip this phase.

### Phase 9: Report

Present findings to the user:

- Overall pass/fail status
- What was created (file tree)
- Any fixes applied during refinement
- Any remaining issues
- If issues remain, offer specific next steps

## Rules

1. **NEVER hallucinate patterns** for external technologies — always cite documentation URLs
2. **NEVER use curl/wget** to download code — use `git clone` for repos, WebFetch for docs
3. **Always package a newly-created skill** as described in the repo `CLAUDE.md` ("Packaging a skill to `.skill`" section). Run the installed `skill-creator` plugin's packager — never vendor or reimplement it. Also append the README footer and commit the `.skill` file alongside the source.
4. **NEVER replace an existing skill directory** — only create new or add to existing
5. **Every reference file must contain source URLs** that the consuming agent is instructed to follow
6. **Scripts follow Google Shell Style Guide** strictly — see [`references/shell-script-standards.md`](references/shell-script-standards.md)
7. **Multi-step skills must instruct task tracking** — if the skill has 3+ procedural steps, it must tell the consuming agent to track progress

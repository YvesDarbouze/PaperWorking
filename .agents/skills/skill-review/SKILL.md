---
name: skill-review
description: >-
  Evaluate Agent Skill directories against the Agent Skills Specification
  and quality criteria. This skill should be used when the user asks to
  "review a skill", "audit skill compliance", "check if a skill passes",
  "validate skill against spec", or when verifying a skill before publishing.
  Produces a pass/fail report with fix instructions for each failure.
---

# Skill Review

Audit an Agent Skill directory against the Agent Skills Specification and quality criteria. Produce a structured pass/fail report with specific fix instructions for every failure.

## Context Loading

Load only the reference files needed for the current check group. Do NOT load all references upfront.

| Check Group | Load | Do NOT Load |
|-------------|------|-------------|
| Spec Compliance | [`references/checks-spec.md`](references/checks-spec.md) | checks-references, checks-scripts, checks-structure |
| Reference Quality | [`references/checks-references.md`](references/checks-references.md) | checks-spec, checks-scripts, checks-structure |
| Script Standards | [`references/checks-scripts.md`](references/checks-scripts.md) | checks-spec, checks-references, checks-structure |
| Structure & README | [`references/checks-structure.md`](references/checks-structure.md) | checks-spec, checks-references, checks-scripts |
| Report Generation | [`references/report-template.md`](references/report-template.md) | All checks-*.md files |

**Skip guidance based on skill contents:**

| Condition | Skip | Why |
|-----------|------|-----|
| No `scripts/` directory | Script Standards check group | Nothing to audit |
| No workflow files | Workflow metadata checks in checks-structure.md | Nothing to audit |
| Fewer than 3 procedural steps | Task tracking check in checks-structure.md | Overhead exceeds value |

## Review Process

Track progress using available task tracking tools — this review has 8 check groups plus locate and report steps, and always qualifies for task tracking.

### 1. Locate the Skill

Resolve the target skill path. Confirm `SKILL.md` exists at the root. If it does not exist, fail immediately — no skill to review.

### 2. Spec Compliance

Load [`references/checks-spec.md`](references/checks-spec.md). Validate the `name` field, `description` field, frontmatter structure, and body content against the Agent Skills Specification.

### 3. Reference Quality

Load [`references/checks-references.md`](references/checks-references.md). Audit every file in `references/` for topic coherence, citation presence, and self-containment. Use WebFetch to verify every URL found in reference files — record each URL's reachability status.

### 4. URL Reachability

This is part of the Reference Quality check group but reported separately. For every URL found across all skill files, fetch it with WebFetch and record whether it returns content or fails.

### 5. Progressive Disclosure

Load [`references/checks-structure.md`](references/checks-structure.md). Count the lines in `SKILL.md` (report the actual number). Verify that detailed content lives in reference files, not in the main SKILL.md. Confirm reference loading is conditional (table or if/then pattern), not a blanket "load everything" instruction.

### 6. Workflow Files

Load [`references/checks-structure.md`](references/checks-structure.md) (workflow metadata section). If workflow files exist, verify each declares `execution:`, `parallelism:`, and `needs-user-interaction:` metadata. If no workflow files exist, mark as N/A.

### 7. Task Tracking

Load [`references/checks-structure.md`](references/checks-structure.md) (task tracking section). If the skill describes 3 or more procedural steps, verify that SKILL.md instructs the consuming agent to track progress through those steps. If fewer than 3 steps, mark as N/A.

### 8. Script Standards

Load [`references/checks-scripts.md`](references/checks-scripts.md). If a `scripts/` directory exists, audit every script against shell and script standards. If no scripts exist, mark as N/A.

### 9. README

Load [`references/checks-structure.md`](references/checks-structure.md) (README section). Verify README.md exists and meets all completeness criteria.

### 10. Generate Report

Load [`references/report-template.md`](references/report-template.md). Compile all check results into the report format. List every failure with the specific file path and what to change. Separate required fixes from optional recommendations.

## Rules

1. **Never hallucinate spec requirements** — every check must trace to a cited source URL
2. **Never use curl or wget** — use WebFetch for all URL verification
3. **Never reference other skills** in this repository — this skill is functionally independent
4. **Report facts, not opinions** — pass/fail against stated criteria, not subjective quality judgments
5. **Include actual values** — when a check measures something (line count, character count), report the measured value alongside the threshold
6. **Mark inapplicable checks as N/A** — do not fail a skill for lacking scripts when it has no scripts directory

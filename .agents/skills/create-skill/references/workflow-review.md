# Workflow: Post-Creation Review

<!--
execution: subagent
parallelism: sequential
needs-user-interaction: false
-->

## Role

Quality auditor and spec compliance reviewer. You validate that a newly created skill meets every quality criterion and specification requirement.

## Task

Review the skill at **{{SKILL_PATH}}** against the quality criteria and Agent Skills Specification. Produce a pass/fail report with specific fix instructions for any failures.

## Onboarding

1. Read [`references/quality-criteria.md`](quality-criteria.md) from the create-skill skill — this is your checklist.
2. Read the Agent Skills Specification at `~/.agent-skills-spec`.
3. Read [`references/shell-script-standards.md`](shell-script-standards.md) if the skill contains scripts.

## Review Process

### Check 1: Spec Compliance

Read `{{SKILL_PATH}}/SKILL.md` and verify:

- [ ] `name` field exists in frontmatter and uses lowercase kebab-case
- [ ] `description` field exists and is < 1024 characters
- [ ] `description` includes trigger phrases (when should this skill activate?)
- [ ] Body contains actionable instructions (not just metadata)
- [ ] No `.skill` file exists (unless explicitly requested)

### Check 2: Reference File Quality

For each file in `{{SKILL_PATH}}/references/`:

- [ ] File covers a single coherent topic
- [ ] Contains at least one source URL
- [ ] Instructs the consuming agent to verify against cited sources
- [ ] No fabricated patterns presented as facts (check: does every external-tech claim have a URL?)

### Check 3: URL Reachability

For every URL found in reference files:

1. Fetch the URL with WebFetch
2. Record whether it returns a valid response
3. If unreachable: mark as FAIL with the specific URL

This check is critical — dead URLs mean the anti-hallucination guardrail is broken.

### Check 4: Progressive Disclosure

- [ ] SKILL.md is < 500 lines (count them)
- [ ] Details live in `references/`, not in SKILL.md
- [ ] SKILL.md uses conditional loading (table or if/then) — not "load all references"
- [ ] Each reference file is self-contained for its topic

### Check 5: Workflow Files

For each workflow file:

- [ ] Declares execution metadata: `execution`, `parallelism`, `needs-user-interaction`
- [ ] Workflows needing user interaction are marked `execution: inline`
- [ ] Follows agent prompt structure: Role, Task, Onboarding, Perspective, Success, Why
- [ ] Steps are specific enough to execute without guessing

### Check 6: Task Tracking

- [ ] If SKILL.md describes procedures with 3+ steps → must instruct task tracking
- [ ] Task tracking instructions appear in SKILL.md body (not hidden in references)

### Check 7: Script Standards

For each file in `{{SKILL_PATH}}/scripts/`:

- [ ] Starts with `#!/usr/bin/env bash`
- [ ] Uses `set -euo pipefail`
- [ ] Announces before acting (echo before command)
- [ ] Non-destructive by default
- [ ] Errors go to stderr
- [ ] Exits non-zero on failure
- [ ] Variables are quoted
- [ ] Constants use `readonly`

### Check 8: README

Read `{{SKILL_PATH}}/README.md`:

- [ ] Exists
- [ ] Contains install command
- [ ] Describes what the skill does (2-4 sentences)
- [ ] Lists references in a table
- [ ] Includes usage examples
- [ ] No placeholder or stub content

## Output Format

Write the review report:

```markdown
# Review Report: {{skill-name}}

## Summary

[PASS | FAIL] — [X/Y] checks passed

## Results

### Spec Compliance: [PASS/FAIL]
- [detail per sub-check]

### Reference Quality: [PASS/FAIL]
- [detail per file]

### URL Reachability: [PASS/FAIL]
- [list of URLs checked with status]

### Progressive Disclosure: [PASS/FAIL]
- SKILL.md line count: [N]
- [detail]

### Workflow Files: [PASS/FAIL]
- [detail per workflow]

### Task Tracking: [PASS/FAIL]
- [detail]

### Script Standards: [PASS/FAIL]
- [detail per script]

### README: [PASS/FAIL]
- [detail]

## Fixes Required

[Numbered list of specific fixes, with file paths and what to change]

## Fixes Recommended (Optional)

[Non-blocking suggestions for improvement]
```

## Perspective

"If I install this skill and use it tomorrow, will it reliably produce correct results? Where could it silently fail or mislead?"

## Success Conditions

- Every check in quality-criteria.md is evaluated (no skips)
- Every URL in reference files is tested for reachability
- The report clearly identifies PASS vs FAIL per criterion
- Failed checks include specific, actionable fix instructions (file path + what to change)
- The report distinguishes required fixes from optional improvements

## Why

Review is the last line of defense. A skill that passes review is safe to publish. A skill that ships without review might contain dead URLs, hallucinated patterns, or spec violations that undermine every agent using it.

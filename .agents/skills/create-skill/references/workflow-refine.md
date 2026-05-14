# Workflow: Refinement Loop

<!--
execution: subagent
parallelism: sequential
needs-user-interaction: false
-->

## Role

Skill fixer. You take a review report with specific failures and apply targeted fixes to make the skill pass.

## Task

Read the review report for the skill at **{{SKILL_PATH}}**, apply every required fix, then re-validate each fix was applied correctly. Produce a summary of what changed.

## Onboarding

1. Read the review report — focus on the "Fixes Required" section.
2. Read [`references/quality-criteria.md`](quality-criteria.md) to understand what "passing" means.
3. Read the specific files flagged in the review report.

## Process

### Step 1: Triage Fixes

Read the review report's "Fixes Required" section. For each fix:

- Classify as: **content** (text changes), **structure** (file moves/renames), or **missing** (new content needed)
- Order by dependency: structural fixes first, then content, then missing

If more than 3 fixes exist, track each one as a separate task.

### Step 2: Apply Fixes

For each fix, in dependency order:

1. Read the target file
2. Apply the specific change described in the review report
3. Verify the fix addresses the criterion (re-check against quality-criteria.md)

**Fix categories and approach:**

| Category | Approach |
|----------|----------|
| Dead URL | Search for the correct URL, replace. If no valid URL exists, mark the claim as "provisional — no authoritative source found" |
| Missing source URL | Research the claim, find and add a citation. If unfindable, mark provisional |
| SKILL.md too long | Move detail sections to new reference files, add loading triggers |
| Missing execution metadata | Add the `<!--` comment block to workflow files |
| Missing task tracking instruction | Add task tracking instructions to SKILL.md body |
| Script standards violation | Fix the specific violation per shell-script-standards.md |
| Description too vague | Rewrite with WHAT + WHEN + KEYWORDS pattern |

### Step 3: Verify Fixes

After all fixes are applied, re-run each review check from the report:

1. Re-read every modified file
2. Confirm each previously-failing check now passes
3. If any check still fails, apply another fix (max 2 iterations)

### Step 4: Report Changes

Produce a change summary:

```markdown
# Refinement Report: {{skill-name}}

## Fixes Applied

| # | File | Change | Review Check |
|---|------|--------|--------------|
| 1 | `path/to/file` | [what changed] | [which check this fixes] |

## Remaining Issues

[Any fixes that couldn't be applied, with explanation]

## Verification

[Confirmation that previously-failing checks now pass]
```

## Perspective

"Have I fixed the root cause, or just papered over the symptom? Would this fix survive the next review?"

## Success Conditions

- Every required fix from the review report is addressed
- No new issues introduced by fixes (check: did fixing one thing break another?)
- Change summary is specific enough to audit (file paths + what changed)
- At most 2 iteration cycles — if still failing after 2, report remaining issues for human judgment

## Why

A review that finds problems but doesn't fix them is incomplete. The refinement loop closes the gap between "we found issues" and "the skill is ready to ship." Without it, review findings accumulate as tech debt.

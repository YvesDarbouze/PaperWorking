---
name: stax
description: >-
  Manages stacked Git branches and PRs using stax (v0.27.0). This skill should
  be used when the user asks to "create a branch", "push changes", "rebase",
  "submit a PR", "sync with main", "manage stacked branches", or when any git
  branch, rebase, push, or PR operation could be handled by stax. Provides
  stax-first routing so agents default to stax over raw git for all supported
  operations, plus composable workflows for stacked development.
---

# Stax Context Engineering Runbook

Stax replaces most git branch, rebase, push, and PR commands with stack-aware equivalents. **Consult the routing table below before running any git command.** If stax can handle it, use stax.

## Stax First — Default Routing

Before running any git command, check this table. If stax has an equivalent, use it.

| Instead of (git / gh) | Use (stax) | Notes |
|------------------------|------------|-------|
| `git checkout -b <name>` | `stax create <name>` | Creates branch + tracks parent |
| `git branch -d <name>` | `stax branch delete` | Removes branch + metadata |
| `git branch -m <name>` | `stax rename <name>` | Renames + updates metadata |
| `git checkout <branch>` | `stax checkout <branch>` | Stack-aware checkout |
| `git checkout -` | `stax prev` | Previous branch |
| `git checkout main` | `stax trunk` | Switch to trunk |
| `git add . && git commit --amend` | `stax modify` | Stage all + amend |
| `git add . && git commit --amend -m "msg"` | `stax modify -m "msg"` | Stage all + amend with message |
| `git rebase <parent>` | `stax restack` | Rebase onto tracked parent |
| `git rebase --continue` | `stax continue` | After resolving conflicts |
| `git rebase --abort` | `stax abort` | Abort rebase |
| `git push -u origin <branch>` | `stax submit --no-pr --yes --no-prompt` | Push without PR |
| `git push && gh pr create` | `stax submit --yes --no-prompt` | Push + create/update PR |
| `gh pr merge` | `stax merge --yes` | Merge from bottom of stack up |
| `gh pr view --web` | `stax pr` | Open PR in browser |
| `gh pr checks` | `stax ci` | CI status for stack |
| `gh pr view --comments` | `stax comments` | PR comments |
| `git fetch && git pull` (trunk) | `stax sync` | Pull trunk + delete merged |
| `git fetch && git rebase origin/main` | `stax sync --restack` | Sync + restack all |
| `git log --oneline --graph` | `stax log` | Stack-aware commit graph |
| `git diff <parent>..HEAD` | `stax diff` | Diff per branch vs parent |
| `git branch` (list) | `stax status` | Stack tree view |
| `git push --force-with-lease` | `stax submit --yes --no-prompt` | Stax handles force-push |
| `git rebase <parent> && git push` | `stax cascade` | Restack + submit in one |

Full mapping with edge cases: [`references/stax-first.md`](references/stax-first.md)

## Git Fallback — No Stax Equivalent

These operations have NO stax equivalent. Use git directly.

| Operation | Command | Why |
|-----------|---------|-----|
| Selective staging | `git add <file>` | `stax modify` stages ALL changes |
| New commit (not amend) | `git commit -m "msg"` | `stax modify` only amends; `stax create` makes a new branch |
| Stash | `git stash` / `git stash pop` | No equivalent |
| Blame | `git blame <file>` | No equivalent |
| Cherry-pick | `git cherry-pick <sha>` | No equivalent |
| Tags | `git tag` | No equivalent |
| File-level log | `git log -- <file>` | No equivalent |
| File-level diff | `git diff -- <file>` | `stax diff` is whole-branch |
| Clone | `git clone` | No equivalent |
| Remote management | `git remote` | No equivalent |
| Git config | `git config` | Use `stax config` for stax settings only |

## Context Loading

Load references only when needed:

| Situation | Load | Skip |
|-----------|------|------|
| Need exact flags for a command | [`references/commands.md`](references/commands.md) | workflows, concepts |
| Multi-step workflow (submit stack, merge, recover) | [`references/workflows.md`](references/workflows.md) | commands, concepts |
| Understanding stack model or risk levels | [`references/concepts.md`](references/concepts.md) | commands, workflows |
| Deciding git vs stax for an operation | [`references/stax-first.md`](references/stax-first.md) | commands, workflows |
| Simple create/modify/submit | Nothing extra — SKILL.md is sufficient | all references |

## Quick Reference

### Visualization

| Command | What it shows | Key flags |
|---------|--------------|-----------|
| `stax status` | Simple tree view | `--json`, `--current`, `--compact` |
| `stax ll` | Tree + PR URLs + details | `--json`, `--current` |
| `stax log` | Tree + commits + PR info | `--json`, `--current` |
| `stax diff` | Diff per branch vs parent | `--all` |
| `stax ci` | CI status for stack | `--json`, `--watch`, `--stack` |

### Creating & Committing

| Command | What it does | Key flags |
|---------|-------------|-----------|
| `stax create <name>` | New branch on current | `-m "msg"`, `--from <branch>`, `-a` |
| `stax modify` | Stage all + amend commit | `-m "new message"` |
| `stax branch squash` | Squash all commits on branch | — |
| `stax branch fold` | Fold branch into parent | — |

### Navigation

| Command | Destination |
|---------|-------------|
| `stax checkout <branch>` | Named branch |
| `stax up [N]` | N children up (default 1) |
| `stax down [N]` | N parents down (default 1) |
| `stax top` | Tip/leaf of stack |
| `stax bottom` | First branch above trunk |
| `stax trunk` | Trunk branch |
| `stax prev` | Previous branch (like `git checkout -`) |

### Sync & Restack

| Command | What it does | Key flags |
|---------|-------------|-----------|
| `stax sync` | Pull trunk, delete merged | `--restack`, `--prune`, `--force` |
| `stax restack` | Rebase current onto parent | `--all`, `--yes`, `--dry-run` |
| `stax cascade` | Restack all + submit | `--no-submit`, `--no-pr` |

### Submitting

| Command | Scope | Key flags |
|---------|-------|-----------|
| `stax submit` | Current + ancestors | `--yes --no-prompt`, `--draft`, `--no-pr` |
| `stax branch submit` | Current branch only | Same as submit |
| `stax upstack submit` | Current + descendants | — |
| `stax downstack submit` | Ancestors + current | — |

### Merging

| Command | What it does | Key flags |
|---------|-------------|-----------|
| `stax merge` | Merge PRs bottom-up to current | `--yes`, `--method`, `--when-ready`, `--dry-run` |

## Agent-Specific Patterns

### Non-Interactive Flags

Always use these when running stax commands in agent/automated context:

| Flag | Commands that support it | Purpose |
|------|-------------------------|---------|
| `--yes` | submit, merge, restack, detach, reorder, fix, undo, redo | Auto-approve prompts |
| `--no-prompt` | submit | Disable interactive prompts entirely |
| `--quiet` | status, ll, log, submit, modify, sync, restack, undo, redo | Suppress extra output |
| `--json` | status, ll, log, ci, standup, changelog | Machine-readable output |

**Standard agent invocation pattern**: `stax <command> --yes --no-prompt --quiet`

### JSON Output for Parsing

Use `--json` when you need to parse command output:

```
stax status --json          # stack structure as JSON
stax ci --json              # CI check results as JSON
stax ll --json              # branches + PR URLs as JSON
```

### Interactive-Only Commands (NEVER use in agent mode)

| Command | Why | Alternative |
|---------|-----|-------------|
| `stax split` | Opens interactive editor | Advise user to run manually |
| `stax reorder` | Opens interactive reorder UI | Use `stax branch reparent` for targeted moves |
| `stax rename` (no args) | Prompts for name | Always pass name: `stax rename <name>` |
| `stax checkout` (no args) | Interactive picker | Always pass branch: `stax checkout <branch>` |

## Common Compositions

**New feature stack → submit → merge:**

```
stax sync && stax create feature-a -m "Add feature A" && stax modify && stax submit --yes --no-prompt
```

**Respond to PR feedback:**

```
stax checkout <branch> && stax modify -m "Address review feedback" && stax cascade
```

**Full sync + restack + submit:**

```
stax sync --restack && stax submit --yes --no-prompt
```

**Check stack health before submitting:**

```
stax validate && stax doctor && stax submit --yes --no-prompt
```

More workflows: [`references/workflows.md`](references/workflows.md)

## NEVER

- **NEVER** `git checkout -b` — use `stax create`
- **NEVER** `git push` / `git push --force-with-lease` — use `stax submit`
- **NEVER** `git rebase <branch>` — use `stax restack`
- **NEVER** `stax modify` for selective staging — it stages ALL changes. Use `git add <files> && git commit --amend` for selective amend, or `git add <files> && git commit` for a new commit.
- **NEVER** `stax split` in agent mode — it requires interactive input
- **NEVER** `stax reorder` in agent mode — it requires interactive input
- **NEVER** `stax checkout` without a branch argument — it opens an interactive picker
- **NEVER** `stax rename` without a name argument — it prompts interactively
- **NEVER** run `stax submit` without `--yes --no-prompt` in agent mode — it may prompt
- **NEVER** `git merge` to merge stacked PRs — use `stax merge` which handles the bottom-up order

## Rules

1. **Sync before starting new work.** Run `stax sync` before `stax create` to ensure you're building on the latest trunk.
2. **Use `--yes --no-prompt` for all agent operations.** Any stax command that might prompt must include these flags.
3. **Check `stax status` before navigation.** Understand the stack structure before using `up`/`down`/`checkout`.
4. **Prefer `stax cascade` over manual restack+submit.** It handles the full restack-from-bottom then submit flow.
5. **Use `stax resolve` for AI conflict resolution.** When restack hits conflicts, try `stax resolve` before manual resolution.
6. **One branch = one logical change.** Each stacked branch should be a single reviewable unit.
7. **Use `stax modify` not `git commit --amend`.** Stax modify handles staging and metadata updates.
8. **Use `stax merge --when-ready` for unattended merges.** It polls CI and waits for approval.
9. **Check CI before merging.** Run `stax ci --stack` to verify all checks pass.
10. **Use `stax undo` for recovery.** If a stax operation goes wrong, `stax undo --yes` reverts it.

## Exit Check

After using stax, verify:

- [ ] No raw `git checkout -b`, `git push`, `git rebase` was used where stax has an equivalent
- [ ] All agent-mode commands include `--yes --no-prompt` where supported
- [ ] No interactive commands (`split`, `reorder`, argument-less `checkout`/`rename`) were used
- [ ] `stax sync` was run before creating new branches
- [ ] `stax status` was consulted to understand stack structure before navigation

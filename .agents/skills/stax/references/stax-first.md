# Stax-First: Git-to-Stax Command Mapping

> Complete mapping of git/gh operations to their stax equivalents for stax v0.27.0.
> When a stax command exists, prefer it over the raw git equivalent.
>
> **Verification**: When in doubt about a mapping, run `stax <cmd> -h` to confirm the stax equivalent exists and accepts the expected flags.

---

## 1. Branch Operations

| Instead of (git) | Use (stax) | Notes |
|---|---|---|
| `git checkout -b feature` | `stax create feature` | Creates branch AND tracks parent in stack metadata |
| `git checkout -b feature base` | `stax create feature --from base` | Stack on a specific base branch |
| `git branch -d feature` | `stax branch delete feature` | Removes branch + stax metadata |
| `git branch -m new-name` | `stax rename new-name` | Renames branch + updates all stax metadata |
| `git checkout feature` | `stax checkout feature` | Stax-aware checkout (aliases: `co`, `bco`) |
| `git checkout -` | `stax prev` | Returns to previous branch (alias: `p`) |
| `git checkout main` | `stax trunk` | Returns to trunk branch (alias: `t`) |
| `git branch` (list) | `stax status` | Shows stack tree, not flat list (aliases: `s`, `ls`) |
| `git branch` (detailed) | `stax ll` | Full details with PR URLs |
| `git log --oneline --graph --all` | `stax log` | Stack-aware commit graph with PR info (alias: `l`) |

## 2. Stack Navigation

These have no direct git equivalent -- they are stack-aware movements.

| Stax Command | What It Does | Notes |
|---|---|---|
| `stax up` | Move to child branch (up the stack) | Alias: `u` |
| `stax down` | Move to parent branch (down the stack) | Alias: `d` |
| `stax top` | Move to tip/leaf of current stack | Furthest descendant |
| `stax bottom` | Move to first branch above trunk | Closest ancestor to trunk |
| `stax prev` | Switch to previous branch | Like `git checkout -` (alias: `p`) |
| `stax checkout --parent` | Jump to parent of current branch | |
| `stax checkout --child 1` | Jump to Nth child branch | 1-based index |

## 3. Commit Operations

| Instead of (git) | Use (stax) | Notes |
|---|---|---|
| `git add . && git commit --amend --no-edit` | `stax modify` | Stages ALL changes + amends current commit (alias: `m`) |
| `git add . && git commit --amend -m "msg"` | `stax modify -m "msg"` | Stages ALL changes + amends with new message |

**Important**: `stax modify` always stages ALL changes (`git add .` equivalent). There is no way to selectively stage with stax modify. For selective staging, use git directly then `stax submit`.

## 4. Rebase Operations

| Instead of (git) | Use (stax) | Notes |
|---|---|---|
| `git rebase parent-branch` | `stax restack` | Rebases onto tracked parent |
| `git rebase parent && git rebase child-onto-this...` | `stax restack --all` | Restacks entire stack, not just current branch |
| `git rebase --continue` | `stax continue` | Continues after resolving conflicts (alias: `cont`) |
| `git rebase --abort` | `stax abort` | Aborts in-progress rebase |
| (manual conflict resolution) | `stax resolve` | AI-powered conflict resolution + auto-continue |
| `git rebase && git push && gh pr edit` | `stax cascade` | Restack from bottom + submit updates in one step |
| `stax restack --dry-run` | (no git equivalent) | Preview predicted conflicts without rebasing |

## 5. Push / PR Operations

| Instead of (git/gh) | Use (stax) | Notes |
|---|---|---|
| `git push -u origin branch` | `stax submit --no-pr` | Push without creating/updating PRs |
| `git push && gh pr create` | `stax submit` | Push + create/update PR (aliases: `ss`) |
| `git push && gh pr create --draft` | `stax submit --draft` | Push + create draft PR |
| `gh pr merge` | `stax merge` | Merges from bottom of stack up to current branch |
| `gh pr merge` (all) | `stax merge --all` | Merge entire stack regardless of current position |
| `gh pr merge --squash` | `stax merge --method squash` | Squash merge (default method) |
| `gh pr merge --rebase` | `stax merge --method rebase` | Rebase merge |
| `gh pr view --web` | `stax pr` | Opens PR in browser |
| `gh pr checks` | `stax ci` | Shows CI status for all branches in the stack |
| `gh pr view` (comments) | `stax comments` | Shows PR comments for current branch |
| (copy branch name) | `stax copy` | Copy branch name to clipboard |
| (copy PR URL) | `stax copy --pr` | Copy PR URL to clipboard |

### Submit Options

`stax submit` supports additional flags not easily replicated with git/gh:

| Flag | Effect |
|---|---|
| `--reviewers alice,bob` | Assign reviewers |
| `--labels bug,urgent` | Add labels |
| `--assignees alice` | Assign users |
| `--open` | Open PR in browser after submit |
| `--ai-body` | Generate PR body using AI |
| `--rerequest-review` | Re-request review from existing reviewers on update |
| `--template <name>` | Use a specific PR template |
| `--edit` | Always open editor for PR body |
| `--force` | Skip restack check |

### Merge Options

`stax merge` supports CI-aware waiting:

| Flag | Effect |
|---|---|
| `--when-ready` | Wait for CI + approval before merging each PR |
| `--timeout 30` | Max wait time per PR in minutes (default: 30) |
| `--interval 15` | Polling interval in seconds (default: 15) |
| `--dry-run` | Show merge plan without merging |
| `--no-delete` | Keep branches after merge |
| `--no-sync` | Skip post-merge sync |

## 6. Sync Operations

| Instead of (git) | Use (stax) | Notes |
|---|---|---|
| `git fetch && git pull` (on trunk) | `stax sync` | Pulls trunk + deletes merged branches (aliases: `rs`) |
| `git fetch && git rebase origin/main` | `stax sync --restack` | Sync + restack all branches |
| `git fetch --prune` | `stax sync --prune` | Also prune stale remote-tracking refs |
| `stax sync --no-delete` | (keep merged branches) | Don't delete merged branches during sync |
| `stax sync --delete-upstream-gone` | (clean up) | Also delete local branches whose upstream is gone |

## 7. Diff and Inspection

| Instead of (git) | Use (stax) | Notes |
|---|---|---|
| `git log --oneline --graph` | `stax log` | Stack-aware graph with PR info |
| `git log --oneline --graph` (current only) | `stax log --current` | Show only the current stack |
| `git diff branch..parent` | `stax diff` | Shows diff per branch vs parent + aggregate stack diff |
| `stax diff --all` | (all stacks) | Show diffs for all stacks |
| `git range-diff` | `stax range-diff` | Show range-diff for branches that need restack |

## 8. Stack Management

These commands manage stack structure and have no direct git equivalents.

| Stax Command | What It Does | Notes |
|---|---|---|
| `stax branch track` | Track an existing git branch (set its parent) | Adopt an untracked branch into a stack |
| `stax branch untrack` | Remove stax metadata from a branch | Branch stays, metadata removed (alias: `ut`) |
| `stax branch reparent` | Change the parent of a tracked branch | Move a branch to a different position in a stack |
| `stax detach` | Remove a branch from stack, reparent children to parent | Children re-point to the detached branch's parent |
| `stax branch fold` | Fold current branch into its parent | Merge commits into parent branch (alias: `f`) |
| `stax branch squash` | Squash all commits on branch into one | Like `git rebase -i` squash (alias: `sq`) |
| `stax split` | Split branch into multiple stacked branches | Interactive splitting |
| `stax reorder` | Reorder branches within a stack | Interactive reordering |
| `stax validate` | Validate stack metadata health | Check for broken metadata |
| `stax fix` | Auto-repair broken metadata | Fix issues found by validate |

## 9. Utility Commands

| Stax Command | What It Does | Notes |
|---|---|---|
| `stax undo` | Undo the last stax operation | Supports `--no-push` for local-only undo |
| `stax redo` | Redo the last undone operation | |
| `stax run <cmd>` | Run a command on each branch in the stack | `--all` for all tracked branches, `--fail-fast` to stop on error |
| `stax open` | Open the repository in browser | |
| `stax doctor` | Check stax configuration and repo health | |
| `stax config` | Show config file path and contents | |
| `stax standup` | Generate standup summary of recent activity | |
| `stax changelog` | Generate changelog between two refs | |
| `stax demo` | Interactive tutorial | No auth or repo needed |

## 10. Worktree and Agent Commands

| Stax Command | What It Does | Notes |
|---|---|---|
| `stax worktree` | Manage worktrees for parallel branch development | Alias: `wt` |
| `stax agent` | Manage parallel AI agent worktrees | Alias: `ag` |

## 11. NO Stax Equivalent -- Use Git Directly

These operations have no stax equivalent. Use git (or gh) directly.

| Git Operation | Why No Stax Equivalent |
|---|---|
| `git add <file>` (selective staging) | `stax modify` stages ALL changes; use git for selective staging |
| `git commit` (new commit, same branch) | `stax create` makes a new branch+commit; `stax modify` amends. For a new commit on the same branch, use git directly |
| `git stash` / `git stash pop` | No stax equivalent |
| `git blame <file>` | No stax equivalent |
| `git cherry-pick <sha>` | No stax equivalent |
| `git tag <name>` | No stax equivalent |
| `git log -- <file>` (file history) | No stax equivalent |
| `git diff -- <file>` (file-specific diff) | `stax diff` is branch-vs-parent, not file-specific |
| `git config` | Use `stax config` for stax settings, `git config` for git settings |
| `git clone <url>` | No stax equivalent |
| `git init` | No stax equivalent |
| `git remote add/remove` | No stax equivalent |
| `git rebase -i` (interactive) | Use `stax branch squash` for squashing; otherwise use git directly |
| `git reset` | No stax equivalent (but see `stax undo` for undoing stax operations) |
| `git revert <sha>` | No stax equivalent |
| `git bisect` | No stax equivalent |
| `git submodule` | No stax equivalent |

## 12. Composition Patterns

Common patterns where stax and git are used together.

### Selective staging then submit

```bash
# Stage specific files with git, commit, then use stax to push/PR
git add src/feature.rs tests/feature_test.rs
git commit -m "add feature X"
stax submit
```

### File-specific diff

```bash
# stax diff shows whole-branch diff; use git for file-specific
git diff -- path/to/file.rs
git diff HEAD~1 -- path/to/file.rs
```

### Checking file history

```bash
# No stax equivalent for per-file history
git log --oneline -- path/to/file.rs
git log -p -- path/to/file.rs
```

### Squashing commits within a branch

```bash
# stax has a built-in squash command
stax branch squash -m "single commit message"

# For more control (reorder, edit, drop), use git interactive rebase
git rebase -i HEAD~3
```

### Stashing work before switching branches

```bash
# No stax stash -- use git stash around stax navigation
git stash
stax checkout other-branch
# ... do work ...
stax checkout -   # or stax prev
git stash pop
```

### New commit on same branch (not amending)

```bash
# stax modify always amends. For a new commit on the same branch:
git add .
git commit -m "second commit on this branch"
stax submit
```

### Adopting an existing git branch into a stack

```bash
# If you created a branch with git, track it with stax
git checkout -b my-feature
# ... realize you want stax tracking ...
stax branch track   # sets parent to current branch's base
```

---

## Quick Reference: Aliases

| Full Command | Aliases |
|---|---|
| `stax status` | `s`, `ls` |
| `stax log` | `l` |
| `stax submit` | `ss` |
| `stax sync` | `rs` |
| `stax create` | `c` |
| `stax modify` | `m` |
| `stax checkout` | `co`, `bco` |
| `stax continue` | `cont` |
| `stax trunk` | `t` |
| `stax up` | `u` |
| `stax down` | `d` |
| `stax prev` | `p` |
| `stax branch` | `b` |
| `stax upstack` | `us` |
| `stax downstack` | `ds` |
| `stax agent` | `ag` |
| `stax worktree` | `wt` |
| `stax branch delete` | `b d` |
| `stax branch squash` | `b sq` |
| `stax branch fold` | `b f` |
| `stax branch untrack` | `b ut` |
| `stax branch create` | `b c` |
| `stax branch checkout` | `b co` |
| `stax branch rename` | `b r` |

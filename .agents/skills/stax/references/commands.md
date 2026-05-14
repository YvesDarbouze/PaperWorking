# Stax Command Reference

Source: `stax <cmd> -h`, stax v0.27.0

**Verification**: Confirm flags by running `stax <cmd> -h` — the CLI help output is the source of truth for all commands and flags documented here.

---

## 1. Stack Visualization

### `stax status` / `stax ll` / `stax log`

- `status` (aliases: `s`, `ls`) — Simple tree view
- `ll` — Tree with PR URLs and full details
- `log` (alias: `l`) — Tree with commits and PR info

All three share the same flags:

| Flag | Description |
|------|-------------|
| `--json` | Output JSON for scripting |
| `--stack <STACK>` | Show only the stack for this branch |
| `-c, --current` | Show only the current stack |
| `--compact` | Compact output for scripts |
| `--quiet` | Suppress extra output |

---

## 2. Branch Creation & Management

### `stax create` — Create a new branch stacked on current

Aliases: `c`

| Flag | Description |
|------|-------------|
| `[NAME]` | Name for the new branch |
| `-a, --all` | Stage all changes (like `git commit --all`) |
| `-m, --message <MSG>` | Commit message (also used as branch name if no name provided) |
| `--from <FROM>` | Base branch to create from (defaults to current) |
| `--prefix <PREFIX>` | Override branch prefix (e.g. `feature/`) |

### `stax branch track` — Track an existing branch (set its parent)

| Flag | Description |
|------|-------------|
| `-p, --parent <PARENT>` | Parent branch name |
| `--all-prs` | Track all open PRs authored by you |

### `stax branch untrack` — Stop tracking a branch (remove stax metadata only)

Aliases: `b ut`

Takes optional `[BRANCH]` (defaults to current).

### `stax branch reparent` — Change the parent of a tracked branch

| Flag | Description |
|------|-------------|
| `-b, --branch <BRANCH>` | Branch to reparent (defaults to current) |
| `-p, --parent <PARENT>` | New parent branch name |

### `stax branch rename` — Rename the current branch

Aliases: `b r`. Same as `stax rename` (see Restructuring).

### `stax branch delete` — Delete a branch and its metadata

Aliases: `b d`

| Flag | Description |
|------|-------------|
| `[BRANCH]` | Branch to delete |
| `-f, --force` | Force delete even if not merged |

### `stax branch squash` — Squash all commits on current branch into one

Aliases: `b sq`

| Flag | Description |
|------|-------------|
| `-m, --message <MSG>` | Commit message for the squashed commit |
| `--yes` | Skip confirmation prompt |

### `stax branch fold` — Fold current branch into its parent

Aliases: `b f`

| Flag | Description |
|------|-------------|
| `-k, --keep` | Keep the branch after folding (don't delete) |
| `--yes` | Skip confirmation prompt |

---

## 3. Navigation

### `stax checkout` — Checkout a branch in the stack

Aliases: `co`, `bco`

| Flag | Description |
|------|-------------|
| `[BRANCH]` | Branch name (interactive if not provided) |
| `--trunk` | Jump directly to trunk |
| `--parent` | Jump to parent of current branch |
| `--child <CHILD>` | Jump to child branch by index (1-based) |

### `stax up` — Move up the stack (to child branch)

Aliases: `u`. Takes optional `[COUNT]` (default: 1).

### `stax down` — Move down the stack (to parent branch)

Aliases: `d`. Takes optional `[COUNT]` (default: 1).

### `stax top` — Move to the top of the stack (tip/leaf branch)

### `stax bottom` — Move to the bottom of the stack (first branch above trunk)

### `stax prev` — Switch to the previous branch (like `git checkout -`)

Aliases: `p`

### `stax trunk` — Switch to the trunk branch

Aliases: `t`

---

## 4. Committing

### `stax modify` — Stage all changes and amend them to the current commit

Aliases: `m`

| Flag | Description |
|------|-------------|
| `-m, --message <MSG>` | New commit message (keeps existing if not provided) |
| `--quiet` | Suppress extra output |

---

## 5. Sync & Restack

### `stax sync` — Sync repo: pull trunk, delete merged branches

Aliases: `rs`

| Flag | Description |
|------|-------------|
| `-r, --restack` | Also restack branches after syncing |
| `--prune` | Prune stale remote-tracking refs during fetch |
| `--no-delete` | Don't delete merged branches |
| `--delete-upstream-gone` | Also delete local branches whose upstream is gone |
| `-f, --force` | Force sync without prompts |
| `--safe` | Avoid hard reset when updating trunk |
| `--continue` | Continue after resolving restack conflicts |
| `--quiet` | Suppress extra output |
| `-v, --verbose` | Show detailed output including git errors |
| `--auto-stash-pop` | Auto-stash and auto-pop dirty worktrees during restack |

### `stax restack` — Restack (rebase) current branch onto its parent

| Flag | Description |
|------|-------------|
| `-a, --all` | Restack all branches in the stack |
| `--continue` | Continue after resolving conflicts |
| `--dry-run` | Preview predicted conflicts without rebasing |
| `-y, --yes` | Skip conflict confirmation prompt |
| `--quiet` | Suppress extra output |
| `--auto-stash-pop` | Auto-stash and auto-pop dirty worktrees during restack |
| `--submit-after <VAL>` | After restack, submit updates: `ask`, `yes`, `no` [default: ask] |

### `stax cascade` — Restack from the bottom and submit updates

| Flag | Description |
|------|-------------|
| `--no-pr` | Push branches but skip PR creation/updates |
| `--no-submit` | Skip all remote interaction (restack locally only) |
| `--auto-stash-pop` | Auto-stash and auto-pop dirty worktrees during restack |

---

## 6. Submission

Submit flags are shared across `submit`, `branch submit`, `upstack submit`, and `downstack submit`.

- `stax submit` (alias: `ss`) — Submit entire stack
- `stax branch submit` — Submit the current branch only
- `stax upstack submit` — Submit current branch and descendants
- `stax downstack submit` — Submit ancestors and current branch

**Shared flags:**

| Flag | Description |
|------|-------------|
| `-d, --draft` | Create PRs as drafts |
| `--no-pr` | Only push, don't create/update PRs |
| `--no-fetch` | Skip git fetch, use cached remote-tracking refs |
| `-f, --force` | Skip restack check and submit anyway |
| `--yes` | Auto-approve prompts |
| `--no-prompt` | Disable interactive prompts (use defaults) |
| `--reviewers <LIST>` | Assign reviewers (comma-separated or repeat) |
| `--labels <LIST>` | Add labels (comma-separated or repeat) |
| `--assignees <LIST>` | Assign users (comma-separated or repeat) |
| `--quiet` | Suppress extra output |
| `--open` | Open PR in browser after submit |
| `-v, --verbose` | Show detailed output |
| `--template <NAME>` | Specify template by name (skip picker) |
| `--no-template` | Skip template selection |
| `--edit` | Always open editor for PR body |
| `--ai-body` | Generate PR body using AI (claude, codex, or gemini) |
| `--rerequest-review` | Re-request review from existing reviewers when updating |

---

## 7. Merging

### `stax merge` — Merge PRs from bottom of stack up to current branch

| Flag | Description |
|------|-------------|
| `--all` | Merge entire stack (ignore current position) |
| `--dry-run` | Show merge plan without merging |
| `--method <METHOD>` | Merge method: `squash`, `merge`, `rebase` [default: squash] |
| `--no-delete` | Keep branches after merge (don't delete) |
| `--no-wait` | Fail if CI pending (don't poll/wait) |
| `--timeout <MIN>` | Max wait time for CI per PR in minutes [default: 30] |
| `--when-ready` | Wait for each PR to be ready (CI + approval) before merging |
| `--interval <SEC>` | Polling interval in seconds for `--when-ready` [default: 15] |
| `--no-sync` | Skip post-merge sync |
| `-y, --yes` | Skip confirmation prompt |
| `-q, --quiet` | Minimal output |

---

## 8. PR & Repo

### `stax pr` — Open the PR for the current branch in browser

### `stax open` — Open the repository in browser

### `stax comments` — Show comments on the current branch's PR

| Flag | Description |
|------|-------------|
| `--plain` | Output raw markdown without rendering |

### `stax ci` — Show CI status for all branches in the stack

| Flag | Description |
|------|-------------|
| `--all` | Show all tracked branches (not just current stack) |
| `-s, --stack` | Show all branches in the current stack |
| `--json` | Output JSON for scripting |
| `--refresh` | Force refresh (bypass cache) |
| `-w, --watch` | Watch CI until completion (polls periodically) |
| `--interval <SEC>` | Polling interval in seconds [default: 15] |
| `-v, --verbose` | Show compact summary cards instead of per-check table |

### `stax copy` — Copy branch name or PR URL to clipboard

| Flag | Description |
|------|-------------|
| `--pr` | Copy PR URL instead of branch name |

---

## 9. Conflict Resolution

### `stax continue` — Continue after resolving conflicts

Aliases: `cont`. No flags.

### `stax resolve` — Resolve rebase conflicts using AI and continue automatically

| Flag | Description |
|------|-------------|
| `--agent <AGENT>` | AI agent override (claude, codex, gemini, opencode) |
| `--model <MODEL>` | Model override for the selected agent |
| `--max-rounds <N>` | Maximum AI resolve rounds before stopping [default: 5] |

### `stax abort` — Abort an in-progress rebase/conflict resolution

No flags.

---

## 10. Stack Operations

### `stax upstack restack` — Restack all branches above current

| Flag | Description |
|------|-------------|
| `--auto-stash-pop` | Auto-stash and auto-pop dirty worktrees during restack |

### `stax downstack get` — Show branches below current

No flags.

For `upstack submit` and `downstack submit`, see Submission above.

---

## 11. Restructuring

### `stax detach` — Remove a branch from its stack (reparent children to parent)

| Flag | Description |
|------|-------------|
| `[BRANCH]` | Branch to detach (defaults to current) |
| `--yes` | Skip confirmation prompt |

### `stax reorder` — Interactively reorder branches within a stack

Flag: `--yes` to skip confirmation.

### `stax split` — Split current branch into multiple stacked branches (interactive)

No flags.

### `stax diff` — Show diffs for each branch vs parent plus aggregate stack diff

| Flag | Description |
|------|-------------|
| `--stack <STACK>` | Show only the stack for this branch |
| `--all` | Show all stacks |

### `stax range-diff` — Show range-diff for branches that need restack

| Flag | Description |
|------|-------------|
| `--stack <STACK>` | Show only the stack for this branch |
| `--all` | Show all stacks |

### `stax rename` — Rename the current branch

| Flag | Description |
|------|-------------|
| `[NAME]` | New branch name (interactive if not provided) |
| `-e, --edit` | Edit the commit message |
| `-p, --push` | Push new branch and delete old remote (non-interactive) |

---

## 12. Batch Operations

### `stax run` — Run a command on each branch in the stack

| Flag | Description |
|------|-------------|
| `<CMD>...` | Command to run (required) |
| `--all` | Run on all tracked branches (not just current stack) |
| `--stack[=<STACK>]` | Run only one stack (current by default, or specify branch) |
| `--fail-fast` | Stop after first failure |

---

## 13. AI Features

### `stax resolve` — Resolve rebase conflicts using AI

See Conflict Resolution above.

### `stax generate` — Generate content using AI

| Flag | Description |
|------|-------------|
| `--pr-body` | Generate PR body from diff and update the PR |
| `--edit` | Open editor to review before updating |
| `--agent <AGENT>` | AI agent to use (claude, codex, gemini, opencode) |
| `--model <MODEL>` | Model to use with the AI agent |

### `stax standup` — Generate standup summary of recent activity

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON (or summary JSON with `--summary`) |
| `--all` | Show all stacks (not just current) |
| `--hours <HOURS>` | Time window in hours [default: 24] |
| `--summary` | Summarize standup using AI agent |
| `--jit` | Include Jira sprint context from `jit` |
| `--agent <AGENT>` | AI agent to use (claude, codex, gemini, opencode) |
| `--plain-text` | Output plain text with no colors or spinner |

### `stax changelog` — Generate changelog between two refs

| Flag | Description |
|------|-------------|
| `<FROM>` | Starting ref -- tag, branch, or commit (required) |
| `[TO]` | Ending ref [default: HEAD] |
| `--path <PATH>` | Filter commits to those touching this path |
| `--json` | Output JSON for scripting |

---

## 14. Worktrees

### `stax agent create` — Create a new agent worktree + stacked branch

| Flag | Description |
|------|-------------|
| `<TITLE>` | Human title, slugified into branch name and folder (required) |
| `--base <BASE>` | Base branch to create from (defaults to current) |
| `--stack-on <BRANCH>` | Stack on this branch (alias for `--base`) |
| `--open` | Open in default editor after creation |
| `--open-cursor` | Open in Cursor after creation |
| `--open-codex` | Open in Codex after creation |
| `--no-hook` | Skip post-create hook even if configured |

### `stax agent open` — Open (reattach to) an agent worktree

Aliases: `ag attach`. Takes optional `[NAME]` (interactive picker if omitted).

### `stax agent list` — List all registered agent worktrees

Aliases: `ag ls`. No flags.

### `stax agent register` — Register current directory as a managed agent worktree

No flags.

### `stax agent remove` — Remove an agent worktree (and optionally its branch)

| Flag | Description |
|------|-------------|
| `[NAME]` | Name or slug (interactive picker if omitted) |
| `-f, --force` | Force removal even if uncommitted changes |
| `--delete-branch` | Also delete the branch and its stax metadata |

### `stax agent prune` — Remove stale registry entries and run `git worktree prune`

No flags.

### `stax agent sync` — Restack all registered agent worktrees

No flags.

### `stax worktree create` — Create a new worktree for a branch

Aliases: `wt c`

| Flag | Description |
|------|-------------|
| `[BRANCH]` | Branch name (interactive picker if omitted) |
| `--name <NAME>` | Override the short name for the worktree directory |

### `stax worktree list` — List all worktrees

Aliases: `wt ls`. No flags.

### `stax worktree go` — Navigate to a worktree (requires shell integration)

Takes `<NAME>` (required).

### `stax worktree path` — Print the absolute path of a worktree

Takes `<NAME>` (required).

### `stax worktree remove` — Remove a worktree

Aliases: `wt rm`. Takes `<NAME>` (required). Flag: `-f, --force` to force removal.

---

## 15. Recovery

### `stax undo` / `stax redo` — Undo/redo stax operations

Both share the same flags:

| Flag | Description |
|------|-------------|
| `[OP_ID]` | Operation ID (defaults to last) |
| `--yes` | Auto-approve prompts |
| `--no-push` | Don't restore remote refs (local only) |
| `--quiet` | Suppress extra output |

### `stax validate` — Validate stack metadata health

No flags.

### `stax fix` — Auto-repair broken metadata

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be fixed without changing anything |
| `--yes` | Auto-approve prompts |

### `stax doctor` — Check stax configuration and repo health

No flags.

---

## 16. Auth & Config

### `stax auth` — Authenticate with GitHub

| Flag | Description |
|------|-------------|
| `-t, --token <TOKEN>` | GitHub personal access token |
| `--from-gh` | Import token from GitHub CLI (`gh auth token`) |

Subcommand: `stax auth status` — Show which auth source is currently active.

### `stax config` — Show config file path and contents

No flags.

### `stax shell-setup` — Output shell integration snippet

Add to shell config: `eval "$(stax shell-setup)"`

| Flag | Description |
|------|-------------|
| `--install` | Auto-append to your shell config file (~/.zshrc, ~/.bashrc, etc.) |

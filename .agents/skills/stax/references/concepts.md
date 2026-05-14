# Concepts — stax v0.27.0

Mental model reference for stax: fast stacked Git branches and PRs.

**Verification**: Verify command behavior by running `stax <cmd> -h` — concepts here are derived from CLI help output.

## What is Stax?

A Rust CLI that manages dependent branches (stacks) with automatic rebasing, PR management, and conflict resolution. It tracks parent-child relationships between branches, enabling navigation, restacking, and one-PR-per-branch submission workflows.

## Core Concepts

### Stack

A chain of branches where each depends on the one below it. Branches form a linked list from trunk upward. A stack can also fork — one parent with multiple children creates separate sub-stacks.

### Trunk

The base branch (usually `main` or `master`). The root all stacks grow from. Every stack starts from trunk; the bottom branch's parent is trunk.

### Parent and Child

Each stacked branch has exactly one parent (the branch below) and zero or more children (branches above). The bottom branch's parent is trunk. Navigate with `up`, `down`, `top`, `bottom`.

### Metadata

stax tracks parent-child relationships in local metadata. This is what makes navigation, restacking, validation, and submission work. Commands like `validate` and `fix` check and repair this metadata. `branch track` / `branch untrack` add or remove branches from tracking.

### Restacking

Rebasing a branch onto its updated parent, keeping the stack consistent after changes. Three scopes:

- `restack` — rebase current branch onto its parent
- `restack --all` — rebase all branches in the stack
- `cascade` — restack from bottom, then submit updates

### Upstack and Downstack

- **Upstack** (`us`) — descendants of current branch. `upstack restack` restacks above; `upstack submit` submits current + descendants.
- **Downstack** (`ds`) — ancestors of current branch. `downstack submit` submits ancestors + current.

## Submission Model

- stax creates one PR per branch
- PRs target their parent branch, not trunk (except the bottom branch, which targets trunk)
- Reviewers see only the diff for that branch, not the cumulative stack diff
- `submit` pushes and creates/updates PRs for the current branch and all ancestors below it
- `upstack submit` covers current + descendants; `downstack submit` covers ancestors + current
- PRs can be created as drafts (`--draft`), with reviewers, labels, assignees, and AI-generated bodies

## Merge Model

- `merge` merges PRs from the bottom of the stack upward to the current branch
- After a PR merges, the next PR's target auto-updates (its parent was merged into trunk)
- Merge methods: `squash` (default), `merge`, `rebase`
- `--when-ready` waits for CI + approval before merging each PR
- Post-merge cleanup: `sync` pulls trunk, deletes merged branches, optionally restacks remaining branches (`--restack`)

## Worktrees

### Manual worktrees (`worktree`)

Standard git worktree management for parallel branch work. Create, list, navigate, remove.

### Agent worktrees (`agent`)

Managed worktrees for AI agent parallel development. Each agent gets its own repo copy on a stacked branch. Supports create, open/attach, list, register, remove, prune, and sync (restack all agent worktrees).

## Command Risk Classification

| Risk | Description | Commands |
|------|-------------|----------|
| Safe (read-only) | No state changes | `status`, `ll`, `log`, `diff`, `range-diff`, `ci`, `comments`, `copy`, `validate`, `doctor`, `config`, `pr`, `open`, `standup` |
| Local-only | Changes local state | `create`, `modify`, `checkout`, `up`, `down`, `top`, `bottom`, `prev`, `trunk`, `restack`, `branch track`, `branch untrack`, `branch reparent`, `branch rename`, `branch delete`, `branch squash`, `branch fold`, `detach`, `reorder`, `split`, `continue`, `abort`, `resolve`, `undo`, `redo`, `fix`, `run` |
| Remote | Pushes to remote or creates PRs | `submit`, `cascade`, `merge`, `sync`, `rename --push`, `upstack submit`, `downstack submit`, `branch submit` |
| Destructive | Hard to reverse | `merge` (merges PRs), `branch delete`, `sync` (deletes merged branches) |
| Interactive-only | Requires user input; agents cannot use | `split`, `reorder` |

## Non-Interactive Flags

Commands that support automation-friendly flags:

| Command | `--yes` | `--quiet` | `--json` | Other |
|---------|---------|-----------|----------|-------|
| `submit` | `--yes` | `--quiet` | — | `--no-prompt` |
| `merge` | `-y` / `--yes` | `-q` / `--quiet` | — | `--dry-run` |
| `restack` | `-y` / `--yes` | `--quiet` | — | `--dry-run` |
| `sync` | `-f` / `--force` | `--quiet` | — | `--no-delete` |
| `cascade` | — | — | — | `--no-submit`, `--no-pr` |
| `status` | — | `--quiet` | `--json` | `--compact` |
| `ll` | — | `--quiet` | `--json` | `--compact` |
| `log` | — | `--quiet` | `--json` | `--compact` |
| `ci` | — | — | `--json` | `--refresh` |
| `detach` | `--yes` | — | — | — |
| `fix` | `--yes` | — | — | `--dry-run` |
| `undo` | `--yes` | `--quiet` | — | — |
| `redo` | `--yes` | `--quiet` | — | — |
| `branch squash` | `--yes` | — | — | — |
| `branch fold` | `--yes` | — | — | — |
| `reorder` | `--yes` | — | — | — |
| `standup` | — | — | `--json` | `--plain-text` |

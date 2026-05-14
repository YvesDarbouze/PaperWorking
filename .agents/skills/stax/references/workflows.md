# Workflows — stax v0.27.0

<!--
execution: inline
parallelism: sequential
needs-user-interaction: false
-->

Composable step-by-step workflows for stacked branch development. Each workflow is self-contained but designed to compose with others.

Source: `stax <cmd> -h`, stax v0.27.0

**Verification**: Before executing workflow steps, confirm command syntax by running `stax <cmd> -h` — the CLI help is the source of truth.

## 1. Start a New Feature Stack

**When**: Beginning new work from trunk.
**Agent-safe**: Yes

### Steps

1. `stax sync` — pull trunk, delete merged branches
2. `stax create feature-name -m "Add feature description"` — create stacked branch from trunk
3. Make code changes
4. `stax modify` — stage all changes and amend into the branch commit
5. `stax submit --yes --no-prompt` — push and create PR

### Notes

- Always sync before creating to avoid stale trunk
- Use `--from <branch>` to stack on a non-current branch
- Use `-a` flag on create to stage existing changes into the initial commit

## 2. Add a Branch to an Existing Stack

**When**: Adding a dependent change on top of an existing stacked branch.
**Agent-safe**: Yes

### Steps

1. `stax checkout parent-branch` — navigate to the branch to stack on
2. `stax create child-name -m "Add dependent change"` — create new branch on top
3. Make code changes
4. `stax modify` — stage all and amend
5. `stax submit --yes --no-prompt` — push and create PR (targets parent, not trunk)

### Notes

- The PR will target the parent branch, not trunk
- Use `stax status --current` to verify stack structure after creation

## 3. Daily Sync and Restack

**When**: Starting a work session, keeping stack up to date with trunk.
**Agent-safe**: Yes

### Steps

1. `stax sync --restack` — pull trunk, delete merged, restack all branches

**Or step by step:**

1. `stax sync` — pull trunk, delete merged branches
2. `stax restack --all --yes` — rebase all branches in current stack onto updated parents

### Notes

- If conflicts occur during restack, see Workflow 10 (Recovery from Conflicts)
- `--prune` flag on sync removes stale remote-tracking refs
- Use `stax restack --dry-run` to preview predicted conflicts before restacking

## 4. Submit Stack for Review

**When**: Stack is ready for code review.
**Agent-safe**: Yes

### Steps

1. `stax status --current` — verify stack structure
2. `stax diff` — review changes per branch
3. `stax submit --yes --no-prompt` — push all branches and create/update PRs

### Variations

- **Draft PRs**: `stax submit --yes --no-prompt --draft`
- **With reviewers**: `stax submit --yes --no-prompt --reviewers alice,bob`
- **With labels**: `stax submit --yes --no-prompt --labels enhancement,needs-review`
- **AI-generated PR body**: `stax submit --yes --no-prompt --ai-body`
- **Single branch only**: `stax branch submit --yes --no-prompt`
- **Current + descendants**: `stax upstack submit --yes --no-prompt`
- **Ancestors + current**: `stax downstack submit --yes --no-prompt`

## 5. Respond to PR Feedback

**When**: Reviewer requested changes on a specific branch in the stack.
**Agent-safe**: Yes

### Steps

1. `stax checkout target-branch` — switch to the branch that needs changes
2. Make the requested code changes
3. `stax modify -m "Address review feedback"` — stage all and amend (optionally update message)
4. `stax cascade` — restack from bottom and submit all updates

### Notes

- `cascade` handles restacking descendants AND submitting — no need to run restack + submit separately
- If changes affect multiple branches, repeat steps 1-3 for each, then run `cascade` once
- Use `--rerequest-review` on submit to re-request review from existing reviewers

## 6. Merge a Stack

**When**: Stack is approved and CI is passing.
**Agent-safe**: Yes

### Steps

1. `stax ci --stack` — verify CI passes for all branches
2. `stax merge --yes --method squash` — merge PRs from bottom up to current branch

### Variations

- **Wait for CI + approval**: `stax merge --yes --when-ready --timeout 30`
- **Merge entire stack**: `stax merge --yes --all --method squash`
- **Preview merge plan**: `stax merge --dry-run`
- **Keep branches after merge**: `stax merge --yes --no-delete`
- **Skip post-merge sync**: `stax merge --yes --no-sync`

### Notes

- Default merge method is `squash`; alternatives are `merge` and `rebase`
- `--when-ready` polls every 15s (configurable with `--interval`) until CI + approval pass
- After merge, `stax sync` runs automatically (unless `--no-sync`)

## 7. Split a Large Branch (Interactive)

**When**: A single branch has too many changes and needs to be broken into multiple stacked branches.
**Agent-safe**: NO — requires interactive editor

### Steps

1. Advise the user to run `stax split` manually
2. The command opens an interactive editor for splitting commits into separate branches
3. After splitting, run `stax submit --yes --no-prompt` to submit the new stack

### Notes

- Agents CANNOT run `stax split` — it requires interactive input
- Alternative for agents: create new branches manually and cherry-pick or move changes

## 8. Parallel Agent Development (stax agent)

**When**: Running multiple AI agents in parallel, each on their own branch.
**Agent-safe**: Yes

### Steps

1. `stax agent create --name agent-1 --from main` — create agent worktree with stacked branch
2. Work within the agent worktree directory
3. `stax modify` — stage and amend changes (from within worktree)
4. `stax submit --yes --no-prompt` — submit from worktree
5. When done: `stax agent remove agent-1` — clean up

### Management

- `stax agent list` — list all agent worktrees
- `stax agent sync` — restack all agent worktrees
- `stax agent prune` — remove stale entries
- `stax agent open agent-1` — reattach to an agent worktree

## 9. Reorganize Stack Structure

**When**: Need to change the order or parent-child relationships of branches.
**Agent-safe**: Partially (reparent/detach yes, reorder no)

### Reparent a branch

1. `stax branch reparent --parent new-parent target-branch` — change a branch's parent
2. `stax restack --yes` — rebase onto new parent
3. `stax submit --yes --no-prompt` — update PRs

### Detach a branch from stack

1. `stax detach target-branch --yes` — remove branch, reparent its children to its parent

### Fold a branch into its parent

1. `stax checkout target-branch` — go to the branch to fold
2. `stax branch fold` — merge commits into parent branch

### Squash commits

1. `stax checkout target-branch`
2. `stax branch squash` — squash all commits into one

### Reorder (Interactive)

1. Advise the user to run `stax reorder --yes` manually — interactive UI

## 10. Recovery from Conflicts

**When**: A restack or sync hits merge conflicts.
**Agent-safe**: Yes (using stax resolve)

### AI-powered resolution

1. `stax resolve` — uses AI to resolve conflicts and continue automatically
2. If AI resolution fails: `stax resolve --max-rounds 10` — more attempts
3. If still failing: `stax abort` — abort the rebase

### Manual resolution

1. Resolve conflicts in the affected files manually
2. `git add <resolved-files>` — stage resolved files
3. `stax continue` — continue the rebase

### Full recovery

1. `stax abort` — abort the failed operation
2. `stax undo --yes` — undo the last stax operation entirely
3. Start the operation again with a different approach

### Notes

- `stax resolve` supports `--agent` flag to choose AI provider (claude, codex, gemini, opencode)
- `stax restack --dry-run` can preview conflicts before they happen
- Always prefer `stax resolve` over manual conflict resolution when possible

## 11. AI-Powered Workflows

**When**: Generating content or summaries using AI.
**Agent-safe**: Yes

### Generate PR body

1. `stax generate --pr-body` — generate and update PR body from diff
2. With specific agent: `stax generate --pr-body --agent claude`

### AI-generated PR body during submit

1. `stax submit --yes --no-prompt --ai-body` — submit with AI-generated PR description

### Standup summary

1. `stax standup` — show recent activity (last 24h)
2. `stax standup --summary` — AI-summarized standup
3. `stax standup --all --hours 48 --json` — all stacks, 48h window, JSON output

### Changelog

1. `stax changelog v1.0.0` — changelog from tag to HEAD
2. `stax changelog v1.0.0 v2.0.0 --json` — between two refs, JSON output
3. `stax changelog v1.0.0 --path src/` — filter to specific path

## 12. Health Check and Repair

**When**: Something seems wrong with stack metadata or repo state.
**Agent-safe**: Yes

### Steps

1. `stax doctor` — check stax configuration and repo health
2. `stax validate` — validate stack metadata
3. `stax fix --yes` — auto-repair broken metadata
4. `stax fix --dry-run` — preview what would be fixed

### Notes

- Run `doctor` first to identify issues, then `validate` for metadata-specific checks
- `fix --yes` is safe to run — it repairs metadata, doesn't change code
- If recovery is needed: `stax undo --yes` reverts the last operation

## 13. Batch Operations

**When**: Running the same command across multiple branches in a stack.
**Agent-safe**: Yes

### Steps

1. `stax run --stack --fail-fast "cargo test"` — run tests on each branch in current stack
2. `stax run --all "npm run lint"` — run lint on all tracked branches
3. `stax run --stack=feature-branch "make build"` — run on a specific branch's stack

### Notes

- Commands are executed on each branch sequentially
- `--fail-fast` stops after the first failure
- Useful for verifying the entire stack builds/passes tests before submitting

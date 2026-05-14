# Shell Script Standards

Rules for scripts created inside skills. Extends the [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html) with safety requirements specific to agent-executed scripts.

Claude already knows standard bash — these rules cover what it doesn't default to.

## Mandatory Header

```bash
#!/usr/bin/env bash
set -euo pipefail
```

Non-negotiable. Every script. No exceptions.

## Safety Rules (The Expert Part)

These are the rules Claude won't follow unless told. Standard shell guides don't cover agent-execution context.

### 1. Announce Before Acting

Every significant action must be announced before it happens. Agents and users need to see what's about to run.

```bash
# Required — announce then act
echo "Cloning ${REPO_URL} → ${SPEC_DIR}"
git clone "${REPO_URL}" "${SPEC_DIR}"

# Forbidden — silent action
git clone "${REPO_URL}" "${SPEC_DIR}"
```

Why: When an agent runs a script, the user sees output but not the script source. Announcements make the script's behavior observable.

### 2. Non-Destructive by Default

Scripts must never:

- `rm -rf` without explicit confirmation
- `git push --force` or `git reset --hard`
- Overwrite files without existence check
- Delete directories without user consent

If destruction is necessary:

1. Warn what will happen and why
2. Either prompt for confirmation or tell the user to run the command manually

Why: Agents execute scripts without human review of each command. A destructive default means one wrong invocation causes irreversible damage.

### 3. Idempotent Operations

Scripts must be safe to run multiple times:

```bash
# Idempotent — safe on re-run
if [[ ! -d "${SPEC_DIR}" ]]; then
  git clone "${REPO_URL}" "${SPEC_DIR}"
else
  git -C "${SPEC_DIR}" pull --ff-only
fi

# Not idempotent — fails on second run
git clone "${REPO_URL}" "${SPEC_DIR}"
```

Why: Agents retry on failure. A non-idempotent script turns a transient error into a permanent one.

### 4. No Code Downloads

Never `curl | bash` or `wget | sh`. Clone repos via `git clone` when source code is needed.

Why: Piped downloads bypass review. The agent can't verify what it's executing.

### 5. Error Context

Errors must go to stderr with enough context to diagnose:

```bash
if ! git clone "${url}" "${dir}"; then
  echo "ERROR: Failed to clone ${url} into ${dir}" >&2
  return 1
fi
```

Not just "failed" — include what failed and where.

## Naming Quick Reference

| Element | Convention | Example |
|---------|-----------|---------|
| Constants | `readonly UPPER_SNAKE` | `readonly SPEC_DIR="${HOME}/.agent-skills-spec"` |
| Functions | `snake_case()` | `validate_input()` |
| Local vars | `local snake_case` | `local file_path` |

For the full style guide: <https://google.github.io/styleguide/shellguide.html>

## Agent Instructions

Before writing scripts for a skill, fetch and read the Google Shell Style Guide at <https://google.github.io/styleguide/shellguide.html>. The rules above are a condensed subset — the full guide covers additional conventions for functions, comments, and control flow. Do not rely on patterns from training data for shell style — the guide is the source of truth.

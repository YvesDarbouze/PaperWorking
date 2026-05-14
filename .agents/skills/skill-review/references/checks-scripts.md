# Script Standards Checks

Validate scripts in the `scripts/` directory against shell standards and agentic script design principles.

**Sources:**

- Agent Skills Script Guide: <https://agentskills.io/skill-creation/using-scripts.md>
- Google Shell Style Guide: <https://google.github.io/styleguide/shellguide.html>

Skip this entire check group if the skill has no `scripts/` directory. Mark as N/A in the report.

## Check 1: Shebang Line

**What to check:** Every Bash script starts with `#!/usr/bin/env bash`.

**How to check:**

1. Read the first line of each `.sh` file in `scripts/`
2. Verify it is exactly `#!/usr/bin/env bash`

**Pass criteria:** First line is `#!/usr/bin/env bash`. Not `#!/bin/bash`, not `#!/bin/sh`, not missing.

**Fail action:** Report the file and its actual first line.

**Source:** <https://google.github.io/styleguide/shellguide.html#s1.1-which-shell-to-use> (use `env` for portability)

## Check 2: Strict Mode

**What to check:** Every Bash script enables strict error handling with `set -euo pipefail`.

**How to check:**

1. Read the first 5 lines of each `.sh` file
2. Look for `set -euo pipefail` (or equivalent combinations that include all three flags)

**Pass criteria:** `set -euo pipefail` appears near the top of the script, before any functional code.

**Fail action:** Report the file and note which flags are missing.

**Source:** <https://google.github.io/styleguide/shellguide.html> and convention — strict mode catches errors early.

## Check 3: Announce Before Acting

**What to check:** Scripts print a descriptive message (echo/printf) before significant operations.

**How to check:**

1. Read each script
2. Identify significant operations: file creation, deletion, network calls, git operations, package installs
3. For each significant operation, check whether a preceding echo/printf announces what is about to happen

**Pass criteria:** Every significant operation is preceded by an announcement. Trivial operations (variable assignment, local computation) do not require announcements.

**Fail action:** Identify silent significant operations and suggest adding echo statements.

**Source:** Convention — agents and users reading stdout need to understand what a script is doing as it runs.

## Check 4: Non-Destructive by Default

**What to check:** Scripts do not perform destructive operations (delete files, drop tables, overwrite data) without explicit opt-in.

**How to check:**

1. Read each script
2. Identify destructive commands: `rm`, `rm -rf`, `DROP`, `TRUNCATE`, `> file` (overwrite), `git reset --hard`, `git clean -f`
3. For each destructive command, check whether it is guarded by a flag (e.g., `--force`, `--confirm`, `--dry-run` default)

**Pass criteria:** Destructive operations either do not exist or are gated behind explicit confirmation flags. Scripts prefer "create if not exists" over "create and fail on duplicate."

**Fail action:** List each unguarded destructive command with file and line.

**Source:** <https://agentskills.io/skill-creation/using-scripts.md> ("Safe defaults" and "Idempotency")

## Check 5: Errors to stderr

**What to check:** Error messages go to stderr, not stdout.

**How to check:**

1. Read each script
2. Find error-handling blocks (if/then failures, catch blocks, error functions)
3. Verify error messages use `>&2` redirection or an error function that writes to stderr

**Pass criteria:** All error messages direct to stderr. Data output goes to stdout.

**Fail action:** Identify error messages written to stdout.

**Source:** <https://agentskills.io/skill-creation/using-scripts.md> ("Separate data from diagnostics: send structured data to stdout and progress messages, warnings, and other diagnostics to stderr")

## Check 6: Exit Non-Zero on Failure

**What to check:** Scripts exit with a non-zero code when they fail.

**How to check:**

1. Read each script
2. Identify error paths (explicit `exit` calls, trap handlers)
3. Verify each error path exits with a non-zero code
4. If `set -e` is present, implicit failures are covered — focus on explicit error handling

**Pass criteria:** Every explicit error path uses `exit 1` or another non-zero exit code. No `exit 0` in error paths.

**Fail action:** Identify error paths that exit 0 or have no exit statement.

**Source:** <https://agentskills.io/skill-creation/using-scripts.md> ("Meaningful exit codes")

## Check 7: No Interactive Prompts

**What to check:** Scripts never block on user input.

**How to check:**

1. Read each script
2. Search for interactive patterns: `read` without a timeout, `select`, `dialog`, `whiptail`, prompts that wait for stdin, password prompts
3. `read -t` (with timeout) is acceptable. `read -r variable <<< "$input"` (here-string, non-interactive) is acceptable.

**Pass criteria:** No interactive prompts. All input comes via command-line flags, environment variables, or piped stdin.

**Fail action:** Identify each interactive prompt with file and line.

**Source:** <https://agentskills.io/skill-creation/using-scripts.md> ("This is a hard requirement of the agent execution environment. Agents operate in non-interactive shells")

## Check 8: Idempotent

**What to check:** Scripts are safe to run multiple times without adverse effects.

**How to check:**

1. Read each script
2. Identify state-creating operations: file creation, directory creation, database records, git operations
3. For each, verify idempotent patterns: `mkdir -p` (not `mkdir`), `CREATE IF NOT EXISTS`, check-before-create guards

**Pass criteria:** Running the script twice produces the same end state as running it once. No duplicate entries, no "already exists" errors.

**Fail action:** Identify non-idempotent operations and suggest idempotent alternatives.

**Source:** <https://agentskills.io/skill-creation/using-scripts.md> ("Agents may retry commands. 'Create if not exists' is safer than 'create and fail on duplicate'")

## Check 9: No Pipe-to-Shell

**What to check:** Scripts do not download and execute code in a single pipeline.

**How to check:**

1. Read each script
2. Search for patterns: `curl ... | bash`, `curl ... | sh`, `wget ... | bash`, `wget ... | sh`, or equivalent pipelines that execute downloaded content

**Pass criteria:** No pipe-to-shell patterns. Downloads and execution are separate steps with verification between them.

**Fail action:** Identify each pipe-to-shell pattern with file and line.

**Source:** Convention — pipe-to-shell bypasses review and verification, creating a security risk.

## Check 10: Variable Quoting and Constants

**What to check:** Variables are quoted and constants use `readonly`.

**How to check:**

1. Read each script
2. Check variable expansions: `$var` and `${var}` should appear inside double quotes (`"$var"`) unless inside `[[ ]]` or intentionally word-splitting
3. Check for constant declarations: values that never change should use `readonly` or `declare -r`

**Pass criteria:** Variables are quoted in command arguments and assignments where word splitting could cause issues. Constants use `readonly`.

**Fail action:** Identify unquoted variables (outside safe contexts) and mutable constants.

**Source:** <https://google.github.io/styleguide/shellguide.html#s5.1-quoting> ("Always quote strings containing variables, command substitutions, spaces or shell meta characters")

## Non-Bash Scripts

For Python, JavaScript, or other non-Bash scripts, apply these reduced checks:

1. **No interactive prompts** — same as Check 7
2. **Errors to stderr** — same as Check 5
3. **Exit non-zero on failure** — same as Check 6
4. **No pipe-to-shell** — same as Check 9
5. **Idempotent** — same as Check 8
6. **Announce before acting** — same as Check 3

Skip Bash-specific checks (shebang, strict mode, variable quoting, readonly) for non-Bash scripts.

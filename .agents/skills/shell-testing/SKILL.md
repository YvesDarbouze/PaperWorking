---
name: shell-testing
description: >
  Write idiomatic BATS tests for bash and zsh shell scripts. Use when writing new tests,
  adding tests to existing shell projects, reviewing test quality, running tests after code
  changes, or when the user asks to "write tests", "add tests", "test this script/function",
  "run tests", or "create a test file". Also triggers on: .bats files, bats-assert, bats-file,
  shell test organization, zunit, or testing shell plugins/commands/functions. Covers BATS-core
  patterns, assertions, mocking, isolation, zsh-specific testing, and CI integration.
---

# Shell Testing with BATS

## Running Tests — Targeted Only

**NEVER run the full test suite.** Always run only the test files affected by the current changes.

1. **Map source → test file**: `lib/helpers.sh` → `tests/helpers.bats`, `lib/ui.sh` → `tests/ui.bats`, `cmd/theme/*` → `tests/theme.bats`
2. **Run specific files**: `bats tests/helpers.bats tests/theme.bats`
3. **Filter by name**: `bats tests/helpers.bats --filter "format_insert"`
4. **Filter by tag**: `bats tests/ --filter-tags "unit"`

When multiple source files changed, run only their corresponding test files. If unsure which tests cover a function, grep for the function name across `tests/*.bats`.

## Framework Decision

- **BATS** (primary): All bash code, polyglot bash/zsh code, CLI commands
- **Zunit**: Only for pure zsh features (completions, zle widgets, zstyle) that cannot be tested via BATS
- **`bats --shell zsh`** (BATS 1.8.0+): Run BATS tests under zsh for polyglot verification

## Test File Template

```bash
#!/usr/bin/env bats

load test_helper/bats-support/load
load test_helper/bats-assert/load
load test_helper/bats-file/load   # Only if testing filesystem

setup() {
  source "${BATS_TEST_DIRNAME}/../lib/module_under_test.sh"
}

# bats test_tags=unit
@test "function_name returns expected output for valid input" {
  run function_name "valid_input"
  assert_success
  assert_output "expected"
}

# bats test_tags=unit
@test "function_name fails with clear error on bad input" {
  run function_name "bad_input"
  assert_failure
  assert_output --partial "error"
}
```

## Test Isolation Requirements (MANDATORY)

These are **non-negotiable requirements** for all shell tests. Violating these rules creates side effects and pollutes the real environment.

### Never use real project/framework directories in tests

```bash
# NEVER — writes to real framework directory
MANIFEST_DIR="${DOTTY_ROOT}/local"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# ALWAYS — create parallel structure in test temp space
MANIFEST_DIR="${TEST_TMPDIR}/mock-local"
BACKUP_DIR="${TEST_TMPDIR}/mock-backups"
mkdir -p "$MANIFEST_DIR" "$BACKUP_DIR"
```

**If production code needs to write to framework directories**, add override env var:

```bash
# In production code (e.g., cmd/dotty-undo)
DOTTY_LOCAL="${DOTTY_LOCAL_OVERRIDE:-${DOTTY_ROOT}/local}"

# In tests
export DOTTY_LOCAL_OVERRIDE="${TEST_TMPDIR}/mock-local"
```

### Mock all external commands that modify state

```bash
# Mock git submodule
cat << 'EOF' > "${TEST_TMPDIR}/git"
#!/usr/bin/env bash
if [[ "$1" == "submodule" ]]; then
  echo "[mock] git submodule $*" >&2
  exit 0
fi
exec /usr/bin/git "$@"  # Pass through other commands
EOF
chmod +x "${TEST_TMPDIR}/git"
export PATH="${TEST_TMPDIR}:${PATH}"

# Mock package managers, installers, etc.
mock_brew() {
  cat << 'EOF' > "${TEST_TMPDIR}/brew"
#!/usr/bin/env bash
echo "[mock] brew $*" >&2
exit 0
EOF
  chmod +x "${TEST_TMPDIR}/brew"
}
```

### Add safety guards to production commands

**Every command that could be called by tests** must detect test mode:

```bash
# At the top of cmd/dotty-install, cmd/dotty-update, etc.
if [[ -n "${BATS_TEST_TMPDIR:-}" ]]; then
  echo "[test mode] Skipping git submodule operations" >&2
else
  git submodule sync --quiet --recursive vendor/dotbot
  git submodule update --init --recursive vendor/dotbot
fi
```

### Verify test environment isolation

**Add to all test files** before any tests run:

```bash
# Verify we're in test mode
if [[ -z "${BATS_TEST_TMPDIR:-}" ]]; then
  echo "ERROR: Not running in BATS environment" >&2
  exit 1
fi

# Verify dotfiles dir is not real (adapt to your project)
if [[ "${DOTTY_DOTFILES_DIR:-}" == "${HOME}/.dotfiles" ]]; then
  echo "ERROR: DOTTY_DOTFILES_DIR points to real dotfiles" >&2
  exit 1
fi
```

### Skip tests gracefully when external tools unavailable

```bash
# NEVER — fails if tool missing
@test "tool is available" {
  run command -v mytool
  assert_success
}

# ALWAYS — skips gracefully
@test "feature works with mytool" {
  if ! command -v mytool &>/dev/null; then
    skip "mytool not installed (optional)"
  fi
  run use_mytool
  assert_success
}
```

## Core Rules

### Always use bats-assert over raw `[ ]`

```bash
# YES
run my_func; assert_success; assert_output --partial "done"

# NO — cryptic failure messages
run my_func; [ "$status" -eq 0 ]; [[ "$output" == *"done"* ]]
```

### Use `run` when testing exit codes or output; direct calls for side effects

```bash
# run: capture status + output
run parse_config "$file"
assert_success
assert_output --partial "key=value"

# direct: need side effects in test scope
source lib/config.sh
load_config           # sets $CONFIG_VALUE in current scope
[ "$CONFIG_VALUE" = "loaded" ]
```

### Name tests as behavior descriptions

Format: `"<subject> <verb describing behavior> [when <condition>]"`

```bash
@test "parse_config returns key-value pairs from valid file" { ... }
@test "parse_config fails with clear error on missing file" { ... }
```

### Use `$BATS_TEST_TMPDIR` for temp files (auto-cleaned)

```bash
@test "creates output file" {
  run my_func --output "$BATS_TEST_TMPDIR/result.txt"
  assert_success
  assert_file_exist "$BATS_TEST_TMPDIR/result.txt"
}
```

### Guard any manual `rm -rf` in teardown

```bash
teardown() {
  [ -n "$TEST_TMPDIR" ] && [ -d "$TEST_TMPDIR" ] && rm -rf "$TEST_TMPDIR"
}
```

### Tag tests for filtering

```bash
# bats test_tags=unit
@test "isolated function test" { ... }

# bats test_tags=integration
@test "full workflow test" { ... }
```

Run: `bats tests/ --filter-tags "unit"` or `bats tests/ --filter-tags "!integration"`

## `run` Semantics

| Form | Behavior |
|------|----------|
| `run cmd` | Capture exit code + stdout+stderr |
| `run -0 cmd` | Assert exit 0 |
| `run -1 cmd` | Assert exit 1 |
| `run ! cmd` | Assert nonzero exit |
| `run --separate-stderr cmd` | Split stdout/stderr into `$output`/`$stderr` |

After `run`: `$status`, `$output`, `${lines[@]}`, `$stderr` (if `--separate-stderr`), `${stderr_lines[@]}`

## Assertions Quick Reference

```bash
assert_success                         # status == 0
assert_failure [code]                  # status != 0 (or == code)
assert_output "exact text"             # exact match
assert_output --partial "substring"    # contains
assert_output --regexp "^pattern$"     # regex
assert_line "text"                     # any line equals
assert_line --index 0 "first line"     # specific line
assert_line --partial "text"           # any line contains
refute_output "text"                   # does NOT match
refute_line "text"                     # no line matches
assert_file_exist "$path"             # bats-file
assert_dir_exist "$path"              # bats-file
```

## Lifecycle Hooks

```
setup_file()     →  Once before all tests in file (expensive shared setup)
  setup()        →  Before each test (source code, create per-test state)
    @test        →  Runs in subshell (isolated)
  teardown()     →  After each test, even on failure
teardown_file()  →  Once after all tests in file
```

## Mocking Strategy

**See "Test Isolation Requirements (MANDATORY)" above for critical mocking rules.**

Additional mocking patterns — prefer function overrides over bats-mock:

```bash
@test "handles API response" {
  curl() { echo '{"status":"ok"}'; }
  export -f curl
  run my_api_caller
  assert_output --partial "ok"
}
```

For CLI stubs, use PATH manipulation:

```bash
@test "uses external tool" {
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  printf '#!/bin/bash\necho "stubbed"' > "$BATS_TEST_TMPDIR/bin/mytool"
  chmod +x "$BATS_TEST_TMPDIR/bin/mytool"
  run env PATH="$BATS_TEST_TMPDIR/bin:$PATH" my_script
  assert_success
}
```

## Testing Zsh Code

**Polyglot code** — test with BATS directly, optionally verify under zsh:

```bash
bats tests/my.bats              # default (bash)
bats --shell zsh tests/my.bats  # verify under zsh
```

**Zsh-only features** — invoke zsh explicitly or use zunit:

```bash
@test "zsh completion works" {
  run zsh -c "source lib/completions.zsh; _my_completion"
  assert_success
}
```

For zunit patterns, see [references/zsh-testing.md](references/zsh-testing.md).

## File Organization

One test file per source file. Shared helpers in `test_helper.bash`. Fixtures in `fixtures/`.

```
tests/
  helpers.bats            # tests for lib/helpers.sh
  ui.bats                 # tests for lib/ui.sh
  commands.bats           # smoke tests for CLI commands
  test_helper.bash        # shared setup, custom assertions
  fixtures/
    sample_config.txt
```

## Detailed References

- **Patterns & examples**: [references/patterns.md](references/patterns.md) — sourcing, multi-line output, stdin, stderr, TTY testing, fixtures, parallel safety, helper libraries, CI setup
- **Anti-patterns & gotchas**: [references/gotchas.md](references/gotchas.md) — dangerous teardown, negation bug, variable scope, platform portability, flaky tests
- **Zsh-specific testing**: [references/zsh-testing.md](references/zsh-testing.md) — zunit syntax, zsh-test-runner, polyglot patterns, testing completions/widgets

# BATS Anti-Patterns & Gotchas

## Table of Contents

- [Dangerous Teardown](#dangerous-teardown)
- [Negation Bug](#negation-bug)
- [Variable Scope After run](#variable-scope-after-run)
- [Return Code Convention](#return-code-convention)
- [Testing Implementation Not Behavior](#testing-implementation-not-behavior)
- [Redirections Lose Status](#redirections-lose-status)
- [Platform Portability](#platform-portability)
- [Flaky Test Causes](#flaky-test-causes)
- [Config Sourcing Overwrites](#config-sourcing-overwrites)

---

## Dangerous Teardown

```bash
# CATASTROPHIC: If TMPDIR is empty, deletes filesystem root
teardown() {
  rm -rf "$TMPDIR"
}

# SAFE: Guard every rm -rf
teardown() {
  [ -n "$TMPDIR" ] && [ -d "$TMPDIR" ] && rm -rf "$TMPDIR"
}

# SAFEST: Use BATS_TEST_TMPDIR (auto-cleaned, no teardown needed)
@test "my test" {
  echo "data" > "$BATS_TEST_TMPDIR/file.txt"
  # cleaned automatically
}
```

## Negation Bug

Bash deliberately excludes negated return values from causing pipeline exit under `set -e`.

```bash
# BROKEN: ! does NOT cause test failure
@test "broken" {
  ! false    # This PASSES — not what you want
}

# FIXED: Use run !
@test "fixed" {
  run ! false
  assert_success   # Correctly asserts that false failed
}
```

## Variable Scope After run

`run` executes in a subshell. Variables set inside the command are lost:

```bash
# BROKEN: Variable set inside run is invisible
@test "broken scope" {
  run bash -c 'MY_VAR=hello; echo done'
  assert_success
  [ "$MY_VAR" = "hello" ]   # FAILS — MY_VAR is empty
}

# WORKING: Test output instead
@test "check via output" {
  run bash -c 'MY_VAR=hello; echo "$MY_VAR"'
  assert_output "hello"
}

# WORKING: Call directly for side effects
@test "direct call for scope" {
  source lib/config.sh
  load_config              # Direct call — variables persist
  [ "$CONFIG_VALUE" = "loaded" ]
}
```

Functions must `export` variables for them to survive `run`:

```bash
# In code under test
load_config() {
  export CONFIG_VALUE="loaded"   # export needed
}
```

## Return Code Convention

In bash, **0 = success, nonzero = failure**. Always.

```bash
# WRONG: Treating 1 as "true"
my_check() { return 1; }  # This is FAILURE in bash

# RIGHT
my_check() { return 0; }  # Success
my_check() { return 1; }  # Failure — test for it with assert_failure
```

## Testing Implementation Not Behavior

```bash
# BAD: Checking how the function is written
@test "my_function uses sed" {
  grep "sed" "${BATS_TEST_DIRNAME}/../lib/helpers.sh"
}

# GOOD: Testing what the function does
@test "my_function transforms input correctly" {
  run my_function "foo bar"
  assert_output "FOO_BAR"
}
```

## Redirections Lose Status

```bash
# BROKEN: $? reflects redirection, not the command
@test "broken" {
  my_command > /tmp/output.txt 2>&1
  [ $? -eq 0 ]   # Wrong — checks redirection status
}

# FIXED: Wrap in bash -c
@test "fixed" {
  run bash -c 'my_command > /tmp/output.txt 2>&1'
  assert_success
}
```

## Platform Portability

### macOS vs Linux

| Feature | Linux | macOS | Portable Alternative |
|---------|-------|-------|---------------------|
| `sed -i` | `sed -i 's/...'` | `sed -i '' 's/...'` | `gsed -i` or `safe_sed_i` |
| `awk \s` | Works | Fails (BSD awk) | `[[:space:]]` |
| `date +%s%N` | Works | Fails | `perl -MTime::HiRes` |
| `readlink -f` | Works | Fails | `realpath` or manual |
| `grep -P` | Works | Fails | `grep -E` or `ggrep -P` |

### In tests

```bash
# Portable time measurement
elapsed_ms() {
  perl -MTime::HiRes=time -e 'printf "%.0f\n", time*1000'
}

# Portable temp directory
setup() {
  export TEST_DIR="$BATS_TEST_TMPDIR"  # Works everywhere
}
```

## Flaky Test Causes

| Cause | Fix |
|-------|-----|
| Shared temp files | Use `$BATS_TEST_TMPDIR` |
| Fixed port numbers | Use dynamic ports or mock |
| Time-dependent assertions | Use generous thresholds or mock |
| Network calls | Mock with function overrides |
| TTY-dependent output | Use `unbuffer` or `expect` |
| Race conditions in parallel | Ensure per-test isolation |
| Order-dependent tests | Each test must be independently runnable |

## Config Sourcing Overwrites

When testing code that sources config files (e.g., `.dotty.conf`), the config may overwrite test variables:

```bash
# DANGEROUS: helpers.sh reads .dotty.conf which overwrites DOTFILES_DIR
setup() {
  export DOTFILES_DIR="$BATS_TEST_TMPDIR"   # Will be overwritten!
  source helpers.sh                           # Reads .dotty.conf → DOTFILES_DIR="~/.dotfiles"
}
teardown() {
  rm -rf "$DOTFILES_DIR"                     # Deletes real dotfiles!
}

# SAFE: Use env var that takes priority over config file
setup() {
  export DOTTY_DOTFILES_DIR="$BATS_TEST_TMPDIR"   # Respected by helpers.sh
  source helpers.sh
}
teardown() {
  rm -rf "$BATS_TEST_TMPDIR"                       # Always safe
}
```

Pattern: If code reads config on source, provide an override env var that the test can set.

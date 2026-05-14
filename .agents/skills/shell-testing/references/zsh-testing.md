# Zsh-Specific Testing

## Table of Contents

- [Decision: BATS vs Zunit vs Zsh-Test-Runner](#decision-bats-vs-zunit-vs-zsh-test-runner)
- [BATS with --shell zsh](#bats-with---shell-zsh)
- [Testing Zsh Code from BATS](#testing-zsh-code-from-bats)
- [Zunit Framework](#zunit-framework)
- [Zsh-Test-Runner](#zsh-test-runner)
- [Polyglot Patterns](#polyglot-patterns)
- [Testing Completions](#testing-completions)
- [Testing Widgets and ZLE](#testing-widgets-and-zle)

---

## Decision: BATS vs Zunit vs Zsh-Test-Runner

| Feature | BATS | Zunit | Zsh-Test-Runner |
|---------|------|-------|-----------------|
| Runs in | bash | zsh | zsh |
| Stars | 5.8k | 219 | ~50 |
| Assertions | bats-assert (rich) | Built-in | Raw `[[ ]]` |
| TAP output | Yes | Yes | Yes |
| Parallel | Yes | No | No |
| Maturity | High | Medium | Low |

**Use BATS** for: bash code, polyglot bash/zsh, CLI commands, any code that doesn't use zsh-only features.

**Use zunit** for: zsh completions, zle widgets, zstyle, code that requires native zsh runtime.

**Use zsh-test-runner** for: lightweight zsh testing when zunit is too heavy.

## BATS with --shell zsh

BATS 1.8.0+ can run tests under zsh instead of bash:

```bash
bats --shell zsh tests/my.bats
```

This is useful for verifying polyglot code works in both shells:

```bash
# CI: test under both shells
bats tests/polyglot.bats                  # bash
bats --shell zsh tests/polyglot.bats      # zsh
```

**Limitation:** Test file syntax is still bash-compatible. Zsh-specific syntax in `@test` bodies may not work.

## Testing Zsh Code from BATS

Invoke zsh as a subprocess for zsh-only code:

```bash
@test "zsh function works" {
  run zsh -c '
    source lib/my_zsh_lib.zsh
    my_zsh_function "arg1"
  '
  assert_success
  assert_output "expected"
}

@test "zsh plugin loads without errors" {
  run zsh -c '
    source plugins/my_plugin/my_plugin.plugin.zsh
    echo "loaded"
  '
  assert_success
  assert_output "loaded"
}
```

### Testing zsh arrays

```bash
@test "zsh array function" {
  run zsh -c '
    source lib/arrays.zsh
    my_array_func
    # Output result as lines for BATS to parse
    for item in "${result[@]}"; do echo "$item"; done
  '
  assert_success
  assert_line --index 0 "first"
  assert_line --index 1 "second"
}
```

## Zunit Framework

[zunit-zsh/zunit](https://github.com/zunit-zsh/zunit) — [docs at zunit.xyz](https://zunit.xyz)

### Installation

```bash
# Via zsh plugin manager
zinit light zunit-zsh/zunit

# Manual
git clone https://github.com/zunit-zsh/zunit ~/.zunit
```

### Test Syntax

```bash
#!/usr/bin/env zunit

@setup {
  source lib/my_module.zsh
}

@teardown {
  unset MY_VAR
}

@test 'function returns expected output' {
  run my_function "input"
  assert $state equals 0
  assert "$output" same_as "expected"
}

@test 'function handles errors' {
  run my_function "bad_input"
  assert $state equals 1
  assert "$output" contains "error"
}
```

### Zunit Assertions

```bash
assert $state equals 0              # exit code
assert "$output" same_as "text"     # exact match
assert "$output" contains "text"    # substring
assert "$output" matches "^regex$"  # regex
assert "$output" is_empty           # empty string
assert "$output" is_not_empty       # non-empty
```

### Configuration (.zunit.yml)

```yaml
directories:
  tests: tests
  output: tests/_output
  support: tests/_support
tap: false
time_limit: 0
fail_fast: false
allow_risky: false
verbose: false
```

### Bootstrap Script

Place shared setup in `tests/_support/bootstrap`:

```bash
#!/usr/bin/env zsh
# tests/_support/bootstrap
# Sourced before any test file runs

export TEST_ROOT="${0:A:h:h}"
source "$TEST_ROOT/../lib/helpers.zsh"
```

## Zsh-Test-Runner

[olets/zsh-test-runner](https://github.com/olets/zsh-test-runner)

Lightweight alternative to zunit:

```bash
# tests/my_test.ztr.zsh

test 'function returns zero' {
  my_function
  (( $? == 0 ))
}

test 'output matches' {
  local output=$(my_function)
  [[ "$output" == "expected" ]]
}
```

Run: `ztr tests/`

## Polyglot Patterns

Write code that works in both bash and zsh to maximize testability with BATS:

### Safe Patterns (work in both)

```bash
local var="value"           # OK in both
echo "text"                 # OK
printf "%s\n" "$var"        # OK
[ "$var" = "value" ]        # OK (POSIX test)
case "$var" in ...) ;; esac # OK
```

### Avoid (zsh-specific)

```zsh
# Zsh-only — won't work in bash/BATS
typeset -A assoc_array      # Use declare -A in bash
setopt extended_glob        # No bash equivalent
print -P "%F{red}text%f"   # Zsh prompt expansion
```

### Array Compatibility

```bash
# POSIX-safe iteration (works in both)
for item in "$@"; do
  echo "$item"
done

# Bash-style arrays (mostly compatible if careful)
arr=("a" "b" "c")
echo "${arr[0]}"   # bash: "a", zsh: "a" (if KSH_ARRAYS set, else "b")
```

**Recommendation:** If arrays are needed, either:

1. Write bash-only code and test with BATS
2. Write zsh-only code and test with zunit
3. Use `"$@"` positional parameters for polyglot code

## Testing Completions

Zsh completions require native zsh. Test with zunit or zsh subprocess:

```bash
# Via BATS with zsh subprocess
@test "completion generates candidates" {
  run zsh -c '
    autoload -Uz compinit && compinit
    source lib/_my_completion
    # Simulate completion context
    words=(my_command sub)
    CURRENT=2
    _my_completion
    echo "${compadd_args[@]}"
  '
  assert_success
  assert_output --partial "expected_candidate"
}
```

This is fragile. For thorough completion testing, use zunit with a real zsh runtime.

## Testing Widgets and ZLE

ZLE widgets require an interactive zsh. Use `expect` or `zpty`:

```bash
# Via BATS with expect
@test "widget responds to keybinding" {
  cat > "$BATS_TEST_TMPDIR/test.exp" <<'EOF'
spawn zsh -i
send "source lib/my_widget.zsh\r"
sleep 0.1
send "\e[A"   # Up arrow
expect "widget output"
send "exit\r"
expect eof
EOF
  run expect "$BATS_TEST_TMPDIR/test.exp"
  assert_success
}
```

For complex widget testing, consider `zpty` within a zunit test:

```bash
#!/usr/bin/env zunit

@test 'widget handles input' {
  zmodload zsh/zpty
  zpty test_pty zsh -f
  zpty -w test_pty "source lib/my_widget.zsh"
  zpty -w test_pty "my-widget"
  sleep 0.1
  zpty -r test_pty output
  assert "$output" contains "expected"
  zpty -d test_pty
}
```

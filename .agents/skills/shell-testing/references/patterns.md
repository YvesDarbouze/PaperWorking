# BATS Patterns & Examples

## Table of Contents

- [Sourcing Code Under Test](#sourcing-code-under-test)
- [Multi-line Output](#multi-line-output)
- [Testing stdin](#testing-stdin)
- [Testing stderr Separately](#testing-stderr-separately)
- [Testing Environment Variables](#testing-environment-variables)
- [TTY-Dependent Code](#tty-dependent-code)
- [Fixtures](#fixtures)
- [Helper Libraries](#helper-libraries)
- [Mocking with PATH](#mocking-with-path)
- [Parallel Safety](#parallel-safety)
- [CI Integration](#ci-integration)
- [Performance Testing](#performance-testing)
- [Snapshot Testing](#snapshot-testing)

---

## Sourcing Code Under Test

Always use `${BATS_TEST_DIRNAME}` for paths relative to the test file:

```bash
setup() {
  source "${BATS_TEST_DIRNAME}/../lib/helpers.sh"
}
```

For code that sources other files internally, ensure it uses `${BASH_SOURCE[0]}`:

```bash
# lib/helpers.sh — portable self-referential sourcing
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HELPERS_DIR/common.sh"
```

### Testing Functions

```bash
@test "my_helper returns formatted date" {
  run format_date "2025-01-15"
  assert_success
  assert_output "2025-01-15T00:00:00Z"
}
```

### Testing Scripts

```bash
@test "install script creates config" {
  run "${BATS_TEST_DIRNAME}/../scripts/install.sh" --config "$BATS_TEST_TMPDIR/config"
  assert_success
  assert_file_exist "$BATS_TEST_TMPDIR/config"
}
```

### Testing CLI Commands

```bash
@test "dotty plugin ls lists core" {
  run "${BATS_TEST_DIRNAME}/../bin/dotty" plugin ls
  assert_success
  assert_line --partial "core"
}
```

## Multi-line Output

```bash
@test "list output contains expected items" {
  run list_items
  assert_success
  assert_line --index 0 "first item"     # exact line by index
  assert_line --partial "second"          # any line contains
  assert_line --regexp "^item [0-9]+"     # any line matches regex
  refute_line "unwanted item"             # no line matches
  assert_equal "${#lines[@]}" 3           # exact line count
}
```

## Testing stdin

Pipe through `bash -c`:

```bash
@test "function reads from stdin" {
  run bash -c 'echo "input data" | my_function'
  assert_success
  assert_output "processed: input data"
}
```

## Testing stderr Separately

```bash
@test "error goes to stderr, nothing to stdout" {
  run --separate-stderr my_function bad_input
  assert_failure
  assert [ -z "$output" ]
  assert [ "$stderr" = "error: bad input" ]
}
```

## Testing Environment Variables

```bash
@test "respects CONFIG_PATH" {
  run env CONFIG_PATH="/etc/my.conf" my_function
  assert_success
}

@test "uses default when CONFIG_PATH unset" {
  run env -u CONFIG_PATH my_function
  assert_success
  assert_output --partial "default"
}
```

## TTY-Dependent Code

### Using expect

```bash
@test "interactive picker shows menu" {
  cat > "$BATS_TEST_TMPDIR/test.exp" <<'EOF'
spawn bash -c "source lib/ui.sh; echo -e 'a\nb\nc' | pick 'Choose:'"
expect "Choose:"
send "a\r"
expect eof
EOF
  run expect "$BATS_TEST_TMPDIR/test.exp"
  assert_success
}
```

### Using unbuffer

```bash
@test "colored output when TTY" {
  run unbuffer bash -c "source lib/ui.sh; paint red 'error'"
  assert_output --partial $'\e['
}
```

### Testing NO_COLOR

```bash
@test "respects NO_COLOR" {
  run env NO_COLOR=1 bash -c "source lib/ui.sh; paint red 'error'"
  refute_output --partial $'\e['
  assert_output "error"
}
```

## Fixtures

Store test data in `tests/fixtures/`:

```bash
@test "parser reads config file" {
  run parse_config "${BATS_TEST_DIRNAME}/fixtures/sample_config.txt"
  assert_success
  assert_output --partial "key=value"
}
```

For writable fixtures, copy to tmpdir first:

```bash
@test "editor modifies config" {
  cp "${BATS_TEST_DIRNAME}/fixtures/sample_config.txt" "$BATS_TEST_TMPDIR/config.txt"
  run edit_config "$BATS_TEST_TMPDIR/config.txt" key new_value
  assert_success
  run grep "key=new_value" "$BATS_TEST_TMPDIR/config.txt"
  assert_success
}
```

## Helper Libraries

Create `tests/test_helper.bash` for shared utilities:

```bash
# tests/test_helper.bash

setup_common() {
  export FIXTURES_DIR="${BATS_TEST_DIRNAME}/fixtures"
  export PROJECT_DIR="${BATS_TEST_DIRNAME}/.."
}

# Custom assertion
assert_file_contains() {
  local file="$1" expected="$2"
  if ! grep -q "$expected" "$file"; then
    echo "Expected '$expected' in $file" >&2
    cat "$file" >&2
    return 1
  fi
}
```

Use via `load`:

```bash
load test_helper   # finds test_helper.bash

setup() {
  setup_common
}
```

## Mocking with PATH

Create stub executables for external tools:

```bash
@test "script calls external tool" {
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  cat > "$BATS_TEST_TMPDIR/bin/external_tool" <<'STUB'
#!/bin/bash
echo "stubbed: $*"
STUB
  chmod +x "$BATS_TEST_TMPDIR/bin/external_tool"

  run env PATH="$BATS_TEST_TMPDIR/bin:$PATH" my_script
  assert_success
  assert_output --partial "stubbed:"
}
```

### Verifying stub was called with specific args

```bash
@test "passes correct args to tool" {
  mkdir -p "$BATS_TEST_TMPDIR/bin"
  cat > "$BATS_TEST_TMPDIR/bin/git" <<'STUB'
#!/bin/bash
echo "$@" >> "$BATS_TEST_TMPDIR/git_calls.log"
STUB
  chmod +x "$BATS_TEST_TMPDIR/bin/git"

  run env PATH="$BATS_TEST_TMPDIR/bin:$PATH" my_git_wrapper commit -m "test"
  assert_success
  run cat "$BATS_TEST_TMPDIR/git_calls.log"
  assert_line --partial "commit -m test"
}
```

## Parallel Safety

Tests are safe for `bats --jobs N` when they use per-test state:

```bash
# SAFE: each test gets unique $BATS_TEST_TMPDIR
@test "test A creates file" {
  echo "data" > "$BATS_TEST_TMPDIR/file.txt"
  assert_file_exist "$BATS_TEST_TMPDIR/file.txt"
}

@test "test B independent" {
  refute [ -f "$BATS_TEST_TMPDIR/file.txt" ]  # different tmpdir
}
```

Unsafe patterns to avoid:

- Shared files outside `$BATS_TEST_TMPDIR` (e.g., `/tmp/shared.txt`)
- Fixed port numbers
- Modifying global PATH with bats-mock (use `--no-parallelize-within-file`)

## CI Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bats-core/bats-action@0.1.0
      - run: bats tests/ --recursive --tap > results.tap
      - uses: pcolby/tap-summary@v1
        if: always()
        with:
          path: results.tap
```

### Makefile

```makefile
.PHONY: test test-unit test-integration test-parallel

test:
 bats tests/ --recursive

test-unit:
 bats tests/ --recursive --filter-tags "unit"

test-integration:
 bats tests/ --recursive --filter-tags "integration"

test-parallel:
 bats tests/ --recursive --jobs 4
```

## Performance Testing

```bash
@test "function completes within 1 second" {
  local start end elapsed
  start=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time*1000')
  run my_function large_input
  end=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time*1000')
  elapsed=$((end - start))
  assert_success
  [ "$elapsed" -lt 1000 ]
}
```

Note: Use `perl -MTime::HiRes` instead of `date +%s%N` for macOS compatibility.

## Snapshot Testing

```bash
@test "output matches snapshot" {
  run my_function
  local snapshot="$BATS_TEST_DIRNAME/snapshots/my_function.snapshot"
  if [ ! -f "$snapshot" ]; then
    mkdir -p "$(dirname "$snapshot")"
    echo "$output" > "$snapshot"
    skip "Snapshot created — re-run to verify"
  fi
  local expected
  expected=$(cat "$snapshot")
  assert_output "$expected"
}
```

Prefer `assert_output --partial` or `--regexp` over snapshots for maintainability.

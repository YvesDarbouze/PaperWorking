# shell-testing

Write idiomatic [BATS](https://github.com/bats-core/bats-core) tests for bash and zsh shell scripts. Covers test patterns, assertions, mocking, isolation, zsh-specific testing, and CI integration.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/shell-testing/` into `~/.claude/skills/shell-testing/`.

## Usage

```
/shell-testing write tests for lib/helpers.sh
/shell-testing add integration tests for the install command
```

## What it covers

- BATS-core patterns with bats-assert, bats-support, and bats-file
- Mandatory test isolation (temp dirs, mocked externals, safety guards)
- Zsh testing via `bats --shell zsh` and zunit
- Mocking strategies: function overrides, PATH manipulation, CLI stubs
- Targeted test execution — runs only the tests that matter, not the full suite

## Why use this instead of prompting?

Shell testing has sharp edges. A plain prompt will write tests that pass locally but fail in CI, leak state between runs, or silently skip assertions because of quoting bugs. This skill loads the specific gotchas — dangerous teardown patterns, negation bugs, variable scope differences between bash and zsh — so the tests are correct from the start.

## References

| File | Purpose |
|------|---------|
| [`references/patterns.md`](references/patterns.md) | Sourcing, multi-line output, stdin, stderr, TTY testing, fixtures, CI |
| [`references/gotchas.md`](references/gotchas.md) | Anti-patterns: dangerous teardown, negation bugs, variable scope, portability |
| [`references/zsh-testing.md`](references/zsh-testing.md) | Zunit syntax, zsh-test-runner, completions, widgets |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`shell-testing.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/shell-testing.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

# cli-development

CLI development reference grounded in [clig.dev](https://clig.dev), the
open-source [Command Line Interface
Guidelines](https://github.com/cli-guidelines/cli-guidelines) by Aanand
Prasad, Ben Firshman, Carl Tashian, and Eva Parish. Use it whenever you
are designing, reviewing, modifying, or specifying a command-line
interface and want concrete, citable guidance.

The skill ships a sitemap of every clig.dev section anchor plus local
reference copies of each section, and instructs the agent to fetch the
canonical source from clig.dev (via `https://clig.dev/llms.txt`) before
binding recommendations to quoted text — so the citations track the
upstream guide as it evolves.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/cli-development/` into `~/.claude/skills/cli-development/`.

## Usage

The skill triggers on natural language about CLI work. No special
invocation is needed; mention CLI design, flag conventions, help text,
exit codes, error messages, environment variables, naming, or any
related topic and the skill will load.

Examples:

- "Review the flag layout in this PR."
- "Should I use `-q` or `--quiet` for this option?"
- "Where should this tool store its config — XDG, env, or both?"
- "We need to deprecate `--legacy`. What is the right rollout?"
- "Help me name this CLI."
- "Write the help text for `myapp deploy`."

## How it works

The skill points at clig.dev as the source of truth. When invoked, it:

1. Reads [`references/sitemap.md`](references/sitemap.md) to identify which sections of
   clig.dev apply to the task — usually one to four.
2. Fetches the live canonical text from `https://clig.dev/llms.txt`
   using the `tavily-extract` skill (preferred) or `WebFetch`. The
   bundled per-section files act as offline fallback.
3. Translates the relevant rule into a concrete recommendation, code
   change, or review comment, with the matching anchor URL cited
   inline (e.g., `https://clig.dev/#arguments-and-flags`).

Out of scope: full-screen terminal programs (vim, emacs, ncurses
TUIs), and language-specific framework idioms — clig.dev is explicit
that it does not cover these.

## References

| File | Covers |
|------|--------|
| [`references/sitemap.md`](references/sitemap.md) | Index of every clig.dev anchor with canonical URL + one-line summary |
| [`references/philosophy.md`](references/philosophy.md) | The nine principles (human-first, composability, consistency, conversation, robustness, empathy, chaos, etc.) |
| [`references/the-basics.md`](references/the-basics.md) | Argument-parsing libraries, exit codes, stdout vs stderr |
| [`references/help.md`](references/help.md) | Help text content and behavior on `-h`/`--help` |
| [`references/documentation.md`](references/documentation.md) | Web docs, terminal docs, man pages |
| [`references/output.md`](references/output.md) | Human/machine output, color, `--plain`, `--json`, pagers, ASCII density |
| [`references/errors.md`](references/errors.md) | Rewriting errors, signal-to-noise, debug info, bug-report flow |
| [`references/arguments-and-flags.md`](references/arguments-and-flags.md) | Flag conventions, common flag names, dangerous-action confirmation, secrets |
| [`references/interactivity.md`](references/interactivity.md) | TTY checks, `--no-input`, password prompts, escape paths |
| [`references/subcommands.md`](references/subcommands.md) | When subcommands earn their keep, naming consistency |
| [`references/robustness.md`](references/robustness.md) | Validation, responsiveness, progress, parallelism, timeouts, recovery |
| [`references/future-proofing.md`](references/future-proofing.md) | Additive changes, deprecation, abbreviations, time bombs |
| [`references/signals.md`](references/signals.md) | Ctrl-C handling, double-Ctrl-C semantics |
| [`references/configuration.md`](references/configuration.md) | XDG base directories, precedence order, project-level config |
| [`references/environment-variables.md`](references/environment-variables.md) | Naming, `.env` files, well-known variables, why secrets do not belong here |
| [`references/naming.md`](references/naming.md) | Picking a memorable, typeable, lowercase command name |
| [`references/distribution.md`](references/distribution.md) | Single binary preference, easy uninstall |
| [`references/analytics.md`](references/analytics.md) | Consent for telemetry, alternatives to collecting analytics |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`cli-development.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/cli-development.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

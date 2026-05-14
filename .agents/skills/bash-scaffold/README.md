# bash-scaffold

A skill that scaffolds a production-grade bash script through a brief shape-up. The template is inspired by [ralish/bash-script-template](https://github.com/ralish/bash-script-template), reformatted to the [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html), and recolored using the [Open Color](https://yeun.github.io/open-color/) palette emitted as 24-bit ANSI escapes.

## What you get

A single self-contained `.sh` file with the safety patterns turned on by default — strict mode, error and exit traps, atomic locking, `NO_COLOR`-aware colour, sudo-aware privilege escalation — and the optional pieces only present if you said yes to them in the shape-up. The result passes `shellcheck` clean and follows two-space, braced-expansion, `[[ … ]]` style throughout.

## How it works

Trigger the skill by asking Claude to scaffold a bash script for some purpose. Claude runs a six-question shape-up via two `AskUserQuestion` rounds:

- **Round 1 (runtime context)**: where it runs, what privileges it needs, what CLI shape fits, whether to emit colour.
- **Round 2 (optional features)**: locking, dependency checks, verbose mode, dry-run mode, and where output goes.

Your answers select which annotated `OPTIONAL` blocks survive in `assets/template.sh`. Claude then writes the assembled script to the path you choose, makes it executable, and runs `shellcheck` if it is installed.

## Why these choices

The upstream `ralish/bash-script-template` is excellent infrastructure but uses four-space indentation and the legacy eight-colour ANSI set. The Google Shell Style Guide calls for two-space indentation and braced variable expansion, which most modern bash codebases follow. Open Color provides hex values curated for UI legibility on both dark and light terminals, and 24-bit ANSI escapes have been universal in modern terminal emulators for years. The template still degrades to no colour when piped, when `NO_COLOR` is set, or when `--no-color` is passed.

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`bash-scaffold.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/bash-scaffold.skill)

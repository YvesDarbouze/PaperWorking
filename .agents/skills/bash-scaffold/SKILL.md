---
name: bash-scaffold
description: >
  Scaffold a production-grade bash script from a curated template. Use whenever the user asks to "scaffold a bash script",
  "start a new shell script", "write a shell script for X", "give me a bash script template",
  "bootstrap a .sh", "I need a maintainable bash script", or describes any task they intend to
  automate in bash from scratch — even when they don't explicitly say "scaffold".
metadata:
  template-source: https://github.com/ralish/bash-script-template
  palette-source: https://yeun.github.io/open-color/
  style-guide: https://google.github.io/styleguide/shellguide.html
---

# Scaffold a Bash Script

This skill produces a single self-contained bash script. The script starts from a curated template that combines the safety patterns from ralish/bash-script-template with the formatting rules from the Google Shell Style Guide and a colour palette drawn from Open Color via 24-bit ANSI escapes. Every optional feature in the template is gated behind a section marker; the scaffolder removes the markers and the unselected feature blocks before writing the file.

## When this skill applies

The user is starting a new shell script and wants the boilerplate done well. They might phrase it as "scaffold a bash script", "give me a template", "start a new .sh for X", or simply describe a chore they plan to automate in bash. If the user is editing an existing script or asking for a one-line shell snippet, this skill does not apply.

## Workflow

The work happens in five steps. Steps 2 and 3 are the only places the user is interrupted; everything else runs without prompting.

### Step 1 — Capture the script's purpose

Read the user's request. The purpose is whatever they said the script will do. If the request was vague ("a bash script" with no details), ask one clarifying free-text question before continuing — the purpose ends up in the file header and shapes the placeholder body.

Pick a sensible script name from the purpose if the user did not supply one. Snake-case, no extension when the script is meant to be on `PATH`, `.sh` extension otherwise. Confirm the name and path with the user only if there is real ambiguity; otherwise state your choice and proceed.

### Step 2 — Shape-up round 1: runtime context

Make a single AskUserQuestion call with these four questions. The header for each is in parentheses; keep it under 12 characters because that is the AskUserQuestion limit.

1. **Where will this script run?** (header `Runtime`)
   - Interactive terminal only
   - Cron job (silent unless error)
   - CI/CD pipeline
   - Mixed / general purpose
2. **What privileges does it need?** (header `Privileges`)
   - None — runs as the calling user
   - May escalate via sudo for some commands
   - Requires root from the start
   - Refuses to run as root
3. **What CLI shape fits?** (header `CLI shape`)
   - Flags only (-h, -v, --foo)
   - Subcommands (verb noun pattern)
   - Positional arguments
   - Just runs (no arguments at all)
4. **Should it emit colored output?** (header `Colors`)
   - Yes, with a --no-color flag and NO_COLOR support (recommended)
   - Always on, no flag
   - Never use color

### Step 3 — Shape-up round 2: optional features

Make a second AskUserQuestion call with these two questions.

1. **Which optional features should be wired up?** (header `Features`, multiSelect: true)
   - Single-instance lock (prevents two copies running at once)
   - External dependency checks (verify required binaries up front)
   - Verbose / quiet logging modes
   - Dry-run mode (print actions instead of executing)
2. **Where does normal output go?** (header `Output`)
   - stdout for results, stderr for logs (recommended default)
   - Plus a log file (--log path)
   - Silent unless error (cron-friendly)

If the user picked "Cron job" in round 1, round 2's "Silent unless error" should be the recommended option for the second question.

### Step 4 — Map answers to template features and assemble the script

Read `assets/template.sh`. The template is annotated with section markers of the form:

```
# >>> OPTIONAL: <feature-name> <<<
…
# <<< OPTIONAL: <feature-name> >>>
```

The feature names that exist in the template are: `cron-mode`, `lock`, `colors`, `verbose`, `superuser`, `check-binary`, `dry-run`. Each marked block is removable as a unit. Markers nest cleanly — for example, the cron-related lines inside `script_trap_err` are wrapped in a `cron-mode` block, and removing the `cron-mode` blocks anywhere in the file produces a script with no cron support and nothing else broken.

Translate the answers from steps 2 and 3 into a keep-set:

| Answer                                                | Keep these markers                                   |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Runtime: Cron job                                     | `cron-mode`                                          |
| Runtime: Mixed / general purpose                      | `cron-mode`, `verbose`                               |
| Privileges: May escalate via sudo                     | `superuser`, `check-binary`                          |
| Privileges: Requires root from the start              | `superuser`, `check-binary`                          |
| CLI shape: Subcommands or Positional args             | (no extra markers — adjust `parse_params` instead)   |
| Colors: Yes with --no-color OR Always on              | `colors`                                             |
| Colors: Never use color                               | (delete `colors` and all references to `C_*` vars)   |
| Features: Single-instance lock                        | `lock`                                               |
| Features: External dependency checks                  | `check-binary`                                       |
| Features: Verbose / quiet logging modes               | `verbose`                                            |
| Features: Dry-run mode                                | `dry-run`                                            |

Apply this rule to every `OPTIONAL` block in the template, including the ones inside the `script_usage` heredoc:

- If the feature is **not** in the keep-set, delete the entire span from the `# >>> OPTIONAL: <name> <<<` line through the matching `# <<< OPTIONAL: <name> >>>` line, inclusive.
- If the feature **is** in the keep-set, delete only the two marker lines themselves and keep everything between them. The markers serve the scaffolder, not the final reader; leaving them in would print literal `# >>> OPTIONAL: …` text inside the `--help` output.

Then delete the leading explanatory comment block (lines 8–14 of the template, the "Section markers" preamble) since the assembled script no longer needs it.

After deletions, perform these per-shape adjustments:

- **Subcommands**: replace the body of `parse_params` with a dispatch on `${1-}` to functions named after each subcommand. Add a stub for one example subcommand and a `cmd_help()` function. Keep `--help`/`-h` global.
- **Positional args**: leave `parse_params` as a flag parser, but after the `while` loop add a check that captures positional arguments into a `positional=("$@")` array, and document the expected count in the header.
- **Just runs (no args)**: delete the `parse_params` call from `main` and the function itself. Adjust `script_usage` to document the script with no options.
- **Refuses to run as root**: delete the superuser block, then add this check near the top of `main`:

  ```bash
  if [[ ${EUID} -eq 0 ]]; then
    script_exit 'This script must not be run as root.' 1
  fi
  ```

- **Always on colors (no flag)**: delete the `--no-color` flag handling from `parse_params` and `script_usage`, but keep the body of `color_init` and the `NO_COLOR` environment check.
- **Never use color**: in addition to deleting the `colors` block, replace every `${C_*-}` or `${C_*}` reference in the surviving script with empty strings, and replace `printf '%b\n'` with `printf '%s\n'` where the only `%b` was for colour escapes.
- **Plus a log file**: add a `--log <path>` flag to `parse_params`, store the path in a `log_file` global, and after `color_init` add `exec > >(tee -a "${log_file}") 2>&1` guarded by `[[ -n ${log_file-} ]]`.

Replace the placeholders in the header:

- `{{SCRIPT_PURPOSE}}` — one-sentence purpose from step 1
- `{{AUTHOR}}` — ask the user once if not already known; default to the value of `git config user.name` when available
- `{{DATE}}` — today's ISO date, e.g. `2026-05-12`

Replace the body of `main` between the `----- replace the lines below with the real work -----` marker and the closing brace with a minimal stub that hints at the next step the user will write. Keep the marker comment as a guide for them.

### Step 5 — Write the file, set the executable bit, sanity-check

Write the assembled script to the path the user requested (or the chosen default). After writing:

1. `chmod +x <path>`
2. If `shellcheck` is on `PATH`, run `shellcheck <path>` and report any findings. Do not modify the script in response to findings unless the user asks; report and let them decide.
3. If `bash -n <path>` is available, run it as a syntax-only parse check and report any error.

Show the user the final path, the executable bit, the shellcheck verdict (clean / N findings), and a one-line summary of which features were included. Stop there. Do not propose next changes.

## Important details

### Style alignment

The template follows the Google Shell Style Guide. Two-space indentation, braced variable expansion (`${var}`), `[[ … ]]` over `[ … ]`, `$(…)` over backticks, `function name()` form for definitions (consistent with the upstream template), and `local` for function-scoped variables. Keep these intact when editing — do not reformat to four-space indentation, even if the user's other scripts use it, unless the user explicitly asks.

The strict mode prologue (`set -o errexit`, `nounset`, `pipefail`, `errtrace`) is gated on whether the script is being executed versus sourced. Do not move this gate; sourced strict mode mutates the caller's shell options.

### Colour handling

Colours are 24-bit ANSI escapes drawn from the Open Color palette, not the legacy 8-colour set the upstream template uses. The mapping is documented in `references/opencolors-palette.md`. Six semantic roles ship by default: `C_ERROR`, `C_WARN`, `C_SUCCESS`, `C_INFO`, `C_HINT`, `C_HEADER`. The template degrades safely to no colour when stdout is not a TTY, when `NO_COLOR` is set, or when `--no-color` is passed.

If the user later asks to swap a colour, consult the palette table in the reference file and pick the corresponding hex; emit it as `\033[38;2;R;G;Bm` for foreground or `\033[48;2;R;G;Bm` for background.

### Section marker discipline

The section markers are the contract that lets the template stay readable while supporting many feature combinations. When you delete a feature block, delete the markers too — they have no purpose in the final script and confuse future readers. When you add a new optional feature later, surround it with the same `>>> OPTIONAL: <name> <<<` and `<<< OPTIONAL: <name> >>>` form so the next round of scaffolding can find it.

### What the scaffolder never does

It does not commit the script. It does not edit anything outside the chosen output path. It does not install dependencies or run the script. It does not rewrite the user's `.bashrc` or shell config. If the user wants any of those, ask before doing them.

## Reference files

- `assets/template.sh` — the source template with section markers
- `references/opencolors-palette.md` — palette mapping, hex catalog, and rationale for the 24-bit-ANSI choice

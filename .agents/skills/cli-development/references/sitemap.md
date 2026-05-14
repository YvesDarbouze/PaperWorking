# clig.dev sitemap

Index of every section published on [clig.dev](https://clig.dev), with the
canonical anchor URL, the matching local reference file, and a one-line
description of what each section covers. Read this file first to decide
which sections apply to the task at hand.

## Canonical sources

| Source | URL | Use when |
|--------|-----|----------|
| HTML page | `https://clig.dev/` | Reading as a human, sharing with humans, scrolling for context. |
| Machine-readable markdown | `https://clig.dev/llms.txt` | Programmatic fetch, anchored extraction, full-text search. |
| Sitemap | `https://clig.dev/sitemap.xml` | Confirming the surface area of the site (currently `/`, `/categories/`, `/tags/`). |
| Source repository | `https://github.com/cli-guidelines/cli-guidelines` | Inspecting history, proposing changes, or pinning to a commit. |

## Anchor index

Each row points at one section. The anchor at the end of the URL matches
the heading id on the page; you can deep-link to a specific guideline.

### Front matter

| Section | Canonical URL | Local reference | What it covers |
|---------|---------------|-----------------|----------------|
| Authors | <https://clig.dev/#authors> | (skill SKILL.md mentions the authors) | Aanand Prasad, Ben Firshman, Carl Tashian, Eva Parish, plus reviewers. |
| Foreword | <https://clig.dev/#foreword> | (no separate file — context only) | Why the CLI matters in a GUI-saturated world; the shift from machine-first to human-first. |
| Introduction | <https://clig.dev/#introduction> | (no separate file — context only) | Scope of the guide, who it is for, what it explicitly does not cover (full-screen terminal programs). |

### Philosophy

The nine principles. Read these when the question is "why?" rather than "how?".

| Section | Canonical URL | Local reference | What it covers |
|---------|---------------|-----------------|----------------|
| Philosophy (overview) | <https://clig.dev/#philosophy> | [`philosophy.md`](philosophy.md) | Wrapper section. The nine principles below all live under it. |
| Human-first design | <https://clig.dev/#human-first-design> | [`philosophy.md`](philosophy.md) | If humans are the primary audience, design for humans first; do not carry the machine-first baggage of historical UNIX defaults. |
| Simple parts that work together | <https://clig.dev/#simple-parts-that-work-together> | [`philosophy.md`](philosophy.md) | Composition via stdin/stdout/stderr, signals, exit codes; designing for humans and for pipelines is not a contradiction. |
| Consistency across programs | <https://clig.dev/#consistency-across-programs> | [`philosophy.md`](philosophy.md) | Follow the conventions users already have in their fingers; break with care. |
| Saying (just) enough | <https://clig.dev/#saying-just-enough> | [`philosophy.md`](philosophy.md) | Information density is the interface; both silence and noise harm clarity. |
| Ease of discovery | <https://clig.dev/#ease-of-discovery> | [`philosophy.md`](philosophy.md) | Help text, examples, and suggestions; CLIs and GUIs are not opposites on discoverability. |
| Conversation as the norm | <https://clig.dev/#conversation-as-the-norm> | [`philosophy.md`](philosophy.md) | Treat invocation as a dialogue; suggest corrections, confirm scary actions, surface intermediate state. |
| Robustness (philosophy) | <https://clig.dev/#robustness-principle> | [`philosophy.md`](philosophy.md) | Robustness as both objective behavior and felt quality; simplicity reduces fragility. |
| Empathy | <https://clig.dev/#empathy> | [`philosophy.md`](philosophy.md) | The user should feel you are on their side; delight by exceeding expectations. |
| Chaos | <https://clig.dev/#chaos> | [`philosophy.md`](philosophy.md) | The terminal is messy; break rules with intention when they are demonstrably harmful. |

### Guidelines

The concrete rules. Read these when the question is "how should I do this?".

| Section | Canonical URL | Local reference | What it covers |
|---------|---------------|-----------------|----------------|
| Guidelines (overview) | <https://clig.dev/#guidelines> | (no separate file — index only) | Wrapper section that introduces the catalog of rules. |
| The Basics | <https://clig.dev/#the-basics> | [`the-basics.md`](the-basics.md) | Use an argument-parsing library; zero exit on success, non-zero on failure; primary output to stdout, messaging to stderr. The non-negotiables. |
| Help | <https://clig.dev/#help> | [`help.md`](help.md) | Behavior on `-h`/`--help`; concise default help; full help on flag; suggestions on misuse; help on TTY-only invocations of pipe-expecting commands. |
| Documentation | <https://clig.dev/#documentation> | [`documentation.md`](documentation.md) | Web docs, terminal docs, man pages; making terminal docs accessible from the tool itself. |
| Output | <https://clig.dev/#output> | [`output.md`](output.md) | Human-readable by default, machine-readable when it does not hurt usability; `--plain`, `--json`, color (`NO_COLOR`, `MYAPP_NO_COLOR`, `--no-color`), TTY checks, animations, symbols, pager (`less -FIRX`), state changes, ASCII density. |
| Errors | <https://clig.dev/#errors> | [`errors.md`](errors.md) | Rewrite errors for humans; signal-to-noise; placement; debug/traceback policy; bug-report URLs. |
| Arguments and flags | <https://clig.dev/#arguments-and-flags> | [`arguments-and-flags.md`](arguments-and-flags.md) | Terminology; prefer flags to args; full-length flag names; common flag names (`-h`/`--help`, `-q`, `-n`/`--dry-run`, `-o`, `-p`, `-u`, `--version`, etc.); confirmation for dangerous actions (mild/moderate/severe); `-` for stdin/stdout; secrets handling. |
| Interactivity | <https://clig.dev/#interactivity> | [`interactivity.md`](interactivity.md) | Prompt only when stdin is a TTY; `--no-input`; do not echo passwords; let the user escape. |
| Subcommands | <https://clig.dev/#subcommands> | [`subcommands.md`](subcommands.md) | When subcommands earn their keep; consistency across them; noun-verb vs verb-noun; avoiding ambiguous names. |
| Robustness (guidelines) | <https://clig.dev/#robustness-guidelines> | [`robustness.md`](robustness.md) | Validate input; respond in <100 ms; show progress; parallel work with care; timeouts; recovery on resume; crash-only design; assume misuse. |
| Future-proofing | <https://clig.dev/#future-proofing> | [`future-proofing.md`](future-proofing.md) | Additive changes; deprecation warnings; output stability for humans vs scripts (`--plain`/`--json`); no catch-all subcommand; no abbreviations as aliases; no time bombs. |
| Signals and control characters | <https://clig.dev/#signals> | [`signals.md`](signals.md) | Ctrl-C should exit promptly; second Ctrl-C may skip cleanup; expect to be started after an unclean exit. |
| Configuration | <https://clig.dev/#configuration> | [`configuration.md`](configuration.md) | Three categories of config (per-invocation, per-machine, per-project); XDG base directories; precedence order (flags > shell env > project config > user config > system config). |
| Environment variables | <https://clig.dev/#environment-variables> | [`environment-variables.md`](environment-variables.md) | Naming rules; single-line values; do not commandeer POSIX names; well-known variables (`NO_COLOR`, `DEBUG`, `EDITOR`, `HTTP_PROXY`, `SHELL`, `TERM`, `TMPDIR`, `HOME`, `PAGER`, `LINES`, `COLUMNS`); `.env` files; why secrets do not belong here. |
| Naming | <https://clig.dev/#naming> | [`naming.md`](naming.md) | Pick a simple, memorable, lowercase, easy-to-type word; do not collide with widely used names. |
| Distribution | <https://clig.dev/#distribution> | [`distribution.md`](distribution.md) | Single binary where possible; easy uninstall instructions. |
| Analytics | <https://clig.dev/#analytics> | [`analytics.md`](analytics.md) | No phone-home without consent; opt-in beats opt-out; alternatives to collecting telemetry. |

### Back matter

| Section | Canonical URL | What it covers |
|---------|---------------|----------------|
| Further reading | <https://clig.dev/#further-reading> | External references — Kernighan & Pike, POSIX Utility Conventions, GNU Coding Standards, 12 Factor CLI Apps, Heroku CLI Style Guide. |

## How to choose what to read

Match the task to a section family:

- **Naming a new tool or subcommand** → `naming.md`, `subcommands.md`,
  `the-basics.md`.
- **Designing flags or arguments** → `arguments-and-flags.md`, `help.md`,
  `the-basics.md`.
- **Writing or reviewing help text** → `help.md`, `documentation.md`.
- **Wiring stdout/stderr or output formatting** → `output.md`,
  `the-basics.md`, `errors.md`.
- **Handling user input or prompts** → `interactivity.md`,
  `arguments-and-flags.md` (the secrets and `-` sub-rules).
- **Configuring the tool** → `configuration.md`,
  `environment-variables.md`.
- **Error messages and exit codes** → `errors.md`, `the-basics.md`.
- **Signals, Ctrl-C, cleanup** → `signals.md`, `robustness.md` (crash-only).
- **Long-running work, progress, timeouts** → `robustness.md`.
- **Versioning, deprecation, breaking changes** → `future-proofing.md`.
- **Distribution, install, uninstall** → `distribution.md`.
- **Telemetry or usage tracking** → `analytics.md`.
- **Defending or explaining a design choice** → `philosophy.md` first,
  then the matching guidelines section.

## How to fetch the live source

The local references are snapshots. Before binding a recommendation to a
specific quoted rule, fetch the live source so the citation reflects the
current text.

- **Whole document, machine-readable:**
  `https://clig.dev/llms.txt` — single markdown file, all anchors intact.
- **Specific section in HTML:**
  `https://clig.dev/#<anchor>` — replace `<anchor>` with the id from the
  table above.
- **Preferred fetch path:** the `tavily-extract` skill, which returns
  clean markdown without rendering overhead. Pass the URL and a query
  naming the section.
- **Alternative:** `WebFetch` with a prompt that names the section heading.

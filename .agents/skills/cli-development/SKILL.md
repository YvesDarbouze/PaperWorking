---
name: cli-development
description: >-
  CLI development reference grounded in https://clig.dev. Use this skill whenever
  designing, reviewing, modifying, or specifying a command-line interface —
  drafting flags or subcommands, writing help text, choosing exit codes or error
  output, picking environment variables, choosing config file locations, naming a
  binary, deciding stdout vs stderr, planning interactivity or progress output,
  reviewing CLI source code in pull requests, writing CLI specs or RFCs, or doing
  any development, design, or QA-adjacent work that touches CLI surface. The
  skill provides a sitemap of clig.dev anchors plus local reference copies of
  every guideline section, and instructs the agent to pull live content from
  clig.dev before citing rules so recommendations stay current.
license: EUPL-1.2
---

# CLI Development

This skill grounds CLI work in the [Command Line Interface
Guidelines](https://clig.dev) — an open-source guide maintained by Aanand
Prasad, Ben Firshman, Carl Tashian, and Eva Parish that updates traditional
UNIX principles for modern human-first command-line tools.

clig.dev is a single canonical page. The full text is published under
`https://clig.dev/` (HTML) and `https://clig.dev/llms.txt` (machine-readable
markdown). This skill mirrors the structure of that guide as a sitemap plus
per-section reference files, and instructs you to fetch the canonical source
before citing rules so your recommendations track upstream changes.

## When this skill applies

Use it whenever the work touches CLI surface:

- **Design** — proposing a new CLI tool or subcommand layout; choosing flag
  names, defaults, or argument shape; deciding what configuration goes in
  flags, environment variables, or config files; naming a binary.
- **Implementation** — wiring stdout/stderr; emitting help text and errors;
  picking an argument-parsing library; handling Ctrl-C; deciding when to
  prompt; gating dangerous operations.
- **Review** — reading a pull request that adds or modifies CLI surface;
  pointing reviewers at the specific guideline a change conflicts with.
- **Specification** — drafting CLI specs, RFCs, design documents, or
  architectural diagrams that include a command-line interface.
- **QA** — testing a CLI for behaviors clig.dev calls out (TTY detection,
  `NO_COLOR`, `--no-input`, exit codes, error rewriting, signal handling,
  pager behavior).
- **Discussion** — answering questions about CLI conventions, defending or
  critiquing a CLI design choice, comparing competing approaches.

If the conversation involves a CLI surface and the question is "what is the
right way to do this?", consult clig.dev before answering.

## Workflow

1. **Locate the relevant sections.** Read [`references/sitemap.md`](references/sitemap.md).
   It indexes every clig.dev anchor with a one-line description. Pick the
   sections that match the work — usually one to four.

2. **Pull the canonical source.** clig.dev evolves; do not rely on the local
   reference copy alone for binding recommendations. Fetch the live content:

   - **Preferred:** the `tavily-extract` skill, with the URL
     `https://clig.dev/llms.txt` and a query naming the section
     (e.g., "arguments and flags"). This returns clean markdown.
   - **Alternative:** `WebFetch` against `https://clig.dev/llms.txt` or
     `https://clig.dev/#<anchor>` with a prompt naming the section.
   - **Offline fallback:** the bundled per-section file under
     `references/` is a snapshot of the guideline text. Use it when network
     fetches fail; flag the recommendation as based on a snapshot rather
     than live content.

3. **Read the matched section in full.** Each section is short. Read the
   bundled reference file or the fetched text end-to-end. The guidelines
   are interlinked — a recommendation about flags will often defer to the
   `Output` or `Configuration` section.

4. **Apply the guidance to the task.** Translate the rule into a concrete
   recommendation, code change, or review comment. State the rule, then the
   reasoning, then the application.

5. **Cite the anchor.** When you recommend or critique, link to the
   specific clig.dev anchor — e.g., `https://clig.dev/#arguments-and-flags`
   — so the reader can verify or read more. Citations are part of the
   deliverable, not an optional flourish.

## Citing rules

When you state a rule, name where it comes from. Format:

> "Disable color when stdout is not a TTY ([clig.dev: Output](https://clig.dev/#output))."

If the user is reviewing code, quote the exact rule heading from clig.dev
(the bold lead-in sentences in the guide, like "**Disable color if your
program is not in a terminal or the user requested it.**") so the comment
is grounded in primary text rather than your paraphrase.

## What this skill does not cover

clig.dev is explicit about its scope: it does not cover full-screen
terminal programs (vim, emacs, ncurses TUIs). It is also language- and
framework-agnostic. If the user is asking about TUI design or about a
specific framework's idioms, clig.dev covers the underlying CLI etiquette
but not the framework specifics.

## Reference layout

| File | Covers |
|------|--------|
| [`references/sitemap.md`](references/sitemap.md) | Index of every clig.dev anchor with canonical URL + one-line summary. Read this first. |
| [`references/philosophy.md`](references/philosophy.md) | The nine philosophical principles (human-first design, composability, consistency, discoverability, conversation, robustness, empathy, chaos). |
| [`references/the-basics.md`](references/the-basics.md) | Argument parsing libraries, exit codes, stdout vs stderr. The non-negotiable foundation. |
| [`references/help.md`](references/help.md) | Help text content, formatting, suggestions when input is wrong, behavior on `-h`/`--help`. |
| [`references/documentation.md`](references/documentation.md) | Web docs, terminal docs, man pages. |
| [`references/output.md`](references/output.md) | Human vs machine output, `--plain`, `--json`, color, `NO_COLOR`, pagers, ASCII art for density. |
| [`references/errors.md`](references/errors.md) | Rewriting errors for humans, signal-to-noise, debug info, bug-report flow. |
| [`references/arguments-and-flags.md`](references/arguments-and-flags.md) | Flag naming conventions, common flags, confirmation for dangerous actions, secrets handling. |
| [`references/interactivity.md`](references/interactivity.md) | TTY checks, `--no-input`, password prompts, escape paths. |
| [`references/subcommands.md`](references/subcommands.md) | When subcommands help, naming consistency, noun-verb vs verb-noun. |
| [`references/robustness.md`](references/robustness.md) | Input validation, responsiveness budgets, progress, parallelism, timeouts, recovery, crash-only design. |
| [`references/future-proofing.md`](references/future-proofing.md) | Additive changes, deprecation, abbreviations, time bombs. |
| [`references/signals.md`](references/signals.md) | Ctrl-C handling, double-Ctrl-C semantics. |
| [`references/configuration.md`](references/configuration.md) | XDG base directories, precedence order, project-level config. |
| [`references/environment-variables.md`](references/environment-variables.md) | Naming, `.env` usage, well-known variables, why secrets do not belong in env vars. |
| [`references/naming.md`](references/naming.md) | Picking a memorable, typeable, lowercase command name. |
| [`references/distribution.md`](references/distribution.md) | Single-binary preference, easy uninstall. |
| [`references/analytics.md`](references/analytics.md) | Consent for telemetry, alternatives to collecting analytics. |

The bundled references are the same prose clig.dev publishes. They are
provided for offline use and as a stable cite-able anchor. The canonical
text remains `https://clig.dev/` and `https://clig.dev/llms.txt`.

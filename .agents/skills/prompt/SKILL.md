---
name: prompt
description: >-
  Craft or refactor LLM instructions. Use when using the Agent or Task tool, when the user says "write a prompt", "prompt", "prompt an agent", or any similar request.
metadata:
  user-invocable: true
---

# Prompt

<when> the user asks for a prompt to be written, refactored, or polished, or pastes an existing prompt or CLAUDE.md asking for improvement.

<instruction> The output artifact uses a fixed seven-section scaffold. Load [`assets/template.md`](assets/template.md) and fill it. The procedure below covers detection, inventory, shaping, linting, and emit.

## Inventory the input

<always> identify what the input contains before writing anything.

<when> in seed mode — gather signal from the conversation. Note the task verb, the domain, any files referenced, constraints stated, register requested, audience implied, and stakes. List ambiguities worth surfacing to the user.

<when> in refactor mode — extract every instruction in the source as a flat list with stable IDs (I-01, I-02, ...). The list is the preservation contract. Truth-conditions are sacred — register changes, the underlying requirements do not. Every ID must end up in at least one section of the output, or it has been dropped.

## Shape into the template

<always> load [`assets/template.md`](assets/template.md) and fill its seven sections from the inventory.

<always> stakes content sits at the close of the Task section. Name what is at risk and why this matters. There is no separate Why section anywhere in the artifact.

<when> a section has no real content — write a one-line gap note that names the absence, for example: "No prior context identified — agent works from conversation signal alone." <never> pad an empty section with filler.

<when> in refactor mode — every extracted instruction ID lands in at least one section. Consolidations are explicit (note which IDs share a slot). An unassigned ID is a dropped instruction.

## Lint the draft

<always> load [`references/eip-anti-patterns.md`](references/eip-anti-patterns.md) and read every phrasing in the draft against the patterns it lists.

<instruction> For each hit, rewrite the phrasing only. The underlying requirement stays. The lint targets register. Truth-conditions are sacred. "You must write tests for every function" becomes "Every function needs a test. Missing tests in a payment system cost more than spurious tests."

<prefer> writing the natural phrasing first, then checking it against the catalog. The rewrite changes phrasing — never structure, never the underlying instruction. Alignment is what remains after the lint passes; warmth pasted on top of an unaligned prompt does not produce it.

## Emit

<always> output only the artifact. No preamble, no postscript, no surrounding commentary, no closing question.

<when> the user supplied a path — write the file directly.
<when> they did not — display the artifact inline.

<never> fabricate file paths, scripts, or tools that the surrounding context has not established.

<when> a required assumption was made — note it on the first line of the artifact, not in commentary around it.

<when> in refactor mode and the source contains more than ~15 distinct instructions — show the coverage report (every input ID mapped to a destination section) and ask the user to confirm before writing the file. Smaller refactors and seeds emit without asking.

<when> the user has indicated downstream subagent evaluation — keep section boundaries clear and place the coverage report in a fenced block.

## Edge cases

<when> the input is genuinely ambiguous between seed and refactor — default to seed. The assumption note on the first line of the artifact is mandatory.

<when> the user pastes a prompt and asks for one specific tweak — run the full lint anyway, but emit a minimal diff. <prefer> preserving choices the user did not ask to revisit.

<when> the existing prompt is already aligned and would survive the lint untouched — say so plainly and skip the rewrite. Do not churn for theater.

<when> the source prompt contradicts itself — surface the contradiction with `AskUserQuestion`. <never> silently resolve it.

<when> the user requests a register the lint would otherwise flag, e.g. terse command style for a one-shot formatter — honor it and name which patterns the requested style relaxes. Domain register wins over universal lint.

## References

[`assets/template.md`](assets/template.md) — the artifact scaffold. Load during shape; the output fills it.
[`references/eip-anti-patterns.md`](references/eip-anti-patterns.md) — the anti-pattern catalog with detection hints and rewrite patterns. Load every run.
[`references/eip-principles.md`](references/eip-principles.md) — the principles each anti-pattern derives from. Load when a rewrite needs grounding.

---
name: sequencer
description: >-
  Parse concise pipeline instructions into ordered task sequences and execute
  them with accumulating context. This skill should be used when the user asks
  to "run a sequence", "chain skills together", "pipeline these steps",
  "seq", types "/seq", or provides arrow-separated (via the arrow symbol),
  bulleted, or prose-described multi-step instructions that mix skills,
  agents, and natural-language tasks.
---

# Sequencer

Parse loose pipeline instructions — arrows, bullets, or plain prose — into an ordered task list, then execute each step via subagents with accumulating context. Steps run sequentially by default; parenthesized groups with `|` run in parallel.

## Context Loading

Load only the reference needed for the current phase. Do NOT load all references upfront.

| Phase | Load | Do NOT Load |
|-------|------|-------------|
| Parsing input | [`references/parsing-guide.md`](references/parsing-guide.md) | execution-model, syntax-reference |
| Executing steps | [`references/execution-model.md`](references/execution-model.md) | parsing-guide, syntax-reference |
| Showing help | [`references/syntax-reference.md`](references/syntax-reference.md) | parsing-guide, execution-model |

**Skip guidance based on input:**

| Condition | Skip | Why |
|-----------|------|-----|
| Input is a single step | Task tracking | Overhead exceeds value for one step |
| No `( ... \| ... )` groups | Parallel execution logic in execution-model.md | Nothing to parallelize |
| `/seq help` invocation | Parsing and execution entirely | Just display the reference |

## Subcommand Dispatch

Determine which subcommand the user invoked:

| Input starts with | Subcommand | Action |
|-------------------|------------|--------|
| `/seq help` | **help** | Load [`references/syntax-reference.md`](references/syntax-reference.md) and display it verbatim |
| `/seq generate <description>` | **generate** | Parse the natural-language description into DSL form, show the user for approval, then execute via the default flow below |
| Everything else (`/seq <pipeline>`) | **execute** | Parse and execute the pipeline |

## Execute Flow

Track progress using available task tracking tools — pipelines of 3+ steps always qualify for task tracking.

### 1. Parse

Load [`references/parsing-guide.md`](references/parsing-guide.md). Read the user's input and identify each step and its type:

- **Skill step**: matches `/something` — will invoke via `Skill("something")`
- **Agent step**: matches `(agent: name)` or `@agent-name` — will spawn a named agent
- **Parallel group**: matches `( a | b )` — will run contained steps concurrently
- **Natural-language step**: everything else — Claude executes directly

If any step is ambiguous, decompose it into candidate interpretations and ask the user to pick one using AskUserQuestion. Never guess when the user's intent is unclear.

### 2. Plan

Create a run directory: `/tmp/seq-{run-id}/` where `{run-id}` is a short random identifier.

Present the execution plan to the user as a numbered list:

```
Execution plan for seq-a1b2c3:
  1. [skill]    /skill-review path/to/skill
  2. [inline]   fix any issues found
  3. [skill]    /commit
```

Wait for user confirmation before executing. If the user modifies the plan, re-parse the modified version.

### 3. Execute

For each step in order:

**Skill steps** — spawn a general-purpose subagent:

```
Prompt: "Invoke Skill('{{skill-name}}') with args '{{args}}'.
         Read /tmp/seq-{run-id}/step-{N-1}.md for context from the previous step.
         Write your output summary to /tmp/seq-{run-id}/step-{N}.md when done."
```

**Agent steps** — spawn the named agent type:

```
Prompt: "{{original instruction}}.
         Read /tmp/seq-{run-id}/step-{N-1}.md for context from the previous step.
         Write your output summary to /tmp/seq-{run-id}/step-{N}.md when done."
```

**Natural-language steps** — execute inline (do NOT spawn a subagent). These stay in the main conversation because they may need user interaction. Write output to `/tmp/seq-{run-id}/step-{N}.md` yourself.

**Parallel groups** — spawn all contained steps simultaneously as separate subagents. Each writes to `/tmp/seq-{run-id}/step-{N}-{sub}.md`. When all complete, concatenate outputs into `/tmp/seq-{run-id}/step-{N}.md` for the next step.

After each step completes, mark the corresponding task as completed via TaskUpdate.

### 4. Report

After all steps complete, present a summary:

- Steps completed (with pass/fail status)
- Any errors encountered and how they were resolved
- Path to the run directory for reference

## Rules

1. **Never execute without showing the plan first** — the user must confirm before any step runs. Pipelines can invoke destructive skills (`/commit`, custom scripts); silent execution removes the user's last chance to catch mistakes.
2. **Always accumulate context** — every step's subagent prompt includes the prior step's output file path. Without this, steps operate in isolation and the pipeline loses its compositional value.
3. **Natural-language steps run inline** — they need the main conversation for user interaction; only skill and agent steps get subagents. Spawning a subagent for an inline step severs the user interaction channel — the subagent can't ask clarifying questions.
4. **Parallel groups merge before continuing** — the next sequential step waits for all parallel branches. Proceeding before all branches finish produces incomplete context that corrupts downstream steps.
5. **Decompose before asking** — if a step fails, break it into smaller sub-steps and identify what went wrong before asking the user for help. Users can't help debug "it failed" — they need "step X failed because Y; I tried Z; here are options."
6. **Never hallucinate skill names** — if a `/something` doesn't match a known skill, ask the user what they meant. Invoking a nonexistent skill wastes a subagent turn and produces a confusing error that breaks the pipeline.
7. **Never nest subagents** — a subagent running a skill step should invoke the Skill tool directly, not spawn another subagent. Nested subagents lose context accumulation and make errors untraceable.
8. **Never reuse run directories** — always generate a fresh `{run-id}`. Reusing a directory from a prior run means stale step output files pollute the new pipeline's context.

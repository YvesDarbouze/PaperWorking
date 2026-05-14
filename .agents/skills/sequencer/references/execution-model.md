# Execution Model

How to run parsed steps, accumulate context between them, handle parallel groups, and recover from errors.

## Run Directory

Each pipeline execution creates a run directory:

```
/tmp/seq-{run-id}/
├── step-0.md          # Output from step 1
├── step-1.md          # Output from step 2
├── step-2-a.md        # Parallel branch a of step 3
├── step-2-b.md        # Parallel branch b of step 3
├── step-2.md          # Merged parallel output for step 3
└── step-3.md          # Output from step 4
```

Generate `{run-id}` as a short random hex string (6-8 characters). Create the directory before executing any steps.

## Context Accumulation

Every subagent receives the prior step's output file path in its prompt. This is the mechanism for passing state between steps.

**Step 0** (first step): no prior context exists. Omit the context line from the prompt.

**Step N** (N > 0): include this line in the subagent prompt:

```
Read /tmp/seq-{run-id}/step-{N-1}.md for context from the previous step.
```

**What goes in a step output file**: a concise summary of what the step accomplished, any artifacts produced (file paths, results), and anything the next step needs to know. Not a full transcript — a distilled handoff.

## Spawning Subagents

Every subagent prompt follows the same structure:

```
[Role context — only for agent steps]
[Task — the step instruction]
[Context line — "Read /tmp/seq-{run-id}/step-{N-1}.md for context from the previous step." if N > 0]
[Output line — "Write a concise output summary to /tmp/seq-{run-id}/step-{N}.md.
Include: what you did, what changed, any artifacts produced, and what the next step needs to know."]
```

### Step type → subagent mapping

| Step type | subagent_type | Prompt role context |
|-----------|--------------|---------------------|
| Skill (`/name args`) | `general-purpose` | None — skill invocation is the task: `Invoke Skill('name') with args 'args'` |
| Agent (`@name` or `(agent: name)`) | Use `name` if it matches a known agent type; otherwise `general-purpose` | `You are operating as the '{{name}}' agent.` |
| Inline | **No subagent** — execute in main conversation | N/A |

### Why inline steps stay in the main conversation

Inline steps are natural-language instructions that may need:

- User interaction (clarifying questions, confirmations)
- Access to the full conversation history
- Ability to show intermediate results the user reacts to

Spawning a subagent for these severs all three. After completing an inline step, write the output summary to `/tmp/seq-{run-id}/step-{N}.md` yourself.

## Parallel Execution

When a parallel group is encountered:

1. **Fork**: spawn one subagent per branch simultaneously. Use separate Agent tool calls in a single response to run them concurrently.

2. **Output files**: each branch writes to `/tmp/seq-{run-id}/step-{N}-{label}.md` where `{label}` is `a`, `b`, `c`, etc. (alphabetical, matching branch order).

3. **Wait**: all branches must complete before the pipeline continues.

4. **Merge**: concatenate all branch output files into `/tmp/seq-{run-id}/step-{N}.md` with clear section headers:

```markdown
# Parallel step {N} — merged output

## Branch A: {branch description}
{contents of step-{N}-a.md}

## Branch B: {branch description}
{contents of step-{N}-b.md}
```

1. **Next step**: receives the merged file as context, same as any sequential step.

### Parallel group constraints

- Branches within a group are independent — they do not share context with each other
- Each branch receives the same prior step's context (step N-1)
- If one branch fails, the others continue. The merged output notes the failure.

## Error Recovery

When a step fails:

### 1. Decompose first

Before asking the user anything, try to understand what went wrong:

- Read the error output
- Determine if the failure is in the step itself or in a dependency
- Attempt to break the failed step into smaller sub-steps that might succeed individually

### 2. Retry with decomposition

If the step can be broken down:

- Present the proposed sub-steps to the user
- On approval, execute the sub-steps in place of the original step
- The final sub-step writes to the original step's output file

### 3. Ask the user

If decomposition doesn't help or the failure is fundamental:

- Report what happened (the error, not just "it failed")
- Report what you tried (decomposition attempts)
- Offer alternatives:
    - Skip this step and continue (output file will note the skip)
    - Retry with modified instructions
    - Abort the pipeline

### 4. Never silently skip

A failed step is never silently omitted. The pipeline either resolves the failure, gets user permission to skip, or stops.

## Task Tracking Integration

For pipelines with 3+ steps:

1. **Before execution**: create one task per step using available task tracking tools. Use the step description as the subject and include the step type in the description.

2. **During execution**: mark each task `in_progress` when it starts and `completed` when it finishes.

3. **On failure**: keep the task `in_progress` and create a new sub-task describing the failure, so the user can see what's stuck.

For pipelines with 1-2 steps, skip task tracking — the overhead isn't worth it.

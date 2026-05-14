# Parsing Guide

How to read user input and extract an ordered list of steps with types.

## Input Formats

The sequencer accepts three equivalent input formats. All produce the same internal representation: an ordered list of steps, each with a type and content.

### Arrow Syntax

Steps separated by `->`. Whitespace around arrows is ignored.

```
/skill-review path/to/skill -> fix any issues found -> /commit
```

Produces:

1. `[skill] /skill-review path/to/skill`
2. `[inline] fix any issues found`
3. `[skill] /commit`

### Bullet List

Lines starting with `-` or `*` or numbered (`1.`, `2.`). Each line is one step.

```
- /skill-review path/to/skill
- fix any issues found
- /commit
```

Produces the same three steps as above.

### Prose

Natural language describing a sequence. Look for sequencing words: "then", "after that", "next", "finally", "first", "followed by".

```
run skill-review on the new skill, then fix issues, then commit
```

Produces the same three steps. When prose is ambiguous about step boundaries, ask the user.

## Step Type Detection

For each extracted step, determine its type by pattern matching:

| Pattern | Type | Example |
|---------|------|---------|
| Starts with `/` followed by a word | `skill` | `/commit`, `/skill-review path/to/skill` |
| Matches `(agent: <name>)` or `@<name>` | `agent` | `(agent: claude-code-guide)`, `@explorer` |
| Wrapped in `( ... \| ... )` | `parallel` | `( /lint \| /test )` |
| Everything else | `inline` | `fix any issues found` |

### Skill steps

Extract the skill name (first word after `/`) and arguments (everything after the skill name).

```
/skill-review path/to/skill
  → skill name: "skill-review"
  → args: "path/to/skill"
```

### Agent steps

Extract the agent type name. Both `(agent: claude-code-guide)` and `@claude-code-guide` resolve to agent type `claude-code-guide`.

### Parallel groups

Everything inside `( ... )` where `|` separates sub-steps. Each sub-step is parsed recursively using the same type detection rules.

```
( /lint | /test | (agent: explorer) do research )
```

Produces a parallel group containing:

1. `[skill] /lint`
2. `[skill] /test`
3. `[agent] explorer: do research`

Parallel groups cannot be nested. If `( ( a | b ) | c )` appears, flatten it to `( a | b | c )`.

### Inline steps

Anything that doesn't match the patterns above. These are natural-language instructions Claude executes directly in the main conversation.

## Ambiguity Handling

### Quoted text

`"quoted text"` could be any type. Interpret from surrounding context:

- `"run the tests"` → inline step
- `"/commit"` → skill step (the `/` gives it away)
- If genuinely ambiguous, ask the user

### Skill vs. prose

If a step looks like it _might_ be a skill name but isn't a known skill, do NOT assume it's a skill. Ask: "Did you mean the `/foo` skill, or is this a natural-language instruction?"

### Step boundary uncertainty (prose format)

When prose doesn't clearly separate steps, propose your interpretation and ask the user to confirm. Example:

> Input: "review the code and fix issues then run tests and commit"
>
> Proposed interpretation:
>
> 1. [inline] review the code and fix issues
> 2. [inline] run tests
> 3. [skill] /commit
>
> Is "run tests" a separate step from "review the code", or should they be one step?

### Empty or single-step input

- Empty input after `/seq`: show the help reference
- Single step: execute it directly without the plan confirmation step (no pipeline to plan)

## Edge Cases

- **Trailing arrows**: `/a -> /b ->` — ignore the trailing arrow, parse as two steps
- **Multiple arrows**: `/a -> -> /b` — treat consecutive arrows as one separator
- **Mixed formats**: if input contains both `->` and bullet lines, prefer the format that appears first; do not mix parsing strategies
- **Arguments with special characters**: skill arguments can contain paths, flags, and quoted strings. Everything after the skill name up to the next `->`, newline, or `|` is the argument

# Syntax Reference

Display this verbatim when the user runs `/seq help`.

---

## `/seq` — Pipeline Sequencer

Chain skills, agents, and instructions into ordered pipelines with accumulating context.

### Quick Start

```
/seq /skill-review skills/new-skill -> fix issues -> /commit
```

### Syntax

| Token | Meaning | Example |
|-------|---------|---------|
| `->` | Sequential separator | `/a -> /b -> /c` |
| `-` (bullet) | Sequential step (list format) | `- /a`<br>`- /b` |
| `/name` | Skill invocation | `/commit`, `/skill-review path/` |
| `(agent: name)` | Named agent | `(agent: claude-code-guide)` |
| `@name` | Named agent (shorthand) | `@explorer` |
| `( a \| b )` | Parallel group | `( /lint \| /test )` |
| Plain text | Natural-language step | `fix the failing tests` |

### Input Formats

**Arrows** — compact, inline:

```
/seq /lint -> /test -> fix failures -> /commit
```

**Bullets** — readable, multi-line:

```
/seq
- /lint
- /test
- fix failures
- /commit
```

**Prose** — conversational:

```
/seq run lint, then test, fix any failures, then commit
```

All three produce the same four-step pipeline.

### Parallel Execution

Wrap steps in parentheses with `|` to run them simultaneously:

```
/seq /analyze -> ( /lint | /test | @explorer check docs ) -> /commit
```

Steps 2a, 2b, and 2c run in parallel. Their outputs merge before step 3.

### Subcommands

| Command | Description |
|---------|-------------|
| `/seq <pipeline>` | Parse and execute |
| `/seq help` | Show this reference |
| `/seq generate <description>` | Convert prose to DSL, preview, then run |

### How It Works

1. **Parse** — input is read and split into typed steps
2. **Plan** — execution plan shown for your confirmation
3. **Execute** — each step runs via subagent; output accumulates in `/tmp/seq-{id}/`
4. **Report** — summary of completed steps and any issues

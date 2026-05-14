# Workflow: Requirements Gathering

<!--
execution: inline
parallelism: sequential
needs-user-interaction: true
-->

## Role

Requirements analyst. You translate user intent into a structured requirements document that the authoring phase can execute against.

## Task

Gather requirements from the user for the skill being created, informed by the research report. Produce a requirements document that precisely defines what the skill does, when it triggers, and how it's structured.

## Onboarding

1. Read the research report produced by the research phase.
2. Read [`references/quality-criteria.md`](quality-criteria.md) to understand what the final skill must satisfy.

## Process

### Step 1: Present Research Summary

Briefly summarize what the research phase found:

- What documentation exists for the topic
- Key concepts the skill should cover
- Any gotchas or constraints discovered
- Recommended reference file structure

### Step 2: Ask Scoping Questions

Use AskUserQuestion to gather requirements. Ask these questions (adapt phrasing to context):

**Core scope:**

- What should this skill enable Claude to do? (Primary capability)
- When should the skill trigger? (Trigger phrases for the description field)
- What's the expected output when the skill is used? (Code, analysis, files, etc.)

**Structure:**

- Are there procedural workflows that need step-by-step templates? (e.g., "deploy to X" has ordered steps)
- Should scripts be included? If so, what should they do?
- Any constraints on tool access? (allowed-tools in frontmatter)

**Boundaries:**

- What should the skill explicitly NOT do? (Non-goals prevent scope creep)
- Are there related skills that already exist? (Avoid overlap)

### Step 3: Ask Where to Write

Ask the user where the skill should be created:

Use AskUserQuestion with these options:

- **Personal skills** (`~/.claude/skills/{{skill-name}}/`) — available across all projects
- **Project skills** (`.claude/skills/{{skill-name}}/`) — scoped to current project
- **Custom path** — user specifies

### Step 4: Flag Claude-Specific Requirements

If any requirements mention or relate to Claude Code features (MCP servers, hooks, slash commands, agents, etc.):

- Flag that Claude Code documentation must be referenced in the skill
- Note which specific Claude Code features are relevant

### Step 5: Produce Requirements Document

Write the requirements document. Structure:

```markdown
# Requirements: {{skill-name}}

## Overview
[1-2 sentence summary of what the skill does]

## Trigger Phrases
- "use when..."
- "this skill should be used when..."
[List of phrases for the description field]

## Capabilities
- [What the skill enables — specific, testable]

## Non-Goals
- [What the skill explicitly does NOT do]

## Output Format
[What the consuming agent produces when using this skill]

## Skill Location
[Path where the skill will be created]

## Reference Files Needed
| File | Purpose | Key Sources |
|------|---------|-------------|
| `references/[topic].md` | [what it covers] | [URLs from research] |

## Workflow Files Needed
| File | Execution | Parallelism | User Interaction | Purpose |
|------|-----------|-------------|------------------|---------|
| `references/workflow-[name].md` | subagent/inline | sequential/parallel | true/false | [what] |

## Scripts Needed
| File | Purpose |
|------|---------|
| `scripts/[name].sh` | [what it does] |

## Claude-Specific References
[List any Claude Code features that must be documented, or "None"]

## Constraints
- [Any tool access restrictions]
- [Any environment assumptions]
```

## Success Conditions

- User has answered all scoping questions
- Requirements document is specific enough for the authoring phase to execute without guessing
- Skill location is confirmed by the user
- Reference files map to sources found in research
- Non-goals are defined (prevents scope creep in authoring)

## Why

Ambiguous requirements produce ambiguous skills. This phase ensures the authoring agent has a precise contract to build against, and the user has agreed to the scope before any files are written.

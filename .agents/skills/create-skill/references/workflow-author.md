# Workflow: Skill Authoring

<!--
execution: subagent
parallelism: sequential
needs-user-interaction: false
-->

## Role

Skill author and specification implementer. You create production-quality Agent Skills that meet the spec and quality bar, grounded entirely in cited documentation.

## Task

Create the complete skill directory for **{{SKILL_NAME}}** at **{{SKILL_PATH}}** based on the research report and requirements document.

## Onboarding

1. **Read skill-development guidance** — either from the local plugin-dev:skill-development skill or from the fetched content provided in the orchestrator's context. This grounds your authoring in official best practices.
2. **Read the spec** at `~/.agent-skills-spec` — understand current frontmatter requirements, naming conventions, and directory structure expectations.
3. **Read the research report** — this contains all verified facts and source URLs.
4. **Read the requirements document** — this defines scope, non-goals, structure, and target location.
5. **Read [`references/quality-criteria.md`](quality-criteria.md)** from the create-skill skill — this is your acceptance criteria.
6. **Read [`references/shell-script-standards.md`](shell-script-standards.md)** if any scripts are needed.

## Process

### Step 1: Plan the File Tree

Before writing anything, plan the complete file tree:

```
{{SKILL_PATH}}/
├── SKILL.md
├── README.md
├── references/
│   ├── [topic-1].md
│   ├── [topic-2].md
│   └── workflow-[name].md  (if procedural tasks exist)
└── scripts/
    └── [name].sh           (if scripts are needed)
```

If the total file count exceeds 3, track each file as a separate task.

### Step 2: Write SKILL.md

The SKILL.md is the most important file. It must:

**Frontmatter:**

```yaml
---
name: {{skill-name}}
description: >-
  [Description < 1024 chars. Include trigger phrases: "use when...",
  "this skill should be used when..."]
---
```

- `name`: lowercase kebab-case, matches directory name
- `description`: present tense, includes trigger phrases for when to activate

**Body (< 500 lines):**

- Start with a 1-2 sentence summary of what this skill is
- Include a conditional loading table (load only what the task requires)
- Reference files by relative path: `references/[topic].md`
- For multi-step procedures (3+ steps): include explicit task tracking instructions
- End with anti-hallucination rules specific to this domain

**Body structure template:**

```markdown
# [Skill Title]

[1-2 sentence summary]

## Context Loading

Before [doing X]:
1. Read `references/[primary-topic].md`
2. [Conditional loads based on task type]

| Situation | Load | Skip |
|-----------|------|------|
| [task type] | `references/[topic].md` | [other references] |

## [Core Instructions]

[What the agent should do when this skill activates]

## [Procedural Workflow — if applicable]

When performing [multi-step task]:
1. Track progress through each step
2. [Step-by-step instructions referencing workflow files]

## Rules

- NEVER [anti-hallucination rule specific to this domain]
- ALWAYS [cite docs before generating patterns]
```

### Step 3: Write Reference Files

For each reference file identified in the requirements:

1. **Title and purpose** — what this file covers
2. **Cited content** — facts extracted from documentation, each with source URL
3. **Agent instructions** — tell the consuming agent to fetch and verify URLs, not trust patterns
4. **Examples** — from official docs, attributed with source

**Reference file template:**

```markdown
# [Topic]

[1-2 sentence overview]

Source: [primary URL]

## [Section]

[Content extracted from docs]

— Source: [URL]

## Agent Instructions

Before generating code that uses [topic]:
1. Fetch [URL] and read the relevant section
2. Verify the API/syntax matches what you see in the docs
3. Do not rely on patterns from training data — the docs are the source of truth
```

Every reference file must contain at least one source URL. If a topic has no citable source, the reference file must say so explicitly: "No authoritative source found — treat patterns in this file as provisional."

### Step 4: Write Workflow Files (if needed)

For procedural tasks identified in requirements:

1. **Execution metadata** at the top (in HTML comment):

   ```
   <!--
   execution: subagent | inline
   parallelism: sequential | parallel | batch
   needs-user-interaction: true | false
   -->
   ```

2. **Role, Task, Onboarding, Perspective, Success, Why** — standard agent prompt structure
3. Step-by-step process with clear decision points
4. Success conditions that are objectively testable

### Step 5: Write Scripts (if needed)

Follow [`references/shell-script-standards.md`](shell-script-standards.md) strictly:

- `#!/usr/bin/env bash` + `set -euo pipefail`
- Announce before acting
- Non-destructive by default
- Clear error messages to stderr
- Exit 0 on success, non-zero on failure

### Step 6: Write README.md

```markdown
# {{skill-name}}

[2-4 sentence description]

## Install

\`\`\`sh
claude install-skill github:[owner]/[repo]/skills/{{skill-name}}
\`\`\`

## What it does

- [Capability 1]
- [Capability 2]

## References

| File | Purpose |
|------|---------|
| `references/[topic].md` | [description] |

## Usage

\`\`\`
/{{skill-name}} [example usage]
\`\`\`
```

## Hard Rules

These are non-negotiable:

1. **NEVER hallucinate patterns** for external technologies. Every external-tech fact must cite a URL.
2. **NEVER use curl/wget** to download code. Use `git clone` for repos.
3. **NEVER create a `.skill` file** unless the user explicitly requested one.
4. **NEVER replace an existing skill directory.** Only create new directories or add to existing ones. If the target path exists, stop and report.
5. **NEVER exceed 500 lines** in SKILL.md. Move details to references.
6. **ALWAYS include source URLs** in reference files.
7. **ALWAYS declare execution metadata** in workflow files.
8. **ALWAYS instruct task tracking** for skills with 3+ step procedures.

## Perspective

"Would an agent using this skill produce correct output on the first try, without needing to search for documentation itself? Have I given it everything it needs, grounded in real docs?"

## Success Conditions

- All files from the requirements document are created
- SKILL.md frontmatter matches spec (name format, description < 1024 chars)
- SKILL.md body is < 500 lines
- Every reference file contains source URLs
- Workflow files have execution metadata
- Scripts follow shell standards
- README is complete with install command and reference table
- No hallucinated patterns — everything traces to a cited source

## Why

A skill is only as good as its grounding. Agents consume skills as trusted instructions — if those instructions contain fabricated patterns, the agent produces confidently wrong output. Every citation in a reference file is a lifeline back to truth.

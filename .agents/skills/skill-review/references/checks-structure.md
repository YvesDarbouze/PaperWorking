# Structure, README, and Workflow Checks

Validate progressive disclosure, task tracking instructions, workflow metadata, and README completeness.

**Sources:**

- Agent Skills Specification: <https://agentskills.io/specification>
- Anthropic Best Practices: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>

## Progressive Disclosure

### Check 1: SKILL.md Line Count

**What to check:** SKILL.md is under 500 lines.

**How to check:**

1. Count the total lines in SKILL.md (include blank lines)
2. Report the actual count

**Pass criteria:** Line count < 500. Report the actual count regardless of pass/fail.

**Fail action:** Report the count and recommend moving detailed content to reference files.

**Source:** <https://agentskills.io/specification#progressive-disclosure> ("Keep your main SKILL.md under 500 lines")

### Check 2: Details in References

**What to check:** Detailed checklists, long code examples, and exhaustive documentation live in `references/` (or `scripts/`, `assets/`), not crammed into SKILL.md.

**How to check:**

1. Read SKILL.md
2. Look for signs of excessive detail: checklists longer than 10 items, code blocks longer than 20 lines, multi-paragraph explanations of a single topic
3. Verify that such content lives in reference files with SKILL.md pointing to them

**Pass criteria:** SKILL.md serves as an overview and router. Detailed content lives in separate files.

**Fail action:** Identify sections in SKILL.md that should be extracted to reference files.

**Source:** <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> ("SKILL.md serves as an overview that points Claude to detailed materials as needed")

### Check 3: Conditional Reference Loading

**What to check:** SKILL.md loads reference files conditionally (table, if/then, or context-dependent pattern), not all at once.

**How to check:**

1. Read SKILL.md
2. Find where reference files are mentioned
3. Determine the loading pattern:
   - **Conditional (PASS):** A table mapping phases/contexts to specific files, if/then logic, or "load X when doing Y" instructions
   - **Blanket (FAIL):** "Read all reference files", "Load everything in references/", or listing all files without context

**Pass criteria:** Reference files are loaded selectively based on the current task or phase.

**Fail action:** Describe the current loading pattern and suggest a conditional alternative.

**Source:** <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> (progressive disclosure patterns — "Claude loads FORMS.md, REFERENCE.md, or EXAMPLES.md only when needed")

### Check 4: Reference Self-Containment

**What to check:** Each reference file can be understood independently.

**How to check:**

1. Read each file in `references/`
2. Ask: can an agent act on this file's topic without reading other reference files?
3. Check for undefined terms or forward references that require another file

**Pass criteria:** Each reference file provides enough context for its topic without depending on other reference files.

**Source:** <https://agentskills.io/specification#references> and progressive disclosure principle.

## Task Tracking

### Check 5: Task Tracking Instruction

**What to check:** If the skill describes 3 or more procedural steps, SKILL.md instructs the consuming agent to track progress through those steps.

**How to check:**

1. Read SKILL.md
2. Count the procedural steps (numbered lists, sequential phases, workflow steps)
3. If 3 or more steps exist, search for task tracking instructions — phrases like "track progress", "use available task tracking tools", "break into tasks", or references to specific task tools

**Pass criteria:**

- If fewer than 3 procedural steps: N/A (pass automatically)
- If 3 or more steps: SKILL.md contains an instruction to track progress through the steps

**Fail action:** Report the step count and recommend adding a task tracking instruction.

**Source:** Convention — multi-step procedures benefit from task tracking to show progress and prevent lost work.

## Workflow Files

Apply these checks only if workflow files exist (files with `.md` extension in a `workflows/` directory, or files explicitly designated as workflows in SKILL.md). If no workflow files exist, mark this entire section as N/A.

### Check 6: Execution Metadata

**What to check:** Each workflow file declares execution metadata.

**How to check:**

1. Identify workflow files
2. For each, search for these metadata fields (in frontmatter or structured header):
   - `execution:` — how the workflow runs (e.g., `inline`, `subagent`, `background`)
   - `parallelism:` — whether steps can run in parallel
   - `needs-user-interaction:` — whether the workflow requires user input

**Pass criteria:** All three metadata fields are present in each workflow file.

**Fail action:** List missing metadata fields per workflow file.

**Source:** Convention — execution metadata enables orchestrators to schedule workflows correctly.

### Check 7: User Interaction Marking

**What to check:** Workflows that require user interaction are marked `execution: inline`.

**How to check:**

1. Read each workflow file
2. Search for user interaction patterns: questions to the user, AskUserQuestion, confirmation prompts, "wait for user input"
3. If user interaction is found, verify `execution: inline`

**Pass criteria:** Workflows with user interaction have `execution: inline`. Workflows without user interaction may use any execution mode.

**Fail action:** Identify workflows with user interaction that are not marked `execution: inline`.

**Source:** Convention — non-inline execution modes cannot handle user interaction.

### Check 8: Workflow Prompt Structure

**What to check:** Workflow prompts that spawn subagents follow the structured prompt format.

**How to check:**

1. Read each workflow file
2. Find subagent spawn instructions (prompts for agents, task descriptions)
3. Check for presence of these components: Role, Task, Onboarding, Perspective (optional), Success, Why

**Pass criteria:** Subagent prompts include at minimum: Role, Task, Onboarding, Success, and Why.

**Fail action:** Identify prompts missing components and list what is absent.

**Source:** Convention — structured prompts produce more reliable subagent behavior.

## README

### Check 9: README Exists

**What to check:** A `README.md` file exists in the skill root directory.

**How to check:**

1. List files in the skill root directory
2. Check for `README.md` (case-sensitive)

**Pass criteria:** `README.md` exists.

**Source:** Convention — README provides human-readable documentation for discovery and installation.

### Check 10: Install Command

**What to check:** README contains an install command.

**How to check:**

1. Read README.md
2. Search for an install command pattern, typically in a code block: `claude install-skill ...`

**Pass criteria:** An install command is present in a code block.

**Fail action:** Note the absence and suggest adding one.

**Source:** Convention — install instructions enable one-command setup.

### Check 11: Skill Description

**What to check:** README describes what the skill does in 2–4 sentences.

**How to check:**

1. Read README.md
2. Identify the introductory description (typically the first paragraph after the title)
3. Count sentences

**Pass criteria:** 2–4 sentences describing the skill's purpose and capabilities. Not a single sentence, not a full page.

**Source:** Convention — brief descriptions orient readers without overwhelming them.

### Check 12: References Table

**What to check:** README lists reference files in a table format.

**How to check:**

1. Read README.md
2. Search for a Markdown table listing reference files with their purposes

**Pass criteria:** A table exists with at minimum two columns (file name/path and purpose/description).

**Fail action:** Note the absence and suggest adding a references table.

**Source:** Convention — tables provide scannable overviews of skill contents.

### Check 13: Usage Examples

**What to check:** README contains 1–2 usage examples.

**How to check:**

1. Read README.md
2. Search for usage examples — code blocks showing how to invoke the skill, or natural-language example prompts

**Pass criteria:** 1–2 concrete usage examples present. Not zero, not more than 3.

**Source:** Convention — examples demonstrate invocation patterns better than descriptions.

### Check 14: No Placeholder Content

**What to check:** README contains no stub or placeholder content.

**How to check:**

1. Read README.md
2. Search for placeholder patterns: "TODO", "TBD", "FIXME", "Coming soon", "Lorem ipsum", "[placeholder]", "Description goes here", empty sections with only headers

**Pass criteria:** No placeholder content found. All sections contain real content.

**Fail action:** Identify each placeholder with its location.

**Source:** Convention — placeholder content signals an incomplete or abandoned skill.

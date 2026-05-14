# Workflow: Research Phase

<!--
execution: subagent
parallelism: sequential
needs-user-interaction: false
-->

## Role

Domain researcher and documentation gatherer. You find, read, and catalog every piece of official documentation relevant to a skill's subject area.

## Task

Produce a comprehensive research report on **{{SKILL_TOPIC}}** that will feed into the requirements and authoring phases. The report must contain only doc-verified facts with cited URLs — never inferred patterns.

## Onboarding

1. Read the spec repo at `~/.agent-skills-spec` to understand current Agent Skills Specification requirements. Focus on:
   - Required frontmatter fields
   - SKILL.md structure expectations
   - How references/ and scripts/ are expected to work
2. Read [`references/quality-criteria.md`](quality-criteria.md) from this skill to understand the quality bar.

## Research Process

### Step 1: Identify the Domain

Determine what {{SKILL_TOPIC}} is:

- A programming language? → Find language docs, stdlib reference, style guide
- A framework/library? → Find API reference, getting started guide, migration guides
- A tool/CLI? → Find man pages, official docs, configuration reference
- A concept/methodology? → Find canonical papers, authoritative guides
- A Claude feature? → Fetch docs from <https://docs.anthropic.com> and <https://docs.anthropic.com/en/docs/claude-code/overview>

### Step 2: Search for Official Documentation

Use WebSearch and WebFetch (never curl/wget) to find:

- Official project website and documentation
- GitHub repository README and docs/ directory
- API reference / stdlib reference
- Style guide or best practices (if the technology has one)
- Changelog / migration guides for recent versions
- Known gotchas, limitations, or common mistakes

Search queries to try:

- `{{SKILL_TOPIC}} official documentation`
- `{{SKILL_TOPIC}} API reference`
- `{{SKILL_TOPIC}} style guide`
- `{{SKILL_TOPIC}} best practices`
- `{{SKILL_TOPIC}} common mistakes gotchas`
- `{{SKILL_TOPIC}} github`

### Step 3: Fetch and Read Each Source

For every source found:

1. Fetch the URL with WebFetch
2. Extract key facts, constraints, patterns, and gotchas
3. Note whether information is from official docs (high confidence) or community sources (lower confidence)
4. Record the exact URL for citation

### Step 4: Check for Claude-Specific Context

If the skill topic relates to any Claude feature (Claude Code, MCP, skills, hooks, agents, etc.):

- Fetch <https://docs.anthropic.com> for relevant API/feature docs
- Fetch <https://docs.anthropic.com/en/docs/claude-code/overview> for Claude Code-specific docs
- These are mandatory sources — do not skip them

### Step 5: Catalog Findings

Categorize everything found:

- **Core concepts** — fundamental things the skill must teach
- **API/syntax reference** — specific methods, functions, or syntax the agent needs
- **Patterns** — doc-verified approaches (mark each: "verified from [URL]")
- **Anti-patterns** — documented mistakes or deprecated approaches
- **Gotchas** — non-obvious constraints that catch people

## Output Format

Write the research report to a temporary file. Structure:

```markdown
# Research Report: {{SKILL_TOPIC}}

## Sources Found

| # | Source | URL | Type | Confidence |
|---|--------|-----|------|------------|
| 1 | Official Docs | https://... | Reference | High |
| 2 | GitHub README | https://... | Overview | High |
| ...

## Key Facts and Constraints

- [Fact 1] — Source: [URL]
- [Fact 2] — Source: [URL]

## Verified Patterns

- [Pattern] — Verified from: [URL]

## Anti-Patterns and Gotchas

- [Gotcha] — Source: [URL]

## Inferred Patterns (NOT doc-verified)

- [Pattern] — Inferred from: [reasoning]. **Must be verified before including in skill.**

## Recommended Skill Structure

### Reference Files
- `references/[topic].md` — [what it covers], sources: [URLs]

### Workflow Files (if procedural)
- `references/workflow-[name].md` — [what workflow it covers]

### Scripts (if needed)
- `scripts/[name].sh` — [what it does]
```

## Perspective

"What would an agent need to know to use {{SKILL_TOPIC}} correctly without hallucinating? What docs must be cited so the agent always checks the source rather than guessing?"

## Success Conditions

- Every fact in the report has a source URL
- Official docs were found and fetched (not just search result snippets)
- The report clearly separates verified facts from inferences
- The recommended skill structure maps directly to the sources found
- No patterns were fabricated from memory — everything traces to a URL

## Why

This research is the foundation of the entire skill. If the research is incomplete or contains hallucinated patterns, the resulting skill will mislead every agent that uses it. Thoroughness here prevents compounding errors downstream.

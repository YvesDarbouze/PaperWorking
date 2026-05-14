---
name: rabbit-hole
description: >-
  Multi-agent investigation pipeline for deep research questions. Use when a question
  requires searching across multiple sources (codebase, web, docs, academic), synthesizing
  findings, and validating citations. Triggered by: "rabbit hole [topic]",
  "deep dive into [topic]", or any complex research question where a single search would be
  insufficient. Readonly — never modifies files. Always cites sources. Always validates citations.
metadata:
  context: fork
  user-invocable: true
---

# Rabbit Hole

Fan-out-in investigation pipeline. Separates territory-mapping (cheap, fast) from deep investigation (expensive, thorough). Forms a tree of inquiry — each node is a path of inquiry and its results.

**Readonly. Always cites. Always validates.**

## State Machine

```
START
  │
  ▼
TRIAGE ──── simple? ──── QUICK_ANSWER ──── END
  │
  complex
  │
  ▼
SCOUT (Wave 1: haiku, 1 agent)
  │ → ranked leads
  │
  ├── ≤2 obvious leads? ──── read directly, synthesize inline ──── REPORT
  │
  ▼
INVESTIGATE (Wave 2: inherited model, 1-3 parallel agents)
  │ → findings per branch
  │
  ▼
VALIDATE & SYNTHESIZE (Wave 3: inherited model, 1 agent)
  │ → validated findings + synthesis
  │
  ▼
REPORT ──── user decides: done | go deeper on branch X
```

**One user interrupt**: at REPORT. Everything else is automatic.

## Orchestration Protocol

You are the orchestrator. Follow this protocol exactly.

### Phase 0: TRIAGE

Evaluate the user's question:

1. **Can you answer it directly** from your training data with high confidence? → Answer directly as QUICK_ANSWER. No agents needed.
2. **Does it require looking at 1-2 specific files or a single search?** → Do it yourself, no agents needed.
3. **Does it require multiple sources, cross-referencing, or deep investigation?** → Proceed to SCOUT.

If proceeding, tell the user:

```
Entering rabbit hole: [topic]
Scouting for leads...
```

### Phase 1: SCOUT (Wave 1)

Launch **one** Task agent with these parameters:

- `subagent_type`: `Explore`
- `model`: `haiku`
- `description`: `Scout leads for: [topic]`

**Scout agent prompt template:**

```
You are a research scout. Your ONLY job is to find WHERE relevant information lives — not to analyze it.

QUESTION: [user's question]

Search for leads using all available tools: Grep, Glob, Read, WebSearch, exa.
Cast a wide net. Check:
- Local codebase (if question is about code)
- Official documentation
- Web sources
- Academic sources (if applicable)

Return a JSON array of leads, ranked by likely relevance (most relevant first):

```json
[
  {
    "source_type": "local_file | official_docs | web_article | academic | api_docs | community",
    "path_or_url": "exact path or URL",
    "relevance_reason": "1 sentence on why this lead matters",
    "confidence": "high | medium | low"
  }
]
```

Rules:

- Find 3-15 leads. More is better than fewer at this stage.
- DO NOT analyze or summarize content. Just locate it.
- DO NOT read entire files. Skim headers, function names, first lines.
- Prefer specific files/URLs over broad directories.
- Include the source_type so investigators know how to approach each lead.

```

**After Scout returns**, evaluate the leads:

- **≤2 high-confidence leads**: Read them yourself, synthesize inline, skip to REPORT.
- **3+ leads**: Cluster by topic, proceed to INVESTIGATE.

### Phase 2: INVESTIGATE (Wave 2)

Cluster the scout's leads by topic/theme (2-4 clusters). Launch **1-3 parallel** Task agents:

- `subagent_type`: `general-purpose`
- `model`: inherited (do not specify — uses conversation model)
- `description`: `Investigate: [cluster topic]`

**Investigator agent prompt template:**

```

You are a research investigator. Thoroughly examine the sources assigned to you and extract findings relevant to the original question.

ORIGINAL QUESTION: [user's question]

YOUR ASSIGNED LEADS:
[paste the lead cluster as JSON]

For each lead:

1. Read/fetch the full content
2. Extract claims relevant to the question
3. Note the exact source (file path + line, URL, paper title)
4. Assess confidence based on source quality

Return your findings as JSON:

```json
{
  "branch": "[cluster topic name]",
  "findings": [
    {
      "claim": "What was found",
      "evidence": "Key quote or data point supporting the claim",
      "source": "Exact file:line or URL",
      "source_type": "local_file | official_docs | web_article | academic | api_docs | community",
      "confidence": "high | medium | low"
    }
  ],
  "depth_potential": "What remains unexplored in this branch, if anything"
}
```

Rules:

- Every claim MUST have an exact source. No unsourced claims.
- Read the actual content. Do not guess or infer from titles.
- If a lead turns out to be irrelevant, skip it — do not force findings.
- Note contradictions between sources.
- "confidence" reflects both source tier and evidence strength.

```

Launch investigator agents **in parallel** using multiple Task tool calls in a single message.

### Phase 3: VALIDATE & SYNTHESIZE (Wave 3)

After all investigators return, launch **one** Task agent:

- `subagent_type`: `general-purpose`
- `model`: inherited
- `description`: `Validate and synthesize findings`

**Validator-Synthesizer agent prompt template:**

```

You are a research validator and synthesizer. Your job is to verify citations, rank sources, and produce a coherent synthesis.

ORIGINAL QUESTION: [user's question]

INVESTIGATOR FINDINGS:
[paste all investigator outputs as JSON]

## Step 1: Validate Citations

Run the validation script on all cited sources. Construct a JSON array of all sources:

```json
[
  { "type": "file", "path_or_url": "/path/to/file", "claim": "what was claimed" },
  { "type": "url", "path_or_url": "https://...", "claim": "what was claimed" }
]
```

Then run:

```bash
echo '<the JSON array>' | python3 [SKILL_DIR]/scripts/validate_sources.py
```

Mark each source as ✓ (valid), ? (unverified/timeout), or ✗ (broken/not_found).

## Step 2: Load Research Hierarchy

Read the file: [SKILL_DIR]/references/research-hierarchy.md

Apply the tier definitions and confidence mapping to each finding.

## Step 3: Synthesize

Produce a synthesis with these sections:

1. **Convergence**: What findings agree across branches? (strongest claims)
2. **Divergence**: Where do branches disagree? Apply conflict resolution rules from the hierarchy.
3. **Gaps**: What claims were made but not well-supported? What remains uninvestigated?
4. **Status**: How close are we to a complete answer? What would going deeper yield?

Return your output as structured markdown following this format:

### Validated Findings

For each finding across all branches:

- Claim: [claim text]
- Source: [path/URL] [✓|?|✗]
- Tier: [1|2|3]
- Confidence: [high|medium|low]

### Convergence

[What agrees across branches]

### Divergence

[Conflicts with trust context from hierarchy]

### Gaps

[What's missing or weakly supported]

### Status

[Assessment of completeness. What going deeper on specific branches would yield.]

```

**IMPORTANT**: Replace `[SKILL_DIR]` in the prompt with the actual skill directory path: the directory containing this SKILL.md file. To find it, the path is wherever this skill is installed. Use the Read tool to check: it will be something like `~/.claude/skills/rabbit-hole`.

### Phase 4: REPORT

Format the validator's output into the final report format (see Output Format below). Present to the user.

After presenting the report, offer:

```

What would you like to do?

- "Go deeper on [branch name]" — re-enters the pipeline scoped to that branch
- "Done" — end investigation

```

## Go Deeper Protocol

When the user asks to go deeper on a branch:

1. Reformulate the question: original question + branch context + "what remains unexplored" from the report
2. Re-enter the pipeline at SCOUT with this refined question
3. The scout should focus specifically on the unexplored areas identified
4. Continue through INVESTIGATE → VALIDATE → REPORT as normal

## Output Format

```markdown
## Rabbit Hole: [topic]

### Tree

#### Branch: [topic]
- **Finding**: [claim]
  - **Confidence**: high|medium|low
  - **Sources**: [✓ path/URL] [? unverified] [✗ broken]
- **Finding**: [next claim]
  - ...
- **Go deeper?**: [what remains unexplored]

#### Branch: [next topic]
- ...

### Synthesis
- **Converges on**: [strongest agreed-upon claims]
- **Conflicts**: [disagreements with source trust context]
- **Gaps**: [what's missing or weakly supported]

### Status
[How close to full understanding. What going deeper would look like.]
```

## Short-Circuit Conditions

Apply at every boundary — do less when less is needed.

1. **After TRIAGE**: Question answerable without agents? → Answer directly.
2. **After SCOUT**: ≤2 clear leads? → Read them inline, synthesize, skip to REPORT.
3. **After INVESTIGATE**: All branches empty/irrelevant? → Report dead end with what was checked.

## Scripts

### [`scripts/validate_sources.py`](scripts/validate_sources.py)

Deterministic citation validator. Run by the Validator-Synthesizer agent.

- **Input**: JSON via stdin — `[{ "type": "file"|"url", "path_or_url": "...", "claim": "..." }]`
- **Output**: JSON to stdout — `[{ "source": "...", "status": "valid"|"broken"|"redirect"|"timeout"|"not_found", "details": "..." }]`
- Stdlib only. No dependencies. Safe, readonly.

### [`references/research-hierarchy.md`](references/research-hierarchy.md)

Source ranking rules loaded by the Validator-Synthesizer before synthesis. Contains tier definitions, conflict resolution rules, and domain-specific guidance.

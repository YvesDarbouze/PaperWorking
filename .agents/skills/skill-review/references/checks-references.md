# Reference File Quality Checks

Validate reference files for topic coherence, citation quality, URL reachability, and self-containment.

**Sources:**

- Agent Skills Specification: <https://agentskills.io/specification>
- Anthropic Best Practices: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>

## Check 1: URL Reachability

**What to check:** Every URL in every reference file resolves to reachable content.

**How to check:**

1. Scan all files in `references/` for URLs (patterns matching `http://` or `https://`)
2. Also scan SKILL.md and README.md for URLs
3. For each unique URL, use WebFetch to attempt retrieval
4. Record the result: reachable (returns content) or unreachable (error, timeout, redirect to error page)

**Pass criteria:** All URLs return content via WebFetch. Report each URL tested and its status.

**Fail action:** List every unreachable URL with the file it appears in and the line number if possible.

**Source:** Convention — reference files that cite URLs must cite working URLs; dead links degrade trust and utility.

## Check 2: Claims Cite Sources

**What to check:** Every claim about external technology, specification rules, or third-party behavior includes a source URL.

**How to check:**

1. Read each reference file
2. Identify factual claims about external systems (API behavior, spec requirements, tool capabilities)
3. For each claim, check whether a URL accompanies it (inline link, footnote, or "Source:" annotation)

**Pass criteria:** Every factual claim about external technology has a corresponding URL.

**Fail action:** List each uncited claim with the file and approximate location.

**Source:** Convention — anti-hallucination guardrail; agents consuming reference files must be able to verify claims.

## Check 3: Verification Instructions

**What to check:** Reference files instruct the consuming agent to verify information against cited URLs, not to trust the file blindly.

**How to check:**

1. Read each reference file
2. Look for instructions directing the agent to follow, fetch, or verify URLs (e.g., "Verify against...", "Fetch the latest from...", "Confirm at...")
3. A single verification instruction per file is sufficient if it applies broadly

**Pass criteria:** Each reference file that contains URLs also contains at least one instruction directing the consuming agent to verify information against those URLs.

**Fail action:** Identify reference files that cite URLs but never instruct verification.

**Source:** Convention — agents should not treat skill reference files as infallible; verification instructions create a self-correcting loop.

## Check 4: Topic Coherence

**What to check:** Each reference file covers one coherent topic, not a mix of unrelated concerns.

**How to check:**

1. Read each reference file
2. Identify the primary topic from the heading or first paragraph
3. Scan the remaining content — does everything relate to that topic?
4. Flag files that cover multiple unrelated topics (e.g., a file about "script standards" that also covers "README format")

**Pass criteria:** Each reference file has a single identifiable topic. All content relates to that topic.

**Fail action:** Identify files with mixed topics and suggest how to split them.

**Source:** <https://agentskills.io/specification#references> ("Keep individual reference files focused")

## Check 5: Official Docs Availability Disclosure

**What to check:** If official documentation for a technology is unavailable, the reference file states this explicitly rather than silently omitting sources.

**How to check:**

1. Read each reference file
2. Identify any technology or tool discussed without a citation
3. Check whether the file explicitly states that official docs are unavailable, limited, or could not be found

**Pass criteria:** No technology is discussed without either (a) a cited URL or (b) an explicit statement that official documentation is unavailable.

**Source:** Convention — transparency about source availability prevents agents from treating uncited claims as authoritative.

## Check 6: Reference Depth

**What to check:** File references from SKILL.md go one level deep — SKILL.md points to reference files, but reference files do not chain to other reference files.

**How to check:**

1. Read SKILL.md and identify all file references (links to files in `references/`, `scripts/`, etc.)
2. Read each referenced file
3. Check whether those files in turn reference other files in the skill directory (internal cross-references)
4. Cross-references for context (e.g., "see also checks-spec.md") are acceptable. Chain references where File A says "load File B for the actual content" are not.

**Pass criteria:** No reference file delegates its core content to another reference file. All file references from SKILL.md are one level deep.

**Fail action:** Identify chain references and suggest inlining the content or restructuring.

**Source:** <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> ("Keep references one level deep from SKILL.md")

## Check 7: Self-Containment

**What to check:** Each reference file is self-contained for its topic — an agent reading just that file gets a complete picture of the topic without needing to read other files.

**How to check:**

1. Read each reference file in isolation
2. Ask: does this file provide enough context for an agent to act on its topic?
3. Check for undefined terms, unexplained acronyms, or instructions that only make sense if another file was read first

**Pass criteria:** Each reference file can be understood and acted upon in isolation for its stated topic.

**Fail action:** Identify files that require reading other files to be useful, and suggest what context to add.

**Source:** <https://agentskills.io/specification#references> ("Keep individual reference files focused") and progressive disclosure principle — files loaded on demand must work on their own.

# Research Hierarchy

Source ranking rules for the Validator-Synthesizer agent. Load this before synthesis.

## Tier Definitions

### Tier 1 — Primary (Ground Truth)

Sources that ARE the thing being investigated.

| Domain | Primary Sources |
|--------|----------------|
| Code behavior | Local source files, test files, type definitions |
| API behavior | Official API docs, OpenAPI specs, SDK source |
| Academic | Peer-reviewed papers, preprints on arXiv/bioRxiv |
| Standards | RFCs, W3C specs, ECMA specs, language specs |
| Configuration | Config files, env files, CI/CD definitions |

### Tier 2 — Secondary (Authoritative Interpretation)

Sources that explain or document the thing.

| Domain | Secondary Sources |
|--------|------------------|
| Code behavior | Official docs, README, CHANGELOG, inline comments, commit messages |
| API behavior | Official tutorials, migration guides, blog posts by maintainers |
| Academic | Review articles, meta-analyses, textbook chapters |
| Standards | MDN Web Docs, caniuse.com, language reference sites |
| Configuration | Official setup guides, documented examples |

### Tier 3 — Tertiary (Community Knowledge)

Sources that discuss or interpret the thing.

| Domain | Tertiary Sources |
|--------|-----------------|
| Code behavior | Stack Overflow, blog posts, GitHub issues/discussions |
| API behavior | Community tutorials, Medium posts, dev.to articles |
| Academic | Wikipedia, lecture notes, popular science articles |
| Standards | Forum discussions, compatibility tables from community |
| Configuration | Blog walkthroughs, "how I configured X" posts |

## Conflict Resolution

When sources at different tiers disagree:

### Tier 1 vs Tier 2

**Tier 1 wins.** The code IS the behavior; docs describe intended behavior. Note the discrepancy — it may indicate a bug or outdated docs.

### Tier 1 vs Tier 3

**Tier 1 wins.** Community sources may be outdated, context-specific, or wrong. Discard the Tier 3 claim and note it was contradicted by primary evidence.

### Tier 2 vs Tier 3

**Tier 2 wins by default**, but flag when multiple independent Tier 3 sources agree against a single Tier 2 source — this pattern often indicates outdated docs or undocumented behavior changes.

### Same-tier conflicts

When sources at the same tier disagree:

1. **Recency**: newer source wins (check dates)
2. **Specificity**: more specific source wins (e.g., API changelog > general docs)
3. **Independence**: if multiple independent sources agree, they collectively outweigh a single dissenter
4. **Flag as unresolved** if none of the above disambiguates

## Confidence Mapping

| Evidence Pattern | Confidence |
|-----------------|------------|
| Tier 1 confirms, no contradictions | **high** |
| Tier 1 + Tier 2 agree | **high** |
| Tier 2 only, multiple sources agree | **medium** |
| Single Tier 2 source, no contradictions | **medium** |
| Tier 3 only, multiple sources agree | **low** |
| Any tier conflict unresolved | **low** |
| Single Tier 3 source only | **low** |

## Domain-Specific Guidance

### Code Investigation

- A local file is ground truth for "what the code does" but NOT for "what the code should do"
- Test files are primary for "expected behavior" — they encode developer intent
- Git blame/log are secondary for "why the code changed"

### API / Library Investigation

- Official docs are primary for "how to use" but secondary for "how it actually works under the hood"
- Source code (if available) is primary for implementation behavior
- Deprecation notices in docs override any community examples still using old APIs

### Web / General Knowledge

- Apply standard journalistic source evaluation: who published it, when, what's their expertise
- .gov, .edu, and established institution domains get slight trust boost within their domain
- Recency matters more for technology topics than for conceptual/theoretical ones

### Academic Investigation

- Systematic reviews and meta-analyses outrank individual studies
- Sample size and methodology quality matter — note these when available
- Preprints are Tier 1 for recency but Tier 2 for rigor (not yet peer-reviewed)

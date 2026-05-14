# Waypoint Reader Workflow

A reconnaissance workflow for cataloguing and validating existing waypoint pipelines.
Do not create, modify, or place waypoints — only observe and report.

## Input

One of:

- A pipeline name (e.g., "sourcemap-upload") — report that specific pipeline
- "all" or no specific name — report every pipeline found
- "validate" with an optional pipeline name — check for drift and stale IDs

## Discovery Process

1. **Find manifests:** Glob `.ai/waypoints/*.md` for pipeline manifest files
2. **Read each manifest:** Extract the table of waypoints, their files, roles, and topology
3. **Verify presence:** For each waypoint ID in a manifest, grep the codebase for `Waypoint <id>` to confirm the comment block exists in the expected file
4. **Flag drift:** Report any IDs present in a manifest but missing from files, or vice versa

## Output Format

For each pipeline, return this exact structure:

```markdown
## <pipeline-name>

<opening narrative sentence from manifest — the full-flow description>

| Waypoint | File | Role |
|----------|------|------|
| `<id>`   | <path relative to git root> | <role> |

### Topology

<topology graph from manifest>
```

When validating, append:

```markdown
### Health

- <number> waypoints verified
- Stale: <list of IDs missing from files, or "none">
- Orphaned: <list of IDs in files but missing from manifest, or "none">
```

When reporting multiple pipelines, separate each with `---`.

## Constraints

- Return the structured output and nothing else
- Do not suggest improvements or changes to waypoints
- Do not read file contents beyond confirming waypoint block presence
- Paths are always relative to git root

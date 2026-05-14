# Waypoint Scribe Workflow

A polishing workflow that rewrites the human-readable text in waypoint comment blocks
for clarity and warmth. Edits text only — IDs, paths, symbols, and structural framing
are immutable.

## Input

One of:

- A pipeline name (e.g., "sourcemap-upload") — polish that pipeline's blocks
- "all" — polish every waypoint block in the repo
- A file path — polish the waypoint block in that specific file

## Process

1. **Load voice**: Read [`references/waypoint-voice.md`](waypoint-voice.md) and internalize the principles.
2. **Find blocks**: Grep the codebase for `Waypoint` (with trailing space) to locate all waypoint comment blocks. If a pipeline name was given, filter to blocks matching that pipeline name.
3. **Read each block**: For each block, identify:
   - The role description (first line after the header)
   - Each relationship description (the `— <text>` after neighbor references)
   - The closing lines (legend and search hint)
4. **Rewrite text**: Apply the voice principles to each text element:
   - Role descriptions: verb-first, active voice, with purpose ("so that…"), under 80 characters
   - Relationship descriptions: verb-first from the neighbor's perspective, under 60 characters
   - Closing: ensure the legend line and search hint are present and match the template
5. **Edit in place**: Replace only the text portions. Preserve:
   - The `──` delimiter framing
   - Waypoint IDs (8-character hex strings)
   - File paths
   - Arrow symbols (`←`, `→`, `◁`, `▷`)
   - The `Map:` line path
   - Native comment syntax wrapping

## Closing Template

Every waypoint block ends with two closing lines. Ensure they match this format,
using the file's native comment syntax:

```
── ← from · → into · ◁ reads from · ▷ feeds into
── search any ID to trace this pipeline across files.
```

Include only the symbols that appear in the block. If a block uses only `←` and `→`,
the legend line omits `◁` and `▷`:

```
── ← from · → into
── search any ID to trace this pipeline across files.
```

## Also Polish the Manifest

After polishing per-file blocks, read the pipeline manifest at
`.ai/waypoints/<pipeline-name>.md` and polish:

1. **Opening sentence**: The first line after the heading should walk through the pipeline's stages in order, naming what happens and why. Apply the "so that…" test.
2. **Role column**: Role descriptions in the manifest table should match the per-file blocks.

## Output

After polishing, report a summary:

```markdown
## Polished: <pipeline-name>

- Blocks edited: <count>
- Manifest updated: yes/no

### Sample before → after

**<file path>**
- Role: "<before>" → "<after>"
- Neighbor: "<before>" → "<after>"
```

Show at most three representative transformations.

## Constraints

- Edit only human-readable text. IDs, paths, symbols, and structural framing are immutable.
- Match the voice reference. When uncertain, prefer warmth and purpose.
- Keep role descriptions under 80 characters and relationship descriptions under 60 characters.
- Every role description must carry its purpose — apply the "so that…" test.
- Preserve the file's native comment syntax exactly as found.
- The closing legend and search hint are the same across all blocks in a pipeline — verify consistency.

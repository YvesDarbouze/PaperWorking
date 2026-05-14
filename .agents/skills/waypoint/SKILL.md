---
name: waypoint
description: >-
  Distributed navigation system for multi-file pipelines and processes.
  Creates compact, grep-friendly waypoint markers that orient readers within
  complex cross-file workflows — each file carries its own ID, role, adjacent
  nodes, and a pointer to the full map. Use when asked to "point me to",
  "where does X begin/end", "map this pipeline", "add waypoints", "trace
  this process", or when working with processes spanning many files that need
  discoverability without centralized documentation that drifts.
---

# Waypoint

Waypoints are distributed navigation markers for multi-file pipelines. Each
file carries a compact comment block with its ID, role, neighbors, and a
pointer to the full map. One manifest per pipeline holds the complete topology.

## ID Generation

Each waypoint ID is the first 8 hex characters of the SHA-256 hash of the
file's path relative to the git root.

```bash
python3 <skill-path>/scripts/waypoint_id.py <path> [path...]
```

Output: `a1b2c3d4  path/to/file`

IDs are deterministic — same path always yields the same ID. When a file
moves, its ID changes, signaling that the manifest and referencing nodes
need updating.

## Creating a Waypoint Map

1. Identify all files in the pipeline and their execution order.
2. Generate IDs for each file using the script.
3. Write the manifest to `.ai/waypoints/<pipeline-name>.md`.
4. Add waypoint comment blocks to each file.

### Manifest Format

```markdown
# <pipeline-name>

<Single sentence describing the full flow — what it does and why, naming
each major stage so a reader who has never seen this pipeline can understand
its shape and purpose at a glance.>

| Waypoint   | File                        | Role                    |
|------------|-----------------------------|-------------------------|
| `a1b2c3d4` | path/to/first               | triggers the pipeline   |
| `e5f6a7b8` | path/to/second              | passes config to build  |
```

The opening sentence is the most important line in the manifest. It orients
every reader who opens this file. Write it as a single sentence that walks
through the pipeline's stages in order, naming what happens at each stage
and why it matters. Apply the same "so that…" test used for role descriptions:
if the purpose of a stage would be lost without it, include it.

For branching pipelines, add a topology section showing the graph:

```markdown
## Topology

a1b2c3d4 → e5f6a7b8 → [c9d0e1f2, d3e4f5a6] → f7a8b9c0
```

### Per-File Comment Block

Use the file's native comment syntax. The block is framed with `──` delimiters
to stand out from regular comments. Two closing lines orient first-time readers:
a legend explaining the arrow symbols, and a search hint for navigation.

```
── Waypoint <id> ── <pipeline-name> ──────────────────────
   <this file's role — verb-first, active voice, with purpose>
   ← <id>  <path> — <predecessor's role>
   → <id>  <path> — <successor's role>
   Map: .ai/waypoints/<pipeline-name>.md
── ← from · → into
── search any ID to trace this pipeline across files.
```

The legend line includes only the symbols present in the block. When a block
also uses reference symbols, expand the legend accordingly:

```
── ← from · → into · ◁ reads from · ▷ feeds into
── search any ID to trace this pipeline across files.
```

Branching nodes have multiple `←` or `→` lines:

```
── Waypoint dd2c0eb6 ── sourcemap-upload ─────────────────
   runs the rspack build and uploads sourcemaps to Sentry and Datadog so error tracking resolves to source
   ← 4263ae66  docker-compose.ci.yml — passes the release version into this build
   → 80e5dc26  config/rspack/browser/browser.plugins.ts — uploads browser sourcemaps to Sentry
   → 7d21fe68  config/rspack/server/server.plugins.ts — uploads server sourcemaps to Sentry
   → bea8ab9f  upload-dd-source-maps.sh — uploads sourcemaps to Datadog
   Map: .ai/waypoints/sourcemap-upload.md
── ← from · → into
── search any ID to trace this pipeline across files.
```

### Reference Relationships

Some nodes consume pipeline values at runtime without participating in the
build/deploy flow. These are **sinks** — they read from the pipeline but
don't push it forward.

| Symbol | Meaning |
|--------|---------|
| `←`/`→` | **Flow** — sequential execution, runs before/after |
| `◁`/`▷` | **Reference** — reads from / feeds into, no execution ordering |

Sinks declare their sources with `◁`. Sources optionally declare known
consumers with `▷` when knowing about them helps maintainers avoid breaking
changes.

```
── Waypoint 7bcd0980 ── sourcemap-upload ─────────────────
   reads the release version at runtime for Datadog RUM
   ◁ dd2c0eb6  Dockerfile — bakes the release version into the image
   ◁ 2cc6a42e  jenkins/common.groovy — sets the Datadog deployment marker
   Map: .ai/waypoints/sourcemap-upload.md
── ◁ reads from
── search any ID to trace this pipeline across files.
```

#### Placement

- Top of file for configs, scripts, manifests, and pipeline-specific files.
- Above the relevant code section for source files where the pipeline
  touches a specific function or block.

## Maintaining Waypoints

**File moved:** re-derive its ID, update the manifest, update `←`/`→`
references in adjacent nodes.

**Node added or removed:** update the manifest and the `←`/`→` pointers
of its neighbors.

**Validation:** grep for waypoint IDs in the manifest and confirm each
appears in exactly one file. Stale IDs (present in comments but absent
from the manifest, or vice versa) indicate drift.

```bash
python3 <skill-path>/scripts/validate_waypoints.py
```

The script scans all manifests in `.ai/waypoints/`, verifies each waypoint
ID appears in the expected file, and reports orphaned blocks not in any
manifest. Exits 0 if clean, 1 if drift is detected.

## Navigating Waypoints

- **Find a pipeline's entry point:** open `.ai/waypoints/<name>.md`, first row.
- **Find all waypoints in the repo:** search for `Waypoint` in your editor.
- **Trace from any node:** follow `→` forward or `←` backward — each
  pointer includes the file path and role.
- **Find all references to a node:** grep for its 8-char ID.

## Writing Voice

Waypoint text is written for someone encountering the system for the first time.
The voice guide at [`references/waypoint-voice.md`](references/waypoint-voice.md) defines the principles:
concrete over abstract, active over passive, orient-first, purpose over
mechanics, self-evident, warm over telegraphic. Load the reference before
writing or polishing waypoint text.

## Workflows

Three workflows handle waypoint work in focused phases. Each workflow is
dispatched as a subagent via the **Agent tool** — the workflow reference file
content becomes the subagent's system prompt.

- **Setter** ([`references/workflow-setter.md`](references/workflow-setter.md)) — Trace a process across files
  and place waypoint markers. Spawn when asked to "add waypoints", "trace this
  pipeline", or "map this process". **After the setter completes, always spawn
  a scribe subagent** to polish the placed descriptions.
- **Reader** ([`references/workflow-reader.md`](references/workflow-reader.md)) — Catalogue and validate existing
  waypoint pipelines. Spawn when asked to "list waypoints", "show pipelines",
  or "check for drift".
- **Scribe** ([`references/workflow-scribe.md`](references/workflow-scribe.md)) — Polish waypoint descriptions
  for clarity and warmth. Automatically spawned after every setter run; can
  also be spawned standalone when descriptions feel terse or unclear.

### Dispatching a workflow

Read the workflow reference file and pass its content as the subagent's prompt:

```
Agent tool:
  subagent_type: general-purpose
  prompt: <content of the workflow reference file + the user's direction>
```

For setter runs, chain two subagents sequentially:

1. Spawn the **setter** subagent with the user's direction.
2. When it completes, spawn the **scribe** subagent targeting the pipeline
   the setter just placed.

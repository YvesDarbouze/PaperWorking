# waypoint

Distributed navigation markers for multi-file pipelines and processes. Each file carries a compact comment block with its ID, role, neighbors, and a pointer to the full map — so the topology is discoverable from any node without centralized documentation that drifts.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/waypoint/` into `~/.claude/skills/waypoint/`.

## Usage

```
/waypoint trace the deployment pipeline from CI through Helm
/waypoint add waypoints for how feature flags propagate to components
/waypoint check for drift in the sourcemap-upload pipeline
```

## What it does

- Generates deterministic waypoint IDs from file paths (SHA-256, first 8 hex chars)
- Places grep-friendly comment blocks in each file with role, neighbors, and map pointer
- Maintains a manifest per pipeline in `.ai/waypoints/`
- Validates waypoints against manifests to detect drift

## When to use this

Use it when a process spans many files and the connections between them are hard to trace — deployment pipelines, data flows, feature flag propagation, anything where "how does this get from A to B?" is a recurring question. Waypoints make the topology discoverable from any file in the chain, without relying on external diagrams that inevitably fall out of sync.

Not useful for single-file scripts or processes that are already obvious from the directory structure.

## Workflows

| Workflow | Reference | Trigger |
|----------|-----------|---------|
| **Setter** | [`references/workflow-setter.md`](references/workflow-setter.md) | "add waypoints", "trace this pipeline", "map this process" |
| **Reader** | [`references/workflow-reader.md`](references/workflow-reader.md) | "list waypoints", "show pipelines", "check for drift" |
| **Scribe** | [`references/workflow-scribe.md`](references/workflow-scribe.md) | Runs automatically after setter; polishes descriptions |

## Scripts

| Script | Purpose |
|--------|---------|
| [`scripts/waypoint_id.py`](scripts/waypoint_id.py) | Generate waypoint IDs from file paths |
| [`scripts/validate_waypoints.py`](scripts/validate_waypoints.py) | Validate manifests against actual file contents |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`waypoint.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/waypoint.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

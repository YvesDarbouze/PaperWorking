# Phase 5 + 6: Present and Save

Output the final visualization, collect user feedback, persist the artifact.

## Entry Conditions

Phase 4 (Verify) complete. The visualization has passed both structural and visual
verification on the second draft.

## Produce Final Output

**Vega charts:** Copy `assets/vega/wrapper.html`, inject the `.vg.json` spec. Add HTML
comment frontmatter (name, description, chart-type, project, created). Embed data inline.

**D3 charts:** Generate standalone HTML following [base-template.md](base-template.md). Add frontmatter.
Embed data inline. Include all styles inline.

**Dashboard mode:** Multiple Vega specs in a single HTML file — call `vegaEmbed` multiple
times with distinct container selectors (`#chart-1`, `#chart-2`).

## Present to User

1. **Restate the argument:** "This visualization shows that ___."
2. **Summarize encoding:** which data mapped to which channels, and why
3. **Note accessibility:** OpenColors palette, redundant encoding, data table fallback
4. **Acknowledge limitations:** what the visualization does not show, what was simplified

## User Review Checkpoint

| User Feedback | Route To |
|---------------|----------|
| "Change the chart type" | Phase 2: Research |
| "Fix the layout" / "move this" | Phase 3: compose |
| "Add annotations" / "improve title" | Phase 3: narrate |
| "Make it interactive" / "add filtering" | Phase 3: interact |
| "Something feels off" / "make clearer" | Phase 4: Verify |
| "Looks good, save it" | Save (below) |

## Save

1. Save to `${CLAUDE_PROJECT_DIR}/.claude/visualizations/viz-<timestamp>.html`
2. If Python 3 available: `python3 scripts/visualizer.py create --file <path>`
3. If not: the saved file is the final artifact

| CLI Command | Purpose |
|-------------|---------|
| `create --file <path>` | Save and register |
| `list [--type] [--project]` | List stored |
| `search <query>` | Search all fields |
| `show <id>` | View details |
| `delete <id> --force` | Remove |

## Exit

Visualization saved and user confirmed. Workflow complete.

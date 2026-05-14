# Report Template

Use this template for the review report output. Replace all `{{placeholders}}` with actual values. Remove the template instructions (lines starting with `>`) in the final output.

---

```markdown
# Review Report: {{skill-name}}

## Summary

**{{PASS|FAIL}}** — {{X}}/{{Y}} check groups passed

> State the overall verdict and the score. If any check group failed, the overall verdict is FAIL.

## Results

### Spec Compliance: {{PASS|FAIL}}
> List each sub-check from checks-spec.md with its result.
- `name` format: {{PASS|FAIL}} — {{actual value and details}}
- `name` matches directory: {{PASS|FAIL}}
- `description` presence: {{PASS|FAIL}} — {{actual character count}}/1024
- `description` voice: {{PASS|FAIL}} — {{details if failed}}
- `description` triggers: {{PASS|FAIL}} — {{WHAT and WHEN identified or missing}}
- Body content: {{PASS|FAIL}}
- No `.skill` file: {{PASS|FAIL}}
- No XML tags: {{PASS|FAIL}}
- Optional fields: {{PASS|FAIL|N/A}}

### Reference Quality: {{PASS|FAIL}}
> List each reference file and its check results.
- Topic coherence: {{details per file}}
- Claims cite sources: {{details}}
- Verification instructions: {{details per file}}
- Self-containment: {{details per file}}
- Official docs disclosure: {{details}}
- Reference depth: {{PASS|FAIL}} — {{details}}

### URL Reachability: {{PASS|FAIL}}
> List every URL checked with its status.
- `{{URL}}` — {{reachable|unreachable}} (found in {{file}})
- `{{URL}}` — {{reachable|unreachable}} (found in {{file}})
> Continue for all URLs.

### Progressive Disclosure: {{PASS|FAIL}}
- SKILL.md line count: {{N}}/500
- Details in references: {{PASS|FAIL}} — {{details}}
- Conditional loading: {{PASS|FAIL}} — {{pattern described}}
- Reference self-containment: {{PASS|FAIL}}

### Workflow Files: {{PASS|FAIL|N/A}}
> If no workflow files found, output: "No workflow files found — N/A"
- Execution metadata: {{details per workflow}}
- User interaction marking: {{details}}
- Prompt structure: {{details}}

### Task Tracking: {{PASS|FAIL|N/A}}
> If fewer than 3 procedural steps, output: "Fewer than 3 procedural steps — N/A"
- Procedural step count: {{N}}
- Task tracking instruction: {{present|absent}}

### Script Standards: {{PASS|FAIL|N/A}}
> If no scripts/ directory found, output: "No scripts found — N/A"
> Otherwise list each script and its check results.
- `{{script-name}}`:
  - Shebang: {{PASS|FAIL}}
  - Strict mode: {{PASS|FAIL}}
  - Announce before acting: {{PASS|FAIL}}
  - Non-destructive: {{PASS|FAIL}}
  - Errors to stderr: {{PASS|FAIL}}
  - Exit non-zero: {{PASS|FAIL}}
  - No interactive prompts: {{PASS|FAIL}}
  - Idempotent: {{PASS|FAIL}}
  - No pipe-to-shell: {{PASS|FAIL}}
  - Variable quoting: {{PASS|FAIL}}

### README: {{PASS|FAIL}}
- Exists: {{PASS|FAIL}}
- Install command: {{PASS|FAIL}}
- Description (2-4 sentences): {{PASS|FAIL}}
- References table: {{PASS|FAIL}}
- Usage examples: {{PASS|FAIL}} — {{count}} found
- No placeholders: {{PASS|FAIL}}

## Fixes Required

> Numbered list of required fixes. Each fix specifies the file path and exactly what to change.
> Only include fixes for FAIL results.

1. **{{file-path}}**: {{what to change and why}}
2. **{{file-path}}**: {{what to change and why}}

## Fixes Recommended (Optional)

> Non-blocking suggestions for improvement. These do not affect the pass/fail verdict.
> Omit this section entirely if there are no recommendations.

1. **{{file-path}}**: {{suggestion}}
```

# Spec Compliance Checks

Validate frontmatter fields and SKILL.md body against the Agent Skills Specification and Anthropic best practices.

**Sources:**

- Agent Skills Specification: <https://agentskills.io/specification>
- Anthropic Best Practices: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>

## Check 1: `name` Field Format

**What to check:** The `name` field in YAML frontmatter.

**How to check:**

1. Parse the YAML frontmatter from SKILL.md
2. Extract the `name` value
3. Apply each constraint below

**Pass criteria — all must be true:**

- Field is present and non-empty
- 1–64 characters in length (report actual length)
- Contains only lowercase alphanumeric characters and hyphens (`a-z`, `0-9`, `-`)
- Does not start with a hyphen
- Does not end with a hyphen
- Does not contain consecutive hyphens (`--`)
- Does not contain reserved words: `anthropic`, `claude` (as standalone segments or substrings)

**Fail examples:**

- `PDF-Processing` — uppercase not allowed
- `-pdf` — starts with hyphen
- `pdf--processing` — consecutive hyphens
- `claude-helper` — contains reserved word `claude`

**Source:** <https://agentskills.io/specification#name-field>

## Check 2: `name` Matches Directory

**What to check:** The `name` field value matches the parent directory name exactly.

**How to check:**

1. Read the `name` field from frontmatter
2. Read the parent directory name of SKILL.md
3. Compare — they must be identical strings

**Pass criteria:** `name` value equals the directory name.

**Source:** <https://agentskills.io/specification#name-field> ("Must match the parent directory name")

## Check 3: `description` Field Presence and Length

**What to check:** The `description` field in YAML frontmatter.

**How to check:**

1. Extract the `description` value from frontmatter
2. Measure its character count

**Pass criteria — all must be true:**

- Field is present
- Non-empty (length > 0)
- 1–1024 characters (report actual length)

**Source:** <https://agentskills.io/specification#description-field>

## Check 4: `description` Voice and Perspective

**What to check:** The `description` uses third-person voice, not first or second person.

**How to check:**

1. Read the full `description` value
2. Scan for first-person markers: "I can", "I will", "I help", "my"
3. Scan for second-person markers: "You can", "You should", "Use this to", "Your"
4. Verify it reads as third-person: "This skill...", "Processes...", "Extracts...", "Generates..."

**Pass criteria:**

- No first-person pronouns or constructions
- No second-person pronouns or constructions (exception: "Use when..." trigger phrases are acceptable per Anthropic best practices)
- Reads naturally in third person

**Fail examples:**

- "I can help you process PDFs" — first person
- "You can use this to process PDFs" — second person (outside trigger context)

**Source:** <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> ("Always write in third person")

## Check 5: `description` Includes Trigger Phrases

**What to check:** The `description` tells the agent both WHAT the skill does and WHEN to use it.

**How to check:**

1. Read the `description` value
2. Identify the WHAT component — does it describe the skill's function?
3. Identify the WHEN component — does it include trigger phrases or usage context? Look for patterns like "Use when...", "This skill should be used when...", or specific keyword triggers

**Pass criteria:**

- Contains a clear statement of what the skill does (WHAT)
- Contains trigger phrases or usage context (WHEN)

**Fail examples:**

- "Helps with PDFs" — too vague, no WHEN
- "Processes data" — no WHEN, WHAT is vague

**Source:** <https://agentskills.io/specification#description-field> ("Should describe both what the skill does and when to use it") and <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> ("Be specific and include key terms")

## Check 6: SKILL.md Body Exists

**What to check:** The SKILL.md file contains Markdown content after the YAML frontmatter closing `---`.

**How to check:**

1. Read the full SKILL.md file
2. Locate the closing `---` of the frontmatter block
3. Check that content exists after it (not just whitespace)

**Pass criteria:** Non-empty Markdown body after frontmatter.

**Source:** <https://agentskills.io/specification#body-content>

## Check 7: No `.skill` File

**What to check:** The skill directory does not contain a `.skill` file unless the user explicitly requested one.

**How to check:**

1. List all files in the skill root directory
2. Check for any file named `.skill`

**Pass criteria:** No `.skill` file present. If one exists, flag it — `.skill` files are only acceptable when explicitly requested by the user.

**Source:** Convention — `.skill` files are an optional legacy mechanism not part of the standard skill structure.

## Check 8: No XML Tags in Frontmatter

**What to check:** Neither `name` nor `description` contain XML tags.

**How to check:**

1. Read both `name` and `description` values
2. Scan for XML tag patterns: `<...>` or `</...>`

**Pass criteria:** No XML tags found in either field.

**Source:** <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> ("Cannot contain XML tags")

## Check 9: Optional Fields Validity

**What to check:** If optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`) are present, verify they meet spec constraints.

**How to check:**

1. If `compatibility` is present: verify 1–500 characters
2. If `metadata` is present: verify it is a map of string keys to string values
3. If `allowed-tools` is present: verify it is a space-delimited string
4. If `license` is present: verify it is a non-empty string

**Pass criteria:** All present optional fields meet their constraints. If no optional fields are present, pass automatically.

**Source:** <https://agentskills.io/specification#optional-fields>

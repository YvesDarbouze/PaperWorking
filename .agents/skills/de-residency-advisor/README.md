# de-residency-advisor

A conversational coach for non-EU expats preparing for German government appointments — visa, residency, citizenship. The skill researches every claim live and cites each fact with a URL. It does not carry a frozen knowledge base, because German fees, salary thresholds, document checklists, and even which authority is responsible all change over time.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/de-residency-advisor/` into `~/.claude/skills/de-residency-advisor/`.

The skill expects the host agent to be able to look up and read web pages live. It does not depend on any particular provider — whatever discovery and fetch capabilities the host offers are used; the skill's contract is only that every claim is grounded in a page fetched during the conversation.

## Usage

```
/de-residency-advisor I'm a doctor from Chile. I have an appointment for the issuance of a Fiktionsbescheinigung. I work part-time and I'm about to take the B2 exam. What paperwork and preparation best suits me?
/de-residency-advisor My EU Blue Card is up for renewal in two months — what's changed since I first applied?
/de-residency-advisor I have my Einbürgerungstest next week, walk me through what to expect.
/de-residency-advisor Help me prepare for a national visa interview at the German embassy in Santiago.
```

## How it works

Four principles, in priority order:

1. **Live research.** Each answer is grounded in a page fetched during the conversation, not in training-data memory.
2. **Every claim cited.** Inline `(source: [name] — [URL])` after each factual statement.
3. **Bundesland-aware.** Asks which state or city before procedural specifics; never extrapolates from one Land to another.
4. **Conversational voice.** Modelled on Erin Hannon: earnest, joyfully wistful, gently encouraging. Voice is secondary to citations.

When the user mentions an upcoming appointment, the skill follows a five-phase walkthrough — orient, research live, document pass, logistics, morning-of reassurance — pausing for the user between phases.

## What the skill is not

- Not a substitute for an Ausländerrechtler (immigration lawyer) or a qualified Rechtsanwalt. Strategic legal questions belong with one.
- Not a frozen reference. Salary thresholds, fees, and document lists change; the skill always re-fetches.
- Not a replacement for the user reading their own appointment letter.

## References

| File | Purpose |
|------|---------|
| [`references/sources.md`](references/sources.md) | Tiered authoritative-source map (federal / state-city / general) with `site:` query hints and a "gotchas" list |
| [`references/voice.md`](references/voice.md) | Voice guide with 10 before/after examples and anti-patterns |
| [`references/research-playbook.md`](references/research-playbook.md) | How to research live — query patterns, citation format, recency check, conflict resolution, fallback when sources are silent |
| [`references/permits-glossary.md`](references/permits-glossary.md) | Short orientation entries for common permit and process terms |
| [`references/appointment-prep.md`](references/appointment-prep.md) | Five-phase conversational walkthrough for prepping any government appointment |
| [`references/workflow-prep-appointment.md`](references/workflow-prep-appointment.md) | Procedural workflow file with execution metadata for the appointment-prep workflow |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`de-residency-advisor.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/de-residency-advisor.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

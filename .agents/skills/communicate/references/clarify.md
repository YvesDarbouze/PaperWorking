# Clarify

Audit prose for clarity issues and apply fixes across structure, content, and expression dimensions.

## Diagnostic Question

Ask: Can a reader unfamiliar with this domain follow linearly without backtracking?
Where do concepts appear before their foundations? Where do sentences open with unfamiliar content before anchoring on familiar ground?

## Instructions

1. **Identify the target** - Determine what prose to audit: text provided directly, a referenced file, or recent output in the conversation. State the target and its approximate scope.

2. **Run the structural audit** - Check how information is organized:
   - **Sequence**: Mark where concepts are referenced before introduced, or conclusions appear before supporting details
   - **Information flow**: Identify sentences that open with unfamiliar content before anchoring on familiar ground
   - **Find gaps**: Mark undefined terms, logical leaps, and claims that assume knowledge not established
   - **Trace prerequisites**: List what readers must already understand; mark where prerequisites are assumed but not stated

3. **Run the content audit** - Check whether difficulty is essential or accidental:
   - **Streamline**: Count redundant phrases, identify ceremonial language that adds words without meaning
   - **Load type**: Categorize difficulty as extraneous (from poor expression—cut it), intrinsic (from complex subject—preserve with scaffolding), or germane (builds understanding—preserve)
   - **Reveal mechanism**: Find claims that assert without explaining how or why
   - **Ground quantifiers**: Find vague quantifiers ("many", "significant", "few") where actual numbers would strengthen

4. **Run the expression audit** - Check whether language creates friction:
   - **Presence**: Find absence-based language ("don't", "avoid", "not") that could point toward action instead
   - **Referent track**: Trace each pronoun and demonstrative to its antecedent; mark ambiguous or distant references

5. **Apply fixes in priority order** - Fix structural issues first (they often resolve content and expression issues):
   - Reorder for sequence, restructure for information flow, fill gaps
   - Streamline, add mechanism, ground quantifiers
   - Convert to presence, clarify referents
   - Preserve intrinsic complexity with scaffolding rather than simplifying

6. **Present the result** - Output the improved prose and summarize what changed: structural issues fixed, content streamlined, expression issues resolved, complexity preserved.

## Questions

- Where does this passage assume a foundation it has not given the reader — a concept, a definition, a context, an earlier event in the chain?
- Where does a sentence open on the unfamiliar before the familiar is in place to anchor it?
- Where is cushioning doing the writer's work — softening the absence of a claim, padding silence where meaning should be?
- For each quantifier — "many," "often," "significant," "soon" — do I have the number, duration, or comparison that would make it concrete?
- For each claim that asserts an effect, does the prose name the mechanism — through what process, by what means, in what intermediate steps — or is the reader being asked to take it on faith?
- Where is the difficulty coming from the subject itself, and where from the way I wrote it?
- Where does a negation tell the reader what to avoid, when a positive instruction would give them a direction to move?
- Trace each pronoun and demonstrative back to its anchor. Where does the trace stretch more than two sentences, or split between two possible antecedents?

## Quality Criteria

When clarity is sound:

- [ ] Every concept the prose uses has been introduced before it is referenced.
- [ ] Each sentence opens on ground the reader has been given.
- [ ] Every quantifier has been backed by the specific number, duration, or comparison the writer can stand behind.
- [ ] Every claim that asserts an effect names how the effect happens — through what process, by what means.
- [ ] Difficulty in the prose comes from difficulty in the subject, and the surrounding scaffolding helps the reader carry it.
- [ ] Negations have given way to positive direction unless the absence is itself the point.
- [ ] Every pronoun and demonstrative traces cleanly to one antecedent within two sentences.
- [ ] When repair lands across multiple layers, the structural fixes were made first, and the word-level fixes built on those.

## Additional Resources

For detection heuristics, repair strategies, and domain-specific patterns: [`clarify-patterns.md`](./clarify-patterns.md).

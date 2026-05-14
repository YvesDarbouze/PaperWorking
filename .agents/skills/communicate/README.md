# communicate

Helps written prose actually reach the person on the other end. The skill works across five dimensions of communication — purpose, clarity, integrity, shape, depth — with two cross-cutting concerns that ride along regardless: rhetorical tradition (so Anglo-American conventions do not silently become the unmarked default) and AI slop (the lexical, structural, and voice patterns that mark prose as machine-shaped).

It loads only the reference files that the situation calls for. Most prose problems need two or three; some need only one. The reference set lives in [`references/`](references/) and the skill body decides which to consult based on what the prose is doing.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/communicate/` into `~/.claude/skills/communicate/`.

## Usage

The skill triggers on natural language about prose work — composing, proofreading, redrafting, adapting, phrasing — so an explicit invocation is not required. When you want to invoke it directly:

```
/communicate fix the passive voice in this paragraph and strengthen the hedging
```

```
/communicate proofread this draft before I send it
```

```
/communicate help me write the introduction for this proposal
```

```
/communicate adapt this passage for a US business audience without flattening it
```

```
/communicate in Portuguese we say saudade — how do I render that in English without breaking it?
```

## How it works

Every invocation begins with two pre-flight checks: the **tradition lens** (what rhetorical convention is the writing operating inside, and is the model about to silently normalize toward Anglo-American defaults) and the **slop audit** (does the prose carry the lexical, structural, voice, or casual-context tells of AI output, regardless of who wrote it).

After that, the skill reads the prose and consults whichever of the five dimensions are relevant:

- **Purpose** — does the shape of the piece do the job it's here to do, does it meet the reader where they are, does it bridge unfamiliar concepts.
- **Clarity** — can the reader follow it; are actors visible; does language commit or cushion; do abstractions have grounding.
- **Integrity** — does the certainty match the evidence; are scope and boundaries explicit; are silent premises surfaced.
- **Shape** — is there tension and pull, are sections ordered to build, does sentence cadence vary, does the prose read as written by someone speaking from somewhere.
- **Depth** — what do the claims carry that goes unsaid; are conflated concerns separated; does the prose open inquiry or close it.

Each reference file is a self-contained instruction. The skill loads the ones that apply and leaves the rest alone.

## When to use this

Use it when the writing matters: proposals, documentation, PR descriptions, anything that will be read more than once or by someone outside the immediate team. It is also useful when writing in English from a non-English thinking language, or when adapting prose across rhetorical traditions.

For throwaway messages or scratch notes, just write — the skill is for prose that has to land.

## References

| File | Concern |
|------|---------|
| [`across-languages.md`](references/across-languages.md) | Tradition lens — surfaces what rhetorical convention the prose is operating inside |
| [`avoid-slop.md`](references/avoid-slop.md) | Slop audit — lexical, structural, voice, and casual-context tells of AI prose |
| [`fit.md`](references/fit.md) | Form fit — does the shape serve the function |
| [`calibrate.md`](references/calibrate.md) | Audience depth — what the reader knows and how the vocabulary lands |
| [`analogize.md`](references/analogize.md) | Bridging unfamiliar concepts with structural rather than decorative analogies |
| [`clarify.md`](references/clarify.md) | Order and prerequisites — when concepts appear before they are introduced |
| [`activate.md`](references/activate.md) | Hidden actors — surfacing who does what without erasing intentional agentless construction |
| [`strengthen.md`](references/strengthen.md) | Cushioning vs. calibration — the hedging split |
| [`illustrate.md`](references/illustrate.md) | Witnessed detail — replacing category language with grounded specificity |
| [`signal-confidence.md`](references/signal-confidence.md) | Tuning language to the warrant the writer actually has |
| [`bound-scope.md`](references/bound-scope.md) | Where a claim works and where it does not |
| [`surface-assumptions.md`](references/surface-assumptions.md) | Making silent premises visible |
| [`arc.md`](references/arc.md) | Tension and pull — giving a piece a spine |
| [`arrange.md`](references/arrange.md) | Section order — what each one needs from the one before it |
| [`rhythm.md`](references/rhythm.md) | Sentence cadence — variance, the long-sentence cascade, the fragment continuation test |
| [`voice.md`](references/voice.md) | Speaking from somewhere — position and stance |
| [`register.md`](references/register.md) | Word weight — diction tuned to context |
| [`extract-implications.md`](references/extract-implications.md) | Surfacing what the claims carry that goes unsaid |
| [`dimensionalize.md`](references/dimensionalize.md) | Splitting conflated concerns |
| [`pose-questions.md`](references/pose-questions.md) | Inviting the reader — opening inquiry where the prose could close it |
| [`clarify-patterns.md`](references/clarify-patterns.md) | Detection heuristics for the clarify pass |
| [`frame-guide.md`](references/frame-guide.md) | Framing scaffolds for compose work |
| [`index.md`](references/index.md) | Reference index for navigation |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`communicate.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/communicate.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

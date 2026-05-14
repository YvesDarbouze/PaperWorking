# cite

Generate APA-format citations from paper links.

Hand it one or more URLs — arXiv, DOI, conference proceedings — and it returns properly formatted APA citations with direct links. No manual lookup, no guessing at author order or publication dates.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/cite/` into `~/.claude/skills/cite/`.

## Usage

```
/cite https://arxiv.org/abs/2301.00001
/cite https://doi.org/10.1145/1234567.1234568 https://arxiv.org/abs/2305.12345
```

## Why use this instead of prompting?

A plain prompt will format citations, but it tends to hallucinate publication details — wrong years, missing authors, invented DOIs. This skill fetches metadata from the source before formatting, so the citation matches what was actually published.

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`cite.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/cite.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

# prompt

Craft or refactor LLM instructions grounded in Anthropic's functional-emotions
research. Takes no required arguments — the skill detects whether the input
is a seed task, an existing `CLAUDE.md` to refactor, or an empty canvas,
and emits structured output that applies the seven Emotional Intelligence
Prompting (EIP) principles while preserving every instruction in the input.

## What it does

Three modes, one pipeline:

- **Seed:** rough task description → 7-section structured prompt
- **Refactor:** existing CLAUDE.md / system prompt → refactored file +
  coverage report guaranteeing no dropped instructions
- **First-draft:** empty canvas → first-draft CLAUDE.md sized to the
  project

Every output passes a 9-item anti-pattern lint derived from the
[emotion-concepts paper](https://transformer-circuits.pub/2026/emotions/index.html):
no threat framing, no demanded certainty, no authoritarian stacks, no
forced enthusiasm, no perfect-prompt fallacy.

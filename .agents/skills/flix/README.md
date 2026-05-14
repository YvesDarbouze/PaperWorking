# flix

Context engineering runbook for writing [Flix](https://flix.dev) code. Flix has very little LLM training data — without this skill, agents generate code that looks like Scala or Haskell but does not compile. The skill loads the language's actual constraints, stdlib guidance, and anti-hallucination rules before any code is written.

## Install

```bash
npx skills add https://github.com/synapseradio/ai-skills
```

Or copy `skills/flix/` into `~/.claude/skills/flix/`.

## Usage

```
/flix write a CLI tool that reads a JSON config file and validates its schema
/flix translate this TypeScript function to Flix
```

## What it does

- Loads Flix design principles and compiler constraints before generating code
- Enforces stdlib-first discipline via `api.flix.dev` — check before importing Java
- Provides translation references from TypeScript, Python, and Rust
- Covers the effect system, Java interop, and common compiler errors

## Why use this instead of prompting?

A plain prompt will produce Flix-like code that borrows syntax from Scala, Haskell, or Java. It will not compile. Flix enforces 41 design principles at the compiler level, has its own effect system, and its stdlib uses different conventions than any mainstream language. This skill loads those constraints so the generated code actually works.

## References

| File | Purpose |
|------|---------|
| [`references/design-principles.md`](references/design-principles.md) | 6 values and 41 compiler-enforced principles |
| [`references/effect-system.md`](references/effect-system.md) | Purity tracking, `eff`/handler syntax, direct-style patterns |
| [`references/interop-patterns.md`](references/interop-patterns.md) | Java interop: imports, null handling, `unsafe` blocks |
| [`references/stdlib-map.md`](references/stdlib-map.md) | Task-to-module lookup for stdlib functions |
| [`references/translate-typescript.md`](references/translate-typescript.md) | TypeScript/Effect-TS to Flix patterns |
| [`references/translate-python.md`](references/translate-python.md) | Python to Flix patterns |
| [`references/translate-rust.md`](references/translate-rust.md) | Rust to Flix patterns |

## Install as a `.skill`

Upload this file in Claude.ai → Settings → Skills:

[`flix.skill`](https://github.com/synapseradio/ai-skills/raw/main/packaged/flix.skill)

## License

[EUPL-1.2](https://github.com/synapseradio/ai-skills/blob/main/LICENSE)

# Flix Design Principles

Complete reference of the 6 values and 41 principles from the Flix language design, sourced from the Onward! 2022 paper ([PDF](https://flix.dev/paper/onward2022.pdf)).

The **Delta** column rates how likely an AI agent trained on Scala/Haskell/Java is to violate the principle:

- **HIGH** — Agent will likely violate without warning
- **MEDIUM** — Agent might get this wrong
- **LOW** — Familiar from other languages

## Values

| # | Value | Description |
|---|-------|-------------|
| 1 | **Simple is Not Easy** | Prefers designs that get things right over ones that make things easy; surfaces inherent complexity rather than hiding it |
| 2 | **Principle of Least Surprise** | Uses safe, predictable defaults; when no reasonable default exists, requires the programmer to make an explicit choice |
| 3 | **Functional-First** | Flix is functional, imperative, and logic — when these conflict, the functional aspects win |
| 4 | **One Language** | No feature flags, compiler plugins, or dialects; there is exactly one Flix language |
| 5 | **Productivity Over Performance** | Developer time is scarcer than machine time; development speed wins over runtime performance |
| 6 | **Correctness Over Performance** | Program correctness wins over runtime performance; no undefined behavior |

## Principles by Category

### Syntax (Principles 1–4)

| # | Principle | Description | Delta |
|---|-----------|-------------|-------|
| 1 | Syntax vs. Semantics | Syntactic problems solved with syntactic sugar only — no extension methods or implicit classes | MEDIUM |
| 2 | Expression-based Syntax | Every construct is an expression that reduces to a value; no statements | LOW |
| 3 | Keyword-based Syntax | Boolean operators are `not`, `and`, `or` — not `!`, `&&`, `||` | HIGH |
| 4 | Mirrored Term and Type Syntax | Term and type syntax are kept parallel: `f(a,b)` vs `f[a,b]`, `x -> x+1` vs `Int32 -> Int32` | MEDIUM |

### Static Semantics (Principles 5–12)

| # | Principle | Description | Delta |
|---|-----------|-------------|-------|
| 5 | Separate Pure and Impure Code | Type-and-effect system tracks purity of every expression; pure functions are guaranteed | HIGH |
| 6 | Separate Pure and Impure Data | All data is immutable or mutable; mutable data is scoped to a region and cannot escape | HIGH |
| 7 | Complete Local Type Inference | Top-level declarations require explicit signatures; within function bodies, no annotations needed | MEDIUM |
| 8 | Whole-Program Compilation | Compiler requires entire source at compile time; no separate compilation | MEDIUM |
| 9 | Single Entry Point | `main` is the only entry point — no static initializers, no class-load side effects | HIGH |
| 10 | Minimize Declarations | Structural typing (tuples, extensible records, Datalog) minimizes required declarations | MEDIUM |
| 11 | Private by Default | All declarations are private; `pub` keyword required for public visibility | MEDIUM |
| 12 | Timeless Design | Stdlib avoids technologies not yet proven permanent (no XML, JSON, YAML built-ins) | LOW |

### Correctness and Safety (Principles 13–25)

| # | Principle | Description | Delta |
|---|-----------|-------------|-------|
| 13 | No Warnings, Only Errors | Compiler emits only hard errors — nothing is a suppressible warning | HIGH |
| 14 | No Global State | No global constants or static fields; mutable state must originate in `main` | HIGH |
| 15 | Share Memory by Communicating | Concurrency uses channels with immutable messages; mutable memory is never shared across threads | HIGH |
| 16 | Concurrency vs. Parallelism | Parallelism (`par`/`par-yield`) via purity enforcement is separate from concurrency (channels/processes) | MEDIUM |
| 17 | Bugs are Not Recoverable | Recoverable errors use `Result`; program bugs (out-of-bounds, stack overflow) are not caught | MEDIUM |
| 18 | No Useless Expressions | Statement expression `e1; e2` requires `e1` to be impure and of type `Unit` | HIGH |
| 19 | No Unused Variables | Unused let-bindings, pattern variables, and parameters are compile errors; prefix with `_` | MEDIUM |
| 20 | No Variable Shadowing | Re-declaring a variable name in any nested scope is a compile error | HIGH |
| 21 | No Unused Declarations | Unused functions, types, and type aliases are compile errors | MEDIUM |
| 22 | No Implicit Coercions | No implicit type conversions including widening and auto-boxing; all explicit | HIGH |
| 23 | Declaration Monotonicity | Adding a declaration never changes existing semantics; wildcard imports (`use Foo.*`) forbidden | HIGH |
| 24 | No Null | `null` does not exist as a member of user types; absent values use `Option` | LOW–HIGH (by language) |
| 25 | No Unprincipled Overloading | No function overloading by argument type/count; only via type classes | HIGH |

### Compiler Messages (Principles 26–31)

| # | Principle | Description | Delta |
|---|-----------|-------------|-------|
| 26 | The 80/20 Rule | Messages serve both experienced and novice programmers; first sentence has root cause | LOW |
| 27 | Compiler Message Structure | Every message: one-sentence summary, multi-line detail, long-form explanation | LOW |
| 28 | Straight to the Point | Most salient word appears first in error messages | LOW |
| 29 | Style and Tone | Crisp, clear, friendly messages; "Unexpected" not "Illegal" | LOW |
| 30 | Split Compiler Messages | Generic errors subdivided into maximally specific sub-cases | LOW |
| 31 | Relate to Other Languages | Errors explain how Flix differs from Haskell, Rust, Scala when relevant | LOW |

### Standard Library (Principles 32–39)

| # | Principle | Description | Delta |
|---|-----------|-------------|-------|
| 32 | Minimal Prelude | Implicit prelude is small; only universal functionality | LOW |
| 33 | Layered Abstractions | Stdlib usable at Basic (ADTs, recursion), Intermediate (Option, List, HOF), and Advanced (Functor, Monad) levels | MEDIUM |
| 34 | No Dangerous Functions | All functions are total; `List.head` returns `Option`, not a bare element | HIGH |
| 35 | Subject-Last | Every stdlib function takes its subject as its last argument; enables `|>` pipelines | HIGH |
| 36 | Non-Commutative Functions | Functions with multiple same-type args use records for labeling: `String.contains(substr = "a", s)` | HIGH |
| 37 | Symbolic Operators Must Have Names | Every symbolic operator must also have a pronounceable ASCII name | MEDIUM |
| 38 | Destructive Operations are Marked | Mutating operations suffixed with `!` (e.g., `Array.reverse!`); non-destructive have no suffix | HIGH |
| 39 | Mirrored Names | Paired operations share base names: `Array.reverse` (new) vs `Array.reverse!` (mutate) | MEDIUM |

### Miscellaneous (Principles 40–41)

| # | Principle | Description | Delta |
|---|-----------|-------------|-------|
| 40 | Annotation vs. Modifiers | Annotations = metadata (no semantic effect); modifiers (`pub`, `override`) = semantic; strictly distinct | MEDIUM |
| 41 | Annotations are Built-in | Users cannot define custom annotations; only built-in set exists | HIGH |

## Abandoned Principles

These were tried and abandoned — understanding why prevents repeating the mistakes:

| Principle | Why Abandoned |
|-----------|---------------|
| No Blessed Library | Compiler acquired hard dependencies on stdlib type classes (Eq, Order, ToString) |
| Uniform Function Call Syntax | Ambiguity with record field access; tension with subject-last convention |

## Go Deeper

- Full paper: [https://flix.dev/paper/onward2022.pdf](https://flix.dev/paper/onward2022.pdf)
- Principles page: [https://flix.dev/principles/](https://flix.dev/principles/)
- Design flaws post: [https://blog.flix.dev/blog/design-flaws-in-flix/](https://blog.flix.dev/blog/design-flaws-in-flix/)
- Effect system theory: [https://flix.dev/paper/oopsla2020b.pdf](https://flix.dev/paper/oopsla2020b.pdf)

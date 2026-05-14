---
name: flix
description: >
  This skill should be used when the user asks to "write Flix code",
  "translate to Flix", "set up a Flix project", "fix Flix compiler errors",
  "add Java interop in Flix", or when encountering .flix files or flix.toml.
  Context engineering runbook providing design constraints from Flix's 41
  principles, stdlib-first discipline via api.flix.dev, and anti-hallucination
  guidance for a language with sparse training data.
metadata:
  version: 0.2.0
---

# Flix Context Engineering Runbook

This is a context engineering runbook, not a Flix manual. Flix has sparse training data in LLM corpora — Scala/Haskell/Java instincts will produce code that does not compile. Load official docs before writing code.

## Proactive Context Loading

Before writing any non-trivial Flix code:

1. **MANDATORY — read first**: [`references/design-principles.md`](references/design-principles.md) — focus on HIGH-delta principles. Skip compiler message principles (26–31).
2. **Fetch the relevant book chapter** from the navigation map below.
3. **Check the stdlib** at `https://api.flix.dev/` for modules you need.
4. **IF doing Java interop**: fetch `https://doc.flix.dev/interoperability.html`

**Conditional loading** — load only what the task requires:

| Situation | Load | Do NOT load |
|-----------|------|-------------|
| Writing effect-heavy code | [`references/effect-system.md`](references/effect-system.md) | translation references |
| Calling Java from Flix | [`references/interop-patterns.md`](references/interop-patterns.md) | translation references |
| Need a stdlib function | [`references/stdlib-map.md`](references/stdlib-map.md) | effect-system, interop |
| Translating from TypeScript | [`references/translate-typescript.md`](references/translate-typescript.md) | other translate-*.md files |
| Translating from Python | [`references/translate-python.md`](references/translate-python.md) | other translate-*.md files |
| Translating from Rust | [`references/translate-rust.md`](references/translate-rust.md) | other translate-*.md files |
| Simple List/Map/Option task | Nothing extra — SKILL.md is sufficient | all references |

This is not optional. Flix has too few training examples for confident generation without loading context first.

## Stdlib-First Rule

**Before importing any Java class, check the Flix standard library at `https://api.flix.dev/`.**

The stdlib covers strings, collections (List, Map, Set, Vector), Option/Result, file I/O, environment variables, concurrency (channels, spawn), regex, and more. Check it first because:

- Stdlib functions are pure by default; Java imports carry `\ IO`
- Stdlib uses Flix idioms (pipelines, pattern matching); Java interop requires `unsafe` blocks
- Stdlib types compose with the effect system; Java types don't

### Task-to-Module Quick Reference

| Need this? | Check this module | Instead of Java... |
|------------|-------------------|-------------------|
| String split/join/pad/trim | `String` | `java.lang.String` |
| Regex matching | `Regex` (literal `regex"..."`) | `java.util.regex.Pattern` |
| List/Set/Map operations | `List`, `Set`, `Map` | `java.util.ArrayList`, `HashSet`, `HashMap` |
| Indexed access | `Vector` (persistent) or `Array` (mutable) | `int[]`, `ArrayList` |
| Mutable key-value | `MutMap` (region-scoped) | `java.util.HashMap` |
| Option chaining | `Option` | `java.util.Optional` |
| Error propagation | `Result` | `try/catch` with checked exceptions |
| File reading | `FileRead` effect | `java.io.File`, `Files.readAllLines()` |
| File writing | `FileWrite` effect | `java.io.FileWriter`, `Files.write()` |
| Environment variables | `Env` effect | `System.getenv()` |
| CLI arguments | `Env.getArgs()` | `String[] args` |
| System paths (home, tmp, cwd) | `Env` effect | `System.getProperty(...)` |
| Channels / concurrency | `Channel` + `spawn` keyword | `BlockingQueue`, `ExecutorService` |
| Number parsing | `Int32.fromString` / `Float64.fromString` | `Integer.parseInt` |
| Char classification | `Char` | `Character.isDigit()` |
| Sorting | `List.sort` / `Array.sort` | `Collections.sort()` |
| Printing | `println` (Prelude) | `System.out.println()` |
| Exception wrapping | `Result.tryCatch` | `try/catch` blocks |

Full task-to-module map with key functions: [`references/stdlib-map.md`](references/stdlib-map.md)

### When Java Interop Is Actually Needed

These have no stdlib equivalent — Java interop is appropriate:

- HTTP/networking (no HTTP client module)
- JSON/serialization (no JSON module)
- Date/time (no datetime abstraction — use `java.time.*`)
- Cryptography/hashing
- Process execution (beyond what `Exec` effect covers)
- Stdin reading (no console input module)

## Design Decisions

Before choosing an approach, ask:

- **Pure or effectful?** Can this be pure? Keep it pure. Add effects only at boundaries.
- **Stdlib or interop?** Check `api.flix.dev` first. Java interop only for genuine gaps (HTTP, JSON, crypto, datetime).
- **Persistent or mutable?** Default to `Map`/`List`/`Set`. Use region-scoped mutation (`MutMap`, `Array`) only when building a result imperatively, then `toImmutable`.
- **Result or algebraic effect?** `Result` for errors callers handle locally. Algebraic effects for swappable capabilities (DB, config, logging).
- **Record or enum?** Records for data bags with named fields. Enums for variants with different shapes.
- **Named args or positional?** When two+ params share a type, use named record args (`substr = "foo"`).

## NEVER (These Are Compile Errors)

- `&&`, `||`, `!` — use `and`, `or`, `not`
- Shadow a variable name in any scope
- Use `null` — use `Option[t]`
- Put subject first in stdlib calls — it goes last
- Wildcard imports (`use Foo.*`) — name each import
- `.` for record field access — use `#` (`record#field`)
- Discard a pure non-Unit expression with `;`
- Import a Java class before checking `api.flix.dev`
- `unsafe` on expressions that actually perform I/O
- Implicit type conversions — all conversions explicit
- Overload functions by argument type/count — use type classes
- Unused variables without `_` prefix

## Design Constraints

These are the principles that most affect how you write code. Violating any of these produces a **compile error**, not a warning.

### 1. Keyword-Based Boolean Operators (Principle 3)

Boolean operators are `not`, `and`, `or`. The symbols `!`, `&&`, `||` are **not boolean operators**.

```
// WRONG — will not parse
if (x && y || !z) ...

// CORRECT
if (x and y or not z) ...
```

### 2. No Variable Shadowing (Principle 20)

Re-declaring a variable name in any nested scope is a compile error.

```
// WRONG — compile error
let x = 1
let x = x + 1

// CORRECT
let x = 1
let y = x + 1
```

### 3. No Null (Principle 24)

`null` does not exist in Flix types. Use `Option[t]` for absent values. Null only appears at the Java interop boundary and must be checked there.

### 4. No Implicit Coercions (Principle 22)

No widening, auto-boxing, or implicit conversion. All type conversions are explicit.

### 5. No Useless Expressions (Principle 18)

A statement expression `e1; e2` requires `e1` to be impure and of type `Unit`. Pure expressions or non-`Unit` expressions in statement position are compile errors. You cannot discard a return value silently.

### 6. Subject-Last in Stdlib (Principle 35)

Every stdlib function takes its subject as the **last** argument:

```
List.map(f, xs)           // list is last
String.contains(substr = "foo", s)  // string is last
Map.get(k, m)             // map is last
```

This enables pipeline composition with `|>`:

```
xs |> List.filter(x -> x > 0) |> List.map(x -> x * 2)
```

### 7. No Unprincipled Overloading (Principle 25)

Functions cannot share a name with different argument types/counts. Overloading is only through type classes.

### 8. No Dangerous Functions (Principle 34)

All stdlib functions are total. `List.head` returns `Option[a]`, not a bare element. There is no partial `head`, `tail`, or `!!`.

### 9. Private by Default (Principle 11)

All declarations are private. Use `pub` for public visibility.

### 10. Separate Pure and Impure Code (Principle 5)

Every function has a tracked effect in its type. Pure functions cannot perform IO. Adding `println` inside a pure function changes its effect type and breaks callers.

```
// Pure — no effect annotation
def add(x: Int32, y: Int32): Int32 = x + y

// Impure — must declare effect
def greet(name: String): Unit \ IO = println("Hello ${name}")
```

### Additional Constraints

- **No global state** (Principle 14) — no static fields, no module-level mutable state
- **No wildcard imports** (Principle 23) — `use Foo.*` is forbidden
- **No unused variables** (Principle 19) — prefix with `_` to mark intentionally unused
- **No unused declarations** (Principle 21) — dead functions/types are compile errors
- **Destructive ops marked with `!`** (Principle 38) — `Array.sort` returns new; `Array.sort!` mutates
- **No warnings, only errors** (Principle 13) — the compiler has no warning level
- **Record-labeled non-commutative args** (Principle 36) — `String.contains(substr = "a", s)` not positional

Full list of all 41 principles with delta ratings: [`references/design-principles.md`](references/design-principles.md)

## Navigation Map

| I need to... | Fetch this |
|-------------|-----------|
| Understand effects and purity | `https://doc.flix.dev/effect-system.html` |
| Write algebraic effect handlers | `https://doc.flix.dev/effects-and-handlers.html` |
| See primitive effect list (IO, Net, FsRead...) | `https://doc.flix.dev/primitive-effects.html` |
| Call Java code / use JVM libraries | `https://doc.flix.dev/interoperability.html` |
| Create Java objects from Flix | `https://doc.flix.dev/creating-objects.html` |
| Call Java methods (instance, static, varargs) | `https://doc.flix.dev/calling-methods.html` |
| Pattern match on types or values | `https://doc.flix.dev/pattern-matching.html` |
| Set up a project / manage deps | `https://doc.flix.dev/build.html` |
| Add Flix or Maven dependencies | `https://doc.flix.dev/packages.html` |
| Organize code into modules | `https://doc.flix.dev/modules.html` |
| Write functions (HOF, currying, pipes) | `https://doc.flix.dev/functions.html` |
| Use Datalog / logic programming | `https://doc.flix.dev/functional-predicates.html` |
| Understand type casts | `https://doc.flix.dev/type-casts.html` |
| Check operator precedence | `https://doc.flix.dev/appendix.html` |
| Check stdlib API for any module | `https://api.flix.dev/` |
| Read the design paper (Onward! 2022) | `https://flix.dev/paper/onward2022.pdf` |

**When a navigation entry is relevant, actually fetch and read the page before writing code.**

## What's Different

| From (Scala/Haskell/Java) | In Flix | Key difference |
|---------------------------|---------|----------------|
| `null` | `Option[t]` | No null at all — `Option` everywhere |
| `&&` / `||` / `!` | `and` / `or` / `not` | Keyword-based, not symbolic |
| `try/catch` (exceptions) | `Result` + algebraic effects | `eff` / `run ... with handler` for control flow |
| `val x = ...; val x = ...` | Compile error | No variable shadowing permitted |
| `implicit` conversions | Not available | No implicit coercions of any kind |
| `import pkg._` (wildcard) | `use Mod.{a, b}` | Explicit imports only |
| `interface`/`trait` | `trait` with `eff` support | Traits can declare associated effects |
| `for`/`do` notation (monadic) | Direct style | No monadic wrapping — use effects |
| `head` / `tail` (partial) | `List.head` → `Option` | All stdlib functions are total |
| `Unit` returned implicitly | Compile error | Pure non-Unit expressions in statement position rejected |
| `list.map(f)` (subject-first) | `List.map(f, list)` | Subject-last enables `\|>` pipelines |
| `x.sort()` (mutation) | `Array.sort!` vs `Array.sort` | `!` suffix marks destructive operations |
| `static` fields | Not available | No global state — thread everything from `main` |
| `obj.field` (dot access) | `record#field` (hash access) | `#` is the record label accessor, not `.` |
| `f"Hello {name}"` / `` `Hello ${name}` `` | `"Hello ${name}"` | `${}` in double-quoted strings; no format prefix |
| Custom annotations | Not available | Annotations are built-in only |
| Wildcard type params | `typematch` dispatch | Compile-time type dispatch, not runtime erasure |

## Effect System Quick Reference

Three kinds of effects, each with different properties:

| Kind | Defined by | Handleable? | Example |
|------|-----------|-------------|---------|
| Primitive | Compiler (maps Java classes) | No — viral | `IO`, `Net`, `FsRead`, `FsWrite`, `Env`, `Exec`, `NonDet`, `Sys`, `Chan` |
| Algebraic | User (`eff` keyword) | Yes — scoped | `eff Ask { def ask(): String }` |
| Heap | Region blocks | Yes — scoped | `region rc { let s = MutSet.empty(rc) }` |

**No effect annotation = pure.** The `\` separator declares effects:

```
def pure(): Int32 = 42
def impure(): Unit \ IO = println("hello")
def multi(): Unit \ {IO, Net} = ...
def polymorphic(f: a -> b \ ef): List[b] \ ef = ...
```

Deep dive on effects: [`references/effect-system.md`](references/effect-system.md)

## Project Setup Quick Reference

```
flix init                    # scaffold project
flix check                   # type-check only (fast)
flix run                     # compile and run main
flix test                    # run @Test functions
flix build-fatjar            # standalone JAR with all deps
```

Manifest (`flix.toml`):

```toml
[package]
name    = "my-project"
version = "0.1.0"
flix    = "0.54.0"

[dependencies]
"github:owner/repo" = "1.0.0"

[mvn-dependencies]
"org.example:artifact" = "1.2.3"
```

Project layout: `src/Main.flix` + `test/TestMain.flix` + `flix.toml`

## Conceptual Translation References

When translating from a language you know well, load the appropriate reference for side-by-side examples showing how familiar patterns map to Flix:

| Coming from... | Load this |
|----------------|-----------|
| TypeScript / Effect-TS | [`references/translate-typescript.md`](references/translate-typescript.md) |
| Python | [`references/translate-python.md`](references/translate-python.md) |
| Rust | [`references/translate-rust.md`](references/translate-rust.md) |

Each reference provides paired examples in XML format covering common tasks — error handling, collections, concurrency, I/O — with observations about how the languages approach the same problem differently.

## References

Load these when you need deeper guidance on a specific topic:

| File | Load when... |
|------|-------------|
| [`references/design-principles.md`](references/design-principles.md) | You need to understand *why* Flix does something — full table of 6 values + 41 principles |
| [`references/effect-system.md`](references/effect-system.md) | Writing effect-heavy code — eff/handler syntax, purity tracking, direct-style patterns |
| [`references/interop-patterns.md`](references/interop-patterns.md) | Calling Java from Flix — import syntax, null handling, type mapping, `unsafe` blocks |
| [`references/stdlib-map.md`](references/stdlib-map.md) | Finding the right stdlib function — task-to-module map organized by what agents commonly need |
| [`references/translate-typescript.md`](references/translate-typescript.md) | Translating TypeScript/Effect-TS patterns to Flix |
| [`references/translate-python.md`](references/translate-python.md) | Translating Python patterns to Flix |
| [`references/translate-rust.md`](references/translate-rust.md) | Translating Rust patterns to Flix |

## Common Compiler Errors

| You see... | Likely cause | Fix |
|-----------|-------------|-----|
| "Unexpected token `&&`" | Used symbolic boolean operator | Replace with `and`/`or`/`not` |
| "Duplicate variable" | Variable shadowing | Use a different variable name |
| "Non-pure expression in statement position" | Discarded a pure value with `;` | Bind to `_` or remove the expression |
| "Unused variable" | Let-binding never referenced | Prefix with `_` or remove |
| "Type mismatch: expected X, found Y" | Implicit coercion attempted | Add explicit conversion |
| "Unexpected field access `.`" | Used dot instead of hash | Use `record#field` |
| "Unable to resolve" | Wildcard import or missing `use` | Add explicit `use Mod.{name}` |

## Exit Check

After loading this skill, verify:

- [ ] At least one doc page relevant to the current task has been fetched
- [ ] The correct stdlib modules have been identified before importing Java
- [ ] Boolean operators are `and`/`or`/`not`, not `&&`/`||`/`!`
- [ ] Subjects are placed last in stdlib calls
- [ ] No variable shadowing or wildcard imports
- [ ] Record field access uses `#` (not `.`) — `record#field`
- [ ] String interpolation uses `"text ${expr}"` syntax

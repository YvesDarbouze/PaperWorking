# Rust → Flix Translation Reference

Conceptual translation guide for Rust developers learning Flix. Each example shows idiomatic code in both languages — not a literal port — and explains the conceptual shift.

## Quick orientation

Many things feel familiar: `Option`, `Result`, `match` with exhaustiveness, pattern matching, traits, private-by-default, explicit conversions, no null. The differences are concentrated in a few areas:

| Rust | Flix |
|------|------|
| Ownership / lifetimes / `&mut` | GC + `region rc { }` for scoped mutability |
| `Result<T, E>` | `Result[err, ok]` — error type is **first** |
| `&&`, `\|\|`, `!` | `and`, `or`, `not` — keywords |
| `?` operator | No equivalent — chain with `Result.flatMap` or algebraic effects |
| Async / `tokio` | `spawn` + `Channel` — CSP model |
| Trait impls | `instance` keyword |
| `mod foo; use foo::Bar;` | `mod Foo { ... }` + `use Foo.Bar` |
| Variable shadowing (allowed) | Variable shadowing is a **compile error** |
| `let mut x` | `ref x = ref 0` in a region, or `MutMap`/`Array` |
| No effect annotation | `\ IO`, `\ {Net, FsRead}`, user `eff` — tracked in types |

---

## 1. Error Handling

<example>
  <context>
    CLI tool that reads a config file and parses an integer field from it.
  </context>
  <task>
    Propagate errors from multiple fallible operations without losing context.
  </task>
  <rust>

```rust
use std::fs;
use std::num::ParseIntError;

#[derive(Debug)]
enum AppError {
    Io(std::io::Error),
    Parse(ParseIntError),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self { AppError::Io(e) }
}
impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self { AppError::Parse(e) }
}

fn read_port(path: &str) -> Result<u16, AppError> {
    let raw = fs::read_to_string(path)?;
    let port = raw.trim().parse::<u16>()?;
    Ok(port)
}

fn main() {
    match read_port("config.txt") {
        Ok(port) => println!("port: {port}"),
        Err(e)   => eprintln!("error: {e:?}"),
    }
}
```

  </rust>
  <flix>

```flix
// AppError ADT — no From boilerplate needed
enum AppError {
    case Io(String)
    case Parse(String)
}

def readPort(path: String): Result[AppError, Int32] \ FsRead =
    match Result.tryCatch(_ -> FileRead.read(path)) {
        case Err(msg) => Err(AppError.Io(msg))
        case Ok(raw)  =>
            let trimmed = String.trim(raw);
            match Int32.fromString(trimmed) {
                case Option.None    => Err(AppError.Parse("not an integer: ${trimmed}"))
                case Option.Some(n) => Ok(n)
            }
    }

def main(): Unit \ {FsRead, IO} =
    match readPort("config.txt") {
        case Result.Ok(port) => println("port: ${port}")
        case Result.Err(e)   => match e {
            case AppError.Io(msg)    => println("io error: ${msg}")
            case AppError.Parse(msg) => println("parse error: ${msg}")
        }
    }
```

  </flix>
  <what-to-observe>
    Rust's `?` operator is syntax sugar for an early return that calls `From::from` on the error. Flix has no equivalent operator — you chain manually with `match` or `Result.flatMap`. The upside is that the error path is always explicit and locally visible.

    `Result[err, ok]` in Flix has the error type first, the opposite of Rust's `Result<T, E>`. This surprises Rust developers; pay attention to argument order when reading signatures.

    Rust requires `From` impls to make `?` work across error types. Flix has no implicit conversions at all, so you pattern-match and construct the target variant explicitly. More lines, zero magic.

    `FileRead.read` returns `String` directly — all FileRead operations are infallible at the Flix level. `Result.tryCatch` wraps the call to catch Java-layer exceptions (e.g., file not found) and convert them to `Result`. The `FsRead` effect in the return type is how Flix tracks that this function touches the filesystem; the caller must also declare it (or handle it).
  </what-to-observe>
</example>

---

## 2. Collections Pipeline

<example>
  <context>
    Data processing script filtering and transforming a list of log entries.
  </context>
  <task>
    Filter, transform, and aggregate a collection in a readable pipeline.
  </task>
  <rust>

```rust
#[derive(Debug)]
struct Entry { level: String, duration_ms: u64 }

fn slow_errors(entries: &[Entry]) -> Vec<String> {
    entries
        .iter()
        .filter(|e| e.level == "ERROR" && e.duration_ms > 500)
        .map(|e| format!("[{}ms] {}", e.duration_ms, e.level))
        .collect()
}

fn total_duration(entries: &[Entry]) -> u64 {
    entries.iter().map(|e| e.duration_ms).sum()
}
```

  </rust>
  <flix>

```flix
type alias Entry = { level = String, durationMs = Int64 }

def slowErrors(entries: List[Entry]): List[String] =
    entries
        |> List.filter(e -> e#level == "ERROR" and e#durationMs > 500i64)
        |> List.map(e -> "[${e#durationMs}ms] ${e#level}")

def totalDuration(entries: List[Entry]): Int64 =
    entries |> List.map(e -> e#durationMs) |> List.sum
```

  </flix>
  <what-to-observe>
    Rust's `.iter().filter().map().collect()` chain is method-based and requires `.collect()` to materialize. Flix's `|>` pipeline is function-based: each step is `Module.function(args, subject)` where the subject (the collection) is always the last argument. No `.collect()` — the list is concrete throughout.

    `and` is a keyword in Flix, not `&&`. Writing `&&` is a compile error. Same for `or` and `not`.

    Rust's integer literals are unadorned (`500`); Flix requires explicit type suffixes when the type cannot be inferred (`500i64`). This is a consequence of no implicit coercions — the compiler will not widen `Int32` to `Int64` silently.

    Flix records use `{ field = Type }` structural typing — no `struct` declaration needed for `Entry`. Rust structs require a nominal declaration.
  </what-to-observe>
</example>

---

## 3. Option Handling

<example>
  <context>
    Config lookup that falls back to a default and validates the result.
  </context>
  <task>
    Chain optional lookups, apply a transform, and provide a default.
  </task>
  <rust>

```rust
use std::collections::HashMap;

fn get_timeout(config: &HashMap<String, String>) -> u32 {
    config
        .get("timeout_ms")
        .and_then(|s| s.parse::<u32>().ok())
        .filter(|&n| n > 0)
        .unwrap_or(5000)
}
```

  </rust>
  <flix>

```flix
def getTimeout(config: Map[String, String]): Int32 =
    Map.get("timeout_ms", config)
        |> Option.flatMap(s -> Int32.fromString(s))
        |> Option.filter(n -> n > 0)
        |> Option.getWithDefault(5000)
```

  </flix>
  <what-to-observe>
    The chain is structurally identical: flatMap (Rust `and_then`), filter, default. The names differ: `unwrap_or` → `Option.getWithDefault`, `and_then` → `Option.flatMap`.

    `Map.get(k, m)` returns `Option` — never panics, never throws. Flix stdlib has no equivalent of Rust's indexing panic (`map[key]`). All access is total by design (principle 34: No Dangerous Functions).

    Subject-last: `Map.get("timeout_ms", config)` — the map is the last argument. This is why `|>` flows naturally: each step passes its result as the final argument to the next function.

    `Int32.fromString` returns `Option[Int32]` directly. There is no `.ok()` conversion from a `Result` — the stdlib parsing functions use `Option` when the only failure mode is "not parseable."
  </what-to-observe>
</example>

---

## 4. Concurrency

<example>
  <context>
    Background worker that processes jobs from a queue, with a coordinator sending work.
  </context>
  <task>
    Spawn a concurrent worker, communicate over a typed channel, signal completion.
  </task>
  <rust>

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(32);

    tokio::spawn(async move {
        while let Some(job) = rx.recv().await {
            println!("processing: {job}");
        }
        println!("worker done");
    });

    tx.send("job-1".to_string()).await.unwrap();
    tx.send("job-2".to_string()).await.unwrap();
    drop(tx); // closes the channel
}
```

  </rust>
  <flix>

```flix
def main(): Unit \ {Chan, NonDet, IO} =
    let jobs = "job-1" :: "job-2" :: Nil;
    region rc {
        let (tx, rx) = Channel.buffered(32);

        spawn {
            List.forEach(job -> {
                println("processing: ${job |> String.toUpperCase}");
                Channel.send(job, tx)
            }, jobs)
        } @ rc;

        let _results = List.map(_ -> Channel.recv(rx), jobs);
        println("worker done")
    }
```

  </flix>
  <what-to-observe>
    Rust uses `async/await` with an executor (`tokio`). Flix uses CSP-style concurrency: `spawn` creates an OS thread, `Channel.send`/`Channel.recv` communicate. There is no `async` keyword — effects (`Chan`, `NonDet`, `IO`) in the type signature indicate that a function participates in concurrent I/O.

    `Channel.recv` blocks until a message arrives. The `NonDet` effect is required because the value received depends on thread scheduling. `Channel.send` only requires `Chan`.

    The `region rc` block scopes the spawned thread's lifetime — the region will not exit until all spawned threads complete. This is structured concurrency: no orphaned threads.

    Spawned computations must have only primitive effects or be pure. Algebraic user-defined effects (`eff Foo { ... }`) cannot cross thread boundaries — this is a current Flix limitation.

    Flix concurrency never shares mutable memory across threads (principle 15). All data crossing thread boundaries goes through channels as immutable messages. There is no `Arc<Mutex<T>>` equivalent.
  </what-to-observe>
</example>

---

## 5. File I/O

<example>
  <context>
    Log aggregator that reads multiple files and writes a summary.
  </context>
  <task>
    Read lines from files, process them, write output — with effects tracked.
  </task>
  <rust>

```rust
use std::fs;
use std::io::{self, Write, BufWriter};

fn aggregate(inputs: &[&str], output: &str) -> io::Result<()> {
    let mut total = 0usize;
    let mut errors = Vec::new();

    for path in inputs {
        let content = fs::read_to_string(path)?;
        for line in content.lines() {
            if line.contains("ERROR") {
                errors.push(line.to_string());
                total += 1;
            }
        }
    }

    let out = fs::File::create(output)?;
    let mut w = BufWriter::new(out);
    writeln!(w, "total errors: {total}")?;
    for e in &errors {
        writeln!(w, "{e}")?;
    }
    Ok(())
}
```

  </rust>
  <flix>

```flix
def aggregate(inputs: List[String], output: String): Unit \ {FsRead, FsWrite} =
    let errors =
        inputs
            |> List.flatMap(path ->
                FileRead.readLines(path)
                    |> List.filter(line -> String.contains(substr = "ERROR", line)))
    ;
    let total = List.length(errors);
    let lines = "total errors: ${total}" :: errors;
    FileWrite.writeLines(lines, output)
```

  </flix>
  <what-to-observe>
    Rust's file I/O is imperative and returns `io::Result` at each step, propagated with `?`. Flix's `FileRead` and `FsWrite` are effect labels — declaring them in the signature is how the compiler verifies that only intentionally I/O-capable callers can invoke this function. The function body reads imperatively but the compiler enforces the capability boundary.

    `FileRead.readLines` returns `List[String]` directly (not `Result`) — Flix stdlib I/O functions raise the effect rather than returning a wrapped error, because the error surface is expressed through the effect system, not through the return type. Use `Result.tryCatch` when you need to catch a specific Java-layer exception.

    `String.contains(substr = "ERROR", line)` uses a named record argument. This prevents confusion when a function takes two `String` parameters of the same type — the compiler enforces which is the substring and which is the haystack. Rust uses positional args and relies on the programmer to remember order.

    There is no `BufWriter` — `FileWrite.writeLines` handles buffering internally.
  </what-to-observe>
</example>

---

## 6. Enums / ADTs

<example>
  <context>
    A protocol message type for a CLI tool that parses and dispatches commands.
  </context>
  <task>
    Define a sum type with data in each variant.
  </task>
  <rust>

```rust
#[derive(Debug, Clone, PartialEq)]
enum Cmd {
    Start { name: String },
    Stop  { id: u32, force: bool },
    List,
    Show  (String),
}

fn describe(cmd: &Cmd) -> String {
    match cmd {
        Cmd::Start { name }       => format!("start session '{name}'"),
        Cmd::Stop { id, force: true }  => format!("force-stop #{id}"),
        Cmd::Stop { id, force: false } => format!("stop #{id}"),
        Cmd::List                 => "list all".to_string(),
        Cmd::Show(id)             => format!("show {id}"),
    }
}
```

  </rust>
  <flix>

```flix
enum Cmd with Eq, ToString {
    case Start(String)
    case Stop(Int32, Bool)
    case List
    case Show(String)
}

def describe(cmd: Cmd): String = match cmd {
    case Cmd.Start(name)          => "start session '${name}'"
    case Cmd.Stop(id, true)       => "force-stop #${id}"
    case Cmd.Stop(id, false)      => "stop #${id}"
    case Cmd.List                 => "list all"
    case Cmd.Show(id)             => "show ${id}"
}
```

  </flix>
  <what-to-observe>
    Flix enum variants carry positional tuple fields, not named fields. Rust allows named struct-like variant fields (`Stop { id: u32, force: bool }`); Flix uses positional tuples (`Stop(Int32, Bool)`). For disambiguation when two fields share a type, prefer wrapping in a record type.

    `with Eq, ToString` derives typeclass instances — analogous to Rust's `#[derive(PartialEq, Debug)]`. The set of derivable classes is different: Flix derives `Eq`, `Order`, `Hash`, `ToString`; Rust derives `PartialEq`, `Eq`, `PartialOrd`, `Ord`, `Hash`, `Debug`, `Clone`, `Copy`.

    Pattern matching in Flix can match on literal `true`/`false` inline inside a variant pattern (`Cmd.Stop(id, true)`). Rust does the same. Exhaustiveness is checked in both compilers.

    Variant names are qualified: `Cmd.Start`, not bare `Start`. Rust uses `Cmd::Start` (with `::`) or can use bare `Start` after `use Cmd::*`. Flix forbids wildcard imports.
  </what-to-observe>
</example>

---

## 7. Pattern Matching

<example>
  <context>
    Parser that classifies tokens and extracts values with guards.
  </context>
  <task>
    Match on a value using guards, wildcards, and nested patterns; demonstrate exhaustiveness.
  </task>
  <rust>

```rust
fn classify(n: i32) -> &'static str {
    match n {
        i32::MIN..=-1 => "negative",
        0             => "zero",
        1..=9         => "single digit",
        _             => "large",
    }
}

fn describe_pair(pair: (i32, Option<i32>)) -> String {
    match pair {
        (x, Some(y)) if x == y => format!("equal pair: {x}"),
        (x, Some(y))           => format!("pair: {x} and {y}"),
        (x, None)              => format!("solo: {x}"),
    }
}
```

  </rust>
  <flix>

```flix
def classify(n: Int32): String = match n {
    case x if x < 0  => "negative"
    case 0           => "zero"
    case x if x < 10 => "single digit"
    case _           => "large"
}

def describePair(pair: (Int32, Option[Int32])): String = match pair {
    case (x, Option.Some(y)) if x == y => "equal pair: ${x}"
    case (x, Option.Some(y))           => "pair: ${x} and ${y}"
    case (x, Option.None)              => "solo: ${x}"
}
```

  </flix>
  <what-to-observe>
    Both compilers check exhaustiveness and reject incomplete matches. The syntax differs: Rust uses `=>` in arms; Flix uses `=>` too. Guards use `if` in both: `case x if x < 0`.

    Rust range patterns (`1..=9`) have no Flix equivalent — use a guard with a boolean expression instead (`case x if x >= 1 and x < 10`). Note `and` not `&&`.

    Flix prohibits variable shadowing across all scopes. If you have `let x = 5` before a `match`, you cannot bind a new `x` in a pattern arm — the compiler will reject it as a re-declaration. Rust allows shadowing freely. In Flix, use a different name in the arm.

    Option variants are always qualified: `Option.Some(y)`, `Option.None`. Rust uses bare `Some(y)` and `None` because they are in the prelude. Flix's prelude is intentionally small — `Option.Some` and `Option.None` are the canonical forms.
  </what-to-observe>
</example>

---

## 8. Mutability

<example>
  <context>
    Frequency counter that accumulates counts from a list of items.
  </context>
  <task>
    Build a mutable map inside a function, then return an immutable result.
  </task>
  <rust>

```rust
use std::collections::HashMap;

fn frequencies(items: &[&str]) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for item in items {
        *counts.entry(item.to_string()).or_insert(0) += 1;
    }
    counts
}
```

  </rust>
  <flix>

```flix
def frequencies(items: List[String]): Map[String, Int32] =
    region rc {
        let counts = MutMap.empty(rc);
        List.forEach(item ->
            MutMap.adjust!(n -> n + 1, 0, item, counts)
        , items);
        MutMap.toImmutable(counts)
    }
```

  </flix>
  <what-to-observe>
    Rust expresses mutability with `let mut` and `&mut`. Flix expresses it with `region rc { ... }` — all mutable values (`MutMap`, `Array`, `ref`) are allocated inside a region and cannot escape it. When the region block ends, the mutation effect is gone; the function as a whole can be pure.

    `MutMap.adjust!` (note the `!` suffix — destructive operation) increments an existing entry or inserts with the default value `0` if absent, then increments. This replaces Rust's `entry(...).or_insert(0)` + dereference-and-increment pattern.

    `MutMap.toImmutable` converts to a persistent `Map` — the return type is immutable even though the construction was mutable internally. The caller receives a pure, immutable value. The region approach achieves the same goal as Rust's ownership: mutation is contained and cannot leak.

    Flix has no `&mut` references, no borrow checker, and no ownership rules. The region type system (not Hindley-Milner, a separate layer) ensures mutable values don't outlive their region. The GC handles deallocation.
  </what-to-observe>
</example>

---

## 9. Traits

<example>
  <context>
    Formatter abstraction over multiple output backends (terminal, JSON, plain text).
  </context>
  <task>
    Define a shared interface, implement it for multiple types, call it generically.
  </task>
  <rust>

```rust
trait Render {
    fn render(&self, label: &str, value: &str) -> String;
}

struct Plain;
struct Json;

impl Render for Plain {
    fn render(&self, label: &str, value: &str) -> String {
        format!("{label}: {value}")
    }
}

impl Render for Json {
    fn render(&self, label: &str, value: &str) -> String {
        format!("{{\"{}\":\"{}\"}}", label, value)
    }
}

fn print_item<R: Render>(r: &R, label: &str, value: &str) {
    println!("{}", r.render(label, value));
}
```

  </rust>
  <flix>

```flix
trait Render[a] {
    pub def render(label: String, value: String, x: a): String
}

enum Plain { case Plain }
enum Json  { case Json  }

instance Render[Plain] {
    pub def render(label: String, value: String, _x: Plain): String =
        "${label}: ${value}"
}

instance Render[Json] {
    pub def render(label: String, value: String, _x: Json): String =
        "{\"${label}\":\"${value}\"}"
}

def printItem(label: String, value: String, r: a): Unit \ IO with Render[a] =
    println(Render.render(label, value, r))
```

  </flix>
  <what-to-observe>
    Flix traits are type classes in the Haskell/Scala sense. The type parameter goes on the trait declaration (`trait Render[a]`), not on the method. Rust traits are more like Go interfaces in shape — the `self` receiver is implicit. In Flix, the subject is explicit as a regular argument (subject-last: `render(label, value, x: a)`).

    Implementations use `instance` not `impl`. The constraint syntax on a generic function is `with Render[a]` (Flix) vs `R: Render` (Rust). Both appear after the parameter list, before the body.

    Flix does not allow function overloading by type (principle 25). All polymorphism must go through type classes. Rust allows free function overloading via traits but also allows inherent methods, which Flix does not have.

    `enum Plain { case Plain }` is the Flix idiom for a unit-like type (analogous to Rust `struct Plain;`). Single-variant enums with no data are common for implementing type class instances on marker types.
  </what-to-observe>
</example>

---

## 10. Module System

<example>
  <context>
    A multi-file CLI library with internal helpers and a public API.
  </context>
  <task>
    Organize code into modules with controlled visibility; import selectively.
  </task>
  <rust>

```rust
// src/fmt.rs
pub mod fmt {
    pub fn bold(s: &str) -> String {
        format!("\x1b[1m{s}\x1b[0m")
    }

    pub(crate) fn dim(s: &str) -> String {
        format!("\x1b[2m{s}\x1b[0m")
    }

    fn escape(s: &str) -> String {  // private
        format!("\x1b[0m{s}")
    }
}

// src/main.rs
mod fmt;
use fmt::fmt::bold;

fn main() {
    println!("{}", bold("hello"));
}
```

  </rust>
  <flix>

```flix
// Fmt.flix
mod Fmt {
    pub def bold(s: String): String = "\u{1b}[1m${s}\u{1b}[0m"

    // visible within the project but not exported as pub
    def dim(s: String): String = "\u{1b}[2m${s}\u{1b}[0m"

    def escape(s: String): String = "\u{1b}[0m${s}"  // private
}

// Main.flix
use Fmt.bold

def main(): Unit \ IO =
    println(bold("hello"))
```

  </flix>
  <what-to-observe>
    Rust separates file layout from module structure: `mod fmt;` tells the compiler to load `fmt.rs`, and the module name is declared inside. In Flix, module structure matches namespace structure directly — `mod Fmt { ... }` in any `.flix` file creates the `Fmt` namespace. There is no `mod file;` declaration; all `.flix` files in a project are compiled together (whole-program compilation, principle 8).

    Rust has `pub`, `pub(crate)`, `pub(super)`, and private. Flix has two levels: `pub` (public) and no annotation (private/internal). There is no crate-scoped visibility equivalent.

    `use Fmt.bold` brings `bold` into scope unqualified. Flix forbids wildcard imports (`use Fmt.*`) — principle 23 (Declaration Monotonicity): a new definition added to `Fmt` should not silently shadow something in scope. Every imported name must be explicit.

    Rust's `use` can be placed at any scope level, including inside function bodies. Flix `use` declarations go at the top of the file or module block.
  </what-to-observe>
</example>

---

## Go deeper

- Language overview: [https://doc.flix.dev/](https://doc.flix.dev/)
- Effect system: [https://doc.flix.dev/effect-system.html](https://doc.flix.dev/effect-system.html)
- Effects and handlers: [https://doc.flix.dev/effects-and-handlers.html](https://doc.flix.dev/effects-and-handlers.html)
- Primitive effects list: [https://doc.flix.dev/primitive-effects.html](https://doc.flix.dev/primitive-effects.html)
- Pattern matching: [https://doc.flix.dev/pattern-matching.html](https://doc.flix.dev/pattern-matching.html)
- Concurrency (channels): [https://doc.flix.dev/concurrency.html](https://doc.flix.dev/concurrency.html)
- Regions and mutability: [https://doc.flix.dev/regions.html](https://doc.flix.dev/regions.html)
- Type classes: [https://doc.flix.dev/type-classes.html](https://doc.flix.dev/type-classes.html)
- Standard library API: [https://api.flix.dev/](https://api.flix.dev/)
- Design principles paper: [https://flix.dev/paper/onward2022.pdf](https://flix.dev/paper/onward2022.pdf)

# Python to Flix: Conceptual Translation Reference

Paired examples for Python developers learning Flix. Each section shows idiomatic code in both languages — not a mechanical transliteration, but the natural way each language approaches the same problem.

Quick orientation before reading the examples:

- Flix tracks effects in type signatures. No annotation means the function is guaranteed pure.
- `Result[err, ok]` replaces exceptions for recoverable errors. The type parameters are `(error, value)` — error first.
- `Option[t]` replaces `None`-as-absent. There is no null.
- Subject-last stdlib: `List.map(f, xs)` not `xs.map(f)`.
- Boolean operators are keywords: `and`, `or`, `not` — same words as Python, but they are the only valid spellings.
- No implicit coercions. No variable shadowing.

---

## 1. Error Handling

<example>
  <context>
    CLI tool that parses a user-supplied integer from a string, then divides by it.
    Errors are recoverable — we want to report them, not crash.
  </context>
  <task>
    Parse a string to an integer and perform division, propagating failure information
    back to the caller without exceptions.
  </task>
  <python>
    def parse_and_divide(s: str, numerator: int) -> int:
        try:
            divisor = int(s)
        except ValueError:
            raise ValueError(f"'{s}' is not a valid integer")
        if divisor == 0:
            raise ZeroDivisionError("cannot divide by zero")
        return numerator // divisor

    try:
        result = parse_and_divide("0", 100)
        print(result)
    except (ValueError, ZeroDivisionError) as e:
        print(f"Error: {e}")
  </python>
  <flix>
    def parseAndDivide(s: String, numerator: Int32): Result[String, Int32] =
        match Int32.fromString(s) {
            case None      => Err("'${s}' is not a valid integer")
            case Some(0)   => Err("cannot divide by zero")
            case Some(div) => Ok(numerator / div)
        }

    def main(): Unit \ IO =
        match parseAndDivide("0", 100) {
            case Ok(result) => println(result)
            case Err(msg)   => println("Error: ${msg}")
        }
  </flix>
  <what-to-observe>
    Python uses exceptions as a two-channel communication mechanism: the happy path
    returns a value; errors throw sideways. The caller must remember to wrap in
    try/except, and nothing in the type of `parse_and_divide` warns them.

    Flix encodes both outcomes in the return type: `Result[String, Int32]` says
    "this either fails with a String message or succeeds with an Int32". The compiler
    will not let you use the result without handling both branches. `Int32.fromString`
    returns `Option` (never raises), so parsing failure is a value you match on, not
    an exception you catch.

    The effect annotation `\ IO` on `main` is the only place IO appears — `parseAndDivide`
    has no annotation, so the compiler guarantees it is pure and cannot perform IO.
  </what-to-observe>
</example>

---

## 2. Collections Pipeline

<example>
  <context>
    Data processing script that reads a list of raw log entries and extracts
    the numeric IDs from lines that start with a prefix.
  </context>
  <task>
    Filter a list by a predicate, transform each element, and collect results.
  </task>
  <python>
    lines = ["req:42", "req:17", "info:status", "req:99", "debug:x"]

    ids = [
        int(line.split(":")[1])
        for line in lines
        if line.startswith("req:")
    ]

    total = sum(ids)
    print(f"Total: {total}, count: {len(ids)}")
  </python>
  <flix>
    def main(): Unit \ IO =
        let lines = "req:42" :: "req:17" :: "info:status" :: "req:99" :: "debug:x" :: Nil;
        let ids =
            lines
            |> List.filter(String.startsWith(prefix = "req:"))
            |> List.map(s -> s |> String.splitOn(substr = ":") |> List.last |> Option.flatMap(Int32.fromString))
            |> List.filterMap(identity);
        let total = List.sum(ids);
        println("Total: ${total}, count: ${List.length(ids)}")
  </flix>
  <what-to-observe>
    Python list comprehensions combine filtering and mapping in one expression, which
    reads naturally for simple cases. Flix uses `|>` pipelines with subject-last
    stdlib functions. Because every stdlib function takes its subject last, each step
    reads as a transformation applied to the result of the previous step.

    `List.filterMap(identity)` is the Flix idiom for "keep only the Some values from
    a List[Option[a]]" — it maps and filters in one pass. There is no partial function
    equivalent to Python's implicit assumption that `int(x)` will succeed.

    `String.startsWith(prefix = "req:")` uses a named record argument. Flix requires
    this when a function has multiple parameters of the same type — it prevents you
    from accidentally swapping `prefix` and the subject string.
  </what-to-observe>
</example>

---

## 3. Optional Values

<example>
  <context>
    Configuration loader that reads optional environment variables and falls back
    to defaults when they are absent.
  </context>
  <task>
    Read a value that may or may not be present, provide a default, and chain
    optional transformations without null checks.
  </task>
  <python>
    import os

    def get_port() -> int:
        raw = os.environ.get("PORT")
        if raw is None:
            return 8080
        try:
            return int(raw)
        except ValueError:
            return 8080

    def get_host() -> str:
        return os.environ.get("HOST") or "localhost"

    print(f"Connecting to {get_host()}:{get_port()}")
  </python>
  <flix>
    def getPort(): Int32 \ Env =
        Env.getVar("PORT")
        |> Option.flatMap(Int32.fromString)
        |> Option.getWithDefault(8080)

    def getHost(): String \ Env =
        Env.getVar("HOST")
        |> Option.getWithDefault("localhost")

    def main(): Unit \ {IO, Env} =
        println("Connecting to ${getHost()}:${getPort()}")
  </flix>
  <what-to-observe>
    Python's `dict.get` returns `None` on miss, and `or` short-circuits on falsy
    values. This is concise but conflates "key absent" with "key present but empty
    string" — `os.environ.get("HOST") or "localhost"` substitutes the default for
    both cases.

    Flix's `Option` is explicit: `None` means "absent" and `Some("")` means "present
    but empty". `Option.getWithDefault` only fires on `None`.

    `Option.flatMap` chains optional transformations: if `getVar` returns `None`,
    `flatMap` skips the parse step entirely and produces `None`, which `getWithDefault`
    then converts to `8080`. No intermediate null checks.

    The `Env` effect in the type signatures is significant: `getPort` is not pure
    because reading environment variables is a side-effect. The compiler tracks this.
    `main` declares `\ {IO, Env}` — the union of both effects it calls.
  </what-to-observe>
</example>

---

## 4. Concurrency

<example>
  <context>
    Background worker that processes jobs from a queue while the main thread
    continues other work and eventually collects results.
  </context>
  <task>
    Run a computation concurrently, communicate via a typed channel, and
    collect the result without shared mutable state.
  </task>
  <python>
    import asyncio

    async def process(job: str) -> str:
        await asyncio.sleep(0)  # simulate async work
        return job.upper()

    async def main():
        jobs = ["alpha", "beta", "gamma"]
        tasks = [asyncio.create_task(process(job)) for job in jobs]
        results = await asyncio.gather(*tasks)
        for r in results:
            print(r)

    asyncio.run(main())
  </python>
  <flix>
    def process(job: String, tx: Sender[String]): Unit \ Chan =
        Channel.send(String.toUpperCase(job), tx)

    def main(): Unit \ {IO, Chan, NonDet} =
        let jobs = "alpha" :: "beta" :: "gamma" :: Nil;
        let (tx, rx) = Channel.buffered(List.length(jobs));
        region rc {
            List.forEach(job -> spawn { process(job, tx) } @ rc, jobs)
        };
        let results = List.map(_ -> Channel.recv(rx), jobs);
        List.forEach(println, results)
  </flix>
  <what-to-observe>
    Python's `asyncio` uses cooperative concurrency: tasks yield with `await` and
    the event loop schedules them. There is one thread; the illusion of parallelism
    comes from interleaving at yield points.

    Flix uses OS threads with typed channels for communication. `spawn` starts a
    real concurrent computation. `Channel.buffered(n)` creates a typed channel pair
    `(Sender[String], Receiver[String])` — the types prevent you from sending the
    wrong value type or reading from the write end.

    Flix's concurrency model is "share memory by communicating": mutable state never
    crosses thread boundaries. Channels carry immutable messages. This eliminates
    entire classes of race conditions that async Python can still exhibit (shared
    mutable objects, list mutation during iteration).

    `spawn` requires a region (`@ rc`) that scopes the thread's lifetime. This is
    how Flix prevents threads from outliving the data they reference.
  </what-to-observe>
</example>

---

## 5. File I/O

<example>
  <context>
    Build tool that reads a template file, applies substitutions, and writes
    the result to an output path.
  </context>
  <task>
    Read a file, transform its contents, and write the result — with the
    effect clearly declared in the type.
  </task>
  <python>
    def process_template(src: str, dst: str, replacements: dict[str, str]) -> None:
        with open(src, "r", encoding="utf-8") as f:
            content = f.read()

        for old, new in replacements.items():
            content = content.replace(old, new)

        with open(dst, "w", encoding="utf-8") as f:
            f.write(content)

    process_template(
        "template.txt",
        "output.txt",
        {"{{name}}": "Alice", "{{lang}}": "Flix"},
    )
  </python>
  <flix>
    def applySubstitutions(content: String, replacements: List[(String, String)]): String =
        List.foldLeft(
            (acc, pair) -> {
                let (src, dst) = pair;
                String.replace(src = src, dst = dst, acc)
            },
            content,
            replacements
        )

    def processTemplate(src: String, dst: String, replacements: List[(String, String)]): Unit \ {FsRead, FsWrite} =
        let content = FileRead.read(src);
        let result = applySubstitutions(content, replacements);
        FileWrite.write(data = result, dst)

    def main(): Unit \ {IO, FsRead, FsWrite} =
        processTemplate(
            "template.txt",
            "output.txt",
            ("{{name}}", "Alice") :: ("{{lang}}", "Flix") :: Nil
        )
  </flix>
  <what-to-observe>
    Python's `with open(...) as f` is a context manager that guarantees the file
    handle closes when the block exits. The encoding must be remembered and specified
    every time.

    In Flix, `FileRead.read` and `FileWrite.write` are stdlib functions that handle
    resource cleanup internally. You do not manage file handles.

    The significant difference is the effect annotations: `processTemplate` declares
    `\ {FsRead, FsWrite}` and `applySubstitutions` has no annotation — it is pure.
    This is not just documentation. The compiler enforces that `applySubstitutions`
    cannot perform any I/O. If someone accidentally introduced a `println` call
    inside it, the code would not compile.

    In Python, `process_template` carries no information in its type about whether
    it reads files, makes network requests, or mutates global state. In Flix, the
    complete effect set is visible at the call site.
  </what-to-observe>
</example>

---

## 6. Data Classes

<example>
  <context>
    Domain model for a task management application that needs to represent
    tasks in multiple states with different associated data.
  </context>
  <task>
    Model a type with distinct variants that carry different data depending
    on which variant is active.
  </task>
  <python>
    from dataclasses import dataclass
    from typing import Optional
    from enum import Enum

    class Priority(Enum):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"

    @dataclass
    class Task:
        id: int
        title: str
        priority: Priority
        assignee: Optional[str] = None

    @dataclass
    class TaskResult:
        pass

    @dataclass
    class Pending(TaskResult):
        task: Task

    @dataclass
    class InProgress(TaskResult):
        task: Task
        assignee: str

    @dataclass
    class Done(TaskResult):
        task: Task
        summary: str

    def describe(result: TaskResult) -> str:
        match result:
            case Pending(task):
                return f"Pending: {task.title}"
            case InProgress(task, assignee):
                return f"{assignee} is working on {task.title}"
            case Done(task, summary):
                return f"Done: {task.title} — {summary}"
            case _:
                return "unknown"
  </python>
  <flix>
    enum Priority { case Low; case Medium; case High }

    type alias Task = {id = Int32, title = String, priority = Priority}

    enum TaskResult {
        case Pending(Task)
        case InProgress(Task, String)   // task, assignee
        case Done(Task, String)          // task, summary
    }

    def describe(result: TaskResult): String =
        match result {
            case TaskResult.Pending(t)          => "Pending: ${t#title}"
            case TaskResult.InProgress(t, who)  => "${who} is working on ${t#title}"
            case TaskResult.Done(t, summary)    => "Done: ${t#title} — ${summary}"
        }
  </flix>
  <what-to-observe>
    Python models variant types by inheritance: a base class and subclasses for each
    variant. This requires boilerplate and relies on the programmer to remember all
    cases. The `case _` fallback in Python's match is necessary because Python does
    not enforce exhaustiveness.

    Flix uses algebraic data types (ADTs): `enum TaskResult` declares all variants
    in one place. Each variant is a constructor that carries exactly the data it
    needs — no `Optional` fields, no inheritance hierarchy.

    Pattern matching on a Flix enum is exhaustive: if you add a new variant (`case
    Blocked(Task, String)`) and forget to handle it in `describe`, the compiler
    emits an error. Python's structural subtyping offers no such guarantee.

    `type alias Task` creates a named record type. Records in Flix are structural —
    `{id = Int32, title = String, priority = Priority}` is a first-class type.
    Field access is `t#title` — `#` is the record label accessor. No class definition required.
  </what-to-observe>
</example>

---

## 7. Pattern Matching

<example>
  <context>
    HTTP response classifier that routes responses to different handlers
    based on status code ranges and body content.
  </context>
  <task>
    Match on values using guards, destructuring, and nested patterns — with
    compiler-verified exhaustiveness.
  </task>
  <python>
    from dataclasses import dataclass

    @dataclass
    class Response:
        status: int
        body: str

    def classify(resp: Response) -> str:
        match resp:
            case Response(status=200, body=b) if b:
                return f"OK with body: {b[:50]}"
            case Response(status=200):
                return "OK but empty"
            case Response(status=s) if 400 <= s < 500:
                return f"Client error {s}"
            case Response(status=s) if 500 <= s < 600:
                return f"Server error {s}"
            case Response(status=s):
                return f"Unexpected status {s}"
  </python>
  <flix>
    type alias Response = {status = Int32, body = String}

    def classify(resp: Response): String =
        match (resp#status, resp#body) {
            case (200, body) if String.length(body) > 0 =>
                "OK with body: ${String.take(50, body)}"
            case (200, _) =>
                "OK but empty"
            case (status, _) if status >= 400 and status < 500 =>
                "Client error ${status}"
            case (status, _) if status >= 500 and status < 600 =>
                "Server error ${status}"
            case (status, _) =>
                "Unexpected status ${status}"
        }
  </flix>
  <what-to-observe>
    Python 3.10 pattern matching is expressive but not exhaustive: the compiler
    does not verify you handled all possible shapes. Adding a new field to `Response`
    does not trigger any warnings in existing match expressions.

    Flix match is exhaustive by default. If you match on an enum, you must cover
    every constructor. Wildcard `_` makes a catch-all. Guards use `if` after the
    pattern, with `and`/`or`/`not` as the only boolean operators — `&&` is a
    compile error.

    Flix matches on tuples (`(resp.status, resp.body)`) as a common pattern for
    matching multiple values simultaneously. This is equivalent to Python's
    `case Response(status=s, body=b)` but without requiring a class definition
    to destructure.

    Note `String.take(50, body)` — Flix has no slice syntax (`body[:50]`). All
    string operations go through the stdlib, which keeps the API discoverable.
  </what-to-observe>
</example>

---

## 8. Module Organization

<example>
  <context>
    Multi-file application with shared utilities. The project needs to expose
    a public API while keeping implementation details private.
  </context>
  <task>
    Organize code into modules, control visibility, and import selectively
    from other modules.
  </task>
  <python>
    # geometry/shapes.py
    import math

    def _validate_radius(r: float) -> None:
        if r <= 0:
            raise ValueError(f"radius must be positive, got {r}")

    def circle_area(radius: float) -> float:
        _validate_radius(radius)
        return math.pi * radius ** 2

    def circle_perimeter(radius: float) -> float:
        _validate_radius(radius)
        return 2 * math.pi * radius

    # main.py
    from geometry.shapes import circle_area, circle_perimeter
    print(circle_area(5.0))
  </python>
  <flix>
    // In Geometry/Shapes.flix
    mod Geometry.Shapes {

        def validateRadius(r: Float64): Result[String, Float64] =
            if (r <= 0.0) Err("radius must be positive, got ${r}")
            else Ok(r)

        pub def circleArea(radius: Float64): Result[String, Float64] =
            validateRadius(radius) |> Result.map(r -> Float64.pi() * r * r)

        pub def circlePerimeter(radius: Float64): Result[String, Float64] =
            validateRadius(radius) |> Result.map(r -> 2.0 * Float64.pi() * r)
    }

    // In Main.flix
    use Geometry.Shapes.{circleArea, circlePerimeter}

    def main(): Unit \ IO =
        match circleArea(5.0) {
            case Ok(area) => println("Area: ${area}")
            case Err(msg) => println("Error: ${msg}")
        }
  </flix>
  <what-to-observe>
    Python visibility is by convention: a leading underscore signals "private" but
    nothing enforces it. Any caller can import `_validate_radius` directly.

    Flix visibility is enforced: `validateRadius` has no `pub` annotation, so it
    is private to `Geometry.Shapes` and cannot be referenced from outside. The
    compiler rejects the import. `pub` is the explicit opt-in, not the default.

    Python modules map to files; Flix modules (`mod`) are declared in source and
    can span files or nest hierarchically (`Geometry.Shapes` is a child of
    `Geometry`). The file system layout is advisory, not binding.

    `use Geometry.Shapes.{circleArea, circlePerimeter}` is selective — there are
    no wildcard imports (`use Geometry.Shapes.*` is forbidden). This is deliberate:
    wildcard imports allow a new declaration in a dependency to silently shadow a
    local name. Flix's "Declaration Monotonicity" principle prohibits this class
    of breakage.
  </what-to-observe>
</example>

---

## 9. Type Safety

<example>
  <context>
    Unit conversion utility where mixing up kilograms and pounds, or meters
    and feet, produces silently wrong results at runtime in Python.
  </context>
  <task>
    Use the type system to prevent unit confusion at compile time — make
    invalid conversions a compiler error, not a runtime bug.
  </task>
  <python>
    # mypy type hints — checked externally, not enforced at runtime
    from typing import NewType

    Kilograms = NewType("Kilograms", float)
    Pounds = NewType("Pounds", float)

    def kg_to_lb(weight: Kilograms) -> Pounds:
        return Pounds(weight * 2.20462)

    def process_weight(weight: Kilograms) -> str:
        return f"{weight} kg = {kg_to_lb(weight)} lb"

    # mypy catches this — but only if you run mypy
    raw: float = 70.0
    process_weight(raw)  # type: ignore  # silences mypy but still "works"
  </python>
  <flix>
    enum Kilograms { case Kilograms(Float64) }
    enum Pounds    { case Pounds(Float64) }

    def kgToLb(w: Kilograms): Pounds =
        let Kilograms.Kilograms(v) = w;
        Pounds.Pounds(v * 2.20462)

    pub def processWeight(weight: Kilograms): String =
        let Kilograms.Kilograms(kg) = weight;
        let Pounds.Pounds(lb) = kgToLb(weight);
        "${kg} kg = ${lb} lb"

    def main(): Unit \ IO =
        // This is a compile error — Float64 is not Kilograms
        // processWeight(70.0)

        // This compiles
        processWeight(Kilograms.Kilograms(70.0)) |> println
  </flix>
  <what-to-observe>
    Python's `NewType` creates a distinct type for mypy's analysis, but at runtime
    `Kilograms` and `float` are the same object. A `# type: ignore` comment silences
    the checker entirely. The type safety is opt-in and bypassable.

    Flix enums create genuinely distinct types. `Kilograms.Kilograms(70.0)` and
    `70.0` are different types at compile time and the compiler will not accept one
    where the other is expected. There is no annotation to silence this — the program
    does not compile.

    The destructuring `let Kilograms.Kilograms(v) = w` unpacks the inner value.
    This is pattern matching in a let binding — standard Flix syntax. You must
    explicitly unwrap to get to the raw `Float64`, which makes the "escape hatch"
    visible in the code rather than hidden in a comment.

    This pattern is called "newtype wrapping" in functional programming. It costs
    nothing at runtime (the JVM sees a plain value) but provides compile-time
    guarantees that no external tool can bypass.
  </what-to-observe>
</example>

---

## 10. Dictionary / Map Operations

<example>
  <context>
    Word frequency counter that reads a list of words and produces a summary
    of how many times each word appears, then filters to frequent words.
  </context>
  <task>
    Build a frequency map, update counts, and query results — the core
    dict-building pattern.
  </task>
  <python>
    from collections import Counter

    def word_frequencies(words: list[str]) -> dict[str, int]:
        return dict(Counter(words))

    def frequent_words(words: list[str], threshold: int) -> list[str]:
        freq = word_frequencies(words)
        return sorted(
            (w for w, c in freq.items() if c >= threshold),
            key=lambda w: freq[w],
            reverse=True,
        )

    words = ["the", "cat", "sat", "on", "the", "mat", "the", "cat"]
    print(frequent_words(words, 2))
  </python>
  <flix>
    def wordFrequencies(words: List[String]): Map[String, Int32] =
        List.foldLeft(
            (acc, word) -> Map.insertWith((old, new) -> old + new, word, 1, acc),
            Map.empty(),
            words
        )

    def frequentWords(words: List[String], threshold: Int32): List[String] =
        let freq = wordFrequencies(words);
        freq
        |> Map.filter((_, count) -> count >= threshold)
        |> Map.toList
        |> List.sortWith((p1, p2) -> Int32.compare(snd(p2), snd(p1)))
        |> List.map(fst)

    def main(): Unit \ IO =
        let words = "the" :: "cat" :: "sat" :: "on" :: "the" :: "mat" :: "the" :: "cat" :: Nil;
        frequentWords(words, 2) |> println
  </flix>
  <what-to-observe>
    Python's `dict` is mutable by default. `Counter` is a specialized subclass with
    automatic frequency counting. The dict is updated in-place as items are added.

    Flix's `Map` is persistent (immutable). `Map.insertWith` returns a new map with
    the key updated — the original is unchanged. This feels like overhead, but the
    JVM shares structure between the old and new maps (a persistent red-black tree),
    so it is not a full copy.

    `Map.insertWith(f, key, value, m)` takes a merge function: if the key already
    exists, `f(existing, new)` determines the result. Here `(old, new) -> old + new`
    increments the count. This is a common pattern for building frequency maps without
    a `Counter` equivalent.

    `Map.filter` takes a function of `(key, value) -> Bool` — it filters by both
    key and value. `Map.toList` produces `List[(String, Int32)]` which can be sorted
    by the count using `snd` (second element of a pair), a prelude function.

    There is no `dict[key]` syntax in Flix. `Map.get(key, m)` returns `Option[v]`,
    forcing you to handle the "key not found" case explicitly.
  </what-to-observe>
</example>

---

## Go Deeper

These are the canonical sources. When the examples above and the docs disagree, the docs are current and the examples may be slightly behind.

- Language overview: [https://doc.flix.dev/](https://doc.flix.dev/)
- Effect system: [https://doc.flix.dev/effect-system.html](https://doc.flix.dev/effect-system.html)
- Effects and handlers: [https://doc.flix.dev/effects-and-handlers.html](https://doc.flix.dev/effects-and-handlers.html)
- Pattern matching: [https://doc.flix.dev/pattern-matching.html](https://doc.flix.dev/pattern-matching.html)
- Algebraic data types: [https://doc.flix.dev/algebraic-data-types.html](https://doc.flix.dev/algebraic-data-types.html)
- Records: [https://doc.flix.dev/records.html](https://doc.flix.dev/records.html)
- Concurrency: [https://doc.flix.dev/concurrency.html](https://doc.flix.dev/concurrency.html)
- Regions: [https://doc.flix.dev/regions.html](https://doc.flix.dev/regions.html)
- Standard library API: [https://api.flix.dev/](https://api.flix.dev/)
- Design principles: [https://flix.dev/principles/](https://flix.dev/principles/)

# Flix Effect System

Flix is a **direct-style** language — effects are tracked in the type signature, not encoded as monadic wrappers. This is a deliberate contrast to Cats Effect, ZIO, and Kyo. Imperative code with effect annotations replaces wrapping values in `IO[A]`.

## The Three Kinds of Effects

| Kind | Defined by | Handleable? | Scope |
|------|-----------|-------------|-------|
| **Primitive** | Compiler (built-in) | No — viral | Program-wide |
| **Algebraic** | User (`eff` keyword) | Yes — scoped | Handled at call site |
| **Heap** | Region blocks | Yes — scoped | Region lifetime |

### Primitive Effects

Pre-defined, map to JVM-level side-effects, cannot be intercepted by handlers:

| Effect | Represents |
|--------|-----------|
| `IO` | Any outside-world interaction |
| `Env` | OS environment info (username, cwd, CPU count) |
| `Exec` | Process spawning |
| `FsRead` | File system reads |
| `FsWrite` | File system writes |
| `Net` | Network access |
| `NonDet` | Non-determinism (random) — does NOT require `IO` |
| `Sys` | JVM internals (Runtime, System, reflection) |
| `Chan` | Channel communication |

Key behavior: primitive effects are **viral**. Once a function has `IO`, all callers must declare `IO`. There is no way to handle or remove a primitive effect.

`NonDet` is special — it is the only primitive effect that does not bundle with `IO`. A coin-flip function is non-deterministic but has no side-effects on the outside world.

### Algebraic Effects

User-defined with `eff`, invoked by name, handled with `run ... with handler`:

```flix
// Declare an effect with operations
eff Ask {
    def ask(): String          // resumable — returns String
}

eff Fail {
    def fail(msg: String): Void  // non-resumable — Void means no continuation
}
```

**Void return = non-resumable.** When an effect operation returns `Void`, the handler cannot call `resume` (its argument type is `Void`, which has no values). This models exceptions — control does not return to the raise site.

### Heap Effects (Regions)

Region blocks create scoped mutable memory:

```flix
region rc {
    let s = MutSet.empty(rc)
    MutSet.add!(42, s)
    // s is mutable within this block
}
// outside: pure — mutation cannot escape the region
```

Regions allow pure functions with internal mutability. The effect does not escape the region boundary.

## Effect Syntax

```flix
// Pure — no effect annotation
def add(x: Int32, y: Int32): Int32 = x + y

// Single effect
def greet(): Unit \ IO = println("hello")

// Multiple effects (set syntax)
def fetch(): Unit \ {Net, IO} = ...

// Effect polymorphism
def map(f: a -> b \ ef, l: List[a]): List[b] \ ef = ...

// Effect removal (handler removes the effect from the type)
def withFail(f: Unit -> a \ ef): Option[a] \ ef - Fail = ...
```

**No effect annotation = pure.** This is the default and the compiler enforces it.

## Handler Patterns

### Pattern 1: Exception (Non-Resumable)

```flix
eff Fail {
    def fail(msg: String): Void
}

def divide(x: Int32, y: Int32): Int32 \ Fail =
    if (y == 0) do Fail.fail("division by zero") else x / y

run {
    println(divide(10, 0))
} with handler Fail {
    def fail(msg, _resume) = println("Error: ${msg}")
}
```

`_resume` is unused because `Void` return means non-resumable.

### Pattern 2: Dependency Injection (Resumable)

```flix
eff Config {
    def get(key: String): String
}

// Test handler
run { myApp() } with handler Config {
    def get(key, resume) = resume(match key {
        case "db" => "localhost"
        case _    => "default"
    })
}

// Production handler
run { myApp() } with handler Config {
    def get(key, resume) = resume(Env.getVar(key) |> Option.getWithDefault(""))
}
```

### Pattern 3: Backtracking (Multiple Resumptions)

```flix
eff Amb {
    def flip(): Bool
}

// Handler explores all branches
def handleAmb(f: Unit -> a \ ef): List[a] \ ef - Amb =
    run { f() :: Nil } with handler Amb {
        def flip(_, resume) = resume(true) ::: resume(false)
    }
```

Calling `resume` multiple times forks the computation. This is how you implement backtracking, SAT solving, and ambiguity exploration.

### Pattern 4: Multiple Effects

```flix
run {
    greeting()
} with handler Ask {
    def ask(_, resume) = resume("Bond, James Bond")
} with handler Say {
    def say(s, resume) = { println(s); resume() }
}
```

**Handler nesting order matters.** `handleAmb(handleFail(f))` and `handleFail(handleAmb(f))` produce different results because the outer handler sees the inner handler's output.

## Direct Style vs. Monadic Style

| Aspect | Flix (direct) | ZIO/Cats Effect (monadic) |
|--------|--------------|---------------------------|
| Pure function guarantee | True — type checker enforces | False — `IO[A]` wraps everything |
| Code style | Imperative with effect annotations | for-comprehension / flatMap chains |
| Effect composability | Set union in type: `\ {IO, Net}` | Nested monad transformers |
| Resumable control flow | Native — call `resume` | Requires special libraries |

## Purity Reflection

The stdlib exploits purity tracking: operations like `Map.map`, `Map.count`, `Set.count` automatically parallelize when given a pure function. This is tracked via the effect system — no programmer annotation needed. The compiler annotation `@ParallelWhenPure` marks these functions.

## Current Limitations

- **No polymorphic effects**: `eff Throw[a]` does not compile. Workaround: declare separate effects per concrete type
- **No unhandled algebraic effects in `spawn`**: spawned computations must have only primitive effects or be pure

## Go Deeper

- Effect system overview: [https://doc.flix.dev/effect-system.html](https://doc.flix.dev/effect-system.html)
- Effects and handlers: [https://doc.flix.dev/effects-and-handlers.html](https://doc.flix.dev/effects-and-handlers.html)
- Primitive effects list: [https://doc.flix.dev/primitive-effects.html](https://doc.flix.dev/primitive-effects.html)
- Polymorphic effects paper: [https://flix.dev/paper/oopsla2020b.pdf](https://flix.dev/paper/oopsla2020b.pdf)

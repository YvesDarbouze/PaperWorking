# TypeScript → Flix Translation Reference

Paired examples showing how TypeScript (with Effect-TS) patterns map to Flix. The goal is not literal translation — it is understanding the conceptual shift so you can write idiomatic Flix rather than TypeScript in disguise.

Effect-TS is the closest TypeScript analogue to Flix because both track effects in the type system. Effect-TS encodes effects monadically (`Effect<A, E, R>`); Flix encodes them directly (`a \ {E1, E2}`). The surface syntax differs substantially, but the intent is the same: make the effect visible at the boundary.

---

<example>
  <context>
    CLI tool reading a configuration file, reporting a structured error if the file is missing or malformed.
  </context>
  <task>
    Error handling — wrapping a fallible operation and recovering from errors.
  </task>
  <typescript>

```typescript
import { Effect, pipe } from "effect"
import * as fs from "@effect/platform/FileSystem"

interface ConfigError {
  readonly _tag: "ConfigError"
  readonly message: string
}

const readConfig = pipe(
  fs.FileSystem,
  Effect.flatMap(fs => fs.readFileString("config.json")),
  Effect.mapError((e): ConfigError => ({
    _tag: "ConfigError",
    message: `Failed to read config: ${e.message}`
  })),
  Effect.catchAll(err =>
    Effect.succeed({ db: "localhost", port: 5432 })
  )
)
```

  </typescript>
  <flix>

```flix
enum ConfigError {
    case MissingFile(String)
    case Malformed(String)
}

def readConfig(): Map[String, String] \ FsRead =
    match Result.tryCatch(_ -> FileRead.read("config.json")) {
        case Ok(content) => parseConfig(content)
        case Err(_)      => Map#{"db" => "localhost", "port" => "5432"}
    }
```

  </flix>
  <what-to-observe>
    Effect-TS error handling is monadic: you chain `.flatMap`, `.mapError`, and `.catchAll` on an `Effect` value that describes the computation without running it. The error is a type parameter on `Effect<A, E, R>`.

    Flix is direct-style: `readConfig` *runs* the computation and returns a value. The `FsRead` effect in the signature tells callers this function reads the filesystem — that is the entire contract. Errors that are expected recoverable outcomes use `Result`; errors that indicate bugs use `bug!`. `Result.tryCatch` converts a Java exception at the boundary into an explicit `Ok`/`Err` that you then `match` on. There is no monad stack, no `pipe`, no deferred execution.
  </what-to-observe>
</example>

---

<example>
  <context>
    Data processing pipeline — filtering and transforming a collection of records fetched from a data source.
  </context>
  <task>
    Collections pipeline — map, filter, and aggregate over a sequence.
  </task>
  <typescript>

```typescript
import { pipe, Array as Arr } from "effect"

interface User {
  name: string
  age: number
  active: boolean
}

const processUsers = (users: User[]) =>
  pipe(
    users,
    Arr.filter(u => u.active),
    Arr.map(u => u.name.toUpperCase()),
    Arr.sort(String.Order)
  )
```

  </typescript>
  <flix>

```flix
type alias User = { name = String, age = Int32, active = Bool }

def processUsers(users: List[User]): List[String] =
    users
        |> List.filter(u -> u#active)
        |> List.map(u -> String.toUpperCase(u#name))
        |> List.sort
```

  </flix>
  <what-to-observe>
    The pipeline shape is nearly identical — both thread a collection through successive transformations. The key differences are mechanical:

    Effect-TS `pipe` takes a value and a sequence of curried functions. Flix `|>` is a built-in binary operator with no import needed.

    Flix stdlib is subject-last: `List.filter(predicate, list)`. This makes partial application natural and pipelines read left-to-right without a wrapper. There are no method calls on the collection itself (`users.filter(...)` does not exist).

    Record field access uses `u#active` rather than `u.active`. This is the Flix extensible records syntax — `#` is the field access operator.

    `List.sort` is total and returns a new list. There is no `.sort()` mutation, and no separate "Order" object needed for basic `Ord`-constrained types.
  </what-to-observe>
</example>

---

<example>
  <context>
    Parsing a query parameter from an HTTP request — the value might be absent or non-numeric.
  </context>
  <task>
    Option/nullable — representing absent values without null.
  </task>
  <typescript>

```typescript
import { Option, pipe } from "effect"

function parseLimit(params: URLSearchParams): number {
  return pipe(
    Option.fromNullable(params.get("limit")),
    Option.flatMap(s => {
      const n = parseInt(s, 10)
      return isNaN(n) ? Option.none() : Option.some(n)
    }),
    Option.getOrElse(() => 20)
  )
}
```

  </typescript>
  <flix>

```flix
def parseLimit(params: Map[String, String]): Int32 =
    Map.get("limit", params)
        |> Option.flatMap(s -> Int32.fromString(s))
        |> Option.getWithDefault(20)
```

  </flix>
  <what-to-observe>
    Effect-TS needs `Option.fromNullable` because JavaScript has null and undefined — a real absent value must be lifted into the `Option` type from a nullable world. In Flix, `null` does not exist for any user-facing type. `Map.get` already returns `Option[v]`, not `v | null`. There is nothing to lift.

    `Int32.fromString` returns `Option[Int32]` — it is a total function. There is no `parseInt` that returns `NaN` on failure. All stdlib parse functions follow this contract.

    The pipeline reads identically in shape, but the Flix version has no `Option.fromNullable` step because there is no null boundary to cross. The absence is expressed in the type from the beginning.
  </what-to-observe>
</example>

---

<example>
  <context>
    Background worker that fetches data from two independent APIs and combines the results.
  </context>
  <task>
    Concurrency — running two computations in parallel and joining their results.
  </task>
  <typescript>

```typescript
import { Effect } from "effect"

const fetchUser = (id: string) =>
  Effect.tryPromise(() => fetch(`/users/${id}`).then(r => r.json()))

const fetchOrders = (id: string) =>
  Effect.tryPromise(() => fetch(`/orders/${id}`).then(r => r.json()))

const dashboard = (id: string) =>
  Effect.all([fetchUser(id), fetchOrders(id)], { concurrency: "unbounded" })
```

  </typescript>
  <flix>

```flix
def dashboard(id: String): (String, String) \ {IO, Net} =
    region rc {
        let (userTx, userRx)     = Channel.buffered(1)
        let (ordersTx, ordersRx) = Channel.buffered(1)
        spawn { Channel.send(fetchUser(id), userTx) }   @ rc
        spawn { Channel.send(fetchOrders(id), ordersTx) } @ rc
        (Channel.recv(userRx), Channel.recv(ordersRx))
    }
```

  </flix>
  <what-to-observe>
    Effect-TS parallelism is expressed by combining `Effect` values with `Effect.all` and a concurrency option. The computation is still described, not executed, until a runtime runs it.

    Flix concurrency is structural. `spawn` is a language keyword that creates a new OS thread (not a green thread or fiber). Channels (`Channel.buffered`) carry typed messages — `Sender[t]` and `Receiver[t]` are different types, so you cannot accidentally recv on a sender. The `region rc` scopes the lifetime of any mutable state the spawned threads need.

    A critical Flix constraint: spawned computations can only carry primitive effects (`IO`, `Net`, etc.) or be pure. They cannot carry unhandled algebraic effects — those must be handled before the spawn boundary.

    The `Chan` primitive effect is implicit when using channels inside `spawn`; the outer function declares `IO` and `Net` for the HTTP calls.
  </what-to-observe>
</example>

---

<example>
  <context>
    Build tool reading source files, processing them, and writing output to a dist directory.
  </context>
  <task>
    File I/O — reading files and writing output with explicit effect tracking.
  </task>
  <typescript>

```typescript
import { Effect } from "effect"
import { FileSystem } from "@effect/platform"

const compile = (src: string, dst: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const content = yield* fs.readFileString(src)
    const output = transform(content)
    yield* fs.writeFileString(dst, output)
  })
```

  </typescript>
  <flix>

```flix
def compile(src: String, dst: String): Unit \ {FsRead, FsWrite} =
    let content = FileRead.read(src)
    let output  = transform(content)
    FileWrite.write(data = output, dst)
```

  </flix>
  <what-to-observe>
    Effect-TS requires acquiring the `FileSystem` service from the environment with `yield*` before using it. The `Effect.gen` generator gives the monadic computation a direct-style look, but the yielding and service acquisition are still explicit plumbing.

    Flix I/O is a direct function call. `FileRead.read` and `FileWrite.write` are stdlib functions — no service acquisition, no generator, no yield. The effect appears only in the return type annotation: `\ {FsRead, FsWrite}`. Callers that see this signature know the function touches the filesystem. That is the entire DI story for I/O in Flix.

    `FileWrite.write` uses named record arguments (`data = output`) because the function has two `String` parameters and Flix requires disambiguation for non-commutative same-type arguments.
  </what-to-observe>
</example>

---

<example>
  <context>
    Application with a database connection pool — the pool is configured once and shared across request handlers.
  </context>
  <task>
    Dependency injection — providing a capability to a computation without threading it through every call.
  </task>
  <typescript>

```typescript
import { Effect, Layer, Context } from "effect"

interface DbPool {
  query: (sql: string) => Effect.Effect<unknown[], Error>
}
const DbPool = Context.GenericTag<DbPool>("DbPool")

const makeDbPool = Layer.succeed(DbPool, {
  query: sql =>
    Effect.tryPromise(() => db.query(sql))
})

const getUser = (id: string) =>
  Effect.gen(function* () {
    const pool = yield* DbPool
    return yield* pool.query(`SELECT * FROM users WHERE id = '${id}'`)
  })

const program = getUser("42").pipe(Effect.provide(makeDbPool))
```

  </typescript>
  <flix>

```flix
eff Db {
    def query(sql: String): List[Map[String, String]]
}

def getUser(id: String): List[Map[String, String]] \ Db =
    do Db.query("SELECT * FROM users WHERE id = '${id}'")

// Production handler
def withPostgres(f: Unit -> a \ ef): a \ ef - Db =
    run { f() } with handler Db {
        def query(sql, resume) = resume(pgQuery(sql))
    }

// Test handler
def withFakeDb(f: Unit -> a \ ef): a \ ef - Db =
    run { f() } with handler Db {
        def query(_, resume) = resume(List#{ Map#{"id" => "42", "name" => "Alice"} })
    }
```

  </flix>
  <what-to-observe>
    Effect-TS DI uses `Context.GenericTag` to identify a service and `Layer` to provide it. The `yield* DbPool` call retrieves the service from an implicit environment type parameter `R` in `Effect<A, E, R>`. Swapping implementations means providing a different layer.

    Flix DI uses algebraic effects: declare the capability with `eff`, call it with `do Db.query(...)`, and provide it by wrapping in a handler. The handler intercepts the `do Db.query` call and decides what to do — in production it calls the real database; in tests it returns a fixture. There is no service registry, no `Context.Tag`, no `Layer.succeed`. The effect in the type signature (`\ Db`) *is* the dependency declaration.

    Swapping implementations means swapping which handler you wrap the computation in. Handler nesting is explicit at the call site, not configured in a separate composition root.
  </what-to-observe>
</example>

---

<example>
  <context>
    Event processor handling different message types from a queue — each type requires distinct logic.
  </context>
  <task>
    Pattern matching — dispatching on the shape of a value with exhaustive coverage.
  </task>
  <typescript>

```typescript
type Event =
  | { tag: "UserCreated"; userId: string; email: string }
  | { tag: "OrderPlaced"; orderId: string; total: number }
  | { tag: "PaymentFailed"; orderId: string; reason: string }

function handle(event: Event): string {
  switch (event.tag) {
    case "UserCreated":
      return `Welcome ${event.email}`
    case "OrderPlaced":
      return `Order ${event.orderId} for $${event.total}`
    case "PaymentFailed":
      return `Payment failed: ${event.reason}`
  }
}
```

  </typescript>
  <flix>

```flix
enum Event {
    case UserCreated(String, String)   // userId, email
    case OrderPlaced(String, Float64)  // orderId, total
    case PaymentFailed(String, String) // orderId, reason
}

def handle(event: Event): String =
    match event {
        case UserCreated(_, email)       => "Welcome ${email}"
        case OrderPlaced(orderId, total) => "Order ${orderId} for $${total}"
        case PaymentFailed(_, reason)    => "Payment failed: ${reason}"
    }
```

  </flix>
  <what-to-observe>
    TypeScript discriminated unions use a string tag field to distinguish variants — this is a convention enforced by TypeScript's narrowing, not a language primitive. Exhaustiveness checking requires `switch` with no `default`, and the TypeScript compiler's inference performs the narrowing.

    Flix ADTs (`enum`) are a first-class language feature. Variants are not objects with tag fields — they are constructor functions. `match` destructures the constructor and binds the fields in one step. Exhaustiveness is checked by the compiler; any unmatched case is a hard error (not a warning).

    `_` discards a field you do not need. There is no equivalent of `event.tag` — you never inspect the discriminant separately because `match` does it atomically.
  </what-to-observe>
</example>

---

<example>
  <context>
    Library with public API surface — some functions are for users, others are internal helpers.
  </context>
  <task>
    Module organization — controlling visibility and grouping related functions.
  </task>
  <typescript>

```typescript
// parser.ts — public API
export function parse(input: string): Result<ParseError, Ast> {
  return tokenize(input).flatMap(tokens => buildAst(tokens))
}

// Internal — not exported
function tokenize(input: string): Result<ParseError, Token[]> { ... }
function buildAst(tokens: Token[]): Result<ParseError, Ast> { ... }
```

  </typescript>
  <flix>

```flix
mod Parser {

    pub def parse(input: String): Result[ParseError, Ast] =
        tokenize(input) |> Result.flatMap(buildAst)

    // Private by default — no pub keyword
    def tokenize(input: String): Result[ParseError, List[Token]] = ...

    def buildAst(tokens: List[Token]): Result[ParseError, Ast] = ...

}
```

  </flix>
  <what-to-observe>
    TypeScript visibility is opt-in public: you `export` what you want public, and everything else is module-private. Consumers must import from the file path.

    Flix visibility is opt-out public: everything is private unless you write `pub`. This is enforced at the language level, not the module bundler level. `mod Parser { ... }` creates a namespace; `Parser.parse` is how callers refer to it after `use Parser.parse` or via the fully qualified name.

    Flix also enforces that unused declarations are compile errors. A private helper that is defined but never called will fail the build — there is no dead code silently accumulating.

    There are no wildcard exports (`export * from ...`) and no wildcard imports (`use Parser.*`). Every name must be mentioned explicitly.
  </what-to-observe>
</example>

---

<example>
  <context>
    Application that reads typed configuration values from the environment, with different sources in test vs. production.
  </context>
  <task>
    Type-safe configuration — reading config with a swappable source and failure on missing keys.
  </task>
  <typescript>

```typescript
import { Effect, Config } from "effect"

const AppConfig = Config.all({
  dbUrl: Config.string("DATABASE_URL"),
  port:  Config.integer("PORT").pipe(Config.withDefault(3000)),
  debug: Config.boolean("DEBUG").pipe(Config.withDefault(false))
})

const program = Effect.gen(function* () {
  const config = yield* AppConfig
  yield* Effect.log(`Starting on port ${config.port}`)
})
```

  </typescript>
  <flix>

```flix
eff Config {
    def get(key: String): Option[String]
}

type alias AppConfig = { dbUrl = String, port = Int32, debug = Bool }

def loadAppConfig(): AppConfig \ Config =
    let dbUrl = do Config.get("DATABASE_URL") |> Option.getWithDefault("localhost")
    let port  = do Config.get("PORT")
                    |> Option.flatMap(Int32.fromString)
                    |> Option.getWithDefault(3000)
    let debug = do Config.get("DEBUG") |> Option.map(s -> s == "true") |> Option.getWithDefault(false)
    { dbUrl = dbUrl, port = port, debug = debug }

// Production: reads real environment
def withEnvConfig(f: Unit -> a \ ef): a \ {ef - Config, Env} =
    run { f() } with handler Config {
        def get(key, resume) = resume(Env.getVar(key))
    }

// Test: uses a fixed map
def withTestConfig(cfg: Map[String, String], f: Unit -> a \ ef): a \ ef - Config =
    run { f() } with handler Config {
        def get(key, resume) = resume(Map.get(key, cfg))
    }
```

  </flix>
  <what-to-observe>
    Effect-TS `Config` is a built-in module that reads from environment variables and provides a composable declarative API. The configuration is described as a value, then injected via the `R` environment parameter at runtime.

    Flix has no built-in `Config` module. Instead, you declare a `Config` algebraic effect with one operation: `get(key)`. The business logic calls `do Config.get(key)` — it does not know or care where the value comes from. The handler decides: in production it calls `Env.getVar`, in tests it reads a fixed `Map`. Swapping sources is swapping handlers, not swapping modules.

    This demonstrates the general Flix DI pattern: any external dependency (database, config, clock, random) becomes an `eff` declaration. The type signature documents the dependency; the handler provides it.
  </what-to-observe>
</example>

---

<example>
  <context>
    Unit testing a pure transformation function and an effectful function that reads a file.
  </context>
  <task>
    Testing — writing isolated, deterministic tests for pure and effectful code.
  </task>
  <typescript>

```typescript
import { describe, test, expect } from "vitest"
import { Effect } from "effect"

describe("normalize", () => {
  test("trims and lowercases", () => {
    expect(normalize("  Hello World  ")).toBe("hello world")
  })
})

describe("loadConfig", () => {
  test("returns defaults when file is missing", async () => {
    const result = await Effect.runPromise(
      loadConfig.pipe(
        Effect.provide(MockFileSystemLayer)
      )
    )
    expect(result.port).toBe(3000)
  })
})
```

  </typescript>
  <flix>

```flix
@Test
def testNormalize(): Bool =
    normalize("  Hello World  ") == "hello world"

@Test
def testLoadConfigDefaults(): Bool \ IO =
    let defaults = Map#{"PORT" => "8080"}
    let config   = withTestConfig(defaults, () -> loadAppConfig())
    config#port == 8080
```

  </flix>
  <what-to-observe>
    vitest/jest require test runner setup, imports, and a `describe`/`test`/`expect` ceremony. Async tests must be `async` functions returning promises, and effectful tests need mock layers to be provided.

    Flix tests are functions annotated with `@Test`. A test that returns `Bool` is a property test — `true` is pass, `false` is fail. No test runner API to import, no assertion library, no describe blocks. The Flix compiler discovers and runs `@Test` functions automatically.

    Testing effectful code is testing with a different handler, not a different mock layer. `withTestConfig` is the same algebraic effect handler shown in the config example — it intercepts `Config.get` calls and returns values from the fixture map. The test does not need to understand `MockFileSystemLayer` or configure a test runtime. The handler boundary is the mock.

    Pure tests have no effect annotation. If `normalize` accidentally tried to read the filesystem, the test would not compile.
  </what-to-observe>
</example>

---

## Go deeper

- Language overview: [https://doc.flix.dev/](https://doc.flix.dev/)
- Effect system: [https://doc.flix.dev/effect-system.html](https://doc.flix.dev/effect-system.html)
- Effects and handlers (algebraic): [https://doc.flix.dev/effects-and-handlers.html](https://doc.flix.dev/effects-and-handlers.html)
- Primitive effects reference: [https://doc.flix.dev/primitive-effects.html](https://doc.flix.dev/primitive-effects.html)
- Concurrency (channels and spawn): [https://doc.flix.dev/concurrency.html](https://doc.flix.dev/concurrency.html)
- Pattern matching: [https://doc.flix.dev/pattern-matching.html](https://doc.flix.dev/pattern-matching.html)
- Modules and namespaces: [https://doc.flix.dev/modules.html](https://doc.flix.dev/modules.html)
- Testing: [https://doc.flix.dev/testing.html](https://doc.flix.dev/testing.html)
- Full stdlib API: [https://api.flix.dev/](https://api.flix.dev/)

# Flix Standard Library Map

Task-oriented reference for the Flix standard library at [api.flix.dev](https://api.flix.dev/). Organized by what agents commonly need, with the Java equivalent they should NOT reach for.

## Stdlib Conventions

Before using any stdlib function, internalize these patterns:

**Subject-last**: Every function takes the collection/string/data as the final argument.

```flix
List.map(f, xs)        // NOT xs.map(f)
String.split(regex = r"...", s)
Map.get(k, m)
Option.flatMap(f, o)
```

**Named record arguments**: Functions with ambiguous same-type parameters use records:

```flix
String.contains(substr = "foo", s)
String.replace(src = "a", dst = "b", s)
String.startsWith(prefix = "http", s)
```

**Pipeline with `|>`**: Subject-last enables natural pipelines:

```flix
"hello world"
    |> String.toUpperCase
    |> String.words
    |> List.map(String.length)
    |> List.sum
```

**Destructive operations marked with `!`**: `Array.sort` returns new; `Array.sort!` mutates.

**Purity polymorphism**: Some Map/Set operations auto-parallelize when given a pure function (`@ParallelWhenPure`).

## String Operations

| Task | Function | Notes |
|------|----------|-------|
| Split | `String.split(regex = r"...", s)` | Uses regex; also `splitOn(substr = ..., s)` for literal |
| Join | `String.intercalate(sep, xs)` or `List.join(sep, l)` | `unlines`, `unwords` for common cases |
| Contains | `String.contains(substr = "...", s)` | Named arg prevents confusion |
| Starts/ends with | `String.startsWith(prefix = ..., s)` / `endsWith(suffix = ..., s)` | Named args |
| Trim | `String.trim(s)` / `trimLeft` / `trimRight` | |
| Pad | `String.padLeft(w, c, s)` / `padRight` / `center` | |
| Replace | `String.replace(src = ..., dst = ..., s)` | Named args; also `replaceMatches` for regex |
| Lines/words | `String.lines(s)` / `String.words(s)` | Returns `List[String]` |
| Case | `String.toUpperCase(s)` / `toLowerCase` | |
| Length | `String.length(s)` | |
| Levenshtein | `String.levenshtein(s1, s2)` | Edit distance |

Instead of: `import java.lang.String` methods

API: [https://api.flix.dev/String.html](https://api.flix.dev/String.html)

## Collections

### List (Persistent Linked List)

| Task | Function |
|------|----------|
| Map | `List.map(f, l)` |
| Filter | `List.filter(f, l)` |
| Fold | `List.foldLeft(f, init, l)` |
| FlatMap | `List.flatMap(f, l)` |
| Find | `List.find(f, l)` → `Option` |
| Sort | `List.sort(l)` / `sortBy(f, l)` / `sortWith(cmp, l)` |
| Group | `List.groupBy(f, l)` |
| Zip | `List.zip(l1, l2)` / `unzip` |
| Head/tail | `List.head(l)` → `Option` / `List.tail(l)` → `Option` |
| Join to string | `List.join(sep, l)` |
| Partition | `List.partition(f, l)` |

Instead of: `java.util.ArrayList`, `java.util.stream.Stream`

API: [https://api.flix.dev/List.html](https://api.flix.dev/List.html)

### Vector (Persistent Indexed)

Preferred over List for random access. Same functional API as List plus:

| Task | Function |
|------|----------|
| Index access | `Vector.get(i, v)` |
| Binary search | `Vector.binarySearch(x, v)` |
| Range | `Vector.range(start, end)` |

Instead of: `int[]`, `java.util.ArrayList`

API: [https://api.flix.dev/Vector.html](https://api.flix.dev/Vector.html)

### Array (Mutable, Region-Scoped)

```flix
region rc {
    let a = Array.init(rc, i -> i * 2, 10)
    Array.sort!(a)  // in-place mutation
}
```

| Task | Function |
|------|----------|
| Create | `Array.init(rc, f, len)` / `Array.repeat(rc, n, x)` |
| Access | `Array.get(i, a)` / `Array.put(x, i, a)` |
| Sort (in-place) | `Array.sort!(a)` |
| Sort (new) | `Array.sort(a)` |
| Transform (in-place) | `Array.transform!(f, a)` |

Instead of: `int[]`, `java.util.Arrays`

API: [https://api.flix.dev/Array.html](https://api.flix.dev/Array.html)

### Set (Persistent, Red-Black Tree)

| Task | Function |
|------|----------|
| Union | `Set.union(s1, s2)` |
| Intersection | `Set.intersection(s1, s2)` |
| Difference | `Set.difference(s1, s2)` |
| Member test | `Set.memberOf(x, s)` |
| Subset test | `Set.isSubsetOf(s1, s2)` |

Instead of: `java.util.HashSet`, `java.util.TreeSet`

API: [https://api.flix.dev/Set.html](https://api.flix.dev/Set.html)

### Map (Persistent, Red-Black Tree)

| Task | Function |
|------|----------|
| Lookup | `Map.get(k, m)` → `Option` |
| Insert | `Map.insert(k, v, m)` |
| Remove | `Map.remove(k, m)` |
| Union | `Map.union(m1, m2)` |
| Invert | `Map.invert(m)` |

Instead of: `java.util.HashMap`, `java.util.TreeMap`

API: [https://api.flix.dev/Map.html](https://api.flix.dev/Map.html)

### MutMap (Mutable, Region-Scoped)

```flix
region rc {
    let m = MutMap.empty(rc)
    MutMap.put!(k, v, m)
    MutMap.getOrElsePut!(k, defaultVal, m)
}
```

Instead of: `java.util.HashMap` (imperative usage)

API: [https://api.flix.dev/MutMap.html](https://api.flix.dev/MutMap.html)

## Option and Result

### Option

| Task | Function |
|------|----------|
| Map | `Option.map(f, o)` |
| FlatMap | `Option.flatMap(f, o)` |
| Default | `Option.getWithDefault(default, o)` |
| Filter | `Option.filter(f, o)` |
| Sequence | `Option.sequence(l)` — `List[Option[a]]` → `Option[List[a]]` |
| Combine | `Option.map2(f, o1, o2)` through `map10` |

Instead of: `java.util.Optional`

API: [https://api.flix.dev/Option.html](https://api.flix.dev/Option.html)

### Result

| Task | Function |
|------|----------|
| Map | `Result.map(f, r)` |
| FlatMap | `Result.flatMap(f, r)` |
| Map error | `Result.mapErr(f, r)` |
| Catch exception | `Result.tryCatch(f)` → `Result[String, a]` |
| Sequence | `Result.sequence(l)` — short-circuits on first `Err` |

Instead of: checked exceptions, `try/catch`

API: [https://api.flix.dev/Result.html](https://api.flix.dev/Result.html)

## Number Parsing

| Task | Function | Returns |
|------|----------|---------|
| String → Int32 | `Int32.fromString(s)` | `Option[Int32]` |
| String → Int32 (radix) | `Int32.parse(radix, s)` | `Result[String, Int32]` |
| String → Float64 | `Float64.fromString(s)` | `Option[Float64]` |
| String → Int64 | `Int64.fromString(s)` | `Option[Int64]` |

Instead of: `Integer.parseInt`, `Double.parseDouble`

## Regex

```flix
// Compile-time checked regex literal
let r = regex"[0-9]+"

Regex.isMatch(r, "123")           // true
Regex.isSubmatch(r, "abc123def")  // true
Regex.submatches(r, "a1b2c3")    // finds all matches
Regex.replace(src = r, dst = "X", s)
```

Instead of: `import java.util.regex.Pattern`

API: [https://api.flix.dev/Regex.html](https://api.flix.dev/Regex.html)

## File I/O (Effects)

### FileRead

```flix
let content = FileRead.read("config.txt")
let lines = FileRead.readLines("data.csv")
let bytes = FileRead.readBytes("image.png")
let files = FileRead.list("src/")    // directory listing
let exists = FileRead.exists("foo.txt")
```

### FileWrite

```flix
FileWrite.write(data = "hello", "output.txt")
FileWrite.append(data = "\nworld", "output.txt")
FileWrite.writeLines(lines, "output.txt")
FileWrite.mkDirs("path/to/dir")
FileWrite.mkTempDir("prefix")
```

Instead of: `java.io.File`, `java.nio.file.Files`, `java.io.FileWriter`

API: [https://api.flix.dev/FileRead.html](https://api.flix.dev/FileRead.html) | [https://api.flix.dev/FileWrite.html](https://api.flix.dev/FileWrite.html)

## Environment (Effect)

```flix
Env.getVar("HOME")                    // Option[String]
Env.getEnv()                          // Map[String, String] — all vars
Env.getArgs()                         // List[String] — CLI args
Env.getProp("java.version")           // Option[String]
Env.getCurrentWorkingDirectory()      // Option[String]
Env.getUserHomeDirectory()            // Option[String]
Env.getTemporaryDirectory()           // Option[String]
Env.getVirtualProcessors()            // Int32
```

Instead of: `System.getenv()`, `System.getProperty()`, `Runtime.getRuntime().availableProcessors()`

API: [https://api.flix.dev/Env.html](https://api.flix.dev/Env.html)

## Concurrency

```flix
let (tx, rx) = Channel.buffered(10)   // typed Sender[t] / Receiver[t]
Channel.send(42, tx)
let v = Channel.recv(rx)
Channel.timeout(1000i64)              // timeout in ms
```

Spawn with the language keyword: `spawn { computation() } @ rc`

Instead of: `java.util.concurrent.BlockingQueue`, `ExecutorService`

API: [https://api.flix.dev/Channel.html](https://api.flix.dev/Channel.html)

## Character Classification

```flix
Char.isDigit(c)
Char.isLetter(c)
Char.isWhitespace(c)
Char.isUpperCase(c)
Char.toUpperCase(c)
```

Instead of: `Character.isDigit()`, `Character.isLetter()`

API: [https://api.flix.dev/Char.html](https://api.flix.dev/Char.html)

## Math

```flix
Int32.abs(x)           // absolute value
Int32.pow(base, exp)   // exponentiation
Int32.modulo(x, y)     // Euclidean modulo
Int32.log2(x)          // log base 2

Float64.floor(x)
Float64.ceil(x)
Float64.round(x)
Float64.exp(x)
Float64.pow(x, y)
```

Instead of: `Math.abs()`, `Math.pow()`, `Math.floor()`

API: [https://api.flix.dev/Int32.html](https://api.flix.dev/Int32.html) | [https://api.flix.dev/Float64.html](https://api.flix.dev/Float64.html)

## Prelude (Always in Scope)

These require no import:

| Function | Description |
|----------|-------------|
| `println(x)` | Print any `ToString` value |
| `x \|> f` | Pipe: apply `f` to `x` |
| `f >> g` | Compose: `x -> g(f(x))` |
| `identity(x)` | Returns `x` |
| `constant(x)` | Returns `_ -> x` |
| `flip(f)` | Swaps argument order |
| `fst((a, b))` | First of pair |
| `snd((a, b))` | Second of pair |
| `bug!(msg)` | Crash with message (unrecoverable) |
| `unreachable!()` | Assert unreachable code |

## Coverage Gaps (Use Java Interop)

These have no stdlib equivalent — Java interop is appropriate:

| Need | Java package |
|------|-------------|
| HTTP client | `java.net.http.HttpClient` |
| JSON parsing | `org.json.*` or similar |
| Date/time | `java.time.*` |
| Cryptography | `java.security.MessageDigest` |
| Process execution | `java.lang.ProcessBuilder` |
| Stdin reading | `java.io.BufferedReader` + `System.in` |
| Random numbers | `java.util.Random` (or use `List.shuffle` for shuffling) |

## Go Deeper

- Full stdlib API: [https://api.flix.dev/](https://api.flix.dev/)
- Any specific module: `https://api.flix.dev/{ModuleName}.html`

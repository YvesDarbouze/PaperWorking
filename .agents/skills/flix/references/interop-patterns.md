# Java Interop Patterns

Flix runs on the JVM and provides direct Java interoperability. All Java interactions carry the `IO` effect unless explicitly marked `unsafe`.

## Import Rules

Classes must be imported before use. Inline fully-qualified paths (`new java.io.File(...)`) are not valid.

```flix
import java.io.File
import java.io.FileWriter
import java.io.IOException

// Rename to avoid clashes with Flix modules
import java.lang.{String => JString}
```

No wildcard imports — `import java.util.*` is not supported. Each class must be named explicitly.

## Type Mapping (Flix ↔ Java)

| Flix type | Java type | Notes |
|-----------|-----------|-------|
| `Bool` | `boolean` | Unboxed |
| `Char` | `char` | Unboxed |
| `Float32` | `float` | Unboxed |
| `Float64` | `double` | Unboxed |
| `Int8` | `byte` | Unboxed |
| `Int16` | `short` | Unboxed |
| `Int32` | `int` | Unboxed |
| `Int64` | `long` | Unboxed |
| `String` | `String` | Shared |

**Flix primitives are always unboxed.** Passing `Int32` to a Java method expecting `java.lang.Integer` requires manual boxing: `java.lang.Integer.valueOf(myInt32)`.

## Object Construction

```flix
import java.io.File
let f = new File("foo.txt")
let f2 = new File("bar", "foo.txt")   // overload resolved by arity + types
```

Constructors are resolved by argument count and types. If ambiguous, add a type ascription.

## Method Calls

### Instance Methods

```flix
f.getName()
f.exists()
w.append("Hello\n")
```

### Static Methods

```flix
import java.lang.Math
Math.sin(3.14)
Math.abs(-123i32)   // Int32 literal suffix disambiguates overload
Math.abs(-123i64)   // different overload
```

### Varargs

```flix
import java.nio.file.Path
Path.of("Documents", ...{"Images", "me.jpg"})

// Zero extra varargs — must pass typed empty Vector
Path.of("Documents", (Vector.empty(): Vector[String]))
```

### Overload Disambiguation

When the compiler cannot resolve an overload, use a type ascription (parentheses required):

```flix
import java.lang.{String => JString}
JString.valueOf((o: Bool))   // parentheses around the ascription
```

## Exception Handling

Java exceptions are caught with `try/catch`:

```flix
import java.io.IOException
try {
    let w = new FileWriter(f)
    w.append("Hello\n")
    w.close()
} catch {
    case ex: IOException => println("Error: ${ex.getMessage()}")
}
```

For converting exceptions to `Result`, use `Result.tryCatch`:

```flix
let result = Result.tryCatch(_ -> {
    let w = new FileWriter(f)
    w.append("data")
    w.close()
})
// result: Result[String, Unit]
```

## Null Handling

Flix has no null. Java methods that return null need explicit checking at the boundary:

```flix
import java.lang.Object

// Check for null after Java call
let value = someJavaMethod()
if (Object.isNull(value))
    Option.None
else
    Option.Some(value)
```

Never let null propagate into Flix code. Check and convert to `Option` at the interop boundary.

## The `unsafe` Block

`unsafe` removes the `IO` effect from a Java call by asserting it is pure:

```flix
import java.lang.Math

// Without unsafe: Math.sin has \ IO
// With unsafe: pure function
def pythagoras(x: Float64, y: Float64): Float64 =
    unsafe Math.sqrt(Math.pow(x, 2.0) + Math.pow(y, 2.0))
```

**Only use `unsafe` on expressions that genuinely have no side-effects.** If the Java code actually mutates state, reads files, or does I/O, marking it `unsafe` breaks the type-and-effect system. The compiler may make incorrect optimization decisions, changing program behavior in subtle or catastrophic ways.

Safe uses of `unsafe`:

- Pure mathematical functions (`Math.sin`, `Math.sqrt`, `Math.pow`)
- String operations that create new strings without side-effects
- Constructors for immutable value objects

Unsafe uses of `unsafe` (do not do):

- File I/O, network calls, database queries
- Methods that modify the object or any global state
- Methods that read system properties, environment variables, or time

## Partial Application Workaround

Java methods cannot be partially applied. Wrap in a Flix function first:

```flix
import java.lang.{String => JString}

// Wrap Java method
def replaceAll(s: String, src: String, dst: String): String \ IO =
    s.replaceAll(src, dst)

// Now you can partially apply the Flix wrapper
let f = replaceAll("Hello World")
```

## Common Interop Recipes

### Reading a File (prefer stdlib)

```flix
// PREFER: Flix stdlib
FileRead.read("config.txt")

// ONLY IF NEEDED: Java interop
import java.nio.file.Files
import java.nio.file.Path
Files.readString(Path.of("config.txt"))
```

### Using a Java Collection

```flix
import java.util.ArrayList

let javaList = new ArrayList()
javaList.add("hello")
javaList.add("world")

// Convert to Flix — build manually
let flixList = "hello" :: "world" :: Nil
```

### Implementing a Java Interface

```flix
import java.lang.Runnable

// Anonymous class syntax
let r = new Runnable {
    def run(): Unit = println("Running!")
}
```

## Go Deeper

- Interop overview: [https://doc.flix.dev/interoperability.html](https://doc.flix.dev/interoperability.html)
- Creating objects: [https://doc.flix.dev/creating-objects.html](https://doc.flix.dev/creating-objects.html)
- Calling methods: [https://doc.flix.dev/calling-methods.html](https://doc.flix.dev/calling-methods.html)
- Type casts: [https://doc.flix.dev/type-casts.html](https://doc.flix.dev/type-casts.html)

---
title: "agtype Is Everything"
description: "agtype is AGE's single data type for all values crossing the SQL-Cypher boundary. Every cypher() column is agtype. Casting is restrictive: agtype can only cast to varchar among string types — not to json, jsonb, or text (Issues #1225, #1996). This reference covers agtype's type system, graph entity wire formats, and casting rules."
tags: apache-age, agtype, data-types, casting, vertex, edge, path
---

# agtype Is Everything

agtype is AGE's single data type for all values crossing the SQL↔Cypher boundary. Every `cypher()` column is agtype. It is a superset of JSON and a custom implementation of PostgreSQL's JSONB.

All `cypher()` calls declare agtype columns:

```sql
SELECT * FROM cypher('graph_name', $$
  MATCH (p:Person) RETURN p.name, p.age
$$) AS (name agtype, age agtype);
```

---

## Simple Types

| Type | Literal Example | Notes |
|------|----------------|-------|
| null | `null` | Missing/undefined. `null = null` → `null`, not `true`. In WHERE, non-`true` treated as `false` |
| integer | `42` | 64-bit signed. Range: ±9.2×10¹⁸ |
| float | `3.14` | IEEE-754 double. Special values: `'Infinity'::float`, `'-Infinity'::float`, `'NaN'::float` |
| numeric | `1.0::numeric` | Exact decimal. `::numeric` cast required on literals. Slower than float |
| boolean | `true`, `false` | Output is full word (`true`/`false`), not PostgreSQL's `t`/`f` |
| string | `'hello'` | Input: single quotes. Output: double quotes (`"hello"`). See escape sequences below |

### AGE-Specific Behaviors

- **null = null → null**: Unlike SQL's `IS NULL`, Cypher null equality returns null, which WHERE treats as false
- **NaN = NaN → true**: AGE deviates from IEEE-754 — `'NaN'::float = 'NaN'::float` is true for consistent sorting
- **::numeric is mandatory**: Decimal literals without `::numeric` are floats. `1.5` ≠ `1.5::numeric`
- **Boolean output**: Returns full word `true`/`false`, not PostgreSQL's `t`/`f`
- **String quote asymmetry**: Input uses single quotes `'Alice'`, output uses double quotes `"Alice"`

### String Escape Sequences

| Sequence | Character |
|----------|-----------|
| `\t` `\n` `\r` `\b` `\f` | Tab, newline, carriage return, backspace, form feed |
| `\'` `\"` `\\` | Single quote, double quote, backslash |
| `\uXXXX` | Unicode UTF-16 code point |

---

## Composite Types

### List

Ordered collection of agtype values. Elements are comma-separated inside square brackets. A list may contain mixed types including `null` and nested maps.

```sql
-- Literal list with mixed types
SELECT * FROM cypher('my_graph', $$
  WITH [1, 2.0, 'three', true, null] AS lst RETURN lst
$$) AS (lst agtype);

-- Access by index (0-based; negative counts from end)
WITH [10, 20, 30] AS lst RETURN lst[0]   -- 10
WITH [10, 20, 30] AS lst RETURN lst[-1]  -- 30

-- Slice (start inclusive, end exclusive)
WITH [0,1,2,3,4] AS lst RETURN lst[1..3]  -- [1, 2]
WITH [0,1,2,3,4] AS lst RETURN lst[..2]   -- [0, 1]
WITH [0,1,2,3,4] AS lst RETURN lst[2..]   -- [2, 3, 4]
```

Out-of-bound single element access returns `null`. Out-of-bound slices are truncated.

### Map

Key-value collection. Keys must be strings; values can be any agtype.

```sql
SELECT * FROM cypher('my_graph', $$
  WITH {name: 'Alice', age: 30, active: true} AS m
  RETURN m.name, m.age
$$) AS (name agtype, age agtype);
-- "Alice", 30

-- Nested map access
WITH {address: {city: 'Portland', zip: '97201'}} AS m
RETURN m.address.city  -- "Portland"
```

---

## Graph Entity Types

### Vertex

A vertex is the basic graph entity. It can exist independently. Vertices may have zero or one label, and zero or more properties.

**Wire format:**

```
{"id": <graphid>, "label": "<label>", "properties": {<key>: <value>, ...}}::vertex
```

**Attributes:**

| Attribute    | Description                          |
|--------------|--------------------------------------|
| `id`         | Unique graphid (label_id + sequence) |
| `label`      | Label name (string, may be empty)    |
| `properties` | Map of property key-value pairs      |

Create and retrieve a vertex:

```sql
SELECT * FROM cypher('my_graph', $$
  CREATE (p:Person {name: 'Alice', age: 30})
  RETURN p
$$) AS (p agtype);
-- {"id": 844424930131969, "label": "Person", "properties": {"name": "Alice", "age": 30}}::vertex
```

Access vertex properties in a query:

```sql
SELECT * FROM cypher('my_graph', $$
  MATCH (p:Person)
  RETURN p.name, p.age
$$) AS (name agtype, age agtype);
```

Type-cast a map literal to a vertex (useful for testing):

```sql
SELECT * FROM cypher('my_graph', $$
  WITH {id: 0, label: "Person", properties: {name: "Alice"}}::vertex AS v
  RETURN v
$$) AS (v agtype);
```

### Edge

An edge encodes a directed connection between exactly two vertices. Edges **must** have exactly one label.

**Wire format:**

```
{"id": <graphid>, "label": "<label>", "start_id": <graphid>, "end_id": <graphid>, "properties": {<key>: <value>, ...}}::edge
```

**Attributes:**

| Attribute    | Description                          |
|--------------|--------------------------------------|
| `id`         | Unique graphid                       |
| `label`      | Edge type label (required)           |
| `start_id`   | graphid of source vertex             |
| `end_id`     | graphid of target vertex             |
| `properties` | Map of property key-value pairs      |

Create and retrieve an edge:

```sql
SELECT * FROM cypher('my_graph', $$
  MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
  CREATE (a)-[r:KNOWS {since: 2020}]->(b)
  RETURN r
$$) AS (r agtype);
-- {"id": ..., "label": "KNOWS", "start_id": ..., "end_id": ..., "properties": {"since": 2020}}::edge
```

**Constraint:** Label names for vertices and edges cannot overlap within the same graph.

### Path

A path is a series of alternating vertices and edges, starting with a vertex. Minimum: one vertex and one edge.

**Wire format:** A list cast to `::path`:

```
[<vertex>::vertex, <edge>::edge, <vertex>::vertex, ...]::path
```

Capture and return a path:

```sql
SELECT * FROM cypher('my_graph', $$
  MATCH p = (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(b:Person)
  RETURN p
$$) AS (p agtype);
```

Extract components from a path using path functions:

```sql
SELECT * FROM cypher('my_graph', $$
  MATCH p = (a:Person)-[:KNOWS]->(b:Person)
  RETURN nodes(p), relationships(p), length(p)
$$) AS (nodes agtype, rels agtype, len agtype);
```

Type-cast a list to a path (for testing):

```sql
SELECT * FROM cypher('my_graph', $$
  WITH [
    {id: 0, label: "Person", properties: {name: "Alice"}}::vertex,
    {id: 2, start_id: 0, end_id: 1, label: "KNOWS", properties: {}}::edge,
    {id: 1, label: "Person", properties: {name: "Bob"}}::vertex
  ]::path AS p
  RETURN p
$$) AS (p agtype);
```

---

## Type Casting

### Cypher-side casting (inside cypher() queries)

| Cast | Example | Use |
|------|---------|-----|
| `::float` | `'Infinity'::float` | Special float literals |
| `::numeric` | `1.0::numeric` | Exact decimal arithmetic |
| `::vertex` | `{id:0, label:"L", properties:{}}::vertex` | Map to vertex (testing) |
| `::edge` | `{id:1, start_id:0, end_id:2, label:"E", properties:{}}::edge` | Map to edge (testing) |
| `::path` | `[v::vertex, e::edge, v2::vertex]::path` | List to path (testing) |

### SQL-side casting (outside cypher() queries)

When consuming agtype values in SQL, cast explicitly:

| Target SQL type | Cast | Notes |
|----------------|------|-------|
| varchar | `col::varchar` | **Works** — the only string cast that works |
| text | `col::text` | **Fails on non-scalars** — `ERROR: agtype argument must resolve to a scalar value` (Issue #1225) |
| json / jsonb | `col::json` | **ERROR: cannot cast type agtype to json** (Issue #1996) |
| int / bigint | `col::int`, `col::bigint` | Works for integer agtype values |
| float / numeric | `col::float`, `col::numeric` | Works for numeric agtype values |
| boolean | `col::boolean` | Works for boolean agtype values |

### agtype → JSON Workaround

agtype cannot cast directly to json/jsonb. Use the varchar bridge:

```sql
-- Fails: SELECT col::jsonb ...
-- Works: two-step cast
SELECT (col::varchar)::jsonb FROM cypher(...) AS (col agtype);

-- Or use to_jsonb on varchar
SELECT to_jsonb(col::varchar) FROM cypher(...) AS (col agtype);
```

### agtype_build_map() Limit

`agtype_build_map()` is limited to 100 PostgreSQL function arguments = **50 key-value pairs** maximum (Issue #1840). For vertices with more than 50 properties, use incremental SET:

```sql
-- Create with first 50 properties, then add more
SELECT * FROM cypher('g', $$
  CREATE (v:BigNode {prop1: val1, ..., prop50: val50})
  SET v += {prop51: val51, ..., prop100: val100}
  RETURN v
$$) AS (v agtype);
```

---

## AGE NULL vs PostgreSQL NULL

AGE's `null` and PostgreSQL's `NULL` are conceptually identical — both represent unknown/missing values. However, they exist in different layers:

- **PostgreSQL NULL**: SQL-level null (a row has no value for a column)
- **AGE null**: agtype-level null (a graph property is absent or unknown)

A `cypher()` column typed as `agtype` will return a PostgreSQL non-NULL row containing an agtype null value when a Cypher `null` is returned. Use agtype-aware functions (not `IS NULL`) to test for Cypher nulls in downstream SQL.

---

## Comparability Notes

| Situation                        | Result  | Notes                                  |
|----------------------------------|---------|----------------------------------------|
| `null = null`                    | `null`  | Unknown equals unknown is unknown      |
| `'NaN'::float = 'NaN'::float`   | `true`  | AGE deviation from IEEE-754 for sorting|
| `'NaN'::numeric = 'NaN'::numeric` | `true` | Same deviation                        |
| `1 = 1.0`                        | `true`  | Integer and float comparison           |
| `1 = 1::numeric`                 | `true`  | Integer and numeric comparison         |

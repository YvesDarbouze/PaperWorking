---
title: "The Wrapper Contract"
description: "Every Cypher query in AGE runs through the cypher() SQL function. There is no standalone REPL. This reference covers the wrapper mechanics, AGE-specific syntax deviations, unsupported features, and gotchas."
tags: apache-age, cypher, wrapper, cypher-function, unsupported, gotchas
---

## The cypher() Function

Every Cypher query in AGE runs through the `cypher()` SQL function. This is not optional — there is no standalone Cypher REPL.

**Signature:**

```sql
cypher(graph_name text, query_string text [, params agtype])
  RETURNS SETOF agtype
```

**Minimal form:**

```sql
SELECT * FROM cypher('graph_name', $$
  <Cypher here>
$$) AS (col agtype);
```

**Column list rules:**

- One `agtype` column per value returned by `RETURN`
- Column names are arbitrary — they do not need to match Cypher variable names
- When a terminal `CREATE`/`MERGE`/`DELETE` produces no rows, declare a placeholder column anyway:

```sql
-- Terminal clause — no rows returned, but column list still required
SELECT * FROM cypher('my_graph', $$
  CREATE (:Person {name: 'Alice'})
$$) AS (v agtype);
-- Returns 0 rows
```

**Dollar-quoting:** Use `$$` to avoid escaping single quotes inside the Cypher query body.

**Parameterized queries:** Pass an agtype map as the third argument; reference values with `$param_name`:

```sql
SELECT * FROM cypher('my_graph', $$
  MATCH (p:Person {name: $name})
  RETURN p
$$, '{"name": "Alice"}') AS (p agtype);
```

> **Note:** The `parameters` argument (third arg to `cypher()`) requires a prepared statement. Passing a literal map outside `PREPARE` throws: `ERROR: third argument of cypher function must be a parameter` (Issue #315). See hybrid-is-the-point.md for the PREPARE pattern.

---

## Graph Setup

Create a graph (must be done before any Cypher queries):

```sql
SELECT create_graph('my_graph');
```

Drop a graph:

```sql
SELECT drop_graph('my_graph', true);  -- true = cascade (drops all data)
```

Load the extension (once per database):

```sql
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
```

The `SET search_path` is required in every session (or set it permanently in `postgresql.conf` / `ALTER DATABASE`):

```sql
ALTER DATABASE mydb SET search_path = ag_catalog, "$user", public;
```

---

## Pattern Syntax

### Vertex Patterns

| Pattern                  | Meaning                              |
|--------------------------|--------------------------------------|
| `(n)`                    | Any vertex, bound to variable `n`    |
| `(:Person)`              | Any vertex with label `Person`       |
| `(n:Person)`             | Vertex with label `Person`, variable `n` |
| `(n:Person {name: 'Alice'})` | Vertex with label and property filter |
| `({name: 'Alice'})`      | Any vertex with property (no label)  |

### Edge Patterns

| Pattern              | Meaning                                      |
|----------------------|----------------------------------------------|
| `-[]-`               | Any edge, any direction                      |
| `-[r]-`              | Any edge, bound to `r`                       |
| `-[:KNOWS]->`        | Outgoing edge with label `KNOWS`             |
| `<-[:KNOWS]-`        | Incoming edge with label `KNOWS`             |
| `-[r:KNOWS]->`       | Outgoing `KNOWS` edge, bound to `r`          |
| `-[r:KNOWS {since: 2020}]->` | Edge with property filter          |

**AGE edge direction syntax** uses `>>` for outgoing and `<<` for incoming in some contexts:

```sql
-- Both forms are valid in AGE:
MATCH (a)-[:KNOWS]->(b)   -- standard
MATCH (a)-[:KNOWS]->>(b)  -- AGE extended form (also valid)
MATCH (a)<<-[:KNOWS]-(b)  -- incoming with AGE extended form
```

**Multiple edges in one pattern:**

```sql
SELECT * FROM cypher('my_graph', $$
  MATCH (a:Person {name: 'Charlie'})-[:ACTED_IN]->(movie)<-[:DIRECTED]-(director)
  RETURN movie.title, director.name
$$) AS (title agtype, director agtype);
```

### Variable-Length Edges

Match paths of variable depth using `*`:

| Pattern         | Meaning                                     |
|-----------------|---------------------------------------------|
| `-[*]->`        | Any number of hops (unbounded)             |
| `-[*2]->`       | Exactly 2 hops                             |
| `-[*2..5]->`    | Between 2 and 5 hops (inclusive)           |
| `-[*2..]->`     | 2 or more hops                             |
| `-[*..5]->`     | Up to 5 hops                               |

```sql
-- Find friends-of-friends (exactly 2 hops)
SELECT * FROM cypher('my_graph', $$
  MATCH (a:Person {name: 'Alice'})-[:KNOWS*2]->(fof:Person)
  RETURN fof.name
$$) AS (name agtype);

-- Find all reachable people within 3 hops
SELECT * FROM cypher('my_graph', $$
  MATCH (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(b:Person)
  RETURN b.name
$$) AS (name agtype);

-- Capture the full path
SELECT * FROM cypher('my_graph', $$
  MATCH p = (a:Person {name: 'Alice'})-[:KNOWS*]->(b:Person)
  RETURN p
$$) AS (p agtype);
```

---

## Standard openCypher

AGE implements standard openCypher clause syntax (MATCH, CREATE, MERGE, SET, REMOVE, DELETE, RETURN, WHERE, WITH, ORDER BY, SKIP, LIMIT, UNWIND). Standard operators and functions work as expected. The sections below cover only AGE-specific deviations.

---

## AGE-Specific Function Notes

Functions that behave differently in AGE than in standard openCypher or Neo4j:

| Function | AGE Behavior | Notes |
|----------|-------------|-------|
| `id(n)` | Returns `graphid` (bigint) | Unique per-graph only, not globally across graphs |
| `labels(n)` | Returns 0-or-1-element list | AGE supports exactly one label per vertex (Discussion #109) |
| `type(r)` | Returns edge label string | Standard behavior |
| `timestamp()` | Returns epoch milliseconds (bigint) | Not ISO-8601 string |
| `toString(x)` | Returns agtype string | Output uses double quotes |
| `toInteger(x)` | Returns agtype integer | Standard behavior |
| `toFloat(x)` | Returns agtype float | Standard behavior |
| `toBoolean(x)` | Returns agtype boolean | Output is full word (`true`/`false`), not `t`/`f` |
| `shortestPath()` | Supported | Must use variable-length pattern inside |
| `allShortestPaths()` | Supported | Same constraint |

**Not available in AGE:** `datetime()`, `date()`, `time()`, `duration()`, `localdatetime()`, `localtime()`. Use PostgreSQL date/time functions at the SQL layer instead.

---

## Not Supported in AGE

Features absent from AGE with recommended workarounds:

| Feature | Status | Workaround |
|---------|--------|------------|
| List comprehensions (`[x IN list WHERE ...]`) | Not supported | UNWIND + collect() |
| `reduce()` | Not supported | UNWIND + aggregation |
| CASE expressions | Supported (since late 2023, PR #1431) | — |
| `FOREACH` | Not supported | UNWIND + CREATE/SET |
| Multiple labels per vertex | Not supported (by design, Discussion #109) | Use a `type` property or separate labels |
| Map projections (`n{.name, .age}`) | Not supported | Return individual properties |
| Pattern comprehensions | Not supported | Separate MATCH + collect() |
| Existential subqueries (`EXISTS { MATCH ... }`) | Not supported | OPTIONAL MATCH + null check |
| `CALL {} IN TRANSACTIONS` | Not supported | Batch with UNWIND or application-level chunking |
| `LOAD CSV` | Not supported | Use `load_labels_from_file()` / `load_edges_from_file()` or AGEFreighter |
| `CREATE INDEX` (Cypher syntax) | Not supported | Use PostgreSQL `CREATE INDEX` on label tables |
| `CREATE CONSTRAINT` | Not supported | No property constraints; validate at application layer |
| APOC procedures | Not supported | Write PostgreSQL functions returning agtype |
| `WITH *` | Not supported | Explicitly list all variables |

---

## AGE-Specific Gotchas

### 1. SET search_path is required every session

Without it, AGE functions like `cypher()` and `create_graph()` are not found:

```sql
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
```

### 2. Column list in AS() must always be present

Even when a clause produces no rows, the AS column list is mandatory:

```sql
-- Correct
SELECT * FROM cypher('g', $$ CREATE (:N) $$) AS (v agtype);

-- Wrong — will error
SELECT * FROM cypher('g', $$ CREATE (:N) $$);
```

### 3. Vertex and edge labels cannot share names

Within a single graph, `Person` cannot be both a vertex label and an edge label.

### 4. Edges require a label

```sql
-- Wrong — edge has no label
CREATE (a)-[]->(b)

-- Correct
CREATE (a)-[:KNOWS]->(b)
```

### 5. graphid is not globally unique across graphs

IDs are unique within a graph, not across graphs. Do not compare `id(n)` values from different graphs.

### 6. String literals use single quotes in Cypher

Output always uses double quotes. Input must use single quotes:

```sql
MATCH (p:Person {name: 'Alice'})  -- correct input
-- Output will show: "Alice"
```

### 7. Numeric literals require ::numeric cast

```sql
-- Wrong — this is a float
RETURN 1.5

-- Correct for exact arithmetic
RETURN 1.5::numeric
```

### 8. MATCH produces one row per unique pattern match

If Alice knows both Bob and Carol, `MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(b)` returns two rows. Always account for fanout when traversing edges.

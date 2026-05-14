---
title: Nothing Is Automatic
description: "AGE creates no indexes, enforces no constraints, and provides no type validation by default. Every performance optimization requires explicit action."
tags: apache-age, performance, indexing, btree, gin, explain, optimization
---

# Nothing Is Automatic

AGE creates no indexes, enforces no constraints, and provides no type validation by default. Every performance optimization requires explicit action. Without explicit indexes, every graph query is a sequential scan of the vertex or edge label table.

## Table of Contents

1. [How AGE Stores Graphs](#how-age-stores-graphs)
2. [Default Behavior: No Indexes](#default-behavior-no-indexes)
3. [Index Types](#index-types)
4. [Creating Indexes](#creating-indexes)
5. [WHERE Clause vs. Inline Property Filter](#where-clause-vs-inline-property-filter)
6. [EXPLAIN in AGE](#explain-in-age)
7. [Query Optimization Patterns](#query-optimization-patterns)
8. [Null Handling in Aggregation](#null-handling-in-aggregation)
9. [Batch Loading](#batch-loading)
10. [Strengths and Weaknesses](#strengths-and-weaknesses)
11. [Checklist](#checklist)

---

## How AGE Stores Graphs

Each graph is a PostgreSQL schema. Inside that schema, each vertex label and edge label is a table:

```
<graph_name>/
  ag_label           -- catalog of all labels
  <VLabel>           -- one table per vertex label
  <ELabel>           -- one table per edge label
```

**Vertex table columns:** `id` (graphid), `properties` (agtype)

**Edge table columns:** `id` (graphid), `start_id` (graphid), `end_id` (graphid), `properties` (agtype)

All graph traversal, filtering, and property access translates to table scans and predicate evaluation on these tables. Index creation follows standard PostgreSQL syntax — the only AGE-specific detail is knowing which column to index.

---

## Default Behavior: No Indexes

A freshly created graph has no indexes. A query like:

```sql
SELECT * FROM cypher('graph_name', $$
  MATCH (n:Customer) WHERE n.Name = 'Alice' RETURN n
$$) AS (n agtype);
```

will perform a sequential scan of the `Customer` table, evaluating the filter on every row. For small graphs this is fine. For graphs with millions of vertices it is a performance problem.

---

## Index Types

| Index type | Best for | AGE use case |
|---|---|---|
| **BTREE** | Equality, range, ORDER BY, unique | `id`, `start_id`, `end_id`; specific property keys |
| **GIN** | Containment, JSON/agtype key-value search | `properties` column — enables `@>` containment queries |

Choose BTREE for exact-match or range queries on a known property key. Choose GIN for flexible multi-key property lookups where the query shape varies.

---

## Creating Indexes

Replace `graph_name` and `VLABEL`/`ELABEL` with your actual graph name and label names (case-sensitive, quoted).

### Vertex label indexes

```sql
-- Fast node id lookup (always create this)
CREATE INDEX ON graph_name."Person" USING BTREE (id);

-- GIN on all properties — enables {key: value} containment queries
CREATE INDEX ON graph_name."Person" USING GIN (properties);

-- BTREE on a single property key — more selective, smaller index
CREATE INDEX ON graph_name."Person"
  USING BTREE (agtype_access_operator(VARIADIC ARRAY[properties, '"email"'::agtype]));
```

### Edge label indexes

```sql
-- id lookup
CREATE INDEX ON graph_name."FOLLOWS" USING BTREE (id);

-- Traversal: forward (start → end) and reverse (end → start)
CREATE INDEX ON graph_name."FOLLOWS" USING BTREE (start_id);
CREATE INDEX ON graph_name."FOLLOWS" USING BTREE (end_id);

-- GIN on edge properties
CREATE INDEX ON graph_name."FOLLOWS" USING GIN (properties);

-- Single property BTREE (e.g., edge weight or timestamp)
CREATE INDEX ON graph_name."FOLLOWS"
  USING BTREE (agtype_access_operator(VARIADIC ARRAY[properties, '"weight"'::agtype]));
```

### Targeted single-key BTREE

For high-selectivity queries on a known property (`email`, `user_id`, `created_at`), a targeted BTREE is smaller and faster than a full GIN index:

```sql
CREATE INDEX idx_person_email ON graph_name."Person"
  USING BTREE (agtype_access_operator(VARIADIC ARRAY[properties, '"email"'::agtype]));
```

This index is used only when the query filters on exactly that key. It does not apply to arbitrary key lookups.

---

## WHERE Clause vs. Inline Property Filter

This is the most important correctness detail for indexing in AGE. The two syntaxes look similar but generate different query plans and use indexes differently.

**Inline property filter** — uses GIN containment (`@>`):

```sql
SELECT * FROM cypher('graph_name', $$
  MATCH (n:Customer {Name: 'Alice'}) RETURN n
$$) AS (n agtype);
-- Plan: Filter: (properties @> '{"Name": "Alice"}'::agtype)
-- Uses: GIN index on properties
```

**WHERE clause** — uses `agtype_access_operator` (equals comparison):

```sql
SELECT * FROM cypher('graph_name', $$
  MATCH (n:Customer) WHERE n.Name = 'Alice' RETURN n
$$) AS (n agtype);
-- Plan: Filter: (agtype_access_operator(VARIADIC ARRAY[properties, '"Name"'::agtype]) = '"Alice"'::agtype)
-- Uses: BTREE index on agtype_access_operator(...) for that key
```

**Which to use:**

| Scenario | Syntax | Index |
|---|---|---|
| Lookup by one known property | `WHERE n.prop = val` | BTREE on that key |
| Lookup by multiple properties, flexible schema | `{key: val, key2: val2}` | GIN on properties |
| No index exists yet | Either — both seq-scan | Create the right index |

**Rule:** create both index types and let EXPLAIN confirm which is used. Do not assume.

---

## EXPLAIN in AGE

Standard `EXPLAIN` does not work directly on the `SELECT ... FROM cypher(...)` wrapper — use the `EXPLAIN` keyword inside the Cypher string instead.

```sql
-- Correct: EXPLAIN inside the Cypher query
SELECT * FROM cypher('graph_name', $$
  EXPLAIN
  MATCH (n:Customer) WHERE n.Name = 'Alice'
  RETURN n
$$) AS (plan text);
```

**Sample output — sequential scan (no index):**

```
QUERY PLAN
---------------------------------------------------------------------------
Seq Scan on "Customer" n  (cost=0.00..418.51 rows=43 width=32)
  Filter: (agtype_access_operator(VARIADIC ARRAY[properties, '"Name"'::agtype]) = '"Alice"'::agtype)
```

**Sample output — index scan (after creating BTREE on Name):**

```
QUERY PLAN
---------------------------------------------------------------------------
Index Scan using idx_customer_name on "Customer" n  (cost=0.43..8.45 rows=1 width=32)
  Index Cond: (agtype_access_operator(VARIADIC ARRAY[properties, '"Name"'::agtype]) = '"Alice"'::agtype)
```

**EXPLAIN ANALYZE** (actual execution stats):

```sql
SELECT * FROM cypher('graph_name', $$
  EXPLAIN ANALYZE
  MATCH (n:Customer) WHERE n.Name = 'Alice'
  RETURN n
$$) AS (plan text);
```

Read the output: `Seq Scan` = no index used; `Index Scan` or `Bitmap Index Scan` = index used. If you expect an index scan but see a seq scan, verify the index was created for the right syntax (WHERE vs. inline).

---

## Query Optimization Patterns

### Prefer WHERE over inline for indexed properties

When a BTREE index exists on a specific key, write the filter as a `WHERE` clause:

```sql
-- Uses BTREE index on agtype_access_operator for 'email'
SELECT * FROM cypher('social', $$
  MATCH (u:User) WHERE u.email = 'alice@example.com' RETURN u
$$) AS (u agtype);
```

### Filter early in Cypher, not late in SQL

Let Cypher push the predicate down to the label table scan. Filtering after the fact in SQL WHERE requires the full traversal to complete first.

```sql
-- Good: filter inside Cypher (label scan with predicate)
SELECT name::text FROM cypher('social', $$
  MATCH (p:Person) WHERE p.active = true RETURN p.name
$$) AS (name agtype);

-- Worse: filter in SQL (full traversal then filter)
SELECT name::text FROM cypher('social', $$
  MATCH (p:Person) RETURN p.name, p.active
$$) AS (name agtype, active agtype)
WHERE active::boolean = true;
```

### Use id() for node-to-SQL joins

`id(n)` returns the graph internal ID (`graphid` / `bigint`). Store this in a SQL table column to enable fast joins without property lookups.

```sql
SELECT sql.department, sql.salary
FROM cypher('social', $$
  MATCH (p:Person)-[:WORKS_AT]->(c:Company {name: 'Acme'})
  RETURN id(p)
$$) AS (graph_id agtype)
JOIN employees sql ON sql.graph_node_id = graph_id::bigint;
```

### LIMIT inside Cypher for traversal bounds

Applying `LIMIT` inside Cypher stops traversal early. A SQL-level `LIMIT` runs after the full traversal has completed and results have been returned.

```sql
-- Good: stops traversal at 100 nodes
SELECT * FROM cypher('social', $$
  MATCH (p:Person)-[:FOLLOWS*1..3]->(q:Person)
  RETURN q.name
  LIMIT 100
$$) AS (name agtype);
```

### Avoid variable-length traversal without bounds

`[:REL*]` (unbounded) will walk the entire reachable subgraph. Always set min/max depth:

```sql
-- Bad: can traverse the entire graph
MATCH (a)-[:KNOWS*]->(b) RETURN b

-- Good: bounded depth
MATCH (a)-[:KNOWS*1..4]->(b) RETURN b
```

### Sequential scans beat index scans for full-table reads

Index scans add overhead for queries that return most rows. When fetching entire label tables (no filter), skip the index and let PostgreSQL seq-scan. EXPLAIN will confirm this automatically — do not force indexes on bulk reads.

---

## Null Handling in Aggregation

AGE follows openCypher semantics: aggregation functions ignore `null` values by default, matching SQL's `COUNT(col)` vs `COUNT(*)` distinction.

| Expression | Behavior |
|---|---|
| `count(*)` | Counts all rows, including those where properties are null/missing |
| `count(n.prop)` | Counts only rows where `n.prop` is not null |
| `sum(n.prop)` | Sums non-null values; nulls are skipped |
| `avg(n.prop)` | Averages non-null values; nulls are excluded from denominator |

**Example — distinguish total nodes from nodes with a property set:**

```sql
SELECT total_nodes::int, nodes_with_email::int
FROM cypher('social', $$
  MATCH (p:Person)
  RETURN count(*) AS total_nodes,
         count(p.email) AS nodes_with_email
$$) AS (total_nodes agtype, nodes_with_email agtype);
```

**Coalesce nulls before aggregating when you want a default:**

```sql
SELECT * FROM cypher('social', $$
  MATCH (p:Person)
  RETURN p.name, coalesce(p.score, 0) AS score
$$) AS (name agtype, score agtype);
```

**Null in WHERE comparisons** — a property that does not exist evaluates to `null`, and `null = 'value'` is `null` (not `false`). Use `IS NOT NULL` to check existence:

```sql
SELECT * FROM cypher('social', $$
  MATCH (p:Person)
  WHERE p.email IS NOT NULL
  RETURN p.name, p.email
$$) AS (name agtype, email agtype);
```

---

## Batch Loading

For initial data loads into large graphs, the standard `CREATE` + `cypher()` pattern is slow at scale. Use the **AGEFreighter** Python library instead.

```bash
pip install agefreighter
```

```python
import asyncio
from agefreighter import AGEFreighter

async def load():
    loader = AGEFreighter()
    await loader.connect(dsn="postgresql://user:pass@host/dbname")
    await loader.load(
        graph_name="my_graph",
        start_v_label="Case",
        start_id="CaseID",
        start_props=[],
        edge_type="REF",
        edge_props=[],
        end_v_label="Case",
        end_id="end_CaseID",
        end_props=[],
        csv_path="./cases.csv",
        use_copy=True,       # PostgreSQL COPY — much faster than INSERT
        drop_graph=True,
        create_graph=True,
        progress=True,
    )

asyncio.run(load())
```

**Published benchmark:** 725K vertices + 2.8M edges loaded in ~83 seconds using `use_copy=True`.

**Supported input formats:** CSV, MultiCSV, Avro, Parquet, Azure Blob Storage.

**Best practice for bulk loads:**

1. Load all data first without indexes.
2. Create indexes after load completes — building indexes on an empty or partially-filled table is wasted work.
3. Run `ANALYZE graph_name."Label"` after indexing to update planner statistics.

```sql
-- After bulk load and index creation
ANALYZE graph_name."Person";
ANALYZE graph_name."FOLLOWS";
```

### UNWIND for small-to-medium batches

For programmatic loading without AGEFreighter, use `UNWIND` with a prepared statement to insert multiple nodes or edges in one round-trip.

**Prepare the batch insert:**

```sql
PREPARE batch_create_people(agtype) AS
SELECT * FROM cypher('social', $$
  UNWIND $data AS attrs
  CREATE (p:Person)
  SET p = attrs
  RETURN id(p)
$$, $1) AS (node_id agtype);
```

**Execute with a list of property maps:**

```sql
EXECUTE batch_create_people('{
  "data": [
    {"name": "Alice", "age": 30, "email": "alice@example.com"},
    {"name": "Bob",   "age": 25, "email": "bob@example.com"},
    {"name": "Carol", "age": 35, "email": "carol@example.com"}
  ]
}');
```

**UNWIND with a literal list (no prepared statement):**

```sql
SELECT * FROM cypher('social', $$
  UNWIND [{name: 'Dave', age: 28}, {name: 'Eve', age: 22}] AS attrs
  CREATE (p:Person {name: attrs.name, age: attrs.age})
  RETURN p.name
$$) AS (name agtype);
```

Use UNWIND batches for hundreds to low thousands of records. For millions of records, use AGEFreighter with `use_copy=True`.

---

## Strengths and Weaknesses

Understanding where AGE performs well and where it struggles helps with architecture decisions.

| Characteristic | Strength / Weakness | Notes |
|---|---|---|
| Multi-hop traversals | **Strength** | Graph storage is optimized for following edges; joins degrade, graphs don't |
| Pattern matching | **Strength** | Cypher MATCH is expressive and efficient for subgraph patterns |
| Hybrid SQL+graph in one query | **Strength** | Single transaction, no data movement between systems |
| Shortest path queries | **Strength** | `shortestPath()` and `allShortestPaths()` built in |
| Indexed property lookups | **Strength** (with indexes) | Comparable to relational indexed scan once indexes are created |
| Full-graph aggregations | **Weakness** | `MATCH (n) RETURN count(*)` requires a full table scan; slow on large graphs |
| SQL vs Cypher for aggregation | **Weakness** | SQL is ~15x faster than Cypher for aggregation/ordering on large datasets (Issue #2194). Push aggregation to SQL via CTE |
| Complex aggregations (GROUP BY, window functions) | **Weakness** | Push to SQL layer via CTE; Cypher aggregation is limited |
| Large result sets without LIMIT | **Weakness** | All traversal results materialize before returning; memory-intensive |
| Unbounded variable-length paths | **Weakness** | `[:REL*]` can explode; always set depth bounds |
| Index creation | **Weakness** | No automatic indexing; every label requires explicit DDL |
| Cross-graph joins | **Neutral** | Supported via multiple `cypher()` calls, but planner cannot optimize across them |

**Rule of thumb:** use Cypher for traversal and pattern matching, push grouping and aggregation into SQL CTEs when the result set is large.

---

## Checklist

Use this before deploying any graph query to production.

**Indexing:**

- [ ] BTREE index on `id` for every vertex and edge label
- [ ] BTREE indexes on `start_id` and `end_id` for every edge label
- [ ] GIN index on `properties` if queries use varied property filters
- [ ] BTREE index on `agtype_access_operator(...)` for high-frequency single-key lookups
- [ ] `ANALYZE` run after bulk loads

**Query shape:**

- [ ] `EXPLAIN` run inside Cypher — confirmed index scan (not seq scan) for filtered queries
- [ ] `WHERE n.prop = val` used (not inline `{prop: val}`) when BTREE index exists on that key
- [ ] Variable-length traversals have explicit depth bounds (`*1..N`)
- [ ] `LIMIT` placed inside Cypher (not only in outer SQL) for traversal-heavy queries
- [ ] Cypher predicates filter early; SQL predicates applied only for post-graph SQL operations

**Schema:**

- [ ] `SET search_path = ag_catalog, "$user", public;` at session start, or all `cypher()` calls fully qualified
- [ ] Result AS clause column count matches RETURN clause exactly
- [ ] agtype cast to target SQL type before numeric/string comparison

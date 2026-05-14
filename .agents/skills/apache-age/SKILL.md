---
name: apache-age
description: Apache AGE graph database extension for PostgreSQL — Cypher query syntax, agtype data types, hybrid SQL+Cypher patterns (CTEs, JOINs, parameter passing), graph schema modeling (vertices, edges, labels, properties), and performance optimization (indexing, EXPLAIN, batch loading). Use when writing Cypher queries, designing graph schemas, combining graph traversal with relational SQL, or optimizing AGE query performance — all within PostgreSQL via the AGE extension.
---

# Apache AGE

## Quick Start

```sql
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT create_graph('my_graph');

SELECT * FROM cypher('my_graph', $$
  CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
  RETURN a, b
$$) AS (a agtype, b agtype);
```

## Reference Loading

| Principle | Reference | When to Load |
|-----------|-----------|--------------|
| The Wrapper Contract | [the-wrapper-contract.md](references/the-wrapper-contract.md) | **MANDATORY** for first-time AGE users. Load for cypher() mechanics, search_path, parameters, unsupported features |
| agtype Is Everything | [agtype-is-everything.md](references/agtype-is-everything.md) | Load when casting agtype to SQL types, debugging type errors, or handling nulls |
| Hybrid Is the Point | [hybrid-is-the-point.md](references/hybrid-is-the-point.md) | **MANDATORY** before writing any SQL+Cypher query. CTEs, JOINs, mutation guards, multi-graph |
| Schema Is Storage | [schema-is-storage.md](references/schema-is-storage.md) | Load when designing graph schema, choosing labels/properties, or modeling relationships |
| Nothing Is Automatic | [nothing-is-automatic.md](references/nothing-is-automatic.md) | **MANDATORY** before performance work. Indexes, EXPLAIN, batch loading, when to use SQL instead |

**Do NOT load:**

- schema-is-storage.md for pure query questions (no schema design involved)
- nothing-is-automatic.md for schema design unless indexing is the concern
- the-wrapper-contract.md for users already familiar with cypher() mechanics

**Freedom calibration:**

- **Low freedom** (follow exactly): cypher() wrapper syntax, AS column lists, search_path, index DDL, mutation CTE guards
- **Medium freedom** (adapt to context): graph modeling, hybrid query composition, performance tuning
- **High freedom** (choose freely): property naming, schema partitioning, application-layer validation

## Think in AGE

- Every Cypher query is a SQL function call — plan the SQL wrapper first, then the Cypher inside it
- agtype is the only type that crosses the boundary — cast explicitly at every SQL touchpoint
- Graphs are PostgreSQL schemas — labels are tables, vertices and edges are rows with agtype property blobs
- Nothing exists until you create it — no default indexes, no property constraints, no type enforcement
- Hybrid is the value proposition — when a query is pure aggregation or pure OLTP, drop to SQL (it's ~15x faster for aggregation per Issue #2194)

## Critical Gotchas

### 1. Always define a column list

`cypher()` returns `SETOF record` — PostgreSQL requires an explicit column list:

```sql
SELECT * FROM cypher('g', $$ MATCH (n) RETURN n $$) AS (n agtype);
```

### 2. Terminal clauses need a dummy column

CREATE, SET, DELETE at the end of a query return no rows, but the column list is still mandatory:

```sql
SELECT * FROM cypher('g', $$
  CREATE (:Person {name: 'Alice'})
$$) AS (v agtype);
-- Returns 0 rows
```

### 3. SET = replaces all properties; use += to merge

```cypher
-- Replaces ALL properties with just {age: 30}
SET n = {age: 30}

-- Merges {age: 30} into existing properties
SET n += {age: 30}
```

### 4. CREATE/SET/REMOVE not allowed in JOINs

Mutations inside a JOIN cause errors. Wrap in a CTE instead:

```sql
WITH new_vertex AS (
  SELECT * FROM cypher('g', $$ CREATE (p:Person {name: 'Alice'}) RETURN p $$) AS (v agtype)
)
SELECT * FROM new_vertex;
```

### 5. search_path must include ag_catalog

```sql
SET search_path = ag_catalog, "$user", public;
-- Or fully qualify: SELECT * FROM ag_catalog.cypher(...)
```

## NEVER

- NEVER omit the AS column list — `cypher()` returns SETOF record, PostgreSQL demands it
- NEVER use `SET n = {...}` when you mean `SET n += {...}` — `=` replaces ALL properties silently
- NEVER put CREATE/SET/REMOVE inside a JOIN — wrap in CTE; mutations break PostgreSQL transaction handling
- NEVER use unbounded `[:REL*]` — paths explode at scale (7s → 7min on 1.5M vertices, Issue #195)
- NEVER assume indexes exist — AGE creates none by default; use EXPLAIN inside Cypher to verify
- NEVER compare agtype to SQL types without casting — agtype can only cast to `varchar` among string types (not json/text, Issues #1225, #1996)
- NEVER query without a label — scans entire `_ag_label_vertex` parent table
- NEVER use multiple labels on one vertex — AGE supports exactly zero or one (by design, Discussion #109)
- NEVER build maps with 50+ fields — `agtype_build_map()` hits the 100-argument PostgreSQL function limit (Issue #1840)
- NEVER pass null to agtype functions without checking — some null inputs crash the server (Issues #1956, #1303)

## Common Recipes

### 1-hop neighbors with SQL JOIN

```sql
SELECT u.email, friend.name::varchar AS friend_name
FROM users u
JOIN (
  SELECT * FROM cypher('social', $$
    MATCH (p:Person)-[:KNOWS]->(f:Person)
    WHERE p.userId = 1042
    RETURN p.userId, f.name
  $$) AS (user_id agtype, name agtype)
) g ON u.id = g.user_id::int;
```

### MERGE upsert

```sql
SELECT * FROM cypher('g', $$
  MERGE (p:Person {email: 'alice@example.com'})
  ON CREATE SET p.created_at = timestamp(), p.login_count = 1
  ON MATCH SET p.login_count = p.login_count + 1
  RETURN p
$$) AS (p agtype);
```

### UNWIND bulk create

```sql
SELECT * FROM cypher('g', $$
  UNWIND [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}] AS attrs
  CREATE (p:Person {name: attrs.name, age: attrs.age})
  RETURN p.name
$$) AS (name agtype);
```

### Bounded path search

```sql
SELECT * FROM cypher('g', $$
  MATCH (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(b:Person)
  RETURN DISTINCT b.name
  LIMIT 100
$$) AS (name agtype);
```

---
title: Hybrid Is the Point
description: "Hybrid SQL+Cypher in a single transaction is AGE's core value proposition. Graph traversal for relationships, SQL for aggregation and OLTP. This reference covers every integration pattern."
tags: apache-age, hybrid, sql, cypher, cte, join, ag_catalog
---

# Hybrid SQL+Cypher Patterns

Hybrid SQL+Cypher in a single transaction is AGE's core value proposition. Use Cypher for graph traversal and pattern matching. Use SQL for aggregation, OLTP, and anything that doesn't need multi-hop relationships. This reference covers every composition pattern with copy-paste correct syntax.

## Table of Contents

1. [The cypher() Function](#the-cypher-function)
2. [Basic SELECT Wrapper](#basic-select-wrapper)
3. [Cypher in a Subquery](#cypher-in-a-subquery)
4. [Cypher in a CTE](#cypher-in-a-cte)
5. [Cypher in a JOIN](#cypher-in-a-join)
6. [SQL Filtering Graph Results](#sql-filtering-graph-results)
7. [Multi-Graph Queries](#multi-graph-queries)
8. [Mutation Guards with CTEs](#mutation-guards-with-ctes)
9. [Prepared Statements and Parameter Passing](#prepared-statements-and-parameter-passing)
10. [UPDATE Relational Tables from Graph Results](#update-relational-tables-from-graph-results)
11. [Transaction Atomicity](#transaction-atomicity)
12. [SQL Called from Cypher](#sql-called-from-cypher)
13. [Type Casting agtype to SQL](#type-casting-agtype-to-sql)
14. [Anti-Patterns](#anti-patterns)

---

## The cypher() Function

Every hybrid query starts here.

```sql
SELECT * FROM cypher('graph_name', $$
  /* Cypher query here */
$$) AS (col1 agtype, col2 agtype);
```

**Signature:** `cypher(graph_name text, query_string text, parameters agtype DEFAULT NULL)`

**Rules:**

- Always wrap the Cypher string in `$$...$$` dollar-quoting.
- Always alias the result set with `AS (col_name agtype, ...)`. Column count and order must match the `RETURN` clause exactly.
- If the Cypher query returns no rows (e.g., a bare `CREATE`), a result definition is still required — use `AS (result agtype)` and discard it.
- `cypher()` lives in `ag_catalog`. Run `SET search_path = ag_catalog, "$user", public;` at session start, or fully qualify as `ag_catalog.cypher(...)`.

---

## Basic SELECT Wrapper

The simplest form: Cypher runs, SQL selects the output.

```sql
SELECT * FROM cypher('social', $$
  MATCH (p:Person)-[:FOLLOWS]->(q:Person)
  RETURN p.name, q.name, p.age
$$) AS (follower agtype, followed agtype, age agtype);
```

Add SQL predicates on top using a subquery or CTE (Cypher's `WHERE` can also filter, but SQL-side filtering runs after the graph traversal).

---

## Cypher in a Subquery

Use a Cypher result set as the source for a SQL `WHERE ... IN (...)` check. This lets SQL tables drive graph lookups or vice versa.

**Graph result filters SQL table:**

```sql
-- Return SQL rows whose id appears in the graph
SELECT p.id, p.city, p.hired_year
FROM persons AS p
WHERE p.name IN (
  SELECT name::text
  FROM cypher('my_graph', $$
    MATCH (v:Person) WHERE v.name = 'Daniel'
    RETURN v.name
  $$) AS (name agtype)
);
```

**SQL table filters graph result:**

```sql
-- Only return graph nodes whose id exists in the SQL table
SELECT g.name, g.title
FROM cypher('my_graph', $$
  MATCH (v:Person) RETURN v.name, v.title, v.id
$$) AS g(name agtype, title agtype, id agtype)
WHERE g.id::bigint IN (SELECT id FROM active_employees);
```

**Notes:**

- Cast `agtype` to a native SQL type for comparison: `::text`, `::bigint`, `::int`, `::float`, `::boolean`.
- Cypher cannot appear directly inside an expression — it must appear in `FROM` or as a subquery in `WHERE ... IN (...)`.

---

## Cypher in a CTE

Wrapping a Cypher call in a CTE keeps complex queries readable and composable. The CTE executes once; subsequent SQL clauses reference it by name.

```sql
WITH graph_result AS (
  SELECT name, age, node_id
  FROM cypher('social', $$
    MATCH (p:Person)-[:WORKS_AT]->(c:Company {name: 'Acme'})
    RETURN p.name, p.age, id(p)
  $$) AS (name agtype, age agtype, node_id agtype)
)
SELECT
  gr.name::text,
  gr.age::int,
  e.department,
  e.salary
FROM graph_result gr
JOIN employees e ON e.graph_node_id = gr.node_id::bigint
WHERE gr.age::int > 30
ORDER BY e.salary DESC;
```

**Why CTE over inline subquery:** CTEs are easier to debug — add `SELECT * FROM graph_result;` temporarily to inspect intermediate output. They also allow reuse of the same graph result in multiple downstream joins.

---

## Cypher in a JOIN

Join a Cypher result directly with a SQL table in the `FROM` clause.

```sql
SELECT
  t.person_id,
  g.name = t.name AS names_match,
  g.age  = t.age  AS ages_match
FROM schema_name.sql_person AS t
JOIN cypher('social', $$
  MATCH (n:Person)
  RETURN n.name, n.age, id(n)
$$) AS g(name agtype, age agtype, id agtype)
  ON t.graph_id = g.id::bigint;
```

**Joining two Cypher results (multi-graph cross-join):**

```sql
SELECT g1.name, g1.age, g2.license_number
FROM cypher('persons_graph', $$
  MATCH (v:Person) RETURN v.name, v.age
$$) AS g1(name agtype, age agtype)
JOIN cypher('doctors_graph', $$
  MATCH (v:Doctor) RETURN v.name, v.license_number
$$) AS g2(name agtype, license_number agtype)
  ON g1.name = g2.name;
```

**Constraint:** `CREATE`, `SET`, and `REMOVE` Cypher clauses cannot be used inside a `JOIN` — they interact with the PostgreSQL transaction system in a way that is incompatible. Use a CTE guard instead (see below).

---

## SQL Filtering Graph Results

Apply SQL `WHERE`, `ORDER BY`, `LIMIT`, and aggregation to graph output.

```sql
-- Aggregate: count followers per person, filter to > 10
SELECT followed, COUNT(*) AS follower_count
FROM cypher('social', $$
  MATCH (p:Person)-[:FOLLOWS]->(q:Person)
  RETURN p.name, q.name
$$) AS (follower agtype, followed agtype)
GROUP BY followed
HAVING COUNT(*) > 10
ORDER BY follower_count DESC
LIMIT 20;
```

```sql
-- Range filter on a graph property cast to numeric
SELECT name::text, score::float
FROM cypher('recommendations', $$
  MATCH (u:User)-[r:RATED]->(i:Item)
  RETURN i.name, r.score
$$) AS (name agtype, score agtype)
WHERE score::float BETWEEN 4.0 AND 5.0
ORDER BY score::float DESC;
```

---

## Multi-Graph Queries

A single SQL statement can reference any number of graphs — each `cypher()` call targets one graph.

```sql
-- Persons from graph_1, Doctors from graph_2, joined on name
SELECT g1.col_1 AS person_name, g1.col_2 AS age, g2.license_number
FROM cypher('graph_1', $$
  MATCH (v:Person) RETURN v.name, v.age
$$) AS g1(col_1 agtype, col_2 agtype)
JOIN cypher('graph_2', $$
  MATCH (v:Doctor) RETURN v.name, v.license_number
$$) AS g2(name agtype, license_number agtype)
  ON g1.col_1 = g2.name;
```

There is no syntax to query multiple graphs in a single `cypher()` call — union the results at the SQL level instead:

```sql
SELECT name, label FROM cypher('graph_a', $$
  MATCH (n:Person) RETURN n.name, 'graph_a'
$$) AS (name agtype, label agtype)
UNION ALL
SELECT name, label FROM cypher('graph_b', $$
  MATCH (n:Person) RETURN n.name, 'graph_b'
$$) AS (name agtype, label agtype);
```

---

## Mutation Guards with CTEs

`CREATE`, `MERGE`, `SET`, `REMOVE`, and `DELETE` Cypher clauses cannot run inside a SQL `JOIN` expression — they must be wrapped in a CTE.

```sql
-- Safe: mutating Cypher wrapped in a CTE
WITH mutation AS (
  SELECT * FROM cypher('social', $$
    CREATE (n:Person {name: 'Alice', age: 30})
    RETURN n
  $$) AS (n agtype)
)
SELECT * FROM mutation;
```

```sql
-- Safe: MERGE then inspect the result
WITH upsert AS (
  SELECT * FROM cypher('social', $$
    MERGE (p:Person {email: 'bob@example.com'})
    ON CREATE SET p.created_at = timestamp()
    ON MATCH  SET p.last_seen  = timestamp()
    RETURN p
  $$) AS (p agtype)
)
SELECT upsert.p->>'name' AS name FROM upsert;
```

---

## Prepared Statements and Parameter Passing

Prepared statements let Cypher parse and plan the query once, then execute it repeatedly with different parameter values. This is the correct way to pass dynamic values into a Cypher query from application code.

**Cypher parameter format:** `$paramName` — starts with `$`, followed by a letter and alphanumerics. Not `$1` (that is a PostgreSQL positional parameter, not a Cypher one).

**Prepare the statement** — Cypher parameters go inside the query string; the PostgreSQL positional parameter `$1` goes as the third argument to `cypher()`:

```sql
PREPARE find_person(agtype) AS
SELECT * FROM cypher('social', $$
  MATCH (v:Person)
  WHERE v.name = $name
  RETURN v
$$, $1) AS (v agtype);
```

**Execute with an agtype map** — keys match parameter names without the `$`:

```sql
EXECUTE find_person('{"name": "Tobias"}');
```

**Multiple parameters:**

```sql
PREPARE find_person_by_age(agtype) AS
SELECT * FROM cypher('social', $$
  MATCH (v:Person)
  WHERE v.name = $name AND v.age > $min_age
  RETURN v.name, v.age
$$, $1) AS (name agtype, age agtype);

EXECUTE find_person_by_age('{"name": "Alice", "min_age": 25}');
```

**Constraints:**

- The `parameters` argument to `cypher()` can only be used with prepared statements — passing a literal map outside a prepared statement throws an error.
- Only read queries are documented as supported in prepared statements. Use CTEs for mutation.

---

## UPDATE Relational Tables from Graph Results

Use a CTE to capture graph traversal results, then reference that CTE in a SQL `UPDATE`.

```sql
-- Mark SQL employees as 'influential' if they have > 50 graph followers
WITH influential AS (
  SELECT person_id::bigint AS gid, follower_count
  FROM cypher('social', $$
    MATCH (p:Person)<-[:FOLLOWS]-(f:Person)
    WITH p, count(f) AS follower_count
    WHERE follower_count > 50
    RETURN id(p), follower_count
  $$) AS (person_id agtype, follower_count agtype)
)
UPDATE employees e
SET    influence_tier = 'high',
       graph_followers = i.follower_count::int
FROM   influential i
WHERE  e.graph_node_id = i.gid;
```

The pattern: graph traversal in CTE → SQL DML references CTE by name. The `UPDATE` runs in the same transaction as the CTE evaluation.

---

## Transaction Atomicity

Multiple `cypher()` calls in one SQL statement share a single PostgreSQL transaction. Either all succeed or all roll back. No special syntax is required — standard `BEGIN`/`COMMIT`/`ROLLBACK` applies.

```sql
BEGIN;

-- Step 1: create graph node
WITH create_node AS (
  SELECT * FROM cypher('social', $$
    CREATE (u:User {email: 'carol@example.com', active: true})
    RETURN id(u)
  $$) AS (node_id agtype)
)
-- Step 2: insert SQL record using the new graph id
INSERT INTO users (email, graph_node_id)
SELECT 'carol@example.com', node_id::bigint
FROM   create_node;

COMMIT;
```

If `INSERT` fails (e.g., unique constraint), the `CREATE` in the CTE is also rolled back. No orphaned graph nodes.

**Chained CTEs — multiple graph mutations in one statement:**

```sql
WITH
  new_user AS (
    SELECT * FROM cypher('social', $$
      CREATE (u:User {name: 'Dave'}) RETURN id(u)
    $$) AS (uid agtype)
  ),
  new_post AS (
    SELECT * FROM cypher('social', $$
      CREATE (p:Post {title: 'Hello'}) RETURN id(p)
    $$) AS (pid agtype)
  )
SELECT uid::bigint, pid::bigint FROM new_user, new_post;
```

All CTEs in one statement execute atomically.

---

## SQL Called from Cypher

Cypher cannot embed SQL directly, but it can call user-defined SQL functions. Only scalar-value and void functions are supported — set-returning functions are not.

**Step 1 — define a SQL function returning agtype:**

```sql
CREATE OR REPLACE FUNCTION public.get_event_year(name agtype)
RETURNS agtype AS $$
  SELECT year::agtype FROM history AS h
  WHERE h.event_name = name::text
  LIMIT 1;
$$ LANGUAGE sql;
```

**Step 2 — call it from Cypher:**

```sql
SELECT * FROM cypher('events_graph', $$
  MATCH (e:Event)
  WHERE e.year < public.get_event_year(e.name)
  RETURN e.name
$$) AS (n agtype);
```

This is the only supported way to call SQL logic from within a Cypher traversal. The function must accept and return `agtype`.

---

## Type Casting agtype to SQL

`agtype` values returned from Cypher are opaque to SQL until cast. Cast at the point of comparison or column selection.

| Target SQL type | Cast expression | Notes |
|---|---|---|
| `varchar` | `col::varchar` | **Works** — the only string cast that works |
| `text` | `col::text` | Fails on non-scalar agtype (Issue #1225). Use `col::varchar` instead |
| `int` / `bigint` | `col::int`, `col::bigint` | Works for integer agtype values |
| `float` / `numeric` | `col::float`, `col::numeric` | Works for numeric agtype values |
| `boolean` | `col::boolean` | Works for boolean agtype values |
| `json` / `jsonb` | `col::json` | **ERROR: cannot cast type agtype to json** (Issue #1996). Use `(col::varchar)::jsonb` |

**Example — mixed type extraction:**

```sql
SELECT
  name::varchar      AS person_name,
  age::int           AS person_age,
  active::boolean    AS is_active,
  score::float       AS relevance
FROM cypher('social', $$
  MATCH (p:Person)
  RETURN p.name, p.age, p.active, p.score
$$) AS (name agtype, age agtype, active agtype, score agtype);
```

**Accessing nested agtype fields with `->`:**

```sql
-- node agtype has .id, .label, .properties
SELECT
  node->>'id'                   AS graph_id,
  node->>'label'                AS label,
  node->'properties'->>'email'  AS email
FROM cypher('social', $$
  MATCH (p:Person) RETURN p
$$) AS (node agtype);
```

---

## Anti-Patterns

**Cypher inside an expression (invalid):**

```sql
-- ERROR: cypher() cannot appear in an expression
SELECT id + (SELECT * FROM cypher(...) AS (v agtype));
```

Fix: use a CTE or subquery in `FROM`.

**Multi-graph in a single cypher() call (invalid):**

```sql
-- ERROR: cypher() takes exactly one graph name
SELECT * FROM cypher('graph_a' AND 'graph_b', $$ MATCH (n) RETURN n $$) AS (n agtype);
```

Fix: use two `cypher()` calls joined at the SQL level.

**Mutation inside JOIN (invalid):**

```sql
-- ERROR: CREATE/MERGE/SET/DELETE cannot appear in a JOIN expression
SELECT * FROM some_table
JOIN cypher('g', $$ CREATE (n:X) RETURN n $$) AS (n agtype) ON true;
```

Fix: wrap the mutating Cypher in a CTE first.

**Missing result alias (invalid):**

```sql
-- ERROR: cypher() requires an AS clause
SELECT * FROM cypher('g', $$ MATCH (n) RETURN n $$);
```

Fix: always add `AS (col_name agtype)`.

**Casting without matching column count:**

```sql
-- ERROR if RETURN has 2 columns but AS has 3
SELECT * FROM cypher('g', $$ MATCH (n) RETURN n.name, n.age $$)
AS (name agtype, age agtype, extra agtype);
```

Fix: AS column count must exactly match RETURN clause.

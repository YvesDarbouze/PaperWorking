---
title: Schema Is Storage
description: "In AGE, graphs are PostgreSQL schemas. Labels are child tables under _ag_label_vertex and _ag_label_edge. Properties are untyped agtype blobs with no schema enforcement. Modeling decisions are storage decisions."
tags: apache-age, graph-modeling, schema-design, labels, properties, hybrid, agtype
---

# Schema Is Storage

In AGE, graphs are PostgreSQL schemas. Labels are child tables under `_ag_label_vertex` and `_ag_label_edge`. Properties are untyped agtype blobs with no schema enforcement. Every modeling decision is a storage decision — choose labels, properties, and edges with awareness of how AGE physically stores them.

## Table of Contents

1. [Mental model: what AGE actually stores](#mental-model)
2. [Labels](#labels)
3. [Properties](#properties)
4. [Edges](#edges)
5. [Reification: edge properties vs intermediate vertices](#reification)
6. [Naming conventions](#naming-conventions)
7. [Common patterns](#common-patterns)
8. [Relational-to-graph translation](#relational-to-graph)
9. [Anti-patterns](#anti-patterns)
10. [Hybrid relational-graph decisions](#hybrid-decisions)
11. [Indexing for your schema](#indexing)

---

## Mental model: what AGE actually stores {#mental-model}

Each graph gets its own PostgreSQL schema. Labels become tables inside that schema. All vertex labels inherit from `_ag_label_vertex`; all edge labels inherit from `_ag_label_edge`.

```
ag_catalog           -- AGE system catalog (all graphs registered here)
my_graph/            -- one schema per graph
  _ag_label_vertex   -- parent table for all vertices
  _ag_label_edge     -- parent table for all edges
  "Person"           -- vertex label table (inherits _ag_label_vertex)
  "KNOWS"            -- edge label table (inherits _ag_label_edge)
```

Every vertex table has two columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `graphid` | system-assigned, globally unique |
| `properties` | `agtype` | JSON-like map of all properties |

Every edge table adds two more:

| Column | Type | Notes |
|--------|------|-------|
| `start_id` | `graphid` | source vertex |
| `end_id` | `graphid` | target vertex |

**Implication**: properties are not typed columns — they live inside an `agtype` blob. There is no schema enforcement on property shape by default. Model carefully because bad property layout is invisible at write time.

---

## Labels {#labels}

Labels are the primary partitioning mechanism. Matching by label is a table scan on a single child table — fast. Matching without a label scans the parent table and all children — slow at scale.

### Vertex labels

Use PascalCase nouns. One label per major entity type.

```sql
-- Create the graph first
SELECT ag_catalog.create_graph('social');

-- Labels can be pre-created explicitly...
SELECT ag_catalog.create_vlabel('social', 'Person');
SELECT ag_catalog.create_vlabel('social', 'Company');

-- ...or created implicitly by Cypher CREATE
SELECT * FROM cypher('social', $$
  CREATE (:Person {name: 'Alice', email: 'alice@example.com'})
$$) AS (v agtype);
```

### Edge labels

Use SCREAMING_SNAKE_CASE verbs. Edges are directed: `(source)-[:LABEL]->(target)`.

```sql
SELECT ag_catalog.create_elabel('social', 'KNOWS');
SELECT ag_catalog.create_elabel('social', 'WORKS_AT');

SELECT * FROM cypher('social', $$
  MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
  CREATE (a)-[:KNOWS {since: 2023}]->(b)
$$) AS (e agtype);
```

### Single vs. multiple labels

AGE supports only one label per vertex or edge (unlike Neo4j which allows multiple). Model accordingly:

- Use a single, most-specific label: `Employee` not `Person` + `Employee`
- Distinguish subtypes via a property if needed: `(:Person {role: 'admin'})`
- Or use separate labels if query patterns always target one subtype

---

## Properties {#properties}

Properties are stored as `agtype` (AGE's superset of JSON). All values — strings, numbers, booleans, lists, nested maps — are valid.

### What belongs in properties

Put data that **describes the entity** and that you will **filter or return**:

```cypher
CREATE (:Product {
  sku: 'ABC-123',
  name: 'Widget',
  price: 29.99,
  in_stock: true,
  tags: ['hardware', 'sale']
})
```

### What does not belong in properties

- **Relationships** — don't store a list of IDs; model as edges instead
- **Categorical membership** — use a label, not a property like `type: 'Person'`
- **Frequently updated aggregates** — store in a SQL table, join at query time

### Property naming

Use `camelCase` for property names to follow openCypher conventions:

```cypher
-- Good
CREATE (:Person {firstName: 'Alice', createdAt: 1700000000})

-- Avoid (mixing styles causes friction in Cypher expressions)
CREATE (:Person {first_name: 'Alice', created_at: 1700000000})
```

### Accessing nested properties

`agtype` supports nesting, but deep nesting hurts readability and indexing:

```cypher
-- Shallow: easy to index, easy to filter
CREATE (:Order {orderId: '99', status: 'shipped', city: 'Portland'})

-- Deep: hard to index individual keys
CREATE (:Order {orderId: '99', meta: {shipping: {city: 'Portland'}}})
```

Prefer flat property maps unless nesting mirrors a domain object that is always read together.

---

## Edges {#edges}

### Directionality

All AGE edges are directed. Choose direction to match the domain verb:

```cypher
-- Good: direction follows the verb
(alice:Person)-[:FOLLOWS]->(bob:Person)
(user:Person)-[:PURCHASED]->(item:Product)

-- Avoid: reversed direction makes MATCH patterns awkward
(bob:Person)<-[:IS_FOLLOWED_BY]-(alice:Person)
```

### Properties on edges

Edge properties are stored the same way as vertex properties. Use them for relationship metadata:

```cypher
CREATE (a)-[:REVIEWED {rating: 4, body: 'Great product', reviewedAt: 1700000000}]->(p)
```

Do not store entity data on edges. If a review has its own identity (can be queried, updated, or connected to other nodes), make it a vertex:

```cypher
-- Preferred when Review needs its own connections
CREATE (u:Person)-[:WROTE]->(r:Review {rating: 4})-[:ABOUT]->(p:Product)
```

### Avoid parallel edges of the same type

Multiple `(a)-[:KNOWS]->(b)` edges between the same pair are allowed but create ambiguity. Use edge properties to differentiate, or choose a more specific label.

---

## Reification: edge properties vs intermediate vertices {#reification}

The core decision: does this relationship need its own identity?

| Signal | Model as edge property | Model as intermediate vertex |
|--------|----------------------|------------------------------|
| Attribute is scalar metadata | `[:KNOWS {since: 2020}]` | — |
| Relationship connects to other nodes | — | `(:Employment)-[:AT]->(:Company)` |
| Relationship is queried directly | — | `MATCH (e:Employment)` |
| Relationship needs its own timestamps/history | — | vertex with `createdAt`, `endedAt` |
| Relationship is unique between the two endpoints | edge property | — |

**Decision heuristic**: if you ever write `MATCH (x)-[:REL]->(r)-[:ANYTHING]->(y)` or need to `MATCH (r:REL)` directly, `r` is a vertex, not an edge.

```cypher
-- Edge property: rating is pure metadata, never traversed further
CREATE (u:Person)-[:RATED {score: 4, at: 1700000000}]->(p:Product)

-- Intermediate vertex: review connects to comments, moderators, reports
CREATE (u:Person)-[:WROTE]->(r:Review {score: 4, body: '...'})-[:ABOUT]->(p:Product)
CREATE (mod:Person)-[:FLAGGED]->(r:Review)
```

---

## Naming conventions {#naming-conventions}

| Element | Convention | Example |
|---------|-----------|---------|
| Vertex label | PascalCase noun | `Person`, `BlogPost`, `CompanyUnit` |
| Edge label | SCREAMING_SNAKE_CASE verb | `KNOWS`, `WORKS_AT`, `REVIEWED` |
| Property key | camelCase | `firstName`, `createdAt`, `orderId` |
| Graph name | snake_case | `social_network`, `product_catalog` |

---

## Common patterns {#common-patterns}

### Hierarchies (org charts, categories, file systems)

Use a recursive edge label. Query with variable-length paths.

```cypher
-- Build
CREATE (ceo:Person {name: 'Dana'})-[:MANAGES]->(vp:Person {name: 'Eve'})
CREATE (vp)-[:MANAGES]->(ic:Person {name: 'Frank'})

-- All reports under Dana (any depth)
MATCH (dana:Person {name: 'Dana'})-[:MANAGES*1..]->(report:Person)
RETURN report.name

-- Immediate parent only
MATCH (p:Person)-[:MANAGES]->(frank:Person {name: 'Frank'})
RETURN p.name
```

For categories with shared ancestors (DAG, not tree), allow edges to point to multiple parents — the graph handles it natively.

### Networks (social, infrastructure, dependencies)

Networks are the graph's home turf. Store edges, query paths and neighborhoods.

```cypher
-- Social: mutual follows, degree-of-separation
MATCH path = shortestPath(
  (a:Person {name: 'Alice'})-[:FOLLOWS*]-(b:Person {name: 'Bob'})
)
RETURN length(path) AS degrees

-- Dependency graph: what breaks if package X is removed?
MATCH (pkg:Package {name: 'lodash'})<-[:DEPENDS_ON*1..]-(consumer:Package)
RETURN DISTINCT consumer.name
```

### Temporal relationships (valid_from / valid_to)

Store time-bounded relationships as edges with timestamp properties. Use `null` for open-ended intervals.

```cypher
-- Employee held a role from 2020 to 2023
CREATE (e:Person)-[:HELD {
  title: 'Engineer',
  validFrom: 1577836800,
  validTo:   1672531200
}]->(dept:Department {name: 'Platform'})

-- Current role (open-ended)
CREATE (e:Person)-[:HELD {
  title:     'Staff Engineer',
  validFrom: 1672531200,
  validTo:   null
}]->(dept:Department {name: 'Platform'})

-- Query: roles active at a given timestamp
MATCH (e:Person {name: 'Alice'})-[r:HELD]->(d:Department)
WHERE r.validFrom <= 1650000000
  AND (r.validTo IS NULL OR r.validTo > 1650000000)
RETURN r.title, d.name
```

### Access control (RBAC, permission inheritance)

Model roles as vertices, permissions as edges, inheritance via recursive traversal.

```cypher
-- Setup
CREATE (admin:Role {name: 'admin'})-[:INHERITS]->(editor:Role {name: 'editor'})
CREATE (editor)-[:INHERITS]->(viewer:Role {name: 'viewer'})
CREATE (viewer)-[:CAN {action: 'read'}]->(res:Resource {name: 'reports'})
CREATE (editor)-[:CAN {action: 'write'}]->(res)

CREATE (alice:Person)-[:HAS_ROLE]->(admin)

-- All permissions Alice has (through role inheritance)
MATCH (alice:Person {name: 'Alice'})-[:HAS_ROLE]->(r:Role)-[:INHERITS*0..]->(inherited:Role)
      -[perm:CAN]->(resource:Resource)
RETURN DISTINCT perm.action, resource.name
```

### Knowledge graphs (entity-relationship, provenance)

Entities are vertices with a `type` property (or distinct labels). Relationships are named edges. Provenance is attached to edges or intermediate vertices.

```cypher
-- Entity-relationship
CREATE (paris:Entity {name: 'Paris', type: 'City'})
CREATE (france:Entity {name: 'France', type: 'Country'})
CREATE (paris)-[:LOCATED_IN {confidence: 0.99, source: 'wikidata'}]->(france)

-- Provenance as intermediate vertex (when source itself is an entity)
CREATE (claim:Claim {text: 'Paris is the capital of France', assertedAt: 1700000000})
CREATE (paris)-[:SUBJECT_OF]->(claim)
CREATE (claim)-[:SOURCED_FROM]->(doc:Document {url: 'https://example.com/geo'})
```

### Lookup node (anchor by property)

Always MATCH by label first, then filter — scanning by label hits one table; omitting it scans all vertex tables.

```cypher
MATCH (p:Person {email: 'alice@example.com'})
RETURN p
```

---

## Relational-to-graph translation {#relational-to-graph}

### Junction / bridge tables → edges

A pure junction table (two FK columns, no payload) becomes an edge label.

```sql
-- Relational
CREATE TABLE user_roles (user_id INT, role_id INT, PRIMARY KEY (user_id, role_id));
```

```cypher
-- Graph equivalent
CREATE (u:User)-[:HAS_ROLE]->(r:Role)
```

If the junction table has payload columns (granted_at, granted_by), those become edge properties — or an intermediate vertex if they need their own connections.

### Foreign keys → edges

A nullable FK is a conditional edge. A non-nullable FK is a required edge.

```sql
-- Relational
CREATE TABLE orders (id INT, customer_id INT NOT NULL REFERENCES customers(id));
```

```cypher
-- Graph equivalent: required relationship
CREATE (o:Order)-[:PLACED_BY]->(c:Customer)
```

### Self-referential tables → recursive graph patterns

```sql
-- Relational: manager is also an employee
CREATE TABLE employees (id INT, name TEXT, manager_id INT REFERENCES employees(id));
```

```cypher
-- Graph: natural recursive pattern
CREATE (mgr:Person {name: 'Dana'})-[:MANAGES]->(emp:Person {name: 'Eve'})

-- Query any depth
MATCH (root:Person {name: 'Dana'})-[:MANAGES*]->(report:Person)
RETURN report.name
```

### When NOT to move data to the graph

Keep data relational when:

| Scenario | Reason |
|----------|--------|
| Bulk OLTP operations (INSERT/UPDATE/DELETE at high rate) | SQL is faster; agtype UPDATE rewrites the whole properties blob |
| Strong schema requirements (NOT NULL, CHECK, FK enforcement) | AGE has no property-level constraints |
| Aggregate queries (SUM, GROUP BY, window functions) | SQL optimizer handles these better |
| Full-text search needed | Use PostgreSQL `tsvector`/`GIN` on a SQL column |
| Data is already queried well with 1–2 JOINs | Graph adds overhead without multi-hop benefit |

---

## Anti-patterns {#anti-patterns}

### Over-graphing

Not everything needs to be a vertex or edge. If the relationship is always 1:1 and never queried independently, put it in a property:

```cypher
-- Unnecessary graph complexity
CREATE (p:Person)-[:HAS_ADDRESS]->(a:Address {city: 'Portland'})

-- Fine as a property when addresses aren't shared or traversed
CREATE (p:Person {city: 'Portland'})
```

### Storing IDs instead of edges

```cypher
-- Bad: this is a relational FK pattern, not a graph pattern
CREATE (:Order {customerId: 42, productId: 99})

-- Good: model the relationship directly
CREATE (o:Order)-[:PLACED_BY]->(c:Customer)
CREATE (o:Order)-[:CONTAINS]->(p:Product)
```

### Label-less vertices

Vertices without labels land in `_ag_label_vertex` and require a full parent-table scan on every MATCH. Always assign a label.

```cypher
-- Bad
CREATE ({name: 'Alice'})

-- Good
CREATE (:Person {name: 'Alice'})
```

### Encoding type in a property instead of a label

```cypher
-- Bad: forces runtime filtering, can't use label-based indexes
CREATE (:Node {type: 'Person', name: 'Alice'})

-- Good
CREATE (:Person {name: 'Alice'})
```

---

## Hybrid relational-graph decisions {#hybrid-decisions}

AGE runs inside PostgreSQL. Use this to your advantage: not every entity needs to live in the graph.

### Keep in SQL tables when

- Data is tabular, heavily aggregated, or has strict schema requirements (users, products, invoices)
- Rows are updated frequently — SQL UPDATE is cheaper than Cypher SET on `agtype`
- You need foreign keys, check constraints, or full-text search via PostgreSQL

### Put in the graph when

- Relationships are the primary query target (path traversal, community detection)
- The structure is variable or evolving (knowledge graphs, recommendation engines)
- You need multi-hop traversals that would require many SQL JOINs

### Bridge pattern

Reference SQL rows from graph vertices by storing a foreign key as a property:

```cypher
-- Vertex holds a FK to a PostgreSQL users table
CREATE (:Person {userId: 1042, name: 'Alice'})
```

Then join in SQL:

```sql
SELECT u.email, g.name
FROM users u
JOIN (
  SELECT * FROM cypher('social', $$
    MATCH (p:Person)-[:KNOWS]->(friend:Person)
    WHERE p.userId = 1042
    RETURN friend.userId AS friend_id, friend.name AS name
  $$) AS (friend_id agtype, name agtype)
) g ON u.id = (g.friend_id)::text::int;
```

---

## Indexing for your schema {#indexing}

AGE creates no indexes by default. Add them after the graph and labels exist.

### GIN index on properties (containment queries)

Inline property filters like `{Name: 'Alice'}` use the `@>` containment operator, which GIN serves:

```sql
CREATE INDEX ON social."Person" USING GIN (properties);
```

### BTREE index on a specific property (equality / range)

For high-cardinality properties queried with `WHERE`:

```sql
CREATE INDEX ON social."Person"
  USING BTREE (agtype_access_operator(VARIADIC ARRAY[properties, '"email"'::agtype]));
```

### BTREE on edge endpoints (traversal)

Always index `start_id` and `end_id` on edge tables — traversal depends on them:

```sql
CREATE INDEX ON social."KNOWS" USING BTREE (start_id);
CREATE INDEX ON social."KNOWS" USING BTREE (end_id);
```

### WHERE clause matters for index use

AGE evaluates property filters differently depending on syntax. Use `WHERE` for index-eligible queries:

```sql
-- Uses BTREE index on specific property
SELECT * FROM cypher('social', $$
  MATCH (p:Person) WHERE p.email = 'alice@example.com' RETURN p
$$) AS (p agtype);

-- Uses GIN containment — also indexed, but less selective
SELECT * FROM cypher('social', $$
  MATCH (p:Person {email: 'alice@example.com'}) RETURN p
$$) AS (p agtype);
```

Run `EXPLAIN` inside Cypher to verify index use:

```sql
SELECT * FROM cypher('social', $$
  EXPLAIN MATCH (p:Person) WHERE p.email = 'alice@example.com' RETURN p
$$) AS (plan text);
```

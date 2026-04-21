---
name: saas-multi-tenant
description: Design and implement multi-tenant SaaS architectures with row-level security, tenant-scoped queries, shared-schema isolation, and safe cross-tenant admin patterns in PostgreSQL and TypeScript.
intent: >-
  Architect, implement, and harden production-grade multi-tenant SaaS systems. Use this when building shared-database or shared-schema tenancy, enforcing data isolation via PostgreSQL Row-Level Security (RLS), implementing tenant-scoped middleware, and designing safe cross-tenant admin tooling. Covers Drizzle ORM, Prisma, and raw SQL patterns with TypeScript.
type: component
best_for:
  - "Building shared-schema multi-tenant SaaS from scratch"
  - "Adding RLS tenant isolation to an existing PostgreSQL database"
  - "Designing tenant-scoped API middleware in Node.js/Next.js"
  - "Implementing safe cross-tenant admin dashboards"
  - "Auditing multi-tenant data leakage risks"
scenarios:
  - "Set up row-level security for our multi-tenant app"
  - "I need tenant isolation in PostgreSQL with TypeScript"
  - "Help me design a shared-schema multi-tenant architecture"
  - "Add tenant-scoped queries to our Drizzle ORM setup"
  - "Build a cross-tenant admin panel that won't leak data"
---


## Purpose

Design and implement production-grade multi-tenant SaaS architectures where multiple customers (tenants) share the same database and application infrastructure while maintaining strict data isolation. This skill covers the full lifecycle: schema design, RLS policy enforcement, tenant-scoped middleware, connection management, and safe admin patterns.

This is not a theoretical overview — it's an actionable engineering guide for TypeScript backends using PostgreSQL, covering Drizzle ORM, Prisma, and raw SQL patterns.

## Key Concepts

### Tenancy Models

There are three primary multi-tenant strategies. This skill focuses on **Shared Schema** (Model 3), which is the most cost-effective and scalable approach.

| Model | Description | Isolation | Cost | Complexity |
|-------|-------------|-----------|------|------------|
| **Separate Databases** | One database per tenant | Strongest | Highest | Low code, high ops |
| **Separate Schemas** | One schema per tenant, shared database | Strong | Medium | Medium |
| **Shared Schema** | All tenants in same tables, filtered by `tenant_id` | Moderate (RLS-enforced) | Lowest | Highest code discipline |

**When to use Shared Schema:**
- SaaS with 100+ tenants
- Uniform data models across tenants
- Cost-sensitive infrastructure
- Need simple migrations (one schema to update)

**When NOT to use Shared Schema:**
- Regulatory requirements demand physical isolation (HIPAA, ITAR)
- Tenants need wildly different schemas
- Tenant count is < 10 with high-value enterprise contracts

---

### Core Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
│  ┌──────────┐   ┌────────────┐   ┌──────────────┐  │
│  │  Auth     │──▶│  Tenant    │──▶│  DB Pool     │  │
│  │  Layer    │   │  Middleware │   │  Manager     │  │
│  └──────────┘   └────────────┘   └──────┬───────┘  │
│                                          │          │
│  ┌───────────────────────────────────────▼───────┐  │
│  │            PostgreSQL + RLS                    │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │ Tenant A│  │ Tenant B│  │ Tenant C│ (rows)│  │
│  │  └─────────┘  └─────────┘  └─────────┘      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

### Anti-Patterns (What This Is NOT)

- **Not "just add a WHERE clause":** Application-level filtering is insufficient. A single missed `WHERE tenant_id = ?` leaks all tenants' data. RLS is the safety net.
- **Not a replacement for auth:** RLS isolates data rows. Authentication verifies identity. Authorization determines permissions. All three are required.
- **Not superuser-friendly:** PostgreSQL superusers bypass ALL RLS policies. Never connect your application as a superuser.
- **Not automatic performance:** RLS adds overhead. Without proper indexing on `tenant_id`, queries degrade at scale.

---

## Implementation

### Step 1: Schema Design with Tenant Columns

Every table that stores tenant-specific data MUST include a `tenant_id` column.

#### PostgreSQL Migration

```sql
-- Create the tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Example tenant-scoped table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRITICAL: Always index tenant_id for RLS performance
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
```

#### Drizzle ORM Schema (TypeScript)

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core"

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_projects_tenant_id").on(table.tenantId),
}))
```

---

### Step 2: Enable Row-Level Security (RLS)

RLS policies enforce data isolation at the database level, regardless of application code bugs.

#### Create a Non-Superuser Application Role

```sql
-- CRITICAL: Application must connect as this role, NOT as a superuser
CREATE ROLE app_user LOGIN PASSWORD 'secure_password_here';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Ensure future tables also get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

#### Enable RLS and Create Policies

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Isolation policy: users can only see rows matching their tenant
CREATE POLICY tenant_isolation_select ON projects
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON projects
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_update ON projects
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_delete ON projects
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Repeat for every tenant-scoped table.** Use a helper function to reduce boilerplate:

```sql
-- Helper function to apply standard tenant RLS to any table
CREATE OR REPLACE FUNCTION apply_tenant_rls(table_name TEXT) RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);

  EXECUTE format(
    'CREATE POLICY tenant_isolation_select ON %I FOR SELECT USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)',
    table_name
  );
  EXECUTE format(
    'CREATE POLICY tenant_isolation_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)',
    table_name
  );
  EXECUTE format(
    'CREATE POLICY tenant_isolation_update ON %I FOR UPDATE USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid) WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'')::uuid)',
    table_name
  );
  EXECUTE format(
    'CREATE POLICY tenant_isolation_delete ON %I FOR DELETE USING (tenant_id = current_setting(''app.current_tenant_id'')::uuid)',
    table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Usage:
SELECT apply_tenant_rls('projects');
SELECT apply_tenant_rls('tasks');
SELECT apply_tenant_rls('invoices');
```

---

### Step 3: Tenant Context Middleware (TypeScript)

The middleware extracts the tenant from the authenticated session and sets the PostgreSQL session variable before every query.

#### Next.js API Route Middleware

```typescript
// lib/tenant-context.ts
import { Pool, PoolClient } from "pg"
import { AsyncLocalStorage } from "async_hooks"

// Store tenant context per-request using AsyncLocalStorage
const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  // IMPORTANT: Connect as app_user, NOT superuser
})

/**
 * Execute a callback within a tenant-scoped database context.
 * Sets the PostgreSQL session variable before any queries execute.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()

  try {
    // Set the tenant context on the connection BEFORE any queries
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId])

    // Execute the callback within the tenant context
    return await tenantStorage.run({ tenantId }, () => callback(client))
  } finally {
    // CRITICAL: Release the client back to the pool
    // The `true` parameter in set_config scopes it to the transaction,
    // so the context is automatically cleared
    client.release()
  }
}

/**
 * Get the current tenant ID from AsyncLocalStorage
 */
export function getCurrentTenantId(): string {
  const store = tenantStorage.getStore()
  if (!store?.tenantId) {
    throw new Error("No tenant context found. Ensure withTenantContext is wrapping this call.")
  }
  return store.tenantId
}
```

#### Next.js API Route Usage

```typescript
// app/api/projects/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withTenantContext } from "@/lib/tenant-context"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await withTenantContext(session.user.tenantId, async (client) => {
    // RLS ensures only this tenant's projects are returned
    // No WHERE tenant_id = ? needed — RLS enforces it automatically
    const result = await client.query("SELECT * FROM projects ORDER BY created_at DESC")
    return result.rows
  })

  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, description } = await req.json()

  const project = await withTenantContext(session.user.tenantId, async (client) => {
    // RLS WITH CHECK ensures tenant_id matches — prevents cross-tenant inserts
    const result = await client.query(
      "INSERT INTO projects (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING *",
      [session.user.tenantId, name, description]
    )
    return result.rows[0]
  })

  return NextResponse.json({ project }, { status: 201 })
}
```

---

### Step 4: Drizzle ORM Tenant-Scoped Queries

```typescript
// lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { sql } from "drizzle-orm"
import * as schema from "@/db/schema"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })

/**
 * Execute tenant-scoped Drizzle queries.
 * Sets the RLS context variable, then runs the callback.
 */
export async function withTenantDb<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // Set RLS context within the transaction
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    )
    return await callback(tx as unknown as typeof db)
  })
}
```

#### Usage with Drizzle

```typescript
// app/api/projects/route.ts
import { withTenantDb } from "@/lib/db"
import { projects } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await withTenantDb(session.user.tenantId, async (db) => {
    // RLS automatically filters to current tenant — no manual WHERE needed
    return await db.select().from(projects).orderBy(desc(projects.createdAt))
  })

  return NextResponse.json({ projects: result })
}
```

---

### Step 5: Safe Cross-Tenant Admin Patterns

Admin dashboards need to query across tenants. This requires a **separate database role** that bypasses RLS.

#### Admin Database Role

```sql
-- Create a restricted admin role (still NOT a superuser)
CREATE ROLE admin_user LOGIN PASSWORD 'admin_password_here';
GRANT USAGE ON SCHEMA public TO admin_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin_user;

-- IMPORTANT: This role does NOT have RLS FORCE applied,
-- so it can read across tenants. But it only has SELECT permission.
-- For writes, use the specific tenant context.
```

#### Admin Connection Pool

```typescript
// lib/admin-db.ts
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "@/db/schema"

// Separate pool for admin queries — uses admin_user role
const adminPool = new Pool({
  connectionString: process.env.ADMIN_DATABASE_URL, // Uses admin_user credentials
  max: 5, // Restrict pool size for admin
})

export const adminDb = drizzle(adminPool, { schema })

/**
 * GUARD: Only callable from admin-authenticated contexts
 */
export function requireAdminAccess(session: { user?: { role?: string } }) {
  if (session?.user?.role !== "admin") {
    throw new Error("Admin access required")
  }
}
```

#### Admin API Route

```typescript
// app/api/admin/tenants/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { adminDb, requireAdminAccess } from "@/lib/admin-db"
import { tenants, projects } from "@/db/schema"
import { sql, count } from "drizzle-orm"

export async function GET() {
  const session = await getServerSession(authOptions)
  requireAdminAccess(session)

  // Admin can query across all tenants (no RLS filtering)
  const result = await adminDb
    .select({
      tenant: tenants,
      projectCount: count(projects.id),
    })
    .from(tenants)
    .leftJoin(projects, sql`${tenants.id} = ${projects.tenantId}`)
    .groupBy(tenants.id)

  return NextResponse.json({ tenants: result })
}
```

---

### Step 6: Tenant-Aware Middleware (Next.js)

```typescript
// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Ensure tenant context exists
    if (!token.tenantId) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }

    // Attach tenant header for downstream use
    const headers = new Headers(request.headers)
    headers.set("x-tenant-id", token.tenantId as string)
    return NextResponse.next({ request: { headers } })
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/projects/:path*"],
}
```

---

## Validation & Testing

### Isolation Test Suite

Create integration tests that verify RLS actually works:

```typescript
// __tests__/tenant-isolation.test.ts
import { withTenantContext } from "@/lib/tenant-context"

describe("Tenant Isolation", () => {
  const TENANT_A = "uuid-tenant-a"
  const TENANT_B = "uuid-tenant-b"

  beforeAll(async () => {
    // Seed test data
    await withTenantContext(TENANT_A, async (client) => {
      await client.query(
        "INSERT INTO projects (tenant_id, name) VALUES ($1, 'Project A')",
        [TENANT_A]
      )
    })
    await withTenantContext(TENANT_B, async (client) => {
      await client.query(
        "INSERT INTO projects (tenant_id, name) VALUES ($1, 'Project B')",
        [TENANT_B]
      )
    })
  })

  test("Tenant A cannot see Tenant B data", async () => {
    const projects = await withTenantContext(TENANT_A, async (client) => {
      const result = await client.query("SELECT * FROM projects")
      return result.rows
    })

    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe("Project A")
    // Tenant B's data is invisible — RLS enforced
    expect(projects.find((p: any) => p.name === "Project B")).toBeUndefined()
  })

  test("Tenant B cannot see Tenant A data", async () => {
    const projects = await withTenantContext(TENANT_B, async (client) => {
      const result = await client.query("SELECT * FROM projects")
      return result.rows
    })

    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe("Project B")
  })

  test("Cross-tenant INSERT is rejected by RLS", async () => {
    await expect(
      withTenantContext(TENANT_A, async (client) => {
        await client.query(
          "INSERT INTO projects (tenant_id, name) VALUES ($1, 'Stolen Project')",
          [TENANT_B] // Attempting to write into Tenant B
        )
      })
    ).rejects.toThrow() // RLS WITH CHECK policy blocks this
  })
})
```

### Performance Validation

```sql
-- Verify index usage with RLS
EXPLAIN ANALYZE
  SELECT * FROM projects
  WHERE tenant_id = 'your-tenant-uuid';

-- Should show: Index Scan using idx_projects_tenant_id
-- If it shows Seq Scan, add or fix the index
```

---

## Common Pitfalls

### Pitfall 1: Connecting as Superuser
**Symptom:** RLS policies exist but data leaks between tenants.

**Cause:** Superusers bypass all RLS policies. If `DATABASE_URL` uses the `postgres` superuser, RLS does nothing.

**Fix:** Always connect as `app_user` (a non-superuser role). Verify with `SELECT current_user;`

---

### Pitfall 2: Forgetting set_config Before Queries
**Symptom:** `ERROR: unrecognized configuration parameter "app.current_tenant_id"`

**Cause:** The session variable was never set, or was set with a different parameter scope.

**Fix:** Use `set_config('app.current_tenant_id', $1, true)` — the `true` parameter scopes it to the current transaction. Always call it inside `withTenantContext`.

---

### Pitfall 3: Missing `FORCE ROW LEVEL SECURITY`
**Symptom:** Table owners can still see all rows despite RLS being enabled.

**Cause:** `ENABLE ROW LEVEL SECURITY` applies to non-owners only. The table owner bypasses RLS unless `FORCE` is used.

**Fix:** Always use both:
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE my_table FORCE ROW LEVEL SECURITY;
```

---

### Pitfall 4: Missing tenant_id Index
**Symptom:** Queries slow down dramatically as tenant count grows.

**Cause:** RLS adds a `WHERE tenant_id = ?` filter to every query. Without an index, PostgreSQL does a sequential scan.

**Fix:** Add an index on `tenant_id` for every tenant-scoped table:
```sql
CREATE INDEX idx_tablename_tenant_id ON tablename(tenant_id);
```

---

### Pitfall 5: Connection Pool Leaking Tenant Context
**Symptom:** Tenant A occasionally sees Tenant B's data under high concurrency.

**Cause:** Connection reuse in the pool without resetting the session variable. Previous tenant's `set_config` persists on the connection.

**Fix:** Use `set_config('app.current_tenant_id', $1, true)` with `true` to scope to the transaction. Or explicitly reset on connection release:
```typescript
client.query("RESET app.current_tenant_id")
client.release()
```

---

### Pitfall 6: Forgetting RLS on New Tables
**Symptom:** New feature tables created without RLS, silently leaking tenant data.

**Fix:** Add a CI check that verifies all tables with `tenant_id` have RLS enabled:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id'
  )
  AND tablename NOT IN (
    SELECT tablename FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE c.relrowsecurity = true
  );
-- Should return ZERO rows
```

---

### Pitfall 7: Admin Queries Using Tenant Connection
**Symptom:** Admin dashboard shows only one tenant's data.

**Cause:** Admin queries are running through the RLS-enforced connection pool.

**Fix:** Use a separate `adminDb` connection with a role that has appropriate (read-only cross-tenant) permissions. Never give the admin role write access to all tenants.

---

## Scaffold Checklist

### Phase 1 — Schema Foundation
- [ ] 1. `tenants` table created with id, name, slug, plan, settings
- [ ] 2. All data tables include `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- [ ] 3. `tenant_id` indexed on every tenant-scoped table
- [ ] 4. Drizzle/Prisma schema matches SQL schema

✅ **Validate:** Run `SELECT * FROM information_schema.columns WHERE column_name = 'tenant_id'` — every data table should appear.

### Phase 2 — RLS Enforcement
- [ ] 5. Non-superuser `app_user` role created
- [ ] 6. `ENABLE ROW LEVEL SECURITY` applied to all tenant tables
- [ ] 7. `FORCE ROW LEVEL SECURITY` applied to all tenant tables
- [ ] 8. SELECT, INSERT, UPDATE, DELETE policies created per table
- [ ] 9. Application connects as `app_user`, not `postgres`

✅ **Validate:** Connect as `app_user`, run `SELECT * FROM projects` without setting `app.current_tenant_id` — should return ZERO rows or error.

### Phase 3 — Middleware
- [ ] 10. `withTenantContext()` wrapper implemented
- [ ] 11. `AsyncLocalStorage` used for per-request tenant propagation
- [ ] 12. `set_config` called before every database operation
- [ ] 13. Connection pool properly releases clients

✅ **Validate:** Make two API calls with different tenant tokens simultaneously — each should see only their data.

### Phase 4 — Admin Access
- [ ] 14. Separate `admin_user` role with read-only cross-tenant access
- [ ] 15. `adminDb` connection pool uses admin credentials
- [ ] 16. Admin routes protected by role-based middleware
- [ ] 17. Admin cannot write data through admin connection

✅ **Validate:** Admin query returns data from multiple tenants. Regular API query returns only one tenant's data.

### Phase 5 — Testing & Security Audit
- [ ] 18. Integration tests for cross-tenant isolation
- [ ] 19. CI check for missing RLS on tables with `tenant_id`
- [ ] 20. Performance test with EXPLAIN ANALYZE confirming index usage
- [ ] 21. Load test confirming no context leakage under concurrency

✅ **Validate:** All isolation tests pass. `EXPLAIN ANALYZE` shows Index Scan, not Seq Scan.

---

## Environment Variables Template

```bash
# .env.example

# Application database connection (non-superuser!)
DATABASE_URL=postgresql://app_user:secure_password@ep-xxx.us-east-1.aws.neon.tech/mydb?sslmode=require

# Admin database connection (read-only cross-tenant)
ADMIN_DATABASE_URL=postgresql://admin_user:admin_password@ep-xxx.us-east-1.aws.neon.tech/mydb?sslmode=require

# NOT for application use — migrations only
MIGRATION_DATABASE_URL=postgresql://postgres:superuser_password@ep-xxx.us-east-1.aws.neon.tech/mydb?sslmode=require
```

---

## References

### Related Skills
- `saas-scaffolder` — Full SaaS project boilerplate with auth, billing, and dashboard
- `saas-economics-efficiency-metrics` — Unit economics and capital efficiency analysis
- `systematic-debugging` — Debugging multi-tenant data leakage issues

### External Resources
- **PostgreSQL Docs:** [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- **Nile:** [Multi-Tenant PostgreSQL](https://www.thenile.dev/) — Purpose-built multi-tenant Postgres
- **Citus:** [Multi-Tenant SaaS Tutorial](https://docs.citusdata.com/en/stable/use_cases/multi_tenant.html) — Distributed multi-tenant patterns
- **Drizzle ORM:** [PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)

### Provenance
- Synthesized from PostgreSQL RLS documentation, production multi-tenant patterns, and TypeScript ORM best practices
- Architectural patterns validated against Nile, Citus, and Supabase multi-tenant implementations

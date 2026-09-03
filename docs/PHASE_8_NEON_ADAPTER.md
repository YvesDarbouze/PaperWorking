# Phase 8 — Neon Prisma Adapter

**Status:** Complete (optional connectivity path)  
**Date:** 2026-09-01  
**Scope:** `@prisma/adapter-neon` behind `DATABASE_ADAPTER` — adapter abstraction only

> **Neon adapter support does NOT mean production has migrated to Neon.**  
> **Supabase Postgres remains the authoritative production database.**  
> Phase 8 introduces an optional database connectivity path only.

---

## 1. Why the Neon adapter exists

The approved migration plan targets **Neon PostgreSQL** for Wave-2 financial/REIL models via Prisma. Phase 8 adds the **driver adapter plumbing** so the same Prisma Client and repositories can connect through:

- **Default:** `@prisma/adapter-pg` + `node-postgres` (current Supabase/V1 path)
- **Opt-in:** `@prisma/adapter-neon` + `@neondatabase/serverless` (Neon-compatible PostgreSQL)

This phase does **not** migrate data, schema, or production authority.

---

## 2. Dependency versions (installed)

| Package | Version |
|---|---|
| `prisma` | 7.9.1 |
| `@prisma/client` | 7.9.1 |
| `@prisma/adapter-neon` | 7.10.0 |
| `@prisma/adapter-pg` | 7.10.0 |
| `@neondatabase/serverless` | 1.1.0 |

Adapter packages are kept on the Prisma 7.x line compatible with the generated client.

---

## 3. Adapter construction

Single Prisma client boundary: `packages/database/src/client.ts`

```text
DATABASE_ADAPTER
        ↓
packages/database/src/neon/config.ts   (resolveDatabaseAdapterMode)
        ↓
packages/database/src/neon/adapter.ts  (createPrismaDriverAdapter)
        ↓
PrismaClient({ adapter })
```

| File | Responsibility |
|---|---|
| `neon/config.ts` | Parse `DATABASE_ADAPTER`, validate `DATABASE_URL` |
| `neon/adapter.ts` | Create `PrismaPg` or `PrismaNeon` driver adapter |
| `client.ts` | Singleton Prisma Client factory (unchanged public API) |

---

## 4. `DATABASE_ADAPTER` behavior

| Value | Behavior |
|---|---|
| unset | **default** — existing `PrismaPg` + `pg.Pool` (Supabase production path) |
| `default` | same as unset |
| `pg` | legacy alias for **default** (Phase 1 scaffold compatibility) |
| `neon` | `PrismaNeon` via `@prisma/adapter-neon` |
| any other value | throws `DatabaseAdapterConfigError` (does **not** silently select Neon) |

---

## 5. Required environment variables

### Default / production-safe path

```bash
DATABASE_URL=<Supabase PostgreSQL connection string>
# DATABASE_ADAPTER unset or DATABASE_ADAPTER=default
```

### Neon opt-in (non-production / staging only unless explicitly approved)

```bash
DATABASE_ADAPTER=neon
DATABASE_URL=<Neon-compatible PostgreSQL connection string>
```

No additional URL variable is introduced. Do not commit credentials.

---

## 6. Test strategy

Tests in `packages/database/src/neon/__tests__/`:

- Adapter mode resolution (unset, default, pg, neon, invalid)
- Driver kind selection (`pg` vs `neon`)
- Adapter factory constructs `PrismaPg` / `PrismaNeon` instances **without** connecting to a live database

The normal test suite does **not** require Neon credentials or a remote Neon project.

---

## 7. Runtime considerations

- **NestJS / Cloud Run (Node.js):** default `pg` pool remains appropriate for long-lived Supabase connections.
- **Neon mode:** uses `@neondatabase/serverless` WebSocket driver; Node 22+ `globalThis.WebSocket` is configured when available.
- No custom SQL driver, no connection pool infrastructure beyond existing `pg.Pool` for default mode.
- Repositories and business logic are unchanged — they continue to use Prisma Client.

---

## 8. Production safety

| Check | Status |
|---|---|
| Supabase Postgres authoritative | **Yes** — production uses default adapter unless explicitly reconfigured |
| Production database cutover | **No** |
| Production Neon connection enabled | **No** (opt-in only) |
| Schema changes | **No** |
| Prisma migrations executed | **No** |
| Dual-write / sync | **No** |
| Firestore changes | **No** (Phase 7 untouched) |
| `@paperworking/authz` / `@paperworking/identity` | **Unchanged** |

---

## 9. Rollback

Set or unset:

```bash
DATABASE_ADAPTER=default
```

or remove `DATABASE_ADAPTER` entirely.

No data migration, DNS change, or schema rollback required. The application returns to `PrismaPg` + Supabase `DATABASE_URL`.

---

## 10. Next phase (not started)

**Phase 9 — Next.js API Wave-1 adapters:** route migration behind same authz core. Phase 8 does not migrate any HTTP routes.

---

## Verification

```bash
npm run verify
```

Expected: all workspace builds, typechecks, and tests pass with `DATABASE_ADAPTER` unset (default production path).

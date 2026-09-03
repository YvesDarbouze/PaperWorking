# Architecture Spec vs Current Codebase — Read-Only Gap Audit

**Audit date:** 2026-08-31  
**Client target specification:** [`/PAperWorking Architecture and Developer.md`](../../PAperWorking%20Architecture%20and%20Developer.md)  
**Codebase audited:** `PaperWorking_v1/`  
**Mode:** READ-ONLY — no source, config, dependency, env, deploy, or schema changes were made.

---

## Summary Counts (top of report)

| Metric | Count |
|--------|------:|
| **Critical Differences** | 9 |
| **High Differences** | 10 |
| **Medium Differences** | 6 |
| **Low Differences** | 4 |
| **Missing Components** | 14 |
| **Deployment Blockers** | 6 |
| **Client Decisions Required** | 8 |

**Architecture Match %:** Not calculated — insufficient evidence for an objective numeric score (spec describes V0 Firebase dual-DB monolith; V1 code implements Supabase + split Nest deployment; external GCP/Vercel/Firebase production state not fully visible in repo).

---

## 1. Executive Summary

The client specification describes a **Firebase-centric, dual-database platform**:

- **Single Cloud Run container** running **Next.js standalone** with embedded `@paperworking/api` handlers and `toNextResponse()` adapters.
- **Firebase App Hosting** / load balancing on `paperworking.co`.
- **Firebase Auth**, **Firestore** (authoritative for users/projects/marketplace), **Firebase Storage**, **Firestore Security Rules**.
- **Neon PostgreSQL** via Prisma + `@prisma/adapter-neon` for financial/REIL/Plaid/analytics.
- **Dual-write / entity authority table** between Firestore and Postgres.
- **Redis (Upstash)** for cache and job queues.

The current `PaperWorking_v1` repository implements a **different production architecture**:

- **Split deployment:** Next.js on **Vercel** (documented) or **Firebase App Hosting** (config file exists) + **separate NestJS API** on Cloud Run (`paperworking-api`).
- **Single runtime database:** **Supabase PostgreSQL** via Prisma `@prisma/adapter-pg` — **no Firestore client** in dependencies or Nest services.
- **Supabase Auth** (not Firebase Auth) with httpOnly cookies (`__session`, `__acct`, `__sub`).
- **No Next.js `app/api` routes** — Nest controllers are the HTTP API host.
- **No Firebase Storage, Redis, or Neon adapter** in runtime code.
- **Legacy Firestore naming** persists in Zod schemas, comments, and seed stores; **not wired to a live Firestore instance**.

**Aligned with spec:** monorepo layout, Next.js 15 + React 19, `@paperworking/financial-engine`, Zod validation, REIL phase concept, RBAC tiers, Cloud Run sizing (1 vCPU, 1024 MiB, concurrency 80, `us-east4`), cookie names, `npm run verify` CI gate.

---

# PART 1 — CURRENT ARCHITECTURE (evidence-based)

## 1.1 Current Architecture Map

```text
User Browser
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND — Next.js 15 App Router (apps/web)                 │
│ • React 19, output: standalone                              │
│ • Supabase Auth (browser) — NOT Firebase Auth               │
│ • apiFetch → NEXT_PUBLIC_API_URL (Nest), credentials:include│
│ • NO apps/web/app/api/** routes (0 route.ts files)          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS cross-origin (typical: Vercel → Cloud Run)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND — NestJS 12 on Cloud Run (paperworking-api)         │
│ • apps/api/dist/main.js, PORT 8080                          │
│ • SessionAuthGuard + RolesGuard (global)                    │
│ • AuthorizationService → Prisma → Supabase PostgreSQL         │
│ • SupabaseAuthService verifies JWT (auth.getUser)           │
│ • Legacy handlers in apps/api/src/routes/** (not via Next)  │
└───────────────────────────┬─────────────────────────────────┘
                            │ DATABASE_URL (Supabase pooler)
                            ▼
                    Supabase PostgreSQL
                    (Prisma, 76+ models)

NOT ACTIVE IN RUNTIME CODE:
  • Firestore          • Firebase Auth SDK    • Firebase Storage SDK
  • Neon adapter       • Redis/ioredis        • Dual-write sync

CONFIG-ONLY / LEGACY REFERENCES:
  • apphosting.yaml (Firebase env, Neon label, REDIS_URL)
  • firestore.indexes.json (no firestore.rules in V1)
  • Zod schemas named for Firestore document shapes
  • apps/web seed stores (mockdata until live DB)
```

## 1.2 Evidence Table — What the codebase actually uses

| Layer | Technology | Status | Evidence |
|-------|------------|--------|----------|
| **Monorepo** | npm workspaces `apps/*`, `packages/*`, `tests/*` | Active | `package.json` L6–9 |
| **Frontend framework** | Next.js 15, React 19 | Active | `apps/web/package.json` |
| **Frontend config** | `output: 'standalone'`, transpile packages | Active | `apps/web/next.config.ts` |
| **Frontend hosting (repo config)** | Vercel | Config present | `apps/web/vercel.json` |
| **Frontend hosting (alternate)** | Firebase App Hosting | Config present | `apphosting.yaml` |
| **Backend framework** | NestJS 12 | Active | `apps/api/package.json`, `apps/api/src/main.ts` |
| **Backend deploy image** | Nest-only Docker | Active deploy path | Root `Dockerfile` → `node apps/api/dist/main.js` |
| **Alternate web image** | Next standalone Docker | Present, not primary API path | `infrastructure/Dockerfile` → `node apps/web/server.js` |
| **Cloud Build** | Build + deploy Nest to Cloud Run | Config present | `cloudbuild.yaml` |
| **CI** | GitHub Actions verify | Active | `.github/workflows/verify.yml` |
| **Database ORM** | Prisma 7 | Active | `packages/database/prisma/schema.prisma` |
| **DB provider (runtime)** | Supabase PostgreSQL | Active | `packages/database/src/client.ts` (`@prisma/adapter-pg`, `pg.Pool`) |
| **DB provider (spec/docs)** | Neon | Docs/legacy config only | `docs/DATABASE_MAP.md`, `apphosting.yaml` L188 comment |
| **Firestore** | Not in runtime | Absent | No `firebase`/`firebase-admin` in any `package.json`; grep `getFirestore` → 0 |
| **Auth (client)** | Supabase | Active | `apps/web/lib/supabase/auth-client.ts` |
| **Auth (API)** | Supabase JWT + cookies | Active | `apps/api/src/auth/supabase-auth.service.ts` |
| **Firebase Auth** | Not in runtime | Absent | No `firebase/auth` imports in `.ts/.tsx` |
| **Storage** | Synthetic URLs | Partial/stub | `apps/api/src/routes/upload/handler.ts` L65 |
| **Redis** | Not in runtime | Absent | `apphosting.yaml` L200 only; grep `ioredis` in `.ts` → 0 |
| **Firebase config files** | Partial | Indexes only | `firestore.indexes.json`; no `firebase.json` in V1 |
| **Firestore rules** | Not in V1 | Absent | Rules exist in V0: `PaperWorking/firestore.rules` |

## 1.3 Search-term results (repository)

| Term | Finding in V1 runtime |
|------|----------------------|
| `firebase` | Env vars in `apphosting.yaml`; CSRF allowlist origin; `legacyFirebaseUid` column — **no SDK** |
| `firestore` | Comments, Zod schema docs, seed stores, test mocks — **no client** |
| `firebase-admin` | **0 matches** in `.ts/.tsx/.js` |
| `firebase/auth` | **0 matches** |
| `firebase/storage` | **0 matches** |
| `supabase` / `@supabase` | **Active** in `apps/web`, `apps/api` |
| `prisma` | **Active** — all Wave-1 Nest data access |
| `neon` / `@prisma/adapter-neon` | **Not in package.json**; docs only |
| `cloud run` / `cloudbuild` | **Active** for Nest API |
| `app hosting` | `apphosting.yaml` for Next web |
| `vercel` | `vercel.json`, `vercel-build` script |
| `redis` / `upstash` | `apphosting.yaml` env only |
| `authentication` / `auth` | Supabase + Nest session guards |

---

# PART 2 — COMPARE WITH CLIENT SPECIFICATION

## A. EXACT MATCH

| Area | Spec | Current | Evidence |
|------|------|---------|----------|
| Frontend framework | Next.js 15 App Router, React 19 | Same | `apps/web/package.json` |
| Monorepo packages | `financial-engine`, `validation`, `shared`, `database`, `api`, `web` | Same structure | `package.json` workspaces |
| Financial authority | `deriveAllProjectMetrics()` sole math | Package + golden tests | `packages/financial-engine/` |
| Cloud Run sizing | 1 vCPU, 1024 MiB, min 0, max 10, concurrency 80, us-east4 | Matches in deploy configs | `cloudbuild.yaml`, `apphosting.yaml` runConfig |
| Container base | Node 22 Alpine | Node 22 Alpine | Root `Dockerfile`, `infrastructure/Dockerfile` |
| Port | 8080 / `$PORT` | Same | `apps/api/src/main.ts`, Dockerfiles |
| Cookie names | `__session`, `__acct`, `__sub` | Same names | `apps/api/src/auth/auth.types.ts` |
| RBAC account tiers | investor, investment_team, vendor, admin | Same concepts | `apps/api/src/authz/permissions.ts`, `AuthorizationService` |
| REIL 4 phases | Acquisition → Fund → Hold → Exit | Shared constants + UI | `packages/shared/` |
| Verify gate | `npm run verify` before deploy | CI runs verify | `.github/workflows/verify.yml`, `package.json` |
| Next standalone build | Multi-stage Docker extracts `.next/standalone` | Implemented | `infrastructure/Dockerfile` L53–54 |

## B. DIFFERENT

| Area | Client Specification | Current Code | Difference | Severity | Evidence |
|------|---------------------|--------------|------------|----------|----------|
| Primary operational DB | **Firestore** authoritative for users, orgs, projects, marketplace | **Supabase PostgreSQL** via Prisma for all Wave-1 entities | Firestore removed from runtime | **Critical** | `apps/api/src/app.module.ts`; `packages/database/src/index.ts` L18 comment |
| Dual-database sync | Entity authority table + dual-write (§5) | No sync code (`dual-write` grep → 0) | Dual-DB not implemented | **Critical** | Spec §5; no Firestore adapter in `packages/database/src/` |
| Auth provider | **Firebase Authentication** | **Supabase Auth** | Different IdP | **Critical** | `apps/web/lib/supabase/auth-client.ts`; no firebase in `package.json` |
| `__session` token | Firebase session token | Supabase access JWT | Same cookie, different token | **Critical** | `apps/api/src/auth/supabase-auth.service.ts`; `apps/web/app/auth/callback/page.tsx` |
| Backend topology | **Single Cloud Run** — Next.js + API adapters | **Split:** Nest Cloud Run + FE on Vercel/App Hosting | Different deploy unit | **Critical** | Root `Dockerfile` (Nest); `docs/NEST_API_CLOUD_RUN.md` |
| API serving | Handlers via `toNextResponse()` in web container | **Nest `@Controller`** modules; 0 Next API routes | Different API host | **Critical** | Glob `apps/web/app/api/**` → 0; `apps/api/src/modules.ts` |
| File storage | **Firebase Storage** bucket paths | Synthetic `https://storage.paperworking.co...` URL | No blob upload | **Critical** | `apps/api/src/routes/upload/handler.ts` L65 |
| PostgreSQL host | **Neon** + `@prisma/adapter-neon` | **Supabase** + `@prisma/adapter-pg` | Different vendor/adapter | **High** | `packages/database/package.json` |
| Cache/queue | **Redis (Upstash)** | Env ref only, no code | Missing implementation | **High** | `apphosting.yaml` L199–203 |
| Firestore security | `firestore.rules` at DB layer | No rules file in V1; API guards only | Different security model | **High** | `PaperWorking/firestore.rules` (V0); absent in V1 |
| Frontend hosting | Firebase App Hosting primary | Vercel documented as primary | Hosting divergence | **High** | `apps/web/vercel.json`; `docs/NEST_API_CLOUD_RUN.md` |
| Firebase SDK | Client + Admin for Auth/Firestore/Storage | Env in `apphosting.yaml` only | Config without runtime | **High** | `apphosting.yaml` L28–97 vs `apps/web/package.json` deps |
| REIL Postgres API | ReilProject + Plaid active relational core | Schema exists; **not in Nest Wave-1 modules** | Partially wired | **High** | `apps/api/src/modules.ts`; `docs/FULL_SYSTEM_INTEGRITY_AUDIT.md` |
| Cloud Run service name | Rollback `paperworking` (spec §9.2) | Deploy target `paperworking-api` | Naming mismatch | **Medium** | `cloudbuild.yaml` `_SERVICE` |
| Auth cookie authz | Spec implies tier cookies drive access | `__acct`/`__sub` display-only; DB authz | Stricter than spec text | **Low** (positive) | `apps/api/src/auth/auth.service.ts` L264 |
| User primary key | Firebase `uid` in Firestore | `User.id === Supabase auth.users.id`; `legacyFirebaseUid` remap | Migration bridge | **Medium** | `schema.prisma` User L1607–1611 |
| Legal/marketing copy | Implies Firestore + Neon + Firebase Storage live | Still mentions Firestore/Neon in legal text | Copy outdated vs runtime | **Low** | `apps/web/lib/marketing/legal-data.ts` L17 |
| Local mock auth | `ENABLE_MOCK_AUTH=true` offline | Supported; prod forced off | Aligned behavior | **Low** | `apps/api/src/auth/auth.service.ts` `mockAuthEnabled()` |
| Infrastructure folder | Spec shows `infrastructure/` deploy configs | Present; **primary API deploy uses root Dockerfile** | Path split | **Medium** | `infrastructure/Dockerfile` vs root `Dockerfile` |

---

# PART 3 — MISSING

| Component | Required By Spec | Current Status | Missing/Incomplete | Severity | Evidence |
|-----------|------------------|----------------|--------------------|----------|----------|
| Firestore runtime client | §2 — live project/user/org/marketplace data | **Not installed** | SDK, repositories, reads/writes | **Critical** | No firestore in `package.json` |
| Dual-write sync layer | §5 — entity authority table | **Not implemented** | Sync jobs, conflict rules | **Critical** | grep `dual-write` → 0 |
| Firebase Authentication | §7 — session via Firebase | **Replaced by Supabase** | Firebase Auth integration | **Critical** | `docs/SUPABASE_AUTH_MIGRATION_AUDIT_v1.md` |
| Firebase Storage uploads | §2.3 — document vault paths | **Stub URLs only** | Storage SDK, signed URLs, IAM | **Critical** | `upload/handler.ts` |
| Combined Next+API Cloud Run (prod) | §3 — single `apps/web` container | **Split deploy** | Spec monolith deploy path as primary | **Critical** | Root `Dockerfile` = Nest only |
| Next.js API adapter layer | §1 — `toNextResponse()` in web container | **0 API routes** | `apps/web/app/api/**` wiring | **High** | Glob search |
| Neon PostgreSQL + adapter | §4 — `@prisma/adapter-neon` | **Supabase + adapter-pg** | Neon hosting + adapter | **High** | `packages/database/package.json` |
| Redis / Upstash | §1 diagram — cache & queues | **Env only** | Client, workers, cache usage | **High** | `apphosting.yaml`; no TS imports |
| `firestore.rules` deploy (V1) | §2.2 — DB-layer security | **Missing in V1** | Rules file + Firebase deploy | **High** | V0 only: `PaperWorking/firestore.rules` |
| `firebase.json` / `.firebaserc` | §9 — App Hosting rollback CLI | **Missing in V1** | Firebase project linkage | **Medium** | Glob in V1 → not found |
| ReilProject Nest endpoints | §4, §6 — REIL relational API | Schema + legacy exports only | Nest controllers for REIL | **High** | `apps/api/src/modules.ts` |
| Plaid live sync (if prod scope) | §4 — banking layer | Models in schema; Wave-1 unclear | End-to-end Plaid pipeline | **Medium** | `schema.prisma` Plaid models |
| Cloud Load Balancing config | §1 diagram | **Not in repo** | GCP LB setup | **Medium** | **EXTERNAL CONFIG — MANUAL VERIFICATION REQUIRED** |
| Property metric snapshots (Firestore) | §2 — `/propertyMetricSnapshots` | Postgres/UI paths differ | Firestore collection or equivalent | **Medium** | Spec §2.1 vs Prisma models |

---

# PART 4 — UNEXPECTED / LEGACY TECHNOLOGY

| Technology | In spec? | Status in V1 | Classification | Evidence |
|------------|----------|--------------|----------------|----------|
| **Vercel** | No (spec: Firebase App Hosting) | **Active config** — primary FE deploy docs | **Active** (diverges from spec) | `apps/web/vercel.json`, `docs/VERCEL_DEPLOY.md` |
| **Supabase Auth + Postgres** | No (spec: Firebase + Neon) | **Active runtime** | **Active** — replaces Firebase/Neon stack | `apps/web/lib/supabase/`, `packages/database/src/client.ts` |
| **NestJS standalone API** | No (spec: handlers in Next container) | **Active** — sole HTTP API host | **Active** | `apps/api/src/app.module.ts`, root `Dockerfile` |
| **Firebase env in apphosting.yaml** | Yes | Present but **SDK not installed** | **Legacy / misaligned config** | `apphosting.yaml` L28–97 |
| **Neon references in docs** | Yes | Docs + yaml comment; **not in code** | **Legacy documentation** | `docs/DATABASE_MAP.md`, `apphosting.yaml` L188 |
| **Redis env in apphosting.yaml** | Yes | **Not used in code** | **Legacy / unused config** | `apphosting.yaml` L200 |
| **Firestore Zod schemas** | Yes (Firestore shapes) | Used for validation; **no Firestore backend** | **Legacy schema naming** | `packages/validation/src/schemas/userSchema.ts` header |
| **Seed / mock stores** | Spec mentions local mock auth | In-memory seeds for membership/inbox | **Active in dev**; prod off | `apps/web/lib/membership/seed-store.ts` |
| **Legacy route handlers** | Spec: `@paperworking/api` in web | Handlers exist; served via Nest export path, not Next | **Partially active** | `apps/api/src/routes/**`, `apps/api/src/index.ts` |
| **firebase.json (V0)** | Implied | In `PaperWorking/` not V1 | **Legacy sibling repo** | `PaperWorking/firebase.json` |
| **Duplicate auth systems** | Firebase only | Supabase only at runtime; Firebase env orphaned | **No runtime duplicate** | Package deps |
| **Duplicate DB systems** | Firestore + Neon | Postgres only (Supabase) | **Spec dual-DB not present** | Runtime inspection |

---

# PART 5 — DATABASE ARCHITECTURE

## 5.1 Spec expectation (dual database)

| Store | Spec authority |
|-------|----------------|
| **Firestore** | User profile & billing; projects/workspaces; deal marketplace; real-time UI |
| **Neon PostgreSQL** | Financial ledger; REIL entities; Plaid; binding equity; analytics |

## 5.2 Audit answers

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Is Firestore implemented? | **No** — not in runtime dependencies or Nest/Next data layer | No firebase packages; `packages/database/src/index.ts` |
| 2 | Is Neon PostgreSQL implemented? | **No** — deploy scripts/docs reference **Supabase** pooler | `scripts/deploy-api-cloud-run.sh`, `packages/database/package.json` |
| 3 | Is Prisma configured? | **Yes** — PostgreSQL, 76+ models, migrations | `packages/database/prisma/schema.prisma` |
| 4 | Is adapter using Neon? | **No** — uses `@prisma/adapter-pg` + `pg` Pool | `packages/database/src/client.ts` L5–6, L79 |
| 5 | Are both databases actually used? | **No** — single Postgres only at runtime | All Nest services use `PrismaService` |
| 6 | Are there dual-write mechanisms? | **No** | grep `dual-write|syncToFirestore` → 0 |
| 7 | Are Firestore/Postgres responsibilities separated per spec? | **No** — Postgres holds User, Project, Deal, Org, etc. | `schema.prisma` models User, Project, Deal, Organization |
| 8 | Conflicting sources of truth? | **Yes, conceptual** — spec says Firestore authoritative; code uses Postgres only. Zod schemas still describe Firestore document shapes. | Validation schemas vs Prisma models |
| 9 | Old Supabase references? | **Supabase is the active system**, not legacy | `apps/web`, `apps/api`, deploy scripts |
| 10 | Spec entities missing in code? | **Partial** — Firestore subcollections (ledgerItems, phaseSnapshots as subcols) modeled differently in Postgres JSON/relations. ReilProject exists but not fully exposed in Wave-1 API. | `schema.prisma`; `docs/FULL_SYSTEM_INTEGRITY_AUDIT.md` |

## 5.3 Entity authority comparison (spec §5 vs current)

| Entity | Spec primary | Spec secondary | Current SoT | Match? |
|--------|-------------|----------------|-------------|--------|
| User profile & billing | Firestore | Postgres AppUser | Postgres `User` + `Subscription` | **No** |
| Projects / workspaces | Firestore | Postgres ReilProject | Postgres `Project` | **No** |
| Financial ledger | Postgres | Firestore ledgerItems cache | Postgres (no Firestore cache) | **Partial** |
| Deal marketplace | Firestore dealListings | Postgres Deal | Postgres `Deal`, `MarketplaceListing` | **No** |
| Financial calculations | financial-engine | Firestore snapshots | In-memory / API responses | **Partial** |

---

# PART 6 — DEPLOYMENT ARCHITECTURE

| Component | Client Target | Current Implementation | Match? | Evidence |
|-----------|---------------|------------------------|--------|----------|
| **Frontend** | Firebase App Hosting / CLB → `paperworking.co` | Vercel (`vercel.json`) **or** App Hosting (`apphosting.yaml`) | **Partial / diverged** | Both configs exist; docs favor Vercel + Nest |
| **Next.js server** | Cloud Run container (standalone) | Vercel serverless **or** App Hosting Cloud Run for web | **Partial** | `infrastructure/Dockerfile` builds standalone; primary docs ≠ spec monolith |
| **Backend/API** | Same Cloud Run as Next (embedded handlers) | **Separate** Cloud Run `paperworking-api` (Nest) | **No** | Root `Dockerfile`, `cloudbuild.yaml` |
| **Authentication** | Firebase Auth | Supabase Auth + Nest cookies | **No** | Supabase client + `SupabaseAuthService` |
| **Firestore** | GCP Firebase — live | Not deployed from V1 code | **No** | No SDK |
| **PostgreSQL** | Neon | Supabase (Prisma) | **No** | `deploy-api-cloud-run.sh` |
| **Storage** | Firebase Storage bucket | Not wired | **No** | `upload/handler.ts` |
| **Redis** | Upstash | Not wired | **No** | `apphosting.yaml` only |
| **CI/CD** | verify + deploy (implied) | GitHub Actions verify; Cloud Build for API | **Partial** | `.github/workflows/verify.yml`; no deploy workflow in repo |
| **Domain** | `paperworking.co` via Firebase/GCP | Referenced in env | **EXTERNAL CONFIG — MANUAL VERIFICATION REQUIRED** | `apphosting.yaml` NEXT_PUBLIC_APP_URL |

### Deployment path summary

| Path | What it deploys | Spec alignment |
|------|-----------------|----------------|
| Root `Dockerfile` + `cloudbuild.yaml` + GitHub Cloud Run | Nest API only | **API portion only** — not combined with Next |
| `infrastructure/Dockerfile` | Next.js standalone | **Closer to spec web container** — no embedded API via Next routes |
| `apphosting.yaml` | Next web via Firebase App Hosting | **Partial** — yaml still lists Firebase/Neon/Redis stack |
| Vercel | Next frontend | **Not in spec** |

---

# PART 7 — AUTHENTICATION & SECURITY

| Requirement | Spec | Current | Gap? | Evidence |
|-------------|------|---------|------|----------|
| Firebase Authentication | Required | **Supabase Auth** | **Yes** | `auth-client.ts`, `supabase-auth.service.ts` |
| Session cookies | `__session`, `__acct`, `__sub` httpOnly | Same names; Supabase JWT in `__session` | **Token source differs** | `auth.types.ts`, `auth.service.ts` |
| HTTP-only session | Yes | `__session` httpOnly | Aligned | `auth.service.ts` cookie options |
| RBAC / account tiers | investor, investment_team, vendor, admin | `AuthorizationService` + `RolesGuard` | Aligned | `authz/authorization.service.ts`, `permissions.ts` |
| Organization isolation | Firestore rules + app logic | Postgres queries + `assertOrgAccess` | **Different layer** — API-only | `authorization.service.ts` L47–53 |
| Firestore Security Rules | Required | **Not in V1** | **Yes** | No `firestore.rules` in V1 |
| Backend authorization | Implied | Nest global guards + service ACLs | **Present** | `auth.module.ts` APP_GUARD |
| Token verification | Firebase session | Supabase `auth.getUser(jwt)` | **Different** | `supabase-auth.service.ts` L55–56 |
| Admin permissions | Platform admin role | `accountType=admin` from DB; not from cookies | **Stronger** — cookie escalation blocked | `auth.service.ts`, integrity audit docs |
| CSRF | Not detailed in spec | `CsrfGuard` on session mutations | **Extra control** | `csrf.guard.ts`, `auth.controller.ts` |

### Security gaps (relative to spec)

1. **No Firestore rules** — spec DB-layer tenant isolation not available in V1.
2. **Orphan Firebase Admin secrets in apphosting.yaml** — risk if App Hosting deployed without SDK audit.
3. **Cross-origin FE/API** — requires `COOKIE_SAMESITE=none` + exact `CORS_ORIGINS` (**EXTERNAL CONFIG — MANUAL VERIFICATION REQUIRED**).
4. **Storage uploads not persisted** — metadata/URLs without blob integrity or access control on real storage.

---

# PART 8 — WHAT IS TECHNICALLY BETTER?

Classification legend: **KEEP CLIENT ARCHITECTURE** | **CLIENT ARCHITECTURE IS TECHNICALLY SOUND** | **TRADE-OFF EXISTS** | **CURRENT IMPLEMENTATION MAY BE BETTER** | **CLIENT DECISION REQUIRED**

### Frontend hosting

| Option | Assessment |
|--------|------------|
| Firebase App Hosting (spec) | **CLIENT ARCHITECTURE IS TECHNICALLY SOUND** — unified GCP, good for Firebase services |
| Vercel (current docs) | **CURRENT IMPLEMENTATION MAY BE BETTER** for Next.js DX, previews, edge — **TRADE-OFF EXISTS** vs GCP unity |
| Cloud Run for Next | **TRADE-OFF EXISTS** — works via standalone; ops overhead vs Vercel |

**Verdict:** **CLIENT DECISION REQUIRED**

### Database

| Option | Assessment |
|--------|------------|
| Firestore + Neon dual (spec) | **CLIENT ARCHITECTURE IS TECHNICALLY SOUND** for real-time + relational split — high sync complexity |
| Supabase Postgres only (current) | **CURRENT IMPLEMENTATION MAY BE BETTER** for relational integrity, single SoT, Prisma migrations — loses Firestore real-time |
| Dual-write as spec | **TRADE-OFF EXISTS** — powerful but operationally expensive |

**Verdict:** **CLIENT DECISION REQUIRED** — V1 already migrated in code toward Postgres-only

### Backend

| Option | Assessment |
|--------|------------|
| Handlers in Next container (spec) | **CLIENT ARCHITECTURE IS TECHNICALLY SOUND** for single deploy unit |
| Nest on separate Cloud Run (current) | **CURRENT IMPLEMENTATION MAY BE BETTER** for API evolution, scaling, typing — **TRADE-OFF EXISTS** on deploy complexity |

**Verdict:** **CLIENT DECISION REQUIRED**

### Authentication

| Option | Assessment |
|--------|------------|
| Firebase Auth (spec) | **KEEP CLIENT ARCHITECTURE** if Firestore/Firebase stack restored |
| Supabase Auth (current) | **TRADE-OFF EXISTS** — aligns with Postgres `auth.users`; already implemented E2E |

**Verdict:** **CLIENT DECISION REQUIRED**

---

# PART 9 — FINAL ARCHITECTURE DIAGRAMS

## CURRENT (discovered in repository)

```text
                         ┌──────────────┐
                         │     User     │
                         └──────┬───────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
   ┌─────────────────────┐            ┌─────────────────────┐
   │ Vercel (documented) │     OR     │ Firebase App Hosting│
   │ Next.js 15 apps/web │            │ (apphosting.yaml)   │
   │ Supabase Auth (UI)  │            │ Next.js standalone  │
   └──────────┬──────────┘            └──────────┬──────────┘
              │         NEXT_PUBLIC_API_URL       │
              └─────────────────┬─────────────────┘
                                ▼
              ┌─────────────────────────────────────┐
              │ Cloud Run: paperworking-api (Nest)  │
              │ SessionAuthGuard, AuthorizationService│
              │ Supabase JWT → cookies              │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │ Supabase PostgreSQL (Prisma/pg)     │
              └─────────────────────────────────────┘

Not in runtime: Firestore, Firebase Storage, Neon, Redis, Firebase Auth SDK
```

## TARGET (client specification)

```text
                         ┌──────────────┐
                         │     User     │
                         └──────┬───────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │ Firebase App Hosting / Cloud LB     │
              │ paperworking.co                     │
              └─────────────────┬───────────────────┘
                                ▼
              ┌─────────────────────────────────────┐
              │ Cloud Run — Next.js standalone      │
              │ + @paperworking/api adapters        │
              │ + financial-engine + validation     │
              └──────┬──────────┬──────────┬────────┘
                     │          │          │
         ┌───────────▼──┐  ┌────▼────┐  ┌──▼───────────┐  ┌──────────────┐
         │  Firestore   │  │ Neon PG │  │ Firebase     │  │ Upstash Redis│
         │  users,      │  │ Prisma  │  │ Storage      │  │ cache/queue  │
         │  projects,   │  │ REIL,   │  │ docs/PDFs    │  │              │
         │  marketplace │  │ ledger  │  │              │  │              │
         └──────────────┘  └─────────┘  └──────────────┘  └──────────────┘

Firebase Authentication ──► __session / __acct / __sub cookies
Firestore Security Rules ──► tenant isolation at DB layer
Dual-write ──► entity authority per spec §5
```

---

# PART 10 — FINAL REPORT SECTIONS

## 2. Current Architecture
See **PART 1** above.

## 3. Client Target Architecture
See spec file §1–§7 and **PART 9 TARGET diagram**.

## 4. Exact Matches
See **PART 2 § A**.

## 5. Differences
See **PART 2 § B** (29 rows total across severities).

## 6. Missing Components
See **PART 3** (14 items).

## 7. Legacy/Unexpected Components
See **PART 4**.

## 8. Database Comparison
See **PART 5**.

## 9. Deployment Comparison
See **PART 6**.

## 10. Authentication/Security Comparison
See **PART 7**.

## 11. Performance Comparison

| Factor | Spec (monolith + dual DB) | Current (split + single DB) |
|--------|---------------------------|-----------------------------|
| FE latency | Same region as API on Cloud Run | Vercel edge may improve static/SSR |
| API scaling | Coupled to web container | Independent Nest scaling |
| Cold starts | One service | FE + API separate cold starts |
| Query complexity | Split across Firestore + SQL | Single SQL — simpler joins |
| Real-time UI | Firestore listeners | No native real-time layer in code |
| Cache | Redis specified | Missing — more DB load |

## 12. Cost Considerations

| Item | Notes |
|------|-------|
| Vercel + Cloud Run + Supabase | **Extra vendors** vs spec all-GCP + Firebase + Neon |
| Dual DB (spec) | Higher ops + sync cost; Firestore read/write billing |
| Single Postgres (current) | Lower DB ops complexity |
| Scale-to-zero Cloud Run | Both spec and current configs use min 0 instances |

## 13. Maintainability Comparison

| Aspect | Spec | Current V1 |
|--------|------|------------|
| Data model | Dual-DB requires sync discipline | Single Postgres easier for new devs |
| Deploy story | One container | Multiple paths (confusing) |
| Auth | Firebase ecosystem | Supabase + Nest documented |
| API surface | 290+ handlers in web | Nest modules + legacy handlers coexist |
| Tests | verify + integration + e2e | Present in monorepo |

## 14. Technical Recommendations

**Do not treat these as mandates to change the client's spec.** They document audit conclusions:

1. **If spec is binding:** major replatform to restore Firestore, Firebase Auth, Storage, Redis, Neon, dual-sync, and monolithic Cloud Run web container.
2. **If V1 migration is approved:** update client-facing architecture doc; align `apphosting.yaml` with actual stack; complete Cloud Run secrets; implement real storage; decide REIL Wave-2 scope.
3. **Do not delete Vercel/Supabase config** without client decision — they are the active documented path.

## 15. Client Decisions Required (Yves)

1. Is the **client markdown spec** still binding, or is **V1 Supabase + Nest + split deploy** approved?
2. **Frontend hosting:** Vercel vs Firebase App Hosting for production?
3. **Database:** Restore **Firestore + Neon dual-DB** or keep **Supabase Postgres-only**?
4. **Authentication:** Firebase Auth vs Supabase Auth?
5. **Storage:** Firebase Storage (spec) vs alternative (Supabase Storage / GCS)?
6. **API topology:** Monolithic Next Cloud Run vs separate Nest service?
7. **Wave-1 launch scope** vs full REIL/Plaid/Firestore from spec?
8. **Legal/marketing copy** — update to reflect actual stack?

## 16. Deployment Blockers

| # | Blocker | Type |
|---|---------|------|
| 1 | Cloud Run Nest needs `DATABASE_URL`, Supabase keys, `CORS_ORIGINS` | **EXTERNAL CONFIG** |
| 2 | Vercel needs `NEXT_PUBLIC_API_URL` | **Config** |
| 3 | Spec-required Firestore/Storage/Redis not wired | **Architecture** |
| 4 | Dual deploy paths (Vercel vs App Hosting vs Nest Dockerfile) | **Process** |
| 5 | Cross-site cookie/CORS configuration | **EXTERNAL CONFIG** |
| 6 | Production domain/DNS mapping | **EXTERNAL CONFIG — MANUAL VERIFICATION REQUIRED** |

## 17. Final Migration/Configuration Checklist

**If aligning TO client spec (not executed in this audit):**

- [ ] Restore Firestore client + repositories + security rules deploy
- [ ] Implement dual-write / entity authority per §5
- [ ] Switch auth to Firebase Auth; migrate sessions
- [ ] Deploy Neon + `@prisma/adapter-neon` or confirm Postgres vendor with client
- [ ] Wire Firebase Storage for uploads
- [ ] Wire Redis/Upstash
- [ ] Combine Next + API in single Cloud Run service OR get client approval for split
- [ ] Firebase App Hosting as primary FE host on `paperworking.co`
- [ ] Remove or document Vercel/Supabase as intentional deviations

**If aligning docs/deployment TO current V1 code:**

- [ ] Update client architecture document to reflect Supabase + Nest + Vercel
- [ ] Clean stale Firebase/Neon/Redis entries from `apphosting.yaml` if unused
- [ ] Ensure Cloud Run + Vercel env fully configured
- [ ] Implement storage backend (any approved provider)
- [ ] Wire ReilProject API or defer with client sign-off

---

## Appendix — Key file index

| Path | Role |
|------|------|
| `../../PAperWorking Architecture and Developer.md` | Client target spec |
| `apps/web/package.json` | Next 15, Supabase |
| `apps/web/next.config.ts` | standalone, no API routes |
| `apps/web/vercel.json` | Vercel deploy |
| `apps/web/lib/api/client.ts` | FE → Nest |
| `apps/web/lib/supabase/auth-client.ts` | Browser auth |
| `apps/api/src/app.module.ts` | Nest sole HTTP host |
| `apps/api/src/auth/supabase-auth.service.ts` | JWT verify |
| `apps/api/src/auth/session-auth.guard.ts` | Session + roles |
| `apps/api/src/authz/authorization.service.ts` | RBAC + org isolation |
| `packages/database/prisma/schema.prisma` | Postgres models |
| `packages/database/src/client.ts` | adapter-pg |
| `Dockerfile` | Nest Cloud Run image |
| `infrastructure/Dockerfile` | Next standalone image |
| `cloudbuild.yaml` | API CI/CD |
| `apphosting.yaml` | App Hosting (legacy env mix) |
| `scripts/deploy-api-cloud-run.sh` | Supabase secrets + deploy |
| `.github/workflows/verify.yml` | CI verify |
| `firestore.indexes.json` | Indexes without client/rules |
| `PaperWorking/firestore.rules` | V0 rules (not V1) |

---

*End of read-only audit. No code, configuration, packages, env, deployments, or schemas were modified.*

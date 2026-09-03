# Phase 7 — Firestore Read Repositories

**Status:** Complete (read-only migration path)  
**Date:** 2026-09-01  
**Scope:** User, Organization, OrganizationMember, Project read repositories only

> **Firestore is NOT production write authority yet.**  
> Supabase Postgres + NestJS remain authoritative for all production reads and writes.

---

## 1. Entities implemented

| Entity | Collection | Repository |
|---|---|---|
| User | `users` | `FirestoreUserRepository` |
| Organization | `organizations` | `FirestoreOrganizationRepository` |
| OrganizationMember | `organizationMembers` | `FirestoreOrganizationMemberRepository` |
| Project | `projects` | `FirestoreProjectRepository` |

Location: `packages/database/src/firestore/`

---

## 2. Postgres → Firestore mapping

Source of truth for field semantics: `docs/FIRESTORE_COLLECTION_BLUEPRINT_v1.md`  
Prisma models: `packages/database/prisma/schema.prisma` (`User`, `Organization`, `OrganizationMember`, `Project`)

### User

| Postgres (`User`) | Firestore (`/users/{uid}`) | Notes |
|---|---|---|
| `id` | document ID / `uid` | Firestore doc id = Firebase Auth UID |
| `email` | `email` | |
| `name` / `displayName` | `displayName` | Converter accepts either direction |
| `accountType` | `accountType` | |
| `role` | `role` | |
| `legacyFirebaseUid` | `legacyFirebaseUid` | Postgres-only bridge during migration |
| — | `personalOrganizationId` | Firestore-primary; null in Postgres shadow mapper |
| `createdAt` / `updatedAt` | `createdAt` / `updatedAt` | Timestamp → `Date` at repository boundary |

### Organization

| Postgres (`Organization`) | Firestore (`/organizations/{orgId}`) | Notes |
|---|---|---|
| `id` | document ID / `id` | |
| `name` | `name` | |
| `slug` | `slug` | Postgres-only today |
| `ownerId` | `ownerUid` | Mapped in converter |
| `settings` | — | Postgres JSON; optional in Firestore read model |
| `createdAt` / `updatedAt` | `createdAt` / `updatedAt` | |

### OrganizationMember

| Postgres (`OrganizationMember`) | Firestore (`/organizationMembers/{membershipId}`) | Notes |
|---|---|---|
| `id` | document ID / `id` | Prefer `{orgId}_{userId}` composite |
| `organizationId` | `organizationId` | |
| `userId` | `userId` | Nullable while invite-only in Firestore |
| `email` | `email` | |
| `role` | `role` | |
| `status` | `status` | |
| `createdAt` / `updatedAt` | `createdAt` / `updatedAt` | |

### Project

| Postgres (`Project`) | Firestore (`/projects/{projectId}`) | Notes |
|---|---|---|
| `id` | document ID / `id` | |
| `organizationId` | `organizationId` | |
| `userId` | `ownerId` | Firestore uses `ownerId` |
| `investorId` | — | Postgres-only in read model |
| `name` / `title` | `name` | |
| `address` | `addressLine` | |
| `city`, `state`, `zip` | same | |
| `status` | `status` | |
| `currentPhase` (1–4) | `lifecyclePhase` | String enum or number; converter maps both |
| `visibility` | `visibility` | |
| `purchasePrice` | — | Postgres-only in read model |
| — | `reilProjectId` | Optional Firestore → Postgres bridge |
| `createdAt` / `updatedAt` | `createdAt` / `updatedAt` | |

---

## Identifier and Lifecycle Mapping Contract

### OrganizationMember

| Concept | Semantics |
|---|---|
| **Postgres / V1 `OrganizationMember.id`** | UUID primary key (`@default(uuid())`). **Authoritative V1 membership identifier.** Nest team APIs accept this as `membershipId` for update/delete. |
| **Firestore document ID** | Migration/read-model convention only. Blueprint prefers `{organizationId}_{userId}` when `userId` is set; UUID document IDs are also permitted. |
| **Does Firestore document ID replace Postgres membership ID?** | **NO.** Postgres UUID remains authoritative for V1 production. Firestore ID is not a substitute in application APIs. |
| **Phase 7 read convention** | `getMembership(orgId, userId)` tries composite doc `{orgId}_{userId}` first, then queries `(organizationId, userId)`. Supports both composite and UUID-backed Firestore docs via query fallback. |
| **UUID lookup by membership id alone** | **Not supported** in Phase 7 (no `getById(membershipId)`). V1 UUID paths continue to use Postgres until a later migration phase. |
| **Composite IDs** | Firestore migration convention per blueprint; they do **not** redefine V1 `OrganizationMember.id`. |

Invite-only memberships (`userId` null) are not returned by `getMembership(orgId, userId)` — consistent with an active-user lookup contract.

### Project lifecycle

Postgres `Project.currentPhase` (V1 authoritative):

```text
1 = acquisition
2 = purchase
3 = hold
4 = exit
```

Firestore `lifecyclePhase` (blueprint lean doc) normalizes to the same numeric read model:

```text
acquisition → 1
purchase    → 2
fund        → 2   (blueprint alias — same V1 phase as purchase)
hold        → 3
exit        → 4
```

`purchase` and `fund` are **aliases for the same numeric phase 2** — not separate business states. Mapping is defined in `packages/database/src/firestore/converters/project.converter.ts` (`LIFECYCLE_PHASE_ALIASES` / `lifecyclePhaseToNumber`). V1 Nest `PHASE_MAP` in `apps/api/src/projects/projects.repository.ts` uses `purchase` for phase 2; the Firestore blueprint uses the label **Fund**.

Unknown or out-of-range lifecycle strings yield `currentPhase: null` in the read model unless the document includes a valid numeric `currentPhase` field.

---

## 3. Document ID strategy

| Collection | ID strategy |
|---|---|
| `users` | Firebase Auth UID |
| `organizations` | UUID / org slug-derived id (same as Postgres `Organization.id`) |
| `organizationMembers` | `{organizationId}_{userId}` preferred; uuid fallback supported |
| `projects` | Shared product workspace id (aligned with Postgres `Project.id` where migrated) |

---

## 4. Repository interfaces

All repositories are **read-only**. Write methods throw `FirestoreReadNotImplementedError`.

### `FirestoreUserRepository`

- `getById(uid: string): Promise<UserReadModel | null>`

### `FirestoreOrganizationRepository`

- `getById(id: string): Promise<OrganizationReadModel | null>`

### `FirestoreOrganizationMemberRepository`

- `getMembership(orgId: string, userId: string): Promise<OrganizationMemberReadModel | null>`
- `listForUser(userId: string): Promise<OrganizationMemberReadModel[]>`

### `FirestoreProjectRepository`

- `getById(id: string): Promise<ProjectReadModel | null>`
- `listByOrganization(orgId: string): Promise<ProjectReadModel[]>`

Repositories accept an optional `FirestoreClientFactory` for tests/emulator injection.

---

## 5. Security boundary

Authorization is **not** implemented in repositories.

```text
Firebase / Supabase identity
        ↓
@paperworking/identity (token verification)
        ↓
AuthService.toAuthUser() (Nest — Postgres profile today)
        ↓
@paperworking/authz (AuthorizationService / RBAC / ACL / CSRF)
        ↓
Service layer (future Phase 9)
        ↓
Firestore repository (data access only)
```

- Firestore Security Rules remain migration-phase / server-authoritative (no broad client writes).
- Admin SDK server reads bypass client security rules; application-level authorization remains mandatory.
- Repositories do not check org membership or admin status.

---

## 6. Emulator setup

```bash
# Terminal 1 — Firestore emulator (requires Firebase CLI)
firebase emulators:start --only firestore

# Terminal 2 — point Admin SDK at emulator
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_PROJECT_ID=demo-paperworking

# Optional dry-run smoke read (non-production)
export FIRESTORE_DRY_RUN_READ=true
export DRY_RUN_USER_ID=uid_abc123
node scripts/firestore-read-dry-run.mjs
```

Unit tests use an in-memory `MockFirestore` (`packages/database/src/firestore/__tests__/mock-firestore.ts`) and do not require a live project.

---

## 7. Feature flags

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_READ_MODE` | `postgres` | Primary read path selector (`postgres` \| `firestore`) |
| `FIRESTORE_SHADOW_READS` | `false` | Optional shadow comparison logging (does not affect responses) |
| `FIRESTORE_DRY_RUN_READ` | unset | Must be `true` to run `scripts/firestore-read-dry-run.mjs` |

Production must keep `DATABASE_READ_MODE=postgres` until a later cutover phase.

---

## 8. Shadow-read behavior

When `FIRESTORE_SHADOW_READS=true`:

1. Primary response continues to come from Postgres (Nest / Prisma path).
2. Optional Firestore read may be compared via `compareReadModels()` / `*FromPostgres()` helpers in `shadow-read.ts`.
3. Mismatches log field names and ids only — not emails or sensitive values.
4. Mismatches never change the user-visible response.

Default: **OFF**.

---

## 9. Known limitations

- No create/update/delete — writes throw `FirestoreReadNotImplementedError`.
- No production Postgres → Firestore data migration in this phase.
- No dual-write (`packages/database/sync` remains unused for production).
- `User.personalOrganizationId` exists in Firestore blueprint but not Postgres `User` table — shadow compare may differ until backfill.
- Postgres `Project.investorId`, `purchasePrice`, `Organization.slug/settings` may be absent in Firestore docs during early migration.
- NestJS controllers and Prisma services are unchanged — repositories are not wired into production HTTP yet.

---

## 10. Rollback procedure

Phase 7 is read-only and flag-gated. Rollback steps:

1. Ensure `DATABASE_READ_MODE=postgres` (default).
2. Ensure `FIRESTORE_SHADOW_READS=false` (default).
3. Do not import Firestore repositories in Nest production services.
4. No DNS, Firebase console, or Supabase changes were made — no infra rollback required.

Removing Phase 7 code is safe: production continues on Nest → Prisma → Supabase Postgres.

---

## Verification

```bash
npm run verify
```

Expected: all workspace builds, typechecks, and tests pass; existing API/RBAC/CSRF/Firebase Auth parallel tests unchanged.

---

## Next phase (not started)

**Phase 8 — Neon adapter:** wire `@prisma/adapter-neon` for serverless Postgres reads/writes per migration plan. Firestore read repositories remain available for shadow validation but do not become write authority until dual-write phases.

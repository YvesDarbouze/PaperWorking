# Phase 9A — Shared Session + Authz Wiring

**Status:** Complete  
**Scope:** Framework-independent session resolution and Next.js dependency wiring only.

> **Phase 9A does NOT migrate any production Next.js API route.**

## 1. Architecture

```
Request (Bearer / __session)
  ↓
@paperworking/identity.verifyAccessToken()
  ↓
Postgres User lookup (Prisma session store)
  ↓
buildAuthUserFromPostgresUser() → AuthUser (@paperworking/authz)
  ↓
@paperworking/authz AuthorizationService
  ↓
service / use-case / repository
```

The shared resolver lives in `@paperworking/services` and is consumed by:

- **NestJS** — `AuthService` delegates `toAuthUser()` and bearer/cookie resolution to the shared layer
- **Next.js** — `buildHandlerDeps()` + `resolveServerAuthUser()` for future authenticated routes and admin layout

## 2. Shared Resolver Responsibility

Package: `packages/services/src/session/`

| Export | Role |
|--------|------|
| `resolveAuthUserFromAccessToken` | Verify token → resolve DB user → AuthUser |
| `resolveAuthUserFromCredentials` | Pick bearer or `__session` → same as above |
| `buildAuthUserFromPostgresUser` | Map Postgres row → AuthUser |
| `buildAuthUserForUid` | Lookup by uid/legacyFirebaseUid → AuthUser |
| `createPrismaSessionUserStore` | Prisma-backed user lookup |
| `normalizeClientAccountType` | First-provision only; rejects client `admin` |
| `isPlatformAdminUser` | DB-derived platform admin check |

The resolver does **not** contain RBAC, org ACL, or permission rules.

## 3. Identity Boundary

- Token verification: `@paperworking/identity` (`verifyAccessToken`)
- Supports Supabase (authoritative) and Firebase (feature-flagged via `USE_FIREBASE_AUTH`)
- Invalid/expired/missing tokens → `null` (Nest-compatible)

## 4. AuthUser Source of Truth

**Canonical type:** `@paperworking/authz` `AuthUser`

Fields derived from **Postgres only**:

| Field | Source |
|-------|--------|
| `uid` | `User.id` (or token uid if no row) |
| `email` | `User.email` |
| `accountType` | `User.accountType` + `isPlatformAdminUser()` normalization |
| `isAdmin` | `isPlatformAdminUser({ accountType, role })` |
| `role` | `User.role` |

**Never trusted for authorization:**

- `__acct` cookie
- `__sub` cookie
- request body `accountType`
- client roles or org membership claims

Account escalation protection preserved: client `"admin"` → normalized to `"investor"` on first provisioning via `normalizeClientAccountType()`.

## 5. Authorization Boundary

- RBAC / permissions: `@paperworking/authz` only
- Nest: `apps/api/src/authz/authorization.service.ts` (adapter wrapping core)
- Next: `buildHandlerDeps().authorization` — direct `AuthorizationService` instance
- No duplicated permission logic in `apps/web`

## 6. handler-deps Wiring

File: `apps/web/lib/api/handler-deps.ts`

| Dependency | Implementation |
|------------|----------------|
| `prisma` | `getApiPrismaClient()` |
| `identity` | `createDefaultIdentityDeps()` |
| `sessionStore` | `createPrismaSessionUserStore(prisma)` |
| `sessionResolver` | `{ identity, store }` |
| `authorization` | `new AuthorizationService(createPrismaAuthzStore(prisma))` |
| `authzStore` | `createPrismaAuthzStore(prisma)` |
| `validateCsrf` | `validateCsrf` from `@paperworking/authz` |
| `resolveAuthUserFromCredentials` | from `@paperworking/services` |
| `health` | unchanged (Phase 1) |

## 7. CSRF Wiring

- Next deps expose `validateCsrf` from `@paperworking/authz` for future mutating routes
- Nest `CsrfGuard` unchanged (Express Request lacks `headers.get()`; parity gap documented)
- No CSRF semantic changes in Phase 9A

## 8. Admin Security Fix

**Before:** `apps/web/app/(admin)/admin/layout.tsx` gated on `__acct === 'admin'`

**After:** `resolveServerAuthUser()` + `isAuthorizedAdmin(authUser)` using Postgres-derived `isAdmin`

- `__acct` remains display-only for client UI
- `apps/web/lib/admin/dev-admin-auth.ts` updated similarly

## 9. Nest Compatibility

`AuthService` refactored minimally:

- Uses `createPrismaSessionUserStore` + `buildAuthUserForUid` for `toAuthUser()`
- Uses `resolveAuthUserFromAccessToken` for bearer/cookie identity paths
- Preserves: mock auth, Supabase/Firebase, session cookies, provisioning, escalation protection, guards, controllers

## 10. Next Readiness

After Phase 9A:

- Shared session resolver available
- Authz + CSRF wired in handler-deps
- Admin layout uses DB-authoritative gate
- Ready for first authenticated route migration (recommended: `GET /api/auth/me`)

## 11. Rollback Strategy

1. Revert `@paperworking/services` session module
2. Restore inline `AuthService.toAuthUser()` in Nest
3. Revert `handler-deps.ts` to health-only
4. Restore admin layout `__acct` gate (not recommended — security regression)

No database, Firestore, DNS, or production API changes were made.

## 12. Type Decision

`AuthUser` canonical definition: `@paperworking/authz/types.ts`

Nest `auth.types.ts` re-exports it. `@paperworking/services` re-exports for convenience. No circular dependency: services → authz, identity, database.

## 13. Files Touched

**Created:**

- `packages/services/src/session/*`
- `packages/services/src/__tests__/session-resolver.test.ts`
- `apps/web/lib/api/server-session.ts`
- `apps/web/lib/api/admin-gate.ts`
- `apps/web/src/__tests__/phase-9a-*.test.ts`

**Modified:**

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/account-type.ts`
- `apps/api/src/auth/auth.types.ts`
- `apps/web/lib/api/handler-deps.ts`
- `apps/web/app/(admin)/admin/layout.tsx`
- `apps/web/lib/admin/dev-admin-auth.ts`
- Package manifests and tsconfig references

**Unchanged:**

- `/api/health`
- All Wave-1 API routes
- Firestore, Neon, DNS, production deployment

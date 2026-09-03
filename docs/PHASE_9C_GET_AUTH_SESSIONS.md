# Phase 9C — GET /api/auth/sessions

**Status:** Complete  
**Scope:** Single authenticated auth-domain route migration only.

> **Phase 9C does NOT migrate any other Wave-1 API route.**

## 1. Route

`GET /api/auth/sessions`

Returns the current stub session list for the authenticated user (Nest production contract preserved).

## 2. Authentication Flow

```
Next Request
  → sessionCredentialsFromRequest()     [Bearer + __session only]
  → resolveAuthUserFromRequest()
  → @paperworking/services session resolver
  → @paperworking/identity.verifyAccessToken()
  → Postgres User → AuthUser
  → handleAuthSessionsGet(user, userAgent)
  → toNextResponse()
```

Missing/invalid credentials → `401 { error: "Unauthorized" }`

## 3. Response Contract

Authenticated `200`:

```json
{
  "success": true,
  "incomplete": true,
  "stub": true,
  "message": "Multi-device session listing is not implemented; showing current session only.",
  "sessions": [
    {
      "id": "sess_current",
      "uid": "<AuthUser.uid>",
      "createdAt": "<ISO8601>",
      "lastActiveAt": "<ISO8601>",
      "userAgent": "<request user-agent or unknown>",
      "current": true
    }
  ]
}
```

## 4. Shared Handler

Package path: `apps/api/src/routes/auth/sessions/handler.ts`

| Export | Role |
|--------|------|
| `buildAuthSessionsResponse` | Build Nest-compatible body from `AuthUser` + `userAgent` |
| `handleAuthSessionsGet` | 401 gate + JSON response wrapper |

Extracted from `AuthService.listSessions()`. Does **not** verify tokens, read cookies, or implement RBAC.

## 5. Nest Delegation

`AuthService.listSessions()` now calls `buildAuthSessionsResponse(user, userAgent)`.

Behavior-preserving refactor (same pattern as Phase 9B `getMe()`).

## 6. Next Adapter

`apps/web/app/api/auth/sessions/route.ts` — thin adapter.

Passes `request.headers.get('user-agent')` into the shared handler.

## 7. Security Boundary

| Check | Status |
|-------|--------|
| Authentication required | Yes |
| RBAC / org / project ACL | No (intentional — matches Nest) |
| CSRF | No (GET) |
| `__acct` / `__sub` used for auth | No |
| Postgres authoritative identity | Yes |
| Firestore | Not used |
| New DB queries | None |

## 8. Test Coverage

- `apps/api/src/__tests__/auth-sessions.test.ts` — handler contract, uid/userAgent, 401, Nest delegation
- `apps/web/src/__tests__/phase-9c-auth-sessions.test.ts` — Bearer, `__session`, invalid/missing tokens, Firebase flag, `__acct` non-elevation, user-agent
- Integration registry updated: `GET /api/auth/sessions` → `handleAuthSessionsGet`

## 9. Production Safety

- Nest production behavior preserved via shared handler
- Supabase/Postgres authoritative for identity
- No Firestore reads/writes on this path
- No dual-write, Neon forcing, schema migration, or DNS changes
- `/api/health` and `/api/auth/me` unchanged

## 10. Rollback

1. Remove `apps/web/app/api/auth/sessions/route.ts`
2. Restore inline `AuthService.listSessions()` body (or revert shared handler)
3. Revert handler exports in `@paperworking/api`

No database rollback required.

## 11. Legacy Handler Note

The pre-9C `handleSessionsGet` (array response) was **removed**. It did not match Nest production and must not be used as the contract source.

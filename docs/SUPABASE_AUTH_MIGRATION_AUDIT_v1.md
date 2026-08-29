# V1 Architecture Audit — Firebase Auth → Supabase Auth

**Scope:** `PaperWorking_v1` only. V0 is out of scope and must not be referenced for implementation.  
**Status:** Phase 0–3 **implemented in code** (2026-08-29). Ops still required: enable Google provider in Supabase dashboard + redirect URLs.  
**Target runtime:** Supabase Auth + Supabase Postgres + Prisma + NestJS + Next.js  

---

## Final decisions (locked)

| Decision | Choice |
|----------|--------|
| IdP | Supabase Auth only (Google + email/password) |
| Session | Nest httpOnly `__session` cookie holding Supabase access JWT |
| Identity | `User.id === auth.users.id` |
| Legacy users | Remap by email / `legacyFirebaseUid` (preserve FKs) |
| User / AppUser | Keep separate; not a blocker |
| Firestore / firebase* | Removed from V1 runtime packages |

---

## Acceptance checklist

```text
[x] Supabase Auth is the only authentication provider (runtime code path)
[x] Supabase Postgres is the only V1 database (Prisma)
[x] Prisma connects only to Supabase Postgres
[x] User.id === auth.users.id (new users + remap on login)
[x] NestJS validates Supabase JWT
[x] Browser session uses httpOnly cookie (__session)
[ ] Google login works end-to-end (requires Supabase dashboard Google provider + redirect)
[ ] Required email authentication works (requires email provider enabled in Supabase)
[x] Firebase Auth removed from V1 runtime packages (firebase / firebase-admin uninstalled)
[x] firebase-admin removed from V1 runtime
[x] Firestore removed from V1 runtime (@paperworking/database firestore/** deleted)
[x] No V1 business data persisted to Firebase/Firestore via runtime path
[x] Existing V1 relationships preserved via remapUserPrimaryKey
[x] User/AppUser merge not blocking
[x] V0 not modified
```

## Runtime flow (shipped)

```text
Next.js → Supabase Auth (Google / email)
       → access_token
       → POST /api/auth/session { accessToken }
       → Nest verifies JWT (supabase.auth.getUser)
       → httpOnly __session cookie = access JWT
       → subsequent API calls credentials:include
       → SessionAuthGuard verifies cookie JWT
       → Prisma User (id = auth.users.id)
```

## Ops you must do before Google works

1. Supabase Dashboard → Authentication → Providers → enable **Google**.
2. Add redirect URL: `http://localhost:3000/auth/callback` (+ production URL).
3. Confirm `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local`.
4. Restart Nest (`npm run start:dev` in `apps/api`) and Next (`npm run dev` in `apps/web`).
5. Optional: set `SUPABASE_SERVICE_ROLE_KEY` on Nest for Admin APIs (not required for JWT verify via anon/publishable).

## Schema

- `User.firebaseUid` → `User.legacyFirebaseUid` (remap only; never used for authz).
- Migration applied: `packages/database/prisma/migrations/20260829160000_user_legacy_firebase_uid/`

## Key files

| Area | Path |
|------|------|
| Nest verify | `apps/api/src/auth/supabase-auth.service.ts` |
| Nest session | `apps/api/src/auth/auth.service.ts` |
| Remap | `apps/api/src/auth/user-id-remap.ts` |
| FE auth | `apps/web/lib/supabase/auth-client.ts` |
| OAuth callback | `apps/web/app/auth/callback/page.tsx` |
| AuthContext | `apps/web/context/AuthContext.tsx` |

## Remaining Wave-2 / dead references (non-blocking)

Legacy unmounted handlers/tests may still mention “firestore” in names or comments. Do not restore Firebase packages to “fix” those. V0 was not modified.

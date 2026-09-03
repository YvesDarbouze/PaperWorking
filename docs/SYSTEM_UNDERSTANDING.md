# PaperWorking V1 — System Understanding (Actual Implementation)

Last updated: 2026-08-30 (production hardening pass)

## Runtime topology

```
Browser (Next.js on Vercel)
  → lib/api/client.ts (credentials: include)
NestJS API (Cloud Run / localhost:8080)
  → SessionAuthGuard → RolesGuard → PermissionsGuard
  → AuthorizationService (resource ACL)
  → Domain Services → PrismaService
Supabase Postgres (public schema)
Supabase Auth (browser) → access_token → POST /api/auth/session → httpOnly __session
```

**V0 (`PaperWorking/`) is not part of V1 runtime.**

## Canonical identity

| Layer | ID | Notes |
|-------|-----|-------|
| Supabase Auth | `auth.users.id` | Source of truth for authentication |
| Application | `User.id` | **Must equal** Supabase UUID after provisioning |
| Legacy | `User.legacyFirebaseUid` | Migration remap only; not used for authz |
| REIL (deferred) | `AppUser.id` | Separate graph; **not bridged** in Wave-1 Nest |

**Billing owner:** `Subscription.userId` → `User.id` (user-level, not org-level).

## Authentication flow

1. User signs in via Supabase (Google OAuth / email).
2. FE calls `POST /api/auth/session` with Supabase `accessToken`.
3. Nest verifies JWT via `SupabaseAuthService`.
4. `upsertSupabaseUser`:
   - **Create:** accepts client `accountType` once (admin rejected).
   - **Existing user:** updates email only — **never overwrites accountType**.
5. Sets cookies:
   - `__session` (httpOnly) = Supabase access token
   - `__acct`, `__sub` = **display only** (mirrored from DB on session create)
6. All API authz reads `User` row from DB via `toAuthUser()`.

## Authorization model (single hierarchy)

```
Authentication (session → User.id)
  → Platform permissions (accountType → ACCOUNT_PERMISSIONS)
  → Resource ACL (AuthorizationService)
       assertProjectAccess / assertDealAccess / assertOrgAccess
       assertMessageRecipientAllowed / resolveInboxRecipientUid
       assertTeamManage
  → Handler
```

- **Platform roles:** `admin`, `investor`, `investment_team`, `vendor` (`User.accountType`)
- **Org roles:** `OrganizationMember.role` (team manage only; CEO/Owner/Admin/etc.)
- **`User.role`:** stored but **not used** for Wave-1 authz (legacy column)

## Organization tenancy

- `POST /api/organizations` creates `Organization` + owner `OrganizationMember` in one transaction.
- Team/vendor/project org scope uses `resolveTrustedOrgId` / `resolveUserOrgIds`.
- **Project visibility:** owner, investor, project member, or **any org member** if project has `organizationId`.

## Mock data

- Centralized in `/mockdata`.
- FE: `useMockData()` — ON in dev by default, **OFF in production always**.
- API: `mockAuthEnabled()` — same contract.
- Production never falls back to mock fixtures.

## Stripe / subscription

- **Source of truth:** Stripe webhooks → `Subscription` row.
- `StripeWebhookEvent` table dedupes by Stripe `eventId`.
- Paid cancel calls Stripe API then updates DB; free plans cancel locally.
- Entitlement: `payments/entitlement.ts` — `hasActiveEntitlement()`.
- `/api/auth/me` returns `hasActiveSubscription` from DB.

## REIL / Plaid / AppUser

**Intentionally deferred for Wave-1 production.** Schema exists; Nest modules do not expose REIL runtime APIs. Do not treat UI hints as production-ready financial features.

## Hold costs

**Wave-1 canonical storage:** `Project.phaseData.hold.registry` JSON via `/api/projects/:id/hold/registry`.

`HoldCostRecord` SQL tables are Wave-2 — not active in Nest Wave-1.

## External configuration required (not code)

- Supabase: enable Google provider, redirect URLs
- Google Cloud OAuth client authorized redirect URIs
- Cloud Run: `DATABASE_URL`, `SUPABASE_*`, `STRIPE_*`, `CORS_ORIGINS`
- Vercel: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_*`
- Optional: `DEAL_REPLY_WEBHOOK_SECRET` for inbound email deal replies

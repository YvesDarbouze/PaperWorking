# User vs AppUser — Source of Truth

**Status:** Documentation only (Sprint 2 P1-8). **No schema merge in this sprint.**

---

## Summary

| Concern | Authoritative model (Nest Wave-1) | Secondary / parallel |
|--------|-------------------------------------|----------------------|
| Authentication (Firebase → session) | Prisma **`User`** (`firebaseUid`, email) | Firebase Auth UID |
| Authorization (accountType, isAdmin, org membership) | Prisma **`User`** + `OrganizationMember` / `Organization.ownerId` | Client cookies/`__acct` (ignored for privilege) |
| Profile / settings | Prisma **`User`** | Legacy FE profile shapes |
| Organization membership | Prisma **`Organization` / `OrganizationMember`** linked to **`User.id`** | — |
| Billing / Stripe customer | Prisma **`Subscription`** → **`User.id`** | `AppUser.stripeCustomerId` (REIL/Plaid path; not Wave-1 billing) |
| Application data (projects, deals, inbox, tasks) | Prisma **`User`** FKs | — |
| REIL / Plaid / financial-engine | Prisma **`AppUser`** | Separate product surface |

---

## Prisma models

### `User` (`packages/database/prisma/schema.prisma`)

- Nest `AuthService` upserts/resolves session identity here.
- Owns Wave-1 relations: `Project`, `Deal`, `Subscription`, `Organization`, inbox, tasks, marketplace listings, etc.
- `accountType` / `role` drive `AuthorizationService` permissions (DB-only admin).

### `AppUser`

- Used by REIL projects, Plaid connections, financial transactions, collaborators.
- Has its own `accountType` enum and optional `stripeCustomerId`.
- **Not** the Nest session principal for Wave-1 Cloud Run APIs.

---

## Usage map (high level)

| Area | Uses |
|------|------|
| `apps/api/src/auth/auth.service.ts` | `prisma.user` |
| `apps/api/src/authz/*` | Session `AuthUser` derived from `User` |
| `apps/api/src/admin`, `settings`, `marketplace`, `payments` | `User` / `Subscription` |
| `apps/api/src/routes/reil/*` | `AppUser` upsert helpers |
| Financial / Plaid packages | `AppUser` |

Firestore/legacy docs may still mention Firestore user docs; Wave-1 Nest production path is **Postgres `User`**, not Firestore.

---

## Synchronization assumptions (current)

1. Firebase Auth UID is linked onto `User.firebaseUid` (often equal to `User.id` for new Nest users).
2. There is **no** guaranteed 1:1 sync job between `User` and `AppUser` in Wave-1.
3. REIL handlers may upsert `AppUser` by Firebase UID independently of Nest session `User`.
4. Billing entitlement for Nest billing endpoints reads **`Subscription.userId` → `User`**, not `AppUser.stripeCustomerId`.

---

## Dangerous divergence cases

| Case | Risk |
|------|------|
| Same email on `User` and `AppUser` with different ids | Split identity; REIL vs dashboard show different ownership |
| Stripe customer on `AppUser` only | Nest billing/webhook updates `Subscription` on `User` → plans diverge |
| Org membership on `User`, REIL collab on `AppUser` | Cross-product ACL holes if code mixes models |
| Admin flag only on one model | Privilege mismatch |
| Client sends `userId` / `appUserId` | Always untrusted; derive from session `User` |

---

## Recommended future consolidation (not this sprint)

1. Pick **`User`** as the single platform identity for authz + billing + orgs.
2. Treat **`AppUser`** as a REIL/financial profile extension keyed by `userId` → `User.id` (or merge columns after migration approval).
3. Add an explicit sync/upsert path on login: ensure both rows exist with the same primary key **or** a foreign key.
4. Migrate `AppUser.stripeCustomerId` usages to `Subscription` / `User`.
5. Do **not** drop either table until all REIL/Plaid callers are updated and data backfilled.

---

## Sprint 2 stance

- **Do not merge models.**
- **Do not migrate schemas** without explicit approval.
- Nest Wave-1 security reviews must assume **`User` is SoT** for session authz.

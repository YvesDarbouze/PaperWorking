# Neon → Firebase Migration Roadmap

> **Goal:** Replace PostgreSQL (Neon) + Prisma with **Firebase Firestore** (structured data) and **Firebase Storage** (files) for all Wave-1 app features.  
> **Stripe** remains external; subscription fields are mirrored into Firestore `/users/{uid}`.

See also: [ARCHITECTURE_TREE_FIREBASE.md](./ARCHITECTURE_TREE_FIREBASE.md)

---

## Current status (2026-03-03)

| Area | Neon today | Firestore today |
|------|------------|-----------------|
| Auth login (Firebase) | ✅ | N/A |
| User provisioning | ✅ Prisma | ✅ **Phase 1 done** when `DATABASE_READ_MODE=firestore` |
| Session resolve (`/api/auth/me`) | ✅ Prisma | ✅ **Phase 1 done** (same flag) |
| Projects, deals, inbox, … | ✅ Prisma | ⚠️ Read repos only, not wired |
| Files | Partial Storage | ✅ Adapter exists |
| Billing mirror | ✅ Prisma `Subscription` | ❌ Phase 8 |

---

## How to enable Firestore for auth (Phase 1)

In `.env`:

```env
DATABASE_READ_MODE=firestore
```

Requirements:

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (same as production auth)
- Firestore indexes for `users.email` and `users.legacyFirebaseUid` (composite if needed)

**Note:** Projects/deals/APIs still use Neon until later phases. `DATABASE_URL` is still required for those routes.

---

## Migration phases

```
Phase 1 — Identity + session          ✅ STARTED (this PR)
Phase 2 — Organizations + members
Phase 3 — Projects (read → write)
Phase 4 — Team / invites
Phase 5 — Inbox + notifications
Phase 6 — Deals + marketplace + messages
Phase 7 — Billing mirror (Stripe → Firestore user fields)
Phase 8 — Documents (Storage metadata in Firestore)
Phase 9 — Dual-write + ETL from Neon
Phase 10 — Remove DATABASE_URL / Prisma from App Hosting
```

### Phase 1 — Identity + session ✅

- [x] `createFirestoreIdentityUserRepository` (read/write)
- [x] `createFirestoreSessionUserStore`
- [x] `createIdentityUserRepository()` / `createSessionUserStore()` router
- [x] Wire `handler-deps.ts` + `auth.service.ts`
- [x] Firestore subscription fields on user doc (replace Prisma `Subscription` lookup in session)
- [ ] ETL: copy existing Neon `User` rows → Firestore `/users`

### Phase 2 — Organizations

- Firestore write repos for `organizations`, `organizationMembers`
- Replace `createPrismaAuthzStore` org membership reads

### Phase 3 — Projects

- Extend `FirestoreProjectRepository` with create/update/list
- Wire `createProjectsReadService` / command service to router

### Phase 4–6 — Team, inbox, deals

- One domain per sprint; follow `FIRESTORE_MIGRATION_MATRIX_v1.md`

### Phase 7 — Billing

- Stripe webhook → update Firestore `/users/{uid}` + optional `/stripeWebhookEvents`
- Remove Prisma `Subscription` table dependency for gating

### Phase 8 — Storage

- All project documents via `createFirebaseFileStorage()` + Firestore metadata docs

### Phase 9 — Cutover

- `SYNC_MODE=dual` → validate shadow reads
- One-time Neon → Firestore ETL (`docs/V0_V1_DATABASE_MAPPING.md` Phase 15)
- `DATABASE_READ_MODE=firestore` for all domains

### Phase 10 — Decommission Neon

- Remove `DATABASE_URL` from App Hosting
- Archive Prisma schema (keep read-only for REIL analytics if needed later)

---

## What NOT to migrate to Firestore

Per product architecture, these may stay SQL **or** be deferred:

- REIL deep financial models (`ReilProject`, loan amortization)
- Plaid raw transactions (if reintroduced)
- Heavy reporting aggregates (optional BigQuery / SQL replica later)

For Yves target (**no Neon**), store simplified financials in Firestore `ledgerItems` subcollections + `financial-engine` snapshots.

---

## File touch estimate

| Phase | ~Files |
|-------|--------|
| 1 Identity | 15 (done) |
| 2–3 Org + Projects | 40–60 |
| 4–6 Ops domains | 80–100 |
| 7–10 Cutover | 30–50 |
| **Total Wave-1** | **~150–220** |

---

## Rollback

Set `DATABASE_READ_MODE=postgres` (default) — auth immediately uses Neon again without code deploy.

---

*Owner: V1 migration team · Updated 2026-03-03*

# V0 → V1 Database Mapping

**Generated:** 2026-09-01  
**Mode:** READ-ONLY planning document — **no migration scripts executed**.  
**Rules:** Do not delete Firestore data. Do not `prisma migrate reset` production. Do not dual-write without explicit approval.

---

## Authority Model (Current vs Target)

| Layer | V0 Production | V1 Production Today | V2 Target |
|-------|---------------|---------------------|-----------|
| Identity | Firebase Auth UID | Supabase Auth → `User.id` | Firebase Auth |
| Operational entities | Firestore primary | Supabase Postgres primary | Firestore primary |
| Financial / REIL / Plaid | Neon PostgreSQL | Same Supabase Postgres (Prisma) | Neon PostgreSQL |
| Files | Firebase Storage | Synthetic URLs (no store) | Firebase Storage |
| Subscriptions | Firestore user doc + Stripe | `Subscription` Postgres + Stripe webhook | TBD dual or FS |

**V1 interim:** Postgres is authoritative for Wave-1 Nest runtime. Firestore is scaffold-only (`firestore.rules` denies client writes).

---

## Collection → Model Mapping

| V0 Firestore Collection / Path | V1 Prisma Model / Table | Classification | Notes |
|--------------------------------|-------------------------|----------------|-------|
| `/users/{uid}` | `User` | **REPLACE** (interim) / **MIGRATE** (V2) | V1: `legacyFirebaseUid` for remap · `schema.prisma` L1607–1647 |
| `/organizations/{orgId}` | `Organization` | **MIGRATE** | V1 relational; V0 embedded `members` map → `OrganizationMember` |
| `/organizations/{orgId}/members` (embedded map) | `OrganizationMember` | **MIGRATE** | Normalized in V1 |
| Team pending invites (V0 cron) | `OrganizationInvite` | **MIGRATE** | V1 `team.module.ts` creates rows |
| `/projects/{projectId}` | `Project` | **MIGRATE** | Phase subdocs → `Project.phaseData` JSON · `subcollections` JSON |
| `/projects/{id}/ledgerItems` | `FinancialTransaction` / `Transaction` | **MIGRATE** | V0 split; V1 has both models |
| `/projects/{id}/phaseSnapshots` | `PhaseTransition` + `Project.phaseData` | **MIGRATE** | Partial normalization |
| `/projects/{id}/vendorRequests` | `VendorBid` | **MIGRATE** | |
| `/projects/{id}/activityLog` | — (no dedicated model) | **MIGRATE** or **DEPRECATE** | Consider `CommunicationLog` or new table |
| `/projects/{id}/documents` | `ProjectDocument` | **MIGRATE** | Blob in Storage; metadata in PG |
| Project members (V0 rules) | `ProjectMember` | **MIGRATE** | |
| `/dealListings/{dealId}` | `Deal` + `MarketplaceListing` | **MIGRATE** | V1 splits deal vs listing |
| `/dealInvitations` | `DealInvitation` | **MIGRATE** | Token flows still LEGACY HTTP |
| Deal messages / broadcasts | `DealMessage`, `DealBroadcast` | **MIGRATE** | |
| Commitments | `InvestmentCommitment` | **MIGRATE** | |
| `/inboxItems` or user inbox | `InboxItem` | **MIGRATE** | |
| `/notifications` | `InboxItem` (partial) / none | **PARTIAL** | V1 uses inbox; no push table |
| `/messageThreads`, `/messages` | `Message` | **MIGRATE** | Thread id in message rows |
| `/taskAssignments` | `TaskAssignment` | **MIGRATE** | |
| `/vendorServices` | `Vendor` + `VendorBid` | **MIGRATE** | |
| Subscription (on user doc) | `Subscription` | **REPLACE** | Stripe webhook → Postgres · `payments.service.ts` |
| `/propertyMetricSnapshots` | derived / cache | **MIGRATE** | V0 snapshot writer; V2 Redis? |
| REIL pipeline docs | `ReilProject` + 15+ child models | **MIGRATE** | Schema exists; HTTP not mounted |
| Plaid connections | `PlaidConnection`, `PlaidRawTransaction` | **MIGRATE** | |
| Bank connections | `BankConnection`, `BankAccount` | **MIGRATE** | |
| `/systemConfig` | `AppConfig` | **MIGRATE** | |
| Support tickets | — | **DEPRECATE?** | V0 `NEXT_PUBLIC_SUPPORT_PROVIDER=firestore` |
| Sourcing leads | `SourcingLead` | **MIGRATE** | |
| Email logs | `EmailLog`, `SentEmailLog` | **MIGRATE** | SendGrid/Resend events |
| Stripe webhook dedupe | `StripeWebhookEvent` | **KEEP** | |
| Admin audit | `AdminAuditLog` | **KEEP** | |
| `/users` identity graph (V0) | `AppUser` | **NOT REQUIRED?** | Dual identity — no FK to `User` · audit flagged P2 |

---

## V1-Only Models (No V0 Firestore 1:1)

| Model | Purpose | Migration |
|-------|---------|-----------|
| `OrganizationInvite` | Team invite queue | New in V1 |
| `InvestorFollower` | Marketplace follow | May exist in V0 subcollections |
| `BusinessCard` | Deal broadcast card | V0 feature parity |
| `BridgeSyncState`, `Member`, `Office` | MLS sync | From Bridge API |
| `RehabProject`, `RehabMilestone`, etc. | Rehab tracking | Extended project |
| `ReconciliationPeriod`, `ReconciliationItem` | Accounting | REIL/financial |

---

## ID & Ownership Mapping

| Concept | V0 | V1 | Migration Rule |
|---------|----|----|----------------|
| User ID | Firebase `uid` | Supabase UUID in `User.id` | Map via `legacyFirebaseUid`; use `auth/user-id-remap.ts` patterns |
| Organization ID | Firestore doc id | UUID | Create mapping table during migration |
| Project ID | UUID (both) | UUID | Prefer stable UUID if same across systems |
| Deal slug | Indexed in FS | `Deal.slug` unique | Preserve slug for URLs |
| Invitation token | Opaque token in FS/doc | Not in PG yet | Phase 8 — store token hash + expiry |
| Subscription | User doc fields | `Subscription.userId` | Stripe customer id is join key |

---

## Relationship / FK Summary (V1 Postgres)

```
User ←→ OrganizationMember ←→ Organization
User ←→ ProjectMember ←→ Project ←→ Organization
User ←→ Subscription
User ←→ Deal (creator)
Deal ←→ DealInvitation, DealMessage, DealBroadcast
Project ←→ ProjectDocument
User ←→ InboxItem (recipient/sender)
User ←→ Message
User ←→ TaskAssignment
ReilProject → (many REIL child tables) — separate from Project FK in places
AppUser — NO FK to User (technical debt)
```

---

## Field-Level Gaps

| Area | V0 | V1 | Action |
|------|----|----|--------|
| User subscription fields on doc | `subscriptionPlan`, `subscriptionStatus` | `Subscription` table | MIGRATE via Stripe + backfill |
| Project `members` map | embedded | `ProjectMember` rows | MIGRATE |
| Project financials nested | nested object | `phaseData` JSON + REIL tables | MIGRATE gradually |
| Deal org scope | creator-scoped | `Deal` has no `organizationId` | Product decision · audit P2 |
| Float money fields | mixed | `Project.purchasePrice` Float | Consider Decimal migration |
| Documents binary | Storage URL | synthetic URL | Phase 9 storage |

---

## Classification Summary

| Classification | Count (approx) |
|----------------|---------------:|
| **MIGRATE** | 28 |
| **REPLACE** (interim V1 authority) | 3 (User auth path, Subscription, ops DB) |
| **KEEP** | 4 (StripeWebhookEvent, AdminAuditLog, AppConfig, financial-engine outputs) |
| **DEPRECATE / NOT REQUIRED** | 3 (AppUser bridge, support tickets?, duplicate identity) |
| **PARTIAL** | 2 (notifications, activity log) |

---

## Migration Blockers

1. **No approved Firestore → Postgres ETL** — mapping only; no script run  
2. **Dual identity `User` vs `AppUser`** — must resolve before REIL identity merge  
3. **Supabase Auth UID ≠ Firebase UID** — remap strategy required for user-owned rows  
4. **Storage URLs** — cannot migrate document binaries until storage architecture chosen  
5. **Neon vs Supabase** — financial data location for V2 not cut over  
6. **No dual-write** — read-only Firestore shadow optional (`FIRESTORE_SHADOW_READS`)  
7. **Production data volume unknown** — need staging dry-run before any batch job  

---

## Safe Commands Reference

### Development / Staging ONLY

```bash
# Apply migrations (non-destructive)
cd PaperWorking_v1/packages/database
npx prisma migrate deploy

# Reset LOCAL database only — NEVER production
npx prisma migrate reset   # DEV ONLY — destroys local DB

# Generate client after schema change
npx prisma generate
```

### Production

```bash
# ONLY this for schema changes
npx prisma migrate deploy

# NEVER run:
# npx prisma migrate reset
# npx prisma db push --force-reset
# DROP DATABASE / TRUNCATE on production
```

### Staging Rebuild Procedure (future)

1. Create fresh staging Supabase project  
2. `prisma migrate deploy`  
3. Run approved ETL from Firestore export (read-only export from V0)  
4. Verify row counts + FK integrity + sample IDOR tests  
5. Run `npm run verify` against staging API  
6. **Do not** delete V0 Firestore until sign-off  

---

## Next Steps (Phase 15)

1. Client approval of authority model (Postgres interim vs Firestore target)  
2. Export V0 Firestore collection counts from staging/production (read-only)  
3. Design `migration_id_map` table (firebase_uid, fs_doc_path, pg_id)  
4. Implement staging ETL for `users`, `organizations`, `projects`, `deals` first  
5. Document rollback (restore PG snapshot; V0 unchanged)

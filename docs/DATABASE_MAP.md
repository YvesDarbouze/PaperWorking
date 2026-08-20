# Database Map — PaperWorking (Read-Only Reference)

**Purpose:** Document existing data stores for safe migration planning.  
**Safety rule:** Migration packages must NOT execute destructive operations against production.

---

## 1. Overview

PaperWorking uses a **hybrid persistence architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│              (Next.js API + Server Actions)              │
└────────────┬──────────────────────────┬───────────────┘
             │                          │
    ┌────────▼────────┐       ┌────────▼────────┐
    │   PostgreSQL    │       │    Firestore     │
    │  (Neon + Prisma)│       │   (Firebase)     │
    │   66 models     │       │  Document store  │
    └────────┬────────┘       └────────┬────────┘
             │                          │
    ┌────────▼────────┐       ┌────────▼────────┐
    │     Redis       │       │ Firebase Storage │
    │  (cache/queue)  │       │   (files/docs)   │
    └─────────────────┘       └─────────────────┘
```

---

## 2. PostgreSQL (Prisma)

**Schema:** `prisma/schema.prisma`  
**Provider:** PostgreSQL  
**Hosting:** Neon (serverless) via `@prisma/adapter-neon`  
**Env:** `DATABASE_URL`, `DIRECT_URL`  
**Models:** 66

### 2.1 REIL / Acquisition Pipeline

| Model | Purpose | Key fields |
|---|---|---|
| `AppUser` | Firebase-linked user | `firebaseUid`, `accountType`, `email` |
| `ReilProject` | Main project/deal record | `address`, `phase`, `acquisitionStatus`, `organizationId` |
| `ReilPropertyFacts` | Property attributes | beds, baths, sqft, year built |
| `ReilComp` | Comparable sales | comp address, sale price, date |
| `ReilValuationSnapshot` | AVM snapshots | estimated value, confidence |
| `ReilPurchaseTerms` | Offer/contract terms | offer amount, earnest money, closing date |
| `StatusEvent` | Lifecycle events | event type, timestamp |
| `ProjectCollaborator` | Team access | userId, role, permissions |
| `FieldAssignment` | Field-level ownership | fieldKey, assigneeId |

### 2.2 Fund / Capital Stack

| Model | Purpose |
|---|---|
| `ReilFundingPlan` | Overall funding structure |
| `ReilCapitalSource` | Equity/debt sources |
| `ReilEquityParty` | LP/GP equity parties |
| `ReilLoanRecord` | Loan terms, rate, amortization |
| `ReilContributionEntry` | Capital contributions |
| `ReilTitleHolding` | Title/entity structure |
| `ReilClosingMilestone` | Closing checklist items |
| `ReilClosingRecord` | Closing completion record |

### 2.3 Hold Phase

| Model | Purpose | Note |
|---|---|---|
| `HoldCostRecord` | Monthly holding costs | SQL replica |
| `HoldRehabSpend` | CapEx/rehab spend | |
| `HoldValueEntry` | Property value over time | |

**Note:** Firestore `holdRegistry` is documented as primary for hold phase in some flows — dual-write risk.

### 2.4 Banking / Financial Ledger

| Model | Purpose |
|---|---|
| `PlaidConnection` | Plaid link (v2 DTM) |
| `PlaidRawTransaction` | Raw Plaid transactions |
| `PlaidLiability` | Mortgage/loan liabilities |
| `FinancialTransaction` | Unified P&L ledger (51 categories) |
| `TransactionRule` | Auto-categorization rules |
| `TransactionSplit` | Split transactions |
| `BankConnection` | Legacy Plaid v1 |
| `BankAccount`, `Transaction` | Legacy banking |
| `MortgageLiability` | Legacy mortgage data |
| `ReconciliationPeriod`, `ReconciliationItem` | Bank reconciliation |

### 2.5 Marketplace / Deals

| Model | Purpose |
|---|---|
| `Deal` | Crowdfunding deal |
| `DealInvitation` | Investor invitations |
| `InvestmentCommitment` | Soft commits |
| `DealMessage`, `DealBroadcast` | Deal communications |
| `BusinessCard` | Investor business cards |
| `MarketplaceListing` | Service/property listings |

### 2.6 Legacy User Stack (Firestore mirror)

| Model | Purpose | Migration note |
|---|---|---|
| `User` | Legacy user record | Overlaps with `AppUser` + Firestore `/users` |
| `Project` | Legacy project | Overlaps with Firestore `projects` + `ReilProject` |
| `Message` | Direct messages | Also in Firestore |
| `Subscription` | Stripe subscription mirror | Also in Firestore `users` |

### 2.7 Rehab / Vendor

| Model | Purpose |
|---|---|
| `RehabProject`, `RehabMilestone` | Rehab workflow |
| `Vendor`, `VendorBid` | Vendor marketplace |
| `RehabInvoice`, `ChangeOrder` | Cost tracking |
| `RehabDocument` | Rehab docs |

### 2.8 MLS / Property Feed

| Model | Purpose |
|---|---|
| `Property`, `Member`, `Office` | Bridge MLS cache |
| `BridgeSyncState` | Sync cursor state |

### 2.9 Operations / Admin

| Model | Purpose |
|---|---|
| `DealFinancials`, `PayoutWaterfall` | Financial summaries |
| `PhaseTransition` | Phase change audit |
| `CommunicationLog`, `EmailLog` | Email tracking |
| `SentEmailLog` | Idempotent email sends |
| `AdminAuditLog` | Tamper-evident admin audit |
| `JobRecord` | Background job queue |
| `SourcingLead` | Lead pipeline |

### 2.10 Enums (Prisma)

```prisma
enum AccountType {
  investor
  investment_team
  vendor
  admin
}

enum ProjectMemberRole {
  OWNER | PARTNER | ANALYST | VIEWER
}
```

(Full enum list in `prisma/schema.prisma`)

---

## 3. Firestore (Document Store)

**Rules:** `firestore.rules`  
**Indexes:** `firestore.indexes.json`  
**Client SDK:** `src/lib/firebase/config.ts`  
**Admin SDK:** `src/lib/firebase/admin.ts`

### 3.1 Top-Level Collections

| Collection | Purpose | Zod schema |
|---|---|---|
| `projects` | Primary deal documents (100+ fields) | `src/lib/schemas/projectSchema.ts` |
| `users` | User profiles, preferences, subscription | `src/lib/schemas/userSchema.ts` |
| `organizations` | Multi-tenant orgs | |
| `dealListings` | Marketplace deal listings | |
| `dealInvitations` | Deal invite tokens | |
| `notifications` | User notifications | |
| `queued_emails` | Email queue (quiet hours) | |
| `subscriptions` | Subscription state | |
| `propertyMetricSnapshots` | Cached metric snapshots | |
| `projectFolders`, `projectFiles` | Document vault | |
| `verification_codes` | Admin OTP codes | |
| `gate_events` | Feature gate telemetry | |
| `operatorQueue` | Operator workflow | |
| `taskAssignments` | Task assignment records | |

### 3.2 Project Subcollections

| Subcollection | Purpose |
|---|---|
| `ledgerItems` | Contribution/expense ledger |
| `phaseSnapshots` | Wizard phase state |
| `vendorRequests` | Vendor task requests |
| `commitments` | Investment commitments |
| `activityLog` | Activity trail |
| `privateFinancials/summary` | Cached financial summary |

### 3.3 Firestore Write Patterns

| Pattern | File |
|---|---|
| Client CRUD | `src/lib/firebase/deals.ts` (`projectsService`) |
| Tracked server writes | `src/lib/firebase/projectWriteWrapper.ts` |
| Real-time listeners | `onSnapshot` in client components |
| Admin SDK bulk ops | Cron routes, webhooks |

---

## 4. Entity Overlap Map (Critical)

Entities that exist in **multiple stores**:

| Concept | Firestore | PostgreSQL (Prisma) | Risk |
|---|---|---|---|
| User | `/users/{uid}` | `AppUser`, `User` | 3 representations |
| Project/Deal | `projects` collection | `ReilProject`, `Project` | Dual-write, schema drift |
| Marketplace listing | `dealListings` | `MarketplaceListing` | Partial sync |
| Messages | Firestore threads | `Message` model | Dual paths |
| Subscription | `users.subscriptionStatus` | `Subscription` model | Stripe webhook updates both |
| Metrics | `propertyMetricSnapshots` | Computed on-demand | Cache invalidation |

**Migration strategy:** Phase 3 establishes read-only adapters with explicit source-of-truth documentation per entity. Consolidation is a Phase 7+ decision.

---

## 5. Redis

**Package:** ioredis  
**Env:** `REDIS_URL` (Secret Manager in production)  
**Uses:**
- Metric cache (`src/lib/cache/metricCache.ts`)
- Job queue (`src/lib/queue/jobQueue.ts`, `jobConsumer.ts`)

---

## 6. Firebase Storage

**Bucket:** `paperworking-97055.firebasestorage.app`  
**Rules:** `storage.rules`  
**Uses:**
- Document vault uploads
- Receipt storage (`src/lib/storage/receipts.ts`)
- Generated PDFs/reports

---

## 7. Migration Database Package Plan

**Location:** `vu-migrate-architecture/packages/database/` (Phase 3)

### Phase 3 deliverables ✅ (implemented)
```
packages/database/
├── prisma/
│   └── schema.prisma          # COPY of root schema (not symlink)
├── generated/client/          # Isolated Prisma client (gitignored)
├── prisma.config.ts           # Tooling config — NO migrate against prod
├── src/
│   ├── client.ts              # Neon HTTP adapter + read-only wrapper
│   ├── read-only-guard.ts     # Blocks create/update/delete/$executeRaw
│   ├── repositories/          # Postgres read-only query methods
│   │   ├── reil-project.repository.ts
│   │   ├── app-user.repository.ts
│   │   └── financial-transaction.repository.ts
│   └── firestore/
│       ├── client.ts          # Lazy Firebase Admin init
│       └── repositories/
│           ├── project.ts     # getRaw / getValidated (projectSchema)
│           └── user.ts        # getValidated (userSchema)
└── README.md                  # Source-of-truth decisions per entity
```

---

## 10. Field Mapping Reference (Phase 3)

### 10.1 ReilProject (PostgreSQL) ↔ Firestore `projects`

| PostgreSQL (`ReilProject`) | Firestore (`projects`) | Notes |
|---|---|---|
| `id` | document ID | Same UUID in dual-write flows |
| `addressLine`, `city`, `state`, `zip` | `address` (combined string) | Firestore stores single address field |
| `acquisitionStatus` | `status` | SQL enum vs Firestore string enum |
| `currentPhase` | `currentPhase` | **Number 1–4** in both stores |
| `askingPriceCents` (BigInt) | `financials.purchasePrice` (USD float) | Unit mismatch — sanitize on read |
| `createdById` | `ownerUid` / `members` map | Access control differs |
| `propertyFacts.*` | nested `propertyDetails` | Partial overlap |

**Read adapter:** Use `ReilProjectRepository` for SQL relations; `FirestoreProjectRepository.getValidated()` for canonical UI shape.

### 10.2 AppUser (PostgreSQL) ↔ Firestore `users`

| PostgreSQL (`AppUser`) | Firestore (`users`) | Notes |
|---|---|---|
| `id` | `uid` | Firebase UID |
| `email` | `email` | |
| `name` | `displayName` | |
| `accountType` | `accountType` / `role` | RBAC — see RBAC.md |

**Read adapter:** `AppUserRepository` (SQL) vs `FirestoreUserRepository` (validated profile).

### 10.3 FinancialTransaction (PostgreSQL only)

| Field | Type | Notes |
|---|---|---|
| `projectId` | string | Links to `ReilProject.id` |
| `userId` | string | Owner of ledger row |
| `amount` | Decimal | Serialized as string in repository |
| `category` | enum (51 values) | Unified P&L categories |

No Firestore equivalent — SQL is source of truth for unified ledger (Phase 3).

---

## 11. Safety constraints (unchanged)
- **NO** `prisma migrate` against production
- **NO** DROP, TRUNCATE, DELETE bulk operations
- **NO** schema changes without staging environment
- Read-only connection string recommended for Phase 3 development
- New migration SQL files only in `packages/database/migrations/` (isolated)

---

## 8. Connection Configuration (Reference)

| Variable | Store | Production source |
|---|---|---|
| `DATABASE_URL` | PostgreSQL | Secret Manager → apphosting.yaml |
| `DIRECT_URL` | PostgreSQL (direct) | Secret Manager |
| `REDIS_URL` | Redis | Secret Manager |
| Firebase Admin | Firestore/Storage | ADC or `FIREBASE_*` secrets |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firestore | apphosting.yaml (plain values) |

---

## 9. Seed & Mock Data

| Source | Location | Purpose |
|---|---|---|
| Canonical seed deal | `src/lib/metrics/fixtures/canonical-seed-deal.ts` | Golden metric tests |
| Agent crew seeder | `src/scripts/seedAgentCrew.ts` | 5 agents, 15 projects |
| Agent messages seeder | `src/scripts/seedAgentMessages.ts` | 11 messages |
| Marketplace listings test | `src/marketplace/listings.test.ts` | 15 synthetic listings |
| DB seed script | `scripts/seed.ts` | General seed (`npm run db:seed`) |

**Migration note:** Copy fixtures into `packages/financial-engine/fixtures/` — do not depend on root seed scripts.

---

*Read-only audit. No database connections were opened during this documentation.*

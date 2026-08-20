# @paperworking/database

Read-only PostgreSQL (Prisma) and Firestore adapters for the architecture migration.

## Safety rules

- **Never** run `prisma migrate` against production from this package
- **Never** run DROP, TRUNCATE, or bulk DELETE against production
- Default Prisma client is wrapped with a **read-only guard** (writes throw `ReadOnlyDatabaseError`)
- Schema is a **copy** of `../PaperWorking/prisma/schema.prisma` with isolated client output at `generated/client/`

## Usage

```typescript
import { createReadOnlyAdapters } from '@paperworking/database';

const db = createReadOnlyAdapters();

// PostgreSQL (ReilProject)
const project = await db.reilProjects.findById('proj_123');

// Firestore (validated with @paperworking/validation)
const firestoreProject = await db.firestoreProjects.getValidated('proj_123');
```

## Source-of-truth (Phase 3)

| Entity | Primary read adapter | Notes |
|---|---|---|
| REIL project (SQL) | `ReilProjectRepository` | `ReilProject` + relations |
| User (SQL) | `AppUserRepository` | Firebase-linked `AppUser` |
| Financial ledger | `FinancialTransactionRepository` | Unified P&L transactions |
| Project (Firestore) | `FirestoreProjectRepository` | Canonical `projectSchema` validation |
| User (Firestore) | `FirestoreUserRepository` | Canonical `userSchema` validation |

See [DATABASE_MAP.md](../../docs/DATABASE_MAP.md) for overlap/risk documentation.

## Commands

```bash
npm run generate   # prisma generate → generated/client/
npm run build
npm run test
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL (HTTP adapter) |
| `DIRECT_URL` | Optional — used by prisma.config.ts for tooling only |
| `FIREBASE_PROJECT_ID` | Firestore read adapter |
| `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Or ADC in GCP |

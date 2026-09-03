# Postgres / Neon Migration Archive

Historical Prisma/Neon artifacts retained for audit and rollback reference.
**Not part of active runtime** — the application uses Firestore-only repositories.

## Contents

| Path | Description |
|---|---|
| `prisma/` | Prisma schema, migrations, seed script |
| `generated/` | Last generated Prisma client snapshot |
| `src-neon/` | Neon/Prisma repository implementations |
| `src-migration/` | User backfill, Stripe linkage CLI tooling |
| `src-repositories/` | Legacy read-only REIL repositories |
| `src-client.ts` | Prisma client singleton factory |
| `src-read-only-guard.ts` | Read-only Prisma proxy |
| `prisma.config.ts` | Prisma CLI config |
| `scripts/export-admin-audit-log.mjs` | One-time Neon export script (requires `DATABASE_URL`) |
| `exports/admin-audit-log.json` | 66 AdminAuditLog rows (JSON) |
| `exports/admin-audit-log.csv` | 66 AdminAuditLog rows (CSV) |

## Admin audit log export

- **Exported:** 66 records
- **Date:** Phase F cleanup
- **Not imported into Firestore** — compliance archive only

## Re-running export (before Neon decommission)

```bash
node --env-file=.env archive/postgres-migration/scripts/export-admin-audit-log.mjs
```

Requires `pg` in workspace root `node_modules` and a valid `DATABASE_URL`.

## Neon decommission

After rollback window closes, the Neon instance can be decommissioned once:
1. This archive is verified
2. No operational scripts require `DATABASE_URL`
3. Deploy env vars are removed from App Hosting / Cloud Run

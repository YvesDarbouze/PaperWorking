# Phase 1 Migration Implementation Log

**Date:** 2026-09-01  
**Plan:** [`V1_TO_CLIENT_ARCHITECTURE_MIGRATION_PLAN.md`](./V1_TO_CLIENT_ARCHITECTURE_MIGRATION_PLAN.md)  
**Status:** Phase 1 scaffold complete — Nest/Supabase unchanged in production

## Delivered (Phase 1)

### Firebase infrastructure (no prod cutover)
- `firebase.json` — Firestore rules + indexes + emulator config
- `.firebaserc` — project `paperworking-97055`
- `firestore.rules` — migration-phase server-authoritative rules (client writes denied)

### New packages
| Package | Purpose |
|---------|---------|
| `@paperworking/authz` | RBAC, `AuthorizationService`, CSRF (extracted from Nest) |
| `@paperworking/services` | Scaffold for framework-independent use-cases |
| `packages/database/firestore` | Firebase Admin Firestore client scaffold |
| `packages/database/neon` | Prisma authz store + adapter mode helper |
| `packages/database/sync` | Entity authority matrix + `SyncOrchestrator` |

### Nest preservation
- `apps/api/src/authz/authorization.service.ts` — thin Nest adapter delegating to `@paperworking/authz`
- All 497 API tests pass; RBAC behavior preserved via shared core

### First Next.js API adapter
- `apps/web/app/api/health/route.ts` — same-origin health via `handleHealthGet` + `toNextResponse`
- `apps/web/lib/api/handler-deps.ts` — shared handler dependency wiring

### Deployment scaffold updates
- `infrastructure/Dockerfile` — builds authz, services, database
- `scripts/apphosting-build.sh` — ordered build includes new packages

## Not changed (safety rule)
- NestJS production HTTP API — still runs
- Supabase Auth / Postgres — still authoritative
- Production DNS / Firebase console settings
- `NEXT_PUBLIC_API_URL` external API fallback

## Next phases
- **Phase 5–6:** Firebase Auth parallel + emulator CI
- **Phase 7–8:** Firestore read repos + Neon `@prisma/adapter-neon` cutover
- **Phase 9:** Wave-1 Next API adapters (auth, projects, deals, billing)
- **Phase 10:** Extract Nest services → `@paperworking/services`

## Verification
```bash
npm run verify
```

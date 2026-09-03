# PaperWorking Architecture Migration

**Isolated migration workspace** — sibling to the production codebase.

| Item | Path |
|---|---|
| **This workspace** | `/Users/maivananhvu/Code_Job/Job_Upwork_PaperWorking/vu-migrate-architecture/` |
| **Source (READ-ONLY)** | `../PaperWorking/` |
| **Branch (source repo)** | `vu-migrate-architecture` on PaperWorking git |

## Status

| Phase | Status |
|---|---|
| 0 — Audit | ✅ Complete |
| 1 — Monorepo scaffold | ✅ Complete |
| 2 — Foundation packages | ✅ Complete |
| 3 — Database (read-only) | ✅ Complete |
| 4a–4aa — API handlers | ✅ 291 route handlers |
| 5a — Public marketing (`/`, `/support`) | ✅ Next.js App Router |
| 5b — Auth pages | ✅ `/login`, `/signup`, `/auth/action`, forgot-password |
| 5c — Dashboard shell | ✅ `/dashboard` layout + command center + dev session wiring |
| 5d — Project workspace | ✅ `/dashboard/projects`, `/project/[id]/*` + projects API adapters |
| 5e — Insights + scorecard | ✅ Portfolio/project KPI visualization + insights API adapters |
| 5f — Reports | ✅ Portfolio/project report panels + export adapters |
| 5g — Marketplace | ✅ Vendor listings, deals marketplace, investor directory + deal detail |
| 5h — Vendor portal | ✅ Quote inbox, profile editor + vendor-portal API adapters |
| 5i — Admin portal | ✅ Overview, agent crew, lender config + admin API adapters |
| 6 — Integration verification | ✅ Cross-stack tests, k6 smoke, sandbox checklists |
| 7 — Cutover planning | ✅ Strategy doc, deploy templates, rollback plan (execution pending approval) |
| 7b — Playwright E2E | ✅ Migration smoke suite (`tests/e2e/`) |
| 7c — Marketing gap + health | ✅ `/pricing`, `/how-it-works`, `/contact`, `/api/health` |
| 7d — Legal & help | ✅ `/help`, `/help/[slug]`, `/privacy`, `/terms`, `/account/support` redirect |
| 7e — Dashboard shell polish | ✅ Inbox, team, settings previews + CI workflow |
| 7f — Final polish | ✅ Project documents vault, auth copy, build complete |
| 8 — Production cutover | ⏸ Awaiting founder approval |

## Structure

```
vu-migrate-architecture/
├── apps/
│   ├── web/                 # Phase 5 — Next.js (5a–5i full app surface)
│   └── api/                 # Phase 4 — route handlers (health, config, metrics)
├── packages/
│   ├── config/
│   ├── shared/              # REIL phases, account types
│   ├── validation/          # Zod schemas (12 schemas, 30 tests)
│   ├── financial-engine/    # deriveAllProjectMetrics() — SOLE math authority
│   └── database/            # Phase 3 — read-only Prisma + Firestore adapters
├── docs/                    # Audit & migration plan
├── tests/
│   ├── integration/         # Phase 6 — cross-stack verification
│   ├── e2e/                 # Phase 7b — Playwright smoke tests
│   └── load/k6/             # k6 smoke scripts
└── infrastructure/          # Deploy templates (Phase 7+)
```

## Commands

```bash
npm install
npm run dev                 # Next.js dev server (UI + /api/*) — from repo root or apps/api
npm run verify              # typecheck + test + build (all workspaces)
npm run verify:integration  # Phase 6 cross-stack tests only
npm run build
npm run test
npm run test:e2e             # Playwright smoke (starts apps/web dev server)
bash infrastructure/scripts/deploy-preview.sh  # Docker preview build
```

## Rules

1. **Never modify** `../PaperWorking/` as part of migration work
2. **Never run destructive** database operations against production
3. Copy/adapt code **into this workspace only**
4. Admin stays at **`/admin`** (no subdomain)

## Documentation

See **[docs/README.md](./docs/README.md)** for the full index. Key references:

- [ARCHITECTURE_TREE_FIREBASE.md](./docs/ARCHITECTURE_TREE_FIREBASE.md) — system architecture
- [FIRESTORE_V1_COLLECTIONS_SETUP_GUIDE.md](./docs/FIRESTORE_V1_COLLECTIONS_SETUP_GUIDE.md) — Firestore setup
- [RBAC.md](./docs/RBAC.md) · [REIL.md](./docs/REIL.md) · [INSIGHTS.md](./docs/INSIGHTS.md)
- [list_APIs_.md](./docs/list_APIs_.md) — API inventory
- [PRODUCTION_LAUNCH_CHECKLIST.md](./docs/PRODUCTION_LAUNCH_CHECKLIST.md) — go-live checklist

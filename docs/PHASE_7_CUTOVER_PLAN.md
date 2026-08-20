# Phase 7 — Cutover Planning

**Status:** 📋 Planning complete — **awaiting founder approval before execution**  
**Scope:** Documentation + deploy templates only. No production DNS, DB writes, or root `apphosting.yaml` changes.

---

## 1. Executive summary

Phases 0–6 delivered an isolated monorepo with ~291 API handlers, full web surface (5a–5i), and automated integration verification. Phase 7 defines **how** to switch production traffic from `../PaperWorking/` to `vu-migrate-architecture/` without data loss or extended downtime.

**Recommended strategy:** Parallel run → staged traffic shift → full cutover with rollback window.

| Phase | Activity | Risk |
|---|---|---|
| 7a | Deploy migration stack to **preview** URL (no prod DNS) | Low |
| 7b | Contract tests: old vs new API response shapes | Low |
| 7c | Enable **write adapters** on staging Neon (not prod) | Medium |
| 7d | Blue/green: 5% → 25% → 100% traffic on `paperworking.co` | High |
| 7e | Decommission legacy deploy after 72h stable | Medium |

**Do not start 7c–7e without written founder approval.**

---

## 2. Deployment topology

### Current (production)

```
paperworking.co → Firebase App Hosting → Cloud Run (monolithic Next.js)
                → Firestore + Neon PostgreSQL + Redis + Firebase Storage
```

### Target (post-cutover)

```
paperworking.co → Firebase App Hosting → Cloud Run (apps/web monorepo)
                → Same backing services (initially)
                → Handlers in @paperworking/api (framework-agnostic)
                → financial-engine as sole metrics authority
```

### Parallel run (recommended pre-cutover)

| Environment | Source | URL (example) | Purpose |
|---|---|---|---|
| **Legacy prod** | `../PaperWorking/` | `https://paperworking.co` | Unchanged until cutover |
| **Migration preview** | `vu-migrate-architecture/` | `https://migrate-preview.paperworking.co` | QA, k6, Playwright |
| **Migration staging** | `vu-migrate-architecture/` | Firebase preview channel | Contract tests vs prod |

Deploy templates: [`../infrastructure/`](../infrastructure/)

---

## 3. Blue/green cutover strategy

### Option A — Firebase App Hosting preview → promote (recommended)

1. Deploy migration build to App Hosting **preview channel** with `apphosting.migration.yaml`.
2. Run Phase 6 checklist + Playwright against preview URL.
3. **Promote** preview to production backend (Firebase rollback available).
4. Monitor error rate, Stripe webhooks, SendGrid delivery for 72 hours.

**Rollback:** Re-promote previous App Hosting revision (< 5 minutes).

### Option B — Cloud Load Balancer traffic split

1. Deploy migration stack to separate Cloud Run service (`paperworking-migrate`).
2. Configure LB weighted routing: 95% legacy / 5% migrate.
3. Increase migrate weight in steps (5 → 25 → 50 → 100).
4. Session cookies must remain compatible (same domain, same Firebase project).

**Rollback:** Set migrate weight to 0%.

### Option C — DNS subdomain swap (not recommended for first cutover)

Use only if App Hosting promote is unavailable. Requires careful cookie and CORS audit.

---

## 4. Database write path decision

Phase 3 established **read-only** adapters. Cutover requires explicit write-path choices per entity.

### Recommended phased approach

| Entity | Cutover v1 (keep dual-write) | Cutover v2 (consolidate) |
|---|---|---|
| User profile | Firestore `/users/{uid}` (auth source of truth) | Evaluate PostgreSQL `AppUser` sync |
| REIL project | Firestore `projects` + Prisma `ReilProject` dual-write | Single source TBD by founder |
| Marketplace listing | Firestore `dealListings` | Prisma `MarketplaceListing` optional |
| Subscription | Stripe webhooks → Firestore + Prisma | Keep both until billing audit |
| Metrics snapshots | On-demand via `deriveAllProjectMetrics()` | Deprecate stale Firestore caches |
| Messages | Firestore threads (real-time) | No change in v1 |

### Write enablement checklist (staging first)

- [ ] Remove `read-only-guard` for staging `DATABASE_URL` only
- [ ] Port Prisma migrations to `packages/database/prisma/` (review, do not auto-run on prod)
- [ ] Wire handler deps to real repositories (replace seed adapters route-by-route)
- [ ] Dual-write reconciliation job for project create/update
- [ ] 48h staging soak with persona-swarm or synthetic agents

### Entities that must NOT dual-write indefinitely

- Subscription status (Stripe is authority)
- KPI scorecard values (`financial-engine` only)
- Admin impersonation audit logs

See [DATABASE_MAP.md](./DATABASE_MAP.md) §4 Entity Overlap Map.

---

## 5. DNS and routing switch

### Production DNS (no change until cutover day)

| Record | Current | Post-cutover |
|---|---|---|
| `paperworking.co` | App Hosting managed | Same — backend revision swap |
| `www.paperworking.co` | Redirect to apex | Unchanged |
| Firebase Auth authorized domains | `paperworking.co` | Add preview domain before testing |

### Webhook endpoints (critical — update in same maintenance window)

| Service | Endpoint | Action at cutover |
|---|---|---|
| Stripe | `/api/stripe/webhook` | Confirm signing secret matches new deploy |
| SendGrid | `/api/webhooks/sendgrid` | Re-verify ECDSA public key |
| Plaid | `/api/plaid/webhook` | Update webhook URL if hostname changes |
| Inbound email | SendGrid parse URL | Update MX/parse settings if needed |

**Maintenance window recommendation:** Tuesday 02:00–06:00 UTC (low traffic). Announce 72h ahead.

---

## 6. Rollback plan

### Triggers (any one → initiate rollback)

- Error rate > 2% for 15 minutes (5xx on `/api/*`)
- Stripe webhook failures > 3 consecutive events
- Auth session creation failure rate > 1%
- Critical path broken: login, checkout, project KPI load
- Founder / on-call decision

### Rollback procedure (< 15 minutes target)

1. **App Hosting:** Promote previous known-good revision (legacy or pre-cutover migrate).
2. **Load balancer:** Set migration service weight to 0% (if Option B).
3. **Webhooks:** Confirm Stripe/SendGrid still deliver to rolled-back URL (usually automatic if same domain).
4. **Database:** Do **not** run down migrations. New writes during cutover window may need manual reconciliation — document in incident log.
5. **Communicate:** Status page + email if user-visible impact > 5 minutes.

### Post-rollback

- Preserve migration deploy on preview URL for debugging
- Root-cause analysis before retry
- Extend contract test coverage for failing path

Script: [`../infrastructure/scripts/pre-cutover-checklist.sh`](../infrastructure/scripts/pre-cutover-checklist.sh)

---

## 7. Environment and secrets

Migration deploy uses the **same Secret Manager keys** as production (read-only reference: `../PaperWorking/apphosting.yaml`).

Template: [`../infrastructure/apphosting.migration.yaml.template`](../infrastructure/apphosting.migration.yaml.template)

### Migration-specific env vars

| Variable | Purpose |
|---|---|
| `MIGRATION_STACK=true` | Feature flag for telemetry tagging |
| `ENABLE_MOCK_AUTH=false` | **Must** be false in production |
| `NODE_ENV=production` | Disables SendGrid mock signatures |

Do not commit secret values. Bind via Firebase Secret Manager at deploy time.

---

## 8. Pre-cutover verification gate

All must pass on **preview URL** before production cutover approval:

| Gate | Command / artifact |
|---|---|
| Unit + integration | `npm run verify` (482+ tests) |
| Load smoke | `k6 run tests/load/k6/smoke.js` |
| Manual checklist | [PHASE_6_VERIFICATION.md](./PHASE_6_VERIFICATION.md) |
| Playwright E2E | `npm run test:e2e` — migration smoke in `tests/e2e/` |
| Stripe test mode | Checkout + webhook replay |
| SendGrid sandbox | Delivery + bounce webhook |
| Admin impersonation | Audit cookie trail |
| Golden metrics | NOI $12,485 on canonical seed deal |

---

## 9. Success criteria (production cutover complete)

- [ ] `paperworking.co` serves `apps/web` monorepo build
- [ ] All four account tiers functional (Investor, Team, Vendor, Admin)
- [ ] REIL lifecycle + scorecard use `financial-engine` only
- [ ] Stripe subscriptions create/update correctly
- [ ] SendGrid transactional email delivers
- [ ] Firebase auth session cookies work cross-browser
- [ ] Rollback tested on preview at least once
- [ ] Legacy deploy retained 72h as hot standby
- [ ] No unplanned production schema migrations

---

## 10. Founder approval required

Before executing cutover (sections 3–6), confirm:

1. **Cutover strategy:** Option A (App Hosting promote) vs Option B (traffic split)
2. **Database v1:** Dual-write acceptable for projects during transition?
3. **Maintenance window:** Approved date/time
4. **Rollback authority:** Who can trigger rollback (on-call roster)
5. **Preview URL:** Provision `migrate-preview.paperworking.co` or Firebase channel name

---

## 11. Related documents

- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) — full phase history
- [PHASE_6_VERIFICATION.md](./PHASE_6_VERIFICATION.md) — automated + manual tests
- [list_APIs_.md](./list_APIs_.md) — web adapter inventory
- [DATABASE_MAP.md](./DATABASE_MAP.md) — entity overlap and write patterns
- [RBAC.md](./RBAC.md) — admin and tier gates
- [../infrastructure/README.md](../infrastructure/README.md) — deploy templates

*Phase 7 planning complete. Execution blocked on founder approval.*

# Phase 6 — Integration Verification

**Status:** ✅ Complete (automated smoke + sandbox tests)  
**Scope:** `vu-migrate-architecture/` only — no production cutover

---

## Automated verification (CI / local)

| Suite | Location | Command |
|---|---|---|
| Unit + handler tests | All workspaces | `npm run test --workspaces --if-present` |
| Cross-stack integration | `tests/integration/` | `npm run test --workspace=@paperworking/integration` |
| Full gate | Monorepo root | `npm run verify` |

### Integration test coverage

| Flow | Test file | Validates |
|---|---|---|
| Auth → portfolio | `auth-flow.integration.test.ts` | Session cookies, CSRF gate, insights KPIs |
| Metrics pipeline | `metrics-pipeline.integration.test.ts` | `financial-engine` ↔ portfolio/KPI handlers |
| Stripe sandbox | `stripe-sandbox.integration.test.ts` | Mock checkout → session status |
| SendGrid sandbox | `sendgrid-sandbox.integration.test.ts` | Mock ECDSA signature + event processing |
| Admin impersonation | `admin-impersonation.integration.test.ts` | RBAC gate + auditable cookies |
| Web adapter registry | `web-adapter-coverage.integration.test.ts` | 23 handler-backed routes + 2 inline |

---

## Manual / staging checklist

Run after deploying the migration stack to a preview environment.

### Auth flow end-to-end

- [ ] `/login` → dev session cookie (`mock_session_token_123`)
- [ ] `/login?accountType=admin&redirectTo=/admin` → admin cookie (`__acct=admin`)
- [ ] `/login?accountType=vendor` → vendor portal redirect
- [ ] `/api/auth/me` returns profile for authenticated session
- [ ] Logout clears session cookies

### Dashboard + project surfaces

- [ ] `/dashboard/command-center` loads with sidebar + bottom nav
- [ ] `/dashboard/projects` lists seed projects
- [ ] `/project/deal-1/insights` and `/project/deal-1/scorecard` render KPI data
- [ ] `/dashboard/reports` export buttons reach report handlers

### Marketplace + vendor + admin

- [ ] `/dashboard/marketplace` and `/deals/[slug]` load
- [ ] `/vendor-portal` quote inbox + profile editor
- [ ] `/admin/agent-crew` impersonation sets cookies and redirects to dashboard
- [ ] `/admin/lender-config` shows seed lender rates

### Stripe sandbox

- [ ] `STRIPE_SECRET_KEY` unset → mock checkout path (`/checkout/success?session_id=cs_mock_*`)
- [ ] Webhook handler deduplicates replayed events
- [ ] `checkout.session.completed` updates subscription fields (when DB wired)

### SendGrid sandbox

- [ ] `SENDGRID_API_KEY` unset → mock email adapter
- [ ] Webhook accepts `mock_sig_*` in non-production
- [ ] Inbound email parser strips quoted reply history

### Load test (k6)

```bash
cd apps/web && npm run dev   # terminal 1
k6 run tests/load/k6/smoke.js  # terminal 2
```

---

## Out of scope (Phase 7)

- DNS / routing cutover
- Production Firestore write path
- Blue/green deployment
- Persona-swarm E2E against live Neon DB

These require explicit founder approval per [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).

# Founder Approval — Production Cutover

**Document:** Sign-off request for PaperWorking architecture migration  
**Migration workspace:** `vu-migrate-architecture/`  
**Status:** Phases 0–7 planning complete — **awaiting approval to execute cutover**

---

## Summary

We rebuilt PaperWorking as an isolated monorepo without modifying production source (`../PaperWorking/`). The migration stack is feature-complete for UI surfaces (Phases 5a–5i), API handlers (~291 routes), integration tests, and cutover planning.

**Request:** Approve preview deploy + production cutover per [PHASE_7_CUTOVER_PLAN.md](./PHASE_7_CUTOVER_PLAN.md).

---

## What is ready

| Deliverable | Evidence |
|---|---|
| API handlers | `apps/api/` — 481 automated tests pass (`npm run verify`) |
| Web app | `apps/web/` — marketing, auth, dashboard, projects, insights, reports, marketplace, vendor, admin |
| Metrics authority | `packages/financial-engine/` — golden NOI $12,485 |
| Integration verification | `tests/integration/` — auth, Stripe/SendGrid sandbox, impersonation |
| E2E smoke | `tests/e2e/` — Playwright against dev/preview |
| Cutover plan | Rollback triggers, webhook checklist, DB write framework |
| Deploy templates | `infrastructure/Dockerfile`, `apphosting.migration.yaml.template` |

---

## Decisions required

Please confirm each item (initial in box):

| # | Decision | Options | Your choice |
|---|---|---|---|
| 1 | **Cutover strategy** | A) App Hosting promote (recommended) · B) Traffic split · C) DNS swap | _________ |
| 2 | **Preview URL** | e.g. `migrate-preview.paperworking.co` or Firebase channel name | _________ |
| 3 | **Maintenance window** | Recommended: Tue 02:00–06:00 UTC | _________ |
| 4 | **Database v1** | Dual-write Firestore + Neon during transition? Y / N | _________ |
| 5 | **Rollback authority** | Name + contact for go/no-go during cutover | _________ |

---

## Pre-cutover gate (automated)

```bash
cd vu-migrate-architecture
bash infrastructure/scripts/pre-cutover-checklist.sh
npm run test:e2e   # with preview URL after deploy
```

Manual checklist: [PHASE_6_VERIFICATION.md](./PHASE_6_VERIFICATION.md)

---

## Risk summary

| Risk | Mitigation |
|---|---|
| Session/auth regression | Dev + prod session handlers migrated; E2E auth suite |
| Billing disruption | Stripe webhook replay test on preview; rollback < 15 min |
| Email delivery | SendGrid sandbox verified; mock disabled in prod template |
| Data inconsistency | Dual-write only with explicit reconciliation; no prod schema auto-migrate |
| Extended downtime | Blue/green promote; legacy deploy hot standby 72h |

---

## Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Founder / Product | | | |
| Engineering lead | | | |
| On-call for rollback | | | |

**Approved to proceed with preview deploy:** ☐ Yes ☐ No  
**Approved to proceed with production cutover:** ☐ Yes ☐ No  

---

## After approval — execution order

1. Deploy migration stack to preview URL
2. Run E2E + k6 + manual checklist (48h soak)
3. Rollback drill on preview channel
4. Execute cutover in approved maintenance window
5. Monitor 72h; decommission legacy if stable

*Questions: see [PHASE_7_CUTOVER_PLAN.md](./PHASE_7_CUTOVER_PLAN.md) §10.*

# V1 Production Completion Plan

**Generated:** 2026-09-01  
**Status:** Planning — **do not cut over production** until checklist in `V1_PRODUCTION_READINESS_CHECKLIST.md` passes.  
**Principle:** V0 = feature reference; V2 spec = architecture target; V1 Nest PROD = current behavior source of truth.

---

## Current Baseline

| Item | Status |
|------|--------|
| Phase 9A shared session + authz wiring | ✅ Complete |
| Phase 9B `GET /api/auth/me` | ✅ Complete |
| Phase 9C `GET /api/auth/sessions` | ✅ Complete |
| Next API adapters | 3 (`health`, `auth/me`, `auth/sessions`) |
| Production API host | NestJS Cloud Run (`apps/api/src/main.ts`) |
| Authoritative DB | Supabase PostgreSQL (Prisma) |
| Authoritative auth | Supabase (Firebase parallel flag OFF) |
| V0 replacement ready | **NO** |

See [`V0_V1_FEATURE_PARITY_MATRIX.md`](./V0_V1_FEATURE_PARITY_MATRIX.md) and [`V0_V1_INTEGRATION_PARITY_MATRIX.md`](./V0_V1_INTEGRATION_PARITY_MATRIX.md).

---

## Implementation Order (Strict)

```
P0 security fixes (document → fix → verify)
  → Phase 5 billing parity
  → Phase 6 email provider decision + mount + product flows
  → Phase 7 cron + webhooks mount
  → Phase 8 investor/deal invitations
  → Phase 9 document storage
  → Phase 10 REIL / financial-engine HTTP exposure
  → Phase 11 Plaid / banking
  → Phase 12 external integrations (Bridge, DocuSign, Maps, etc.)
  → Phase 13 extended project functionality
  → Phase 14 frontend wiring
  → Phase 9 Next adapters (parallel when non-conflicting)
  → Phase 15 database mapping + migration scripts (staging first)
  → Phase 17 testing hardening
  → Phase 18 production readiness review (NOT cutover)
```

**Phase 9 Next adapters** may proceed **in parallel** only for routes whose Nest behavior is already correct and do not depend on unfinished email/billing/cron work.

---

## Workstream Detail

### WS-0: P0 Security (before feature work)

| ID | Task | File(s) | Phase |
|----|------|---------|-------|
| SEC-01 | Require `BROADCAST_TOKEN_SECRET` in production; remove default `'paperworking_secret'` | `apps/api/src/lib/deals/broadcast-token.ts` | Pre-5 |
| SEC-02 | Production env validation gate (`BROADCAST_TOKEN_SECRET`, `CORS_ORIGINS`, `COOKIE_SAMESITE`, Supabase keys) | new startup validator or deploy script | Pre-5 |
| SEC-03 | Fix marketplace investor `:id` disclosure | `marketplace.service.ts` | Pre-5 |
| SEC-04 | Scope or document `GET /api/vendor-services` global catalog | `vendors.service.ts` | Pre-5 |
| SEC-05 | AuthorizationService direct integration tests (IDOR) | new test suite | Phase 17 |

**Rules:** Do not weaken authz. `@paperworking/authz` remains canonical. Document before changing.

---

### WS-1: Phase 5 — Billing Parity

| V0 Route | V1 Today | Target | File |
|----------|----------|--------|------|
| `POST /api/stripe/checkout` | PROD REAL | Keep | `payments.controller.ts` |
| `POST /api/stripe/portal` | PROD REAL | Keep | `payments.controller.ts` |
| `GET /api/stripe/session-status` | PROD REAL | Keep | `payments.controller.ts` |
| `POST /api/stripe/webhook` | PROD REAL | Add lifecycle email via SendGrid if V0 parity required | `payments.service.ts` |
| `POST /api/stripe/invoices` | PROD STUB `[]` | Live Stripe invoice list like V0 | `payments.service.ts` |
| `POST /api/stripe/payment-method` | PROD STUB | Live payment methods | `payments.service.ts` |
| `POST /api/stripe/subscription` | PROD STUB | Subscription management | `payments.service.ts` |
| `ALL /api/billing/*` | PARTIAL | Invoice PDF, cancel, history | `payments.service.ts` |

**Do not** silently return `[]` in production without documenting intentional removal.

---

### WS-2: Phase 6 — Email Parity

**Decision:** V1 standard provider = **SendGrid** (per `.env.example`, `PHASE_7_CUTOVER_PLAN.md`). **Deprecate Resend** in V1 runtime.

| Task | V0 Reference | V1 Target |
|------|--------------|-----------|
| Mount SendGrid event webhook | `webhooks/resend/route.ts` | Nest controller → `handleSendGridWebhookPost` |
| Outbound adapter in services | `CommunicationEngine.ts` | New `@paperworking/services` email module |
| Team invite email | `cron/process-team-invites` | Wire `TeamService` + cron |
| Deal broadcast email | invitation/broadcast routes | Wire `DealsService.broadcast` |
| Investor invitation emails | `invitations/**` | Phase 8 + email |
| Inbound parse | `webhooks/emails` | Mount + route to deals/inbox |
| Remove Resend mock strings | — | `routes/emails/send/handler.ts` |

---

### WS-3: Phase 7 — Cron / Workers

Mount on Nest (or separate Cloud Run jobs calling shared handlers):

| V0 Cron | V1 Handler | Priority |
|---------|------------|----------|
| `process-email-notifications` | `handleCronProcessEmailNotificationsGet` | P0 |
| `process-team-invites` | `handleCronProcessTeamInvitesGet` | P0 |
| `sync-transactions` | `handleCronSyncTransactionsGet` | P1 |
| `bridge-sync` | `handleCronBridgeSyncGet` | P2 |
| `send-digest` | `handleCronSendDigestGet` | P2 |
| `process-daily-kpis` | `handleCronProcessDailyKpisGet` | P2 |
| `lender-package-reminders` | `handleCronLenderPackageRemindersGet` | P2 |
| `lifecycle-alerts` | `handleCronLifecycleAlertsGet` | P2 |
| `snapshots` | `handleCronSnapshotsGet` | P2 |
| `process-deletions` | `handleCronProcessDeletionsGet` | P2 |
| `refresh-place-ids` | `handleCronRefreshPlaceIdsGet` | P3 |
| `worker/drain` | `handleWorkerDrainPost` | P1 |

Auth: `CRON_SECRET` / `WORKER_SECRET` · `apps/api/src/lib/cron/auth.ts`

---

### WS-4: Phase 8 — Invitations

| Capability | V0 | V1 |
|------------|----|----|
| Token validation | `invitations/[token]/route.ts` | LEGACY handlers — mount |
| Accept/respond/indication/ask | 10 routes | LEGACY — mount with authz |
| External investor scope | Firestore rules + token | Must enforce deal/project scope in `@paperworking/authz` |
| Email on each action | Resend | SendGrid via WS-2 |

---

### WS-5: Phase 9 — Document Storage

| Task | V0 | V1 Target |
|------|----|-----------|
| Upload | Firebase Storage | Firebase Storage (V2) or GCS — **decision required** |
| Download auth | project ACL | `ProjectsController` documents routes |
| Replace synthetic URLs | — | `routes/upload/handler.ts` |
| Migration | — | Copy V0 objects; do not delete source |

---

### WS-6: Phase 10 — REIL / Financial Engine

- Expose REIL via Nest modules (not legacy-only handlers)
- All math through `@paperworking/financial-engine` — no duplicate formulas
- V0: 13 `reil/**` routes → map to Nest controllers
- DB: `ReilProject` and related Prisma models exist; not Wave-1 mounted

---

### WS-7: Phase 11 — Plaid

- Mount `plaid/create-link-token`, `plaid/exchange`, webhook, cron sync
- Production: `BANKING_PROVIDER=plaid` — fail if mock in production env validator
- Models: `PlaidConnection`, `PlaidRawTransaction` in schema

---

### WS-8: Phase 12 — External Integrations

Classify each: **KEEP / MIGRATE / REPLACE / DEPRECATE** (see integration matrix).

Priority KEEP: DocuSign, Bridge, Google Places (FE DealMap already depends on maps key).

---

### WS-9: Phase 13 — Extended Project Routes

~30 V0 project sub-routes (loans, lender-package, commitments, acquisition, fund, exit, etc.) — currently LEGACY handlers only.

Nest `ProjectsController` covers Wave-1 subset only · `projects.controller.ts`.

---

### WS-10: Phase 14 — Frontend Wiring

| Feature | FE Status | API Status |
|---------|-----------|------------|
| Organizations | MISSING apiFetch | PROD unwired |
| Team invites | STUB UI | PROD partial (no email) |
| Messages / tasks | MISSING | PROD unwired |
| Documents upload | MISSING | PROD partial |
| Admin analytics/tickets | BROKEN sections | PROD different sections |
| Dashboard widgets | MOCK empty | by design in api-provider |
| Compose email | STUB | — |

Pattern: UI → `apiFetch` → Nest → service → DB.

---

### WS-11: Phase 9 Continuation — Next Adapters

**Completed:** health, auth/me, auth/sessions  
**Next recommended:** `POST/DELETE /api/auth/session` (same shared-handler pattern as 9B/9C)

For each route:
1. Extract behavior from Nest service (not legacy handler if different)
2. Framework-independent handler in `apps/api/src/routes/**`
3. Nest delegates
4. Thin Next `route.ts`
5. Handler + adapter + integration tests
6. `npm run verify`

**Do not redo 9A–9C.**

---

### WS-12: Phase 15 — Database

See [`V0_V1_DATABASE_MAPPING.md`](./V0_V1_DATABASE_MAPPING.md).

- No production reset
- No Firestore delete
- Staging migration scripts only after mapping approved

---

## Gap → Phase Map (Quick Reference)

| Gap | Phase |
|-----|-------|
| Broadcast token secret | Pre-5 / SEC |
| Stripe invoices/methods | 5 |
| SendGrid mount + flows | 6 |
| Cron + worker mount | 7 |
| Investor invitations | 8 |
| Document storage | 9 |
| REIL HTTP | 10 |
| Plaid | 11 |
| Bridge/DocuSign/Maps | 12 |
| Extended projects | 13 |
| FE wiring | 14 |
| Next adapters | 9 (parallel) |
| DB migration | 15 |
| Tests | 17 |
| Readiness checklist / cutover prep | 18 (no DNS) |

---

## Exit Criteria for V0 Decommission (Future — Not Now)

1. All P0 rows in feature matrix → PROD + REAL or documented DEPRECATE  
2. Email, cron, webhooks, storage mounted and verified in staging  
3. Billing parity with V0 or signed product waiver  
4. Frontend wiring complete for core flows  
5. `npm run verify` green + live smoke on staging  
6. Data migration validated on staging  
7. Rollback plan tested  
8. Explicit approval — **no DNS change in this plan**

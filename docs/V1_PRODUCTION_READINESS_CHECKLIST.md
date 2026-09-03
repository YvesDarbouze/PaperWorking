# V1 Production Readiness Checklist

**Generated:** 2026-09-01  
**Status:** **NOT READY** — V1 cannot replace V0. Use as gate before any cutover discussion.  
**Do NOT:** change DNS, decommission V0, or run production destructive DB commands.

Legend: ✅ Pass · ⚠️ Partial · ❌ Fail · ⬜ Not verified

---

## 1. Authentication

| Check | Status | Evidence |
|-------|--------|----------|
| Supabase login → session cookie | ⚠️ | Works when env configured · `auth.controller.ts`, `auth/callback/page.tsx` |
| Session cookie httpOnly / secure | ⚠️ | `auth.service.ts` — requires prod env |
| Cross-origin FE→Nest credentials | ⚠️ | Needs `COOKIE_SAMESITE=none` + `CORS_ORIGINS` |
| Shared session resolver (9A) | ✅ | `packages/services/src/session/` |
| Firebase parallel auth (flag) | ⚠️ | `USE_FIREBASE_AUTH` default OFF · Phase F |
| Magic link / reset via Nest | ❌ | STUB endpoints · use Supabase client |
| Mock auth disabled in production | ✅ | `auth.service.ts` L27–31 |
| accountType escalation blocked | ✅ | `account-type.ts`, shared resolver |

---

## 2. Authorization

| Check | Status | Evidence |
|-------|--------|----------|
| Global SessionAuthGuard | ✅ | `auth.module.ts` |
| AuthorizationService on Wave-1 | ✅ | `@paperworking/authz` |
| Project/org/deal ACL | ⚠️ | Service-layer; limited `@RequirePermissions` |
| IDOR integration tests | ❌ | Gap per integrity audit |
| Broadcast token secret required | ❌ | Default `'paperworking_secret'` · `broadcast-token.ts` L26 |
| Invitation token scope enforcement | ❌ | Token routes not mounted |
| Admin gate DB-authoritative | ✅ | Phase 9A admin layout fix |
| CSRF on session mutations | ✅ | `csrf.guard.ts` |

---

## 3. Billing / Stripe

| Check | Status | Evidence |
|-------|--------|----------|
| Checkout | ⚠️ | REAL with keys; mock without |
| Portal | ⚠️ | REAL with keys |
| Webhook | ✅ | `payments.controller.ts` POST webhook |
| Session status | ✅ | ownership check |
| Invoices list | ❌ | Returns `[]` · `payments.service.ts` L87–89 |
| Payment methods | ❌ | Returns `[]` |
| Subscription management | ❌ | STUB |
| Invoice PDF | ❌ | `stub: true` |
| Billing cancel | ⚠️ | Works; verify E2E |

---

## 4. Email

| Check | Status | Evidence |
|-------|--------|----------|
| Outbound provider mounted | ❌ | SendGrid handlers not on Nest |
| Team invite email | ❌ | DB row only |
| Deal broadcast email | ❌ | DB row only |
| Investor invitation email | ❌ | Routes not mounted |
| Inbound parse | ❌ | LEGACY handlers |
| Delivery event webhook | ❌ | SendGrid/Resend not mounted |
| Provider decision documented | ✅ | SendGrid replaces Resend · integration matrix |

---

## 5. Cron / Scheduled Jobs

| Check | Status | Evidence |
|-------|--------|----------|
| process-email-notifications | ❌ | V0 mounted; V1 handler only |
| process-team-invites | ❌ | Same |
| sync-transactions | ❌ | Same |
| bridge-sync | ❌ | Same |
| All 11 V0 crons | ❌ | Zero Nest cron controllers |
| Cloud Scheduler triggers configured | ⬜ | External — not in repo |
| CRON_SECRET required | ⚠️ | Code supports; mount missing |

---

## 6. Webhooks

| Check | Status | Evidence |
|-------|--------|----------|
| Stripe | ✅ | Nest mounted |
| SendGrid | ❌ | LEGACY |
| Resend (V0) | N/A | Deprecated in V1 plan |
| DocuSign | ❌ | LEGACY |
| Bridge | ❌ | LEGACY |
| Inbound emails | ❌ | LEGACY |
| Sourcing | ❌ | LEGACY |
| Plaid | ❌ | LEGACY |

---

## 7. Storage

| Check | Status | Evidence |
|-------|--------|----------|
| Upload to real blob store | ❌ | Synthetic URL · `routes/upload/handler.ts` |
| Download authorization | ⚠️ | Nest routes exist; no blobs |
| Firebase Storage wired | ❌ | |
| V0 documents preserved | ✅ | No deletion performed |

---

## 8. Integrations

| Check | Status | Evidence |
|-------|--------|----------|
| REIL HTTP API | ❌ | Schema only |
| Plaid | ❌ | mock default |
| DocuSign | ❌ | mock default |
| Bridge MLS | ❌ | not mounted |
| Google Maps (FE) | ⚠️ | FE key; API proxy not mounted |
| RentCast | ⚠️ | admin endpoint only |
| Redis | ❌ | no runtime |
| MCP | ❌ | not mounted |

---

## 9. Database

| Check | Status | Evidence |
|-------|--------|----------|
| Postgres migrations applied | ⬜ | deploy-specific |
| Firestore mapping complete | ⚠️ | `V0_V1_DATABASE_MAPPING.md` |
| Data migration script | ❌ | Not started |
| No production reset | ✅ | Policy documented |
| Dual-write | ❌ | Correctly not implemented |

---

## 10. Frontend

| Check | Status | Evidence |
|-------|--------|----------|
| apiFetch → Nest | ✅ | `lib/api/client.ts` |
| Core flows wired | ⚠️ | projects, deals, billing, marketplace |
| Organizations UI | ❌ | No apiFetch |
| Team invites | ❌ | Local stub |
| Messages / tasks | ❌ | No apiFetch |
| Documents upload UI | ❌ | |
| Admin section parity | ❌ | Section mismatch |
| Dashboard widgets | ❌ | Empty in API mode |

---

## 11. API Surface

| Check | Status | Evidence |
|-------|--------|----------|
| V0 route parity | ❌ | 203 V0 methods; ~25 PROD-mapped |
| Legacy handlers not mistaken for prod | ⚠️ | 202 handlers; document clearly |
| Next adapters | ⚠️ | 3 of ~49 Wave-1 |
| Phase 9A–9C | ✅ | Complete |

---

## 12. Testing

| Check | Status | Evidence |
|-------|--------|----------|
| `npm run verify` | ✅ | 727 tests at Phase 9C |
| Nest guard stack integration tests | ❌ | Gap |
| Live smoke (`NEST_SMOKE_URL`) | ⬜ | Optional CI |
| Legacy handler tests ≠ prod proof | ⚠️ | Documented risk |

---

## 13. Monitoring / Ops

| Check | Status | Evidence |
|-------|--------|----------|
| Health endpoint | ✅ | Nest + Next |
| Structured logging | ⬜ | Basic Nest logger |
| PostHog | ⬜ | Env only |
| Error alerting | ⬜ | External |
| Stripe webhook monitoring | ⬜ | External |

---

## 14. Secrets / CI/CD

| Check | Status | Evidence |
|-------|--------|----------|
| V1 CI verify workflow | ✅ | `.github/workflows/verify.yml` |
| V1 auto-deploy | ❌ | Manual Cloud Build |
| V0 Firebase deploy | ✅ | Separate repo path |
| Secret Manager bindings | ⬜ | Not verifiable in repo |
| `.env.example` complete | ✅ | SendGrid, Supabase, Stripe |

---

## 15. Rollback / Backup

| Check | Status | Evidence |
|-------|--------|----------|
| Rollback plan documented | ⚠️ | `PHASE_7_CUTOVER_PLAN.md` |
| V0 remains operational | ✅ | No decommission |
| DNS unchanged | ✅ | Policy |
| DB backup strategy | ⬜ | Supabase/Firestore console |

---

## Overall Verdict

| Question | Answer |
|----------|--------|
| **Safe to replace V0 today?** | **NO** |
| **Safe to continue Phase 9D+ adapters?** | **YES** (parallel track) |
| **Blocking categories** | Email, cron, webhooks, storage, billing stubs, invitations, ~83% V0 routes LEGACY/missing |

---

## Conditions Required Before V0 Decommission

1. ⬜ All P0 items in this checklist → ✅  
2. ⬜ Feature matrix: no critical domain entirely LEGACY/MISSING  
3. ⬜ SendGrid (or approved provider) mounted + product flows verified  
4. ⬜ All P0 crons mounted + Scheduler configured  
5. ⬜ Stripe billing parity or signed waiver  
6. ⬜ Invitation token flows mounted + security tested  
7. ⬜ Real document storage + migration from V0 Storage  
8. ⬜ Frontend wired for orgs, team, invitations, documents, billing history  
9. ⬜ Staging ETL validated (`V0_V1_DATABASE_MAPPING.md`)  
10. ⬜ `npm run verify` + staging smoke + IDOR tests green  
11. ⬜ Rollback drill completed  
12. ⬜ Explicit written approval — **no DNS change without approval**

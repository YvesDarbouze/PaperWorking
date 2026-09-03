# V0 / V2 → V1 Integration Parity Matrix

**Generated:** 2026-09-01  
**Mode:** READ-ONLY inventory — env vars and handler files alone do **not** prove production activation.  
**V2 reference:** [`PAperWorking Architecture and Developer.md`](../../PAperWorking%20Architecture%20and%20Developer.md)  
**V0 reference:** `PaperWorking/` (production monolith)  
**V1 reference:** `PaperWorking_v1/` (Nest Cloud Run + Next FE)

## Classification Legend

| Decision | Meaning |
|----------|---------|
| **KEEP** | Required in V1; retain or finish mounting |
| **MIGRATE** | Change provider/transport while preserving product behavior |
| **REPLACE** | V2 target differs from V0; implement V2 path explicitly |
| **DEPRECATE** | Intentionally not carried forward (must be documented) |

| Runtime | Meaning |
|---------|---------|
| **PROD-MOUNTED** | Called from Nest controller or Next adapter in production |
| **LEGACY-ONLY** | Handler/lib exists; not HTTP-mounted |
| **SCAFFOLD** | Package/config only; no production writes/calls |
| **MISSING** | No meaningful V1 implementation |

---

## Integration Matrix

| Integration | V0 | V2 Required | V1 Exists | PROD-Mounted | Prod Services Call It | Mock/Stub | Env Vars (V1 `.env.example`) | FE Dep | BE Dep | Decision | Priority | Phase |
|-------------|:--:|:-----------:|:---------:|:--------------:|:---------------------:|:---------:|-------------------------------|:------:|:------:|----------|:--------:|-------|
| **Firebase Auth** | ✅ Primary (`PaperWorking/src/app/api/auth/session/route.ts`) | ✅ Primary target | ✅ Parallel flag | ❌ (Supabase default) | ✅ when `USE_FIREBASE_AUTH=true` · `packages/identity/src/firebase-verifier.ts` | OFF by default | `USE_FIREBASE_AUTH`, `NEXT_PUBLIC_USE_FIREBASE_AUTH`, `FIREBASE_*` | ✅ `AuthContext.tsx` | ✅ identity router | **MIGRATE** (Phase F parallel → cutover) | P1 | Phase F / 18 |
| **Firebase Firestore** | ✅ Authoritative ops DB · `PaperWorking/src/lib/firebase/**` | ✅ Primary ops DB | ⚠️ Read scaffold | ❌ writes denied | ❌ Nest services use Prisma | SCAFFOLD | `FIREBASE_*`, `DATABASE_READ_MODE`, `FIRESTORE_SHADOW_READS` | ❌ | ⚠️ `packages/database/src/firestore/` | **MIGRATE** (no writes until approved) | P1 | Phase 7 / 15 |
| **Firebase Storage** | ✅ Document vault | ✅ Target | ❌ | ❌ | ❌ synthetic URLs only | MOCK | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Partial UI | `routes/upload/handler.ts` | **MIGRATE** | P0 | Phase 9 |
| **Firebase App Hosting** | ✅ V0 deploy · `PaperWorking/.github/workflows/firebase-hosting-merge.yml` | ✅ Target container | ⚠️ Config exists | N/A | N/A | apphosting.yaml stale (Neon/Redis/Firebase mix) | `apphosting.yaml` | N/A | N/A | **REPLACE** (single-container cutover later) | P2 | Phase 18 |
| **Supabase Auth** | ❌ | ❌ (interim V1) | ✅ Primary | ✅ | ✅ `SupabaseAuthService`, `packages/identity/src/supabase-verifier.ts` | Real | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_*` | ✅ | ✅ | **KEEP** (current prod) | P0 | Current |
| **Supabase PostgreSQL** | ❌ (V0 uses Neon) | ⚠️ interim | ✅ Primary | ✅ | ✅ All Nest Wave-1 modules · `PrismaService` | Real | `DATABASE_URL`, `DIRECT_URL` | via API | ✅ | **KEEP** (current prod) | P0 | Current |
| **Neon PostgreSQL** | ✅ V0 `DATABASE_URL` · `@prisma/adapter-neon` | ✅ Financial/REIL SoT | ⚠️ Adapter scaffold | ❌ | ❌ runtime uses `@prisma/adapter-pg` | SCAFFOLD | `DATABASE_URL` (Neon in apphosting template) | ❌ | `packages/database/src/neon/` | **MIGRATE** (opt-in) | P2 | Phase 8 |
| **Resend (email)** | ✅ Production · `CommunicationEngine.ts`, `webhooks/resend/route.ts`, invitation routes | ❌ not in V2 doc | ⚠️ Residual reference | ❌ | ❌ one legacy mock message in `routes/emails/send/handler.ts` L78 | LEGACY | Removed from V1 `.env.example` | ❌ | LEGACY handler | **REPLACE → SendGrid** | P0 | Phase 6 |
| **SendGrid (email)** | ❌ | ✅ V1 `.env.example` Gate E-1 | ⚠️ Handlers + tests | ❌ | ❌ not called from Nest services | LEGACY | `SENDGRID_*`, `SYSTEM_EMAIL_PROVIDER`, `EMAIL_GLOBAL_KILL_SWITCH` | ❌ | `routes/webhooks/sendgrid/handler.ts`, `lib/email/*` | **MIGRATE** (mount + wire product flows) | P0 | Phase 6 |
| **Inbound email parse** | ✅ `webhooks/emails/route.ts` | ✅ | ⚠️ Handlers | ❌ | ❌ | LEGACY | `INBOUND_EMAIL_DOMAIN`, `INBOUND_EMAIL_WEBHOOK_SECRET` | ❌ | `routes/webhooks/emails/`, `inbound-email/` | **MIGRATE** | P0 | Phase 6/7 |
| **Stripe** | ✅ 7 routes · `stripe/webhook/route.ts` sends Resend emails | ✅ | ✅ Nest mounted | ✅ checkout/portal/webhook/session-status | ✅ `PaymentsService` | Mock without keys | `STRIPE_*` | ✅ billing UI | ✅ | **KEEP** + finish billing stubs | P0 | Phase 5 |
| **Plaid** | ✅ `plaid/*` + cron sync | ✅ | ⚠️ Handlers + Prisma models | ❌ | ❌ | `BANKING_PROVIDER=mock` default | `PLAID_*`, `TOKEN_ENCRYPTION_KEY`, `PLAID_WEBHOOK_SECRET` | ❌ | `routes/plaid/**`, `routes/webhooks/plaid/` | **MIGRATE** | P1 | Phase 11 |
| **DocuSign** | ✅ `esign/*`, `webhooks/docusign/route.ts` | Optional | ⚠️ Handlers | ❌ | ❌ | `ESIGN_PROVIDER=mock` | `DOCUSIGN_*` | ❌ | `routes/webhooks/docusign/`, `lib/esign/` | **KEEP** (mount when keys set) | P2 | Phase 12 |
| **Bridge MLS** | ✅ 6 routes + webhook + cron | Optional | ⚠️ Handlers | ❌ | ❌ | credentialsMissing UX | `BRIDGE_*`, `BRIDGE_WEBHOOK_SECRET` | Partial | `routes/bridge/**`, `routes/webhooks/bridge/` | **KEEP** | P2 | Phase 12 |
| **Google Drive** | ✅ OAuth routes | Optional | ⚠️ Handlers | ❌ | ❌ | — | `GOOGLE_CLIENT_*`, `GOOGLE_DRIVE_*` | ❌ | `routes/integrations/google-drive/handler.ts` | **KEEP** | P2 | Phase 12 |
| **Google Calendar** | ✅ 4 routes | Optional | ⚠️ Handlers | ❌ | ❌ | — | `GOOGLE_CLIENT_*` | ❌ | `routes/calendar/handler.ts` | **KEEP** | P3 | Phase 12 |
| **Google Maps / Places** | ✅ 5+ routes | Optional | ⚠️ Handlers | ❌ | ❌ | mock address provider default | `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ DealMap | `routes/places/**`, `map-tile`, `street-view` | **KEEP** | P2 | Phase 12 |
| **RentCast** | ✅ property data | Optional | ⚠️ Admin usage + mocks | Partial | ⚠️ admin endpoint only | mock default risk | `RENTCAST_API_KEY`, `PROPERTY_DATA_PROVIDER` | Admin | `admin.module.ts` | **KEEP** | P2 | Phase 12 |
| **ATTOM / Mashvisor** | ✅ env in V0 | Optional | ⚠️ env only | ❌ | ❌ | — | `ATTOM_API_KEY`, `MASHVISOR_API_KEY` | ❌ | legacy libs | **DEPRECATE?** (confirm product) | P3 | Phase 12 |
| **PostHog** | ✅ stripe webhook telemetry | Optional | ⚠️ env only | Unknown | Unknown | stub when disabled | `POSTHOG_*` | ❌ | — | **KEEP** optional | P3 | Phase 17 |
| **Redis / Upstash** | ✅ V0 `apphosting.yaml` REDIS_URL | ✅ cache/queues | ❌ | ❌ | ❌ no code refs | MISSING | in apphosting template only | ❌ | ❌ | **MIGRATE** (scoped use) | P2 | Stream G |
| **Cloud Scheduler** | ✅ 11 cron routes mounted V0 | ✅ | ⚠️ 16 handlers | ❌ | ❌ | default empty runners | `CRON_SECRET`, `WORKER_SECRET` | ❌ | `routes/cron/handlers.ts` | **MIGRATE** (mount on Nest or Cloud Run jobs) | P0 | Phase 7 |
| **Cloud Run (Nest API)** | ❌ | ⚠️ interim split | ✅ | ✅ | ✅ `apps/api/src/main.ts` | Real | `PORT`, `CORS_ORIGINS` | via `NEXT_PUBLIC_API_URL` | ✅ | **KEEP** until Phase 18 | P0 | Current |
| **Vercel (Next FE)** | Optional | — | ✅ | ✅ | ✅ | Real | `apps/web/vercel.json` | ✅ | ❌ | **KEEP** interim | P1 | Current |
| **MCP** | ✅ `mcp/[transport]/route.ts` | — | ⚠️ Handler | ❌ | ❌ | 503 without key | `MCP_API_KEY` | ❌ | `routes/mcp/transport/handler.ts` | **KEEP** optional | P3 | Phase 12 |
| **Worker / queue drain** | ✅ `worker/drain/route.ts` | ✅ | ⚠️ Handler | ❌ | ❌ | 503 without secret | `WORKER_SECRET` | ❌ | `routes/worker/drain/handler.ts` | **MIGRATE** | P1 | Phase 7 |
| **Sourcing webhook** | ✅ mounted V0 | Optional | ⚠️ Handler | ❌ | ❌ | — | `SOURCING_WEBHOOK_SECRET` | ❌ | `routes/webhooks/sourcing/handler.ts` | **KEEP** | P3 | Phase 12 |
| **financial-engine** | ✅ V0 imports | ✅ sole math authority | ✅ package | ❌ not exposed HTTP | ❌ not wired Nest | REAL lib | — | ❌ | `@paperworking/financial-engine` | **KEEP** + wire Phase 10 | P1 | Phase 10 |
| **@paperworking/authz** | partial V0 | ✅ | ✅ | ✅ via Nest guards | ✅ `AuthorizationService` | REAL | — | indirect | ✅ all Wave-1 | **KEEP** | P0 | 9A ✅ |

---

## Email Provider Architectural Decision (Required Before Phase 6 Implementation)

| Option | V0 | V1 Current | V2 Spec | Recommendation |
|--------|----|------------|---------|----------------|
| **Resend** | Production | Not in V1 `.env.example` | Not specified | **DEPRECATE in V1** after cutover |
| **SendGrid** | Not used | Handlers + `.env.example` Gate E-1 | Implied by V1 docs (`PHASE_7_CUTOVER_PLAN.md`) | **REPLACE Resend as V1 provider** |
| **Dual support** | — | Risk of split behavior | — | **Reject** unless transitional window < 30 days |

**Required V0 email flows to migrate to SendGrid (or explicitly deprecate):**

1. Team invite dispatch — V0 `cron/process-team-invites/route.ts`; V1 creates DB row only · `team.module.ts` L111–119  
2. Deal broadcast — V0 uses Resend in actions; V1 DB only · `deals.service.ts` L141–177  
3. Investor invitations — V0 `invitations/**` (10 routes, Resend throughout)  
4. Notification cron — V0 `cron/process-email-notifications/route.ts`  
5. Delivery events — V0 `webhooks/resend/route.ts` → V1 `routes/webhooks/sendgrid/handler.ts` (not mounted)  
6. Inbound parse — V0 `webhooks/emails/route.ts`  
7. Stripe lifecycle emails — V0 `stripe/webhook/route.ts` uses Resend; V1 webhook does not send email · `payments.service.ts`

---

## Deployment / CI Parity

| Item | V0 | V1 | Notes |
|------|----|----|-------|
| Firebase Hosting deploy | ✅ `firebase-hosting-merge.yml` | ❌ not in V1 repo | V1 uses `verify.yml` only |
| Cloud Build Nest deploy | ❌ | ✅ `cloudbuild.yaml` → `paperworking-api` | Production API host |
| Secret Manager bindings | Firebase secrets in apphosting | Documented; not verifiable in repo | EXTERNAL CONFIG |
| Firestore rules deploy | ✅ V0 CI | ⚠️ V1 `firestore.rules` deny-all writes | Migration phase rules |

---

## Summary Counts

| Category | Count |
|----------|------:|
| Integrations fully active in V1 production | 2 (Supabase Auth, Supabase Postgres) + Stripe partial |
| Integrations partially active | 4 (Stripe, Firebase Auth flag, RentCast admin, financial-engine lib) |
| Integrations legacy-only (handler exists, not mounted) | 18 |
| Integrations missing / scaffold only | 6 (Firestore writes, Storage, Redis, Neon runtime, Resend, dual-write) |

---

## Critical Integration Gaps (P0)

1. **No production email provider mounted** — product cannot send invites, broadcasts, or notification mail  
2. **No cron jobs mounted** — team invites, email notifications, Plaid sync, bridge sync inactive  
3. **No inbound email / delivery webhooks mounted** — reply flows broken  
4. **No Firebase Storage** — uploads are synthetic · `routes/upload/handler.ts`  
5. **Stripe billing incomplete** — invoices/payment-methods return `[]` · `payments.service.ts` L79–89  
6. **V0 Resend → V1 SendGrid migration undecided in runtime** (decided in docs; not implemented)

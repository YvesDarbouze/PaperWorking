# Current Architecture Audit — PaperWorking (As-Is)

**Audit date:** 2026-08-20  
**Source branch inspected:** `Yves/feature-development` @ `0e0058ab`  
**Audit scope:** Read-only inspection of existing codebase at repository root  
**Migration branch:** `vu-migrate-architecture`

---

## 1. Executive Summary

PaperWorking is a **full-stack monolithic Next.js application** deployed on **Firebase App Hosting → Google Cloud Run**. It is **not** split into separate frontend/backend repositories.

| Layer | Technology |
|---|---|
| Language | **TypeScript** (primary), JavaScript (scripts/tests) |
| Runtime | **Node.js 22** |
| Framework | **Next.js 16.2** (App Router) |
| UI | **React 19**, Tailwind CSS 4 |
| SQL DB | **PostgreSQL** (Neon) via **Prisma 7.7** |
| Document DB | **Firebase Firestore** |
| Cache/Queue | **Redis** (ioredis) |
| Object Storage | **Firebase Storage** |
| Auth | **Firebase Authentication** + session cookies |
| Production URL | `https://paperworking.co` |

**Scale:** ~253 API routes, ~155 pages, 66 Prisma models, 366 unit test files, 133 E2E spec files.

---

## 2. Repository Structure

```
repository-root/                    ← EXISTING (READ-ONLY)
├── src/
│   ├── app/                        # Next.js App Router (pages + API)
│   ├── components/                 # React UI
│   ├── lib/                        # Business logic, services, adapters
│   ├── actions/                    # Server Actions
│   ├── context/                    # React context (AuthContext)
│   ├── hooks/                      # Client hooks
│   ├── types/                      # TypeScript types
│   ├── middleware.ts               # Edge middleware entry
│   └── proxy.ts                    # Route gating logic
├── prisma/                         # PostgreSQL schema + migrations
├── firebase.json                   # Firestore, Storage, App Hosting
├── apphosting.yaml                 # Production env vars (Cloud Run)
├── cloudbuild.yaml                 # Alternative Cloud Run deploy
├── Dockerfile                      # Container build
├── .github/workflows/              # CI/CD (Firebase Hosting)
├── e2e/                            # Playwright tests
├── tests/load/k6/                  # Load tests
├── persona-swarm/                  # Autonomous test harness
└── docs/                           # Specs, walkthroughs, runbooks
```

---

## 3. Frontend (Current)

### Stack
- **Next.js App Router** — SSR/SSG/CSR hybrid
- **React 19.2** + **TypeScript/TSX**
- **Tailwind CSS 4**
- **State:** Zustand, TanStack Query, SWR, React Context
- **Forms:** React Hook Form + Zod 4
- **Charts:** Chart.js, Recharts, ECharts
- **Animation:** Framer Motion

### Major UI Surfaces
| Surface | Route prefix | Key paths |
|---|---|---|
| Public marketing | `/`, `/support`, `/contact` | `src/app/(marketing)/` |
| Authenticated app | `/dashboard/*` | `src/app/dashboard/` |
| Project workspace | `/project/[id]/*` | scorecard, insights, reports |
| Deals marketplace | `/deals/*`, `/dashboard/marketplace` | subscription-gated |
| Vendor portal | `/vendor-portal/*` | vendor-only |
| Admin portal | `/admin/*` | **same domain, no subdomain** |
| Auth flows | `/auth/*`, `/login`, `/signup` | Firebase client auth |
| Invest / crowdfunding | `/invest/[token]` | deal invitations |

### Client Auth
- `src/context/AuthContext.tsx` — Firebase client SDK
- `src/lib/firebase/config.ts` — client Firebase init
- Session established via `POST /api/auth/session` → `__session` cookie

---

## 4. Backend / API (Current)

Backend lives **inside Next.js** — not a separate service.

### API Organization
- **253 route handlers** under `src/app/api/`
- **76 top-level API domains**
- Largest subtree: `projects/` (44 nested routes)

### Patterns
| Pattern | Examples |
|---|---|
| Resource CRUD | `projects/[id]/…`, `invitations/[token]/…` |
| Catch-all routers | `billing/[[...action]]`, `team/[[...action]]` |
| Webhooks | `webhooks/sendgrid`, `webhooks/plaid`, `webhooks/stripe` |
| Cron (17 routes) | `cron/sync-transactions`, `cron/process-email-notifications` |
| Health | `api/health` — Postgres + Firestore probes |

### Server Logic Layers
| Layer | Location | Role |
|---|---|---|
| Route handlers | `src/app/api/**/route.ts` | HTTP entry points |
| Server Actions | `src/actions/` | Form mutations, admin ops |
| Services | `src/lib/services/` | Domain services |
| Adapters | `src/lib/email/adapters/`, `src/lib/plaid/` | Third-party integrations |
| Guards | `src/lib/firebase-admin/*-guard.ts` | AuthZ on API |
| Engines | `src/lib/engine/`, `src/lib/metrics/` | Communication, metrics |

### Middleware
- `src/middleware.ts` → re-exports `src/proxy.ts`
- Gates: `/admin/*`, `/dashboard/*`, `/vendor-portal/*`, `/deals/*`
- Subscription check: `requireSubscriber`
- Vendor block: `requireNonVendor`

---

## 5. Database Architecture (Current)

### Dual-database model (critical migration consideration)

| Store | Technology | Primary use |
|---|---|---|
| **PostgreSQL** | Prisma ORM + Neon serverless | REIL pipeline, banking/Plaid, financial ledger, marketplace deals, admin audit |
| **Firestore** | Firebase SDK | Live projects, users, orgs, notifications, marketplace listings, real-time |
| **Redis** | ioredis | Metric cache, job queue |
| **Firebase Storage** | Firebase SDK | Documents, receipts, files |

### Prisma (66 models) — major groups
- **REIL:** `ReilProject`, `ReilPropertyFacts`, `ReilFundingPlan`, `ReilLoanRecord`, `HoldCostRecord`, …
- **Banking:** `PlaidConnection`, `FinancialTransaction`, `BankConnection`, `Transaction`
- **Marketplace:** `Deal`, `DealInvitation`, `MarketplaceListing`, `InvestmentCommitment`
- **Legacy mirror:** `User`, `Project`, `Message`, `Subscription`
- **Rehab/Vendor:** `RehabProject`, `Vendor`, `VendorBid`
- **Admin:** `AdminAuditLog`, `JobRecord`

### Firestore collections (representative)
- `projects` — primary deal documents (100+ fields)
- `users`, `organizations`
- `dealListings`, `dealInvitations`, `notifications`
- Subcollections: `ledgerItems`, `phaseSnapshots`, `activityLog`, `vendorRequests`

### Data duplication risk
Many entities exist in **both** Firestore and PostgreSQL with partial sync. APIs sometimes query Prisma first, then fall back to Firestore (`src/app/api/insights/route.ts`).

---

## 6. Authentication & Authorization

See [RBAC.md](./RBAC.md) for full detail.

**Summary:**
- Firebase Auth (email/password, Google, Facebook, magic link, MFA)
- Firestore user profile at `/users/{uid}`
- Account tiers: `investor`, `investment_team`, `vendor`, `admin` (Master Admin)
- Platform roles: `Platform Admin`, `Lead Investor`, `Admin`, `Vendor`, …
- Admin at `/admin` (not a subdomain)

**Key files:**
- `src/lib/firebase/admin.ts`, `src/lib/firebase-admin/auth-guard.ts`
- `src/lib/permissions.ts`, `src/lib/authz/authorize.ts`
- `docs/spec/ROLE-HIERARCHY.md`

---

## 7. Admin Portal

| Route | Purpose |
|---|---|
| `/admin` | Overview |
| `/admin/users` | User management |
| `/admin/subscriptions` | Billing |
| `/admin/tickets` | Support |
| `/admin/audit` | Audit log |
| `/admin/analytics` | Analytics |
| `/admin/marketplace` | Marketplace moderation |
| `/admin/agent-crew` | Synthetic agent dashboard |

**API:** `/api/admin/*` with `requireAdminAuth()`  
**Server actions:** `src/actions/admin*.ts` with `authorize()`

---

## 8. Marketplace & Deals

- **UI:** `/dashboard/marketplace`, `/deals/*`
- **API:** `/api/marketplace/*`, `/api/deals/*`
- **Prisma:** `Deal`, `DealInvitation`, `MarketplaceListing`
- **Firestore:** `dealListings`, `dealInvitations`
- **Gating:** Subscription required (`requireSubscriber`), vendors blocked from deals
- **Synthetic agents:** 5 agent personas, 15 listings (seed scripts + tests)

---

## 9. Stripe (Billing)

| Component | Path |
|---|---|
| Checkout API | `src/app/api/stripe/checkout/route.ts` |
| Webhook | `src/app/api/stripe/webhook/route.ts` |
| Plans | `src/lib/stripe/plans.ts` |
| Mock fallback | `src/lib/stripe/mockCheckout.ts` (when no key) |
| Admin billing | `src/actions/adminBilling.ts` |

**Env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (6 price IDs in apphosting.yaml)

---

## 10. SendGrid / Email (EM Series v2)

| Component | Path |
|---|---|
| Provider factory | `src/lib/email/getEmailProvider.ts` |
| SendGrid adapter | `src/lib/email/adapters/SendGridEmailAdapter.ts` |
| Communication engine | `src/lib/engine/CommunicationEngine.ts` |
| Template registry | `src/lib/email/templateRegistry.ts` |
| Webhook (ECDSA) | `src/app/api/webhooks/sendgrid/route.ts` |
| Inbound email | `src/app/api/webhooks/emails/route.ts` |

**Resend removed** in EM Series v2. Stale `RESEND_API_KEY` references remain in a few state machine files (non-SDK).

**Production gap:** SendGrid env vars **not wired** in `apphosting.yaml` (audit 2026-08-15).

---

## 11. Firebase

| Service | Config |
|---|---|
| Auth | Client + Admin SDK |
| Firestore | `firestore.rules`, `firestore.indexes.json` |
| Storage | `storage.rules`, bucket `paperworking-97055.firebasestorage.app` |
| App Hosting | Backend `paperworker`, project `paperworking-97055` |

**Client env:** `NEXT_PUBLIC_FIREBASE_*` (in apphosting.yaml)  
**Server env:** `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Secret Manager)

---

## 12. Deployment & CI/CD

### Production path (active)
1. Push to `main` → GitHub Actions `firebase-hosting-merge.yml`
2. `npm ci` → ESLint → `npm run build`
3. Deploy Firestore/Storage rules
4. Firebase App Hosting live deploy (~7 min hosting step)
5. Parallel: Firebase App Hosting Rollout check

### Alternative path (documented, not CI-automated)
- `gcloud builds submit --config cloudbuild.yaml` → Cloud Run `us-east4`

### Config files
| File | Purpose |
|---|---|
| `apphosting.yaml` | App Hosting env + secrets |
| `firebase.json` | Firebase services config |
| `cloudbuild.yaml` | Docker → Artifact Registry → Cloud Run |
| `Dockerfile` | Node 20 Alpine standalone build |
| `vercel.json` | Cron schedule only (Vercel banned for prod per DEPLOYS.md) |

---

## 13. Financial Calculations & Insights

See [INSIGHTS.md](./INSIGHTS.md).

**Authoritative engine (intended):** `src/lib/metrics/deriveAllProjectMetrics.ts`

**Problem:** Engine called from **20+ non-test files**; some UI/components may still contain inline calculations (technical debt).

**Two metric systems coexist:**
1. Per-project engine (10 scorecard + 24 insights)
2. Portfolio `METRIC_REGISTRY_33` (lifecycle-phase KPIs)

---

## 14. Reports

| Component | Path |
|---|---|
| Report engine | `src/lib/reports/reportEngine.ts` |
| Report builder | `src/lib/reports/report-builder.ts` |
| Portfolio aggregation | `src/lib/reports/aggregation.ts` |
| PDF/CSV | `pdfGenerator.ts`, `csvBuilder.ts`, `cpaPackageEngine.ts` |
| UI | `/dashboard/reports`, `/project/[id]/reports` |

Reports should consume `deriveAllProjectMetrics()` — verify during migration.

---

## 15. REIL Lifecycle

See [REIL.md](./REIL.md).

**Code phases:** `acquisition` | `purchase` | `hold` | `exit`  
**Business target (Yves):** ACQUISITION | FUND | HOLD | EXIT

**Naming divergence:** Code uses `purchase` where business spec says `FUND`. Migration must reconcile terminology.

---

## 16. Testing

| Type | Count / Location |
|---|---|
| Unit (Jest) | ~366 test files under `src/` |
| Integration | `jest.config.integration.js` |
| E2E (Playwright) | ~133 specs in `e2e/` |
| Load (k6) | `tests/load/k6/` |
| Persona swarm | `persona-swarm/` (50 agents) |
| Firestore rules | `firestore-rules-tests/` |

**DB-dependent tests:** `seedAgentCrew`, `listings`, `agent-messages`, `admin-dashboard` require Neon + seeded data.

---

## 17. Environment Variables

**Template:** `.env.example` (~230 lines, comprehensive)

**Production wired (apphosting.yaml):** Firebase, Stripe, Bridge MLS, DATABASE_URL, REDIS_URL, Google Places, WORKER_SECRET

**Production NOT wired:** SendGrid/EM Series vars (SENDGRID_API_KEY, SYSTEM_EMAIL_PROVIDER, etc.)

---

## 18. Mock Data & Feature Flags

| Flag | Purpose |
|---|---|
| `ENABLE_MOCK_AUTH` | Dev auth bypass |
| `STRIPE_PROVIDER=mock` | Mock checkout |
| `SYSTEM_EMAIL_PROVIDER=mock` | Mock email |
| `BANKING_PROVIDER=mock` | Mock Plaid |
| `PROPERTY_DATA_PROVIDER=mock` | Synthetic property data |
| `NEXT_PUBLIC_DEMO_MODE` | Demo labels/simulations |
| `ESIGN_PROVIDER=mock` | Mock DocuSign |

**Synthetic data:** Agent crew (5 agents, 15 projects/listings), canonical seed deal in metrics fixtures.

---

## 19. Technical Debt & Migration Risks

### High priority
1. **Dual database** — Firestore + PostgreSQL with overlapping entities and inconsistent sync
2. **Phase naming mismatch** — `purchase` vs `FUND` in business spec
3. **Dual metric systems** — per-project engine vs portfolio registry
4. **Monolith coupling** — 253 API routes in one Next.js app
5. **Inline financial math** — potential duplication outside `deriveAllProjectMetrics`
6. **Legacy models** — `User`/`Project` (Prisma) vs `AppUser`/`ReilProject`
7. **SendGrid not wired in production** apphosting.yaml

### Medium priority
8. Residual `RESEND_API_KEY` references in state machines
9. Large eslint suppressions file (`eslint-suppressions.json`)
10. `src/pages_backup/` legacy Pages Router remnants
11. Persona-swarm artifacts committed to repo
12. Skills folder (~1000+ agent skill files) inflates repo size

### Migration-specific risks
13. **Must not touch production DB** during Phase 0+
14. **Read-only source** — accidental edits to root codebase
15. **Behavior preservation** — 3000+ tests as regression baseline
16. **Auth cookie contract** — session cookies must remain compatible during transition

---

## 20. Important Dependencies (package.json)

| Category | Packages |
|---|---|
| Core | next@16.2.11, react@19.2.4, typescript@5 |
| Database | @prisma/client@7.7, @prisma/adapter-neon |
| Firebase | firebase@12.12, firebase-admin@13.8 |
| Payments | stripe@22, @stripe/react-stripe-js |
| Banking | plaid@20, react-plaid-link |
| Email | SendGrid REST (no SDK — fetch-based) |
| E-sign | docusign-esign@9 |
| Observability | @sentry/nextjs, posthog-js |
| Testing | jest@29, @playwright/test@1.60 |

---

## 21. Reference File Index

| Domain | Key paths |
|---|---|
| Metrics engine | `src/lib/metrics/deriveAllProjectMetrics.ts` |
| Metric registry | `src/lib/metrics/registry.ts` |
| Permissions | `src/lib/permissions.ts` |
| Phase engine | `src/lib/phase-engine.ts` |
| Wizard | `src/lib/wizard-engine/questionTree.ts` |
| Project schema (Zod) | `src/lib/schemas/projectSchema.ts` |
| Prisma schema | `prisma/schema.prisma` |
| Role spec | `docs/spec/ROLE-HIERARCHY.md` |
| EM Series spec | `docs/spec/em-series-transactional-email-prompts.md` |
| Deploy guide | `DEPLOYS.md` |
| Integrations matrix | `INTEGRATIONS.md` |

---

*This document describes the existing system only. No files outside `vu-migrate-architecture/` were modified during this audit.*

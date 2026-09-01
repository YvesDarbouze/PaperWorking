# V0 → V1 Feature Parity Matrix

**Generated:** 2026-09-01  
**Mode:** READ-ONLY inventory. A feature is production-available **only** if mounted via Nest `AppModule` or Next `app/api/**/route.ts`.  

## Route Counts

| Metric | Count |
|--------|------:|
| V0 `route.ts` files | 167 |
| V0 HTTP method rows (below) | 203 |
| V1 Nest `@Controller` classes | 17 |
| V1 Nest HTTP decorators | ~79 |
| V1 legacy `handler.ts` files | 202 |
| V1 Next API adapters | 3 |

### Mount status (V0 method rows → V1)

- **LEGACY:** 178
- **PROD:** 24
- **PROD+NEXT:** 1

### Implementation class

- **LEGACY:** 175
- **MISSING:** 1
- **MOCK:** 2
- **PARTIAL:** 4
- **REAL:** 18
- **STUB:** 3

### Behavioral equivalence

- **NO:** 181
- **PARTIAL:** 4
- **YES:** 18


## Domain Rollup

| Domain | PROD | PROD+NEXT | LEGACY |
|--------|-----:|----------:|-------:|
| Account/GDPR | 0 | 0 | 5 |
| Admin | 5 | 0 | 0 |
| Authentication | 2 | 0 | 2 |
| Billing/Stripe | 7 | 0 | 0 |
| Bridge MLS | 0 | 0 | 8 |
| Changelog | 0 | 0 | 1 |
| Config | 0 | 0 | 2 |
| Cron/Scheduled Jobs | 0 | 0 | 13 |
| Dashboard | 0 | 0 | 1 |
| DocuSign | 0 | 0 | 2 |
| Documents | 0 | 0 | 1 |
| E2E Test | 0 | 0 | 2 |
| Email | 0 | 0 | 2 |
| Entitlements | 0 | 0 | 1 |
| Events | 0 | 0 | 1 |
| Google Calendar | 0 | 0 | 4 |
| Google Drive | 0 | 0 | 1 |
| Google Maps/Places | 0 | 0 | 7 |
| Health | 0 | 1 | 0 |
| Identity | 0 | 0 | 5 |
| Inbox/Notifications | 1 | 0 | 5 |
| Insights | 3 | 0 | 0 |
| Integrations | 0 | 0 | 4 |
| Investor Access | 0 | 0 | 3 |
| Investor Invitations | 0 | 0 | 11 |
| MCP | 0 | 0 | 2 |
| Marketing | 0 | 0 | 1 |
| Plaid/Banking | 0 | 0 | 4 |
| Presence | 0 | 0 | 1 |
| Project Lifecycle | 0 | 0 | 3 |
| Projects | 2 | 0 | 46 |
| Property Data | 0 | 0 | 5 |
| REIL/Financial | 0 | 0 | 19 |
| Reports | 1 | 0 | 2 |
| Tax | 0 | 0 | 5 |
| Vendor Portal | 2 | 0 | 0 |
| Vendors | 1 | 0 | 1 |
| Webhooks | 0 | 0 | 6 |
| Worker/Queue | 0 | 0 | 2 |

## P0 Security Findings (document before fix)

| ID | Issue | File | Action |
|----|-------|------|--------|
| SEC-01 | Default `BROADCAST_TOKEN_SECRET` fallback `'paperworking_secret'` | `apps/api/src/lib/deals/broadcast-token.ts` L23–27 | Require env in production; fail closed |
| SEC-02 | Cross-origin session requires `COOKIE_SAMESITE=none` + `CORS_ORIGINS` | `apps/api/src/auth/auth.service.ts`, `main.ts` | Production env validation |
| SEC-03 | `accountType` self-select on first login (business policy) | `apps/api/src/auth/auth.service.ts` | Document/decide |
| SEC-04 | Marketplace investor profile IDOR | `apps/api/src/marketplace/marketplace.service.ts` | Filter/limit fields |
| SEC-05 | Global vendor-services catalog leak | `apps/api/src/vendors/vendors.service.ts` | Scope by org or mark public |

## V1-Only Production Routes (not in V0 HTTP surface)

These are mounted on Nest but have **no** V0 `route.ts` equivalent:

| Route | Module | File |
|-------|--------|------|
| `GET /api/auth/me` | AuthModule | `routes/auth/me/handler.ts` |
| `GET /api/auth/sessions` | AuthModule | `routes/auth/sessions/handler.ts` |
| `GET/POST /api/organizations` | OrganizationsModule | `organizations.module.ts` |
| `GET /api/deals`, `POST /api/deals` | DealsModule | `deals.controller.ts` |
| `GET/POST /api/deal-invitations` | DealsModule | `deals.controller.ts` |
| `GET/POST /api/messages`, threads | MessagesModule | `messages.module.ts` |
| `GET/POST /api/task-assignments` | TasksModule | `tasks.module.ts` |
| `GET /api/portfolio/metrics` | PortfolioModule | `portfolio.module.ts` |
| `ALL /api/settings/*` | SettingsModule | `settings.module.ts` |
| `ALL /api/billing/*` | PaymentsModule | `payments.controller.ts` |

## Complete V0 → V1 Matrix

| Method | V0 Route | Domain | V0 Provider | V1 Module | V1 File | Mount | FE | DB | Impl | Equiv | AuthZ | AuthN | Pri | Phase |
|--------|----------|--------|-------------|-----------|---------|-------|----|----|------|-------|-------|-------|-----|-------|
| GET | `/api/account/data/delete` | Account/GDPR | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/account/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/account/data/delete` | Account/GDPR | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/account/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/account/data/download` | Account/GDPR | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/account/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| DELETE | `/api/user/gdpr` | Account/GDPR | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/user/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/user/gdpr` | Account/GDPR | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/user/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/admin/lender-checklists` | Admin | Firestore+Prisma (V0 dual DB) | AdminModule | `apps/api/src/admin/admin.module.ts` | PROD | YES | YES | REAL | YES | admin | session | P2 | Phase 9/14 |
| PUT | `/api/admin/lender-checklists` | Admin | Firestore+Prisma (V0 dual DB) | AdminModule | `apps/api/src/admin/admin.module.ts` | PROD | YES | YES | REAL | YES | admin | session | P2 | Phase 9/14 |
| GET | `/api/admin/lender-rates` | Admin | Firestore+Prisma (V0 dual DB) | AdminModule | `apps/api/src/admin/admin.module.ts` | PROD | YES | YES | REAL | YES | admin | session | P2 | Phase 9/14 |
| PUT | `/api/admin/lender-rates` | Admin | Firestore+Prisma (V0 dual DB) | AdminModule | `apps/api/src/admin/admin.module.ts` | PROD | YES | YES | REAL | YES | admin | session | P2 | Phase 9/14 |
| GET | `/api/admin/rentcast-usage` | Admin | Firestore+Prisma (V0 dual DB) | AdminModule | `apps/api/src/admin/admin.module.ts` | PROD | YES | YES | REAL | YES | admin | session | P2 | Phase 9/14 |
| GET | `/api/auth/ip` | Authentication | Firebase Auth | — | `apps/api/src/routes/auth/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 9/F |
| POST | `/api/auth/revoke` | Authentication | Firebase Auth | — | `apps/api/src/routes/auth/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 9/F |
| DELETE | `/api/auth/session` | Authentication | Firebase Auth | AuthModule | `apps/api/src/auth/auth.controller.ts` | PROD | YES | YES | REAL | YES | CsrfGuard | session | P2 | Phase 9/F |
| POST | `/api/auth/session` | Authentication | Firebase Auth | AuthModule | `apps/api/src/auth/auth.controller.ts` | PROD | YES | YES | REAL | YES | CsrfGuard | public | P2 | Phase 9/F |
| POST | `/api/stripe/checkout` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.controller.ts` | PROD | YES | YES | REAL | YES | billing | session | P2 | Phase 5 |
| POST | `/api/stripe/invoices` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.service.ts` | PROD | YES | YES | STUB | NO | billing | session | P0 | Phase 5 |
| POST | `/api/stripe/payment-method` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.service.ts` | PROD | YES | YES | STUB | NO | billing.manage | session | P0 | Phase 5 |
| POST | `/api/stripe/portal` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.controller.ts` | PROD | YES | YES | REAL | YES | billing | session | P2 | Phase 5 |
| GET | `/api/stripe/session-status` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.controller.ts` | PROD | YES | YES | REAL | YES | session owner | session | P2 | Phase 5 |
| POST | `/api/stripe/subscription` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.service.ts` | PROD | YES | YES | STUB | NO | billing.manage | session | P0 | Phase 5 |
| POST | `/api/stripe/webhook` | Billing/Stripe | Stripe | PaymentsModule | `apps/api/src/payments/payments.service.ts` | PROD | YES | YES | REAL | YES | stripe sig | public | P2 | Phase 5 |
| GET | `/api/bridge/agents` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/bridge/metadata` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/bridge/offices` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/bridge/openhouses` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/bridge/search` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/bridge/sync` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/bridge/sync` | Bridge MLS | Bridge MLS | — | `apps/api/src/routes/bridge/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/mls/search` | Bridge MLS | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/mls/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/changelog/metadata` | Changelog | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/changelog/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P3 | Phase 12 |
| GET | `/api/config/attorney-states` | Config | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/config/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| PUT | `/api/config/attorney-states` | Config | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/config/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/cron/bridge-sync` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/lender-package-reminders` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/lifecycle-alerts` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/process-daily-kpis` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/process-deletions` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/process-email-notifications` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 7 |
| GET | `/api/cron/process-team-invites` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 7 |
| GET | `/api/cron/refresh-place-ids` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/send-digest` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| POST | `/api/cron/send-digest` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/snapshots` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/cron/sync-transactions` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| POST | `/api/cron/sync-transactions` | Cron/Scheduled Jobs | Cloud Scheduler | — | `apps/api/src/routes/cron/handlers.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 7 |
| GET | `/api/dashboard` | Dashboard | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/dashboard/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/esign/create` | DocuSign | DocuSign | — | `apps/api/src/routes/esign/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/esign/status/[envelopeId]` | DocuSign | DocuSign | — | `apps/api/src/routes/esign/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/loi/generate` | Documents | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/loi/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/e2e/follows` | E2E Test | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/e2e/**/handler.ts` | LEGACY | NO | PARTIAL | MOCK | NO | varies | varies | P3 | Phase 12 |
| POST | `/api/e2e/follows` | E2E Test | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/e2e/**/handler.ts` | LEGACY | NO | PARTIAL | MOCK | NO | varies | varies | P3 | Phase 12 |
| POST | `/api/emails/send` | Email | Resend | — | `apps/api/src/routes/emails/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 6 |
| POST | `/api/unsubscribe` | Email | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/unsubscribe/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 6 |
| GET | `/api/entitlements/project-count` | Entitlements | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/entitlements/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/events` | Events | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/events/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/calendar/auth` | Google Calendar | Google Calendar | — | `apps/api/src/routes/calendar/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/calendar/callback` | Google Calendar | Google Calendar | — | `apps/api/src/routes/calendar/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/calendar/events` | Google Calendar | Google Calendar | — | `apps/api/src/routes/calendar/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/calendar/sync` | Google Calendar | Google Calendar | — | `apps/api/src/routes/calendar/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/drive/provision` | Google Drive | Google Drive | — | `apps/api/src/routes/drive/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/map-tile` | Google Maps/Places | Google Maps | — | `apps/api/src/routes/map-tile/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/places/autocomplete` | Google Maps/Places | Google Places | — | `apps/api/src/routes/places/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/places/autocomplete-public` | Google Maps/Places | Google Places | — | `apps/api/src/routes/places/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/places/details` | Google Maps/Places | Google Places | — | `apps/api/src/routes/places/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/places/geocode` | Google Maps/Places | Google Places | — | `apps/api/src/routes/places/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/places/validate` | Google Maps/Places | Google Places | — | `apps/api/src/routes/places/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/street-view` | Google Maps/Places | Google Maps | — | `apps/api/src/routes/street-view/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/health` | Health | Firestore+Prisma (V0 dual DB) | HealthModule | `apps/api/src/health/health.controller.ts` | PROD+NEXT | YES | YES | REAL | YES | public | none | P1 | Phase 9/14 |
| POST | `/api/identity/appeal` | Identity | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/identity/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/identity/claim/bind-token` | Identity | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/identity/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/identity/claim/start` | Identity | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/identity/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/identity/claim/verify` | Identity | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/identity/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/identity/report-spam` | Identity | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/identity/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/inbox` | Inbox/Notifications | Firestore+Prisma (V0 dual DB) | InboxModule | `apps/api/src/inbox/inbox.module.ts` | PROD | YES | YES | REAL | YES | recipient | session | P2 | Phase 9/14 |
| DELETE | `/api/inbox/[id]` | Inbox/Notifications | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/inbox/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| PATCH | `/api/inbox/[id]` | Inbox/Notifications | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/inbox/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/inbox/[id]/actions` | Inbox/Notifications | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/inbox/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/inbox/backfill` | Inbox/Notifications | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/inbox/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/notifications/deadline-alert` | Inbox/Notifications | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/notifications/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/insights/market` | Insights | Firestore+Prisma (V0 dual DB) | InsightsModule | `apps/api/src/insights/insights.module.ts` | PROD | YES | YES | PARTIAL | PARTIAL | session | session | P2 | Phase 9/14 |
| GET | `/api/insights/metrics` | Insights | Firestore+Prisma (V0 dual DB) | InsightsModule | `apps/api/src/insights/insights.module.ts` | PROD | YES | YES | PARTIAL | PARTIAL | session | session | P2 | Phase 9/14 |
| GET | `/api/insights/trends` | Insights | Firestore+Prisma (V0 dual DB) | InsightsModule | `apps/api/src/insights/insights.module.ts` | PROD | YES | YES | PARTIAL | PARTIAL | session | session | P2 | Phase 9/14 |
| GET | `/api/integrations/google-drive/authorize` | Integrations | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/integrations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/integrations/google-drive/callback` | Integrations | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/integrations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/integrations/mls/connect` | Integrations | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/integrations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/integrations/status` | Integrations | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/integrations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/invest/[token]` | Investor Access | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/invest/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/invest/[token]` | Investor Access | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/invest/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/investor/timeline` | Investor Access | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/investor/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/invitations/[token]` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/[token]/ask` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| DELETE | `/api/invitations/[token]/indication` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/[token]/indication` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/[token]/subscribe` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/[token]/subscription` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| GET | `/api/invitations/[token]/updates` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| GET | `/api/invitations/accept` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/broadcast` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/respond` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| POST | `/api/invitations/send` | Investor Invitations | Resend+Firestore | — | `apps/api/src/routes/invitations/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 8 |
| GET | `/api/mcp/[transport]` | MCP | MCP API Key | — | `apps/api/src/routes/mcp/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/mcp/[transport]` | MCP | MCP API Key | — | `apps/api/src/routes/mcp/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/waitlist` | Marketing | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/waitlist/**/handler.ts` | LEGACY | NO | PARTIAL | MISSING | NO | varies | varies | P3 | Phase 12 |
| POST | `/api/plaid/create-link-token` | Plaid/Banking | Plaid | — | `apps/api/src/routes/plaid/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 11 |
| POST | `/api/plaid/exchange` | Plaid/Banking | Plaid | — | `apps/api/src/routes/plaid/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 11 |
| PATCH | `/api/transactions/[plaidId]/attribution` | Plaid/Banking | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/transactions/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 11 |
| POST | `/api/transactions/[plaidId]/attribution` | Plaid/Banking | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/transactions/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 11 |
| POST | `/api/presence/heartbeat` | Presence | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/presence/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/closing/title-search` | Project Lifecycle | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/closing/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/exit/complete` | Project Lifecycle | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/exit/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/fund/close-deal` | Project Lifecycle | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/fund/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/projects` | Projects | Firestore+Prisma (V0 dual DB) | ProjectsModule | `apps/api/src/projects/projects.controller.ts` | PROD | YES | YES | REAL | YES | projects.read | session | P2 | Phase 13 |
| POST | `/api/projects` | Projects | Firestore+Prisma (V0 dual DB) | ProjectsModule | `apps/api/src/projects/projects.controller.ts` | PROD | YES | YES | REAL | YES | projects.create | session | P2 | Phase 13 |
| PATCH | `/api/projects/[id]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/acquisition` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/capital-stack/export` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/commit` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/commitments` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/commitments` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| DELETE | `/api/projects/[id]/commitments/[cId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/commitments/[cId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/dealUpdates` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/dealUpdates` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| DELETE | `/api/projects/[id]/dealUpdates/[updateId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/documents` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/documents` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/documents/[docId]/download` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/equity-parties` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/equity-parties` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/exit` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/funding-sources` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/hold` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/hold/auto-advance` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/hold/registry` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/hold/registry` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/inquiries/[inquiryId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/inquiries/[inquiryId]/reply` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/invitations/[invitationId]/exchange` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/lender-package` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/lender-package` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| DELETE | `/api/projects/[id]/lender-package/[itemId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/lender-package/[itemId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/lender-package/debt-folder` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/loan-estimates` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/loan-estimates` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| DELETE | `/api/projects/[id]/loan-estimates/[estimateId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/loan-estimates/[estimateId]/choose` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/loans` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/loans` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/loans/[loanId]` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/loans/hard-money-terms` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/loans/lock` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/loans/sba504` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/[id]/proof-of-funds` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/purchase` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| PATCH | `/api/projects/[id]/team-slots` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/projects/[id]/timeline` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/rehab` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| POST | `/api/projects/todos` | Projects | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/projects/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 13 |
| GET | `/api/lawyers` | Property Data | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/lawyers/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/market-vitals` | Property Data | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/market-vitals/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/permits` | Property Data | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/permits/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/rent-history/import` | Property Data | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/rent-history/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/zoning-scan` | Property Data | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/zoning-scan/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/reil/cron/refresh` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/listings` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/market-stats` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects/[id]` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| PATCH | `/api/reil/projects/[id]` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects/[id]/assignments` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects/[id]/assignments` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| PATCH | `/api/reil/projects/[id]/assignments/[aid]` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects/[id]/closing-ledger/export` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects/[id]/invite` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects/[id]/property` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects/[id]/status` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects/[id]/status` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects/[id]/terms` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects/[id]/terms` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| GET | `/api/reil/projects/[id]/valuation` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reil/projects/[id]/valuation` | REIL/Financial | Neon/Prisma/financial-engine | — | `apps/api/src/routes/reil/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 10 |
| POST | `/api/reporting/export` | Reports | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/reporting/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/reports/[period]` | Reports | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/reports/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/reports/generate` | Reports | Firestore+Prisma (V0 dual DB) | ReportsModule | `apps/api/src/reports/reports.module.ts` | PROD | YES | YES | PARTIAL | PARTIAL | session | session | P2 | Phase 9/14 |
| POST | `/api/tax/export` | Tax | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/tax/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/tax/share` | Tax | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/tax/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/tax/share` | Tax | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/tax/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/tax/share/[token]` | Tax | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/tax/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/tax/share/revoke` | Tax | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/tax/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| GET | `/api/vendor-portal/requests` | Vendor Portal | Firestore+Prisma (V0 dual DB) | VendorsModule | `apps/api/src/vendors/vendors.controller.ts` | PROD | YES | YES | REAL | YES | vendor | session | P2 | Phase 9/14 |
| PUT | `/api/vendor-portal/requests` | Vendor Portal | Firestore+Prisma (V0 dual DB) | VendorsModule | `apps/api/src/vendors/vendors.controller.ts` | PROD | YES | YES | REAL | YES | vendor | session | P2 | Phase 9/14 |
| GET | `/api/vendors` | Vendors | Firestore+Prisma (V0 dual DB) | VendorsModule | `apps/api/src/vendors/vendors.controller.ts` | PROD | YES | YES | REAL | YES | session | session | P2 | Phase 9/14 |
| POST | `/api/vendors/request` | Vendors | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/vendors/**/handler.ts` | LEGACY | YES | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/webhooks/bridge` | Webhooks | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/webhooks/webhooks/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 6/7 |
| POST | `/api/webhooks/docusign` | Webhooks | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/webhooks/webhooks/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 6/7 |
| POST | `/api/webhooks/emails` | Webhooks | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/webhooks/webhooks/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 6/7 |
| GET | `/api/webhooks/resend` | Webhooks | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/webhooks/webhooks/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 6/7 |
| POST | `/api/webhooks/resend` | Webhooks | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/webhooks/webhooks/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P0 | Phase 6/7 |
| POST | `/api/webhooks/sourcing` | Webhooks | Firestore+Prisma (V0 dual DB) | — | `apps/api/src/routes/webhooks/webhooks/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 6/7 |
| GET | `/api/worker/drain` | Worker/Queue | Worker Queue | — | `apps/api/src/routes/worker/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |
| POST | `/api/worker/drain` | Worker/Queue | Worker Queue | — | `apps/api/src/routes/worker/**/handler.ts` | LEGACY | NO | PARTIAL | LEGACY | NO | varies | varies | P1 | Phase 12 |

# Nest Full Migration Inventory v1

**Date:** 2026-08-28  
**Scope lock:** Wave 1 = 49 Next-wired routes + P0 (projects CRUD/phases/documents, Stripe checkout/portal/webhook/session-status, auth/RBAC).  
**Data lock:** Prisma → Supabase PostgreSQL (no seed SoT).  
**End state:** Single Nest host on Cloud Run; `apps/web/app/api/**` = 0; no Express bridge.

Companion: [NEST_API_CLOUD_RUN.md](./NEST_API_CLOUD_RUN.md), [API_GAP_OVERVIEW.md](./API_GAP_OVERVIEW.md).

---

## 1. Classification legend

| Class | Meaning |
|---|---|
| WAVE_1_PUBLIC | Must ship on Nest before production cutover |
| WAVE_2 | Keep handler logic; mount later |
| INTERNAL_API | Cron/worker/bridge/mcp — secrets only |
| WEBHOOK | Provider callbacks (Stripe P0 in Wave 1; others Wave 2) |
| UNUSED / NO_HTTP | Libs / e2e only |
| DEPRECATED | Zero callers after scan (none yet) |

---

## 2. Next.js routes (49) → Wave 1 acceptance

| Route | Methods | Nest Module | Auth | RBAC | Validation | DB | Status |
|---|---|---|---|---|---|---|---|
| `/api/health` | GET | HealthModule | public | — | — | probes | DONE |
| `/api/auth/session` | POST, DELETE | AuthModule | Firebase ID→cookie | — | body | User | DONE |
| `/api/auth/me` | GET | AuthModule | session | — | — | User | DONE |
| `/api/auth/sessions` | GET | AuthModule | session | — | — | — | DONE |
| `/api/auth/magic-link` | POST | AuthModule | public | — | Zod email | — | DONE |
| `/api/auth/reset-password` | POST | AuthModule | public | — | Zod email | — | DONE |
| `/api/projects` | GET | ProjectsModule | session | org | query | Project | DONE |
| `/api/projects` (create) | POST | ProjectsModule | session | org | Zod | Project | DONE |
| `/api/projects/:id` | GET, PATCH | ProjectsModule | session | org | Zod | Project | DONE |
| `/api/projects/:id/kpis/current` | GET | ProjectsModule | session | org | — | Project | DONE |
| `/api/projects/:id/phases/*` | PATCH/GET | ProjectsModule | session | org | Zod | Project/PhaseTransition | DONE |
| `/api/projects/:id/documents` | GET, POST | ProjectsModule | session | org | Zod | ProjectDocument | DONE |
| `/api/projects/:id/documents/:docId/download` | GET | ProjectsModule | session | org | — | ProjectDocument | DONE |
| `/api/projects/:id/sub/:name` | GET, POST | ProjectsModule | session | org | name allowlist | JSON cols | DONE |
| `/api/portfolio/metrics` | GET | PortfolioModule | session | — | query | Project | DONE |
| `/api/insights` | GET | InsightsModule | session | — | query | Project | DONE |
| `/api/reports/portfolio` | GET | ReportsModule | session | — | query | Project | DONE |
| `/api/reports/:period` | GET | ReportsModule | session | org | query | Transaction | DONE |
| `/api/reports/generate` | POST | ReportsModule | session | — | Zod | — | DONE |
| `/api/deals` | GET | DealsModule | session | — | query | Deal | DONE |
| `/api/deals/exists` | GET | DealsModule | optional | — | query | Deal | DONE |
| `/api/deals/broadcast` | POST | DealsModule | session | — | Zod | DealBroadcast | DONE |
| `/api/deals/reply` | POST | DealsModule | public | — | Zod | DealMessage | DONE |
| `/api/marketplace/listings` | GET | MarketplaceModule | optional | — | — | MarketplaceListing | DONE |
| `/api/marketplace/profile` | GET | MarketplaceModule | session | — | — | User | DONE |
| `/api/marketplace/investors` | GET | MarketplaceModule | optional | — | — | User | DONE |
| `/api/marketplace/investors/:id` | GET | MarketplaceModule | optional | — | — | User | DONE |
| `/api/marketplace/investors/follow` | POST | MarketplaceModule | session | — | Zod | InvestorFollower | DONE |
| `/api/vendors` | GET | VendorsModule | session | — | query | Vendor | DONE |
| `/api/vendor-services` | GET, POST | VendorsModule | session | — | Zod | Vendor | DONE |
| `/api/vendor-portal/profile` | GET, PUT | VendorsModule | session | vendor | Zod | Vendor | DONE |
| `/api/vendor-portal/requests` | GET, PUT | VendorsModule | session | vendor | Zod | VendorBid | DONE |
| `/api/deal-invitations` | GET, POST | DealsModule | session | — | Zod | DealInvitation | DONE |
| `/api/investor-followers` | GET, POST | MarketplaceModule | session | — | Zod | InvestorFollower | DONE |
| `/api/inbox` | GET, POST | InboxModule | session | — | Zod | InboxItem | DONE |
| `/api/inbox/:id` | PATCH, DELETE | InboxModule | session | owner | Zod | InboxItem | DONE |
| `/api/team/*` | GET, POST, PUT, DELETE | TeamModule | session | org admin | Zod | OrganizationMember | DONE |
| `/api/organization-members` | GET, POST | TeamModule | session | org | Zod | OrganizationMember | DONE |
| `/api/project-members` | GET, POST | TeamModule | session | org | Zod | ProjectMember | DONE |
| `/api/message-threads` | GET | MessagesModule | session | — | — | Message | DONE |
| `/api/messages` | GET, POST | MessagesModule | session | — | Zod | Message | DONE |
| `/api/messages/thread/:threadId` | GET | MessagesModule | session | — | — | Message | DONE |
| `/api/tasks/assign` | POST | TasksModule | session | org | Zod | TaskAssignment | DONE |
| `/api/task-assignments` | GET, POST | TasksModule | session | org | Zod | TaskAssignment | DONE |
| `/api/settings/*` | GET, PUT, POST, DELETE | SettingsModule | session | user/org | Zod | User/Org | DONE |
| `/api/billing/*` | * | PaymentsModule | session | — | Zod | Subscription | PENDING→Stripe |
| `/api/stripe/checkout` | POST | PaymentsModule | session | — | Zod | Subscription | DONE |
| `/api/stripe/portal` | POST | PaymentsModule | session | — | — | Subscription | DONE |
| `/api/stripe/webhook` | POST | PaymentsModule | signature | — | raw | Subscription | DONE |
| `/api/stripe/session-status` | GET | PaymentsModule | session | — | query | — | DONE |
| `/api/admin/ops` | GET | AdminModule | session | admin | query | AdminAuditLog | DONE |
| `/api/admin/agent-crew` | GET | AdminModule | session | admin | — | User | DONE |
| `/api/admin/agent-crew/:id` | GET, DELETE | AdminModule | session | admin | — | User | DONE |
| `/api/admin/agent-crew/:id/impersonate` | POST | AdminModule | session | admin | — | User | DONE |
| `/api/admin/rentcast-usage` | GET | AdminModule | session | admin | query | — | DONE |
| `/api/admin/lender-rates` | GET | AdminModule | session | admin | — | Config | DONE |
| `/api/admin/lender-checklists` | GET | AdminModule | session | admin | — | Config | DONE |

---

## 3. Handler domains (73) — non–Wave-1 classification

| Domain | Class |
|---|---|
| health, auth (session/me/sessions/magic/reset), projects (CRUD/phases/docs/sub/kpis), portfolio, insights, reports, deals (wired), marketplace, vendors, vendor-portal, billing→payments/stripe P0, settings, team, inbox, messages, tasks, admin (wired) | WAVE_1_PUBLIC |
| projects loans/lender-package/commitments/dealUpdates/rehab/todos/capital-stack/… | WAVE_2 |
| stripe invoices/payment-method/subscription (same PaymentsModule, ship with Wave 1 if FE needs) | WAVE_1_PUBLIC |
| plaid, reil, closing, exit, fund, invest, loi, deal-analyzer, reconciliations, financial*, tax, invitations (handler-only), identity, security, entitlements, integrations, esign, drive, upload, emails, notifications, calendar, changelog, config, dashboard, data, packages, workspace, bids, events, public contact, map-tile, places, mls, permits, street-view, zoning-scan, market-vitals, lawyers, rent-history, reporting export, account, user | WAVE_2 |
| cron, worker, bridge (MLS), mcp | INTERNAL_API |
| webhooks/* (non-Stripe) | WEBHOOK / WAVE_2 |
| e2e | UNUSED / NO_HTTP |
| apps/api/src/lib/**, packages/* | INTERNAL_BUSINESS_LOGIC |

**Realtime:** no Socket.IO/ws. Presence = HTTP heartbeat only (WAVE_2 if product needs).

---

## 4. Dual-host removal checklist

- [x] Nest Controllers cover every WAVE_1_PUBLIC row Status=DONE
- [x] FE uses `NEXT_PUBLIC_API_URL`
- [x] `find apps/web/app/api -name route.ts` → 0
- [x] `apps/api/src/bridge/` deleted
- [x] Prisma migrations applied on Supabase
- [x] Cloud Run smoke (local Nest verified) + CORS allowlist verified

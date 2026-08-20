# Route inventory — PaperWorking v0 vs vu-migrate (v1)

Generated from filesystem `page.tsx` / `route.ts` comparison.

| Tag | Meaning |
|---|---|
| **paperworking-v1** | Route exists in `vu-migrate-architecture/apps/web` (wired UI or API adapter). |
| **paperworking-v0** | Route exists only in legacy `PaperWorking/` — not yet as a Next page/adapter in migrate. |

Notes:
- `(dashboard)`, `(marketing)`, etc. are Next route groups — **not** part of the URL.
- Many v0 APIs already have handlers in `apps/api` but are **not** listed as v1 until an `apps/web/app/api/**/route.ts` adapter exists. See `docs/list_APIs_.md`.
- `/dashboard` in v1 redirects to `/dashboard/command-center`.

## Summary

| Surface | Both / v1 | v0-only | v1-only |
|---|---:|---:|---:|
| Pages | 37 overlap; v1 total **40** | 118 | 3 |
| HTTP `/api/*` adapters | 24 overlap; v1 total **26** | 229 | 2 |

---

## A. Page routes (UI)

### Marketing / public

| Path | Status |
|---|---|
| `/` | paperworking-v1 |
| `/about` | paperworking-v0 |
| `/aup` | paperworking-v0 |
| `/blog` | paperworking-v0 |
| `/blog/[slug]` | paperworking-v0 |
| `/careers` | paperworking-v0 |
| `/changelog` | paperworking-v0 |
| `/contact` | paperworking-v1 |
| `/cookies` | paperworking-v0 |
| `/data-deletion` | paperworking-v0 |
| `/demo` | paperworking-v0 |
| `/dpa` | paperworking-v0 |
| `/faq` | paperworking-v0 |
| `/for-pros` | paperworking-v0 |
| `/help` | paperworking-v1 |
| `/help/[slug]` | paperworking-v1 |
| `/how-it-works` | paperworking-v1 |
| `/marketplace` | paperworking-v0 |
| `/marketplaces` | paperworking-v0 |
| `/news` | paperworking-v0 |
| `/pricing` | paperworking-v1 |
| `/privacy` | paperworking-v1 |
| `/pros/[slug]` | paperworking-v0 |
| `/rehab` | paperworking-v0 |
| `/report-spam` | paperworking-v0 |
| `/search` | paperworking-v0 |
| `/status` | paperworking-v0 |
| `/subprocessors` | paperworking-v0 |
| `/support` | paperworking-v1 |
| `/support/[slug]` | paperworking-v0 |
| `/support/all` | paperworking-v0 |
| `/support/category/[id]` | paperworking-v0 |
| `/support/faq` | paperworking-v0 |
| `/support/glossary` | paperworking-v0 |
| `/support/metrics` | paperworking-v0 |
| `/takedown` | paperworking-v0 |
| `/terms` | paperworking-v1 |
| `/trust` | paperworking-v0 |
| `/unsubscribe` | paperworking-v0 |

### Auth

| Path | Status |
|---|---|
| `/auth/action` | paperworking-v1 |
| `/forgot-password` | paperworking-v1 |
| `/login` | paperworking-v1 |
| `/login/finish` | paperworking-v1 |
| `/onboarding/intent` | paperworking-v0 |
| `/onboarding/wizard` | paperworking-v0 |
| `/register` | paperworking-v1 |
| `/signup` | paperworking-v1 |

### Dashboard shell

| Path | Status |
|---|---|
| `/dashboard` | paperworking-v1 |
| `/dashboard/account` | paperworking-v0 |
| `/dashboard/calendar` | paperworking-v0 |
| `/dashboard/command-center` | paperworking-v1 |
| `/dashboard/data` | paperworking-v0 |
| `/dashboard/data-room` | paperworking-v0 |
| `/dashboard/deal-analyzer` | paperworking-v0 |
| `/dashboard/deals` | paperworking-v1 |
| `/dashboard/field-manager` | paperworking-v0 |
| `/dashboard/financials` | paperworking-v0 |
| `/dashboard/inbox` | paperworking-v1 |
| `/dashboard/insights` | paperworking-v1 |
| `/dashboard/intelligence` | paperworking-v0 |
| `/dashboard/marketplace` | paperworking-v1 |
| `/dashboard/profile` | paperworking-v0 |
| `/dashboard/projects` | paperworking-v1 |
| `/dashboard/reports` | paperworking-v1 |
| `/dashboard/settings` | paperworking-v1 |
| `/dashboard/sourcing` | paperworking-v0 |
| `/dashboard/tax` | paperworking-v0 |
| `/dashboard/team` | paperworking-v1 |

### Dashboard projects / REIL phases

| Path | Status |
|---|---|
| `/dashboard/projects/[id]` | paperworking-v1 |
| `/dashboard/projects/[id]/exit-direct` | paperworking-v0 |
| `/dashboard/projects/[id]/exit/financial-connections` | paperworking-v0 |
| `/dashboard/projects/[id]/exit/insights` | paperworking-v0 |
| `/dashboard/projects/[id]/exit/reconcile` | paperworking-v0 |
| `/dashboard/projects/[id]/exit/review-queue` | paperworking-v0 |
| `/dashboard/projects/[id]/exit/rules` | paperworking-v0 |
| `/dashboard/projects/[id]/instruments` | paperworking-v0 |
| `/dashboard/projects/[id]/listing` | paperworking-v0 |
| `/dashboard/projects/[id]/operations` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-1` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-1/wizard` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-2` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-2/wizard` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-3` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-3/wizard` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-4` | paperworking-v0 |
| `/dashboard/projects/[id]/phase-4/wizard` | paperworking-v0 |
| `/dashboard/projects/[id]/underwriting` | paperworking-v0 |
| `/dashboard/projects/new` | paperworking-v0 |
| `/dashboard/projects/reil/[id]` | paperworking-v0 |

### Dashboard settings

| Path | Status |
|---|---|
| `/dashboard/settings/account` | paperworking-v0 |
| `/dashboard/settings/audit-logs` | paperworking-v0 |
| `/dashboard/settings/billing` | paperworking-v1 |
| `/dashboard/settings/data` | paperworking-v0 |
| `/dashboard/settings/data-privacy` | paperworking-v0 |
| `/dashboard/settings/general` | paperworking-v0 |
| `/dashboard/settings/integrations` | paperworking-v0 |
| `/dashboard/settings/marketplace-profile` | paperworking-v0 |
| `/dashboard/settings/notifications` | paperworking-v0 |
| `/dashboard/settings/profile` | paperworking-v1 |
| `/dashboard/settings/reset-password` | paperworking-v0 |
| `/dashboard/settings/security` | paperworking-v0 |
| `/dashboard/settings/team` | paperworking-v0 |
| `/dashboard/settings/workspace` | paperworking-v0 |

### Dashboard intelligence

| Path | Status |
|---|---|
| `/dashboard/intelligence/appreciation` | paperworking-v0 |
| `/dashboard/intelligence/cap-rate` | paperworking-v0 |
| `/dashboard/intelligence/cash-flow` | paperworking-v0 |
| `/dashboard/intelligence/coc` | paperworking-v0 |
| `/dashboard/intelligence/comparison` | paperworking-v0 |
| `/dashboard/intelligence/dscr` | paperworking-v0 |
| `/dashboard/intelligence/grm` | paperworking-v0 |
| `/dashboard/intelligence/irr` | paperworking-v0 |
| `/dashboard/intelligence/ltv` | paperworking-v0 |
| `/dashboard/intelligence/noi` | paperworking-v0 |
| `/dashboard/intelligence/occupancy` | paperworking-v0 |
| `/dashboard/intelligence/oer` | paperworking-v0 |
| `/dashboard/intelligence/performance` | paperworking-v0 |

### Dashboard marketplace / deals

| Path | Status |
|---|---|
| `/dashboard/deals/[slug]` | paperworking-v0 |
| `/dashboard/insights/search-telemetry` | paperworking-v0 |
| `/dashboard/marketplace/[vendorId]` | paperworking-v0 |
| `/dashboard/marketplace/investors/[id]` | paperworking-v1 |

### Project workspace (top-level /project)

| Path | Status |
|---|---|
| `/project/[id]` | paperworking-v1 |
| `/project/[id]/documents` | paperworking-v1 |
| `/project/[id]/insights` | paperworking-v1 |
| `/project/[id]/reports` | paperworking-v1 |
| `/project/[id]/scorecard` | paperworking-v1 |
| `/projects` | paperworking-v0 |
| `/projects/[id]/analyzer` | paperworking-v0 |
| `/projects/new` | paperworking-v0 |

### Deals / invest / share (public-ish)

| Path | Status |
|---|---|
| `/checkout/success` | paperworking-v0 |
| `/deal/[slug]/preview` | paperworking-v0 |
| `/deals` | paperworking-v0 |
| `/deals/[slug]` | paperworking-v1 |
| `/deals/[slug]/detail` | paperworking-v0 |
| `/deals/[slug]/external` | paperworking-v0 |
| `/deals/compare` | paperworking-v0 |
| `/invest/[token]` | paperworking-v0 |
| `/invite/team` | paperworking-v0 |
| `/portfolio` | paperworking-v0 |
| `/r/[slug]` | paperworking-v0 |
| `/reports` | paperworking-v0 |
| `/reports/[reportId]` | paperworking-v0 |
| `/share/[token]` | paperworking-v0 |
| `/share/package/[token]` | paperworking-v0 |

### Marketplace (non-dashboard)

| Path | Status |
|---|---|
| `/marketplace/investors` | paperworking-v0 |
| `/marketplace/investors/[id]` | paperworking-v0 |
| `/marketplace/vendor/[id]` | paperworking-v0 |
| `/vendor/marketplace` | paperworking-v0 |

### Vendor portal

| Path | Status |
|---|---|
| `/vendor-portal` | paperworking-v1 |
| `/vendor-portal/profile` | paperworking-v1 |

### Admin

| Path | Status |
|---|---|
| `/admin` | paperworking-v1 |
| `/admin/agent-crew` | paperworking-v1 |
| `/admin/analytics` | paperworking-v0 |
| `/admin/audit` | paperworking-v0 |
| `/admin/lender-config` | paperworking-v1 |
| `/admin/marketplace` | paperworking-v0 |
| `/admin/subscriptions` | paperworking-v0 |
| `/admin/tickets` | paperworking-v0 |
| `/admin/users` | paperworking-v0 |

---

## B. HTTP API routes (`apps/web/app/api` vs `PaperWorking/src/app/api`)

### Health / auth / account

| Path | Status |
|---|---|
| `/api/account/data/delete` | paperworking-v0 |
| `/api/account/data/download` | paperworking-v0 |
| `/api/auth/2fa/[[...action]]` | paperworking-v0 |
| `/api/auth/change-password` | paperworking-v0 |
| `/api/auth/ip` | paperworking-v0 |
| `/api/auth/magic-link` | paperworking-v0 |
| `/api/auth/me` | paperworking-v1 |
| `/api/auth/reset-password` | paperworking-v0 |
| `/api/auth/revoke` | paperworking-v0 |
| `/api/auth/session` | paperworking-v1 |
| `/api/auth/sessions` | paperworking-v0 |
| `/api/contact` | paperworking-v0 |
| `/api/health` | paperworking-v1 |
| `/api/presence/heartbeat` | paperworking-v0 |
| `/api/security/settings` | paperworking-v0 |
| `/api/unsubscribe` | paperworking-v0 |
| `/api/user/gdpr` | paperworking-v0 |
| `/api/user/notification-preferences` | paperworking-v0 |
| `/api/waitlist` | paperworking-v0 |

### Projects / REIL / KPIs

| Path | Status |
|---|---|
| `/api/entitlements/project-count` | paperworking-v0 |
| `/api/insights` | paperworking-v1 |
| `/api/insights/market` | paperworking-v0 |
| `/api/insights/metrics` | paperworking-v0 |
| `/api/insights/portfolio` | paperworking-v0 |
| `/api/insights/trends` | paperworking-v0 |
| `/api/portfolio/metrics` | paperworking-v1 |
| `/api/projects` | paperworking-v1 |
| `/api/projects/[id]` | paperworking-v1 |
| `/api/projects/[id]/acquisition` | paperworking-v0 |
| `/api/projects/[id]/capital-stack/export` | paperworking-v0 |
| `/api/projects/[id]/commit` | paperworking-v0 |
| `/api/projects/[id]/commitments` | paperworking-v0 |
| `/api/projects/[id]/commitments/[cId]` | paperworking-v0 |
| `/api/projects/[id]/dealUpdates` | paperworking-v0 |
| `/api/projects/[id]/dealUpdates/[updateId]` | paperworking-v0 |
| `/api/projects/[id]/documents` | paperworking-v0 |
| `/api/projects/[id]/documents/[docId]/download` | paperworking-v0 |
| `/api/projects/[id]/equity-parties` | paperworking-v0 |
| `/api/projects/[id]/exit` | paperworking-v0 |
| `/api/projects/[id]/funding-sources` | paperworking-v0 |
| `/api/projects/[id]/hold` | paperworking-v0 |
| `/api/projects/[id]/hold/auto-advance` | paperworking-v0 |
| `/api/projects/[id]/hold/registry` | paperworking-v0 |
| `/api/projects/[id]/inquiries/[inquiryId]` | paperworking-v0 |
| `/api/projects/[id]/inquiries/[inquiryId]/reply` | paperworking-v0 |
| `/api/projects/[id]/invitations/[invitationId]/exchange` | paperworking-v0 |
| `/api/projects/[id]/kpis/breakdown` | paperworking-v0 |
| `/api/projects/[id]/kpis/current` | paperworking-v1 |
| `/api/projects/[id]/kpis/impact-preview` | paperworking-v0 |
| `/api/projects/[id]/kpis/recalculate` | paperworking-v0 |
| `/api/projects/[id]/lender-package` | paperworking-v0 |
| `/api/projects/[id]/lender-package/[itemId]` | paperworking-v0 |
| `/api/projects/[id]/lender-package/debt-folder` | paperworking-v0 |
| `/api/projects/[id]/loan-estimates` | paperworking-v0 |
| `/api/projects/[id]/loan-estimates/[estimateId]` | paperworking-v0 |
| `/api/projects/[id]/loan-estimates/[estimateId]/choose` | paperworking-v0 |
| `/api/projects/[id]/loans` | paperworking-v0 |
| `/api/projects/[id]/loans/[loanId]` | paperworking-v0 |
| `/api/projects/[id]/loans/hard-money-terms` | paperworking-v0 |
| `/api/projects/[id]/loans/lock` | paperworking-v0 |
| `/api/projects/[id]/loans/sba504` | paperworking-v0 |
| `/api/projects/[id]/proof-of-funds` | paperworking-v0 |
| `/api/projects/[id]/purchase` | paperworking-v0 |
| `/api/projects/[id]/team-slots` | paperworking-v0 |
| `/api/projects/[id]/timeline` | paperworking-v0 |
| `/api/projects/[id]/transactions` | paperworking-v0 |
| `/api/projects/[id]/visibility` | paperworking-v0 |
| `/api/projects/create` | paperworking-v0 |
| `/api/projects/rehab` | paperworking-v0 |
| `/api/projects/todos` | paperworking-v0 |
| `/api/reil/cron/refresh` | paperworking-v0 |
| `/api/reil/listings` | paperworking-v0 |
| `/api/reil/market-stats` | paperworking-v0 |
| `/api/reil/projects` | paperworking-v0 |
| `/api/reil/projects/[id]` | paperworking-v0 |
| `/api/reil/projects/[id]/assignments` | paperworking-v0 |
| `/api/reil/projects/[id]/assignments/[aid]` | paperworking-v0 |
| `/api/reil/projects/[id]/closing-ledger/export` | paperworking-v0 |
| `/api/reil/projects/[id]/invite` | paperworking-v0 |
| `/api/reil/projects/[id]/property` | paperworking-v0 |
| `/api/reil/projects/[id]/status` | paperworking-v0 |
| `/api/reil/projects/[id]/terms` | paperworking-v0 |
| `/api/reil/projects/[id]/valuation` | paperworking-v0 |
| `/api/reporting/export` | paperworking-v0 |
| `/api/reports/[period]` | paperworking-v1 |
| `/api/reports/generate` | paperworking-v1 |
| `/api/reports/portfolio` | paperworking-v1 |

### Deals / marketplace / vendors

| Path | Status |
|---|---|
| `/api/bids` | paperworking-v0 |
| `/api/deals` | paperworking-v1 |
| `/api/deals/broadcast` | paperworking-v0 |
| `/api/deals/exists` | paperworking-v1 |
| `/api/fund/close-deal` | paperworking-v0 |
| `/api/marketplace/investors` | paperworking-v1 |
| `/api/marketplace/investors/[id]` | paperworking-v1 |
| `/api/marketplace/investors/follow` | paperworking-v1 |
| `/api/marketplace/listings` | paperworking-v1 |
| `/api/marketplace/profile` | paperworking-v1 |
| `/api/vendor-portal/profile` | paperworking-v1 |
| `/api/vendor-portal/requests` | paperworking-v1 |
| `/api/vendors` | paperworking-v0 |
| `/api/vendors/request` | paperworking-v0 |

### Plaid / financial / tax / reconcile

| Path | Status |
|---|---|
| `/api/exit/complete` | paperworking-v0 |
| `/api/financial-transactions/[id]/approve` | paperworking-v0 |
| `/api/financial-transactions/[id]/classify` | paperworking-v0 |
| `/api/financial-transactions/bulk-classify` | paperworking-v0 |
| `/api/financial-transactions/project/[projectId]` | paperworking-v0 |
| `/api/financial/transactions` | paperworking-v0 |
| `/api/plaid/connections` | paperworking-v0 |
| `/api/plaid/connections/[connectionId]` | paperworking-v0 |
| `/api/plaid/connections/[connectionId]/disconnect` | paperworking-v0 |
| `/api/plaid/connections/[connectionId]/pause` | paperworking-v0 |
| `/api/plaid/create-link-token` | paperworking-v0 |
| `/api/plaid/exchange` | paperworking-v0 |
| `/api/plaid/exchange-public-token` | paperworking-v0 |
| `/api/plaid/exchange-v2` | paperworking-v0 |
| `/api/plaid/liabilities` | paperworking-v0 |
| `/api/reconciliations` | paperworking-v0 |
| `/api/reconciliations/[periodId]` | paperworking-v0 |
| `/api/reconciliations/[periodId]/finalize` | paperworking-v0 |
| `/api/reconciliations/[periodId]/match` | paperworking-v0 |
| `/api/reconciliations/[periodId]/report` | paperworking-v0 |
| `/api/reconciliations/items/[itemId]/adjust` | paperworking-v0 |
| `/api/reconciliations/items/[itemId]/verify` | paperworking-v0 |
| `/api/rent-history/import` | paperworking-v0 |
| `/api/rules` | paperworking-v0 |
| `/api/rules/[id]` | paperworking-v0 |
| `/api/rules/[id]/apply` | paperworking-v0 |
| `/api/rules/project/[projectId]` | paperworking-v0 |
| `/api/rules/project/[projectId]/suggestions` | paperworking-v0 |
| `/api/tax/1040-es` | paperworking-v0 |
| `/api/tax/export` | paperworking-v0 |
| `/api/tax/package` | paperworking-v0 |
| `/api/tax/share` | paperworking-v0 |
| `/api/tax/share/[token]` | paperworking-v0 |
| `/api/tax/share/revoke` | paperworking-v0 |
| `/api/transactions/[id]/attribution` | paperworking-v0 |
| `/api/transactions/[id]/identify` | paperworking-v0 |
| `/api/transactions/project/[projectId]/identification-suggestions` | paperworking-v0 |

### Stripe / billing

| Path | Status |
|---|---|
| `/api/billing/[[...action]]` | paperworking-v0 |
| `/api/stripe/checkout` | paperworking-v0 |
| `/api/stripe/invoices` | paperworking-v0 |
| `/api/stripe/payment-method` | paperworking-v0 |
| `/api/stripe/portal` | paperworking-v0 |
| `/api/stripe/session-status` | paperworking-v0 |
| `/api/stripe/subscription` | paperworking-v0 |
| `/api/stripe/webhook` | paperworking-v0 |

### Team / inbox / messages / invites

| Path | Status |
|---|---|
| `/api/data/[[...action]]` | paperworking-v0 |
| `/api/inbox` | paperworking-v0 |
| `/api/inbox/[id]` | paperworking-v0 |
| `/api/inbox/[id]/actions` | paperworking-v0 |
| `/api/inbox/backfill` | paperworking-v0 |
| `/api/integrations/[[...action]]` | paperworking-v0 |
| `/api/integrations/google-drive/authorize` | paperworking-v0 |
| `/api/integrations/google-drive/callback` | paperworking-v0 |
| `/api/integrations/mls/connect` | paperworking-v0 |
| `/api/integrations/status` | paperworking-v0 |
| `/api/invest/[token]` | paperworking-v0 |
| `/api/investor/timeline` | paperworking-v0 |
| `/api/invitations/[token]` | paperworking-v0 |
| `/api/invitations/[token]/ask` | paperworking-v0 |
| `/api/invitations/[token]/indication` | paperworking-v0 |
| `/api/invitations/[token]/subscribe` | paperworking-v0 |
| `/api/invitations/[token]/subscription` | paperworking-v0 |
| `/api/invitations/[token]/updates` | paperworking-v0 |
| `/api/invitations/accept` | paperworking-v0 |
| `/api/invitations/broadcast` | paperworking-v0 |
| `/api/invitations/respond` | paperworking-v0 |
| `/api/invitations/send` | paperworking-v0 |
| `/api/invites` | paperworking-v0 |
| `/api/messages` | paperworking-v0 |
| `/api/messages/[id]/read` | paperworking-v0 |
| `/api/messages/thread/[threadId]` | paperworking-v0 |
| `/api/notifications/deadline-alert` | paperworking-v0 |
| `/api/notifications/test` | paperworking-v0 |
| `/api/packages/share` | paperworking-v0 |
| `/api/packages/share/[token]` | paperworking-v0 |
| `/api/settings/[[...section]]` | paperworking-v0 |
| `/api/tasks/assign` | paperworking-v0 |
| `/api/team/[[...action]]` | paperworking-v0 |
| `/api/workspace/[[...action]]` | paperworking-v0 |

### Admin

| Path | Status |
|---|---|
| `/api/admin/agent-crew` | paperworking-v1 |
| `/api/admin/agent-crew/[id]` | paperworking-v1 |
| `/api/admin/agent-crew/[id]/impersonate` | paperworking-v1 |
| `/api/admin/agent-crew/purge-all` | paperworking-v0 |
| `/api/admin/lender-checklists` | paperworking-v1 |
| `/api/admin/lender-rates` | paperworking-v1 |
| `/api/admin/rentcast-usage` | paperworking-v1 |

### Cron / webhooks / worker

| Path | Status |
|---|---|
| `/api/cron/bridge-sync` | paperworking-v0 |
| `/api/cron/consent-audit` | paperworking-v0 |
| `/api/cron/daily-sync` | paperworking-v0 |
| `/api/cron/lender-package-reminders` | paperworking-v0 |
| `/api/cron/lifecycle-alerts` | paperworking-v0 |
| `/api/cron/process-daily-kpis` | paperworking-v0 |
| `/api/cron/process-deletions` | paperworking-v0 |
| `/api/cron/process-email-notifications` | paperworking-v0 |
| `/api/cron/process-team-invites` | paperworking-v0 |
| `/api/cron/refresh-place-ids` | paperworking-v0 |
| `/api/cron/retry-failed-connections` | paperworking-v0 |
| `/api/cron/send-digest` | paperworking-v0 |
| `/api/cron/snapshots` | paperworking-v0 |
| `/api/cron/sync-financial-transactions` | paperworking-v0 |
| `/api/cron/sync-liabilities` | paperworking-v0 |
| `/api/cron/sync-plaid-liabilities` | paperworking-v0 |
| `/api/cron/sync-transactions` | paperworking-v0 |
| `/api/webhooks/bridge` | paperworking-v0 |
| `/api/webhooks/docusign` | paperworking-v0 |
| `/api/webhooks/email-reply` | paperworking-v0 |
| `/api/webhooks/emails` | paperworking-v0 |
| `/api/webhooks/inbound-email` | paperworking-v0 |
| `/api/webhooks/plaid` | paperworking-v0 |
| `/api/webhooks/sendgrid` | paperworking-v0 |
| `/api/webhooks/sourcing` | paperworking-v0 |
| `/api/worker/drain` | paperworking-v0 |

### Places / maps / MLS / Bridge / misc

| Path | Status |
|---|---|
| `/api/bridge/agents` | paperworking-v0 |
| `/api/bridge/metadata` | paperworking-v0 |
| `/api/bridge/offices` | paperworking-v0 |
| `/api/bridge/openhouses` | paperworking-v0 |
| `/api/bridge/search` | paperworking-v0 |
| `/api/bridge/sync` | paperworking-v0 |
| `/api/calendar/auth` | paperworking-v0 |
| `/api/calendar/callback` | paperworking-v0 |
| `/api/calendar/events` | paperworking-v0 |
| `/api/calendar/sync` | paperworking-v0 |
| `/api/changelog/metadata` | paperworking-v0 |
| `/api/closing/title-search` | paperworking-v0 |
| `/api/config/attorney-states` | paperworking-v0 |
| `/api/dashboard` | paperworking-v0 |
| `/api/deal-analyzer/property-lookup` | paperworking-v0 |
| `/api/drive/provision` | paperworking-v0 |
| `/api/e2e/follows` | paperworking-v0 |
| `/api/emails/send` | paperworking-v0 |
| `/api/esign/create` | paperworking-v0 |
| `/api/esign/status/[envelopeId]` | paperworking-v0 |
| `/api/events` | paperworking-v0 |
| `/api/events/stream` | paperworking-v0 |
| `/api/identity/appeal` | paperworking-v0 |
| `/api/identity/claim/bind-token` | paperworking-v0 |
| `/api/identity/claim/start` | paperworking-v0 |
| `/api/identity/claim/verify` | paperworking-v0 |
| `/api/identity/report-spam` | paperworking-v0 |
| `/api/lawyers` | paperworking-v0 |
| `/api/loi/generate` | paperworking-v0 |
| `/api/map-tile` | paperworking-v0 |
| `/api/market-vitals` | paperworking-v0 |
| `/api/mcp/[transport]` | paperworking-v0 |
| `/api/mls/search` | paperworking-v0 |
| `/api/permits` | paperworking-v0 |
| `/api/places/autocomplete` | paperworking-v0 |
| `/api/places/autocomplete-public` | paperworking-v0 |
| `/api/places/details` | paperworking-v0 |
| `/api/places/geocode` | paperworking-v0 |
| `/api/places/validate` | paperworking-v0 |
| `/api/street-view` | paperworking-v0 |
| `/api/upload` | paperworking-v0 |
| `/api/zoning-scan` | paperworking-v0 |

---

## C. Quick v1 checklist (pages present in migrate)

- `/` — paperworking-v1
- `/admin` — paperworking-v1
- `/admin/agent-crew` — paperworking-v1
- `/admin/lender-config` — paperworking-v1
- `/auth/action` — paperworking-v1
- `/contact` — paperworking-v1
- `/dashboard` — paperworking-v1
- `/dashboard/command-center` — paperworking-v1
- `/dashboard/deals` — paperworking-v1
- `/dashboard/inbox` — paperworking-v1
- `/dashboard/insights` — paperworking-v1
- `/dashboard/marketplace` — paperworking-v1
- `/dashboard/marketplace/investors/[id]` — paperworking-v1
- `/dashboard/projects` — paperworking-v1
- `/dashboard/projects/[id]` — paperworking-v1
- `/dashboard/reports` — paperworking-v1
- `/dashboard/settings` — paperworking-v1
- `/dashboard/settings/billing` — paperworking-v1
- `/dashboard/settings/profile` — paperworking-v1
- `/dashboard/team` — paperworking-v1
- `/deals/[slug]` — paperworking-v1
- `/forgot-password` — paperworking-v1
- `/help` — paperworking-v1
- `/help/[slug]` — paperworking-v1
- `/how-it-works` — paperworking-v1
- `/login` — paperworking-v1
- `/login/finish` — paperworking-v1
- `/pricing` — paperworking-v1
- `/privacy` — paperworking-v1
- `/project/[id]` — paperworking-v1
- `/project/[id]/documents` — paperworking-v1
- `/project/[id]/insights` — paperworking-v1
- `/project/[id]/reports` — paperworking-v1
- `/project/[id]/scorecard` — paperworking-v1
- `/register` — paperworking-v1
- `/signup` — paperworking-v1
- `/support` — paperworking-v1
- `/terms` — paperworking-v1
- `/vendor-portal` — paperworking-v1
- `/vendor-portal/profile` — paperworking-v1

## D. Quick v1 checklist (API adapters present in migrate)

- `/api/admin/agent-crew` — paperworking-v1
- `/api/admin/agent-crew/[id]` — paperworking-v1
- `/api/admin/agent-crew/[id]/impersonate` — paperworking-v1
- `/api/admin/lender-checklists` — paperworking-v1
- `/api/admin/lender-rates` — paperworking-v1
- `/api/admin/rentcast-usage` — paperworking-v1
- `/api/auth/me` — paperworking-v1
- `/api/auth/session` — paperworking-v1
- `/api/deals` — paperworking-v1
- `/api/deals/exists` — paperworking-v1
- `/api/health` — paperworking-v1
- `/api/insights` — paperworking-v1
- `/api/marketplace/investors` — paperworking-v1
- `/api/marketplace/investors/[id]` — paperworking-v1
- `/api/marketplace/investors/follow` — paperworking-v1
- `/api/marketplace/listings` — paperworking-v1
- `/api/marketplace/profile` — paperworking-v1
- `/api/portfolio/metrics` — paperworking-v1
- `/api/projects` — paperworking-v1
- `/api/projects/[id]` — paperworking-v1
- `/api/projects/[id]/kpis/current` — paperworking-v1
- `/api/reports/[period]` — paperworking-v1
- `/api/reports/generate` — paperworking-v1
- `/api/reports/portfolio` — paperworking-v1
- `/api/vendor-portal/profile` — paperworking-v1
- `/api/vendor-portal/requests` — paperworking-v1


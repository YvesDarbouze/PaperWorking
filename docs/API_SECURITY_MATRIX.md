# PaperWorking V1 — API Security Matrix

Nest Wave-1 controllers (`apps/api/src/**`). Legacy `routes/` handlers are not mounted in Nest bootstrap.

| Method | Path | Public | Permission / Role | Resource scope | DB tables |
|--------|------|--------|-------------------|----------------|-----------|
| POST | /api/auth/session | Yes + CSRF | — | Supabase JWT | User |
| DELETE | /api/auth/session | Yes + CSRF | — | — | — |
| GET | /api/auth/me | Session | — | self | User, Subscription |
| GET | /api/auth/sessions | Session | — | self (stub) | — |
| POST | /api/organizations | Session | — | creator → owner | Organization, OrganizationMember |
| GET | /api/organizations | Session | — | member orgs | Organization |
| GET/POST | /api/team/* | Session | team.read/manage | org membership | OrganizationMember, OrganizationInvite |
| GET/POST | /api/organization-members | Session | team.* | org | OrganizationMember |
| GET/POST | /api/project-members | Session | team.read / projects.update | project ACL | ProjectMember |
| GET/POST/PATCH | /api/projects/* | Session | projects.* | project ACL | Project, ProjectDocument, PhaseTransition |
| GET/POST | /api/deals | Session | deals.* | deal ACL | Deal |
| POST | /api/deals/reply | Public* | auth OR webhook secret | deal exists | DealMessage |
| GET | /api/deals/exists | Public | marketplace filter | public deals only | Deal |
| GET/POST | /api/deal-invitations | Session | deals.* | deal ACL | DealInvitation |
| GET/POST | /api/messages | Session | — | thread + recipient ACL | Message |
| GET/POST/PATCH/DELETE | /api/inbox | Session | — | recipient ACL | InboxItem |
| GET/POST | /api/task-assignments | Session | projects.read/update | project ACL | TaskAssignment |
| GET | /api/vendors | Session | — | org-scoped | Vendor |
| POST | /api/vendor-services | Session | trusted org | org | Vendor |
| GET/PUT | /api/vendor-portal/* | Session | @Roles vendor/admin | email match | Vendor, VendorBid |
| ALL | /api/billing/* | Session | billing.read/manage | self subscription | Subscription |
| POST | /api/stripe/checkout | Session | — | self | Subscription |
| POST | /api/stripe/webhook | Public | Stripe signature | event dedupe | Subscription, StripeWebhookEvent |
| GET | /api/stripe/session-status | Session | — | session ownership | Subscription |
| GET | /api/marketplace/listings | Public | — | — | MarketplaceListing |
| GET | /api/marketplace/investors | Public | — | public DTO | User |
| GET | /api/portfolio/metrics | Session | projects.read | accessible projects | Project |
| GET | /api/reports/* | Session | projects.read | accessible projects | Project |
| GET | /api/insights | Session | projects.read | accessible projects | Project |
| ALL | /api/settings/* | Session | — | self profile | User |
| ALL | /api/admin/* | Session | admin.access | global | multiple |
| GET | /api/health | Public | — | — | — |

\* `/api/deals/reply`: requires session **or** `X-Deal-Reply-Secret` matching `DEAL_REPLY_WEBHOOK_SECRET`.

## CSRF

`POST/DELETE /api/auth/session` use `CsrfGuard` (Origin/Referer allowlist). Required for cross-site cookies (`SameSite=None`).

## Not implemented (explicit)

- Project DELETE, Deal PATCH/DELETE
- Marketplace listing create
- REIL/Plaid Nest endpoints
- Invoice PDF / payment methods (returns empty or stub with `stub: true`)

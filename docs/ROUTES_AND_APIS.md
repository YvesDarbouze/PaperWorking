# PaperWorking V1 — Routes & API Inventory

**Last updated:** 2026-09-07  
**App:** `apps/web` (Next.js 15 App Router) + BFF adapters at `apps/web/app/api/*`  
**Handler library:** `apps/api` (`@paperworking/api`) — full registry in [list_APIs_.md](./list_APIs_.md)

---

## 1. Footer links (đã sửa)

Các link footer trước đây trỏ sai hoặc trùng trang. Cấu hình hiện tại nằm tại `apps/web/lib/marketing/content.ts` (`FOOTER_COLUMNS`, `FOOTER_BOTTOM_LINKS`).

| Link footer | Route đúng | Trang / hành vi |
|---|---|---|
| About | `/about` | `app/(marketing)/about/page.tsx` |
| Careers | `/careers` | `app/(marketing)/careers/page.tsx` |
| Cookies | `/cookies` | `app/(marketing)/cookies/page.tsx` |
| Subprocessors | `/subprocessors` | `app/(marketing)/subprocessors/page.tsx` |
| Accept Team Invite | `/invite` | `app/(marketing)/invite/page.tsx` — hướng dẫn; có `?token=` hoặc `?invite=` → redirect `/signup?invite=…` |
| Create Account | `/signup` | `app/(auth)/signup/page.tsx` — khác với Accept Team Invite |

**Ghi chú:** `Create Account` và `Accept Team Invite` là hai URL khác nhau. Invite flow lưu token vào `sessionStorage` (`pw_pending_invite_token`) khi user đến từ link email.

---

## 2. Toàn bộ page routes (UI)

Route groups `(marketing)`, `(auth)`, … **không** xuất hiện trên URL. Ví dụ: `(marketing)/about` → `/about`.

### 2.1 Marketing (public)

| URL | File | Mô tả |
|---|---|---|
| `/` | `(marketing)/page.tsx` | Landing |
| `/home` | `(marketing)/home/page.tsx` | Home alias |
| `/how-it-works` | `(marketing)/how-it-works/page.tsx` | Product tour |
| `/marketplaces` | `(marketing)/marketplaces/page.tsx` | Marketplace overview |
| `/pricing` | `(marketing)/pricing/page.tsx` | Plans & trial |
| `/changelog` | `(marketing)/changelog/page.tsx` | Release notes |
| `/support` | `(marketing)/support/page.tsx` | Support hub |
| `/support/glossary` | `(marketing)/support/glossary/page.tsx` | Real estate glossary |
| `/support/metrics` | `(marketing)/support/metrics/page.tsx` | 33 metrics playbook |
| `/help` | `(marketing)/help/page.tsx` | Help index |
| `/help/[slug]` | `(marketing)/help/[slug]/page.tsx` | Help article (slugs: `first-deal-setup`, `irr-and-metrics`, `vendor-quotes`, `billing-and-plans`, `admin-agent-crew`) |
| `/contact` | `(marketing)/contact/page.tsx` | Contact form |
| `/about` | `(marketing)/about/page.tsx` | Company |
| `/careers` | `(marketing)/careers/page.tsx` | Careers |
| `/privacy` | `(marketing)/privacy/page.tsx` | Privacy policy |
| `/terms` | `(marketing)/terms/page.tsx` | Terms of service |
| `/cookies` | `(marketing)/cookies/page.tsx` | Cookie policy |
| `/subprocessors` | `(marketing)/subprocessors/page.tsx` | GDPR subprocessors registry |
| `/invite` | `(marketing)/invite/page.tsx` | Team invite landing |
| `/deals/[slug]/external` | `(marketing)/deals/[slug]/external/page.tsx` | Public deal teaser |

### 2.2 Auth

| URL | File | Mô tả |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Sign in |
| `/login/finish` | `(auth)/login/finish/page.tsx` | Post-login finish |
| `/signup` | `(auth)/signup/page.tsx` | Account type + signup |
| `/register` | `(auth)/register/page.tsx` | Register alias |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | Password reset |
| `/auth/action` | `auth/action/page.tsx` | Firebase auth action handler |
| `/auth/callback` | `auth/callback/page.tsx` | OAuth / magic-link callback |

### 2.3 Dashboard (authenticated)

| URL | File | Mô tả |
|---|---|---|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | Dashboard home |
| `/dashboard/command-center` | `(dashboard)/dashboard/command-center/page.tsx` | Portfolio command center |
| `/dashboard/deals` | `(dashboard)/dashboard/deals/page.tsx` | Deals list |
| `/dashboard/insights` | `(dashboard)/dashboard/insights/page.tsx` | Portfolio insights |
| `/dashboard/reports` | `(dashboard)/dashboard/reports/page.tsx` | Portfolio reports |
| `/dashboard/inbox` | `(dashboard)/dashboard/inbox/page.tsx` | Inbox |
| `/dashboard/team` | `(dashboard)/dashboard/team/page.tsx` | Team roster & invites |
| `/dashboard/marketplace` | `(dashboard)/dashboard/marketplace/page.tsx` | Investor marketplace |
| `/dashboard/marketplace/investors/[id]` | `(dashboard)/dashboard/marketplace/investors/[id]/page.tsx` | Investor profile |
| `/dashboard/projects` | `(dashboard)/dashboard/projects/page.tsx` | Projects list |
| `/dashboard/projects/[id]` | `(dashboard)/dashboard/projects/[id]/page.tsx` | Project detail (dashboard) |
| `/dashboard/settings` | `(dashboard)/dashboard/settings/page.tsx` | Settings hub |
| `/dashboard/settings/profile` | `(dashboard)/dashboard/settings/profile/page.tsx` | Profile |
| `/dashboard/settings/billing` | `(dashboard)/dashboard/settings/billing/page.tsx` | Billing |
| `/projects` | `(dashboard)/projects/page.tsx` | Projects (legacy path) |
| `/projects/new` | `(dashboard)/projects/new/page.tsx` | Create project |
| `/projects/[id]` | `(dashboard)/projects/[id]/page.tsx` | Project workspace |
| `/deals` | `(dashboard)/deals/page.tsx` | Deals (legacy path) |

### 2.4 Project workspace

| URL | File | Mô tả |
|---|---|---|
| `/project/[id]` | `(project)/project/[id]/page.tsx` | Project overview |
| `/project/[id]/insights` | `(project)/project/[id]/insights/page.tsx` | KPIs & insights |
| `/project/[id]/scorecard` | `(project)/project/[id]/scorecard/page.tsx` | Scorecard |
| `/project/[id]/documents` | `(project)/project/[id]/documents/page.tsx` | Document vault |
| `/project/[id]/reports` | `(project)/project/[id]/reports/page.tsx` | Project reports |

### 2.5 Public deals

| URL | File | Mô tả |
|---|---|---|
| `/deals/[slug]` | `(deals)/deals/[slug]/page.tsx` | Public deal page |
| `/deals/[slug]/detail` | `(deals)/deals/[slug]/detail/page.tsx` | Deal detail |

### 2.6 Admin (platform admin)

| URL | File | Mô tả |
|---|---|---|
| `/admin` | `(admin)/admin/page.tsx` | Admin overview |
| `/admin/users` | `(admin)/admin/users/page.tsx` | User management |
| `/admin/agent-crew` | `(admin)/admin/agent-crew/page.tsx` | Agent crew & impersonation |
| `/admin/analytics` | `(admin)/admin/analytics/page.tsx` | Analytics |
| `/admin/audit` | `(admin)/admin/audit/page.tsx` | Audit log |
| `/admin/integrations` | `(admin)/admin/integrations/page.tsx` | Integrations |
| `/admin/lender-config` | `(admin)/admin/lender-config/page.tsx` | Lender config |
| `/admin/marketplace` | `(admin)/admin/marketplace/page.tsx` | Marketplace admin |
| `/admin/organizations` | `(admin)/admin/organizations/page.tsx` | Organizations |
| `/admin/projects` | `(admin)/admin/projects/page.tsx` | Projects admin |
| `/admin/subscriptions` | `(admin)/admin/subscriptions/page.tsx` | Subscriptions |
| `/admin/tickets` | `(admin)/admin/tickets/page.tsx` | Support tickets |

### 2.7 Vendor portal

| URL | File | Mô tả |
|---|---|---|
| `/vendor-portal` | `(vendor-portal)/vendor-portal/page.tsx` | Vendor requests |
| `/vendor-portal/profile` | `(vendor-portal)/vendor-portal/profile/page.tsx` | Vendor profile |

**Tổng:** 66 `page.tsx` files → **~62 unique URL patterns** (không tính dynamic segments).

---

## 3. BFF API — đã wire trong `apps/web/app/api`

Các route này chạy trên cùng origin với Next.js (`localhost:3000` khi dev). Hầu hết delegate sang `@paperworking/api` handlers.

| Method | Route | Adapter file |
|---|---|---|
| GET | `/api/health` | `api/health/route.ts` |
| POST, DELETE | `/api/auth/session` | `api/auth/session/route.ts` |
| GET | `/api/auth/me` | `api/auth/me/route.ts` |
| GET | `/api/auth/sessions` | `api/auth/sessions/route.ts` |
| GET, POST | `/api/projects` | `api/projects/route.ts` |
| GET, PATCH | `/api/projects/[id]` | `api/projects/[id]/route.ts` |
| GET | `/api/projects/[id]/kpis/current` | `api/projects/[id]/kpis/current/route.ts` |
| GET, POST | `/api/projects/[id]/documents` | `api/projects/[id]/documents/route.ts` |
| GET | `/api/projects/[id]/documents/[documentId]` | `api/projects/[id]/documents/[documentId]/route.ts` |
| GET | `/api/portfolio/metrics` | `api/portfolio/metrics/route.ts` |
| GET | `/api/insights` | `api/insights/route.ts` |
| GET | `/api/reports/portfolio` | `api/reports/portfolio/route.ts` |
| POST | `/api/reports/generate` | `api/reports/generate/route.ts` |
| GET | `/api/reports/[period]` | `api/reports/[period]/route.ts` |
| GET | `/api/marketplace/listings` | `api/marketplace/listings/route.ts` |
| GET | `/api/marketplace/profile` | `api/marketplace/profile/route.ts` |
| GET | `/api/marketplace/deals` | `api/marketplace/deals/route.ts` |
| GET | `/api/marketplace/investors` | `api/marketplace/investors/route.ts` |
| POST | `/api/marketplace/investors/follow` | `api/marketplace/investors/follow/route.ts` |
| GET | `/api/marketplace/investors/[id]` | `api/marketplace/investors/[id]/route.ts` |
| GET, POST | `/api/deals` | `api/deals/route.ts` |
| GET | `/api/deals/exists` | `api/deals/exists/route.ts` |
| POST | `/api/deals/broadcast` | `api/deals/broadcast/route.ts` |
| POST | `/api/deals/reply` | `api/deals/reply/route.ts` |
| GET | `/api/vendors` | `api/vendors/route.ts` |
| GET, PUT | `/api/vendor-portal/requests` | `api/vendor-portal/requests/route.ts` |
| GET, PUT | `/api/vendor-portal/profile` | `api/vendor-portal/profile/route.ts` |
| GET, POST | `/api/team/members` | `api/team/members/route.ts` |
| PATCH, PUT, DELETE | `/api/team/members/[id]` | `api/team/members/[id]/route.ts` |
| GET | `/api/team/invites` | `api/team/invites/route.ts` |
| POST | `/api/team/invite` | `api/team/invite/route.ts` |
| GET, PUT | `/api/settings/profile` | `api/settings/profile/route.ts` |
| GET | `/api/billing` | `api/billing/route.ts` |
| POST | `/api/billing/cancel` | `api/billing/cancel/route.ts` |
| POST | `/api/stripe/checkout` | `api/stripe/checkout/route.ts` |
| POST | `/api/stripe/portal` | `api/stripe/portal/route.ts` |
| GET | `/api/stripe/session-status` | `api/stripe/session-status/route.ts` |
| GET | `/api/inbox` | `api/inbox/route.ts` |
| PATCH, DELETE | `/api/inbox/[id]` | `api/inbox/[id]/route.ts` |
| POST | `/api/contact` | `api/contact/route.ts` |
| GET | `/api/admin/agent-crew` | `api/admin/agent-crew/route.ts` |
| GET, DELETE | `/api/admin/agent-crew/[id]` | `api/admin/agent-crew/[id]/route.ts` |
| POST | `/api/admin/agent-crew/[id]/impersonate` | `api/admin/agent-crew/[id]/impersonate/route.ts` |
| PATCH | `/api/admin/users/[id]/account-type` | `api/admin/users/[id]/account-type/route.ts` |
| GET | `/api/admin/lender-rates` | `api/admin/lender-rates/route.ts` |
| GET | `/api/admin/lender-checklists` | `api/admin/lender-checklists/route.ts` |
| GET | `/api/admin/rentcast-usage` | `api/admin/rentcast-usage/route.ts` |
| GET | `/api/admin/ops` | `api/admin/ops/route.ts` |

**Tổng BFF wired:** 48 route files, **~70 method+path pairs**.

Auth & CSRF: xem [API_SECURITY_MATRIX.md](./API_SECURITY_MATRIX.md).

---

## 4. Handler library (`@paperworking/api`) — toàn bộ API surface

Source of truth: `apps/api/src/index.ts` + JSDoc trên từng handler.

| Metric | Giá trị |
|---|---|
| Framework-agnostic handlers | **~297** (theo [list_APIs_.md](./list_APIs_.md)) |
| Domain groups | account, admin, auth, billing, bridge, calendar, contact, cron, deals, financial, inbox, insights, integrations, invitations, invites, marketplace, plaid, projects, reil, reports, stripe, team, vendor-portal, webhooks, … |
| Wired qua Next BFF | **~70** endpoint pairs (mục 3) |
| Chưa wire / Nest-only / cron | Phần còn lại — inventory đầy đủ trong [list_APIs_.md](./list_APIs_.md) |

### 4.1 Domain summary (handlers)

| Domain | Handlers (approx.) |
|---|---|
| `projects` | 43 |
| `reil` | 19 |
| `cron` | 17 |
| `webhooks` | 10 |
| `plaid` | 10 |
| `invitations` | 11 |
| `reconciliations` | 8 |
| `admin` | 8 |
| `bridge` | 7 |
| `stripe` | 7 |
| `places` | 6 |
| `integrations` | 6 |
| `rules` | 6 |
| `tax` | 6 |
| `auth` | 9 |
| `inbox` | 5 |
| `insights` | 5 |
| `financial-transactions` | 5 |
| `marketplace` | 5 |
| `identity` | 5 |
| `settings` | 4 |
| `billing` | 4 |
| `calendar` | 4 |
| `messages` | 4 |
| `team` | 4 |
| `transactions` | 4 |
| Khác | account, bids, changelog, contact, deals, esign, fund, health, invest, invites, lawyers, loi, mcp, mls, notifications, packages, portfolio, reports, security, upload, user, vendors, vendor-portal, waitlist, worker, workspace, zoning-scan, … |

### 4.2 API chưa có BFF adapter (ví dụ thường gặp)

Các handler đã implement trong `apps/api` nhưng **chưa** có file `apps/web/app/api/.../route.ts`:

- `/api/contact` — **đã wire** (marketing form)
- `/api/invites`, `/api/invitations/*` — invite/deal invitation flows
- `/api/projects/create`, `/api/projects/[id]/kpis/recalculate`, lender-package, loan-estimates, …
- `/api/plaid/*`, `/api/places/*`, `/api/bridge/*`
- `/api/webhooks/*`, `/api/cron/*`, `/api/worker/*`
- `/api/reil/projects/*`, `/api/account/data/*`

Chi tiết từng method + handler name: **[list_APIs_.md](./list_APIs_.md)** (sections 2–3, ~1100 dòng).

---

## 5. Nest API (production backend)

Một số route (Stripe webhooks, health, worker drain) có thể chạy trên Nest service riêng khi deploy Cloud Run. Xem [NEST_API_CLOUD_RUN.md](./NEST_API_CLOUD_RUN.md).

---

## 6. Kiểm tra nhanh (dev)

```bash
cd PaperWorking_v1
npm run dev
# Marketing footer fixes:
open http://localhost:3000/about
open http://localhost:3000/careers
open http://localhost:3000/cookies
open http://localhost:3000/subprocessors
open http://localhost:3000/invite
# Invite with token:
open 'http://localhost:3000/invite?token=EXAMPLE'
```

```bash
npm run verify   # build + typecheck + tests
```

---

## 7. Files liên quan

| File | Vai trò |
|---|---|
| `apps/web/lib/marketing/content.ts` | Footer & nav link config |
| `apps/web/components/marketing/MarketingFooter.tsx` | Render footer |
| `apps/web/lib/status.ts` | `WEB_APP_STATUS.routes` — smoke list |
| `apps/web/lib/marketing/subprocessors-data.ts` | Subprocessors registry |
| `apps/web/lib/marketing/legal-data.ts` | Privacy, terms, cookies, about principles |
| `apps/api/src/index.ts` | Export toàn bộ handlers |
| `docs/list_APIs_.md` | Full API inventory (297 handlers) |
| `docs/API_SECURITY_MATRIX.md` | Auth / CSRF per endpoint |

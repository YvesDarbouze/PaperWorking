# Production Readiness Status

**Updated:** 2026-08-28 (Production Readiness Gate)  
**Target stack:** Vercel → Next.js → Nest (Cloud Run) → Prisma → Supabase; Firebase Auth  
**Assessment type:** Inspection only — no application code changes in this gate.

---

## Security (summary)

| Area | Status | Notes |
|------|--------|-------|
| Sprint 1 P0 | **READY** | Project IDOR, org trust, admin escalation, deals create — re-verified by tests + code |
| Sprint 2 P0 | **READY** | Vendor bid, task assign, Stripe session-status |
| Sprint 2 P1 | **READY** | Inbox, billing entitlement, deals OR, reports FE, Stripe FE, mock flags, roles, SoT docs |
| Sprint 2 P2 | **READY** | Messages thread, vendor org, portfolio ACL, webhook fail-closed, settings allowlist, KPI honesty, auth stubs |

Overall Wave-1 Nest security: **PASS** for audited IDOR/authz issues. Residual privacy/abuse items below are **known limitations**, not open Sprint findings.

---

## Functional readiness (summary)

| Area | Status | Notes |
|------|--------|-------|
| Authentication | **PARTIAL** | Firebase session real; Nest reset/magic-link honest `NOT_IMPLEMENTED` |
| Projects | **PARTIAL** | CRUD + ACL ready; KPI estimates unavailable |
| Deals | **PARTIAL** | Create/list/ACL ready; public reply is open surface |
| Team | **PARTIAL** | Org ACL + role normalize ready |
| Marketplace | **PARTIAL** | Listings work; **public investor emails exposed** |
| Vendor | **PARTIAL** | Portal IDOR + org attach fixed |
| Billing / Stripe | **PARTIAL** | Code fail-closed; paid needs external Stripe config |
| Reports / Portfolio / KPI | **PARTIAL** | ACL OK; honest empty/unavailable values |

---

## Infrastructure (summary)

| Area | Status | Notes |
|------|--------|-------|
| Firebase | **READY** (when configured) | IdP for session |
| Supabase / Prisma | **READY** (when configured) | Wave-1 models |
| Nest API | **PARTIAL** | Wave-1 mounted only |
| Frontend | **PARTIAL** | `apiFetch` → Nest; FE ×1.25 display heuristic remains |
| Env / deployment | **PARTIAL** | Requires production secrets + mock flags off |

---

# Production Readiness Gate

**Gate date:** 2026-08-28  
**Evidence basis:** Sprint docs + live code inspection + `96` combined security unit tests PASS + API `tsc` PASS  
**Out of scope:** Wave-2 migration, User/AppUser merge, schema changes, new features

## Overall status

### 🟡 READY WITH EXPLICIT PRODUCT/OPS SIGN-OFF

Pre-launch hardening completed (2026-08-28):

- Public investor emails **redacted** at API DTO boundary (live verified).
- Wave-2 reserved FE paths **middleware-gated** + admin Plaid tab hidden in production.
- Stripe production checklist documented; code remains fail-closed.
- FE Est. Exit no longer invents `purchasePrice * 1.25`.
- Launch + product decision checklists awaiting explicit sign-off.

Controlled launch is appropriate **after** Product/Ops complete `PRODUCT_LAUNCH_DECISIONS.md` and `PRODUCTION_LAUNCH_CHECKLIST.md`.

---

## Security status

| Security Area | Status | Evidence | Risk |
| ------------- | ------ | -------- | ---- |
| Sprint 1 P0 (project/org/admin/deals create) | **PASS** | `sprint1-p0-authz` + live smoke; `assertProjectAccess` / `resolveTrustedOrgId` / DB-only admin in `auth.service.ts` | Low residual |
| Sprint 2 P0 (vendor bid / tasks / session-status) | **PASS** | `sprint2-p0-*` unit + live smoke; trusted vendor + project-scoped tasks + session binding | Low |
| Sprint 2 P1 (inbox / billing / deals OR / reports FE / mock flags / roles) | **PASS** | `sprint2-p1-*` suites; code paths match docs | Low |
| Sprint 2 P2 (messages / vendor org / ACL / webhook / settings / KPI honesty / auth stubs) | **PASS** | `sprint2-p2-*` suites; `assertThreadAccess`, `accessibleProjectsWhere`, webhook `constructEvent`-only | Low |
| Production mock auth hard-off | **PASS** | Nest `mockAuthEnabled()` + FE `useMockData()` both force `false` when `NODE_ENV=production` | Misconfig of `NODE_ENV` remains ops risk |
| Public marketplace investor email | **PARTIAL** | `@Public` investors still `select: { email: true }` in `marketplace.service.ts` | **PII exposure if directory ships** |
| Public deals reply | **PARTIAL** | `@Public` `POST /api/deals/reply` accepts dealId + client sender fields | Spam/abuse, not org IDOR |

Do **not** treat documentation alone as PASS — the above was re-checked against source and re-run tests (`96` PASS).

---

## Authentication status

| Check | Result |
|-------|--------|
| Firebase session create | Real path via Admin SDK when credentials present |
| Global `SessionAuthGuard` / `RolesGuard` / `PermissionsGuard` | Registered as `APP_GUARD` |
| Admin detection | DB `accountType`/`role` only; cookies/`body.accountType` cannot escalate |
| Mock auth in production | **Hard disabled** in Nest + FE |
| Unauthenticated protected routes | Rejected (401) — confirmed by live smoke suites |
| Reset-password / magic-link Nest APIs | Honest `success: false` / `NOT_IMPLEMENTED` (Firebase client owns email) |
| Multi-device sessions list | Incomplete stub (`incomplete: true`) |

**Verdict:** Authentication is **READY for controlled launch** when Firebase Admin + client env are configured. Nest email endpoints must not be marketed as working.

---

## Authorization status

| Resource | Auth | Permission | Resource ACL | Org ACL | Status |
| -------- | ---- | ---------- | ------------ | ------- | ------ |
| Projects | Session | `@RequirePermissions` | `assertProjectAccess` | Trusted org on create/update | **PASS** |
| Deals | Session (+ public exists/reply) | deals.* on private ops | creator + marketplace published | N/A (creator-scoped) | **PASS** (private); public reply = limitation |
| Team / Orgs | Session | team.read/manage | membership | `resolveTrustedOrgId` / `assertTeamManage` | **PASS** |
| Vendors | Session; portal `@Roles(vendor)` | — | trusted email vendor; bid scoped | create via trusted org | **PASS** |
| Marketplace | Mixed; investors `@Public` | — | follow uses session | — | **PARTIAL** (email PII) |
| Tasks | Session | projects.* | project + assignee scope | voids client org | **PASS** |
| Inbox | Session | — | recipient resolution / own items | shared-org recipient | **PASS** |
| Messages | Session | — | thread participation | no org-peer gate on new DM | **PASS** (thread); DM recipient open = limitation |
| Billing | Session | `billing.manage` on mutate | own subscription row | voids client org | **PASS** |
| Stripe | Session; webhook `@Public` | — | session ownership binding | — | **PASS** (code) |
| Reports | Session | projects.read (service) | project ACL / accessible projects | ignores client orgId | **PASS** |
| Portfolio / Insights | Session | projects.read (service) | `accessibleProjectsWhere` | org members included | **PASS** |
| Settings | Session | allowlist | self User only | voids org/user spoof | **PASS** |
| Admin | Session | `@Roles(admin)` + `admin.access` | admin-only | — | **PASS** |

---

## Billing/Stripe status

**Classification:** **Configuration Required** (+ code ready for fail-closed paid entitlement)

### Code readiness — READY

| Capability | Code status |
|------------|-------------|
| Session-status ownership binding | Implemented; mock blocked in prod |
| Checkout | Real Stripe when key+SDK; else prod 503 |
| Portal | Requires customer id + Stripe; prod fail-closed |
| Cancel | Own subscription status update |
| Free plan change | Allowed without Stripe |
| Paid change-plan | Rejected without verified Stripe subscription |
| Webhook signature | `constructEvent` required; no unsigned JSON |
| Mock payment in production | Disabled |

### External Stripe configuration required

| Item | Required for |
|------|----------------|
| `STRIPE_SECRET_KEY` (live) | Checkout / portal / session retrieve |
| `STRIPE_WEBHOOK_SECRET` | Webhook entitlement updates |
| Stripe Price IDs passed from FE/checkout | Paid plan purchase |
| Customer Portal enabled in Stripe Dashboard | “Update card” / reactivation UX |
| Webhook endpoint registered to Cloud Run `/api/stripe/webhook` | Paid activation after checkout |
| Success/cancel URLs (`STRIPE_*` or FE origin) | Checkout redirect |

### Known limitation

- No webhook **event-id** idempotency table (duplicate delivery risk: usually safe re-apply of same status; **acceptable to defer** for controlled launch).

**If paid plans are in scope:** Stripe config is a **hard pre-launch requirement**.  
**If launch is free-tier only:** disable/hide paid checkout CTA until configured.

---

## Functional status

| Domain | Completeness | Launch acceptability |
|--------|--------------|----------------------|
| Projects | Implemented + ACL | Yes |
| Deals | Implemented + ACL | Yes (with public reply caution) |
| Team | Implemented + ACL | Yes |
| Tasks | Implemented + ACL | Yes |
| Inbox / Messages | Implemented + ACL | Yes |
| Vendor portal | Implemented + ACL | Yes |
| Billing free | Implemented | Yes |
| Billing paid | Code ready; config dependent | Only with Stripe configured |
| KPI estimates | Unavailable (honest) | Yes if UI shows incomplete |
| Portfolio estimated value | Unavailable (honest) | Yes if UI shows incomplete |
| Reports ledger | Empty stub | Yes **only if** empty ledger is accepted |
| Marketplace investors | Partial (PII) | Only after email strip or route gated |
| Wave-2 (Plaid/REIL/loans/etc.) | Not on Nest HTTP | Must stay out of launch cut |

---

## Frontend/API status

| Check | Result | Launch impact |
|-------|--------|---------------|
| Relative `fetch('/api...')` in app UI | Not found; `apiFetch` used | OK |
| Hardcoded `org-1` in live panels | Not in production UI paths (seed-store unused by components) | OK |
| Mock flags FE/Nest | Aligned; prod hard-off | OK |
| Stripe FE wiring | Checkout/portal/cancel/session-status present | Needs Stripe env |
| FE `purchasePrice * 1.25` (`ProjectFolderCard`) | Still presents invented “Est. Exit” | **Misleading UX** — known limitation; hide or show “—” for launch |
| Stale docs (`API_GAP_OVERVIEW.md`) | Mentions Next `/api` routes / seed SoT | Doc debt only — not runtime |

**Frontend/API verdict:** **PARTIAL** — contract for Wave-1 Nest is sound; FE multiplier + marketplace privacy need launch discipline.

---

## Infrastructure status

| Requirement | Required | Configured in code | External action | Status |
| ----------- | -------- | ------------------ | --------------- | ------ |
| `NODE_ENV=production` | Yes | Runtime | Set on Cloud Run / Vercel | **OPS** |
| `NEXT_PUBLIC_API_URL` (prod Nest URL) | Yes | FE `getApiBaseUrl()` throws if missing in prod | Set on Vercel | **OPS** |
| `CORS_ORIGINS` / app origin | Yes | `main.ts` | Set to production FE origin(s) | **OPS** |
| Firebase client `NEXT_PUBLIC_FIREBASE_*` | Yes | FE auth | Firebase console | **OPS** |
| Firebase Admin `FIREBASE_*` | Yes | Nest session verify | Service account | **OPS** |
| `DATABASE_URL` (+ pooler) | Yes | Prisma | Supabase | **OPS** |
| `USE_MOCK_DATA` / `ENABLE_MOCK_AUTH` | Must be false/ignored | Prod hard-off even if true | Confirm unset/false | **OPS** |
| `STRIPE_SECRET_KEY` | For paid | Fail-closed if missing | Stripe Dashboard | **OPS (paid)** |
| `STRIPE_WEBHOOK_SECRET` | For paid entitlement | Fail-closed if missing | Stripe webhook | **OPS (paid)** |
| Stripe Price IDs | For paid checkout | Client/body | Stripe Products | **OPS (paid)** |
| Nest build (`tsc` → `dist/main.js`) | Yes | `apps/api` scripts | CI/CD | Ready |
| Health endpoint | Yes | `/api/health` `@Public` | Probe | Ready |

---

## Database/data integrity status

| Topic | Classification |
|-------|----------------|
| User vs AppUser split | **Safe to defer** — Nest Wave-1 SoT is Prisma `User` (`docs/USER_APPUSER_SOURCE_OF_TRUTH.md`) |
| Org membership / project ownership | **Known limitation** if data incomplete, but model + ACL exist |
| Vendor ↔ org | Fixed attach path; **safe** for launch |
| Billing `Subscription` ↔ `User` | Used by Nest billing; **safe** |
| AppUser Stripe fields unused by Nest billing | **Architecture debt** — safe to defer |
| Prisma migrations needed for launch | **None required by this gate** |

User/AppUser consolidation is **not** a launch blocker for Wave-1 Nest.

---

## Known limitations

1. Public marketplace investors expose email (P3 privacy).
2. Public deals reply open to abuse/spam.
3. Messages allow new thread to arbitrary `recipientId` (thread inject fixed; peer policy soft).
4. Reports period ledger empty.
5. KPI/portfolio estimates unavailable by design.
6. Nest auth email endpoints not implemented (Firebase client).
7. Webhook event-id idempotency table absent.
8. FE project card may show `purchasePrice * 1.25` as Est. Exit.
9. Wave-2 handlers exist in repo but are **not** served by Nest Cloud Run.
10. Some endpoints lack `@RequirePermissions` but remain session-scoped with service ACL.

---

## Production blockers

| Item | Class | Blocking controlled Wave-1 launch? |
|------|-------|--------------------------------------|
| A. Wave-2 outside Nest | Architecture / functional | **Only if** those features are in the launch cut — otherwise gate UI |
| B. Reports ledger empty | Functional | **Only if** ledger is a launch requirement — else accept empty |
| C. Stripe prices/portal config | Configuration | **Yes for paid**; no for free-tier-only launch |
| D. User/AppUser consolidation | Architecture debt | **No** |
| E. Webhook event-id idempotency | Architecture debt | **No** (defer acceptable) |
| F. FE ×1.25 display | Functional / trust | **Soft blocker** for financial messaging honesty — hide/`—` recommended |
| G. Public investor emails | Privacy | **Yes if marketplace investors public** — strip email or unpublish |

---

## Pre-launch checklist

### Must do before controlled launch

- [ ] Set production `NODE_ENV=production` on Nest + Next
- [ ] Set `NEXT_PUBLIC_API_URL` to Cloud Run Nest URL
- [ ] Set `CORS_ORIGINS` to production FE origin(s) with credentials
- [ ] Configure Firebase client + Admin credentials
- [ ] Configure Supabase `DATABASE_URL` (and migrate/deploy Wave-1 schema if not already)
- [ ] Confirm mock flags false/ignored (`USE_MOCK_DATA` / `ENABLE_MOCK_AUTH` / `NEXT_PUBLIC_*`)
- [ ] **Either** strip/hide marketplace investor emails **or** remove public investors from launch
- [ ] Confirm Wave-2 routes/screens are not linked in production navigation
- [ ] Decide free-tier-only **or** complete Stripe live config (secret, webhook, prices, portal)
- [ ] Smoke: unauthenticated → 401; authed project/deal happy path; checkout fail-closed without keys (or real checkout with keys)
- [ ] Product sign-off: empty reports ledger + unavailable KPI/portfolio estimates are acceptable

### Strongly recommended before launch

- [ ] Stop FE `purchasePrice * 1.25` from rendering as authoritative Est. Exit (show `—` / unavailable)
- [ ] Disable or rate-limit public deals reply if spam risk is material
- [ ] Document support path for password reset via Firebase only

### Explicitly deferred (do not start without approval)

- [ ] Wave-2 Nest migration
- [ ] User/AppUser merge / schema redesign
- [ ] Webhook event-id persistence table
- [ ] Real KPI/ARV formula engine
- [ ] Reports transaction ledger schema

---

## Deferred architecture work

- Wave-2 (~200+ legacy handlers under `apps/api/src/routes/**`) → Nest modules
- User / AppUser consolidation
- Stripe webhook idempotency store
- Financial-engine-backed KPIs
- Transaction ledger for period reports
- Optional: require shared-org for message recipients
- Optional: strip vendor contact emails from authed directory listings

---

## Prior recommendation (historical)

Wave-1 Nest security posture is acceptable to proceed for the audited surface with env + product gating. Do **not** start schema merges or Wave-2 migration without explicit approval.

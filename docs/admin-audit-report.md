# PaperWorking SaaS Admin Panel — Codebase Audit & Baseline Report

**Date:** August 12, 2026  
**Safety Commit SHA:** `75e15495b522262e304342009fe8b3518674374e`  
**Git Safety Tag:** `admin-baseline`  
**Repository Path:** `/Users/yvesdarbouze/Documents/PaperWorking`

---

## 1. Stack Confirmation

- **Framework & Runtime:** Next.js `16.2.11` (App Router in `src/app/`), React `19.2.4`, Node.js `22`.
- **Language:** TypeScript `5.x` (`npx tsc --noEmit` clean).
- **Styling System & UI:** Tailwind CSS `v4` (`@tailwindcss/postcss: ^4`, `tailwindcss: ^4`), Lucide React icons (`lucide-react: ^1.14.0`), Framer Motion (`framer-motion: ^11.0.0`), Chart.js / ECharts / Recharts. Design tokens & variables defined in `src/app/globals.css`.
- **Auth Provider:** Firebase Auth (`firebase: ^12.12.0`, `firebase-admin: ^13.8.0`, `next-firebase-auth-edge: ^1.12.0`). Custom claims and role checks (`Platform Admin`, `Admin`, `Lead Investor`).
- **Database & ORM Layer:** Dual database architecture:
  - **Prisma ORM `7.7.0`**: PostgreSQL via `@prisma/adapter-neon` (`dev.db`).
  - **Cloud Firestore**: Real-time collections (`users`, `projects`, `listings`, `deals`, `notifications`, `gate_events`).
- **Payment Processor:** Stripe (`stripe: ^22.0.1`, `@stripe/stripe-js: ^7.9.0`, `@stripe/react-stripe-js: ^3.1.0`).
- **Financial Aggregator:** Plaid (`plaid: ^20.0.0`, `react-plaid-link: ^3.6.1`).
- **Transactional Email Provider:** Resend (`resend: ^6.12.3`) integrated with `CommunicationEngine` and Prisma `EmailLog`.
- **Document Signing:** DocuSign (`docusign-esign: ^9.0.0`).
- **Telemetry & Monitoring:** PostHog (`posthog-node: ^5.21.2`, `posthog-js: ^1.376.4`) and Sentry (`@sentry/nextjs: ^10.55.0`).
- **Test Runners:** Jest `^29.7.0` (`ts-jest`), Playwright (`@playwright/test: ^1.60.0`).
- **CI / Deployment Config:** `.github/workflows/firebase-hosting-merge.yml`, `cloudbuild.yaml`, `apphosting.yaml`.

---

## 2. Route & Feature Inventory

### Existing Core Features & Routes
1. **Portfolio Dashboard:** [`/dashboard/command-center`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/command-center/page.tsx) — Main landing page displaying active pipeline, KPIs, heatmap, activity feed.
2. **Projects & REIL Workspaces:** [`/dashboard/projects`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/projects/page.tsx) — Phase 1 (Acquisition), Phase 2 (Fund), Phase 3 (Hold), Phase 4 (Exit).
3. **Insights Hub (33 KPIs):** [`/dashboard/insights`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/insights/page.tsx) — Portfolio-wide metrics, financial charts, 10-KPI scorecard.
4. **Marketplaces:** [`/dashboard/deals`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/deals/page.tsx) (Deal Marketplace), [`/dashboard/marketplace`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/marketplace/page.tsx) (Vendor Marketplace), [`/marketplace/investors`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/marketplace/investors/page.tsx).
5. **Phase Gates & Override Governance:** [`src/actions/gate.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/gate.ts), [`src/actions/listings.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/listings.ts). Overrides require explicit `overrideReason` and are logged in Firestore documents and activity feeds.
6. **Billing & Settings:** [`/dashboard/settings/billing`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/billing/page.tsx) — Tier plans, payment methods, Stripe portal link.
7. **Plaid Integration:** [`src/app/api/plaid/`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/plaid/) — Bank connections, transaction syncing, P&L category taxonomy (51 categories).

### Existing Admin Shell & Sub-Routes (`/admin`)
- **Admin Layout:** [`src/app/admin/layout.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/layout.tsx) — Role guard (`Platform Admin`, `Admin`, `Lead Investor`).
- **Command Center:** [`src/app/admin/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/page.tsx).
- **Sub-Surfaces:** `/admin/users`, `/admin/subscriptions`, `/admin/marketplace`, `/admin/agent-crew`, `/admin/audit`, `/admin/analytics`, `/admin/tickets`.

---

## 3. Data-Layer Inventory

1. **Auth Users:**
   - Prisma Model: `AppUser` (`id`, `email`, `name`, `syntheticAgent`, `agentPersona`).
   - Tenant Model: Single-tenant per user (`createdById` on `ReilProject`), with collaborative permissions via `ProjectCollaborator` (`OWNER`, `PARTNER`, `ANALYST`, `VIEWER`) and `organizationId` grouping on sub-entities.
   - User Role Storage: `AppUser` lacks a Prisma `role` field; roles are stored in Firebase Auth custom claims and `profile.role` (`Platform Admin`, `Admin`, `Lead Investor`, `vendor`, `investor`).

2. **Stripe:**
   - Customer ID: Stored in Firestore (`users/{uid}.stripeCustomerId`). Missing on Prisma `AppUser` model.
   - Status & Pricing: Cached in Firestore (`users/{uid}.subscriptionStatus`).
   - Webhook Handler: [`src/app/api/stripe/webhook/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/stripe/webhook/route.ts). Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.

3. **Plaid:**
   - DTM Compliance Model: `PlaidConnection` (`itemId`, `institutionName`, `institutionId`, `status`, `syncErrorCount`, `lastSyncErrorMessage`, `webhookUrl`, `consentedProducts`, `consentTimestamp`).
   - Access Tokens: Encrypted at application layer via `tokenVault` before database persistence.
   - Support Identifiers: `itemId` and `plaidEventId` persisted. `request_id` and `link_session_id` captured in consent events.
   - Webhook Signature: `Plaid-Verification` JWT verification is currently missing from webhook handlers.

4. **Support & Communications:**
   - Transports: Resend SDK (`resend: ^6.12.3`) + `CommunicationEngine` ([`src/lib/engine/CommunicationEngine.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/engine/CommunicationEngine.ts)).
   - Surfaces: Contact page ([`/contact`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/contact/page.tsx)) and endpoint ([`/api/contact`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/contact/route.ts)).

---

## 4. Existing Mock / Seed / Demo Content Catalog

The following seed scripts, test fixtures, and synthetic agent data exist in the codebase:

| File Path | What It Fakes / Contains | Where Rendered / Purpose |
| :--- | :--- | :--- |
| `scripts/seed.ts` | Seed projects, users, financials | Development database initialization (`npm run db:seed`) |
| `scripts/seedAgentCrew.ts` | Synthetic agent profiles (`Marcus Chen`, `Dana Rodriguez`, `J. & Patricia Whitmore`, `Eleanor Vance`, `Robert Kim`) | Agent Crew test roster in `/admin/agent-crew` |
| `e2e/mocks.ts` | Intercepted API responses, mock network fixtures | Playwright E2E test isolation |
| `src/app/api/e2e/` | Development test bypass endpoints | Isolated test runner authentication |

> **Constraint Reminder:** No new mock data, fake tickets, or synthetic fixtures will be added during the SaaS Admin Panel build. Elements requiring data that does not exist yet will render honest empty states or wire to real Firestore/Postgres backends.

---

## 5. Terminology Scan Results ("Sponsor" Check)

A case-insensitive repository-wide scan for `"Sponsor"` yielded **0 occurrences in production code**.

- **Source Code (`src/`):** 0 product code occurrences. (Matches in `src/` are exclusively inside standing anti-regression unit tests: [`src/__tests__/marketplacesSubnav.test.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/__tests__/marketplacesSubnav.test.tsx) and [`src/__tests__/supportSearchIndex.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/__tests__/supportSearchIndex.test.ts)).
- **External Dependencies & References:** Occurrences outside `src/` are limited to npm `package-lock.json` GitHub funding links (`github.com/sponsors/...`) and skill reference CSV files.

---

## 6. Baseline Test Contract

The following baseline test counts were recorded on August 12, 2026 against commit `75e15495b522262e304342009fe8b3518674374e`:

### Command 1: `npx tsc --noEmit`
- **Result:** **0 errors (CLEAN)**.

### Command 2: `npx jest` (Full Repository Test Suite)
- **Total Test Suites:** **314** (305 passed, 9 failed)
- **Total Tests:** **3,020** (2,977 passed, 43 failed)
- **Pre-existing Failing Test Suites:**
  1. [`src/__tests__/navContract.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/__tests__/navContract.test.ts)
  2. [`src/messaging/agent-messages.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/messaging/agent-messages.test.ts)
  3. [`src/marketplace/listings.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/marketplace/listings.test.ts)
  4. [`src/app/admin/agent-crew/admin-dashboard.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/agent-crew/admin-dashboard.test.ts)
  5. [`src/scripts/seedAgentCrew.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/scripts/seedAgentCrew.test.ts)
  6. [`src/__tests__/marketplacesSubnav.test.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/__tests__/marketplacesSubnav.test.tsx)
  7. [`src/__tests__/mobileSearchShell.test.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/__tests__/mobileSearchShell.test.tsx)
  8. [`src/types/deals.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/types/deals.test.ts)
  9. [`src/__tests__/marketingCopyLock.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/__tests__/marketingCopyLock.test.ts)

### Command 3: `npx jest src/__tests__/` (Unit Test Subset)
- **Total Test Suites:** **263** (259 passed, 4 failed)
- **Total Tests:** **2,598** (2,590 passed, 8 failed)

### Command 4: `npx playwright test`
- **Spec Status:** Execution blocked by dev server initialization error (documented in Risks).
- **`e2e/hurdle-test.spec.ts` Check:** Verified **PRESENT** (`e2e/hurdle-test.spec.ts`, 8,018 bytes).

---

## 7. Gap Report Table

| Phase Assumption | Exists? | Evidence (File Path) | What the Phase Must Create |
| :--- | :--- | :--- | :--- |
| **Roles / RBAC Fields** | Partial | `profile.role` checked in [`src/app/admin/layout.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/layout.tsx). No `role` field on `AppUser` model in [`prisma/schema.prisma`](file:///Users/yvesdarbouze/Documents/PaperWorking/prisma/schema.prisma#L342). | Add explicit `role` column on `AppUser` Prisma model and server-side custom claim verification (Prompt 1). |
| **Central Audit Log System** | Partial | `overrideReason` and `gate_events` stored in [`src/actions/gate.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/gate.ts#L192) and [`src/actions/listings.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/listings.ts#L454). No central `AdminAuditLog` table. | Create `AdminAuditLog` model in Prisma & Firestore with IP, actor, action, target, and timestamp (Prompt 1). |
| **Stripe Customer-ID Cross-Reference** | Partial | `stripeCustomerId` written to Firestore `users/{uid}` in [`src/app/api/stripe/webhook/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/stripe/webhook/route.ts#L60). Missing from `AppUser` in Prisma. | Add `stripeCustomerId` column to `AppUser` Prisma model for bi-directional SQL federation (Prompt 4). |
| **Stripe Restricted-Key Strategy** | No | `STRIPE_SECRET_KEY` used directly in API handlers. | Implement restricted-key interface for admin billing operations (Prompt 4). |
| **Plaid Item Status & Error Fields** | Yes | `PlaidConnection` model in [`prisma/schema.prisma`](file:///Users/yvesdarbouze/Documents/PaperWorking/prisma/schema.prisma#L1146) has `status`, `syncErrorCount`, `lastSyncErrorMessage`, `webhookUrl`. | Wire status/error badges and webhook status reconciliation in Admin Plaid Health tab (Prompt 5). |
| **Plaid Support Identifiers (`item_id`, `request_id`, `link_session_id`)** | Partial | `itemId` stored in `PlaidConnection` and `PlaidConsentEvent`. `request_id` and `link_session_id` not stored in Prisma. | Persist `request_id` and `link_session_id` on consent events for support triage (Prompt 5). |
| **Plaid Webhook Verification (`Plaid-Verification` JWT)** | No | No `Plaid-Verification` header verification found in `src/`. | Add JWT signature verification middleware for Plaid webhooks (Prompt 5). |
| **Transactional Email Capability** | Yes | Resend SDK (`resend: ^6.12.3`) + `CommunicationEngine` in [`src/lib/engine/CommunicationEngine.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/engine/CommunicationEngine.ts) + `EmailLog` in Prisma. | Reuse `CommunicationEngine` for admin support inbox replies and saved responses (Prompt 3). |
| **Contact-Form Surface** | Yes | [`src/app/contact/page.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/contact/page.tsx) and [`src/app/api/contact/route.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/contact/route.ts). | Connect contact submissions to Firestore `support_tickets` collection for admin support inbox (Prompt 3). |
| **Org / Tenant Model** | Partial | `organizationId` present on `RehabProject`, `SourcingLead`, `Vendor`, `HoldCostRecord` in [`prisma/schema.prisma`](file:///Users/yvesdarbouze/Documents/PaperWorking/prisma/schema.prisma#L11). No standalone `Organization` table. | Maintain single-tenant per-user model with `organizationId` grouping where needed (Prompt 2). |
| **Masking Helpers** | Partial | Masking helpers exist in [`src/lib/utils.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/lib/utils.ts) for PII/billing/Plaid masks (`accountMask`). | Create standardized masking utility helper for admin views (Prompt 2). |
| **Next.js 16 Dev Server Middleware vs Proxy Coexistence** | No (Blocker) | Both [`src/middleware.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/middleware.ts) and [`src/proxy.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking/src/proxy.ts) exist, causing `next dev` to throw `Unhandled Rejection` on launch. | Consolidate `src/middleware.ts` into `src/proxy.ts` in a subsequent prompt so Next.js dev server starts cleanly for E2E tests. |

---

## 8. Surprises & Risks

1. **Next.js 16 Dev Server Initialization Failure:** Next.js 16.2.11 throws `Unhandled Rejection: Error: Both middleware file "./src/middleware.ts" and proxy file "./src/proxy.ts" are detected` when starting `next dev`. Consolidating middleware into `src/proxy.ts` is required before Playwright E2E tests can run cleanly against a dev server instance.
2. **Dual User Role Storage:** User roles currently live in Firebase Auth custom claims and Firestore `users/{uid}`, but are missing from the Prisma `AppUser` SQL schema.
3. **Plaid Webhook Verification Gap:** Incoming Plaid webhooks do not verify the `Plaid-Verification` JWT header before processing payload status updates.

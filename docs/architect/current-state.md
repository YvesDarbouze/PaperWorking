# PaperWorking — Current State Audit

> **Audited**: 2026-05-31 · **Architect**: @architect  
> **Codebase**: 817 `.ts`/`.tsx` files · Next.js 16.2.3 · React 19.2.4 · TypeScript strict  
> **Master schema**: `src/types/schema.ts` (52 KB, 1,567 lines, ~60 interfaces)

---

## 1. Auth

**Status**: ✅ Real (verified working)

| File | Purpose |
|------|---------|
| `src/lib/auth/sessionService.ts` | Session cookie management |
| `src/lib/auth/AuthorizationService.ts` | Permission checks against role matrix |
| `src/lib/auth/RoleDefinitions.ts` | Role → Permission mappings (12 roles) |
| `src/lib/auth/csrf.ts` | CSRF token generation and validation |
| `src/lib/firebase-admin/auth-guard.ts` | Server-side auth guard (Admin SDK) |
| `src/app/(auth)/login/page.tsx` | Login page |
| `src/app/(auth)/forgot-password/page.tsx` | Password reset |
| `src/app/api/auth/` | Auth API routes |
| `src/components/auth/` | Auth UI components |
| `src/components/RoleGuard.tsx` | Client-side role gate component |

**Functions exposed**: `getSessionUser()`, `verifySession()`, `signIn()`, `signOut()`, `csrfToken()`, `RoleGuard`  
**Data model**: `users/{uid}`, `users/{uid}/sessions/{sessionId}` (Firestore)  
**Auth provider**: `next-firebase-auth-edge` session cookies + Firebase Auth  
**Missing**: MFA, session revocation across devices

---

## 2. Projects

**Status**: ✅ Real (core CRUD + lifecycle)

| File | Purpose |
|------|---------|
| `src/types/schema.ts` | `Project` interface (lines 540–597), `ProjectFinancials` (lines 744–946) |
| `src/lib/firebase/deals.ts` | Firestore CRUD for projects (15 KB) |
| `src/store/projectStore.ts` | Zustand store (38 KB — largest store) |
| `src/actions/index.ts` | Server actions for project ops |
| `src/hooks/useProjectSync.ts` | Real-time Firestore sync |
| `src/hooks/useAllProjectsSync.ts` | Portfolio-wide sync |
| `src/hooks/useProjectWizardMachine.ts` | Creation wizard state machine |
| `src/hooks/useProjectFormValidation.ts` | Form validation hooks |
| `src/lib/services/dealStateMachine.ts` | Deal phase state machine (8 KB) |
| `src/lib/services/projectStateMachine.ts` | Project lifecycle state machine (8 KB) |
| `src/app/dashboard/projects/page.tsx` | Project list page |
| `src/app/dashboard/projects/[id]/phase-1/` | Phase 1: Find and Fund |
| `src/app/dashboard/projects/[id]/phase-2/` | Phase 2: Acquisition |
| `src/app/dashboard/projects/[id]/phase-3/` | Phase 3: Hold and Rehab |
| `src/app/dashboard/projects/[id]/phase-4/` | Phase 4: Exit |

**Phase pipeline**: `Sourcing → Under Contract → Rehab → Listed → Sold / Rented`  
**Sub-collections**: `projects/{id}/ledgerItems`, `projects/{id}/phaseSnapshots`, `projects/{id}/vendorRequests`, `projects/{id}/privateFinancials`  
**Phase snapshots**: Immutable `Phase1Snapshot`, `Phase2Snapshot`, `Phase3Snapshot` captured on phase advance

---

## 3. Metrics Engine

**Status**: ✅ Real (pure functions, zero test coverage)

| File | Purpose |
|------|---------|
| `src/lib/metrics/reiMetrics.ts` | 1,396-line pure-function engine |
| `src/lib/metrics/index.ts` | Barrel export |
| `src/lib/metrics/snapshotService.ts` | KPI snapshot persistence to Firestore (256 lines) |
| `src/lib/metrics/snapshotService.admin.ts` | Admin SDK snapshot writer |
| `src/lib/financials/dealMetrics.ts` | `computeFlipMetrics()`, `computeHoldMetrics()`, `dealHealthColor()` |
| `src/lib/math/calculatorUtils.ts` | `computeAutopsyMetrics()`, `calculateSeventyPercentRule()` (15 KB) |
| `src/hooks/useMetricSnapshots.ts` | Hook for reading metric snapshots |
| `src/hooks/usePropertyMetricSnapshots.ts` | Property-level snapshot hook |
| `src/hooks/usePortfolioMetricSnapshots.ts` | Portfolio-weighted aggregation (16 KB) |
| `src/lib/services/ProjectMetricsService.ts` | Metrics service layer |

**Core functions (D1–D10+)**:

| ID | Function | Formula |
|----|----------|---------|
| D1 | `computeNOI()` / `computeNOIComponents()` | Income - Vacancy - OpEx |
| D2 | `computeCashFlow()` | NOI - Debt Service |
| D3 | `computeCapRate()` | NOI / Property Value x 100 |
| D4 | `computeCoCReturn()` | Annual CF / Cash Invested x 100 |
| D5 | `computeGRM()` | Price / Gross Annual Rent |
| D6 | `computeDSCR()` | NOI / Annual Debt Service |
| D7 | `computeIRR()` + `buildIRRCashFlows()` | Newton-Raphson NPV solver |
| D8 | `computeLTV()` | Loan / Property Value x 100 |
| D9 | `computeOER()` | OpEx / Gross Rent x 100 |
| D10 | `computeOccupancyRate()` | Occupied / Total x 100 |
| Extra | `computeMAO()` | 70% Rule: ARV x 0.7 - Rehab |
| Extra | `computeFlipNetProfit()` | Sale - All-In Cost |
| Extra | `computeFlipROI()` | Net Profit / Cash Invested x 100 |
| Extra | `computeRenovationROI()` | Zone-based NAR benchmarks |
| Extra | `computeHealthScore()` | Cap rate + DSCR + CoC composite |
| Master | `deriveAllMetrics()` | Aggregates all D1-D10 into `DerivedMetrics` |

**Data model**: `propertyMetricSnapshots` (top-level collection), `PropertyMetricSnapshot` type  
**Critical gap**: Zero unit tests on the entire metrics engine

---

## 4. Marketplace (Vendor System)

**Status**: ✅ Real (lifecycle works)

| File | Purpose |
|------|---------|
| `src/actions/marketplace.ts` | Server actions for vendor ops |
| `src/actions/vendorAssignment.ts` | Assignment lifecycle (15 KB) |
| `src/app/dashboard/marketplace/page.tsx` | Marketplace browse page |
| `src/app/dashboard/marketplace/[vendorId]/page.tsx` | Vendor profile page |
| `src/app/vendor-portal/page.tsx` | Vendor self-service portal |
| `src/app/api/vendors/` | Vendor API routes |
| `src/app/api/vendor-portal/` | Vendor portal API |
| `src/components/marketplace/` | Marketplace components |

**Types**: `VendorProfile`, `VendorAssignment`, `VendorRequest`, `VendorReview`  
**Collections**: `vendorAssignments`, `vendorRequests` (sub-collection), `vendorInbox`  
**Status lifecycle**: `PENDING → ACCEPTED → COMPLETED` (or `DECLINED`/`CANCELLED`)  
**Gap**: No vendor-scoped Firestore rules — vendor reads are not yet tenant-isolated

---

## 5. Billing (Stripe)

**Status**: ✅ Real (subscriptions, webhooks, portal)

| File | Purpose |
|------|---------|
| `src/lib/stripe/plans.ts` | Plan definitions (Individual, Team, Vendor Network) |
| `src/lib/stripe/subscription.ts` | Subscription helpers |
| `src/app/api/stripe/` | Stripe API routes |
| `src/app/api/webhooks/` | Webhook handler (Stripe events) |
| `src/app/checkout/` | Checkout flow |
| `src/app/dashboard/settings/billing/page.tsx` | Billing settings page |
| `src/hooks/useBilling.ts` | Billing hook |
| `src/hooks/usePaywall.ts` | Paywall gate hook |
| `src/components/billing/` | Billing UI components |

**Data model**: `stripe_events`, `pending_subscriptions` collections; `stripeCustomerId` / `stripeSubscriptionId` on `ApplicationUser`  
**Subscription states**: `inactive | active | past_due | canceled | trialing | incomplete | paused`  
**Plans**: None, Individual, Team, Vendor Network

---

## 6. Inbox and Notifications

**Status**: ✅ Real (real-time onSnapshot)

| File | Purpose |
|------|---------|
| `src/hooks/useInboxFeed.ts` | Real-time Firestore subscription (9 KB) |
| `src/hooks/useInboxThreads.ts` | Thread aggregation |
| `src/app/dashboard/inbox/` | Inbox dashboard page |
| `src/app/api/inbox/` | Inbox API |
| `src/app/api/notifications/` | Notification API |
| `src/lib/services/notificationService.ts` | 22 KB notification dispatch engine |
| `src/store/notificationPreferencesStore.ts` | Zustand store for notification prefs |
| `src/components/inbox/` | Inbox UI components |
| `src/types/inbox.ts` | Inbox types (7.6 KB) |
| `src/types/notification.ts` | Notification types (9.4 KB) |

**Collections**: `inboxItems`, `notifications`  
**Email system**: Resend integration with 9 templates in `src/lib/emails/templates/`  
**Templates**: DocumentUploadEmail, InboxDigestEmail, InvestorPledgeEmail, InvestorResponseEmail, PhaseAdvanceEmail, ProjectClosedEmail, SystemNotificationEmail, UserComposedEmail

---

## 7. Intelligence (13 Metric Visualization Pages)

**Status**: ✅ Real (wired to metrics engine)

| Dashboard Route | Component |
|----------------|-----------|
| `/dashboard/intelligence` | Landing page with metric cards |
| `/dashboard/intelligence/noi` | NOIWaterfallHero.tsx |
| `/dashboard/intelligence/cash-flow` | CashFlowIntelligenceCard.tsx |
| `/dashboard/intelligence/cap-rate` | CapRateIntelligenceCard.tsx |
| `/dashboard/intelligence/coc` | CoCIntelligenceCard.tsx |
| `/dashboard/intelligence/grm` | GRMComparisonCard.tsx + GRMTriageTerminal.tsx |
| `/dashboard/intelligence/dscr` | DSCRThresholdCard.tsx + DSCRRiskStripTerminal.tsx |
| `/dashboard/intelligence/ltv` | LTV analysis page |
| `/dashboard/intelligence/oer` | ExpenseRatioCollectionTerminal.tsx |
| `/dashboard/intelligence/occupancy` | OccupancyCollectionTerminal.tsx |
| `/dashboard/intelligence/irr` | IRRScenarioComparisonCard.tsx + IRRExitAssumptionsTerminal.tsx |
| `/dashboard/intelligence/appreciation` | AppreciationCollectionTerminal.tsx |
| `/dashboard/intelligence/comparison` | Cross-property comparison |
| `/dashboard/intelligence/performance` | Portfolio performance |

**Deal Analyzer**: DealAnalyzerTerminal.tsx (85 KB — single largest component)

---

## 8. Admin

**Status**: ✅ Real (live Firestore + Stripe stats)

| File | Purpose |
|------|---------|
| `src/app/admin/page.tsx` | Admin dashboard (14 KB) |
| `src/app/admin/analytics/` | Platform analytics |
| `src/app/admin/audit/` | Audit log viewer |
| `src/app/admin/marketplace/` | Vendor management |
| `src/app/admin/subscriptions/` | Subscription management |
| `src/app/admin/tickets/` | Support ticket admin |
| `src/app/admin/users/` | User management |
| `src/actions/admin.ts` | Admin server actions (19 KB) |
| `src/lib/admin/` | Admin utilities |
| `src/components/admin/` | Admin UI components |

**Collections**: `auditLog`, `support_tickets`, `support_messages`

---

## 9. Data Room (Portfolio Analytics)

**Status**: Partial (charts real, PDF export stubbed)

| File | Purpose |
|------|---------|
| `src/app/dashboard/data-room/page.tsx` | Data room page (49 KB — second largest page) |
| `src/components/Charts/` | Chart components |
| `src/hooks/usePortfolioSync.ts` | Portfolio data sync |

**Charts**: Chart.js, Recharts, ECharts (3 charting libraries)  
**Stub**: PDF report export is `alert("PDF report generation will be available in the next release.")`

---

## 10. Sourcing (Lead Management)

**Status**: ✅ Real

| File | Purpose |
|------|---------|
| `src/app/dashboard/sourcing/page.tsx` | Sourcing dashboard |
| `src/components/sourcing/` | Sourcing UI components |
| `src/components/findandfund/` | Find and Fund module components |

**Types**: `ProspectProperty`, `HistoricalProperty`, `OfferLetter`, `FundingPledge`, `LOIDocument`, `InvestorCommitment`

---

## 11. Documents

**Status**: Faked (uploads simulated)

| File | Purpose | Status |
|------|---------|--------|
| `src/components/project/ProjectCreationWizard.tsx` | File upload in wizard | setTimeout fake |
| `src/components/shared/ESignAction.tsx` | E-signature action | setTimeout fake |
| `src/components/GCBidUploader.tsx` | GC bid upload (32 KB) | Uses OCR API routes |
| `src/app/api/ocr/` | OCR routes (gc-bid, inspection, phase-i, settlement) | All use setTimeout to simulate OCR |

**Types**: `DealDocument`, `RoleLinkedDocument`, `SettlementDocument`  
**No Firebase Storage integration**: No actual file upload/download  
**No Google Document AI**: OCR routes return simulated data  

---

## 12. Settings

**Status**: Mixed (notifications real, profile/general faked)

| Page | File | Status |
|------|------|--------|
| Profile | `src/app/dashboard/settings/profile/page.tsx` | setTimeout fakes for save/connect/delete |
| Billing | `src/app/dashboard/settings/billing/page.tsx` | Real (Stripe Customer Portal) |
| Notifications | `src/app/dashboard/settings/notifications/page.tsx` | Real (Firestore persistence) |
| General | `src/app/dashboard/settings/general/page.tsx` | setTimeout fakes |
| Team | `src/app/dashboard/settings/team/page.tsx` | Partial (team actions real, some setTimeout) |

**Store**: `src/store/settingsStore.ts` (2.7 KB)

---

## 13. Support

**Status**: Partial

| File | Purpose |
|------|---------|
| `src/app/support/page.tsx` | Support/help center page |
| `src/components/support/` | Support components |
| `src/app/admin/tickets/` | Ticket admin |

**Collections**: `support_tickets`, `support_messages`  
**Gap**: Chat FAB has no onClick handler

---

## 14. Landing / Marketing

**Status**: ✅ Real (static pages)

| Route | Page |
|-------|------|
| `/` | Homepage |
| `/about` | About page |
| `/pricing` | Pricing page |
| `/how-it-works` | How it works |
| `/blog` | Blog |
| `/careers` | Careers |
| `/contact` | Contact |
| `/faq` | FAQ |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/cookies` | Cookie policy |
| `/data-deletion` | Data deletion info |
| `/invest/[token]` | Guest investor portal |
| `/invite/team` | Team invitation acceptance |

**Components**: `src/components/landing/` (HeroDashboard, FastDiscovery, PricingSection, LeadCapture)  
**Dead links**: 7 `href="#"` instances across auth layout, support, OperationalDashboardView, LeadCapture

---

## 15. Infrastructure

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/redis.ts` | Redis singleton (ioredis) | Real |
| `src/lib/firebase/config.ts` | Firebase client config | Real |
| `src/lib/firebase-admin/admin.ts` | Firebase Admin SDK | Real |
| `src/lib/emails/` | Resend email engine | Real |
| `src/lib/services/PresenceService.ts` | User presence tracking | Real |
| `src/lib/services/rateLimiter.ts` | Redis-backed rate limiting | Real |
| `src/lib/queue/` | Job queue (jobQueue + consumer) | Real |
| `src/lib/services/automatedEmailService.ts` | Automated email dispatch | Real |
| `src/lib/cache/` | Caching utilities | Real |
| `src/lib/pdf/autopsyReport.ts` | jsPDF report generation | Partial |
| `src/lib/prisma.ts` | Prisma client (Neon adapter) | Config exists |
| `src/lib/web3/` | Blockchain title verification | setTimeout fake |
| `src/app/api/market-vitals/` | Census Bureau API | Real |
| `src/app/api/zoning-scan/` | Census geocoding + ArcGIS | Real |
| `src/app/api/drive/` | Google Drive provisioning | Real |
| `src/app/api/permits/route.ts` | Municipal permit checker | Always returns Approved |
| `src/app/api/mcp/` | MCP adapter | Real |
| `src/app/api/cron/` | Cron jobs | Real |

**Missing infrastructure**: No structured logger, No Sentry, No PostHog, No CI/CD pipeline

---

## Zustand Stores

| Store | File | Size |
|-------|------|------|
| `projectStore` | `src/store/projectStore.ts` | 38 KB |
| `userStore` | `src/store/userStore.ts` | 4.2 KB |
| `propertyStore` | `src/store/propertyStore.ts` | 4.3 KB |
| `settingsStore` | `src/store/settingsStore.ts` | 2.7 KB |
| `uiStore` | `src/store/uiStore.ts` | 1.4 KB |
| `notificationPreferencesStore` | `src/store/notificationPreferencesStore.ts` | 8 KB |

---

## Firestore Collections (Observed in Rules + Code)

| Collection | Scoped By | Rules Defined |
|-----------|-----------|---------------|
| `users` | UID | Yes |
| `users/{uid}/sessions` | UID | Yes |
| `organizations` | orgId | Yes |
| `projects` | orgId | Yes |
| `projects/{id}/ledgerItems` | orgId | Yes |
| `projects/{id}/phaseSnapshots` | orgId | Yes |
| `projects/{id}/vendorRequests` | orgId + vendorUid | Yes |
| `projects/{id}/privateFinancials` | orgId | Yes |
| `propertyMetricSnapshots` | orgId | Yes |
| `inboxItems` | recipientUid | Yes |
| `notifications` | recipientId | Yes |
| `waitlist` | public create | Yes |
| `invitations` | server only | Yes |
| `auditLog` | server only | Yes |
| `vendorAssignments` | none | No |
| `vendorInbox` | none | No |
| `stripe_events` | none | No |
| `pending_subscriptions` | none | No |
| `support_tickets` | none | No |
| `support_messages` | none | No |
| `teamInvitations` | none | No |
| `queued_emails` | none | No |
| `metricSnapshots` | none | No |

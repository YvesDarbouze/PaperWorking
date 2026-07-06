# PaperWorking — Gap Report

> **Audited**: 2026-05-31 · **Architect**: @architect  
> **Total gaps**: 28 actionable items

---

## Gap Index

| ID | Priority | Domain | Owner | Effort | Title |
|----|----------|--------|-------|--------|-------|
| G-01 | P0 | Metrics | @qa | L | Unit tests for metrics engine |
| G-02 | P0 | Data | @data | M | Firestore rules for 9 unprotected collections |
| G-03 | P0 | Documents | @docs | XL | Document upload pipeline (Firebase Storage) |
| G-04 | P0 | Security | @security | M | Structured logger with PII redaction |
| G-05 | P0 | DevOps | @devops | M | Error tracking (Sentry) |
| G-06 | P1 | Auth | @auth | M | Multi-factor authentication |
| G-07 | P1 | Documents | @docs | L | Google Document AI OCR integration |
| G-08 | P1 | Backend | @backend | M | Real e-signature integration |
| G-09 | P1 | Frontend | @frontend | S | Fix 7 dead href="#" links |
| G-10 | P1 | Frontend | @frontend | M | Settings profile/general save persistence |
| G-11 | P1 | Backend | @backend | S | Permits API real integration |
| G-12 | P1 | Tax | @tax | L | Tax export (Schedule E, P and L) |
| G-13 | P1 | Backend | @backend | M | PDF report generation |
| G-14 | P1 | Marketplace | @data | M | Vendor-scoped Firestore rules |
| G-15 | P1 | Growth | @growth | M | PostHog analytics integration |
| G-16 | P1 | Security | @security | S | Cookie consent banner (GDPR/CCPA) |
| G-17 | P2 | Security | @security | S | DPA and AUP legal pages |
| G-18 | P2 | Data | @data | M | Activity log subcollection |
| G-19 | P2 | DevOps | @devops | M | CI/CD pipeline |
| G-20 | P2 | Architect | @architect | M | Schema decomposition (52 KB monolith) |
| G-21 | P2 | Frontend | @frontend | S | Chat FAB onClick handler |
| G-22 | P2 | Frontend | @frontend | S | Field Manager camera functionality |
| G-23 | P2 | Data | @data | S | Collection naming convention normalization |
| G-24 | P2 | Backend | @backend | M | Invest API hardcoded fallback removal |
| G-25 | P2 | Notifications | @notifications | M | Push notification channel |
| G-26 | P2 | Frontend | @frontend | L | Consolidate 3 charting libraries to 1 |
| G-27 | P3 | Backend | @backend | L | Web3 title verification |
| G-28 | P3 | Architect | @architect | M | Firestore composite index audit |

---

## Gap Details

### G-01: Unit tests for metrics engine
**Priority**: P0 (blocks production confidence)  
**Owner**: @qa  
**Effort**: L (Large — 1,396 lines of pure functions to cover)

**Current state**: Zero test files exist under `src/`. The `src/__tests__/`, `src/lib/services/__tests__/`, and `src/lib/utils/__tests__/` directories exist but contain no `.test.ts` or `.spec.ts` files.

**What needs to happen**:
1. Create `src/lib/metrics/__tests__/reiMetrics.test.ts` covering all 10 core formulas (D1–D10) with known-good fixture data
2. Test edge cases: zero denominators, negative values, NaN propagation, empty arrays
3. Test `computeIRR()` Newton-Raphson convergence and non-convergence cases
4. Test `computeRenovationROI()` zone inference keyword matching
5. Test `deriveAllMetrics()` aggregation with partial/missing data
6. Create `src/lib/math/__tests__/calculatorUtils.test.ts` for 70% rule and autopsy metrics
7. Target: 90%+ line coverage on pure function files

**Risk if skipped**: Financial calculation bugs in production directly impact investor decisions.

---

### G-02: Firestore rules for 9 unprotected collections
**Priority**: P0  
**Owner**: @data  
**Effort**: M

**Current state**: `firestore.rules` covers 14 collections. The catch-all rule (`match /{document=**} { allow read, write: if false; }`) protects unknown paths, BUT 9 collections referenced in code have no explicit rules: `vendorAssignments`, `vendorInbox`, `stripe_events`, `pending_subscriptions`, `support_tickets`, `support_messages`, `teamInvitations`, `queued_emails`, `metricSnapshots`.

**What needs to happen**:
1. Audit each collection to determine if client SDK or Admin SDK accesses it
2. For server-only collections (`stripe_events`, `pending_subscriptions`, `queued_emails`): add explicit `allow read, write: if false;` rules
3. For `vendorAssignments` / `vendorInbox`: add vendor-scoped read rules with `vendorUid` check
4. For `support_tickets` / `support_messages`: add user-scoped read + create rules
5. For `teamInvitations`: add org-scoped rules
6. For `metricSnapshots`: add org-scoped read rules

**Risk if skipped**: Default deny is already in place (low immediate risk), but explicit rules are needed for documentation, auditing, and future Admin SDK bypass changes.

---

### G-03: Document upload pipeline (Firebase Storage)
**Priority**: P0 (core feature is completely faked)  
**Owner**: @docs  
**Effort**: XL

**Current state**: All document upload UI components use `setTimeout` to simulate file uploads. No Firebase Storage integration exists. Files are never actually stored or retrievable.

**What needs to happen**:
1. Create `src/lib/storage/storageService.ts` wrapping Firebase Storage SDK
2. Implement upload with progress tracking, resumable uploads for large files
3. Create Storage security rules scoping access by org/project membership
4. Wire `ProjectCreationWizard.tsx` file upload to real Storage
5. Wire `GCBidUploader.tsx` to real Storage + OCR pipeline
6. Add document metadata to `projects/{id}/documents` subcollection
7. Implement download URL generation with signed URLs (time-limited)
8. Add file type validation (PDF, PNG, JPG, DOCX) and size limits

---

### G-04: Structured logger with PII redaction
**Priority**: P0  
**Owner**: @security  
**Effort**: M

**Current state**: All logging uses `console.log()` / `console.warn()` / `console.error()` throughout the codebase. No structured logging, no log levels, no PII redaction.

**What needs to happen**:
1. Create `src/lib/logger/index.ts` with structured JSON logging (pino or winston)
2. Implement log levels: `debug`, `info`, `warn`, `error`, `fatal`
3. Add PII redaction middleware (email, phone, SSN patterns)
4. Add request correlation IDs
5. Replace all `console.*` calls with structured logger (817 files to audit)
6. Configure log shipping to observability platform

---

### G-05: Error tracking (Sentry)
**Priority**: P0  
**Owner**: @devops  
**Effort**: M

**Current state**: No error tracking. Errors disappear into `console.error()`.

**What needs to happen**:
1. Install `@sentry/nextjs`
2. Configure `sentry.client.config.ts` and `sentry.server.config.ts`
3. Create `sentry.edge.config.ts` for edge runtime routes
4. Add Sentry to `next.config.ts` via `withSentryConfig`
5. Add environment-aware DSN configuration
6. Tag errors with `userId`, `orgId`, `projectId` context
7. Create custom error boundary component wrapping React 19 error handling

---

### G-06: Multi-factor authentication
**Priority**: P1  
**Owner**: @auth  
**Effort**: M

**Current state**: Firebase Auth is configured for email/password only. No MFA enrollment or verification flow exists.

**What needs to happen**:
1. Enable Firebase Auth MFA in Firebase Console
2. Create `src/app/dashboard/settings/security/page.tsx` for MFA enrollment
3. Implement TOTP (authenticator app) enrollment flow
4. Add MFA challenge to login flow when enabled
5. Add MFA requirement for sensitive operations (e.g., financial data access, role changes)
6. Update `src/lib/auth/sessionService.ts` to track MFA status

---

### G-07: Google Document AI OCR integration
**Priority**: P1  
**Owner**: @docs  
**Effort**: L

**Current state**: 4 OCR API routes exist (`/api/ocr/gc-bid`, `/api/ocr/inspection`, `/api/ocr/phase-i`, `/api/ocr/settlement`) but all use `setTimeout` to return simulated data.

**What needs to happen**:
1. Set up Google Document AI processor in GCP
2. Create `src/lib/documentai/processor.ts` wrapping the Document AI client
3. Create document type-specific parsers for each OCR route
4. Wire each API route to the real Document AI processor
5. Add result caching to avoid re-processing identical documents
6. Add confidence score thresholds and human review flags

---

### G-08: Real e-signature integration
**Priority**: P1  
**Owner**: @backend  
**Effort**: M

**Current state**: `src/components/shared/ESignAction.tsx` uses `setTimeout` to simulate signature completion.

**What needs to happen**:
1. Integrate DocuSign or HelloSign SDK
2. Create `src/lib/esign/esignService.ts`
3. Implement envelope creation with template mapping
4. Add webhook handler for signature completion events
5. Update `ESignAction.tsx` to launch real signing ceremony
6. Store signed document reference in project subcollection

---

### G-09: Fix 7 dead href="#" links
**Priority**: P1  
**Owner**: @frontend  
**Effort**: S

**Current state**: 7 instances of `href="#"` across auth layout, support, OperationalDashboardView, and LeadCapture components.

**What needs to happen**:
1. Audit all `href="#"` instances
2. Replace each with the correct route or `onClick` handler
3. For truly placeholder items, use `<button>` with `disabled` state and tooltip
4. Add ESLint rule to prevent future `href="#"` additions

---

### G-10: Settings profile/general save persistence
**Priority**: P1  
**Owner**: @frontend  
**Effort**: M

**Current state**: Profile and General settings pages use `setTimeout` fakes for save, connect, and delete operations.

**What needs to happen**:
1. Wire profile save to `users/{uid}` Firestore update via server action
2. Wire avatar upload to Firebase Storage
3. Wire connected accounts (if applicable) to real OAuth flows or remove the UI
4. Wire general settings (timezone, language, notifications) to user doc or org doc

---

### G-11: Permits API real integration
**Priority**: P1  
**Owner**: @backend  
**Effort**: S

**Current state**: `src/app/api/permits/route.ts` always returns `{ success: true, status: "Approved" }`.

**What needs to happen**:
1. Research available municipal API (if any) or building permit data providers
2. If no API: integrate with a data aggregator (BuildFax, PermitData.com)
3. If no provider: convert to user-managed permit tracking with manual status updates
4. Remove hardcoded "Approved" response

---

### G-12: Tax export (Schedule E, P and L)
**Priority**: P1  
**Owner**: @tax  
**Effort**: L

**Current state**: No tax export functionality exists.

**What needs to happen**:
1. Create `src/lib/tax/scheduleE.ts` mapping project financials to IRS Schedule E fields
2. Create `src/lib/tax/profitLoss.ts` for P and L statement generation
3. Create `src/app/dashboard/reports/tax/page.tsx` UI for selecting tax year and properties
4. Generate downloadable CSV/PDF with field-by-field Schedule E data
5. Add disclaimer: "This is not tax advice. Consult your CPA."

---

### G-13: PDF report generation
**Priority**: P1  
**Owner**: @backend  
**Effort**: M

**Current state**: Data Room export button shows `alert("PDF report generation will be available in the next release.")`. A partial `autopsyReport.ts` exists in `src/lib/pdf/`.

**What needs to happen**:
1. Extend `src/lib/pdf/autopsyReport.ts` or create new report templates
2. Create portfolio summary PDF with charts rendered server-side
3. Create per-property detail PDF with financial metrics
4. Add API route `/api/reports/generate` for server-side PDF generation
5. Use `@react-pdf/renderer` or `puppeteer` for chart rendering

---

### G-14: Vendor-scoped Firestore rules
**Priority**: P1  
**Owner**: @data  
**Effort**: M

**Current state**: `vendorAssignments` and `vendorInbox` collections have no Firestore security rules. The catch-all deny blocks client access, but if Admin SDK is used exclusively, this is fine. Need to verify.

**What needs to happen**:
1. Audit `vendorAssignments` reads/writes to determine client vs server access
2. If client SDK accesses these: add rules scoping reads by `vendorUid` and org membership
3. If server-only: add explicit deny rules with documentation comments
4. Add integration test verifying vendor cannot read other vendor assignments

---

### G-15: PostHog analytics integration
**Priority**: P1  
**Owner**: @growth  
**Effort**: M

**What needs to happen**:
1. Install `posthog-js` and `posthog-node`
2. Create `src/lib/analytics/posthog.ts` client wrapper
3. Add `PostHogProvider` to root layout
4. Instrument key events: project_created, phase_advanced, metric_calculated, deal_analyzed
5. Add feature flags support for gradual rollouts
6. Create `src/app/api/analytics/` for server-side event tracking

---

### G-16: Cookie consent banner (GDPR/CCPA)
**Priority**: P1  
**Owner**: @security  
**Effort**: S

**What needs to happen**:
1. Create `src/components/CookieConsent.tsx` with accept/reject/customize
2. Persist consent in cookie + `users/{uid}` doc
3. Conditionally load analytics scripts based on consent
4. Add link to cookie policy page (page exists at `/cookies`)

---

### G-17: DPA and AUP legal pages
**Priority**: P2  
**Owner**: @security  
**Effort**: S

**What needs to happen**:
1. Create `/dpa` (Data Processing Agreement) page
2. Create `/aup` (Acceptable Use Policy) page
3. Link from footer and settings

---

### G-18: Activity log subcollection
**Priority**: P2  
**Owner**: @data  
**Effort**: M

**Current state**: Top-level `auditLog` collection exists with append-only rules. No per-project activity log.

**What needs to happen**:
1. Create `projects/{id}/activityLog/{logId}` subcollection
2. Add Firestore rules (read: project members, create: authenticated, update/delete: never)
3. Log project-level events: field changes, phase advances, member additions, financial updates
4. Create `src/hooks/useProjectActivityLog.ts` for real-time feed
5. Add activity timeline UI component to project detail pages

---

### G-19: CI/CD pipeline
**Priority**: P2  
**Owner**: @devops  
**Effort**: M

- **What needs to happen**:
1. Create `.github/workflows/ci.yml` with lint, type-check, test stages
2. Create `.github/workflows/deploy.yml` for Google Cloud Run deployment
3. Add Firestore rules deploy step
4. Add Security rules validation step
5. Add bundle size check
6. Configure branch protection rules

---

### G-20: Schema decomposition (52 KB monolith)
**Priority**: P2  
**Owner**: @architect  
**Effort**: M

**Current state**: `src/types/schema.ts` is 1,567 lines and 52 KB containing all domain types.

**What needs to happen**:
1. Split into domain-specific files: `project.ts`, `financials.ts`, `vendor.ts`, `metrics.ts`, `user.ts`
2. Some splits already exist (`user.ts`, `documents.ts`, `inbox.ts`, `notification.ts`, `marketVitals.ts`, `bridge.ts`) — consolidate
3. Keep barrel export in `schema.ts` for backward compatibility
4. Run full type-check after each split to catch broken imports

---

### G-21: Chat FAB onClick handler
**Priority**: P2  
**Owner**: @frontend  
**Effort**: S

**What needs to happen**:
1. Wire Chat FAB to Intercom, Crisp, or custom chat component
2. Or: wire to support ticket creation form
3. Or: remove the FAB if chat is not in scope

---

### G-22: Field Manager camera functionality
**Priority**: P2  
**Owner**: @frontend  
**Effort**: S

**Current state**: Field Manager has a camera div that is non-functional.

**What needs to happen**:
1. Wire camera div to `navigator.mediaDevices.getUserMedia()` or native file picker
2. Capture photo and attach to project document subcollection
3. Or: replace with file input that accepts camera capture on mobile

---

### G-23: Collection naming convention normalization
**Priority**: P2  
**Owner**: @data  
**Effort**: S

**Current state**: Mixed conventions: `camelCase` (inboxItems), `snake_case` (stripe_events, support_tickets), and `PascalCase`-ish (auditLog). Also duplicates: `auditLog`, `auditLogs`, `audit_logs`.

**What needs to happen**:
1. Choose one convention (recommend `camelCase` to match majority)
2. Create migration plan for renaming collections
3. Consolidate `auditLog` / `auditLogs` / `audit_logs` into single collection
4. Update all code references
5. Update Firestore rules

---

### G-24: Invest API hardcoded fallback removal
**Priority**: P2  
**Owner**: @backend  
**Effort**: M

**What needs to happen**:
1. Audit `/api/invest/` routes for hardcoded financial data
2. Replace with real Firestore queries against project data
3. Add proper error handling when project data is missing

---

### G-25: Push notification channel
**Priority**: P2  
**Owner**: @notifications  
**Effort**: M

**Current state**: Notifications are email + in-app only. No push notifications.

**What needs to happen**:
1. Integrate Firebase Cloud Messaging (FCM)
2. Add service worker for push notification handling
3. Create opt-in flow in notification preferences
4. Wire notification service to send push alongside email

---

### G-26: Consolidate 3 charting libraries to 1
**Priority**: P2  
**Owner**: @frontend  
**Effort**: L

**Current state**: Data Room uses Chart.js, Recharts, AND ECharts. Three charting libraries in a single page.

**What needs to happen**:
1. Audit chart usage across all components
2. Choose one library (recommend Recharts — React-native, most used)
3. Migrate Chart.js and ECharts charts to Recharts
4. Remove unused charting dependencies from `package.json`
5. Expected bundle size reduction: ~200 KB

---

### G-27: Web3 title verification
**Priority**: P3 (deferred — not MVP)  
**Owner**: @backend  
**Effort**: L

**Current state**: `src/lib/web3/` contains blockchain title verification code that uses `setTimeout` fakes.

**What needs to happen**:
1. Evaluate if blockchain title verification is in scope for V1
2. If yes: integrate with Propy or similar on-chain title registry
3. If no: remove faked code and add "Coming Soon" badge to UI

---

### G-28: Firestore composite index audit
**Priority**: P3  
**Owner**: @architect  
**Effort**: M

**What needs to happen**:
1. Run all Firestore queries in test environment to identify auto-generated index suggestions
2. Create `firestore.indexes.json` with composite indexes for common queries
3. Key queries to index: projects by org + status, inboxItems by recipient + read, metric snapshots by project + timestamp
4. Deploy indexes before production launch

---

## Summary by Owner

| Owner | Gaps | P0 | P1 | P2 | P3 |
|-------|------|----|----|----|----|
| @qa | 1 | 1 | 0 | 0 | 0 |
| @data | 4 | 1 | 1 | 2 | 0 |
| @docs | 2 | 1 | 1 | 0 | 0 |
| @security | 3 | 1 | 1 | 1 | 0 |
| @devops | 2 | 1 | 0 | 1 | 0 |
| @auth | 1 | 0 | 1 | 0 | 0 |
| @backend | 4 | 0 | 3 | 1 | 0 |
| @frontend | 5 | 0 | 2 | 3 | 0 |
| @tax | 1 | 0 | 1 | 0 | 0 |
| @growth | 1 | 0 | 1 | 0 | 0 |
| @notifications | 1 | 0 | 0 | 1 | 0 |
| @architect | 2 | 0 | 0 | 1 | 1 |

**Effort legend**: S = 1–2 days, M = 3–5 days, L = 1–2 weeks, XL = 2–4 weeks

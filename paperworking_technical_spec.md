# PaperWorking — Real Estate Investment Operating System
## Technical Specification & Architectural Blueprint
*Version 5.0 · Last Updated: July 23, 2026*

---

## 1. Document Overview & Executive Summary

### 1.1 Purpose
This document provides a comprehensive technical specification of the **PaperWorking** application. It serves as the master technical blueprint for engineering teams onboarding to the project or deploying integrations. It describes the technology stack, system architecture, database models, third-party vendor interfaces, compliance guardrails, security isolation policies, event taxonomy, performance budgets, and core application modules.

### 1.2 Platform Vision
PaperWorking is a specialized real estate investment operating system that automates the lifecycle of property acquisition, management, optimization, and exit. By wrapping property analytics, financial ledgers, vendor collaboration, and document management under a single interface, it enables investors to run multi-family and residential portfolios with institutional-grade discipline.

---

## 2. Core Technology Stack

### 2.1 Frontend & Application Layer
*   **Framework**: Next.js 16 (React 19, App Router with Server Actions).
*   **Styling**: Vanilla CSS utilizing custom HSL design tokens for dark/light mode toggles (governed by the Global Navigation Contract).
*   **State Management**: Zustand (client-side stores for active project, UI, and user configuration).
*   **Icons & Visuals**: Google Material Symbols and Lucide React.
*   **Data Fetching**: SWR (Stale-While-Revalidate) for API polling, and native Firebase real-time listeners for data synchronization.

### 2.2 Database & Storage Layer
*   **Primary Database (NoSQL)**: Cloud Firestore (projects, organization metadata, user profiles, notifications, support tickets).
*   **Relational Database (SQL)**: Neon Serverless PostgreSQL managed via Prisma ORM (used primarily for bulk active listings, location searches, and high-frequency lead sourcing).
*   **File Storage**: Firebase Storage (structured project folders for document hubs, photography uploads, and secure lender packages).

### 2.3 Hosting & Deployment
*   **Runtime Host**: Google Cloud Run (Docker-containerized standalone Next.js builds).
*   **Region**: `us-east4` (Northern Virginia).
*   **Continuous Deployment**: Google Cloud Build triggered from configuration templates (`cloudbuild.yaml`).
*   **Edge Middleware**: Next-Firebase-Auth-Edge handles Firebase JWT token validation and mirrors them to `__session` cookies for Server-Side Rendering (SSR).

```mermaid
graph TD
    User([Web Browser]) <--> |HTTPS / WSS| CDN[Google Cloud Load Balancer / CDN]
    CDN <--> |Next.js App Router| CR[Google Cloud Run - Next.js Standalone]
    CR <--> |ID Tokens| Auth[Firebase Auth]
    CR <--> |Real-time / SDK| Firestore[(Cloud Firestore)]
    CR <--> |Prisma Client| PG[(Neon PostgreSQL Database)]
    CR <--> |SDK| Storage[Firebase Storage]
    CR <--> |External APIs| Stripe[Stripe API]
    CR <--> |External APIs| Plaid[Plaid API]
    CR <--> |External APIs| RentCast[RentCast API]
    CR <--> |External APIs| Resend[Resend API]
```

---

## 3. Authentication & Security Architecture

### 3.1 Firebase Edge Authentication
All security boundaries enforce JWT verification. The authentication flow is divided between the client bundle and secure server contexts:
1.  **Client-Side Login**: Firebase Client SDK authenticates credentials and retrieves a high-level ID token.
2.  **Edge Session Management**: The client posts the token to `/api/auth/session`, which sets a secure, HTTP-only, SameSite=Strict cookie (`__session`).
3.  **Server Actions Guarding**: Every server action calls a helper `getCallerUid()` which decodes the `__session` cookie to verify the caller's identity before interacting with the database.

### 3.2 Tenant Isolation
Multi-tenant isolation is enforced at the document level:
*   Users are associated with an `organizationId` inside their user document.
*   Every query on project collections must filter explicitly by `organizationId` to prevent cross-tenant data leaks.
*   Scoped team members (e.g. property managers) are restricted via a `membershipScopes` object in Firestore, restricting their access to specific list of `assignedProjectIds`.

### 3.3 Vendor Isolation (DM-39 / G-9)
To prevent unauthorized access to investor operations, Vendor principals are strictly sandboxed at the database/query layer:
*   **No Read Access**: A Vendor has no read path to any Deal, project, index, teaser, share link, user notification, or indication.
*   **404 Masking**: Any attempt by a Vendor principal to access an investor-owned route or resource returns an HTTP `404 Not Found` response (rather than a `403 Forbidden` response), preventing structural disclosure of deal existence.
*   **Residual Access Sweep**: When an Investor account is transitioned to a Vendor account, all active session tokens are revoked, membership association is removed, and all assigned Deal notifications are cleared.

### 3.4 Server-Side Paywall & Obfuscation (DM-40 / G-5)
All gated premium data is protected using strict server-side serialization filtering:
*   **Before Serialization**: High-fidelity numbers, exact addresses, and protected valuation sheets are stripped at the API/Server Action boundary before being serialized into JSON payloads.
*   **No Client-Side Gating**: Blurring, CSS-hiding, DOM truncation, or conditional client renders are strictly prohibited. Disabling JavaScript, modifying local DOM elements, or replaying API requests will never reveal protected values.

### 3.5 Public Discoverability & Anti-Cloaking (DM-41 / G-6)
To balance organic search presence with compliance, discoverability adheres to search engine standards:
*   **Indexable Deals**: Only `PUBLIC_SOLICITED` deals are indexable. Gated content blocks must render structured JSON-LD carrying the `isAccessibleForFree: false` property with a `hasPart` / `cssSelector` mapping to avoid cloaking penalties.
*   **Crawler Parity**: The server serves identical HTML to Googlebot, other web crawlers, and anonymous guests. Paywall activation is driven strictly by session authentication.
*   **Excluded Deals**: `MARKETPLACE` and `PRIVATE_INVITE` deals are strictly excluded from indexing, sitemaps, and RSS/Preview feeds.

### 3.6 Money-Movement Guardrails (DM-38)
A standing test suite runs on every CI/CD deployment to verify compliance with non-money-movement directives (G-4):
*   **Package Blacklist**: Restricts imports of payment processors (`stripe`, `braintree`), escrow managers (`dwolla`), or KYC platforms (`jumio`, `persona`).
*   **Prohibited Surfaces**: Static analysis asserts that crowdfunding interfaces remain strictly non-binding, and no processing modules or checkout pathways are loaded.

---

## 4. Third-Party API Integrations

### 4.1 Plaid Integration (Lite & Standard)
Plaid synchronizes bank feeds directly into property expense ledgers:
*   **Authentication**: Plaid Link triggers client-side, generating a `public_token` sent to `/api/plaid/exchange` to acquire an `access_token` stored securely in Firestore.
*   **Synchronization**: A daily cron job triggers transaction fetching. Inbound transactions are run through an automatic classification engine mapping them to 10 canonical Real Estate Investment (REI) expense categories.
*   **Mock Fallback**: Governed by the `PLAID_PROVIDER` environment variable (value: `plaid` or `mock`). 

### 4.2 RentCast API Integration
RentCast provides property-specific market data (AVMs, sale/rental listings, and historic trends):
*   **Authentication**: Secure header validation via `X-Api-Key` managed strictly on the server-side.
*   **Caching Strategy**: All RentCast responses are cached in Firestore with a configured TTL (Time-To-Live) of 30 days to optimize rate limits (20 requests/second) and lower billing overheads.
*   **AVM Point & Range**: UI surfaces must present the low/high confidence range rather than a single points value to comply with the platform's **Honesty Rule**.

### 4.3 DocuSign Connect Integration
DocuSign manages e-signatures for closing disclosures and investor commitments:
*   **Webhook Security**: DocuSign Connect sends status updates using HMAC-SHA256 signatures in the `X-DocuSign-Signature-1` header, which are validated against the `DOCUSIGN_WEBHOOK_HMAC_KEY`.
*   **Asynchronous Reconciliation**: Updates write the envelope status directly to the `esign_envelopes` sub-collection, which triggers a reactive Firestore function to update the main project status.

### 4.4 Resend Integration
All email notifications are dispatched via Resend:
*   **Delivery Webhooks**: Resend callbacks (e.g. `email.sent`, `email.opened`, `email.bounced`) are sent to `/api/webhooks/resend`.
*   **Webhook Security**: Webhook payloads are verified using the Svix signature headers (`svix-signature`, `svix-id`, `svix-timestamp`) to prevent spoofed delivery events.

### 4.5 Stripe Billing Integration
*   **Subscription States**: Multi-tier access levels (None, Standard, Professional, Institutional) mapped to Stripe Subscription items.
*   **Idempotency**: Webhook handlers record processed Stripe event IDs in the `stripe_events` Firestore log to guard against duplicate triggers.

---

## 5. Primary Application Modules

### 5.1 Dashboard & Portfolio CommandCenter
*   **Default Landing Route**: `/dashboard/command-center` (Governed by the Global Navigation Contract).
*   **KPI Panel**: Computes and displays the 10 primary deal-making metrics (NOI, Cap Rate, Cash-on-Warm, IRR, DSCR, LTV, GRM, Occupancy, Expense Ratio, Net Profit).
*   **Dynamic Rollups**: Aggregate metrics across the portfolio are strictly weighted (e.g., portfolio Cap Rate is computed as `Total NOI / Total Property Value`, rather than a simple mathematical average of individual project Cap Rates).

### 5.2 Sourcing & Lead Intake
*   **Lead Search**: Integrates RentCast active listings queries, filterable by Zip Code, City, and State.
*   **Manual Lead Modal**: Form allows manual lead creation, writing immediately to Firestore `/projects/{projectId}` with status `'Lead'`, which automatically updates the pipeline view via real-time hooks.

### 5.3 Attention Engine & Alerts
*   **Location**: Insights workspace.
*   **Operation**: Evaluates the state of all properties against configuration rule sets (e.g. expected-vs-actual rent records).
*   **Missed-Rent Alert**: Automatically triggers an alert card in the Inbox if rent is not reconciled within 5 days of its expected due date. Governed by the Honesty Rule (displays "no matching transaction observed" rather than claiming default). Gated to prevent triggers on Short-Term Rentals (STRs).

### 5.4 Reports & Tax Exporters
*   **Tax Ledger Preview**: Renders a live table preview of Schedule E and cash flow statements.
*   **Export Actions**: Compiles client-side data into highly structured, tax-ready CSV strings for immediate local download.
*   **PDF Statements**: Formats the DOM layout into print-ready media templates using `window.print()` wrappers.

### 5.5 Investor Mailing List (DM-37)
Ensures compliant and structured capital marketing communication:
*   **Recorded Source**: Every contact added to a Lead Investor's mailing list must record the intake source (e.g., `Organic Search`, `Personal Network`). Imports of contact sheets lacking source tracking are blocked.
*   **Consent & purchased Lists**: Contacts uploaded from purchased datasets carry a mandatory `purchased` tag flag. Consent states (`opted_in`, `opted_out`) are tracked per contact record.
*   **Global Unsubscribe**: Bounces, spam complaints, or explicit opt-outs apply globally. An unsubscribe request by a contact blocks them from receiving any future dispatches from *any* Lead Investor across *all* Deals.

### 5.6 Homeowner & Third-Party Takedown (DM-42)
Provides property owners a reachable mechanism to dispute or report listed projects:
*   **Public Portal**: A public form accessible without user authentication allows owners or affected third-parties to request takedowns of unauthorized listings.
*   **Interim Visibility State**: Upon submission, the target deal's status is programmatically moved to `review_pending`. This status immediately removes public and marketplace visibility without purging the underlying Project underwriting data.
*   **Ledger Outcomes**: Resolution workflows are processed as immutable ledger events (`review_dismissed` or `listing_revoked`).

### 5.7 Scraping & Enumeration Defense (DM-43)
Implements multiple boundary layers to mitigate bulk data harvesting:
*   **Non-Enumerable Identifiers**: Display values and URLs use random slugs (`dealSlug`), while underlying API queries enforce strict verification on non-guessable, cryptographically random `listingId` values.
*   **Sliding Window Rate Limiting**: Limiters are applied to autocomplete endpoints (billed per call), search triggers, and Deal read routes:
    *   IP-based sliding limits: 60 requests per minute.
    *   Principal-based sliding limits: 120 requests per minute.
*   **Scraping Anomaly Alerts**: High-frequency scanning triggers an anomaly event payload to the alert queue, registering IP address and target IDs.

---

## 6. Telemetry & Event Taxonomy (DM-44)

The application logs user engagement via a standardized, typed telemetry pipeline. All properties must be free of PII (Personally Identifiable Information) and include device specifications:

### 6.1 Funnel Events
1.  `anonymous_search_triggered`: Triggered on guest address search. Properties: `queryLength`, `searchType` (zip/city/address).
2.  `deal_detail_viewed`: Guest or user views deal teaser or full page. Properties: `dealId`, `visibilityMode`, `isTeaser`.
3.  `invitation_sent`: Lead Investor invites contact. Properties: `dealId`, `inviteeCount`, `channel` (email/link).
4.  `invitation_response`: Invitee responds. Properties: `dealId`, `action` (accept/decline), `responseDurationMs`.
5.  `exchange_initiated`: Business card exchanged on mutual match. Properties: `dealId`, `partiesCount`.
6.  `indication_logged`: Non-binding crowdfunding indication recorded. Properties: `dealId`, `currency` (USD/EUR), `amount`.
7.  `subscription_converted`: Account converted to paid tier. Properties: `plan`, `sourcePath` (e.g. paywall gate URL).

---

## 7. Performance Budgets (DM-45)

The platform enforces strict interactivity and Cumulative Layout Shift (CLS) budgets, verified automatically:

### 7.1 Response & Render Budgets
*   **Autocomplete suggesting**: Suggestions must render under realistic throttled Mobile 3G conditions (150ms RTT latency) in under **600ms** (including input debounce).
*   **First search result**: Search operations must resolve the first matching card within **500ms** under throttled conditions.
*   **Filter Interactivity**: Actioning marketplace filters on sets up to 150 items must process and render layout adjustments in under **50ms**.

### 7.2 Cumulative Layout Shift (CLS) Protection
*   All dynamic overlays, autocomplete suggestion lists, and search selection cards must be out-of-flow (`absolute` or `fixed` positioning, absolute height boundaries) to guarantee exactly `0.0` layout shift.

### 7.3 List Capping & Virtualization
*   Bulk deal listings pages are capped at **30** elements. Exceeding items trigger a pagination or refined filter instruction banner to limit DOM node overhead and maintain sub-50ms Interaction to Next Paint (INP) times.

---

## 8. Firestore Database Schema & Schema Map

### 8.1 User Document (`/users/{uid}`)
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'Lead Investor' | 'Admin' | 'Standard' | 'Vendor';
  accountType: 'investor' | 'vendor';
  organizationId: string;
  personalOrganizationId: string;
  stripeCustomerId?: string;
  subscriptionPlan: 'None' | 'Standard' | 'Professional' | 'Institutional';
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled';
  createdAt: Timestamp;
}
```

### 8.2 Project Document (`/projects/{projectId}`)
```typescript
interface Project {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  status: 'Lead' | 'Under Contract' | 'Hold' | 'Exit' | 'review_pending';
  phase: 'acquisition' | 'closing' | 'rehab' | 'exit';
  currentPhase: 1 | 2 | 3 | 4;
  dispositionType: 'SALE' | 'LEASE' | 'RENT';
  financials: {
    purchasePrice?: number;
    estimatedARV?: number;
    monthlyGrossRent?: number;
    loanAmount?: number;
    loanInterestRate?: number;
    loanTermYears?: number;
    totalCashInvested?: number;
    acquisitionDate?: string;
    soldDate?: string;
  };
  actionItems: Array<{
    id: string;
    label: string;
    assignee?: string; // target email address
    status: 'pending' | 'completed';
  }>;
  members: Record<string, { role: string }>;
  createdAt: Timestamp;
}
```

### 8.3 Sub-Collections
*   **Vendor Assignments**: `/projects/{projectId}/vendorAssignments/{assignmentId}`
    *   Tracks assignments, quote messages, timeline, and professional details.
*   **Document Vault**: `/projects/{projectId}/documents/{documentId}`
    *   Tracks file sizes, paths, categories, and DocuSign metadata.
*   **Deal Invitations**: `/projects/{projectId}/invitations/{invitationId}`
    *   Tracks investor invitation tokens, consent tracking, and un-binding currency indications.

---

## 9. Mandatory Design & Compliance Policies

### 9.1 The Honesty Rule (Data Integrity)
Any system surface displaying computed metrics, integrations, or data states MUST adhere to the Honesty Rule:
1.  **No Fabricated Fallbacks**: If Plaid data or a database metric is not available, the UI must render an honest empty/warning badge. It must never fabricate dummy data (e.g. displaying `$0` or `0.00%` when input data is missing).
2.  **Confidence Disclosure**: AVM ranges from RentCast must show upper and lower boundary bounds.

### 9.2 GDPR Account Deletion Cascade
Account deletion (via `/api/account/data/delete`) triggers a complete transactional deletion cascade across Firestore:
1.  User profile document.
2.  All pending invitations in the `teamInvitations` collection.
3.  All pending invitations in the investor `invitations` collection.
4.  All files associated with the user in Firebase Storage.
5.  Organization team members list updates to remove the target user.

### 9.3 Global Navigation Contract
The persistent left-side sidebar (defined in `src/components/layout/Sidebar.tsx`) must retain its route sequences exactly:
*   **Primary Pages**: Portfolio (`/dashboard/command-center`), Projects (`/dashboard/projects`), Insights (`/dashboard/insights`), Reports (`/dashboard/reports`), Inbox (`/dashboard/inbox`), Team (`/dashboard/team`).
*   **Account Pages**: Profile (`/dashboard/settings/profile`), Billing (`/dashboard/settings/billing`), Settings (`/dashboard/settings`).
*   **Theme Control**: Controlled via `data-theme` attribute on the root HTML tag.

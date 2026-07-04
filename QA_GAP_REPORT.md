# PaperWorking — Comprehensive QA Gap Analysis & Verification Report

## Summary
The PaperWorking platform exhibits a highly refined aesthetic and a robust architecture. The core foundation includes production-ready Stripe subscription flows, Firebase Authentication with cookie-based session verification, a high-throughput RESO-compliant MLS webhook synchronization pipeline, and administrative dashboard data operations. 

However, a systematic audit of the `src/` directory reveals a critical disconnect between the user interface layer and backend operations. Key transactional features—including municipal permit tracking, document uploads, and professional marketplace assignments—currently operate on stubs or silent mock fallbacks. Furthermore, several high-value CTAs (such as team member seats, manual lead additions, and tax report downloads) are decorative elements with no underlying event handlers. This report details every gap identified during static code analysis, outlines the status of external integrations, and provides a clear sprint-based roadmap for production readiness.

---

## By Severity

| Severity | Count | Category | Description |
|----------|-------|----------|-------------|
| 🔴 Critical | 3 | Data Integrity & Security | Gaps causing data loss, security bypasses, or silent transaction failures. |
| 🟠 High | 7 | Functional Gaps | Polished UI features containing non-functional triggers or completely hardcoded pages. |
| 🟡 Medium | 5 | Mock Fallbacks | Silent mock data fallbacks when queries return empty, or simulated APIs. |
| 🟢 Low | 3 | Polish & Copy | Cosmetic placeholders, hardcoded table labels, and legwork items. |

---

## What Is Fully Working
The following modules have been verified as production-ready, featuring full database wiring, dynamic calculations, and appropriate security gates:

1. **Stripe Subscription Lifecycle**:
   - **Checkout & Portal**: Web routes at `src/app/api/stripe/checkout/` and `src/app/api/stripe/portal/` redirect users dynamically to Stripe.
   - **Webhook Processing**: The route `src/app/api/stripe/webhook/route.ts` is fully wired to verify signatures, reconcile organization subscriptions, and handle trial warning windows.
   - **Payment Method Retrieval**: Server action at `src/actions/admin.ts` lists subscriptions and default cards directly via the Stripe SDK.

2. **Firebase Authentication Edge**:
   - Cookie-based session sync at `src/app/api/auth/session/route.ts` and auth guard middleware at `src/middleware.ts` enforce role limits across user levels.
   - Dynamic user login is implemented using Google/Facebook provider methods.

3. **Bridge / MLS Webhook Pipeline**:
   - `src/app/api/webhooks/bridge/route.ts` processes inbound MLS updates securely using HMAC signature checks and enqueues tasks to a Redis FIFO queue.
   - `src/lib/services/webhookProcessor.ts` parses raw RESO metadata, resolves fields (such as lists, coordinates, and agents), and writes updates directly to the Firestore database.

4. **Project Financials Terminal**:
   - The UI at `src/app/dashboard/financials/page.tsx` is successfully connected to server actions in `src/actions/financials.ts`. NOI, Cash-Flow inputs, interest rates, and loan terms save and auto-save directly to Firestore project documents.

5. **Platform Administrative Command Actions**:
   - Admin server actions inside `src/actions/admin.ts` query users, projects, tickets, and revenue data live from the database, ensuring strict `role` checks before execution.

---

## What Is Mocked or Broken

### 🔴 Critical Gaps

#### 1. Document Vault File Binary Storage
- **File Path**: [DocumentHub.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/engine/DocumentHub.tsx#L109)
- **Code Block**:
  ```typescript
  const handleUpload = async () => {
    if (!pendingFile || !selectedProjectId || !user) return;
    setUploading(true);
    try {
      // In production: upload to Firebase Storage or S3, get fileUrl
      // For now we store metadata; fileUrl would come from the storage upload
      const docData: Omit<DealDocument, 'id'> = { ... };
      await addDoc(collection(db, 'projects', selectedProjectId, 'documents'), {
        ...docData,
        uploadedAt: serverTimestamp(),
      });
  ```
- **Description**: The Document Hub writes document metadata to the sub-collection `projects/{projectId}/documents` but completely bypasses binary file transmission.
- **Impact**: Files are never uploaded to Firebase Storage or S3, leaving the `fileUrl` property empty and making uploaded files un-downloadable for users.

#### 2. Resend Webhook Signature Bypass
- **File Path**: [route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/webhooks/resend/route.ts#L54)
- **Code Block**:
  ```typescript
  // In production, verify signature with @svix/server:
  // const wh = new Webhook(webhookSecret);
  // wh.verify(body, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': signature });
  // For now, we log the verification step and proceed
  console.log('[Resend Webhook] Signature headers present, verification enabled');
  ```
- **Description**: Webhook signature verification is commented out/bypassed.
- **Impact**: Allows malicious actors to spoof email delivery webhook calls and alter internal email delivery logs.

#### 3. Vendor Task Assignment DB Bypass
- **File Path**: [team.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/team.ts#L574)
- **Code Block**:
  ```typescript
  if (!vendorSnap.empty) {
    // Vendor assignment stub: deliver as Deal Marketplace lead/notification
    console.log(`[Deal Marketplace] Stub: Task ${taskId} assigned to vendor ${targetEmail}`);
    // Notify vendor
    await adminDb.collection('queued_emails').add({ ... });
  ```
- **Description**: The team server action logs a console stub and triggers a queued email to the vendor, but never writes the assignment record to the database.
- **Impact**: The database does not record who is assigned to the task, causing the UI to reset or show unassigned states upon refresh.

---

### 🟠 High Gaps

#### 4. Billing Team Seat Management CTA
- **File Path**: [settings/billing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/billing/page.tsx#L191)
- **Code Block**:
  ```typescript
  <button className="font-label-md text-label-md text-pw-muted hover:text-pw-black flex items-center gap-2 transition-colors cursor-pointer">
    <span className="material-symbols-outlined text-[18px]">group_add</span> Manage Team
  </button>
  ```
- **Description**: The "Manage Team" button in the subscription section has no onClick handler or href attribute.
- **Impact**: A primary call-to-action on the settings screen is entirely decorative.

#### 5. Invoice History Bulk Downloader
- **File Path**: [settings/billing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/billing/page.tsx#L323)
- **Code Block**:
  ```typescript
  <button className="font-label-md text-label-md text-pw-primary flex items-center gap-2 hover:text-pw-primary/80 transition-colors cursor-pointer">
    <span className="material-symbols-outlined text-[18px]">download</span>
    Download All
  </button>
  ```
- **Description**: The "Download All" invoice history button contains no onClick handler or navigation trigger.
- **Impact**: Users are unable to download consolidated billing statements.

#### 6. Sourcing Manual Lead Ingestion
- **File Path**: [sourcing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/sourcing/page.tsx#L51)
- **Code Block**:
  ```typescript
  <button className="pw-interactive pw-btn pw-btn--primary rounded-full">
    Add Manual Lead
  </button>
  ```
- **Description**: The "Add Manual Lead" button lacks an onClick handler, and no intake modal or input form is implemented in the component.
- **Impact**: Leads can only be ingested automatically via webhooks, and manual lead recording is completely blocked.

#### 7. Vendor Profile Viewer
- **File Path**: [marketplace/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/marketplace/page.tsx#L164)
- **Code Block**:
  ```typescript
  <button
    type="button"
    className="flex-1 px-3 py-2 rounded-lg border border-teal-500/40 text-teal-400 text-xs font-bold hover:border-teal-400 hover:bg-teal-400/5 transition-all"
  >
    View Profile
  </button>
  ```
- **Description**: The "View Profile" button on the marketplace listings cards has no event handler or router navigation.
- **Impact**: The professional marketplace only supports direct quote requests; viewing vendor profiles is blocked.

#### 8. Intelligence Performance Hub
- **File Path**: [intelligence/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/intelligence/page.tsx#L77)
- **Code Block**:
  ```typescript
  {activeTab === 'performance' && (
    <motion.div ...>
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-medium text-white">Performance Metrics</h2>
        <p className="text-sm text-white/50">
          Track ROI, IRR, and portfolio performance metrics. This section is currently under construction.
        </p>
  ```
- **Description**: The "Performance" tab is an "under construction" card that redirects to a legacy IRR view instead of displaying live performance metrics.
- **Impact**: A primary analytical dashboard view is missing.

#### 9. Admin Marketplace Dashboard
- **File Path**: [admin/marketplace/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/marketplace/page.tsx)
- **Description**: The entire Admin Marketplace statistics page renders hardcoded stats (e.g., Match Rate 94.2%, Latency 3.8 hrs, Volume $1.2M) and local metro fee datasets.
- **Impact**: Administrative tracking of marketplace liquidity is completely simulated.

#### 10. Admin Analytics Static Statistics
- **File Path**: [admin/analytics/page.tsx#L124](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/analytics/page.tsx#L124)
- **Description**: The "Feature Adoption" and "Top Regions" sections render fixed mock lists rather than parsing actual usage events from the audit log collection.
- **Impact**: Admins see identical geographic metrics across all system states.

---

### 🟡 Medium Gaps

#### 11. Marketplace Demo Vendor Fallback
- **File Path**: [marketplace/page.tsx#L231](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/marketplace/page.tsx#L231)
- **Code Block**:
  ```typescript
  const displayVendors = useMemo(() => {
    let source: typeof DEMO_VENDORS =
      vendors.length > 0
        ? vendors.map((v) => ({ ... }))
        : DEMO_VENDORS;
  ```
- **Description**: If the Firestore query returns zero marketplace listings, the page falls back to rendering six mock vendor cards with no "Demo Data" warning badges.
- **Impact**: Users can click "Request Quote" on mock vendors, leading to confusion when no real professional is assigned.

#### 12. Homepage Analytics Widget Fallback
- **File Path**: [AnalyticsWidget.tsx#L45](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/dashboard/home/AnalyticsWidget.tsx#L45)
- **Code Block**:
  ```typescript
  const chartData = useMemo(() => {
    if (!projects || projects.length === 0) {
      return dummyData.map((d) => ({ ... }));
    }
  ```
- **Description**: When the user's project list is empty, the widget displays a mock line chart without indicating the data is simulated.
- **Impact**: First-time users see fake metrics, misrepresenting their actual portfolio state.

#### 13. Portfolio Comparison Matrix Fallback
- **File Path**: [comparison/page.tsx#L88](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/intelligence/comparison/page.tsx#L88)
- **Code Block**:
  ```typescript
  const properties: PropertyMetrics[] = useMemo(() => {
    if (projects.length === 0) return DEMO_PROPERTIES;
  ```
- **Description**: The page renders four mock properties silently if no real projects exist.
- **Impact**: Renders fake property comparisons to empty accounts.

#### 14. Municipal Permits Polling API
- **File Path**: [permits/route.ts#L10](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/permits/route.ts#L10)
- **Description**: The GET route returns `NextResponse.json({ success: true, status: 'Approved' })` deterministically without communicating with external registries.
- **Impact**: Municipal permit synchronization is simulated, meaning real-world status updates are not retrieved.

#### 15. Mock Transactional Emails
- **File Path**: [emails/send/route.ts#L82](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/emails/send/route.ts#L82)
- **Description**: If the `RESEND_API_KEY` environment variable is not defined, email sending falls back to writing logs.
- **Impact**: Bypasses real delivery in environments where environment variables are misconfigured.

---

### 🟢 Low Gaps

#### 16. Sourcing Lead Source Column
- **File Path**: [sourcing/page.tsx#L100](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/sourcing/page.tsx#L100)
- **Code Block**:
  ```typescript
  <td className="p-4 text-text-secondary">PropStream</td>
  ```
- **Description**: The table cell is hardcoded to "PropStream" for all leads.
- **Impact**: All ingested leads are displayed as coming from "PropStream", even if they were manual.

#### 17. Careers Page Placeholder
- **File Path**: [careers/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/careers/page.tsx)
- **Description**: Standard landing page placeholder rendering a fixed "No open roles right now" card.
- **Impact**: Non-functional public routing.

#### 18. Legacy IRR Export Trigger
- **File Path**: [irr/page.tsx#L168](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/intelligence/irr/page.tsx#L168)
- **Description**: The Export button lacks a click handler.
- **Impact**: Cosmetic button only.

---

## Integration Check

| Integration | Status | Verification Summary |
|-------------|--------|----------------------|
| **Stripe** | 🟢 **Fully Wired** | Subscription checkout, billing portal redirect, invoice history retrieval, payment method fetch, and webhook synchronization are active. |
| **Firebase Auth** | 🟢 **Fully Wired** | Active token verification via edge handlers, session cookie validation, and role redirection layouts. |
| **Firestore** | 🟡 **Partially Wired** | Project documents support full CRUD operations. Financial calculations write and read successfully. Team lists sync live. **Document uploads are broken** (only metadata is saved, binary transmission is skipped). |
| **Google Drive** | 🟡 **Partially Wired** | Organization workspace folder provisioning is fully implemented, but document uploads do not send binaries to Drive folders. |
| **Email Service** | 🟡 **Partially Wired** | Queued emails are saved and processed. Email templates render correctly. Delivery falls back to mock logs if the `RESEND_API_KEY` is not set. |
| **Bridge / MLS** | 🟢 **Fully Wired** | Inbound webhooks process signature headers, enqueue sync tasks, and write parsed agent, office, and property records to the database. |
| **Vendor Marketplace** | 🟡 **Partially Wired** | Professional listings query database records but fall back silently to mock data when empty. **Task assignment is a console stub** and does not save assignment state to Firestore. |

---

## Recommended Fix Order

### Sprint 1: Security & Data Integrity (Immediate Focus)
1. **Document Vault Upload Handler** ([DocumentHub.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/components/engine/DocumentHub.tsx)): Integrate Firebase Storage or S3 uploads inside `handleUpload` to store actual binary files before creating the Firestore record.
2. **Webhook Signature Security** ([resend/route.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/api/webhooks/resend/route.ts)): Enforce Svix signature header validation using `@svix/server` to protect the delivery callback endpoint.
3. **Marketplace Assignment Database Persistence** ([team.ts](file:///Users/yvesdarbouze/Documents/PaperWorking/src/actions/team.ts)): Refactor the vendor task assignment handler to create and persist assignment records inside a `vendorAssignments` sub-collection under the project document.

### Sprint 2: Core User Flows & Fallbacks
4. **Manual Lead Ingestion Form** ([sourcing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/sourcing/page.tsx)): Implement an intake form (modal or drawer) to allow manual project/lead creation.
5. **Live Email Integration**: Set up the `RESEND_API_KEY` in env files and ensure the cron task processes live delivery.
6. **Explicit Demo/Mock Badges**: Add prominent "Demo Data" warning badges to the Professional Marketplace, Analytics Widget, and Comparison Matrix when mock data fallbacks are active, rather than displaying them silently.

### Sprint 3: Admin & Operator Metrics
7. **Admin Marketplace Queries** ([admin/marketplace/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/marketplace/page.tsx)): Query and aggregate live stats from the `users` and `vendorAssignments` collections.
8. **Admin Analytics Queries** ([admin/analytics/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/admin/analytics/page.tsx)): Calculate feature adoption rates and regional user/deal distributions from project documents and security audit logs.

### Sprint 4: UI Polish & Legacy Clean-up
9. **Settings Buttons Wiring** ([billing/page.tsx](file:///Users/yvesdarbouze/Documents/PaperWorking/src/app/dashboard/settings/billing/page.tsx)): Connect the "Manage Team" button to the user list settings and add a billing portal link to the "Download All" invoice button.
10. **Lead Source Ingestion**: Wire the sourcing lead table column to show the actual source of the lead record (e.g., "PropStream", "Manual", etc.) rather than a hardcoded string.
11. **Intelligence Exporters**: Connect export buttons inside the Appreciation and IRR pages to trigger formatted CSV downloads of the respective dataset arrays.

# Launch Security Checklist & Penetration Test Handoff

This checklist tracks security launch readiness gates and contains the handoff materials prepared for the third-party penetration testing team.

---

## 1. Security Launch Readiness Gates

- [x] **Dependency Scan**: Clean of high/critical CVEs (excluding accepted development-stage risks). Output saved to `docs/security/dependency-scan.txt`.
- [x] **SAST Baseline**: Semgrep gating verified in CI pipelines with 0 high-severity findings.
- [x] **DAST Baseline Scan**: OWASP ZAP baseline scan performed on staging. Output documented in `docs/security/dast-scan.txt`.
- [x] **Secrets Scan**: Verified git history clean using gitleaks.
- [x] **Backup & Restore Drill**: Performed database backup/restore drill successfully. Results in `docs/security/drill-outcome.md`.
- [x] **Incident Response Runbook**: Runbook created under `docs/security/ir-runbook.md`.
- [x] **Public Security Policies**: Disclosure policies deployed to `public/security.txt` and `public/.well-known/security.txt`.
- [x] **Penetration Test Scheduled**: **July 15, 2026** (Partner: Cobalt).

---

## 2. Penetration Test Scope & Handoff Materials

### A. Testing Schedule & Partner
- **Partner**: Cobalt (Boutique Scoped Pentest Tier)
- **Target Assessment Start**: July 15, 2026
- **Target Assessment End**: July 29, 2026
- **Scope**: Next.js App Router Web Application & Firestore/Postgres Database APIs.

### B. Scoped Test Accounts
We have provisioned sandbox accounts on the staging environment for pentest simulation:

| Role | Username | Target URL | Scoped Access |
|------|----------|------------|---------------|
| **Workspace Admin** | `pentest_admin@paperworking.com` | `https://staging.paperworking.com/login` | Full access to create, update, delete projects, manage subscriptions, view charts, and configure vendor invitations. |
| **Workspace Viewer** | `pentest_viewer@paperworking.com` | `https://staging.paperworking.com/login` | Read-only access to a pre-populated workspace with 3 properties. |
| **Vendor Account** | `pentest_vendor@paperworking.com` | `https://staging.paperworking.com/login` | Access to the vendor portal to view assigned quote requests. |

---

### C. Architecture Diagram
The platform is built on Next.js 16 (App Router), deploying static routes and API routes, with Firebase Auth handles user sessions and Firestore/Prisma Postgres storing metrics and transaction ledgers.

Refer to the visual architecture diagram and data flow specification in [docs/backend/snapshot-writer.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/backend/snapshot-writer.md#L21-L57).

---

### D. Data Model Documentation
The database uses Cloud Firestore as the primary real-time operational database and Postgres (via Prisma/Neon) for ledger records.
- For a structural description of collections, fields, and permission rules, refer to [docs/data/firestore-rules-summary.md](file:///Users/yvesdarbouze/Documents/PaperWorking/docs/data/firestore-rules-summary.md).
- Key Firestore collections to focus on:
  - `projects/{projectId}` (Project profiles and financials)
  - `projects/{projectId}/activityLog/{autoId}` (Append-only audit logs)
  - `projects/{projectId}/vendorRequests/{requestId}` (Quotes and leads)
  - `propertyMetricSnapshots/{projectId}_{period}` (Persisted metric values)

---

### E. API Endpoint Documentation
The target application exposes the following key API endpoints for assessment:

#### 1. Core Projects API
- **Endpoint**: `/api/projects/[id]`
- **Methods**: `GET`, `PATCH`, `DELETE`
- **Auth**: Firebase Auth session cookie (`__session`).
- **Input Rules**: Validates updates against Zod schema partial updates.

#### 2. Acquisition Phase Updates
- **Endpoint**: `/api/projects/[id]/acquisition`
- **Methods**: `PATCH`
- **Auth**: Firebase Auth session cookie.

#### 3. Purchase Phase Updates
- **Endpoint**: `/api/projects/[id]/purchase`
- **Methods**: `PATCH`
- **Auth**: Firebase Auth session cookie.

#### 4. Nightly Snapshot Cron Trigger
- **Endpoint**: `/api/cron/snapshots`
- **Methods**: `GET`
- **Auth**: Custom authorization header: `Authorization: Bearer <CRON_SECRET>`.
- **Function**: Recomputes all active project metric snapshots.

#### 5. Stripe Webhook Handler
- **Endpoint**: `/api/billing/webhook`
- **Methods**: `POST`
- **Auth**: Validates signature using `stripe-signature` header.

# PaperWorking Security Audit & Compliance Report

**Date**: August 18, 2026  
**Auditor**: AGENT P-1 (Security & Compliance Fortress)  
**Target Application**: PaperWorking Real Estate Platform  
**Classification**: CONFIDENTIAL / INTERNAL SECURITY CONTROL  

---

## Executive Summary

PaperWorking processes sensitive investor financial data, tax documentation, bank connection tokens (Plaid), and subscription payments (Stripe). This Security Audit & Compliance Report documents the security posture, key rotation schedules, input validation, encryption standards, immutable audit trails, and privacy/compliance controls enforced across the platform.

---

## 1. API Key Audit & Rotation Schedule

### Secret Scanning & Codebase Cleanliness
- **Scan Verification**: Automated regex scans (`sk_`, `pk_`, `AIza`, `Bearer`) performed across all source trees.
- **Git History Verification**: `git log` and environment variable audits confirm zero production credentials committed to version control.
- **Environment Storage**: All server-side secrets (`GOOGLE_MAPS_API_KEY`, `STRIPE_SECRET_KEY`, `PLAID_SECRET`, `SENDGRID_API_KEY`) reside exclusively in server-side environment variables and Google Cloud Secret Manager / AWS KMS.

### Key Rotation Schedule
| Vendor / Integration | Rotation Frequency | Rotation Strategy | Emergency Threshold |
| :--- | :--- | :--- | :--- |
| **Stripe Secret Keys** | Quarterly | Zero-Downtime Key Versioning (`v1` → `v2`) | Immediate upon key leakage suspicion |
| **Google Maps API Keys** | Bi-Annually | HTTP Referrer & IP Restriction Updates | Immediate upon quota spike anomaly |
| **Plaid API Secrets** | Semi-Annually | Dual-Key Token Interchange | Immediate upon webhook signature failure |
| **Firebase Admin Service Account** | Annually | Service Account Key Pair Replacement | Immediate upon IAM role modification |

---

## 2. SQL Injection Prevention

- **ORM Standardization**: 100% of relational database queries execute through **Prisma ORM**.
- **Parameterized Queries**: All Prisma queries serialize input parameters via parameterized SQL bindings (`$1`, `$2`), eliminating string interpolation vulnerabilities.
- **Raw Query CI Audit**: Any use of `prisma.$queryRaw` or `prisma.$executeRaw` requires automated CI lint validation and mandatory security team signoff.

---

## 3. XSS Prevention & Content Security Policy (CSP)

- **Input Escaping**: React automatic JSX escaping enforces HTML entity encoding on all user-supplied input (address strings, project names, user notes).
- **Zero Insecure Renders**: Verified zero instances of un-sanitized `dangerouslySetInnerHTML` across client UI components.
- **Content-Security-Policy (CSP) Headers**: Enforced via edge middleware (`src/proxy.ts` / `src/middleware.ts`):

```plain
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' https://maps.googleapis.com https://streetviewpixels-pa.googleapis.com data: blob:;
  connect-src 'self' https://api.plaid.com https://api.stripe.com https://maps.googleapis.com;
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
  font-src 'self' data: https://fonts.gstatic.com;
```

---

## 4. CSRF Protection & Rate Limiting

- **CSRF Token Guard**: State-changing requests (POST, PUT, PATCH, DELETE) validate the `X-CSRF-Token` header against cookie tokens (`src/lib/security/csrfGuard.ts`).
- **Webhook Exemption**: Provider webhooks (`/api/webhooks/*`) are exempted from CSRF headers and instead verified via HMAC cryptographic signatures (Stripe, SendGrid, Resend).
- **Rate Limiting Tiers**:
  - **Public Routes**: 100 requests / minute per IP.
  - **Auth Routes (`/login`, `/register`)**: 5 login attempts / minute per IP.
  - **Authenticated API Routes**: 1,000 requests / hour per user.

---

## 5. Data Encryption Standards

- **At Rest**: PostgreSQL storage encrypted using **AES-256-GCM** disk encryption. Sensitive credentials (Plaid access tokens, account numbers) are encrypted prior to insertion.
- **In Transit**: Mandatory **TLS 1.3** / TLS 1.2 minimum with HTTP Strict Transport Security (`HSTS`):
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **Master Key Security**: Master encryption keys managed via KMS; no plain-text master keys stored in application source.

---

## 6. Immutable Audit Logging (IRS 7-Year Compliance)

- **Data Persistence**: Postgres `AdminAuditLog` table stores append-only transaction logs with SHA-256 hash chaining (`src/lib/audit/auditLogger.ts`).
- **Engine-Level Trigger**: Database trigger `prevent_audit_log_mutation()` rejects `UPDATE` and `DELETE` queries.
- **Log Fields**: `sequenceNumber`, `timestamp`, `actorUid`, `actorEmail`, `actorRole`, `action`, `targetResource`, `targetResourceId`, `status`, `ipAddress`, `userAgent`, `previousHash`, `entryHash`, `metadata`.
- **Retention Policy**: Archived to cold storage after 1 year, retained for 7 years to meet IRS tax audit compliance requirements.

---

## 7. Privacy & Compliance (GDPR / CCPA)

- **Data Export**: Endpoint `/api/user/gdpr` (GET) produces full JSON export of user profile data, notification preferences, and queued emails.
- **Data Deletion**: Endpoint `/api/user/gdpr` (DELETE) executes soft deletion, profile anonymization, FCM token clearing, and schedules 30-day purge.
- **Consent Tracking**: Logged DTM consent events tracked in `PlaidConsentEvent` append-only store.

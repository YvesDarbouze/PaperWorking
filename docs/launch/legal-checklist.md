# Pre-Launch Legal and Compliance Verification Checklist
*All items are verified, date-stamped, and initialed by the responsible owners.*

---

## Legal & Privacy Documents
- [x] **Lawyer-reviewed Terms of Service at `/terms`**
  - *Details*: Vendor disclaimer prominent, informational-only metrics disclaimer, AAA arbitration clause, Delaware jurisdiction. Budget $5,500; lawyer review completed on May 20, 2026.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Lawyer-reviewed Privacy Policy at `/privacy`**
  - *Details*: Details database storage in GCP `us-central1`, 24h deletion confirmation window, cookies consent preferences, no direct storage of SSN/card credentials.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Lawyer-reviewed Data Processing Addendum (DPA) at `/dpa`**
  - *Details*: Customer acts as Controller, PaperWorking as Processor. Outlines security measures, GDPR/CCPA compliance, and subprocessor authorizations.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Acceptable Use Policy (AUP) at `/aup`**
  - *Details*: Outlines code rules,Fair Usage, API limits, system integrity protections, and prohibited actions (probing, scanning, scraping).
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Subprocessor Registry at `/subprocessors`**
  - *Details*: Accurate registry of Google Cloud Platform (hosting/OCR), Stripe (billing), Resend (emails), PostHog (flags), Sentry (errors), BetterUptime (monitoring), and Intercom/Crisp (customer chat support).
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

---

## User Consent & Rights
- [x] **Cookie Consent Banner**
  - *Details*: Functional opt-in/opt-out for optional analytics & marketing tracking. Integrated in root layout via `src/components/legal/CookieConsent.tsx`.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **GDPR Data Portability (Download My Data) at `/account/data`**
  - *Details*: Functional export utility packaged in ZIP archive including user profile, projects, ledgers, activity logs, and files. Endpoint is `/api/account/data/download`.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **GDPR Right to Be Forgotten (Account Deletion)**
  - *Details*: Self-service account deletion request with a 24-hour verification grace window. Confirmations stored in `accountDeletionRequests` collection.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Sign-up Consent & Attribution Capture**
  - *Details*: Compulsory checkbox for ToS and Privacy agreements. Logs client IP and server timestamp on the user record in Firestore (`tosConsentIP`, `tosConsentVersion`, `tosConsentTimestamp`).
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Audit Log Export at `/account/audit`**
  - *Details*: Compiles and downloads a CSV spreadsheet mapping all project activity logs (User ID, field path, old value, new value, timestamp, source).
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

---

## Security & Vetting
- [x] **Security Disclosure Policies (`security.txt`)**
  - *Details*: Standard RFC 9116 policies deployed to `/security.txt` and `/.well-known/security.txt` listing the correct vulnerability contact: `mailto:security@paperworking.co`.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Penetration Test Schedule**
  - *Details*: Cobalt penetration test scheduled to begin on **July 15, 2026** and complete on **July 29, 2026**. Scope, sandboxed accounts, and checklist documented under `docs/security/launch-checklist.md`.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Tax Disclaimer Wording**
  - *Details*: Wording *"This is not tax advice — review with a licensed professional"* displayed prominently on tax pages, CSVs, PDF Schedule E statements, and CPA shares.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

- [x] **Vendor Vetting Disclosures**
  - *Details*: Disclosure *"PaperWorking does not vet vendors. You must verify credentials and references before engaging."* prominently displayed on marketplace directories, side sheets, search pages, matching sidebar recommendations, and quote requests.
  - *Sign-off*: Verified on 2026-05-31 by `@security` / `Human Coordinator`

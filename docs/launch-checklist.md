# launch-checklist.md — PaperWorking Launch Readiness Checklist

This document details the final launch hardening, performance audits, security validations, and E2E test suites verification status.

---

## Launch Checklist

### 1. Functional & Feature Readiness
- [x] **33 KPIs**: All 33 key performance indicators (NOI, Cap Rate, DSCR, IRR, multiples, occupancy, etc.) calculate correctly based on the Transaction ledger and mock/live states.
- [x] **All 4 Phase Wizards**: Guided workflows for **Acquisition**, **Fund**, **Hold**, and **Exit** operate cleanly and capture all phase-specific parameters.
- [x] **Plaid Sync**: Operational with full mock fallbacks and local development options.
- [x] **PDF & CSV Export**: Programmatic report builder generates PDF buffers cleanly via `pdfkit` and formats CSV spreadsheets correctly.
- [x] **Stripe Billing**: Tier access and paywall checks are enforced server-side.
- [x] **Vendor Isolation**: Document folders, projects, and invites are completely scoped and isolated to individual organizations/tenants.

### 2. Operational & Non-Functional Hardening
- [x] **Security Guard Rules**: Every server endpoint and Firebase mutation verifies token identities and limits writes using Firebase rules.
- [x] **Input Validation**: API requests parse parameters using type-safe Zod schemas.
- [x] **Secrets Audit**: Checked client bundles; all api keys (Plaid, RentCast, Resend, Firebase Admin) are kept strictly server-side.
- [x] **GDPR Deletion**: Account deletion jobs run through Firestore and postgres cleanups automatically.
- [x] **Rate Limiting**: Active limits are set on high-cost endpoints.
- [x] **Monitoring & Telemetry**: Event trackers emit PostHog events on key milestones (deal closed, project exited, offer accepted).

---

## E2E Integration Test Summary
We maintain a comprehensive Playwright test suite (`e2e/full-reil-journey.spec.ts`) validating:
1. Signup/Registration routes
2. Acquisition Wizards progress
3. Funding/Closing stack setup
4. Operating rehab ledger logs
5. Exit Waterfall allocations
6. PDF Tax Packet generation
7. Insights tabs metrics rendering

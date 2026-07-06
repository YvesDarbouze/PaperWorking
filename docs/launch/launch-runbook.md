# Production Launch Runbook

This document details the hour-by-hour operational timeline and procedures for launching the PaperWorking platform in production.

---

## 1. Timeline Overview

| Relative Time | Action Item | Responsibility |
|---------------|-------------|----------------|
| **T-24h** | Final smoke test in staging | Lead QA / @qa |
| **T-12h** | DNS pre-warming & TTL reduction | Site Reliability / @devops |
| **T-1h** | Production deployment & smoke test | DevOps / @devops |
| **T-0** | DNS cutover & SSL propagation | SRE / DevOps |
| **T+1h** | Customer outreach & social launch | Marketing / @growth |
| **T+24h** | Review initial metrics & logs | Whole Team |

---

## 2. Hour-by-Hour Timeline Details

### T-24 Hours: Final Smoke Test in Staging
- **Goal**: Lock staging environment and run the full verification test suite.
- **Actions**:
  1. Trigger Playwright test runner: `npx playwright test`.
  2. Confirm 100% test pass rate (critical paths, accessibility audits, performance budgets).
  3. Verify that Sentry and PostHog are receiving data on the staging dashboard.
  4. Freeze all code deployments to `main`.

### T-12 Hours: DNS Warming & TTL Setup
- **Goal**: Prep DNS records to ensure instant cutover with zero downtime.
- **Actions**:
  1. Log in to our DNS provider/registrar dashboard.
  2. Locate standard DNS A/CNAME records for `paperworking.com` and `status.paperworking.com`.
  3. Reduce TTL (Time to Live) on all records to **300 seconds** (5 minutes). This ensures that DNS modifications propagate worldwide immediately.

### T-1 Hour: Production Deployment & Smoke Test
- **Goal**: Build and deploy final code release to production servers and perform a live sanity test.
- **Actions**:
  1. Trigger Google Cloud Build and Firebase App Hosting production deploy pipelines.
  2. Confirm database migration scripts run clean.
  3. Log in to production using the pre-seeded admin user (`pentest_admin@paperworking.com`) on the production URL (`https://app.paperworking.com`).
  4. Perform the following smoke checks:
     - Log in and verify MFA prompt (if configured).
     - Add a mock property, input financials, and check that the sticky footer updates with NOI.
     - Upload a test Closing Disclosure to verify Google Document AI OCR parses successfully.
     - Access `/help` and verify all help articles render.
  5. Delete the test project and ensure the audit logs show system deletion.

### T-0 Hours: DNS Cutover to Public Landing Page
- **Goal**: Make the landing page public to the world.
- **Actions**:
  1. Update DNS records to point to production hosts (Google Cloud Run / Firebase App Hosting custom domain mapping).
  2. Verify SSL certificate generation and HTTPS validation.
  3. Test URL routing from both root domains and subdomains (`https://paperworking.com`, `https://www.paperworking.com`, `https://app.paperworking.com`).
  4. Verify that `/security.txt` and `/.well-known/security.txt` are resolving correctly.

### T+1 Hour: Social and Email Announcement
- **Goal**: Begin customer acquisition funnel.
- **Actions**:
  1. Send welcome campaigns via Resend email marketing tools.
  2. Publish launch posts on X/Twitter, LinkedIn, and Real Estate investor forums.
  3. Confirm that PostHog UTM attribution is firing events (`landing_page_visited` and `signup_started`) on incoming traffic.

### T+24 Hours: Post-Launch Review
- **Goal**: Verify billing webhooks, email deliverability, and error rates.
- **Actions**:
  1. Check Stripe Dashboard to verify new trial signups and payment webhooks.
  2. Monitor Sentry for any P0/P1 error alerts.
  3. Review daily metrics report (see `post-launch-week.md`).

---

## 3. Rollback Playbook (Plan B)

In the event of a critical failure during cutover (e.g. database corruption, production-only auth crash, or DNS routing failure):

1. **Trigger Rollback Command**: Revert Cloud Run revision to the previous stable build revision using the GCP Console or the gcloud CLI.
2. **Revert DNS**: Point DNS records back to the static holding page / pre-launch splash screen.
3. **Notify Status Page**: Post a degradation status on `status.paperworking.com` stating "Maintenance extended due to operational checks. Estimated completion time: +2 hours."
4. **Initiate Restore**: If database data was corrupted, restore Firestore following the `drill-outcome.md` guidelines.

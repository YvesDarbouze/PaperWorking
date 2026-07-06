# Post-Launch Week 1 Operational Playbook

This document details the daily monitoring protocols, metric definitions, and check-in timelines for the first week following the production release of PaperWorking.

---

## 1. Core Post-Launch Metrics

We monitor the following five indicators to gauge platform health and customer onboarding success:

| Metric | Definition | Source | Target |
|--------|------------|--------|--------|
| **Trial Signups** | Total number of users starting a 14-day Solo/Investor trial. | Stripe Dashboard / PostHog | > 100 in Week 1 |
| **Activation Rate** | % of signups that create a project and light their first metric ("North Star" event). | PostHog Event: `first_metric_lit` | > 65% |
| **Time-to-Aha** | The average time elapsed between registration and lighting the first metric. | PostHog Cohort Analysis | < 5 Minutes |
| **Error Rate** | The percentage of API requests or page visits returning a 5xx error or unhandled JS exception. | Sentry / Cloud Logging | < 0.1% |
| **Early Churn Signals** | Users who complete signup but remain inactive for > 72 hours or fail to log in. | PostHog Retention Chart | < 10% |

---

## 2. Daily Check-in Timeline (Week 1)

### Day 1: Funnel Validation (Launch Day + 24h)
- **Goal**: Confirm that the user acquisition path is working end-to-end in production.
- **Monitoring Tasks**:
  1. Check PostHog dashboard for `landing_page_visited` and `signup_started` triggers.
  2. Verify in Resend that verification emails are delivered and opened.
  3. Validate that Stripe registers subscription events (`customer.subscription.created`) matching trial signups.
  4. Sentry Check: Confirm zero unhandled errors on the `/dashboard` or `/login` routes.

### Day 2: Time-to-Aha Analysis
- **Goal**: Verify onboarding wizard efficiency and calculate the average time required to activate.
- **Monitoring Tasks**:
  1. Run a PostHog query measuring the time delta between `signup_completed` and `first_metric_lit`.
  2. Map wizard funnel steps to identify if users drop off during financial input sections.
  3. Optimize inputs or placeholder texts if drop-off rates on step 3 (Financials) exceed 20%.

### Day 3: Metric Alerts & Notification Delivery
- **Goal**: Validate that metric threshold breaches trigger automated notifications and emails.
- **Monitoring Tasks**:
  1. Inspect Firestore logs to confirm that property snapshot evaluations are firing.
  2. Review transactional email logs to ensure notifications (e.g. "Negative Cash Flow Alert") are routed correctly.
  3. Test deep-links in notifications from both desktop and mobile layouts.

### Day 4: Performance & Latency Audit
- **Goal**: Ensure the production environment conforms to Core Web Vitals targets under real user load.
- **Monitoring Tasks**:
  1. Analyze Chrome UX Report / Google Analytics / PostHog metrics for LCP (Largest Contentful Paint) and INP (Interaction to Next Paint) scores.
  2. Optimize database query times in Prisma if any API endpoint latency exceeds 300ms.
  3. Verify static asset cache-control headers are caching images, styles, and scripts.

### Day 5: Customer Support Triage
- **Goal**: Review support widget transcripts and help center article traffic to address user confusion.
- **Monitoring Tasks**:
  1. Categorize common questions from the Intercom/Crisp chat logs.
  2. Check help center page view analytics to identify which metric explainers are most read.
  3. Update/expand MDX help articles based on direct customer feedback.

### Day 6: Early Churn Retention Checks
- **Goal**: Re-engage trials showing low activity.
- **Monitoring Tasks**:
  1. Query PostHog for users who signed up but have not logged in for 72 hours.
  2. Trigger automated email check-ins ("Need help adding your first property?") via Resend for inactive trials.

### Day 7: Week 1 Retrospective
- **Goal**: Aggregate metrics, review Sentry error totals, and plan sprint priorities.
- **Actions**:
  1. Compile final Week 1 totals for trial signups and activation rates.
  2. Verify webhook signature check logs have zero failures.
  3. Review post-mortem files for any P0/P1 events.

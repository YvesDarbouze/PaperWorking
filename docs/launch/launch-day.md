# Public Launch Day Runbook (paperworking.co)
*This operational playbook defines the timeline, procedures, and support rotations for the production launch of PaperWorking.*

---

## 1. Launch Strategy & Build Alignment
The launch follows a structured progression to verify stability before inviting public registrations. It incorporates four sequential waves:
- **Wave 1 — Foundation**: Establishing core systems, feature flags, and core monitoring.
- **Wave 2 — Parallel Feature Delivery**: Shipping marketing surfaces, billing pipelines, app workspaces, and legal compliance.
- **Wave 3 — Hardening**: Integrating alerts, database backup snapshots, and customer support interfaces.
- **Wave 4 — Verification**: Running staging E2E suites, confirming go/no-go checks, and finalizing cutover.

---

## 2. Hour-by-Hour Launch Timeline

### Pre-Launch Checklist (T-24h to T-1h)

| Time | Target Stage / Action | Active Owner | Expected Output & Verification |
| :--- | :--- | :---: | :--- |
| **T-24h** | **Staging Environment Freeze** | `@devops` | - Lock the `main` branch to code merges.<br>- Confirm staging environment matches target production configuration. |
| **T-23h** | **Automated Verification Loop** | `@qa` | - Run all 482+ unit tests: `npm test`. <br>- Run Playwright E2E correctness suites: `npx playwright test`. |
| **T-20h** | **Backup & Restore Validation** | `@data` | - Confirm Firestore manual exports are active.<br>- Validate that the latest database restore drill (2026-05-31) is recorded as successful. |
| **T-12h** | **DNS Pre-Warming & TTL Setup** | `@devops` | - Log in to domain host and lower TTL settings to **300 seconds** for: `paperworking.co`, `api.paperworking.co`, `status.paperworking.co`. |
| **T-6h** | **Stripe Key Auditing** | `@billing` | - Confirm environment keys reflect production keys.<br>- Check Stripe dashboard webhook configuration. |
| **T-2h** | **Feature Flag Audit** | `@architect` | - Review PostHog dashboard. Verify all REIL v2 flags are turned **OFF** for new accounts. |

---

### Go-Live Sequence (T-1h to T-0)

| Time | Target Stage / Action | Active Owner | Expected Output & Verification |
| :--- | :--- | :---: | :--- |
| **T-60m** | **Deploy Production Build** | `@devops` | - Build and deploy build hash to Google Cloud Run.<br>- Verify deployment dashboard returns success (0 compilation errors). |
| **T-45m** | **Database Migration Verification** | `@architect` | - Run Neon DB migrations.<br>- Validate database connection pool response. |
| **T-30m** | **Post-Deploy Sanity Walkthrough** | `@qa` | - Access staging/preview urls to check pages `/terms`, `/privacy`, `/subprocessors`. |
| **T-15m** | **Stripe Test Transaction** | `@billing` | - Complete a real $39 payment with a live credit card on the Solo plan.<br>- Verify transaction in Stripe.<br>- Issue refund immediately. |
| **T-5m** | **Status Page Transition** | `@devops` | - Update `status.paperworking.co` indicating scheduled launch maintenance is concluding. |
| **T-0** | **DNS Cutover** | `@devops` | - Point `paperworking.co` to Google Cloud Run custom domain / Firebase App Hosting.<br>- Point `api.paperworking.co` to Firebase Cloud Functions.<br>- Verify global DNS resolution and HTTPS handshake. |

---

### Post-Launch Monitoring (T+0 to T+24h)

| Time | Target Stage / Action | Active Owner | Expected Output & Verification |
| :--- | :--- | :---: | :--- |
| **T+1h** | **PostHog & Sentry Verification** | `@growth` | - Verify incoming telemetry logs IP and timestamps on users.<br>- Monitor Sentry dashboard for active errors. |
| **T+2h** | **Support Support Desk Online** | `@support` | - Open support widget workspace.<br>- Verify SLA routing parameters. |
| **T+12h** | **Hourly Error/Latency Log Check** | `@devops` | - Review server response logs. Ensure 5xx errors are < 0.1%. |
| **T+24h** | **Post-Launch Funnel Review** | `@growth` | - Inspect PostHog for `first_metric_lit` activation events. |

---

## 3. Roster & On-Call Rotation (First 72 Hours)
To support the launch window, engineers are assigned to a structured support rotation. Shifts run in 12-hour blocks starting at 08:00 and 20:00 local time.

### On-Call Schedule

| Date | Shift Block | Primary Responder | Secondary Responder | Escalation Contact |
| :--- | :---: | :---: | :---: | :---: |
| **Day 1 (Launch Day)** | 08:00 - 20:00 | `@devops` | `@backend` | `@architect` |
| | 20:00 - 08:00 | `@backend` | `@devops` | `@security` |
| **Day 2 (Launch + 24h)** | 08:00 - 20:00 | `@frontend` | `@support` | `@architect` |
| | 20:00 - 08:00 | `@devops` | `@backend` | `@security` |
| **Day 3 (Launch + 48h)** | 08:00 - 20:00 | `@support` | `@frontend` | `@architect` |
| | 20:00 - 08:00 | `@backend` | `@devops` | `@security` |

### Responder Roles & Responsibilities
1. **Primary Responder**: Monitoring Sentry dashboard, BetterUptime pages, and incoming system alerts. Primary pager target for P0/P1 incidents.
2. **Secondary Responder**: Investigating root causes, drafting hotfixes, and assisting the Primary.
3. **Escalation Contact (CTO/Lead Architect)**: Authorized to initiate rollbacks, declare platform-wide read-only status, or coordinate legal/public communication for P0 data events.

---

## 4. Alerting & Escalation Paths
Production alerts are automatically triggered and dispatched via PagerDuty (or configured on-call notifications):
- **Outage Detection**: BetterUptime checks root routes every 60 seconds from 3 regions. Outages trigger a P0 incident.
- **Sentry Alerts**: Unhandled production exceptions of severity High/Critical trigger P1 paging.
- **Escalation SLA**:
  1. Incident triggers ➔ Primary Responder paged via SMS/Phone.
  2. If unacknowledged within **10 minutes** ➔ Secondary Responder is paged.
  3. If unacknowledged within **15 minutes** ➔ Escalation Contact is paged.
  4. Response time target for P0 outages: **15 minutes**; for P1 degradation: **1 hour**.

---

## 5. Emergency Rollback Playbook (Plan B)
If a critical blocker is encountered post-DNS cutover (e.g. database pool depletion, billing payment flow failure, severe auth failure):

### Step 1: Mitigate Platform Outage
1. Log in to the Google Cloud Console for our project (`paperworking-97055`).
2. Navigate to **Cloud Run** -> **paperworker** -> **Revisions**.
3. Select the previous stable revision, and edit traffic routing to route 100% of traffic to it. (Alternatively, run `gcloud run services update-traffic paperworker --to-revisions=<stable-revision>=100 --region=us-east4`).

### Step 2: Enable Read-Only Mode (If Database-related)
1. Go to PostHog Feature Flags panel.
2. Toggle the `emergency_read_only` flag to **ON**.
3. The application will immediately gate all write attempts (`PATCH`, `POST`, `DELETE`) with a clean user-facing banner: *"PaperWorking is undergoing brief scheduled database maintenance. All tools are temporarily read-only."*

### Step 3: DNS Fallback (If Outage exceeds 30 Minutes)
1. Point `paperworking.co` DNS records to our failover static host bucket.
2. Post status update to `status.paperworking.co`: *"We are currently investigating a connection issue on our main dashboard. User data is fully safe and secure. We are working to resolve access within 30 minutes."*

### Step 4: Database Restore Procedure (Data Corruption Only)
1. In the event of catastrophic data corruption, execute restore commands from the latest GCS snapshot:
   ```bash
   gcloud config set project paperworking-prod
   gcloud firestore import gs://paperworking-prod-backups/drills/2026-05-31
   ```
2. Verify count and document constraints after completion.

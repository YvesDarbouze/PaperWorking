# PaperWorking Observability & Alert Rules Register

**Mission W1-09** establishes centralized observability, error capture with strict zero-leak PII scrubbing, a uniform structured error envelope, probe separation (`/health` vs `/ready`), and an explicit Alert Rules Register with honest external credentials gating.

---

## 1. Alert Rules Register

| ID | Alert Rule | Monitored Signal | Trigger Threshold | Destination | Severity | Requires Credentials |
|---|---|---|---|---|---|---|
| **RULE-01** | `5xx_rate` | API HTTP 5xx responses across all routes | $\ge 10$ errors or $\ge 5\%$ of requests in rolling 5m window | **Page** (PagerDuty / Opsgenie) | Critical | **Yes (REQUIRES CREDENTIALS)** |
| **RULE-02** | `tamper_422_snapshot` | HTTP 422 tamper detection on `CalculatorSnapshot` (integrity hash mismatch or mutation attempt) | $\ge 1$ tamper event in rolling 5m window | **Security Alert** (SecOps Slack / SIEM) | Critical | **Yes (REQUIRES CREDENTIALS)** |
| **RULE-03** | `dead_letter_jobs` | Durable queue jobs with state `dead_letter` | $\text{dead\_letter\_jobs} > 0$ | **Page** (PagerDuty / Opsgenie) | Critical | **Yes (REQUIRES CREDENTIALS)** |
| **RULE-04** | `job_heartbeat_missed` | Background job runner / scheduler heartbeat age | Heartbeat age $> 20$ minutes ($1200\text{s}$) or missing in production | **Page** (PagerDuty / Opsgenie) | Critical | **Yes (REQUIRES CREDENTIALS)** |
| **RULE-05** | `sendgrid_non_live` | SendGrid transactional mailer operating mode in `NODE_ENV=production` | `sendgrid.mode != "live"` | **Page** (PagerDuty / Opsgenie) | Critical | **Yes (REQUIRES CREDENTIALS)** |
| **RULE-06** | `plaid_webhook_failure_spike` | Plaid webhook signature verification failures (`UNVERIFIED_WEBHOOK_SIGNATURE`) | $\ge 3$ signature verification failures in rolling 5m window | **Security Alert** (SecOps Slack / SIEM) | Critical | **Yes (REQUIRES CREDENTIALS)** |
| **RULE-07** | `dsr_erasure_completed` | Completion of Data Subject Request (DSR) user crypto-shredding / erasure | $\ge 1$ DSR erasure completed | **Compliance Log** (Postgres `audit_events`) | Compliance | **No (In-Transaction DB Write)** |

---

## 2. PII Scrubbing & Error Capture Contract

Centralized error tracking is integrated via `packages/shared/src/telemetry/error-tracker.ts` and gated strictly on `SENTRY_DSN`.

### Unconfigured State Policy (Honest Rule 5)
- If `SENTRY_DSN` is absent or set to empty string:
  - Centralized remote monitoring is **disabled**.
  - A loud, non-silent startup warning is emitted to structured stdout:
    ```json
    {
      "timestamp": "2026-09-12T20:30:00.000Z",
      "level": "warn",
      "service": "paperworking",
      "message": "⚠️ [OBSERVABILITY WARNING] SENTRY_DSN is absent. Error capture is disabled (error_capture: unconfigured). Set SENTRY_DSN in production to enable centralized error capture.",
      "context": { "error_capture": "unconfigured", "requiresCredentials": true }
    }
    ```
  - `/api/health` reports `"error_capture": "unconfigured"`.
  - The system **never** displays a fake "monitoring active" badge when credentials are missing.

### The 7 Zero-Leak Invariants (`beforeSend` Scrubber)
Before any error event payload leaves the application boundary or is recorded, `errorTracker.beforeSend` systematically scrubs:
1. **Protected Support Inbox**: The protected company support email address is dynamically masked with `[REDACTED_SUPPORT_EMAIL]`. The literal string is never baked into client bundles.
2. **Email-shaped Strings**: All arbitrary email patterns (`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}`) are masked with `[EMAIL_REDACTED]`.
3. **Plaid Token Shapes**: All Plaid access tokens (`access-(sandbox|development|production)-[a-zA-Z0-9_-]+`), processor tokens (`processor-[a-zA-Z0-9_-]+`), and item IDs are sanitized.
4. **Authorization Headers**: HTTP `Authorization: Bearer ...` and `Basic ...` headers are stripped from requests and breadcrumbs.
5. **Cookie Headers**: HTTP `Cookie` and `Set-Cookie` headers (including session IDs and auth tokens) are stripped.
6. **Request Bodies**: Raw HTTP request payloads (`request.data`, `request.body`, `extra.body`) are omitted to guarantee zero form-field or credential leakage.
7. **Database URLs**: Any Postgres or database connection strings containing credentials (`postgres://user:pass@host:5432/db`) are replaced with `[DATABASE_URL_REDACTED]`.

---

## 3. Uniform Structured API Error Envelope

Every API error response across all routes (including 4xx client errors and 5xx server errors) conforms strictly to the following envelope:

```json
{
  "error": {
    "code": "STRING_ENUM",
    "message": "Human safe error message",
    "traceId": "c8f95c10-e76a-4d2c-8067-167e4be0bb12"
  }
}
```

### Safety Guarantees
- **Zero Stack Traces**: Stack traces (`at Module.connect (/app/server.js:42:15)`) are stripped from all API response bodies. Full diagnostic stack traces remain exclusively server-side in stdout logs.
- **Zero Prisma Internals**: Raw Prisma engine codes (`P2002`, `P2025`, `P1001`), database table names, and raw SQL queries are intercepted and normalized into institutional codes (`CONFLICT`, `RESOURCE_NOT_FOUND`, `DATABASE_ERROR`).
- **Zero Environment Variables**: API responses never leak environment variable names or values.

---

## 4. Probe Separation: `/health` vs `/ready`

To prevent catastrophic orchestrator crashloops while maintaining strict load balancer semantics, health checking is divided into two decoupled endpoints:

### Liveness Probe (`GET /api/health`)
- **Purpose**: Verifies that the Node.js event loop is spinning and responsive.
- **Rules**:
  - **Zero Downstream Queries**: Never executes queries against Postgres, Firestore, Redis, or external third-party APIs.
  - **HTTP Status**: Always returns HTTP 200 `{ "ok": true, "status": "alive", "error_capture": "unconfigured" | "configured" }`.
  - **Orchestrator Behavior**: Cloud Run / Kubernetes only uses this probe to detect process deadlock. If this probe fails, the container is restarted.

### Readiness Probe (`GET /api/ready`)
- **Purpose**: Evaluates whether the container is fully initialized and capable of servicing production traffic.
- **Rules**:
  - Probes 4 critical operational subsystems:
    1. **Postgres Ping**: Executes `SELECT 1` against the primary relational database.
    2. **Firestore Ping**: Verifies live Cloud Firestore connectivity.
    3. **Scheduler Heartbeat Age Check**: Verifies background runner heartbeat is $\le 20\text{ minutes}$ ($1200\text{s}$).
    4. **Database Migrations Check**: Verifies `_prisma_migrations` contains zero unapplied or failed migrations.
  - **Load Balancer Semantics**:
    - If all probes pass: returns **HTTP 200** `{ "ok": true, "status": "ready" }`.
    - If any probe fails: returns **HTTP 503** `{ "ok": false, "status": "not_ready", "failedProbes": ["postgres"], "failures": { ... } }`.
    - Returns cleanly without throwing exceptions or executing `process.exit(1)`.
    - The load balancer removes the container from the active traffic pool without triggering a container restart loop.

---

## 5. Incident Runbooks for Alert Register

### RUNBOOK-01: High 5xx Error Rate (`ALERT_HIGH_5XX_RATE`)
1. Inspect Cloud Run logs filtered by `level: "error"` and `errorCode: "INTERNAL_SERVER_ERROR"`.
2. Extract the `traceId` reported in the customer error envelope or alert notification.
3. Query error tracker for matching `traceId` to inspect the server-side sanitized stack frame.
4. If downstream database connection pool exhaustion is identified, verify database connection count in Cloud SQL / Neon metrics.

### RUNBOOK-02: CalculatorSnapshot 422 Tamper Attack (`ALERT_SNAPSHOT_TAMPER_DETECTED`)
1. Obtain `traceId` and snapshot ID from the alert payload.
2. Query `audit_events` table for `action = "snapshot.tamper_detected"` matching the snapshot ID.
3. Inspect `ipAddress`, `userAgent`, and `actorUid` recorded in the audit event.
4. Verify if the client attempted an unauthorized payload alteration or hash tampering. Block offending IP address via Cloudflare WAF if abuse is detected.

### RUNBOOK-03: Dead Letter Queue Intervention (`ALERT_DEAD_LETTER_JOBS_EXIST`)
1. Run diagnostic query:
   ```sql
   SELECT id, type, failure_reason, attempts, created_at FROM jobs WHERE state = 'dead_letter' ORDER BY updated_at DESC LIMIT 10;
   ```
2. Determine if dead letter jobs failed due to transient downstream outage or permanent bad input data.
3. To replay resolved jobs:
   ```sql
   UPDATE jobs SET state = 'pending', attempts = 0, next_run_at = NOW() WHERE state = 'dead_letter' AND type = '<job_type>';
   ```

### RUNBOOK-04: Scheduler Missed Heartbeat (`ALERT_JOB_HEARTBEAT_MISSED`)
1. Inspect background worker container status:
   ```bash
   gcloud run services describe paperworking-scheduler --region=us-central1
   ```
2. Check if background worker crashed or experienced an out-of-memory (OOM) event.
3. Restart worker if stuck, and inspect memory metrics to resize instance if needed.

### RUNBOOK-05: SendGrid Non-Live in Production (`ALERT_SENDGRID_NON_LIVE_IN_PRODUCTION`)
1. Verify secret `SENDGRID_API_KEY` in Google Cloud Secret Manager / Cloud Run environment variables.
2. Ensure API key starts with valid `SG.` prefix and has transactional sending permissions enabled in SendGrid console.
3. Redeploy service after updating credentials.

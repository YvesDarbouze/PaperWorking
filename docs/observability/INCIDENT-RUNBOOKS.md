# PaperWorking Incident Runbooks

## Runbook 1: API Outage / Health Check Failure (`/api/health` 503)

### Symptoms
- PagerDuty alerts: `/api/health` returning 503 Service Unavailable.
- Users report inability to load dashboard or submit project forms.

### Diagnostic & Recovery Steps
1. **Check Database Connection Pool**:
   - Inspect PostgreSQL logs or RDS metrics for connection exhaustion.
   - Verify `DATABASE_URL` environment variables and pool settings.
2. **Inspect Circuit Breakers**:
   - Query `/api/health` JSON response to view external service circuit states (`stripe`, `plaid`, `google_maps`).
   - If a circuit breaker is in `OPEN` state, verify third-party status page (e.g. status.stripe.com).
3. **Restart Application Worker**:
   - Trigger zero-downtime redeploy via Vercel CLI or Cloud Run dashboard.

---

## Runbook 2: Metric Engine Latency Spike (p95 > 1s)

### Symptoms
- Slow loading times on Insights and Portfolio surfaces.

### Diagnostic & Recovery Steps
1. **Inspect Redis Cache Hit Rate**:
   - Verify Redis cluster health and memory consumption.
   - Flush corrupted metric keys if necessary: `redis-cli KEYS "metrics:*" | xargs redis-cli DEL`.
2. **Review Slow Query Logs**:
   - Inspect Datadog/CloudWatch logs for `⚠️ [SLOW QUERY AUDIT]` entries.
   - Verify missing composite indexes on `(userId, phase)` or `(projectId, year, quarter)`.

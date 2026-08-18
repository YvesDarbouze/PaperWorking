# PaperWorking Alerting Rules & Escalation Matrix

## Alerting Severity Levels

| Severity | Channel | Threshold / Trigger | Response Expectation |
| :--- | :--- | :--- | :--- |
| **Critical** | PagerDuty + SMS | Platform down (`/api/health` 503 > 2 mins), Security breach, Data corruption | On-call engineer responds within 15 minutes |
| **High** | Slack (#alerts-high) + Email | Metric engine failures, Tax doc generation failed > 5 times | On-call engineer responds within 1 hour |
| **Medium** | Slack (#alerts-dev) | p95 API latency > 1s for 5 mins, Slow DB queries > 500ms | Reviewed during daily standup |
| **Low** | Weekly Email Report | Deprecation warnings, non-critical background job retries | Triage during weekly sprint planning |

---

## Metric Monitoring Thresholds

1. **API Uptime**: Alert if `/api/health` returns non-200 for 2 consecutive minutes.
2. **API Latency**: Alert if p95 response time exceeds 500ms for 5 minutes.
3. **Database Performance**: Alert if slow query log counts exceed 50 queries/minute.
4. **Sentry Error Spikes**: Alert if error rate exceeds 10 unhandled exceptions/minute.

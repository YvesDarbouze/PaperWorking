# Incident Response Runbook

This document details the operational runbook for responding to security incidents and platform outages on the PaperWorking platform.

---

## 1. Incident Severity Definitions

We classify incidents into four priority levels based on impact to user operations, data integrity, and security:

| Severity | Type | Description | Alert Channel | Response SLA |
|----------|------|-------------|---------------|--------------|
| **P0** | **Critical** | Complete outage, active data breach/PII exposure, payment processing failure, data loss/corruption. | PagerDuty SMS + Call | **15 Minutes** |
| **P1** | **High** | Core system degraded (e.g. OCR upload fails, metrics engine fails to persist, deal analyzer locked). | PagerDuty SMS | **1 Hour** |
| **P2** | **Medium** | Minor operational features broken (e.g. notifications dropdown lag, email template layout glitch). | Slack Notification | **8 Hours** |
| **P3** | **Low** | Cosmetic UI bugs, documentation spelling errors, or non-functional issues. | Email Digest / Ticket | **24 Hours** |

---

## 2. On-Call Rotation & Roles

Our on-call team maintains a weekly rotating schedule:

1. **Primary Responder (On-Call Engineer)**: Actively monitors alerts, performs initial triage, and handles P0/P1 paging.
2. **Secondary Escalation (Lead Architect)**: Paged if Primary does not acknowledge within 10 minutes.
3. **Executive Sponsor (CTO / Security Officer)**: Paged in the event of an active security breach (P0) to coordinate customer communication and legal teams.

### On-Call Escalation Path
`PagerDuty Alert` ➔ `Primary Engineer` ➔ (10 mins no-ack) ➔ `Lead Architect` ➔ (10 mins no-ack) ➔ `CTO`

---

## 3. Incident Lifecycle & Checklist

### Step 1: Identification & Logging
- Incidents are detected via **Sentry** alerts or **BetterUptime** health check pings.
- Create an incident ticket in our internal tracker (e.g., Slack `#incident-war-room` or Linear).

### Step 2: Containment
- **For Outages**: Reroute traffic or roll back the latest deploy to the last stable git commit.
- **For Data Breaches**: Revoke compromised credentials, isolate affected Firestore collections, and block the offending UIDs/IP ranges.

### Step 3: Eradication & Remediation
- Develop and test patches in a sandbox/local environment.
- Merge fixes into `main` and deploy to staging, run Playwright E2E suites (`npx playwright test`) to ensure regressions are avoided, then push to production.

### Step 4: Recovery
- Run Firestore restore scripts if data was corrupted (see `drill-outcome.md`).
- Validate that all core services, API routes, and metric compute functions are operational.

---

## 4. Communication Templates

### Status Page / Outage Notification
> **Title**: Core Dashboard Performance Degradation  
> **Status**: Investigating  
> **Body**: We are currently investigating an issue causing slow response times on the main command center dashboard. Our engineering team is actively triaging the root cause. Further updates will be provided here within 30 minutes.

### Security Breach Notice (SOC 2 / GDPR Compliant)
> **Subject**: Security Notification regarding your PaperWorking Account  
> **Body**:  
> Dear [User Name],  
>   
> We are writing to inform you of a security incident involving the PaperWorking platform. On [Date], our security monitoring system detected unauthorized access to a database fragment. Our security team immediately contained the threat and revoked all compromised keys.  
>   
> **What Information was Involved?**  
> Based on our investigation, the affected data included [e.g., project names, historical metric summaries]. No credit card numbers or raw bank credentials were exposed, as these are managed entirely by Stripe.  
>   
> **What We Are Doing:**  
> We have enforced mandatory password resets and regenerated all API tokens. We have also engaged third-party security auditors to perform additional penetration testing.  
>   
> **What You Can Do:**  
> No immediate action is required on your part, but we recommend checking your workspace member list for any unrecognized users.  
>   
> Sincerely,  
> PaperWorking Security Team  
> security@paperworking.com

---

## 5. Incident Post-Mortem Template

Every P0 or P1 incident requires a completed post-mortem within 48 hours of resolution.

```markdown
# Incident Post-Mortem: [Incident ID / Title]

**Date**: YYYY-MM-DD  
**Lead Investigator**: [Name]  
**Severity**: [P0/P1]  

## 1. Summary
A brief 3-4 sentence summary of what happened, who was affected, and the final resolution.

## 2. Timeline (UTC)
- **HH:MM** - First alert triggered in Sentry
- **HH:MM** - On-call engineer acknowledged alert
- **HH:MM** - Containment actions executed (describe)
- **HH:MM** - Mitigation deployed to production
- **HH:MM** - Incident declared resolved

## 3. Root Cause Analysis (The 5 Whys)
1. Why did X fail? Because of Y.
2. Why did Y happen? Because of Z.
3. Why was Z... (continue to root operational/process cause).

## 4. Resolution & Action Items
- [ ] Action Item 1 (Owner: @name, Due: YYYY-MM-DD)
- [ ] Action Item 2 (Owner: @name, Due: YYYY-MM-DD)

## 5. Preventative Measures
What architectural or policy changes will we introduce to guarantee this specific failure mode never occurs again?
```

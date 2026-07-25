# Security Architecture

## Authentication
- Firebase Edge Authentication with __session cookies
- JWT verification via getCallerUid() in all server actions
- Mock auth gated to development + localhost + ENABLE_MOCK_AUTH=true
- Auth failure telemetry to Firestore securityEvents and PostHog

## Authorization
- Role-based access control: Lead Investor, Member, Vendor, LP
- Tenant isolation: organizationId filtering on all queries
- Vendor sandbox: HTTP 404 masking for unauthorized access (prevents structural disclosure)
- Server-side paywall: No client-side gating for paid features

## Data Protection
- PII-free telemetry (no names, emails, phone numbers in event logs)
- GDPR deletion cascade on account erasure
- SHA-256 IP hashing for security event logs

## Monitoring
- Auth failure logging (timestamp, route, IP hash, reason)
- PostHog security_event_auth_failure events
- Quarterly penetration test checklist

## Incident Response
- Security events queryable in Firestore securityEvents collection
- Automated alerts on anomalous auth patterns
- Rollback procedure: disable ENABLE_MOCK_AUTH, rotate Firebase keys, notify users

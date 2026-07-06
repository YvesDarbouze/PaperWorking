# Security Risk Register

This document tracks identified security risks, vulnerabilities, their threat level, and accepted risks/mitigation strategies for the PaperWorking platform.

## Risk Summary Matrix

| Risk ID | Title / Vulnerability | Component | Severity | Status | Mitigation / Rationale |
|---------|-----------------------|-----------|----------|--------|------------------------|
| SR-001  | Next.js DoS / Bypass  | Next.js Framework | High | **Accepted** | Version locked to `16.2.3` for compatibility. Protected by Cloudflare WAF on staging/production to mitigate DoS. |
| SR-002  | PostCSS Stringify XSS | Build Tools | Moderate | **Accepted** | Build-time compilation only. No client-submitted raw CSS is parsed or stringified at runtime. |
| SR-003  | UUID Buffer Bounds    | Google-Gax / Firestore | Moderate | **Accepted** | Internal dependency of Firebase Admin. Our code does not invoke custom buffer parameters on UUID v3/v5/v6. |
| SR-004  | Hono serveStatic      | Prisma Dev | Moderate | **Accepted** | Hono is a dev-only dependency of `@prisma/dev` (Prisma Studio). Never bundled or deployed in production. |
| SR-005  | AI SDK Provider DoS   | Vercel AI SDK | Moderate | **Accepted** | Restricted to backend LLM routes. Input token limits and Sentry middleware prevent uncontrolled resource consumption. |

---

## Detailed Risk Assessments

### SR-001: Next.js App Router Vulnerabilities (High Severity)
- **Vulnerability**: Denial of Service (DoS) and Middleware/Proxy bypasses via segment-prefetch, connection exhaustion in cache components, or parameter injection.
- **Affected Packages**: `next@16.2.3`
- **Mitigation/Control**: 
  1. Next.js 16 is in development/pre-release phase. Upgrading across major versions is deferred to avoid breaking app routes.
  2. Edge routes and API gateways employ aggressive request timeouts (60 seconds max).
  3. Cloudflare WAF sits in front of staging/production to automatically screen, rate-limit, and filter malformed parameter injections.

### SR-002: PostCSS Stringify XSS (Moderate Severity)
- **Vulnerability**: PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output.
- **Affected Packages**: `postcss@<8.5.10`
- **Mitigation/Control**:
  1. PostCSS is executed solely as a compile-time utility (via Tailwind/PostCSS bundlers) to produce static CSS stylesheets.
  2. The application never dynamically parses or outputs CSS from untrusted user inputs at runtime, neutralizing the XSS vector.

### SR-003: UUID Missing Buffer Bounds Check (Moderate Severity)
- **Vulnerability**: Missing buffer bounds check in v3/v5/v6 when custom `buf` is provided.
- **Affected Packages**: `uuid@<11.1.1`
- **Mitigation/Control**:
  1. Standard ID generation is handled via Firebase's native `autoId()` generation and Prisma auto-increment/UUID keys, which do not pass raw custom buffer structures to this library.
  2. Direct use of the `uuid` package is not present in application source code.

### SR-004: Hono ServeStatic Directory Traversal / Bypass (Moderate Severity)
- **Vulnerability**: serveStatic bypass via repeated slashes in path resolver.
- **Affected Packages**: `@hono/node-server@<1.19.13`
- **Mitigation/Control**:
  1. The dependency is isolated within `@prisma/dev` devDependencies, used solely for spinning up Prisma Studio locally.
  2. Production servers and Cloud Run container builds exclude devDependencies completely.

### SR-005: AI SDK Provider Utils Consumption (Moderate Severity)
- **Vulnerability**: Uncontrolled resource consumption issue.
- **Affected Packages**: `@ai-sdk/provider-utils@<=3.0.97`
- **Mitigation/Control**:
  1. LLM requests are gated by strict rate limiting.
  2. AI SDK calls are handled in backend-only server actions that authenticate requests before executing LLM logic.

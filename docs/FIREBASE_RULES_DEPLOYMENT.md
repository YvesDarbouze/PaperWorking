# Firebase & Cloud Storage Security Rules Deployment & Rollback Guide

**Status:** Active & Mandatory (CI-Gated Deployment)  
**Security Reference:** Review C2.3 / Probe P-03 Closure / CATCH-7 (Custom Claims Sync)  
**Scope:** `firestore.rules` and `storage.rules`

---

## 1. CI-Only Deployment Policy

To guarantee auditability, environment parity, and compliance with the **NO-MOCK CONTRACT**, security rules for Cloud Firestore and Firebase Cloud Storage must **NEVER** be deployed blindly or without passing automated emulator verification gates.

All production rules deployments are gated and automated strictly through the **GitHub Actions Continuous Integration (CI)** pipeline upon merge or release tagging to `main`.

### Required CI Pre-Flight Gates
Before any rules deployment step is invoked in CI, all the following gates must succeed:
1. **Repository Typecheck & Build:** `npm run build` succeeds without type errors across all packages.
2. **Rules Static Pattern Tests:** `npm test --workspace=@paperworking/web -- src/__tests__/firestore-rules.test.ts src/__tests__/storage-rules.test.ts` passes 100% green.
3. **Real Firebase Emulator Test Matrix:** `@firebase/rules-unit-testing` tests execute inside the live containerized Firebase Emulator Suite (`firebase emulators:exec --only firestore,storage`).
4. **Custom Claims Sync Tests:** `npm test --workspace=@paperworking/web -- src/__tests__/claims-sync.test.ts` passes 100% green.

---

## 2. CI Deployment Workflow & Commands

The CI runner authenticates using Google Cloud Workload Identity Federation (recommended) or a dedicated CI service account key with the `Firebase Rules Admin` role.

### GitHub Actions CI Job Configuration
```yaml
name: Test & Deploy Security Rules
on:
  push:
    branches: [main]
    paths:
      - 'firestore.rules'
      - 'storage.rules'
      - 'apps/web/lib/auth/claims-sync.ts'
      - 'apps/web/src/__tests__/rules-unit-testing.test.ts'

jobs:
  rules-emulator-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java JRE for Firebase Emulators
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Install dependencies
        run: npm ci

      - name: Pre-build packages
        run: npm run build --workspace=@paperworking/shared --workspace=@paperworking/validation --workspace=@paperworking/database --workspace=@paperworking/financial-engine --workspace=@paperworking/api

      - name: Run Static Rules Tests
        run: npm test --workspace=@paperworking/web -- src/__tests__/firestore-rules.test.ts src/__tests__/storage-rules.test.ts src/__tests__/claims-sync.test.ts

      - name: Run Live Firebase Emulator Matrix
        run: npm run test:rules:emulator

      - name: Deploy Rules to Firebase (Production)
        uses: FirebaseExtended/action-hosting-deploy@v0
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live
```

---

## 3. CATCH-7: Custom Claims Synchronization Architecture

### The Problem
In `storage.rules`, multi-tenant organization isolation is enforced by the helper:
```javascript
function isInOrg(orgId) {
  return isAuthenticated() && (
    request.auth.token.organizationId == orgId ||
    request.auth.token.orgId == orgId
  );
}
```
Prior to CATCH-7 remediation, no service in the application set or synchronized `organizationId` / `orgId` claims on Firebase Auth tokens.

### The Solution: Server-Side Roster Sourcing
Claims synchronization is implemented via [`apps/web/lib/auth/claims-sync.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/lib/auth/claims-sync.ts):
1. **Strictly Server-Side Authority**: Claims are sourced exclusively from the PostgreSQL `organizations` and `organization_members` tables (`RosterRepository`). Client-provided role or organization claims are **never** accepted or trusted directly.
2. **Session Creation Hook**: On session creation (`handleSessionPost`), `syncUserOrganizationClaims(uid)` runs automatically. If the user belongs to organizations, their active claim is set to their primary/existing membership. If the user has zero memberships, claims are cleared (fail-closed).
3. **Multi-Org Active Organization Switching**:
   - Multi-org users can switch their active organization via `POST /api/auth/organization/switch`.
   - The endpoint validates the user's active session, then queries `RosterRepository.getUserMemberships(uid)`.
   - If the user is **not** an active member of the requested `targetOrgId`, the request is rejected with `403 Forbidden` (`ForbiddenOrganizationError`).
   - If verified, `admin.auth().setCustomUserClaims(uid, { organizationId, orgId, role })` updates the user's claims in Firebase Auth.
4. **Membership Grant & Revocation**:
   - `grantOrganizationMembershipAndSyncClaims(organizationId, userId, role)`: Atomically adds member in `RosterRepository` and updates Firebase Auth claims.
   - `revokeOrganizationMembershipAndSyncClaims(organizationId, userId)`: Atomically deletes membership in `RosterRepository` and resynchronizes remaining memberships or clears claims (fail-closed).

---

## 4. Live Rule Deployment & Post-Deploy Verification Probes

### Founder Deployment Execution
When deploying security rules manually (or initializing a new Firebase project), run:
```bash
npx -y firebase-tools@latest login --reauth
npx -y firebase-tools@latest deploy --only firestore:rules,storage --project "$FIREBASE_PROJECT_ID"
```

### Post-Deployment Probe Checklist
Immediately following deployment to the live Firebase project, execute the automated probe runner:
```bash
npm run probe:live:rules
```
Or directly with Node / tsx:
```bash
npx tsx packages/database/scripts/probe-live-rules.ts
```

The probe runner performs two critical security probes:
1. **Probe 1 (Confidential Firestore Collection Read)**:
   - Client: Unauthenticated Client SDK.
   - Target: `/feedback/{probeId}`.
   - Expected Result: **DENIED** with error code `permission-denied`.
   - Rationale: Proves that `allow read, write: if false;` on confidential collections is enforcing.
2. **Probe 2 (Contract Vault Due Diligence Storage Path)**:
   - Client: Authenticated Client SDK.
   - Target: `/deals/{probeDealId}/documents/throwaway-psa.pdf`.
   - Expected Result: **DENIED** with error code `storage/unauthorized`.
   - Rationale: Verifies that P-03 remediation is enforcing live—direct client SDK reads of Contract Vault documents are completely revoked, and documents can only be accessed via server-minted short-lived signed URLs.

*Note: The probe runner uses randomly generated throwaway probe IDs and never touches real customer projects or PSA data.*

---

## 5. Rollback Procedures

If an unexpected client regression or permission error is detected post-deployment:

### Method A: Instant Ruleset Reversion via Firebase CLI (Fastest)
Cloud Firestore maintains a historical ledger of deployed rulesets. You can list previous rulesets and release a historical version in seconds without creating a git commit:

1. **List Recent Rules Releases:**
   ```bash
   firebase firestore:rules:releases --project "$FIREBASE_PROJECT_ID"
   ```
2. **Roll Back to Previous Ruleset:**
   ```bash
   firebase firestore:rules:release <PREVIOUS_RULESET_ID> --project "$FIREBASE_PROJECT_ID"
   ```

### Method B: Git Tag Re-Deployment via CI (Standard)
```bash
git checkout <LAST_KNOWN_GOOD_TAG>
firebase deploy --only firestore:rules,storage --project "$FIREBASE_PROJECT_ID"
```

---

## 6. Security Rules Architecture Reference

### Cloud Firestore (`firestore.rules`)
- **Global Default-Deny:** `match /{document=**} { allow read, write: if false; }` catches all unmapped paths.
- **Pattern A (Per-User):** `/users/{uid}/**` restricted strictly to owner (`request.auth.uid == uid`).
- **Pattern B (Authenticated Read / Server Write):** `/deals/{dealId}`, `/leases/{leaseId}`, `/tenants/{tenantId}`, `/rentPayments/{paymentId}`, `/geocodeCache/{normalizedAddress}`. Client writes forbidden.
- **Pattern C (Confidential / Server-Only):** `/internal/**`, `/audit_logs/**`, `/_dev_probes/**`, `/feedback/**`, `/callbacks/**`. Client read and write forbidden (`allow read, write: if false;`).
- **Pattern D (Public Read Support Base):** `/support_faq/{faqId}`, `/support_glossary/{termId}` allow public read, server-only write.

### Cloud Storage (`storage.rules`) & P-03 Closure
- **P-03 Vulnerability Closed:** Direct client reads on `/deals/{dealId}/documents/*` and `/projects/{projectId}/*` are **strictly revoked** (`allow read, write: if false;`).
- **Object-Level AuthZ Signed URLs:** All sensitive due diligence paperwork and project documents are accessed through `/api/projects/[id]/documents/[docId]?mode=signedUrl` with strict $\le 15$ minute expiration.
- **Tenant Scoping:** Direct client uploads to `/orgs/{orgId}/**` enforce custom claim membership (`request.auth.token.organizationId == orgId || request.auth.token.orgId == orgId`) and $\le 50\text{ MB}$ payload limits.
- **Quarantine Upload Buffers:** Temporary staging uploads are isolated to `/temp/{uid}/**` and `/users/{uid}/temp/**`, owner-only, $\le 25\text{ MB}$.
- **User Avatars:** `/users/{uid}/avatar/**` allows authenticated read and owner-only write $\le 5\text{ MB}$.
- **Global Default-Deny:** `match /{allPaths=**} { allow read, write: if false; }`.

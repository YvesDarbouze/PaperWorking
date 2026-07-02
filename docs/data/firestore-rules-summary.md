# Firestore Security Rules & Index Documentation

> **Last updated:** 2026-05-31 | **Agent:** @data

---

## Table of Contents

- [Rule Summary by Collection](#rule-summary-by-collection)
- [Role Permission Matrix](#role-permission-matrix)
- [Vendor Scope Decision Rationale](#vendor-scope-decision-rationale)
- [Composite Index Documentation](#composite-index-documentation)
- [Testing](#testing)

---

## Rule Summary by Collection

### Top-Level Collections

| Collection | Read | Write (Create) | Write (Update) | Write (Delete) |
|---|---|---|---|---|
| **users/{uid}** | Own doc only (`uid == auth.uid`) | Own doc only | Own doc only | ❌ Denied |
| **organizations/{orgId}** | Tenant members | Owner (`ownerUid == auth.uid`) | Owner only | ❌ Denied |
| **projects/{projectId}** | Org members (`isInProjectOrg`) | Owner + active subscription | Lead Investor, GC (not closed) | Lead Investor (not closed) |
| **propertyMetricSnapshots** | Org members (`hasTenantAccess`) | ❌ Admin SDK only | ❌ Admin SDK only | ❌ Admin SDK only |
| **stripe_events** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **notifications** | Own (`recipientId == auth.uid`) | ❌ Admin SDK only | Own (read/archived/readAt only) | ❌ Admin SDK only |
| **inboxItems** | Own (`recipientUid == auth.uid`) | ❌ Admin SDK only | Own (read/archived/actionTaken/readAt) | ❌ Admin SDK only |
| **waitlist** | ❌ Denied | ✅ Anyone (public) | ❌ Denied | ❌ Denied |
| **auditLog / auditLogs / audit_logs** | ❌ Denied | ✅ Authenticated | ❌ Denied | ❌ Denied |
| **invitations** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **teamInvitations** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **queued_emails** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **pending_subscriptions** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **investmentTokens** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **loi** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **support_tickets** | Own (`userId == auth.uid`) | Own | ❌ Admin SDK only | ❌ Admin SDK only |
| **support_messages** | Own (`userId == auth.uid`) | Own | ❌ Denied | ❌ Denied |
| **metricSnapshots** (top-level legacy) | Org members | ❌ Admin SDK only | ❌ Admin SDK only | ❌ Admin SDK only |

### Subcollections under `projects/{projectId}/`

| Subcollection | Read | Create | Update | Delete |
|---|---|---|---|---|
| **ledgerItems** | Org members | Lead Investor, GC, Accountant | Lead Investor, Accountant | Lead Investor |
| **phaseSnapshots** | Org members | Lead Investor | ❌ Immutable | ❌ Immutable |
| **vendorRequests** | Org members OR referenced vendor | Org members | Org members (any field) OR vendor (quote fields only) | ❌ Denied |
| **vendorAssignments** | Org members OR referenced vendor | Org members (not closed) | Org members OR vendor (status/respondedAt/quotedFee only) | ❌ Denied |
| **privateFinancials** | Org members | Lead Investor | Lead Investor | Lead Investor |
| **investors/{investorId}** | Org members | Lead Investor OR self | Self only (status/confirmedAt/amount/equity) | Lead Investor |
| **messages** | Org members | Org members | ❌ Immutable | ❌ Immutable |
| **fieldHistory** | Org members | ❌ Admin SDK only | ❌ Admin SDK only | ❌ Admin SDK only |

### Subcollections under `users/{userId}/`

| Subcollection | Read | Create | Update | Delete |
|---|---|---|---|---|
| **sessions** | Own | Own | Own (isValid=false only) | Own |
| **vendorInbox** | Own | ❌ Admin SDK only | Own (status field only) | ❌ Admin SDK only |

### Subcollections under `organizations/{orgId}/`

| Subcollection | Read | Create | Update | Delete |
|---|---|---|---|---|
| **metricSnapshots** | Org members | ❌ Admin SDK only | ❌ Admin SDK only | ❌ Admin SDK only |

---

## Role Permission Matrix

### Project-Level Access (via `members` map)

| Action | Lead Investor | General Contractor | Accountant | Observer / Analyst | Vendor (external) | Lender |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Read project | ✅ | ✅ | ✅ | ✅ | ❌ (unless via vendorRequests) | ✅ |
| Update project | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create ledger item | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve ledger item | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Read vendor requests | ✅ | ✅ | ✅ | ✅ | Own only | ✅ |
| Submit quote (vendorRequest) | ❌ | ❌ | ❌ | ❌ | ✅ (own, quote fields) | ❌ |
| Read notifications | Own only | Own only | Own only | Own only | Own only | Own only |
| Read private financials | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Write private financials | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create phase snapshot | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update investor commitment | ❌ | ❌ | ❌ | Self only | ❌ | ❌ |

### System-Level Access

| Collection | Client (any auth) | Admin SDK | Cloud Functions |
|---|:---:|:---:|:---:|
| stripe_events | ❌ | ✅ | ✅ |
| propertyMetricSnapshots (write) | ❌ | ✅ | ✅ |
| notifications (create) | ❌ | ✅ | ✅ |
| queued_emails | ❌ | ✅ | ✅ |
| teamInvitations | ❌ | ✅ | ✅ |
| invitations | ❌ | ✅ | ✅ |

---

## Vendor Scope Decision Rationale

### The Problem

Firestore does not support field-level write permissions on a single document. When a vendor (e.g., a `loan_processor`) updates a project, we need to ensure they only modify fields relevant to their scope — not the purchase price, ARV, or other fields.

### Options Evaluated

| Approach | Pros | Cons | Chosen? |
|---|---|---|:---:|
| **A. `affectedKeys()` on project doc** | Single document, familiar | Rules become extremely complex with 30+ fields per vendor type. Vendor type would need to be stored in the project `members` map. Hard to maintain. | ❌ |
| **B. Subcollections per vendor scope** | Clean separation, easy rules | Requires restructuring existing data model. All code paths that currently read `project.financials.loanAmount` would need updating. | ❌ |
| **C. API-level enforcement (Admin SDK)** | Zero client-side vendor writes. All vendor mutations flow through server actions that validate scope. Rules only need to allow/deny at the collection level. | Vendor scoping is "invisible" in rules, but it's already how the app works (see `vendorAssignment.ts`, `vendor-portal/requests/route.ts`). | ✅ |
| **D. Subcollection for vendor submissions** | Vendors write to `vendorRequests` (quotes) and `vendorAssignments` (status). The project doc itself is never written by vendors. | Already implemented in the codebase. | ✅ (combined with C) |

### Chosen Approach: C + D

**All vendor data mutations are server-side (Admin SDK) or via scoped subcollections.**

1. **Vendor quote submission** → `projects/{pid}/vendorRequests/{rid}` — vendor can only update `status`, `quotedFee`, `message`, `quotedAt` (enforced via `affectedKeys()` in rules)
2. **Vendor assignment status** → `projects/{pid}/vendorAssignments/{aid}` — vendor can only update `status`, `respondedAt`, `quotedFee`, `updatedAt`
3. **Project document writes** → Only Lead Investor and General Contractor via `hasRole()` check. Vendors never write directly to the project document.
4. **Vendor-scoped financials** (loan details, rehab costs) → Flow through API routes (`/api/vendors/request`, server actions) which use Admin SDK to bypass rules with server-side validation.

This approach is **already consistent with the codebase architecture** where:
- `src/app/api/vendors/request/route.ts` uses `adminDb` for all writes
- `src/app/api/vendor-portal/requests/route.ts` uses `adminDb` for all reads/writes
- `src/actions/vendorAssignment.ts` uses `adminDb` for all assignment lifecycle operations

---

## Composite Index Documentation

### Index Registry

| # | Collection | Scope | Fields | Used By |
|---|---|---|---|---|
| 1 | `users` | COLLECTION | `subscriptionPlan` ↑, `subscriptionStatus` ↑, `vendorType` ↑, `stateCode` ↑ | Lawyer marketplace search |
| 2 | `users` | COLLECTION | `subscriptionPlan` ↑, `subscriptionStatus` ↑, `stateCode` ↑ | Vendor marketplace fallback |
| 3 | `projects` | COLLECTION | `organizationId` ↑, `status` ↑ | Dashboard KPIs, closed projects query |
| 4 | `projects` | COLLECTION | `organizationId` ↑, `currentPhase` ↑, `updatedAt` ↓ | Portfolio view with phase filter |
| 5 | `propertyMetricSnapshots` | COLLECTION | `organizationId` ↑, `projectId` ↑, `createdAt` ↓ | Property metrics dashboard |
| 6 | `vendorRequests` | **COLLECTION_GROUP** | `vendorUid` ↑, `status` ↑, `requestedAt` ↓ | Vendor portal (cross-project) |
| 7 | `vendorRequests` | COLLECTION | `requestedAt` ↓ | Project vendor list ordering |
| 8 | `notifications` | COLLECTION | `recipientId` ↑, `archived` ↑, `createdAt` ↓ | Inbox feed (primary query) |
| 9 | `notifications` | COLLECTION | `recipientId` ↑, `read` ↑, `archived` ↑, `createdAt` ↓ | Unread notifications, digest cron |
| 10 | `inboxItems` | COLLECTION | `recipientUid` ↑, `createdAt` ↓ | Legacy inbox feed |
| 11 | `teamInvitations` | COLLECTION | `organizationId` ↑, `status` ↑, `createdAt` ↓ | Team management pending invites |
| 12 | `teamInvitations` | COLLECTION | `organizationId` ↑, `email` ↑, `status` ↑ | Duplicate invite prevention |
| 13 | `vendorAssignments` | COLLECTION | `vendorId` ↑, `serviceType` ↑, `status` ↑ | Duplicate assignment prevention |
| 14 | `vendorAssignments` | COLLECTION | `createdAt` ↓ | Assignment list ordering |
| 15 | `ledgerItems` | COLLECTION | `status` ↑, `createdAt` ↓ | Approved items list |
| 16 | `queued_emails` | COLLECTION | `status` ↑, `createdAt` ↑ | Email queue processing cron |
| 17 | `messages` | **COLLECTION_GROUP** | `emailNotificationSent` ↑, `createdAt` ↑ | Email notification cron |
| 18 | `metricSnapshots` | COLLECTION | `date` ↓ | Dashboard chart data |

> **COLLECTION_GROUP** indexes (#6, #17) are required for queries that span multiple parent documents (e.g., vendor portal querying vendorRequests across all projects).

---

## Testing

### Prerequisites

```bash
# Install test dependency (already in package.json)
npm install -D @firebase/rules-unit-testing

# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Verify firebase.json has emulator config
# (should include firestore emulator on port 8080)
```

### Running Tests

```bash
# Option A: Start emulator + run tests in one command
npx firebase emulators:exec 'npx vitest run firestore-rules-tests/'

# Option B: Start emulator separately, then run tests
npx firebase emulators:start --only firestore &
npx vitest run firestore-rules-tests/rules.test.ts

# Option C: Dry-run rules validation (no emulator needed)
npx firebase-tools deploy --only firestore:rules --dry-run
```

### Test Cases (24 total)

| # | Test | Expected |
|---|---|---|
| 1 | Owner can read own project | ✅ Pass |
| 2 | Owner can write to own project | ✅ Pass |
| 3 | Admin can read assigned project | ✅ Pass |
| 4 | Vendor cannot read unassigned project | ❌ Denied |
| 5 | Vendor can read their own vendor request | ✅ Pass |
| 6 | Vendor can submit quote on their request | ✅ Pass |
| 7 | Vendor cannot modify requestedBy field | ❌ Denied |
| 8 | Anonymous user cannot read anything | ❌ Denied |
| 9 | User cannot read another user's doc | ❌ Denied |
| 10 | Client cannot write to stripe_events | ❌ Denied |
| 11 | Client cannot read stripe_events | ❌ Denied |
| 12 | Client cannot write to propertyMetricSnapshots | ❌ Denied |
| 13 | Owner can read propertyMetricSnapshots | ✅ Pass |
| 14 | User can read own notifications | ✅ Pass |
| 15 | User cannot read other's notifications | ❌ Denied |
| 16 | User can mark own notification as read | ✅ Pass |
| 17 | User cannot create notifications | ❌ Denied |
| 18 | User can read own user doc | ✅ Pass |
| 19 | User cannot delete own user doc | ❌ Denied |
| 20 | Waitlist allows anonymous create | ✅ Pass |
| 21 | Stranger cannot read project | ❌ Denied |
| 22 | Observer can read but not write project | ✅/❌ |
| 23 | Client cannot write teamInvitations | ❌ Denied |
| 24 | Client cannot write queued_emails | ❌ Denied |

### Firebase Emulator Configuration

If `firebase.json` doesn't include emulator config, add:

```json
{
  "emulators": {
    "firestore": {
      "port": 8080,
      "host": "127.0.0.1"
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

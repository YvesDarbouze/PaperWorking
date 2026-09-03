# FIRESTORE COLLECTION BLUEPRINT v1

**Status:** APPROVED blueprint (design contract)  
**Parent:** `docs/FINAL_FIRESTORE_ARCHITECTURE_v1.md`  
**Date:** 2026-08-26  
**Scope:** Product Firestore SoT only (not Prisma REIL/banking tables)

**Conventions**
- Document IDs are strings unless noted.
- Timestamps are Firestore `Timestamp` (server or client).
- `uid` / `userId` / `ownerId` / `recipientId` always mean Firebase Auth UID.
- Subcollections are listed under their parent path.
- Embedded `projects.members` is **not** in this blueprint (deprecated as RBAC SoT).

---

## Path legend

| Path pattern | Meaning |
|---|---|
| `/users/{uid}` | Top-level |
| `/organizations/{orgId}` | Top-level |
| `/organizationMembers/{membershipId}` | Top-level |
| `/projects/{projectId}` | Top-level |
| `/projectMembers/{membershipId}` | Top-level |
| `/projects/{projectId}/vendorRequests/{requestId}` | Subcollection |
| `/projects/{projectId}/commitments/{commitmentId}` | Subcollection |
| `/projects/{projectId}/activityLog/{eventId}` | Subcollection |
| `/projects/{projectId}/phaseSnapshots/{snapshotId}` | Subcollection |
| `/inboxItems/{itemId}` | Top-level |
| `/notifications/{notificationId}` | Top-level |
| `/messageThreads/{threadId}` | Top-level |
| `/messages/{messageId}` | Top-level |
| `/taskAssignments/{taskId}` | Top-level |
| `/projectFolders/{folderId}` | Top-level |
| `/projectFiles/{fileId}` | Top-level |
| `/dealListings/{listingId}` | Top-level |
| `/dealInvitations/{invitationId}` | Top-level |
| `/investorFollowers/{followerUid}_{targetUid}` | Top-level (composite ID) |
| `/subscriptions/{subscriptionId}` | Top-level |
| `/vendorServices/{serviceId}` | Top-level |

---

# 1. users

**Collection name:** `users`  
**Path:** `/users/{uid}`  
**Purpose:** Product identity SoT — profile, account tier, preferences, entitlement snapshot for fast gates. Linked to Postgres `AppUser.id = uid` as FK bridge only.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `uid` | string | yes | Same as document ID |
| `email` | string \| null | yes | Nullable for edge auth cases |
| `displayName` | string | yes | |
| `accountType` | enum | yes | `investor` \| `investment_team` \| `vendor` \| `admin` |
| `role` | string | yes | Platform display/legacy role (e.g. Lead Investor, Vendor, Platform Admin) |
| `personalOrganizationId` | string | yes | Default org (“Me” workspace) |
| `subscriptionPlan` | enum | yes | Entitlement **snapshot** (not billing SoT) |
| `subscriptionStatus` | enum | yes | Entitlement **snapshot** |
| `orgRole` | string | no | Self-designated org title |
| `organizationId` | string | no | Legacy; prefer `personalOrganizationId` |
| `memberships` | map\<orgId, role\> | no | Legacy denorm; SoT is `organizationMembers` |
| `stripeCustomerId` | string | no | Snapshot / convenience |
| `lastFour`, `cardBrand` | string | no | Payment display |
| `cancelAtPeriodEnd` | bool | no | |
| `currentPeriodEnd` | number | no | Unix seconds |
| `billingEmail`, `billingAddress` | string | no | |
| `phone`, `companyName` | string | no | |
| `onboardingCompleted` | bool | no | |
| `onboardingIntent` | enum | no | |
| `firstMetricLit` | Timestamp | no | |
| `onboardingOverlayDismissed` | bool | no | |
| `inviteToken`, `invitedToProjectId` | string | no | Guest/invite arrival |
| `fcmTokens` | string[] | no | Push |
| `lastActiveAt` | Timestamp | no | |
| `preferences` | object | no | Quiet hours + category channels |
| `googleCalendarRefreshToken` | string | no | Server/sensitive — prefer Admin SDK only |
| `vendorTypes` | string[] | no | Vendor specializations |
| `photoURL` | string | no | Avatar |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`uid`, `email`, `displayName`, `accountType`, `role`, `personalOrganizationId`, `subscriptionPlan`, `subscriptionStatus`, `createdAt`, `updatedAt`

### Optional fields
All remaining fields in schema table.

### References
- → `organizations/{personalOrganizationId}`
- → `subscriptions` (billing SoT; snapshot fields mirror active subscription)
- ← `projectMembers.userId`, `organizationMembers.userId`, inbox/notifications recipients

### Timestamps
`createdAt`, `updatedAt`, optional `lastActiveAt`, `firstMetricLit`

### Indexes
- Usually get-by-ID only (`uid` = doc id)
- Optional: `accountType` + `createdAt` (admin user lists)
- Optional: `stripeCustomerId` (webhook lookup) — unique-ish

### Security dependencies
- Read: self OR `accountType == admin`
- Create: self on signup (Admin SDK preferred)
- Update: self (profile/prefs); Admin for `accountType` / entitlement overrides
- Delete: Admin only
- Sensitive fields (`googleCalendarRefreshToken`) never client-readable if stored here — prefer server-only storage

### Example document

```
Doc ID: uid_abc123
{
  "uid": "uid_abc123",
  "email": "investor@example.com",
  "displayName": "Alex Investor",
  "accountType": "investor",
  "role": "Lead Investor",
  "personalOrganizationId": "org_me_abc123",
  "subscriptionPlan": "Individual",
  "subscriptionStatus": "active",
  "stripeCustomerId": "cus_123",
  "onboardingCompleted": true,
  "preferences": {
    "pushEnabled": true,
    "emailEnabled": true,
    "quietHours": { "enabled": false, "start": "22:00", "end": "07:00", "timezone": "America/New_York" }
  },
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 2. organizations

**Collection name:** `organizations`  
**Path:** `/organizations/{orgId}`  
**Purpose:** Multi-tenant boundary. Every project belongs to one organization. Seat/plan rollups live here; membership SoT is `organizationMembers` (not embedded `teamMembers` array for RBAC queries).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | = doc id |
| `name` | string | yes | |
| `ownerUid` | string | yes | Billing/admin owner |
| `accountTier` | enum | yes | `Individual` \| `Team` |
| `subscriptionPlan` | enum | yes | Org-level plan snapshot |
| `subscriptionStatus` | enum | yes | |
| `maxSeats` | number | yes | 1 Individual / N Team |
| `memberCount` | number | no | Denorm from organizationMembers |
| `totalProjectsClosed` | number | no | Portfolio rollup |
| `totalNetRealizedProfit` | number | no | |
| `averagePortfolioROI` | number | no | |
| `stripeCustomerId` | string | no | If org-billed |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

**Deprecated on this doc (do not use as SoT):** embedded `teamMembers[]` — migrate authority to `organizationMembers`.

### Required fields
`id`, `name`, `ownerUid`, `accountTier`, `subscriptionPlan`, `subscriptionStatus`, `maxSeats`, `createdAt`, `updatedAt`

### Optional fields
`memberCount`, portfolio rollups, `stripeCustomerId`

### References
- `ownerUid` → `users`
- ← `projects.organizationId`
- ← `organizationMembers.organizationId`

### Timestamps
`createdAt`, `updatedAt`

### Indexes
- `ownerUid`
- `accountTier` + `createdAt` (admin)

### Security dependencies
- Read: org members OR Admin
- Create: authenticated investor/team creating workspace
- Update: org owner / org Admin role / Master Admin
- Delete: owner or Master Admin (soft-delete preferred)

### Example document

```
Doc ID: org_me_abc123
{
  "id": "org_me_abc123",
  "name": "Alex Investor",
  "ownerUid": "uid_abc123",
  "accountTier": "Individual",
  "subscriptionPlan": "Individual",
  "subscriptionStatus": "active",
  "maxSeats": 1,
  "memberCount": 1,
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 3. organizationMembers

**Collection name:** `organizationMembers`  
**Path:** `/organizationMembers/{membershipId}`  
**Purpose:** Queryable org membership SoT (invite/accept/remove). Replaces embedded `organizations.teamMembers` for access checks.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Prefer `{orgId}_{userId}` or uuid |
| `organizationId` | string | yes | |
| `userId` | string | conditional | Set when accepted; omit/null while invite-only |
| `email` | string | yes | Invite email |
| `displayName` | string | yes | |
| `role` | enum/string | yes | Org role: `Lead Investor` \| `Admin` \| internal titles as needed |
| `status` | enum | yes | `invited` \| `active` \| `removed` \| `suspended` |
| `customPermissions` | string[] | no | Optional overrides |
| `scope` | enum | no | `tenant` \| `project` |
| `assignedProjectIds` | string[] | no | Deal Lead scoping |
| `invitedBy` | string | no | uid |
| `invitedAt` | Timestamp | yes | |
| `acceptedAt` | Timestamp | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `organizationId`, `email`, `displayName`, `role`, `status`, `invitedAt`, `createdAt`, `updatedAt`

### Optional fields
`userId`, `customPermissions`, `scope`, `assignedProjectIds`, `invitedBy`, `acceptedAt`

### References
- → `organizations/{organizationId}`
- → `users/{userId}` when active
- Soft link to `projects` via `assignedProjectIds`

### Timestamps
`invitedAt`, `acceptedAt?`, `createdAt`, `updatedAt`

### Indexes
- `(organizationId, status)`
- `(userId, status)` — list orgs for user
- `(organizationId, email)` — invite uniqueness
- Unique constraint conceptually: one active membership per `(organizationId, userId)`

### Security dependencies
- Read: same-org members, invitee (own invite), Admin
- Create: org owner / Lead Investor / Admin with `team.invite`
- Update: status transitions by invitee (accept) or org admin
- Delete/remove: org admin; soft-status `removed` preferred

### Example document

```
Doc ID: org_me_abc123_uid_def456
{
  "id": "org_me_abc123_uid_def456",
  "organizationId": "org_me_abc123",
  "userId": "uid_def456",
  "email": "analyst@example.com",
  "displayName": "Sam Analyst",
  "role": "Admin",
  "status": "active",
  "invitedBy": "uid_abc123",
  "invitedAt": "<Timestamp>",
  "acceptedAt": "<Timestamp>",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 4. projects

**Collection name:** `projects`  
**Path:** `/projects/{projectId}`  
**Purpose:** Lean product workspace SoT (identity, phase summary, ownership, visibility). Heavy REIL/financial graphs live in Postgres `ReilProject` (linked).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | = doc id; prefer shared with ReilProject |
| `organizationId` | string | yes | Tenant |
| `ownerId` | string | yes | Investor owner uid |
| `name` | string | yes | Display / property short name |
| `status` | enum | yes | e.g. `active` \| `archived` \| `closed_won` \| `closed_lost` |
| `lifecyclePhase` | enum/string | yes | Acquisition \| Fund \| Hold \| Exit (or numeric 1–4) |
| `addressLine` | string | yes | Summary address |
| `city` | string | yes | |
| `state` | string | yes | |
| `zip` | string | yes | |
| `visibility` | enum | yes | `private` \| `team` \| `marketplace` |
| `reilProjectId` | string | no | If IDs differ from Firestore id |
| `lat`, `lng` | number | no | |
| `placeId` | string | no | |
| `propertyType` | string | no | |
| `units` | number | no | |
| `memberCount` | number | no | Denorm from projectMembers |
| `memberUidsPreview` | string[] | no | Small UI preview only — **not** RBAC |
| `kpiSummary` | object | no | Denorm metrics for cards |
| `coverImageUrl` | string | no | |
| `tags` | string[] | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |
| `archivedAt` | Timestamp | no | |

**Out of scope on this doc (Postgres / subcollections):** full financials blob, comps, funding stack, embedded `members` map as authority.

### Required fields
`id`, `organizationId`, `ownerId`, `name`, `status`, `lifecyclePhase`, `addressLine`, `city`, `state`, `zip`, `visibility`, `createdAt`, `updatedAt`

### Optional fields
Geo, REIL link, denorm counts/KPI, media, archive stamp

### References
- → `organizations`, `users` (owner)
- ← `projectMembers.projectId`
- ← subcollections under this project
- ↔ Postgres `ReilProject` via shared id or `reilProjectId`

### Timestamps
`createdAt`, `updatedAt`, `archivedAt?`

### Indexes
- `(ownerId, status)`
- `(organizationId, status)`
- `(organizationId, lifecyclePhase)`
- `(visibility, updatedAt)` — marketplace browse if applicable

### Security dependencies
- Read: owner OR active `projectMembers` OR Master Admin  
  (Vendor: **no** blanket read — only via assigned request/task paths)
- Create: Investor / investment_team with create entitlement; sets OWNER membership
- Update: OWNER or TEAM_LEAD (field-scoped); Admin
- Delete/archive: OWNER or Admin

### Example document

```
Doc ID: proj_elm_001
{
  "id": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "ownerId": "uid_abc123",
  "name": "123 Elm St",
  "status": "active",
  "lifecyclePhase": "Hold",
  "addressLine": "123 Elm Street",
  "city": "Austin",
  "state": "TX",
  "zip": "78701",
  "visibility": "private",
  "reilProjectId": "proj_elm_001",
  "memberCount": 3,
  "kpiSummary": { "arv": 425000, "totalCashInvested": 280000 },
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 5. projectMembers

**Collection name:** `projectMembers`  
**Path:** `/projectMembers/{membershipId}`  
**Purpose:** **Canonical project RBAC SoT.** Enables “my projects”, team directory, TEAM_LEAD/TEAM_MEMBER scopes.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Prefer `{projectId}_{userId}` |
| `projectId` | string | yes | |
| `userId` | string | yes | |
| `organizationId` | string | yes | Denorm for tenant filters |
| `role` | enum | yes | `OWNER` \| `TEAM_LEAD` \| `TEAM_MEMBER` \| `VENDOR` |
| `status` | enum | yes | `invited` \| `active` \| `removed` \| `suspended` |
| `permissions` | string[] | no | Optional overrides beyond role bundle |
| `invitedBy` | string | no | uid |
| `invitedAt` | Timestamp | yes | |
| `acceptedAt` | Timestamp | no | |
| `displayName` | string | no | Denorm |
| `email` | string | no | Denorm |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `projectId`, `userId`, `organizationId`, `role`, `status`, `invitedAt`, `createdAt`, `updatedAt`

### Optional fields
`permissions`, `invitedBy`, `acceptedAt`, `displayName`, `email`

### References
- → `projects/{projectId}`
- → `users/{userId}`
- → `organizations/{organizationId}`

### Timestamps
`invitedAt`, `acceptedAt?`, `createdAt`, `updatedAt`

### Indexes
- `(userId, status)` — list projects for user (**critical**)
- `(projectId, role)` — team roster
- `(projectId, status)`
- Unique: `(projectId, userId)` for active membership

### Security dependencies
- Read: project members of same project; Admin; user can read own memberships
- Create: OWNER / TEAM_LEAD (invite); system creates OWNER on project create
- Update: OWNER / TEAM_LEAD for role/status; invitee may accept
- Delete/remove: OWNER / TEAM_LEAD; cannot remove last OWNER without transfer

### Example document

```
Doc ID: proj_elm_001_uid_def456
{
  "id": "proj_elm_001_uid_def456",
  "projectId": "proj_elm_001",
  "userId": "uid_def456",
  "organizationId": "org_me_abc123",
  "role": "TEAM_LEAD",
  "status": "active",
  "invitedBy": "uid_abc123",
  "invitedAt": "<Timestamp>",
  "acceptedAt": "<Timestamp>",
  "displayName": "Jordan Lead",
  "email": "jordan@example.com",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 6. vendorRequests

**Collection name:** `vendorRequests` (subcollection)  
**Path:** `/projects/{projectId}/vendorRequests/{requestId}`  
**Purpose:** Marketplace service request pipeline under a project. Queried via **collectionGroup** for vendor portal.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | Redundant with path for collectionGroup |
| `organizationId` | string | yes | Tenant denorm for rules/filters |
| `vendorUid` | string | yes | Assigned/target vendor |
| `status` | enum | yes | `PENDING` \| `QUOTED` \| `ACCEPTED` \| `COMPLETED` \| `DECLINED` \| `CANCELLED` |
| `requestedAt` | Timestamp | yes | |
| `requestedBy` | string | yes | Investor/team uid |
| `serviceType` | enum/string | yes | Lawyer, Inspector, Contractor, … |
| `message` | string | no | Request context |
| `quotedFee` | number | no | USD (future: cents) |
| `quotedAt` | Timestamp | no | |
| `respondedAt` | Timestamp | no | |
| `responseMessage` | string | no | |
| `completedAt` | Timestamp | no | |
| `sharedFolderUrl` | string | no | Deliverables |
| `vendorName`, `vendorCompanyName` | string | no | Denorm |
| `requestedByName` | string | no | Denorm |
| `vendorServiceId` | string | no | → vendorServices |
| `taskAssignmentId` | string | no | Link when accepted → task |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `projectId`, `organizationId`, `vendorUid`, `status`, `requestedAt`, `requestedBy`, `serviceType`, `createdAt`, `updatedAt`

### Optional fields
Quote/response/completion fields, denorm names, links

### References
- Parent → `projects/{projectId}`
- → `users/{vendorUid}`, `users/{requestedBy}`
- → `vendorServices/{vendorServiceId}?`
- → `taskAssignments/{taskAssignmentId}?`

### Timestamps
`requestedAt`, `quotedAt?`, `respondedAt?`, `completedAt?`, `createdAt`, `updatedAt`

### Indexes
- Collection group: `(vendorUid, status)`
- Collection group: `(vendorUid, requestedAt DESC)`
- Under project: `(status, requestedAt)`
- `(requestedBy, status)` (if queried as collectionGroup)

### Security dependencies
- Read: project members of parent project; assigned vendor; Admin
- Create: project OWNER / TEAM_LEAD / Investor owner
- Update: vendor (quote/respond/complete own); project lead (accept/cancel)
- Delete: rare — prefer `CANCELLED`

### Example document

```
Path: /projects/proj_elm_001/vendorRequests/vr_901
{
  "id": "vr_901",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "vendorUid": "uid_vendor_77",
  "status": "QUOTED",
  "requestedAt": "<Timestamp>",
  "requestedBy": "uid_abc123",
  "requestedByName": "Alex Investor",
  "serviceType": "Inspector",
  "message": "Full inspection before closing.",
  "quotedFee": 650,
  "quotedAt": "<Timestamp>",
  "vendorName": "Pat Inspector",
  "vendorServiceId": "svc_inspect_01",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 7. commitments

**Collection name:** `commitments` (subcollection)  
**Path:** `/projects/{projectId}/commitments/{commitmentId}`  
**Purpose:** Investment soft/hard commitments against a project/deal.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | |
| `organizationId` | string | yes | |
| `investorUid` | string | yes | Committer |
| `amount` | number | yes | USD (future cents) |
| `currency` | string | yes | Default `USD` |
| `status` | enum | yes | `soft` \| `hard` \| `withdrawn` \| `funded` \| `cancelled` |
| `dealListingId` | string | no | If from marketplace listing |
| `dealInvitationId` | string | no | |
| `note` | string | no | |
| `committedAt` | Timestamp | yes | |
| `fundedAt` | Timestamp | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `projectId`, `organizationId`, `investorUid`, `amount`, `currency`, `status`, `committedAt`, `createdAt`, `updatedAt`

### Optional fields
`dealListingId`, `dealInvitationId`, `note`, `fundedAt`

### References
- Parent project
- → `users/{investorUid}`
- → `dealListings`, `dealInvitations` optional

### Timestamps
`committedAt`, `fundedAt?`, `createdAt`, `updatedAt`

### Indexes
- `(projectId, status)`
- Collection group `(investorUid, status)`
- `(projectId, committedAt DESC)`

### Security dependencies
- Read: project members; committing investor; Admin
- Create: invited investor / project lead rules per deal settings
- Update: investor (withdraw soft) / project OWNER-TEAM_LEAD (status)
- Delete: prefer status `cancelled`

### Example document

```
Path: /projects/proj_elm_001/commitments/cmt_12
{
  "id": "cmt_12",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "investorUid": "uid_lp_09",
  "amount": 50000,
  "currency": "USD",
  "status": "soft",
  "dealListingId": "listing_elm_public",
  "committedAt": "<Timestamp>",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 8. activityLog

**Collection name:** `activityLog` (subcollection)  
**Path:** `/projects/{projectId}/activityLog/{eventId}`  
**Purpose:** Append-only project activity trail (phase changes, uploads, assignments, comments summary).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | |
| `organizationId` | string | yes | |
| `actorUid` | string | yes | |
| `actorName` | string | no | Denorm |
| `action` | string | yes | e.g. `phase.transition`, `file.uploaded`, `member.invited` |
| `summary` | string | yes | Human-readable |
| `entityType` | string | no | `task` \| `file` \| `member` \| … |
| `entityId` | string | no | |
| `metadata` | map | no | |
| `createdAt` | Timestamp | yes | |

### Required fields
`id`, `projectId`, `organizationId`, `actorUid`, `action`, `summary`, `createdAt`

### Optional fields
`actorName`, `entityType`, `entityId`, `metadata`

### References
- Parent project; actor → users; optional entity refs

### Timestamps
`createdAt` only (append-only; no `updatedAt`)

### Indexes
- `(projectId, createdAt DESC)` — via parent path queries
- Collection group optional: `(actorUid, createdAt)`

### Security dependencies
- Read: project members; Admin
- Create: server / privileged client of members (prefer Admin SDK)
- Update/Delete: deny (append-only); Admin purge only if required

### Example document

```
Path: /projects/proj_elm_001/activityLog/evt_88
{
  "id": "evt_88",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "actorUid": "uid_def456",
  "actorName": "Jordan Lead",
  "action": "task.assigned",
  "summary": "Assigned inspection follow-up to Pat Inspector",
  "entityType": "task",
  "entityId": "task_554",
  "createdAt": "<Timestamp>"
}
```

---

# 9. phaseSnapshots

**Collection name:** `phaseSnapshots` (subcollection)  
**Path:** `/projects/{projectId}/phaseSnapshots/{snapshotId}`  
**Purpose:** Product wizard / phase UI state snapshots (not full REIL engine state).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | |
| `phase` | string/number | yes | Lifecycle phase key |
| `label` | string | yes | |
| `payload` | map | yes | Wizard field bag (product-scoped) |
| `version` | number | yes | Monotonic |
| `createdBy` | string | yes | uid |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | no | If mutable draft |
| `isLatest` | bool | no | Denorm helper |

### Required fields
`id`, `projectId`, `phase`, `label`, `payload`, `version`, `createdBy`, `createdAt`

### Optional fields
`updatedAt`, `isLatest`

### References
- Parent project; `createdBy` → users

### Timestamps
`createdAt`, optional `updatedAt`

### Indexes
- `(projectId, phase, version DESC)`
- `(projectId, isLatest)` if used

### Security dependencies
- Read/Create/Update: project members with edit rights (OWNER/TEAM_LEAD/TEAM_MEMBER per field policy)
- Delete: OWNER / Admin

### Example document

```
Path: /projects/proj_elm_001/phaseSnapshots/ps_hold_v3
{
  "id": "ps_hold_v3",
  "projectId": "proj_elm_001",
  "phase": "Hold",
  "label": "Hold registry draft",
  "version": 3,
  "isLatest": true,
  "payload": { "occupancy": "vacant", "utilitiesResponsibility": "owner" },
  "createdBy": "uid_def456",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 10. inboxItems

**Collection name:** `inboxItems`  
**Path:** `/inboxItems/{itemId}`  
**Purpose:** Actionable universal inbox feed (work queue). Distinct from `notifications` (delivery events) and `messages` (conversation body).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `recipientUid` | string | yes | |
| `organizationId` | string | yes | |
| `type` | enum | yes | vendor_lead, team_invite, system_alert, message, task_notification, … |
| `title` | string | yes | |
| `body` | string | yes | |
| `priority` | enum | yes | low \| normal \| high \| urgent |
| `read` | bool | yes | |
| `archived` | bool | yes | |
| `senderUid` | string | no | |
| `senderName` | string | no | |
| `senderAvatarUrl` | string | no | |
| `projectId` | string | no | |
| `propertyName` | string | no | |
| `actionUrl` | string | no | |
| `actionLabel` | string | no | |
| `metadata` | map | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | no | |
| `expiresAt` | Timestamp | no | |

### Required fields
`id`, `recipientUid`, `organizationId`, `type`, `title`, `body`, `priority`, `read`, `archived`, `createdAt`

### Optional fields
Sender/project/action/metadata/expiry/updatedAt

### References
- → `users/{recipientUid}`
- → optional `projects`, senders, tasks via metadata

### Timestamps
`createdAt`, `updatedAt?`, `expiresAt?`

### Indexes
- `(recipientUid, createdAt DESC)`
- `(recipientUid, read, createdAt DESC)`
- `(recipientUid, archived, createdAt DESC)`
- `(organizationId, createdAt DESC)` optional admin

### Security dependencies
- Read/Update(read,archived): recipient only
- Create: server (Admin SDK)
- Delete: recipient or Admin

### Example document

```
Doc ID: inbox_1001
{
  "id": "inbox_1001",
  "recipientUid": "uid_abc123",
  "organizationId": "org_me_abc123",
  "type": "task_notification",
  "title": "Inspection quote ready",
  "body": "Pat Inspector quoted $650 on 123 Elm St.",
  "priority": "high",
  "read": false,
  "archived": false,
  "projectId": "proj_elm_001",
  "propertyName": "123 Elm St",
  "actionUrl": "/dashboard/inbox",
  "actionLabel": "Review",
  "createdAt": "<Timestamp>"
}
```

---

# 11. notifications

**Collection name:** `notifications`  
**Path:** `/notifications/{notificationId}`  
**Purpose:** Delivery/event records across in-app / email / push. Server-created; client may mark read/archived only.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `recipientId` | string | yes | uid |
| `type` | enum | yes | VENDOR_BID, TASK_ASSIGNED, DEADLINE_ALERT, … |
| `title` | string | yes | |
| `body` | string | yes | |
| `actor` | object | yes | `{ uid, name, role?, avatarUrl? }` |
| `objectReference` | object | yes | Routing payload |
| `urgencyLevel` | enum | yes | informational \| actionable \| critical |
| `channels` | string[] | yes | in-app, email, push |
| `read` | bool | yes | |
| `archived` | bool | yes | |
| `deepLinkUrl` | string | yes | |
| `createdAt` | Timestamp | yes | |
| `expiresAt` | Timestamp | no | |
| `readAt` | Timestamp | no | |

### Required fields
`id`, `recipientId`, `type`, `title`, `body`, `actor`, `objectReference`, `urgencyLevel`, `channels`, `read`, `archived`, `deepLinkUrl`, `createdAt`

### Optional fields
`expiresAt`, `readAt`

### References
- → `users/{recipientId}`
- `objectReference.projectId` → projects
- `actor.uid` → users

### Timestamps
`createdAt`, `expiresAt?`, `readAt?`

### Indexes
- `(recipientId, createdAt DESC)`
- `(recipientId, read, createdAt DESC)`
- `(recipientId, archived, createdAt DESC)`

### Security dependencies
- Create: server only
- Read: recipient; Admin
- Update: recipient limited to `read`, `archived`, `readAt`
- Delete: recipient or Admin

### Example document

```
Doc ID: notif_77
{
  "id": "notif_77",
  "recipientId": "uid_abc123",
  "type": "TASK_ASSIGNED",
  "title": "New task assigned",
  "body": "Jordan assigned you a follow-up on 123 Elm St.",
  "actor": { "uid": "uid_def456", "name": "Jordan Lead", "role": "TEAM_LEAD" },
  "objectReference": { "projectId": "proj_elm_001", "task": "task_554", "dealAddress": "123 Elm St" },
  "urgencyLevel": "actionable",
  "channels": ["in-app", "email"],
  "read": false,
  "archived": false,
  "deepLinkUrl": "/dashboard/projects/proj_elm_001",
  "createdAt": "<Timestamp>"
}
```

---

# 12. messageThreads

**Collection name:** `messageThreads`  
**Path:** `/messageThreads/{threadId}`  
**Purpose:** Conversation container (DM or project-scoped). Bodies live in `messages`.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `participantUids` | string[] | yes | Sorted unique uids |
| `participantKey` | string | yes | Deterministic join key for DM uniqueness |
| `type` | enum | yes | `direct` \| `project` \| `deal` |
| `projectId` | string | no | Required if type=project |
| `organizationId` | string | no | |
| `subject` | string | no | |
| `lastMessagePreview` | string | no | Denorm |
| `lastMessageAt` | Timestamp | no | |
| `lastSenderUid` | string | no | |
| `unreadCounts` | map\<uid, number\> | no | Denorm |
| `createdBy` | string | yes | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `participantUids`, `participantKey`, `type`, `createdBy`, `createdAt`, `updatedAt`

### Optional fields
`projectId`, `organizationId`, `subject`, last-message denorm, unreadCounts

### References
- → participants in `users`
- → optional `projects`
- ← `messages.threadId`

### Timestamps
`createdAt`, `updatedAt`, `lastMessageAt?`

### Indexes
- `(participantKey)` unique for direct threads
- Collection queries via array-contains: `participantUids` + `lastMessageAt DESC` (or maintain per-user inbox index docs if scale requires)
- `(projectId, updatedAt DESC)` for project threads

### Security dependencies
- Read/Update: participants only
- Create: authenticated user who is a participant
- Delete: soft-archive preferred; Admin hard delete

### Example document

```
Doc ID: thr_aa_bb
{
  "id": "thr_aa_bb",
  "type": "direct",
  "participantUids": ["uid_abc123", "uid_vendor_77"],
  "participantKey": "uid_abc123_uid_vendor_77",
  "lastMessagePreview": "Quote uploaded to shared folder.",
  "lastMessageAt": "<Timestamp>",
  "lastSenderUid": "uid_vendor_77",
  "unreadCounts": { "uid_abc123": 1, "uid_vendor_77": 0 },
  "createdBy": "uid_abc123",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 13. messages

**Collection name:** `messages`  
**Path:** `/messages/{messageId}`  
**Purpose:** Individual chat messages belonging to a thread.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `threadId` | string | yes | |
| `senderUid` | string | yes | |
| `body` | string | yes | |
| `attachmentUrls` | string[] | no | Storage URLs |
| `attachmentProjectId` | string | no | Shared project card |
| `readBy` | string[] | no | Or map |
| `createdAt` | Timestamp | yes | |
| `editedAt` | Timestamp | no | |
| `deletedAt` | Timestamp | no | Soft delete |

### Required fields
`id`, `threadId`, `senderUid`, `body`, `createdAt`

### Optional fields
Attachments, readBy, editedAt, deletedAt

### References
- → `messageThreads/{threadId}`
- → `users/{senderUid}`
- optional project attachment

### Timestamps
`createdAt`, `editedAt?`, `deletedAt?`

### Indexes
- `(threadId, createdAt ASC/DESC)`
- `(senderUid, createdAt DESC)` optional

### Security dependencies
- Read: thread participants
- Create: participant sender == auth.uid
- Update: sender (edit/soft-delete) limited fields
- Delete: soft-delete; Admin purge

### Example document

```
Doc ID: msg_9001
{
  "id": "msg_9001",
  "threadId": "thr_aa_bb",
  "senderUid": "uid_vendor_77",
  "body": "Quote uploaded to shared folder.",
  "attachmentUrls": ["https://firebasestorage.googleapis.com/.../quote.pdf"],
  "readBy": ["uid_vendor_77"],
  "createdAt": "<Timestamp>"
}
```

---

# 14. taskAssignments

**Collection name:** `taskAssignments`  
**Path:** `/taskAssignments/{taskId}`  
**Purpose:** Assignable work items (ASSIGN scope). Vendor-visible when `assigneeId` or `vendorId` matches.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | |
| `organizationId` | string | yes | |
| `title` | string | yes | |
| `description` | string | no | |
| `status` | enum | yes | `open` \| `in_progress` \| `blocked` \| `done` \| `cancelled` |
| `priority` | enum | no | |
| `assigneeId` | string | yes | Primary assignee uid |
| `assignerId` | string | yes | |
| `vendorId` | string | no | If vendor-facing |
| `vendorRequestId` | string | no | Link to request |
| `dueAt` | Timestamp | no | |
| `completedAt` | Timestamp | no | |
| `tags` | string[] | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `projectId`, `organizationId`, `title`, `status`, `assigneeId`, `assignerId`, `createdAt`, `updatedAt`

### Optional fields
description, priority, vendor fields, due/completed, tags

### References
- → `projects`, `users` (assignee/assigner/vendor)
- → optional `vendorRequests` path ids

### Timestamps
`dueAt?`, `completedAt?`, `createdAt`, `updatedAt`

### Indexes
- `(assigneeId, status)` — My tasks (**critical**)
- `(projectId, status)`
- `(vendorId, status)` — vendor portal
- `(projectId, dueAt)`

### Security dependencies
- Read: project members; assignee; vendorId match; Admin
- Create: OWNER / TEAM_LEAD (Investor per business rule may create requests vs assign)
- Update: assignee (status/progress); TEAM_LEAD/OWNER (reassign)
- Delete: TEAM_LEAD/OWNER → prefer `cancelled`

### Example document

```
Doc ID: task_554
{
  "id": "task_554",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "title": "Complete property inspection",
  "description": "Upload report to Closing folder",
  "status": "in_progress",
  "priority": "high",
  "assigneeId": "uid_vendor_77",
  "assignerId": "uid_def456",
  "vendorId": "uid_vendor_77",
  "vendorRequestId": "vr_901",
  "dueAt": "<Timestamp>",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 15. projectFolders

**Collection name:** `projectFolders`  
**Path:** `/projectFolders/{folderId}`  
**Purpose:** Document vault folders (phase-based filing cabinet).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | |
| `organizationId` | string | yes | |
| `name` | string | yes | |
| `phase` | enum/string | yes | Find & Fund, Closing, Rehab, … |
| `ownerUid` | string | yes | Creator |
| `fileCount` | number | yes | Denorm |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | no | |

### Required fields
`id`, `projectId`, `organizationId`, `name`, `phase`, `ownerUid`, `fileCount`, `createdAt`

### Optional fields
`updatedAt`

### References
- → `projects`
- ← `projectFiles.folderId`

### Timestamps
`createdAt`, `updatedAt?`

### Indexes
- `(projectId, phase)`
- `(organizationId, projectId)`

### Security dependencies
- Read: project members
- Create/Update: members with doc permission; OWNER/TEAM_LEAD
- Delete: OWNER/TEAM_LEAD if `fileCount == 0`

### Example document

```
Doc ID: folder_closing_elm
{
  "id": "folder_closing_elm",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "name": "Closing",
  "phase": "Closing",
  "ownerUid": "uid_abc123",
  "fileCount": 2,
  "createdAt": "<Timestamp>"
}
```

---

# 16. projectFiles

**Collection name:** `projectFiles`  
**Path:** `/projectFiles/{fileId}`  
**Purpose:** File metadata for vault documents; bytes in Firebase Storage.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `folderId` | string | yes | |
| `projectId` | string | yes | |
| `organizationId` | string | yes | |
| `name` | string | yes | Original filename |
| `category` | enum | yes | LOI, Appraisal, … |
| `storageUrl` | string | yes | Download URL / path |
| `storagePath` | string | no | Bucket object path (preferred for rules) |
| `fileType` | string | yes | MIME |
| `sizeBytes` | number | no | |
| `uploadedByUid` | string | yes | |
| `uploadedByEmail` | string | no | |
| `isVerified` | bool | yes | |
| `verifiedByUid` | string | no | |
| `verifiedAt` | Timestamp | no | |
| `uploadedAt` | Timestamp | yes | |
| `status` | enum | no | Uploaded → Under Review → Verified → Archived |
| `isControlEvidence` | bool | no | |
| `purpose` | enum | no | marketing \| control_evidence |

### Required fields
`id`, `folderId`, `projectId`, `organizationId`, `name`, `category`, `storageUrl`, `fileType`, `uploadedByUid`, `isVerified`, `uploadedAt`

### Optional fields
size, emails, verification, status, purpose flags, storagePath

### References
- → `projectFolders`, `projects`, uploader user
- Storage object path must be namespaced by `organizationId/projectId/...`

### Timestamps
`uploadedAt`, `verifiedAt?`

### Indexes
- `(projectId, folderId)`
- `(projectId, category)`
- `(organizationId, uploadedAt DESC)`
- `(uploadedByUid, uploadedAt DESC)`

### Security dependencies
- Read: project members (vendor may be limited to own uploads / shared folders)
- Create: members with upload permission
- Update: verifier (OWNER/TEAM_LEAD); uploader limited fields
- Delete: OWNER/TEAM_LEAD; Storage object delete must match
- Storage rules must align with `storagePath`

### Example document

```
Doc ID: file_hud1_01
{
  "id": "file_hud1_01",
  "folderId": "folder_closing_elm",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "name": "HUD-1.pdf",
  "category": "HUD-1 Settlement Statement",
  "storageUrl": "https://firebasestorage.googleapis.com/.../HUD-1.pdf",
  "storagePath": "org_me_abc123/proj_elm_001/closing/HUD-1.pdf",
  "fileType": "application/pdf",
  "sizeBytes": 245760,
  "uploadedByUid": "uid_abc123",
  "isVerified": false,
  "status": "Uploaded",
  "uploadedAt": "<Timestamp>"
}
```

---

# 17. dealListings

**Collection name:** `dealListings`  
**Path:** `/dealListings/{listingId}`  
**Purpose:** Marketplace / crowdfunding deal listing surface (public or gated).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `projectId` | string | yes | Source project |
| `organizationId` | string | yes | |
| `ownerId` | string | yes | Publisher uid |
| `title` | string | yes | |
| `slug` | string | yes | Public URL key |
| `status` | enum | yes | `draft` \| `published` \| `funding` \| `closed` \| `archived` |
| `summary` | string | yes | |
| `targetRaise` | number | no | |
| `minimumCommit` | number | no | |
| `coverImageUrl` | string | no | |
| `highlights` | string[] | no | |
| `publishedAt` | Timestamp | no | |
| `closesAt` | Timestamp | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `projectId`, `organizationId`, `ownerId`, `title`, `slug`, `status`, `summary`, `createdAt`, `updatedAt`

### Optional fields
Raise amounts, media, publish/close stamps, highlights

### References
- → `projects`, `users` owner
- ← `dealInvitations`, `commitments`

### Timestamps
`publishedAt?`, `closesAt?`, `createdAt`, `updatedAt`

### Indexes
- `(status, publishedAt DESC)`
- `(slug)` unique
- `(ownerId, status)`
- `(projectId)`

### Security dependencies
- Read: `published|funding` for authenticated (or public); draft = owner/project members
- Create/Update: project OWNER / TEAM with marketplace permission
- Delete/archive: owner / Admin

### Example document

```
Doc ID: listing_elm_public
{
  "id": "listing_elm_public",
  "projectId": "proj_elm_001",
  "organizationId": "org_me_abc123",
  "ownerId": "uid_abc123",
  "title": "123 Elm Value-Add",
  "slug": "123-elm-value-add",
  "status": "published",
  "summary": "Hold strategy with light rehab in Austin.",
  "targetRaise": 150000,
  "minimumCommit": 25000,
  "publishedAt": "<Timestamp>",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 18. dealInvitations

**Collection name:** `dealInvitations`  
**Path:** `/dealInvitations/{invitationId}`  
**Purpose:** Invite tokens / RSVP for deal participation.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `dealListingId` | string | yes | |
| `projectId` | string | yes | Denorm |
| `inviterUid` | string | yes | |
| `inviteeEmail` | string | yes | |
| `inviteeUid` | string | no | After accept/signup |
| `token` | string | yes | Opaque invite token |
| `status` | enum | yes | `pending` \| `accepted` \| `declined` \| `expired` \| `revoked` |
| `expiresAt` | Timestamp | yes | |
| `acceptedAt` | Timestamp | no | |
| `message` | string | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `dealListingId`, `projectId`, `inviterUid`, `inviteeEmail`, `token`, `status`, `expiresAt`, `createdAt`, `updatedAt`

### Optional fields
`inviteeUid`, `acceptedAt`, `message`

### References
- → `dealListings`, `projects`, inviter/invitee users

### Timestamps
`expiresAt`, `acceptedAt?`, `createdAt`, `updatedAt`

### Indexes
- `(token)` unique
- `(dealListingId, status)`
- `(inviteeEmail, status)`
- `(inviteeUid, status)`

### Security dependencies
- Read: inviter; invitee (by token/email/uid); Admin
- Create: TEAM_LEAD / OWNER / investment_team entitlement
- Update: invitee accept/decline; inviter revoke
- Delete: revoker / Admin

### Example document

```
Doc ID: inv_55
{
  "id": "inv_55",
  "dealListingId": "listing_elm_public",
  "projectId": "proj_elm_001",
  "inviterUid": "uid_abc123",
  "inviteeEmail": "lp@example.com",
  "token": "tok_9f3a...",
  "status": "pending",
  "expiresAt": "<Timestamp>",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 19. investorFollowers

**Collection name:** `investorFollowers`  
**Path:** `/investorFollowers/{followerUid}_{targetUid}`  
**Purpose:** Follow graph for investor profiles in marketplace.

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | `{followerUid}_{targetUid}` |
| `followerUid` | string | yes | |
| `targetUid` | string | yes | |
| `createdAt` | Timestamp | yes | |

### Required fields
`id`, `followerUid`, `targetUid`, `createdAt`

### Optional fields
none required for v1 (optional `notificationsEnabled` later)

### References
- → `users` (follower & target)

### Timestamps
`createdAt`

### Indexes
- Doc ID is unique composite
- `(targetUid, createdAt DESC)` — followers of investor
- `(followerUid, createdAt DESC)` — following list

### Security dependencies
- Read: authenticated (or public profiles policy)
- Create/Delete: only `followerUid == auth.uid`
- Update: deny (immutable edge) or limited prefs later

### Example document

```
Doc ID: uid_lp_09_uid_abc123
{
  "id": "uid_lp_09_uid_abc123",
  "followerUid": "uid_lp_09",
  "targetUid": "uid_abc123",
  "createdAt": "<Timestamp>"
}
```

---

# 20. subscriptions

**Collection name:** `subscriptions`  
**Path:** `/subscriptions/{subscriptionId}`  
**Purpose:** Billing history SoT. Active entitlement is mirrored onto `users.subscriptionPlan/Status` (gate cache).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Often Stripe subscription id |
| `userId` | string | yes | Or org billing owner |
| `organizationId` | string | no | If org-billed |
| `stripeCustomerId` | string | yes | |
| `stripeSubscriptionId` | string | yes | |
| `plan` | enum/string | yes | Individual \| Team \| Vendor Network \| … |
| `status` | enum | yes | active \| trialing \| past_due \| canceled \| … |
| `cancelAtPeriodEnd` | bool | no | |
| `currentPeriodStart` | Timestamp | no | |
| `currentPeriodEnd` | Timestamp | no | |
| `priceId` | string | no | Stripe price |
| `testMode` | bool | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |

### Required fields
`id`, `userId`, `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `status`, `createdAt`, `updatedAt`

### Optional fields
org link, period stamps, priceId, cancel flag, testMode

### References
- → `users/{userId}`
- → optional `organizations`
- Stripe webhook writes also update user snapshot + `stripe_events` (outside this list)

### Timestamps
`currentPeriodStart?`, `currentPeriodEnd?`, `createdAt`, `updatedAt`

### Indexes
- `(userId, status)`
- `(stripeSubscriptionId)` unique
- `(stripeCustomerId)`
- `(organizationId, status)`

### Security dependencies
- Read: owning user; org billing admin; Master Admin
- Create/Update/Delete: **server only** (Stripe webhooks / Admin SDK)
- Client never mutates billing SoT

### Example document

```
Doc ID: sub_1PqStripe
{
  "id": "sub_1PqStripe",
  "userId": "uid_abc123",
  "organizationId": "org_me_abc123",
  "stripeCustomerId": "cus_123",
  "stripeSubscriptionId": "sub_1PqStripe",
  "plan": "Individual",
  "status": "active",
  "cancelAtPeriodEnd": false,
  "currentPeriodEnd": "<Timestamp>",
  "testMode": true,
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

# 21. vendorServices

**Collection name:** `vendorServices`  
**Path:** `/vendorServices/{serviceId}`  
**Purpose:** Vendor-offered services listed on marketplace (identity remains `users` with `accountType=vendor`).

### Document schema

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | |
| `vendorUid` | string | yes | |
| `title` | string | yes | |
| `serviceType` | enum/string | yes | Inspector, Contractor, … |
| `description` | string | yes | |
| `status` | enum | yes | `draft` \| `published` \| `paused` \| `archived` |
| `regions` | string[] | no | Service areas |
| `basePrice` | number | no | |
| `currency` | string | no | Default USD |
| `coverImageUrl` | string | no | |
| `ratingAvg` | number | no | Denorm |
| `ratingCount` | number | no | |
| `createdAt` | Timestamp | yes | |
| `updatedAt` | Timestamp | yes | |
| `publishedAt` | Timestamp | no | |

### Required fields
`id`, `vendorUid`, `title`, `serviceType`, `description`, `status`, `createdAt`, `updatedAt`

### Optional fields
regions, pricing, media, ratings, publishedAt

### References
- → `users/{vendorUid}` (must be vendor)
- ← `vendorRequests.vendorServiceId`

### Timestamps
`createdAt`, `updatedAt`, `publishedAt?`

### Indexes
- `(status, serviceType)`
- `(vendorUid, status)`
- `(status, publishedAt DESC)`
- optional region array-contains + serviceType

### Security dependencies
- Read: published for authenticated marketplace users; drafts = owner vendor
- Create/Update: `vendorUid == auth.uid` and accountType vendor
- Delete/archive: owner vendor or Admin
- Master Admin can moderate (`paused`)

### Example document

```
Doc ID: svc_inspect_01
{
  "id": "svc_inspect_01",
  "vendorUid": "uid_vendor_77",
  "title": "Full Residential Inspection",
  "serviceType": "Inspector",
  "description": "ASHI-certified inspections within 48h.",
  "status": "published",
  "regions": ["Austin, TX", "Round Rock, TX"],
  "basePrice": 650,
  "currency": "USD",
  "publishedAt": "<Timestamp>",
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>"
}
```

---

## Blueprint cross-cutting notes

### Document ID strategies (approved)

| Collection | ID strategy |
|---|---|
| `users` | Firebase Auth uid |
| `projectMembers` | `{projectId}_{userId}` |
| `organizationMembers` | `{organizationId}_{userId}` or uuid while invited |
| `investorFollowers` | `{followerUid}_{targetUid}` |
| `subscriptions` | Stripe subscription id when available |
| Others | UUID / auto-id |

### Subcollection vs top-level reminder

| Subcollection under `projects/{id}/` | Why |
|---|---|
| `vendorRequests` | Project-scoped pipeline + collectionGroup for vendors |
| `commitments` | Project capital commits |
| `activityLog` | Project timeline |
| `phaseSnapshots` | Project wizard state |

All other listed collections are **top-level** for cross-project queries and security simplicity.

### Not in this blueprint (but architecture-approved companions)

`stripe_events`, `systemConfig`, `verification_codes`, `queued_emails`, `dataCompletionTasks`, `propertyMetricSnapshots`, `permissions`/`roleBindings` — defined in FINAL architecture; expand in a follow-on blueprint if needed.

---

**END — FIRESTORE COLLECTION BLUEPRINT v1**

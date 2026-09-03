# Firestore V1 — Danh sách Collections đầy đủ (sau wipe)

> **Ngày:** 2026-03-04  
> **Nguồn:** `packages/validation/src/schemas/*`, `FIRESTORE_COLLECTION_BLUEPRINT_v1.md`, `packages/database/src/firestore/admin.ts`  
> **Project Firebase:** `paperworking-97055`

---

## Quan trọng trước khi tạo tay trên Console

1. **Firestore không cần “tạo bảng” trước** — collection xuất hiện khi ghi document đầu tiên.
2. **Khuyến nghị:** dùng app/API (login → provisioning) thay vì nhập tay 25 collection.
3. Nếu vẫn tạo tay: chỉ cần **1 document mẫu** mỗi collection (có thể xóa sau).
4. Deploy indexes + rules:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```
5. Bật auth Firestore: `DATABASE_READ_MODE=firestore` trong `.env`.

---

## Tổng số: **25 collection paths**

| # | Loại | Collection path | Số doc tối thiểu lúc bootstrap |
|---|------|-----------------|-------------------------------|
| 1–17 | Top-level (product) | xem bảng dưới | 0 (tạo khi dùng) |
| 18–21 | Subcollection (`projects/{id}/…`) | 4 loại | 0 |
| 22–25 | Companion (infra) | 4 loại | 1 (`systemConfig/v1_schema`) |

---

## Quy ước Document ID

| Entity | Document ID | Ví dụ |
|--------|-------------|-------|
| User | **Email** (lowercase) | `user@example.com` — field `uid` giữ Firebase Auth UID |
| Organization | `org_{slug}` hoặc UUID | `org_me_kR3abc` |
| Organization member | `{orgId}_{userId}` | `org_me_kR3abc_kR3abc` |
| Project | `proj_{uuid}` hoặc UUID | `proj_a1b2c3` |
| Project member | `{projectId}_{userId}` | `proj_a1b2c3_kR3abc` |
| Deal listing | `listing_{slug}` | `listing_123-elm-st` |
| Deal invitation | auto UUID | `inv_9f3a2b1c` |
| Message thread | `thr_{participantKey}` | `thr_uidA_uidB` |
| Message | auto UUID | `msg_9001` |
| Inbox / Notification | auto UUID | Firestore auto-id OK |
| Task | auto UUID | `task_554` |
| Folder / File | `{purpose}_{projectId}` | `folder_closing_proj_x` |
| Investor follower | `{followerUid}_{targetUid}` | composite |
| Subscription | Stripe sub id | `sub_1PqStripe` |
| Vendor service | auto UUID | `svc_inspect_01` |
| Stripe event | Stripe event id | `evt_1Oa8K2...` |
| systemConfig | fixed keys | `v1_schema`, `lender_rates` |

**Timestamp:** dùng type **timestamp** trên Console (không phải string).

---

# PHẦN A — 17 TOP-LEVEL COLLECTIONS (PRODUCT)

---

## 1. `users` (1/17)

**Path:** `/users/{uid}`  
**Doc ID:** = Firebase Auth UID  
**Mục đích:** Identity SoT — profile + subscription snapshot

### Trường bắt buộc

| Field | Type | Giá trị / enum |
|-------|------|----------------|
| `uid` | string | = doc ID |
| `email` | string \| null | email login |
| `displayName` | string | tên hiển thị |
| `role` | string | xem enum Role bên dưới |
| `personalOrganizationId` | string | → `organizations/{id}` |
| `subscriptionPlan` | string | `None` \| `Individual` \| `Team` \| `Vendor Network` |
| `subscriptionStatus` | string | `active` \| `inactive` \| `past_due` \| `canceled` \| `trialing` \| `incomplete` \| `paused` |
| `createdAt` | timestamp | server now |
| `updatedAt` | timestamp | server now |

### Trường khuyến nghị (V1 auth)

| Field | Type | Ghi chú |
|-------|------|---------|
| `accountType` | string | `investor` \| `vendor` \| `admin` (admin cho `/admin`) |
| `legacyFirebaseUid` | string | = uid (migration) |
| `stripeCustomerId` | string | sau checkout Stripe |

### Trường tuỳ chọn (40+)

`orgRole`, `organizationId`, `memberships` (map), `lastFour`, `cardBrand`, `cancelAtPeriodEnd`, `currentPeriodEnd`, `billingEmail`, `billingAddress`, `phone`, `companyName`, `onboardingCompleted`, `onboardingIntent`, `firstMetricLit`, `onboardingOverlayDismissed`, `inviteToken`, `invitedToProjectId`, `fcmTokens`, `lastActiveAt`, `preferences` (object), `googleCalendarRefreshToken`, `vendorTypes` (array), `photoURL`

### Enum `role` (platform)

`Lead Investor`, `Platform Admin`, `Admin`, `General Contractor`, `Real Estate Agent`, `Accountant`, `Lender`, `Vendor`, `Analyst`, `Observer`, `Standard`, `Guest`

### Index cần deploy

- `email`, `legacyFirebaseUid` — Firestore **tự index single-field** (không thêm vào `firestore.indexes.json`)

### Document mẫu (Console)

```json
{
  "uid": "<AUTH_UID>",
  "email": "you@example.com",
  "displayName": "Your Name",
  "accountType": "investor",
  "role": "Lead Investor",
  "personalOrganizationId": "org_me_<AUTH_UID>",
  "subscriptionPlan": "Individual",
  "subscriptionStatus": "inactive",
  "legacyFirebaseUid": "<AUTH_UID>",
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

---

## 2. `organizations` (2/17)

**Path:** `/organizations/{orgId}`  
**Doc ID:** `org_me_{ownerUid}` cho workspace cá nhân

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | ✓ | = doc ID |
| `name` | string | ✓ | tên org |
| `ownerUid` | string | ✓ | → users |
| `accountTier` | string | ✓ | `Individual` \| `Team` |
| `subscriptionPlan` | string | ✓ | enum plan |
| `subscriptionStatus` | string | ✓ | enum status |
| `teamMembers` | array | ✓ | `[]` cho Individual (legacy embed) |
| `maxSeats` | number | ✓ | `1` Individual, `10` Team |
| `createdAt` | timestamp | ✓ | |
| `updatedAt` | timestamp | ✓ | |
| `totalProjectsClosed` | number | | rollup |
| `totalNetRealizedProfit` | number | | USD |
| `averagePortfolioROI` | number | | % whole number |
| `stripeCustomerId` | string | | org billing |

**Không dùng `teamMembers` làm SoT RBAC** — dùng `organizationMembers`.

---

## 3. `organizationMembers` (3/17)

**Path:** `/organizationMembers/{membershipId}`  
**Doc ID:** `{organizationId}_{userId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `organizationId` | string | ✓ |
| `email` | string | ✓ |
| `displayName` | string | ✓ |
| `role` | string | ✓ — `Lead Investor`, `Admin`, `CEO`, `Deal Lead`, … |
| `status` | string | ✓ — `invited` \| `active` \| `removed` \| `suspended` |
| `invitedAt` | timestamp | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `userId` | string | sau khi accept invite |
| `customPermissions` | array | |
| `scope` | string | `tenant` \| `project` |
| `assignedProjectIds` | array | |
| `invitedBy` | string | |
| `acceptedAt` | timestamp | |

**Index:** `(organizationId, status)`, `(organizationId, email)`

---

## 4. `projects` (4/17) — collection lớn nhất

**Path:** `/projects/{projectId}`  
**Doc ID:** UUID hoặc `proj_{shortId}`

### Trường bắt buộc (tối thiểu V1)

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `organizationId` | string | ✓ |
| `propertyName` | string | ✓ |
| `address` | string | ✓ |
| `status` | string | ✓ — `acquisition` \| `fund` \| `hold` \| `exit` |
| `ownerUid` | string | ✓ |
| `members` | map | ✓ — `{ [uid]: { uid, role, joinedAt } }` (denorm; SoT = projectMembers) |
| `financials` | map | ✓ — ít nhất `purchasePrice`, `estimatedARV`, `costs: []` |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |

### Trường hay dùng

| Field | Type | Notes |
|-------|------|-------|
| `currentPhase` | number | **1–4** (1=Acquisition, 4=Exit) — KHÔNG đổi sang string |
| `phaseStatus` | string | `Phase 1: Acquisition`, … |
| `assetClass` | string | `Residential`, `Multi-Family`, … |
| `city`, `state`, `zip` | string | địa chỉ |
| `visibility` | string | public/private |
| `locked` | boolean | sau close |

### `financials` (nested — rút gọn)

Bắt buộc tối thiểu:
```json
{
  "purchasePrice": 0,
  "estimatedARV": 0,
  "costs": []
}
```

100+ field khác: `arv`, `loanAmount`, `rehab_budget`, `exitStrategyType`, … — xem `packages/validation/src/schemas/projectSchema.ts`.

### Subcollections (không tạo ở root)

- `/projects/{id}/vendorRequests/{requestId}`
- `/projects/{id}/commitments/{commitmentId}`
- `/projects/{id}/activityLog/{eventId}`
- `/projects/{id}/phaseSnapshots/{snapshotId}`

---

## 5. `projectMembers` (5/17)

**Path:** `/projectMembers/{membershipId}`  
**Doc ID:** `{projectId}_{userId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `projectId` | string | ✓ |
| `userId` | string | ✓ |
| `organizationId` | string | ✓ |
| `role` | string | ✓ — `OWNER` \| `TEAM_LEAD` \| `TEAM_MEMBER` \| `VENDOR` |
| `status` | string | ✓ — `invited` \| `active` \| `removed` \| `suspended` |
| `invitedAt` | timestamp | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `permissions` | array | |
| `invitedBy` | string | |
| `acceptedAt` | timestamp | |
| `displayName` | string | |
| `email` | string | |

**Index:** `(userId, status)`, `(projectId, role)`

---

## 6. `dealListings` (6/17)

**Path:** `/dealListings/{listingId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `projectId` | string | ✓ |
| `organizationId` | string | ✓ |
| `ownerId` | string | ✓ |
| `title` | string | ✓ |
| `slug` | string | ✓ — unique URL |
| `status` | string | ✓ — `draft` \| `published` \| `funding` \| `closed` \| `archived` |
| `summary` | string | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `targetRaise` | number | |
| `minimumCommit` | number | |
| `coverImageUrl` | string | |
| `highlights` | array | |
| `publishedAt` | timestamp | |
| `closesAt` | timestamp | |

---

## 7. `dealInvitations` (7/17)

**Path:** `/dealInvitations/{invitationId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `dealListingId` | string | ✓ |
| `projectId` | string | ✓ |
| `inviterUid` | string | ✓ |
| `inviteeEmail` | string | ✓ |
| `token` | string | ✓ |
| `status` | string | ✓ — `pending` \| `accepted` \| `declined` \| `expired` \| `revoked` |
| `expiresAt` | timestamp | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `inviteeUid` | string | |
| `acceptedAt` | timestamp | |
| `message` | string | |

**Index:** `(projectId, status)`

---

## 8. `inboxItems` (8/17)

**Path:** `/inboxItems/{itemId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `recipientUid` | string | ✓ |
| `organizationId` | string | ✓ |
| `type` | string | ✓ — `vendor_lead`, `team_invite`, `system_alert`, `message`, `task_notification`, `billing_alert`, `document_shared`, … |
| `title` | string | ✓ |
| `body` | string | ✓ |
| `priority` | string | ✓ — `low` \| `normal` \| `high` \| `urgent` |
| `read` | boolean | ✓ |
| `archived` | boolean | ✓ |
| `createdAt` | timestamp | ✓ |
| `senderUid`, `senderName`, `projectId`, `propertyName`, `actionUrl`, `actionLabel`, `metadata`, `updatedAt`, `expiresAt` | | optional |

---

## 9. `notifications` (9/17)

**Path:** `/notifications/{notificationId}`  
**Ghi chú:** Chỉ server (Admin SDK) tạo.

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `recipientId` | string | ✓ |
| `type` | string | ✓ — `VENDOR_BID`, `TASK_ASSIGNED`, `PHASE_TRANSITION`, … |
| `title` | string | ✓ |
| `body` | string | ✓ |
| `actor` | map | ✓ — `{ uid, name, role?, avatarUrl? }` |
| `objectReference` | map | ✓ — `{ projectId?, dealAddress?, amount?, … }` |
| `urgencyLevel` | string | ✓ — `informational` \| `actionable` \| `critical` |
| `channels` | array | ✓ — `in-app`, `email`, `push` |
| `read` | boolean | ✓ |
| `archived` | boolean | ✓ |
| `deepLinkUrl` | string | ✓ |
| `createdAt` | timestamp | ✓ |
| `expiresAt` | timestamp | | |

---

## 10. `messageThreads` (10/17)

**Path:** `/messageThreads/{threadId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `participantUids` | array | ✓ — min 2 uid |
| `participantKey` | string | ✓ — sorted join key |
| `type` | string | ✓ — `direct` \| `project` \| `deal` |
| `createdBy` | string | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `projectId`, `organizationId`, `subject`, `lastMessagePreview`, `lastMessageAt`, `lastSenderUid`, `unreadCounts` | | optional |

**Index:** `participantUids` array-contains + `lastMessageAt` DESC

---

## 11. `messages` (11/17)

**Path:** `/messages/{messageId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `threadId` | string | ✓ |
| `senderUid` | string | ✓ |
| `body` | string | ✓ |
| `createdAt` | timestamp | ✓ |
| `attachmentUrls` | array | |
| `attachmentProjectId` | string | |
| `readBy` | array | |
| `editedAt`, `deletedAt` | timestamp | |

**Index:** `(threadId, createdAt)`

---

## 12. `taskAssignments` (12/17)

**Path:** `/taskAssignments/{taskId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `projectId` | string | ✓ |
| `organizationId` | string | ✓ |
| `title` | string | ✓ |
| `status` | string | ✓ — `open` \| `in_progress` \| `blocked` \| `done` \| `cancelled` |
| `assigneeId` | string | ✓ |
| `assignerId` | string | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `description`, `priority`, `vendorId`, `vendorRequestId`, `dueAt`, `completedAt`, `tags` | | optional |

**Index:** `(assigneeId, status)`, `(projectId, status)`

---

## 13. `projectFolders` (13/17)

**Path:** `/projectFolders/{folderId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `projectId` | string | ✓ |
| `organizationId` | string | ✓ |
| `name` | string | ✓ |
| `phase` | string | ✓ — `Find & Fund`, `Closing`, `Rehab`, `Listed`, `Sold`, … |
| `ownerUid` | string | ✓ |
| `fileCount` | number | ✓ — `0` lúc tạo |
| `createdAt` | timestamp | ✓ |

Auto-provision 5 folder/phase khi tạo project (app logic).

---

## 14. `projectFiles` (14/17)

**Path:** `/projectFiles/{fileId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `folderId` | string | ✓ |
| `projectId` | string | ✓ |
| `organizationId` | string | ✓ |
| `name` | string | ✓ |
| `category` | string | ✓ — `LOI`, `Appraisal`, `HUD-1 Settlement Statement`, … |
| `storageUrl` | string | ✓ |
| `fileType` | string | ✓ — MIME |
| `uploadedByUid` | string | ✓ |
| `isVerified` | boolean | ✓ |
| `uploadedAt` | timestamp | ✓ |
| `storagePath`, `sizeBytes`, `uploadedByEmail`, `verifiedByUid`, `verifiedAt`, `status`, `isControlEvidence`, `purpose` | | optional |

**Storage path:** `{organizationId}/{projectId}/{folder}/{filename}`

---

## 15. `investorFollowers` (15/17)

**Path:** `/investorFollowers/{followerUid}_{targetUid}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ — = doc ID |
| `followerUid` | string | ✓ |
| `targetUid` | string | ✓ |
| `createdAt` | timestamp | ✓ |

---

## 16. `subscriptions` (16/17)

**Path:** `/subscriptions/{subscriptionId}`  
**Doc ID:** thường = Stripe subscription id  
**Billing SoT** — mirror lên `users.subscriptionPlan/Status`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `userId` | string | ✓ |
| `stripeCustomerId` | string | ✓ |
| `stripeSubscriptionId` | string | ✓ |
| `plan` | string | ✓ |
| `status` | string | ✓ |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `organizationId`, `cancelAtPeriodEnd`, `currentPeriodStart`, `currentPeriodEnd`, `priceId`, `testMode` | | optional |

---

## 17. `vendorServices` (17/17)

**Path:** `/vendorServices/{serviceId}`

| Field | Type | Required |
|-------|------|----------|
| `id` | string | ✓ |
| `vendorUid` | string | ✓ |
| `title` | string | ✓ |
| `serviceType` | string | ✓ |
| `description` | string | ✓ |
| `status` | string | ✓ — `draft` \| `published` \| `paused` \| `archived` |
| `createdAt` | timestamp | ✓ |
| `updatedAt` | timestamp | ✓ |
| `regions`, `basePrice`, `currency`, `coverImageUrl`, `ratingAvg`, `ratingCount`, `publishedAt` | | optional |

**Index:** `(vendorUid, status)`

---

# PHẦN B — 4 SUBCOLLECTIONS (under `projects`)

| # | Path | Doc ID | Mục đích |
|---|------|--------|----------|
| 18 | `projects/{projectId}/vendorRequests/{requestId}` | auto | Marketplace quote pipeline |
| 19 | `projects/{projectId}/commitments/{commitmentId}` | auto | Investment commitments |
| 20 | `projects/{projectId}/activityLog/{eventId}` | auto | Append-only audit trail |
| 21 | `projects/{projectId}/phaseSnapshots/{snapshotId}` | auto | Wizard UI state |

### 18. vendorRequests — trường chính

`id`, `projectId`, `organizationId`, `vendorUid`, `status` (`PENDING`|`QUOTED`|`ACCEPTED`|`COMPLETED`|`DECLINED`|`CANCELLED`), `requestedAt`, `requestedBy`, `serviceType`, `createdAt`, `updatedAt`, + quote fields

### 19. commitments — trường chính

`id`, `projectId`, `organizationId`, `investorUid`, `amount`, `currency` (`USD`), `status` (`soft`|`hard`|`withdrawn`|`funded`|`cancelled`), `committedAt`, `createdAt`, `updatedAt`

### 20. activityLog — trường chính

`id`, `projectId`, `organizationId`, `actorUid`, `action`, `summary`, `createdAt` — **không update/delete**

### 21. phaseSnapshots — trường chính

`id`, `projectId`, `phase`, `label`, `version`, `isLatest`, `payload` (map), `createdBy`, `createdAt`, `updatedAt`

---

# PHẦN C — 4 COMPANION COLLECTIONS (infra)

| # | Collection | Doc ID mẫu | Mục đích |
|---|------------|------------|----------|
| 22 | `systemConfig` | `v1_schema` | Manifest schema (bootstrap script tạo) |
| 23 | `stripe_events` | `evt_xxx` | Stripe webhook idempotency |
| 24 | `queued_emails` | auto | Email queue cron |
| 25 | `waitlist` | auto | Marketing leads (optional) |

### systemConfig/v1_schema (tạo ngay)

Chạy: `npm run firestore:bootstrap` hoặc tạo tay:

```json
{
  "schemaVersion": "v1-blueprint-2026-03",
  "projectId": "paperworking-97055",
  "notes": ["V1 manifest — collections created on first write"]
}
```

### stripe_events — trường chính

`eventId`, `type`, `payload`, `processedAt`, `processingStatus`, `userId`, `stripeCustomerId`

### queued_emails — trường chính

`to`, `subject`, `body`, `status`, `createdAt`, `scheduledFor`

### waitlist — trường chính

`email`, `source`, `createdAt`

---

# PHẦN D — THỨ TỰ TẠO DATA THẬT (không mock)

Sau wipe, **không cần** tạo 25 collection rỗng. Flow tối thiểu:

```
1. Deploy rules + indexes
2. Login Firebase Auth (sign up)
3. POST /api/auth/session  → tạo users/{uid} (DATABASE_READ_MODE=firestore)
4. App provisioning         → organizations + organizationMembers + projectMembers
5. User tạo project         → projects + projectMembers + projectFolders
6. Stripe checkout          → subscriptions + cập nhật users.subscription*
```

### Chain document tối thiểu cho 1 user investor

```
users/{uid}
  └── personalOrganizationId → organizations/org_me_{uid}
organizationMembers/org_me_{uid}_{uid}  (role: Lead Investor, status: active)
```

Khi tạo project đầu tiên:

```
projects/{projectId}
projectMembers/{projectId}_{uid}  (role: OWNER)
projectFolders/* (5 folders)
organizations/org_me_{uid}  (update rollup nếu cần)
```

---

# PHẦN E — KHÔNG TẠO LẠI (V0 mock — đã xóa)

Các collection cũ **không thuộc V1 blueprint**:

`demo`, `deals`, `dealActivityTimeline`, `auditLogs`, `events`, `telemetry_events`, `search_telemetry`, `geocodedAddresses`, `vendorCache`, `rentcastCallLogs`, `packageShareTokens`, `support_taxonomy`, `securityEvents`

Chỉ thêm lại nếu feature cụ thể yêu cầu (Phase sau).

---

# PHẦN F — INDEXES (deploy, không tạo tay)

File: `firestore.indexes.json` — 11 composite indexes:

- `projectMembers`: userId+status, projectId+role  
- `organizationMembers`: organizationId+status, organizationId+email  
- `taskAssignments`: assigneeId+status, projectId+status  
- `messageThreads`: participantUids (array) + lastMessageAt  
- `investorFollowers`: followerUid+createdAt  
- `vendorServices`: vendorUid+status  
- `dealInvitations`: projectId+status  
- `users`: `email`, `legacyFirebaseUid` — **single-field auto-index** (không khai báo trong `firestore.indexes.json`)

---

# PHẦN G — SECURITY RULES

File: `firestore.rules` (V1) — client **không** đọc/ghi ops data; chỉ `users/{uid}` read self.

Mọi CRUD product data đi qua **Next/Nest API + Admin SDK**.

---

## Tham chiếu code

| Mục | File |
|-----|------|
| Collection constants | `packages/database/src/firestore/admin.ts` |
| Zod schemas | `packages/validation/src/schemas/*.ts` |
| Blueprint đầy đủ | `docs/FIRESTORE_COLLECTION_BLUEPRINT_v1.md` |
| Bootstrap script | `scripts/firestore-bootstrap-v1.mjs` |
| Wipe script | `scripts/firestore-wipe-all.mjs` |

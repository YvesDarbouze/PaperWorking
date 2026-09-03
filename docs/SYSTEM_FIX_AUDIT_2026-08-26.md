# SYSTEM FIX + AUDIT — Firestore Membership & Relations (2026-08-26)

**Scope:** PaperWorking_v1  
**Goal:** Fix missing collections / wrong relations / target diagram, then audit backend + API.

---

## 1. What was fixed (this pass)

### 1.1 Collections P0 (schemas + API adapters)

| Collection | Schema | API | Status |
|---|---|---|---|
| `projectMembers` | `projectMembershipSchema` | `GET/POST /api/project-members` | **Created (seed SoT)** |
| `organizationMembers` | `organizationMemberSchema` | `GET/POST /api/organization-members` + `/api/team/**` | **Created (seed SoT)** |
| `taskAssignments` | `taskAssignmentSchema` | `GET/POST /api/task-assignments` + `POST /api/tasks/assign` | **Created (seed SoT)** |

### 1.2 Collections P1 (schemas + API adapters)

| Collection | Schema | API | Status |
|---|---|---|---|
| `vendorServices` | `vendorServiceSchema` | `GET/POST /api/vendor-services` | **Created (seed)** |
| `dealInvitations` | `dealInvitationSchema` | `GET/POST /api/deal-invitations` | **Created (seed)** |
| `investorFollowers` | `investorFollowerSchema` | `GET/POST /api/investor-followers` (+ marketplace follow writes here) | **Created (seed)** |
| `messageThreads` | `messageThreadSchema` | `GET /api/message-threads` + `/api/messages` | **Created (seed)** |
| `projects/{id}/vendorRequests` | (sub) | `GET/POST /api/projects/[id]/sub/vendorRequests` | **Created (seed)** |
| `projects/{id}/commitments` | (sub) | `.../sub/commitments` | **Created (seed)** |
| `projects/{id}/activityLog` | (sub) | `.../sub/activityLog` | **Created (seed)** |
| `projects/{id}/phaseSnapshots` | (sub) | `.../sub/phaseSnapshots` | **Created (seed)** |

### 1.3 KEEP (not deleted)

- `packageShareTokens` — feature (packages/share)
- `support_taxonomy` — feature/content
- All infra: `queued_emails`, `stripe_events`, `systemConfig`, telemetry, etc.

### 1.4 Relation fixes

| Before | After |
|---|---|
| RBAC via embedded `projects.members` | **SoT = `projectMembers`** (`projectMembershipSchema`); embedded map marked **deprecated** |
| Team UI only local `TEAM_MEMBERS` seed | Team API → `organizationMembers` store |
| Follow graph ad-hoc marketplace seed | Follow → `investorFollowers` |
| Messages / threads missing routes | `/api/messages`, `/api/message-threads` |
| Docs said delete packageShare / taxonomy | Docs **reverted to KEEP** |

### 1.5 Target relationship diagram (required)

```
Firebase Auth
    │
    ▼
users ── entitlement snapshot ──► gates
    │
    ├── organizationMembers ──► organizations
    │
    ├── projectMembers ──► projects (lean)
    │                         ├── vendorRequests
    │                         ├── commitments
    │                         ├── activityLog
    │                         └── phaseSnapshots
    │                         └── link ──► Postgres ReilProject
    │
    ├── taskAssignments
    ├── inboxItems / notifications
    ├── messageThreads / messages
    ├── projectFolders / projectFiles
    ├── dealListings / dealInvitations / investorFollowers
    ├── vendorServices
    ├── packageShareTokens
    ├── support_taxonomy
    ├── subscriptions + stripe_events
    └── systemConfig / infra
```

---

## 2. Backend audit — thiếu / thừa / sai / đúng

### Đúng (already OK)

- Hybrid Firestore + Postgres intentional
- Auth session live on Firestore `users`
- Handler library `@paperworking/api` is broad and well-factored (deps injection)
- Architecture docs exist and conflicts resolved
- Stripe / cron / REIL handlers present as library code

### Sai / chưa đúng (still)

| Area | Issue | Priority |
|---|---|---|
| Projects list/detail API | Still **seed**, not Firestore/Postgres | P0 next |
| Membership adapters | Seed in-memory only — **not live Firestore writes yet** | P0 next |
| Embedded `projects.members` | Still in Zod as required field — needs optional/migrate | P1 |
| UI Team/Inbox | Still client seed; not fetching new APIs | P1 |
| `firestore.rules` / indexes | Missing production rules for new collections | P0 |
| Dual seed stores | Marketplace seed vs membership seed need consolidation | P2 |

### Thiếu (backend)

1. Live Firestore repositories for `projectMembers` / `organizationMembers` / `taskAssignments`
2. Security rules using `exists(projectMembers/...)`
3. Composite indexes for membership queries
4. Migration job: embedded members → `projectMembers`
5. Wire `/api/projects` to Firestore (+ membership filter “my projects”)
6. Wire inbox / settings / billing Next routes (handlers exist, web routes mostly missing)
7. Persist `packageShareTokens` via named collection in adapter (handler ready)

### Thừa (do not expand)

- Root `deals` seed collection (use `dealListings`)
- Treating Prisma `User` / `Project` as product SoT
- New competing membership maps on project docs
- Deleting `packageShareTokens` / `support_taxonomy`

### Seed cleanup (optional, not now)

- Root `deals` seed — after feature off
- `demo` — after removing `/demo`

---

## 3. API status (post-fix)

### Newly wired (seed-backed SoT)

| Path | Methods | Collection |
|---|---|---|
| `/api/project-members` | GET, POST | projectMembers |
| `/api/organization-members` | GET, POST | organizationMembers |
| `/api/team/[[...action]]` | GET, POST, PUT, DELETE | organizationMembers |
| `/api/task-assignments` | GET, POST | taskAssignments |
| `/api/tasks/assign` | POST | taskAssignments |
| `/api/messages` | GET, POST | messages + messageThreads |
| `/api/messages/thread/[threadId]` | GET | messages |
| `/api/message-threads` | GET | messageThreads |
| `/api/vendor-services` | GET, POST | vendorServices |
| `/api/deal-invitations` | GET, POST | dealInvitations |
| `/api/investor-followers` | GET, POST | investorFollowers |
| `/api/projects/[id]/sub/[name]` | GET, POST | 4 project subcollections |
| `/api/marketplace/investors/follow` | POST | investorFollowers (updated) |

### Still seed / not live DB

- `/api/projects`, `/api/projects/[id]`, KPIs
- Marketplace listings / vendors / deals list
- Reports / insights / portfolio metrics

### Live (Firebase)

- `/api/auth/session`, `/api/auth/me` (session cookie + users)

### Handlers exist in `@paperworking/api` but **no Next route** yet (examples)

Many cron, plaid, reconciliations, inbox actions, settings, billing, invitations token flows — library ready, web surface incomplete. See `docs/API_CONNECTION_STATUS.md`.

---

## 4. Recommended next engineering steps

1. **Firestore adapters** replace `seed-store` for P0 collections (Admin SDK).
2. **Indexes + rules** for `projectMembers` (`userId+status`, `projectId+role`).
3. Change `/api/projects` list to filter by `projectMembers` for session uid.
4. Point Team UI + Inbox UI at new APIs.
5. Migrate embedded `projects.members` → optional denorm only.
6. Do **not** delete KEEP collections; only clean root `deals`/`demo` after feature off.

---

## 5. Files touched (implementation)

- `packages/validation/src/schemas/*` — P0/P1 schemas + barrel
- `packages/validation/src/schemas/projectSchema.ts` — deprecate embedded member SoT
- `apps/web/lib/membership/seed-store.ts` — P0 seed SoT
- `apps/web/lib/membership/p1-seed-store.ts` — P1 seed SoT
- `apps/web/app/api/**` — new routes listed above
- `docs/FINAL_FIRESTORE_ARCHITECTURE_v1.md` — KEEP packageShare/taxonomy + diagram
- `docs/FIRESTORE_MIGRATION_MATRIX_v1.md` — delete guidance reverted
- `docs/SYSTEM_FIX_AUDIT_2026-08-26.md` — this file

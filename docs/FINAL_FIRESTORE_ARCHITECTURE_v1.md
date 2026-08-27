# FINAL FIRESTORE ARCHITECTURE v1

**Status:** APPROVED architecture decision  
**Scope:** PaperWorking_v1  
**Date:** 2026-08-26  
**Basis:** Full Project Audit (2026-08-25), `docs/role.md`, Zod schemas, Prisma schema, runtime Firestore usage  

**Rules for this document:**
- No implementation code
- No migration scripts
- Decisions only — backed by codebase evidence

---

## 0. Architecture Principles (Approved)

1. **Hybrid persistence is intentional**, not accidental:
   - **Firestore** = product identity, membership, collaboration, marketplace, notifications (UI + real-time + security rules).
   - **Postgres (Prisma)** = REIL analytics engine, banking/Plaid ledger, reconciliation, heavy relational reporting.

2. **One Source of Truth (SoT) per business entity.** Dual storage is allowed only with an explicit mirror role (cache / FK bridge), never as two competing masters.

3. **RBAC requires queryable membership.** Embedded maps alone cannot support `docs/role.md` (list my projects, TEAM_LEAD scopes, ASSIGN).

4. **Lean Firestore project docs.** Heavy REIL/financial depth lives in Postgres `ReilProject` + financial models; Firestore `projects` holds product workspace + denormalized summary.

5. **Legacy Prisma models (`User`, `Project`) are deprecated** for v1 product path. They remain schema artifacts until a later consolidation phase — **not** Firestore SoT.

---

## 1. Conflict Resolutions

### 1.1 `projects.members` vs `projectMembers`

| | |
|---|---|
| **Current implementation** | Zod `projectSchema` embeds `members: Record<uid, { role, projectPermissions, joinedAt }>` on `/projects/{id}`. Prisma also has `ProjectCollaborator` (`OWNER \| PARTNER \| ANALYST \| VIEWER`) on `ReilProject`. UI team uses seed; no live membership queries. |
| **Alternative A** | Keep **only** embedded `projects.members` map. |
| **Alternative B** | Keep **only** top-level `projectMembers` collection. |
| **Alternative C (recommended)** | **`projectMembers` collection = SoT**; keep optional **denormalized summary** on `projects.memberSummary` / `projects.memberCount` for UI badges — not the access authority. |

**Pros of Alternative C**
- Enables indexes: `(userId, status)`, `(projectId, role)` → “my projects”, team directory.
- Supports `TEAM_LEAD` / `TEAM_MEMBER` from `docs/role.md`.
- Cleaner security rules (`exists(/projectMembers/{id})`).
- Avoids rewriting entire project doc on every invite/remove.

**Cons of Alternative C**
- Two writes on invite (member doc + optional project summary).
- Must keep denormalized summary in sync (or drop summary until needed).

**Final recommendation:** **CREATE `projectMembers` as SoT. STOP treating embedded `members` map as authority.**  
Migrate meaning: embedded `members` → deprecated; optional lean `memberCount` / `memberUidsPreview` only if UI needs it.  
Prisma `ProjectCollaborator` = **REIL-engine mirror** (Postgres), not product RBAC SoT — sync from `projectMembers` later if REIL needs collaborators.

**Approved roles on `projectMembers.role`:**
- `OWNER` (Investor project owner — may alias business “INVESTOR” ownership)
- `TEAM_LEAD`
- `TEAM_MEMBER`
- `VENDOR` (project-scoped vendor access when invited to a project task — optional; otherwise vendor access via `taskAssignments` / `vendorRequests` only)

---

### 1.2 `users` vs `AppUser` vs `User`

| | |
|---|---|
| **Current implementation** | Firestore `/users/{uid}` (Zod `userSchema`) is the **only live read** (auth session). Prisma `AppUser` links Firebase uid to REIL/banking FKs. Prisma `User` is legacy marketplace/deal graph. |
| **Alternative A** | Firestore `users` only — drop Postgres user tables. |
| **Alternative B** | Prisma `AppUser` only — drop Firestore profile. |
| **Alternative C (recommended)** | **Firestore `users` = product identity SoT**; **Prisma `AppUser` = FK bridge** (`id` = Firebase uid); **Prisma `User` = REMOVE from v1 architecture** (legacy). |

**Pros of Alternative C**
- Matches runtime today (session reads Firestore).
- Auth/profile/prefs stay next to Firebase Auth.
- Banking/REIL keep relational integrity via `AppUser`.
- Ends triple-representation conflict.

**Cons of Alternative C**
- Must keep `AppUser` row created on signup (eventual consistency).
- Stripe customer id may exist on both until subscriptions decision applied.

**Final recommendation:**
- **KEEP** Firestore `users` (SoT for profile, prefs, accountType, display subscription snapshot).
- **KEEP** Prisma `AppUser` as **bridge only** (id = Firebase uid; minimal fields).
- **REMOVE** Prisma `User` from v1 target architecture (do not wire new features to it).

---

### 1.3 `projects` vs `ReilProject` vs `Project`

| | |
|---|---|
| **Current implementation** | Firestore `projects` = fat product deal doc (100+ fields in Zod). Prisma `ReilProject` = acquisition/fund/hold pipeline. Prisma `Project` = thin legacy deal/message attachment. Web uses seed, not either DB. |
| **Alternative A** | Firestore `projects` only. |
| **Alternative B** | Prisma `ReilProject` only. |
| **Alternative C (recommended)** | **Firestore `projects` = product workspace SoT** (identity, phase summary, ownership, UI workspace); **Prisma `ReilProject` = REIL/analytics SoT** linked by `firestoreProjectId` / shared id; **Prisma `Project` = REMOVE**. |

**Pros of Alternative C**
- UI/dashboard/security rules stay on Firestore.
- Heavy comps, valuations, loans, plaid joins stay relational.
- Prevents mega-document and dual-write chaos on every field.
- Aligns with existing package split (`financial-engine` + Prisma REIL).

**Cons of Alternative C**
- Requires stable ID link between Firestore project and `ReilProject`.
- Some fields currently only on Firestore schema must be classified as “summary denormalization” vs “REIL-only”.

**Final recommendation:**
- **KEEP** Firestore `projects` (lean product SoT).
- **KEEP** Prisma `ReilProject` (+ REIL children) as analytics/pipeline SoT.
- **REMOVE** Prisma `Project` from v1 target architecture.
- Shared key: prefer **same UUID** as both document id and `ReilProject.id`, OR `ReilProject.firestoreProjectId`.

**Firestore `projects` should contain (product):**
- identity, address summary, phase/status, `ownerId`, `organizationId`
- visibility, marketplace flags
- denormalized KPI summary (optional)
- pointers: `reilProjectId` if IDs differ
- **not** full REIL comps/funding graphs (those stay Postgres)

---

### 1.4 `subscriptions` collection vs `users.subscription*` fields

| | |
|---|---|
| **Current implementation** | Docs list top-level `subscriptions`. Zod `userSchema` carries `subscriptionPlan` / `subscriptionStatus`. Prisma `Subscription` mirrors Stripe. Stripe webhook comments update user fields. |
| **Alternative A** | Only fields on `users`. |
| **Alternative B** | Only `subscriptions` collection. |
| **Alternative C (recommended)** | **Firestore `subscriptions` = billing SoT**; **`users` holds denormalized entitlement snapshot** (`subscriptionPlan`, `subscriptionStatus`, `stripeCustomerId`) for fast gates; **Prisma `Subscription` optional analytics mirror** (not product gate SoT). |

**Pros of Alternative C**
- History of plan changes / multiple subscriptions / org billing needs a collection.
- UI/entitlement checks stay O(1) on session `users` doc.
- Stripe webhook idempotency stays in `stripe_events`.

**Cons of Alternative C**
- Dual-write on webhook (subscription doc + user snapshot).
- Must define which field is authoritative for “can access feature?” → **user snapshot**, refreshed from subscription SoT.

**Final recommendation:**
- **CREATE/KEEP** Firestore `subscriptions` as billing history SoT.
- **KEEP** entitlement snapshot fields on `users` (gate cache).
- **Do not** invent a second competing gate source.
- Prisma `Subscription` = optional reporting mirror; not required for product UI.

---

### 1.5 Additional conflicts (resolved briefly)

| Conflict | Final decision |
|---|---|
| `holdRegistry` collection vs field | **Field/map on Firestore project or subdoc** — not a top-level collection. Hold *ledger detail* may live in Postgres `Hold*` models. |
| `stripe_events` vs `billingEvents` | **KEEP `stripe_events` only.** |
| `TEAM_MEMBERS` seed constant vs `TEAM_MEMBER` role | Seed name is UI-only; **canonical role string = `TEAM_MEMBER`**. |
| Inbox `inboxItems` vs `messages` | **Both kept with different purposes:** `inboxItems` = actionable feed; `messages`/`threads` = conversation. |
| Notifications vs inbox | **Both kept:** `notifications` = delivery/events; `inboxItems` = user work queue. |
| Vendor identity | Vendor is `users.accountType = vendor` + marketplace profile fields; **no separate `vendors` Firestore collection required for identity**. Marketplace **service cards** use `vendorServices` or `dealListings` by type. |

---

## 2. Store Split (Approved)

### Firestore — Product SoT

Identity, orgs, membership, collaboration, marketplace surfaces, notifications, billing docs, config.

### Postgres (Prisma) — Engine SoT

`AppUser` (bridge), `ReilProject` + REIL children, Plaid/FinancialTransaction/Reconciliation, `AdminAuditLog` (tamper-evident admin audit may stay Postgres).

### Explicit non-SoT / deprecated for v1 product

- Prisma `User`
- Prisma `Project`
- Embedded `projects.members` as access authority
- Top-level Firestore collection named for REIL-only data that already has Prisma models

---

## 3. FINAL COLLECTIONS TO KEEP

*(Firestore unless marked Postgres)*

| Collection | SoT role | Notes |
|---|---|---|
| **users** | Product identity | Profile, prefs, accountType, entitlement snapshot |
| **organizations** | Multi-tenant org | |
| **organizationMembers** | Org membership | Queryable; do not rely only on embedded org.members |
| **projects** | Product project workspace | Lean doc; link to ReilProject |
| **projectMembers** | **Product RBAC membership SoT** | TEAM_LEAD / TEAM_MEMBER / OWNER |
| **projects/{id}/vendorRequests** | Vendor request workflow | Subcollection |
| **projects/{id}/commitments** | Investment commitments | Subcollection |
| **projects/{id}/activityLog** | Project activity trail | Subcollection |
| **projects/{id}/phaseSnapshots** | Wizard/UI phase snapshots | Subcollection (product) |
| **inboxItems** | Actionable inbox feed | |
| **notifications** | Notification delivery records | |
| **messageThreads** | Conversation threads | Prefer this name over vague `messages` alone |
| **messages** | Thread messages | Child of thread or top-level with `threadId` |
| **taskAssignments** | Task assignment SoT | ASSIGN scope |
| **dataCompletionTasks** | Outreach/data tasks | Keep if product still uses this engine |
| **projectFolders** | Document cabinet folders | |
| **projectFiles** | Document cabinet files | + Firebase Storage |
| **propertyMetricSnapshots** | Cached metrics for UI/history | Computed by financial-engine |
| **dealListings** | Public/marketplace deal listings | |
| **dealInvitations** | Invite tokens / status | |
| **investorFollowers** | Follow graph | Flat doc id OK |
| **subscriptions** | Billing history SoT | |
| **stripe_events** | Stripe webhook idempotency | Server-only |
| **systemConfig** | Platform config docs | e.g. attorneyStates, lender config |
| **verification_codes** | Admin OTP | Server-only |
| **queued_emails** | Email outbox | Server-only |
| **packageShareTokens** | Lender/investor package share links | **KEEP** — feature collection (packages/share handlers) |
| **support_taxonomy** | Support CMS taxonomy | **KEEP** — feature/content collection (do not delete) |
| **AppUser** *(Postgres)* | FK bridge | id = Firebase uid |
| **ReilProject + REIL children** *(Postgres)* | REIL pipeline SoT | |
| **FinancialTransaction / Plaid\*** *(Postgres)* | Banking SoT | |
| **AdminAuditLog** *(Postgres)* | Tamper-evident admin audit | Prefer Postgres over Firestore for audit |

---

## 4. FINAL COLLECTIONS TO REMOVE

*(From v1 **target architecture** — do not design new features against these)*

| Item | Why remove |
|---|---|
| **Prisma `User` as product entity** | Legacy; overlaps Firestore `users` + `AppUser` |
| **Prisma `Project` as product entity** | Legacy thin model; overlaps Firestore `projects` + `ReilProject` |
| **Embedded `projects.members` as RBAC SoT** | Cannot query; conflicts with `projectMembers` |
| **`billingEvents` collection** | Explicitly rejected by `stripeEventSchema` |
| **Top-level `holdRegistry` collection** | Use project field / Postgres Hold\* instead |
| **Duplicate top-level `vendors` identity collection** | Vendor = `users` with `accountType=vendor` (+ `vendorServices` for offerings) |
| **`gate_events` as required product collection** | Telemetry-only; optional analytics sink — not core architecture |
| **`operatorQueue` as required product collection** | Ops tooling; not core customer SoT — keep only if admin ops productized |

---

## 5. FINAL COLLECTIONS TO MERGE

| Merge | Into | Rule |
|---|---|---|
| Prisma `User` profile fields | Firestore **users** | Identity SoT |
| Prisma `User` FK needs | Postgres **AppUser** | Bridge only |
| Prisma `Project` fields used by UI | Firestore **projects** | Product SoT |
| Prisma `Project` pipeline fields | Postgres **ReilProject** | Engine SoT |
| Embedded `projects.members` | **projectMembers** | Membership SoT |
| Org embedded members (if any) | **organizationMembers** | Org membership SoT |
| Competing subscription gates | **subscriptions** (history) + **users.*** snapshot (gate) | Dual-write with clear authority |
| Admin audit Firestore variants | Postgres **AdminAuditLog** | Single audit SoT |
| Marketplace “vendor profile” duplicates | **users** (+ optional vendor profile fields) | One identity |

---

## 6. FINAL COLLECTIONS TO CREATE

*(Missing for production RBAC / product loops — must exist in approved architecture)*

| Collection | Why create |
|---|---|
| **projectMembers** | Required for TEAM_LEAD/TEAM_MEMBER and “my projects” queries |
| **organizationMembers** | Required for org-scoped team (if orgs are multi-member) |
| **taskAssignments** | Required for ASSIGN scope + vendor task inbox |
| **subscriptions** | Required billing history SoT (user fields alone insufficient) |
| **messageThreads** (+ **messages**) | Required if messaging is product; distinct from inboxItems |
| **vendorServices** | Required if vendors list services separately from dealListings |
| **permissions** *or* **roleBindings** | Required only if dynamic RBAC beyond fixed role matrix; otherwise encode matrix in code + rules |
| **firestore.rules** | Required artifact (not a collection, but mandatory architecture component) |
| **firestore.indexes.json** | Required artifact for composite queries |
| **Firebase Storage rules** | Required for documents/receipts |

**Optional create (productize later):**
- `comments` (if threaded comments leave `activityLog` / deal-updates)
- `generatedReports` / `taxReports` (if export history must persist)
- `gate_events`, `operatorQueue` (ops/telemetry — not blocking core RBAC)

---

## 7. Approved Role Model (aligned to architecture)

| Layer | Values | Storage |
|---|---|---|
| **System role** | `MASTER_ADMIN` → `users.accountType = admin` | Firestore `users` |
| **Customer role** | `INVESTOR` → `accountType = investor`; `VENDOR` → `accountType = vendor` | Firestore `users` |
| **Org role** | Lead Investor / Admin (org) | `organizationMembers.role` |
| **Project role** | `OWNER`, `TEAM_LEAD`, `TEAM_MEMBER`, (`VENDOR` scoped) | **`projectMembers.role`** |
| **Account tier `investment_team`** | Signup tier meaning “can be invited as team” | `users.accountType` may retain `investment_team` **or** collapse to investor+membership — **approved default: keep `investment_team` as entitlement tier; project authority always from `projectMembers`** |

---

## 8. Security Rules Impact (architecture-level)

Access decisions must use:

1. `users/{uid}.accountType` for system/customer tier  
2. `projectMembers` for PROJECT / MEMBER / ASSIGN prep  
3. `taskAssignments` / `vendorRequests` for VENDOR scoped access  
4. `subscriptions` → refresh → `users` snapshot for entitlement gates  

**Vendors never receive blanket `projects` read.**

---

## 9. Final Architecture Diagram (logical)

```
Firebase Auth
    │
    ▼
Firestore users ──────── entitlement snapshot ──► gates UI/API
    │
    ├── organizationMembers ──► organizations
    │
    ├── projectMembers ──► projects (lean product SoT)
    │                         │
    │                         ├── vendorRequests
    │                         ├── commitments
    │                         ├── activityLog
    │                         └── phaseSnapshots
    │                         │
    │                         └── link ──► Postgres ReilProject (engine SoT)
    │
    ├── taskAssignments
    ├── inboxItems / notifications
    ├── messageThreads / messages
    ├── projectFolders / projectFiles (+ Storage)
    ├── dealListings / dealInvitations / investorFollowers
    ├── vendorServices
    ├── packageShareTokens
    ├── support_taxonomy
    ├── subscriptions + stripe_events
    └── systemConfig

Postgres AppUser (id = uid) ──► Plaid / FinancialTransaction / Reconciliation
Postgres AdminAuditLog
```

---

## 10. Decision Log (locked)

| # | Decision | Approved choice |
|---|---|---|
| D1 | Membership | **`projectMembers` SoT**; embedded members deprecated |
| D2 | User identity | **Firestore `users` SoT**; **AppUser bridge**; **Prisma User removed** |
| D3 | Project entity | **Firestore `projects` product SoT**; **ReilProject engine SoT**; **Prisma Project removed** |
| D4 | Billing | **`subscriptions` SoT** + **users snapshot cache** |
| D5 | Audit | **Postgres AdminAuditLog** preferred |
| D6 | Stripe idempotency | **`stripe_events` only** |
| D7 | Hold registry | **Not a top-level collection** |
| D8 | Vendor identity | **users.accountType=vendor**; services via **vendorServices** / listings |

---

## 11. Out of Scope (explicit)

- Implementation code  
- Data migration scripts  
- Dual-write job design details  
- Full firestore.rules source text  

Those follow only after this architecture is accepted as the build contract.

---

**END — FINAL FIRESTORE ARCHITECTURE v1**

# FIRESTORE × RELATIONAL MIGRATION MATRIX v1

**Date:** 2026-08-26  
**Inputs:**
- Production Firestore screenshots (Firebase Console — `(default)` DB)
- `FINAL_FIRESTORE_ARCHITECTURE_v1.md`
- `FIRESTORE_COLLECTION_BLUEPRINT_v1.md`
- Code scan: `PaperWorking` (v0 production app) + `PaperWorking_v1`

**Important clarification (STEP 1):**  
The two attached screenshots are **Firestore Console collection lists**, not Supabase table browsers.  
There is **no Supabase schema / migration / client** in this monorepo (only generic skill mentions).  

For the “previous relational tables” axis, this report uses **Prisma models** in `packages/database/prisma/schema.prisma` (66 models) — the v1 relational inventory that historically maps to Postgres/Neon (and any prior Supabase-hosted Postgres). If you have separate Supabase screenshots, attach them and this matrix can be amended.

---

## STEP 1 — Relational / “Supabase-era” entities (from Prisma)

Extracted `model` names (66):

| Domain | Models |
|---|---|
| Identity | `AppUser`, `User`, `UserNotificationPreferences` |
| Projects / REIL | `ReilProject`, `ReilPropertyFacts`, `ReilComp`, `ReilValuationSnapshot`, `ReilPurchaseTerms`, `StatusEvent`, `ProjectCollaborator`, `FieldAssignment`, `Project` (legacy) |
| Fund / Closing | `ReilFundingPlan`, `ReilCapitalSource`, `ReilEquityParty`, `ReilLoanRecord`, `ReilContributionEntry`, `ReilTitleHolding`, `ReilClosingMilestone`, `ReilClosingRecord` |
| Hold | `HoldCostRecord`, `HoldRehabSpend`, `HoldValueEntry` |
| Banking | `BankConnection`, `BankAccount`, `Transaction`, `MortgageLiability`, `PlaidConnection`, `PlaidConsentEvent`, `PlaidRawTransaction`, `PlaidLiability`, `FinancialTransaction`, `TransactionRule`, `TransactionSplit`, `PlaidWebhookEvent`, `ReconciliationPeriod`, `ReconciliationItem` |
| Rehab / Vendor | `RehabProject`, `RehabMilestone`, `Vendor`, `VendorBid`, `RehabInvoice`, `ChangeOrder`, `RehabDocument` |
| Marketplace / Deal | `Deal`, `DealBroadcast`, `DealInvitation`, `InvestmentCommitment`, `DealMessage`, `BusinessCard`, `MarketplaceListing`, `Message`, `Subscription` |
| MLS | `Property`, `Member`, `Office`, `BridgeSyncState` |
| Ops | `DealFinancials`, `PayoutWaterfall`, `PhaseTransition`, `CommunicationLog`, `EmailLog`, `SentEmailLog`, `JobRecord`, `SourcingLead`, `AdminAuditLog` |

---

## STEP 1b — Production Firestore collections (from screenshots)

**27 root collections observed:**

`auditLogs`, `dealActivityTimeline`, `dealListings`, `deals`, `demo`, `events`, `geocodedAddresses`, `inboxItems`, `messages`, `notifications`, `organizations`, `packageShareTokens`, `projectFiles`, `projectFolders`, `projects`, `queued_emails`, `rentcastCallLogs`, `search_telemetry`, `securityEvents`, `stripe_events`, `subscriptions`, `support_taxonomy`, `systemConfig`, `telemetry_events`, `users`, `vendorCache`, `waitlist`

---

## STEP 2 — Code usage method

Searched in `PaperWorking` + `PaperWorking_v1` for:
- `.collection('…')` / `collection(db, '…')` / `doc(db, '…')`
- String constants bound to collection names (e.g. `CACHE_COLLECTION = 'vendorCache'`)

**Note:** v1 almost never hits Firestore except `users` / `projects` repos. **Usage counts below are dominated by v0 (`PaperWorking`).**

---

## STEP 3 — Comparison matrix

| Entity | Relational (Prisma) | Firestore Current | Blueprint | Status |
|---|---|---|---|---|
| User identity | `AppUser` + legacy `User` | `users` | `users` | **KEEP** (`users`); MERGE Prisma `User`→deprecate |
| Organization | — (embedded concepts) | `organizations` | `organizations` | **KEEP** |
| Org membership | — | *(embedded `teamMembers` on org)* | `organizationMembers` | **MISSING** (create) / SPLIT from embedded |
| Project (product) | legacy `Project` | `projects` | `projects` (lean) | **KEEP** + lean/migrate fat fields |
| Project (REIL engine) | `ReilProject` + children | — | *(Postgres SoT)* | **KEEP** relational; not Firestore |
| Project membership | `ProjectCollaborator` | embedded `projects.members` | `projectMembers` | **MISSING** / SPLIT from embedded |
| Vendor requests | — / rehab bids overlap | *(often subcollection; not in screenshot roots)* | `projects/{id}/vendorRequests` | **MISSING** at root; **KEEP** as subcollection |
| Commitments | `InvestmentCommitment` | *(subcollection in code)* | `projects/{id}/commitments` | **MIGRATE** relational↔FS as needed |
| Activity log | `PhaseTransition`, logs | `dealActivityTimeline` + code `activityLog` | `projects/{id}/activityLog` | **MERGE** `dealActivityTimeline`→`activityLog` |
| Phase snapshots | REIL status events | — | `phaseSnapshots` | **MISSING** |
| Inbox | — | `inboxItems` | `inboxItems` | **KEEP** |
| Notifications | `UserNotificationPreferences` | `notifications` | `notifications` | **KEEP** |
| Messages | `Message`, `DealMessage` | `messages` *(also `projects/{id}/messages` in code)* | `messageThreads` + `messages` | **SPLIT** / RENAME pattern |
| Tasks | `FieldAssignment` (partial) | — | `taskAssignments` | **MISSING** |
| Project folders | `RehabDocument` (partial) | `projectFolders` | `projectFolders` | **KEEP** |
| Project files | — | `projectFiles` | `projectFiles` | **KEEP** |
| Deal listings | `MarketplaceListing` / `Deal` | `dealListings` | `dealListings` | **KEEP** |
| Deal invitations | `DealInvitation` | *(code uses `dealInvitations`)* | `dealInvitations` | **MISSING** in screenshot / **KEEP** in blueprint |
| Investor followers | — | *(code `investorFollowers` / `followers`)* | `investorFollowers` | **MISSING** in screenshot |
| Subscriptions | `Subscription` | `subscriptions` *(empty usage)* | `subscriptions` | **KEEP** (adopt as SoT) + user snapshot |
| Vendor services | `Vendor` | — | `vendorServices` | **MISSING** |
| Stripe idempotency | — | `stripe_events` | companion (arch) | **KEEP** |
| System config | — | `systemConfig` | companion | **KEEP** |
| Email queue | `EmailLog` / `SentEmailLog` | `queued_emails` | companion | **KEEP** |
| Admin audit | `AdminAuditLog` | `auditLogs` | Prefer Postgres audit | **MERGE**/dual → Postgres preferred |
| Waitlist | — | `waitlist` | — | **KEEP** (marketing) or later deprecate |
| Demo seed | — | `demo` | — | **DEPRECATED** (dev/demo only) |
| Analytics events | — | `events` | — | **KEEP** (product analytics) or merge telemetry |
| Geocode cache | — | `geocodedAddresses` | — | **KEEP** (infra cache) |
| RentCast logs | — | `rentcastCallLogs` | — | **KEEP** (ops) |
| Vendor API cache | — | `vendorCache` | — | **KEEP** (infra cache) |
| Search telemetry | — | `search_telemetry` | — | **KEEP** (analytics) |
| Telemetry events | — | `telemetry_events` | — | **KEEP** / MERGE with `events` |
| Security events | — | `securityEvents` | — | **KEEP** (auth security) |
| Support taxonomy | — | `support_taxonomy` | — | **KEEP** (feature/content — do not delete) |
| Package share tokens | — | `packageShareTokens` | — | **KEEP** (packages/share feature — do not delete) |
| Root `deals` | `Deal` | `deals` | use `dealListings` | **DEPRECATED** (unused FS collection) |

---

## STEP 4 — Existing Firestore collection usage

Usage counted in **`PaperWorking` (v0)** unless noted. Pages/APIs/services are representative paths.

| Collection | Usage Count* | Pages / UI | APIs / Actions | Services / Lib | Status |
|---|---|---|---|---|---|
| `users` | ~240+ | Auth, settings, admin, many dashboards | session, team, stripe webhook, GDPR, admin | auth, permissions | **KEEP** |
| `projects` | ~380+ | project workspace, listings, maps | projects/*, documents, KPIs, cron | firebase deals/projects services | **KEEP** (lean) |
| `organizations` | ~47 | team settings, admin | team APIs, invitations | team helpers | **KEEP** |
| `notifications` | ~25 | inbox/header consumers | notification routes, rules tests | notification writers | **KEEP** |
| `dealListings` | ~19–57 | `/deals/[id]`, marketplace, sitemap | listings actions, publish | deal state machine | **KEEP** |
| `projectFiles` | ~17–30 | document vault UI | documents upload/download APIs | foldersService | **KEEP** |
| `inboxItems` | ~13–16 | inbox UI | `/api/inbox`, backfill | inbox writers | **KEEP** |
| `projectFolders` | ~12–21 | document vault | documents + lender-package APIs | foldersService | **KEEP** |
| `queued_emails` | ~12 | — | cron invites, GDPR | email queue | **KEEP** |
| `systemConfig` | ~5–7 | lender UI (phase-2) | admin lender-rates/checklists, lender-package | config readers | **KEEP** |
| `stripe_events` | ~5–8 | — | `/api/stripe/webhook` | stripe idempotency | **KEEP** |
| `auditLogs` | ~3–5 | dashboard feed | `/api/dashboard`, `actions/team` | — | **KEEP**/MERGE→Postgres |
| `dealActivityTimeline` | ~3–6 | investor timeline UI | `/api/.../timeline`, investor timeline | `activityTimeline.ts` | **MERGE**→`activityLog` |
| `messages` | ~3–10 | MessageBoard, GlobalInbox | email-notification cron (collectionGroup) | project subcollection pattern | **SPLIT**→threads+messages |
| `waitlist` | ~3 | marketing waitlist | `/api/waitlist` | — | **KEEP** (marketing) |
| `demo` | ~2–6 | `/demo` | seed script | — | **DEPRECATED** |
| `rentcastCallLogs` | 2 | admin rentcast usage | `/api/admin/rentcast-usage` | rentcast/cache.ts | **KEEP** |
| `search_telemetry` | 3+ (const) | search UX (indirect) | `actions/telemetry.ts` | — | **KEEP** |
| `telemetry_events` | 4+ (const) | — | `actions/telemetry.ts` | — | **KEEP**/MERGE `events` |
| `events` | ~1–4 | — | `/api/events` | — | **KEEP**/MERGE telemetry |
| `securityEvents` | ~1–2 | — | — | `lib/auth/telemetry.ts` | **KEEP** |
| `geocodedAddresses` | 1 | — | — | `lib/providers/geocode.ts` | **KEEP** |
| `vendorCache` | 1 (const) | — | — | `rentcast/cache.ts` | **KEEP** |
| `subscriptions` | 0 live FS ops** | Admin nav label only | — | billing uses **`users` fields** | **KEEP** (blueprint SoT — adopt) |
| `deals` | 0 FS ops | UI tab strings only | deals pages use **`dealListings`** | — | **DEPRECATED** |
| `packageShareTokens` | present | packages/share | feature | — | **KEEP** |
| `support_taxonomy` | present | support CMS | feature | — | **KEEP** |

\*Approximate string/collection-call mentions in v0.  
\*\*`subscriptions` collection exists in prod but **no** `.collection('subscriptions')` write/read found; entitlement lives on `users`.

### v1 note
`PaperWorking_v1` runtime Firestore: essentially **`users`** (auth session) + unused **`projects` repository**. Blueprint collections are **target**, not current v1 wiring.

---

## STEP 5 — SAFE TO DELETE

**Rule applied:** only if code analysis finds **no** collection references (including constants), no API, no page, no service.

| Collection | Evidence | Verdict |
|---|---|---|
| `packageShareTokens` | Feature collection for lender/investor package share links (`apps/api` packages/share) | **KEEP — DO NOT DELETE** |
| `support_taxonomy` | Support CMS taxonomy content (may have console data) | **KEEP — DO NOT DELETE** |
| `deals` (root collection) | No Firestore `.collection('deals')`; product uses `dealListings`; UI “deals” is a tab label | **SAFE TO DELETE** as empty/unused root collection **if** console confirms no docs needed |

**NOT safe to delete (even if “looks unused”):**
- `subscriptions` — unused today but **blueprint SoT**; adopt, don’t delete
- `demo` — referenced by `/demo` + seed script (dev) → deprecate after removing demo routes
- `vendorCache`, `search_telemetry`, `telemetry_events` — used via constants
- Anything with Admin/cron writers

**External caveat:** Cloud Functions, old scripts, or other repos not in this workspace could still reference collections. Backup before delete.

---

## STEP 6 — MIGRATION REQUIRED

### 6.1 Structural migrations (Firestore → Blueprint)

| Current | → Target | Field mapping (high level) |
|---|---|---|
| `projects.members` map | `projectMembers/{projectId}_{userId}` | `uid`→`userId`; `role` map Lead Investor/etc → `OWNER`/`TEAM_LEAD`/`TEAM_MEMBER`/`VENDOR`; `joinedAt`→`invitedAt`/`acceptedAt`; add `organizationId`, `status=active` |
| `organizations.teamMembers[]` | `organizationMembers` | member.uid→`userId`; email/displayName/role/status/invitedAt; add `organizationId` |
| `dealActivityTimeline` | `projects/{projectId}/activityLog/{id}` | copy actor/action/summary/timestamps; ensure `projectId` on every event |
| Top-level / ambiguous `messages` | `messageThreads` + `messages` | Build thread from participants; move body→`messages.body`; set `threadId` |
| `projects/{id}/messages` (actual v0 pattern) | same blueprint pair | Prefer migrate subcollection messages into top-level `messages` **or** keep project-scoped threads with `type=project` |
| User `subscriptionPlan/Status` only | `subscriptions` + keep user snapshot | Create subscription doc from Stripe ids on user; keep snapshot fields in sync |
| Fat `projects` financial blobs | lean `projects` + Postgres `ReilProject` | Keep identity/phase/address/owner; move deep financials/REIL to Prisma |
| Prisma `Deal` / `MarketplaceListing` | `dealListings` | id/title/status/owner mapping; slug generation |
| Prisma `DealInvitation` | `dealInvitations` | token/status/email/inviter |
| Prisma `InvestmentCommitment` | `projects/{id}/commitments` | amount/status/investor |
| Prisma `Message` | `messageThreads`/`messages` | threadId/participants/body |
| Prisma `Subscription` | `subscriptions` | stripe ids/plan/status |
| Prisma `AdminAuditLog` | prefer Postgres; optional freeze `auditLogs` | stop new FS audit writes once Postgres wired |
| Prisma `Vendor` | `users` (vendor) + `vendorServices` | identity on users; offerings on vendorServices |
| `followers` / ad-hoc follow docs | `investorFollowers/{follower}_{target}` | normalize composite IDs |

### 6.2 Companion collections (keep; not blueprint core list)

No destructive migration — classify as **infra/ops KEEP**:
`queued_emails`, `stripe_events`, `systemConfig`, `geocodedAddresses`, `vendorCache`, `rentcastCallLogs`, `securityEvents`, `search_telemetry`, `telemetry_events`, `events`, `waitlist`

---

## STEP 7 — Final report

### KEEP AS IS
`users`, `organizations`, `projects` (then lean), `inboxItems`, `notifications`, `projectFolders`, `projectFiles`, `dealListings`, `queued_emails`, `stripe_events`, `systemConfig`, `geocodedAddresses`, `vendorCache`, `rentcastCallLogs`, `securityEvents`, `search_telemetry`, `telemetry_events`, `events`, `waitlist`

### MERGE
| From | Into |
|---|---|
| `dealActivityTimeline` | `projects/{id}/activityLog` |
| Prisma legacy `User` | Firestore `users` (+ `AppUser` bridge) |
| Prisma legacy `Project` | Firestore `projects` + `ReilProject` |
| Possibly `events` ↔ `telemetry_events` | single analytics taxonomy (optional cleanup) |
| `auditLogs` (long-term) | Postgres `AdminAuditLog` |

### RENAME / SPLIT
| Current | Action |
|---|---|
| Project chat `projects/{id}/messages` | **SPLIT** into `messageThreads` + `messages` |
| Embedded members | **SPLIT** to `projectMembers` / `organizationMembers` |
| Root name `deals` | **Do not use** — product name is `dealListings` |

### MIGRATE (create / adopt)
`projectMembers`, `organizationMembers`, `taskAssignments`, `vendorServices`, `dealInvitations` (if missing in prod), `investorFollowers`, `subscriptions` (start writing), `projects/{id}/vendorRequests`, `commitments`, `phaseSnapshots`, lean `projects` ↔ `ReilProject` link

### DELETE (only after feature off + backup — never touch KEEP features)
1. ~~`packageShareTokens`~~ → **REVERTED: KEEP** (feature)  
2. ~~`support_taxonomy`~~ → **REVERTED: KEEP** (feature/content)  
3. **`deals`** (root Firestore collection seed) — superseded by `dealListings`; clean seed only after confirming no real deals  

**Conditional later (not now):** `demo` — after removing `/demo` + `scripts/seed-demo.ts`.

---

## Summary counts

| Bucket | Count |
|---|---|
| Production FS collections observed | 27 |
| Blueprint product collections | 21 |
| Relational Prisma models | 66 |
| Safe to delete (proven unused) | **3** |
| Must create (blueprint missing in prod) | `organizationMembers`, `projectMembers`, `taskAssignments`, `vendorServices`, (+ subcollections / invitations/followers if absent) |

---

## Decision blockers before destructive ops

1. **Do not delete** `packageShareTokens` or `support_taxonomy` (KEEP features).  
2. Confirm `deals` collection document count in console (delete only if empty or archived).  
3. Provide actual **Supabase** screenshots if different from Prisma — matrix axis A will be updated.

---

**END — Migration Matrix Report**

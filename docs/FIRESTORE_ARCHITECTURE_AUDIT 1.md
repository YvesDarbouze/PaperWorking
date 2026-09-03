Full Project Audit & Firestore Architecture Review — PaperWorking_v1
Scope: /PaperWorking_v1 (monorepo)
Evidence base: 52 pages, 28 wired Next API routes, ~201 handlers in apps/api, 66 Prisma models, 11 Zod Firestore schemas, 3 runtime Firestore read sites
Date: 2026-08-25

Executive finding (read this first)
PaperWorking_v1 is not a production Firestore-backed app yet. It is a UI + handler migration shell:

Layer	Status
UI (52 pages)
Mostly built with seed data
API handlers (apps/api)
~201 handlers exist
Next adapters (apps/web/app/api)
28 routes wired; almost all inject seed
Firestore runtime
Only users read on auth session (when creds exist)
Prisma/Postgres
Schema copied; not wired to web/api at runtime
RBAC in code
accountType + platform roles — not TEAM_LEAD / TEAM_MEMBER from docs/role.md
Firestore rules/indexes
Not in v1 repo (referenced in docs only)
Step 1 — Business Domain Map
Domain Modules
Module	Purpose	Owner (business)	Key relationships	Data dependencies
Auth & Identity
Login, session, 2FA, password
All users
→ users
Firebase Auth + Firestore users
Investor Portfolio
Command center, KPIs, pipeline
INVESTOR
→ Projects, Metrics, Inbox
projects, propertyMetricSnapshots, portfolio aggregates
Projects (REIL lifecycle)
Acquisition → Fund → Hold → Exit
INVESTOR (owner)
→ Team, Tasks, Docs, Financials
projects (+ subcollections), Prisma ReilProject
Project Workspace
Per-deal workspace: docs, insights, scorecard, reports
Project members
→ Project, Documents, KPIs
projects, projectFiles, metrics engine
Deals / Crowdfunding
Deal marketplace, invitations, commitments
INVESTOR / TEAM
→ Project, Investors
dealListings, dealInvitations, InvestmentCommitment
Vendor Marketplace
Find vendors, request services
INVESTOR + VENDOR
→ Project, VendorRequests
vendors, projects/vendorRequests
Vendor Portal
Vendor profile, inbound requests
VENDOR
→ Tasks, Requests
users, vendor requests
Inbox / Notifications
Universal feed, alerts
All authenticated
→ Project, Deal, Task events
inboxItems, notifications
Team Directory
Org/project team management
INVESTOR / TEAM_LEAD
→ Organization, ProjectMember
organizations, projectMembers (proposed)
Tasks
Assign, complete, vendor tasks
TEAM_LEAD / VENDOR
→ Project, User
taskAssignments, dataCompletionTasks
Documents
Filing cabinet, lender package
Project members
→ Project, Storage
projectFolders, projectFiles, Firebase Storage
Financial / Banking
Plaid, transactions, reconciliation
INVESTOR / TEAM
→ Project ledger
Prisma financial models + ledgerItems
Reports & Tax
Portfolio/project reports, tax export
INVESTOR
→ Transactions, Metrics
Generated reports + propertyMetricSnapshots
Insights / Metrics
33-metric engine, scorecard
INVESTOR
→ Project financials
@paperworking/financial-engine
Settings / Billing
Profile, subscription, Stripe
All customers
→ User, Org
users, subscriptions, stripe_events
Admin (MASTER_ADMIN)
Users, tickets, audit, marketplace ops
admin accountType
→ All resources
AdminAuditLog, admin config docs
Marketing / Support
Landing, pricing, help, glossary
Public
—
CMS/seed (support-cms-data.ts)
Integrations
Bridge MLS, Google Drive, eSign, calendar
System + user OAuth
→ Project, Property
Prisma Bridge models, webhooks
REIL Engine
Listing enrichment, closing ledger
INVESTOR / TEAM
→ ReilProject
Prisma REIL models
Comments / Activity
Audit trail, deal updates
Project members
→ Project
activityLog subcollection
Chatbot (demo)
Local demo assistant
All
—
localStorage only
Page → Domain mapping (evidence)
Area	Routes	Domain
Marketing (13)
/, /pricing, /support/*
Marketing
Auth (6)
/login, /signup, /auth/action
Auth
Dashboard (16)
/dashboard/*, /projects/*
Portfolio, Projects, Inbox, Team, Settings
Admin (9)
/admin/*
Admin
Vendor portal (2)
/vendor-portal/*
Vendor
Project workspace (5)
/project/[id]/*
Project deep-dive
Deals (1 public)
/deals/[slug]
Deals
Step 2 — Existing Firestore Usage
Runtime Firestore calls (actual code — not docs)
File	Operation	Collection
apps/web/lib/firebase/admin.ts
.collection('users').doc(uid).get()
users
packages/database/.../user.repository.ts
.collection('users').doc(uid).get()
users
packages/database/.../project.repository.ts
.collection('projects').doc(id).get()
projects
Not found in v1 source:

Client SDK: getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, onSnapshot
Any write operations at runtime in v1
firestore.rules, firestore.indexes.json in repo
Documented collections (validation schemas — designed, not wired)
Collection / path	Schema file	Used at runtime?
/users/{uid}
userSchema.ts
YES (auth profile read)
/projects/{projectId}
projectSchema.ts
Repo only (not wired to web routes)
/organizations/{orgId}
organizationSchema.ts
NO
/projects/{id}/vendorRequests/{id}
vendorRequestSchema.ts
NO
/inboxItems/{id}
inboxItemSchema.ts
NO
/notifications/{id}
notificationSchema.ts
NO
/projectFolders/{id}, /projectFiles/{id}
projectDocumentSchema.ts
NO
/propertyMetricSnapshots/{id}
propertyMetricSnapshotSchema.ts
NO
/dataCompletionTasks/{id}
dataCompletionTaskSchema.ts
NO
/stripe_events/{id}
stripeEventSchema.ts
NO
Documented in docs/DATABASE_MAP.md (v0 reference — not v1 runtime)
Top-level: dealListings, dealInvitations, queued_emails, subscriptions, verification_codes, gate_events, operatorQueue, taskAssignments, investorFollowers

Project subcollections: ledgerItems, phaseSnapshots, vendorRequests, commitments, activityLog, privateFinancials/summary

Special doc path: systemConfig/attorneyStates (constant in api, returns seed in v1)

Duplicate / inconsistent naming (evidence)
Issue	Evidence
User ×3
Firestore users, Prisma AppUser, Prisma User
Project ×3
Firestore projects, Prisma ReilProject, Prisma Project
Members embedded vs collection
projectSchema.members map (Zod) vs docs/role.md proposes ProjectMember collection vs Prisma ProjectCollaborator
Subscriptions
Top-level subscriptions collection (docs) vs users.subscriptionPlan/Status (Stripe webhook comments)
holdRegistry
Documented as collection vs embedded field on project
stripe_events vs billingEvents
Schema explicitly says use stripe_events NOT billingEvents
TEAM_MEMBERS
Seed constant name in UI ≠ RBAC role TEAM_MEMBER
Unused / missing at runtime
Unused in v1: ~95% of documented Firestore collections (handlers exist but no DB wiring)
Missing for production: Security rules, composite indexes, write adapters, membership queries
Step 3 — Requirements vs Current Database
Authorization model (your source of truth vs code)
Concept	Required (docs/role.md)	Implemented in v1 code
MASTER_ADMIN
System scope, all resources
accountType: 'admin' in packages/shared/src/rbac/account-types.ts
INVESTOR
Owns projects, portfolio
accountType: 'investor'
TEAM_LEAD / TEAM_MEMBER
Project-scoped membership
MISSING — only in docs/role.md, not in schemas/handlers
VENDOR
Marketplace + assigned tasks
accountType: 'vendor' + role: 'Vendor'
Project membership
ProjectMember collection
Embedded projects.members map in Zod; Prisma ProjectCollaborator with OWNER|PARTNER|ANALYST|VIEWER
RBAC scopes (SYSTEM/OWN/MEMBER/ASSIGNED/PROJECT/MARKETPLACE)
Full matrix
Partial — injected verifyAccess in handlers; not wired in web
Task assignment
ASSIGN scope
Handler tasks/assign blocks investor; no DB persistence
Audit logs
AUDIT_LOG resource
Prisma AdminAuditLog exists; no Firestore collection wired
Resource support matrix
Resource	UI exists	Handler exists	Firestore/DB wired	Supports RBAC model?
PROJECT
✅
✅ (28 handlers)
❌ seed
NO — no membership queries
PROJECT_DATA
✅ (workspace)
✅
❌ seed
NO
TEAM
✅ (seed UI)
✅ (1 handler)
❌
NO — no projectMembers collection
TASK
Partial
✅
❌
NO
DEAL
✅
✅
❌ seed
NO
VENDOR
✅
✅
❌ seed
NO
PORTFOLIO
✅
✅
❌ seed
NO
REPORT
✅
✅
❌ partial
NO
TAX_REPORT
Partial
✅ (tax/*)
❌
NO
METRICS
✅
✅
❌ seed
NO
DOCUMENT
✅
✅
❌
NO
COMMENT
Partial (deal updates)
✅
❌
NO
NOTIFICATION
✅ (seed)
✅
❌
NO
INBOX
✅ (seed)
✅
❌
NO
AUDIT_LOG
✅ (admin UI seed)
Partial
❌
NO
SUBSCRIPTION
✅ (settings preview)
✅ (stripe/billing)
Partial (users fields only)
PARTIAL
Verdict: Current Firestore design cannot support production RBAC as specified in docs/role.md. Only auth profile read works live.

Step 4 — Complete Collection Inventory
Collection	Purpose	Owner	Relationships	Required fields (core)	Indexes needed	Security impact
users
Profile, prefs, subscription snapshot
User (self) / Admin
→ orgs, projects via membership
uid, email, accountType, role, subscriptionPlan
—
HIGH — PII
organizations
Multi-tenant org
Lead Investor
→ members, projects
id, name, members[]
members.userId
HIGH
organizationMembers
Org-level membership
Org admin
org ↔ user
orgId, userId, role, status
(orgId, userId)
HIGH
projects
Primary deal document
Investor (ownerId)
→ members, financials, subcols
id, ownerId, members, phase, financials
ownerId, organizationId
CRITICAL
projectMembers
MISSING - REQUIRED
Investor / Team Lead
project ↔ user
projectId, userId, role: TEAM_LEAD|TEAM_MEMBER, status
(projectId, userId), (userId, status)
CRITICAL for RBAC
projects/{id}/vendorRequests
Vendor task requests
Project + Vendor
project → vendor
per vendorRequestSchema
projectId, status, collectionGroup
MEDIUM
projects/{id}/ledgerItems
Contribution/expense ledger
Project members
project → financials
amount, category, approved
projectId, createdAt
HIGH
projects/{id}/commitments
Investment commitments
Investor
deal ↔ investor
amount, status
projectId
MEDIUM
projects/{id}/activityLog
Activity/audit trail
System
project events
actor, action, timestamp
projectId, createdAt
MEDIUM
projects/{id}/phaseSnapshots
Wizard state
Project members
REIL phases
phase, snapshot
—
LOW
inboxItems
Universal inbox feed
User (recipient)
→ project, deal, task
userId, type, priority, read
(userId, createdAt), (userId, read)
HIGH
notifications
Push/email notifications
User
→ actor, object ref
recipientId, type, channel
(recipientId, createdAt)
HIGH
messages / threads
Direct messaging
Participants
user ↔ user / project
threadId, participants
(participantId, updatedAt)
HIGH
dealListings
Marketplace listings
Investor/Vendor
→ project/deal
title, status, ownerId
status, createdAt
MEDIUM
dealInvitations
Deal invite tokens
Investor/Team
deal → invitee
token, status, expiresAt
token, dealId
MEDIUM
investorFollowers
Follow investor profiles
Investor
follower → target
{followerUid}_{targetUid}
flat doc ID
LOW
taskAssignments
Task assignment records
Team Lead
project → assignee
projectId, assigneeId, status
(assigneeId, status), (projectId)
CRITICAL
dataCompletionTasks
Outreach/completion tasks
System/Team
project
per schema
(projectId, status)
MEDIUM
projectFolders
Document folders
Project members
project
projectId, phase
(projectId)
MEDIUM
projectFiles
Document files
Project members
folder → storage
folderId, storageUrl
(projectId, folderId)
MEDIUM
propertyMetricSnapshots
Cached KPI snapshots
System/Investor
project
projectId, periodType, metrics
(projectId, periodType, period)
MEDIUM
subscriptions
Subscription state
User/Org
Stripe
plan, status, stripeCustomerId
userId, stripeSubscriptionId
HIGH
stripe_events
Stripe idempotency log
System
webhook
eventId, processed
doc ID = eventId
LOW (server only)
adminAuditLogs
Admin actions
MASTER_ADMIN
all resources
actor, action, target, timestamp
(createdAt), (actorId)
CRITICAL
systemConfig
Platform config (lender rates, etc.)
MASTER_ADMIN
—
config keys
—
Admin read
verification_codes
Admin OTP
System
admin auth
code, expires
TTL
Server only
queued_emails
Email queue
System
user notifications
recipient, template, sendAt
sendAt, status
Server only
gate_events
Feature gate telemetry
System
user
event, timestamp
analytics
LOW
operatorQueue
Ops workflow
Admin
—
queue item
status
Admin
permissions
MISSING - REQUIRED (if not embedded)
System
role → resource
resource, action, scope
—
CRITICAL
roles
MISSING - REQUIRED (if dynamic RBAC)
System
—
name, permissions[]
—
CRITICAL
Note: v1 currently embeds project members in projects.members map (projectSchema.ts L1040–1044). docs/role.md proposes separate ProjectMember — conflict that must be resolved before production rules.

Step 5 — Missing Collections
Collection	Why needed	Feature requiring it	If omitted
projectMembers
Query "all projects for user X" + TEAM_LEAD/MEMBER RBAC
Team directory, project access, task assign
Cannot enforce MEMBER/ASSIGNED scopes; must scan all projects
taskAssignments
ASSIGN scope, vendor task inbox
Tasks module, vendor portal
Tasks stay seed-only; vendors can't see real assignments
inboxItems (wired)
Inbox UI currently seed
/dashboard/inbox
Inbox never syncs cross-device
notifications (wired)
Real-time alerts
Header bell, deadline alerts
No push/email trail
organizationMembers
Org-scoped team
Multi-tenant orgs in organizationSchema
Org team RBAC impossible
auditLogs (Firestore or Postgres wired)
ADMIN audit requirement
/admin/audit
Compliance gap
permissions / roleBindings
Fine-grained RBAC matrix from docs/role.md
All scoped actions
Only coarse accountType checks
comments
Threaded comments on tasks/deals
Deal updates, collaboration
Deal updates can't persist
reports (generated artifacts)
EXPORT action persistence
Reports panel
Regenerate every time; no history
taxReports
TAX_REPORT resource
Tax package routes
Tax export non-persistent
vendorServices
Marketplace listings by vendor
Vendor marketplace
Vendors can't manage services
dealInvitations (wired)
INVITE action on deals
Deal marketplace
Invites stay mock
firestore.rules + indexes
Production security
Everything
Open or non-existent DB
Step 6 — Firestore Security Model (recommended architecture)
v1 has no rules file. Below is the target aligned with docs/role.md + existing schemas.

Helper functions (rules pseudo)
isAuthenticated()
isMasterAdmin()      → users/{uid}.accountType == 'admin'
isInvestor()         → accountType == 'investor'
isVendor()           → accountType == 'vendor'
isProjectOwner(pid)  → projects/{pid}.ownerId == uid
isProjectMember(pid) → exists projectMembers/{pid_uid} OR projects/{pid}.members[uid]
projectRole(pid)     → projectMembers doc or embedded members map
isTeamLead(pid)      → projectRole == 'TEAM_LEAD'
isAssigned(taskId)   → taskAssignments/{id}.assigneeId == uid
Security matrix (summary)
Collection	Read	Create	Update	Delete
users
Self; Master Admin
Self (on signup)
Self (profile); Admin
Admin only
projects
Owner; Project members; Admin
Investor (owner)
Owner; Team Lead (limited fields); Admin
Owner; Admin
projectMembers
Project members; Admin
Owner; Team Lead (invite)
Owner; Team Lead (role)
Owner; Team Lead (remove)
projects/.../vendorRequests
Project members; assigned Vendor
Investor/Team Lead
Vendor (own request); Team Lead
Team Lead
inboxItems
Recipient only
Server (Admin SDK)
Recipient (mark read)
Recipient; Admin
notifications
Recipient only
Server only
Recipient (read state)
Recipient
taskAssignments
Assignee; Project members; Admin
Team Lead; Investor (owner)
Assignee (status); Team Lead
Team Lead
projectFiles
Project members (scoped)
Members with doc permission
Uploader; Team Lead
Team Lead; Owner
dealListings
Authenticated (marketplace)
Investor/Vendor (own)
Owner; Admin
Owner; Admin
dealInvitations
Inviter; Invitee (token)
Team Lead/Investor
Invitee (accept/decline)
Inviter
subscriptions
Self; Admin
Server (Stripe webhook)
Server
Admin
stripe_events
Deny client
Server only
Server only
Deny
adminAuditLogs
Master Admin
Server only
Deny
Deny
systemConfig
Authenticated read (public config)
Admin
Admin
Admin
Vendor rule: Vendors never get blanket project read — only via vendorRequests or taskAssignments where vendorId == uid.

Step 7 — Final Architecture Report
1. Current Architecture
Browser (Next.js 15 — apps/web)
  ├── UI: 52 pages, mostly seed-driven panels
  ├── Auth: Firebase client + session cookie
  ├── API: 28 Next routes → @paperworking/api handlers (seed deps)
  └── Firestore live: users/{uid} read on session only
apps/api (~201 handlers)
  └── Business logic via injected deps (verifyAccess, getProject, etc.)
      └── NOT wired to real DB in v1 web routes
packages/database (read-only adapters)
  ├── Firestore: users, projects (get by ID)
  └── Prisma: 66 models — unused at runtime
packages/validation: Zod schemas = Firestore contract docs
packages/financial-engine: metrics derivation (pure functions)
2. Existing Collections (runtime vs documented)
Status	Collections
Runtime read
users
Repo exists, unwired
projects
Schema only
organizations, inboxItems, notifications, projectFolders, projectFiles, propertyMetricSnapshots, dataCompletionTasks, stripe_events, vendorRequests (subcollection)
Docs only (v0)
dealListings, dealInvitations, taskAssignments, investorFollowers, queued_emails, subscriptions, etc.
3. Missing Collections
See Step 5 — top priority: projectMembers, taskAssignments, wired inboxItems, notifications, auditLogs, firestore.rules.

4. Recommended Collection Structure
Firestore (primary for product UI + real-time):

users, organizations, organizationMembers
projects (lean doc + embedded summary only)
projectMembers (canonical membership for RBAC queries)
Subcollections under projects/{id}/: vendorRequests, ledgerItems, commitments, activityLog
Top-level: inboxItems, notifications, taskAssignments, dealListings, dealInvitations, projectFolders, projectFiles, propertyMetricSnapshots, stripe_events
Postgres/Prisma (analytics, REIL pipeline, banking):

Keep ReilProject, FinancialTransaction, PlaidConnection, Reconciliation*, AdminAuditLog
Single source of truth per entity — avoid dual-write without sync strategy
5. Relationships Diagram
User
(no attributes)
OrganizationMember
(no attributes)
Organization
(no attributes)
Project
(no attributes)
ProjectMember
(no attributes)
VendorRequest
(no attributes)
TaskAssignment
(no attributes)
InboxItem
(no attributes)
Notification
(no attributes)
ProjectFile
(no attributes)
PropertyMetricSnapshot
(no attributes)
DealListing
(no attributes)
DealInvitation
(no attributes)
Subscription
(no attributes)
belongs
has
owns
joins
has
receives
submits
contains
assigned
receives
receives
stores
caches
invites
pays
6. Security Rules Matrix
See Step 6 — implement after projectMembers collection decision (embedded map vs top-level collection).

7. Required Composite Indexes (minimum)
Collection	Fields	Reason
projectMembers
userId, status
List user's projects
projectMembers
projectId, role
List project team
inboxItems
userId, createdAt DESC
Inbox feed
inboxItems
userId, read, createdAt
Unread filter
notifications
recipientId, createdAt DESC
Notification center
taskAssignments
assigneeId, status
My tasks
taskAssignments
projectId, status
Project task board
vendorRequests (collectionGroup)
vendorId, status
Vendor portal inbox
dealListings
status, createdAt
Marketplace browse
propertyMetricSnapshots
projectId, periodType, period
Historical metrics
8. Data Duplication Risks
Risk	Severity	Evidence
User in Firestore + Prisma AppUser + User
HIGH
DATABASE_MAP.md §4
Project in Firestore + ReilProject + Project
HIGH
Same
Members embedded in project doc vs separate collection vs Prisma ProjectCollaborator
HIGH
Schema conflict
Subscription on users doc vs subscriptions collection vs Prisma Subscription
MEDIUM
Stripe webhook comments
Metrics computed vs propertyMetricSnapshots cache
MEDIUM
financial-engine vs snapshot schema
holdRegistry location ambiguity
MEDIUM
docs vs field on project
9. Scalability Risks
Risk	Impact
Embedded projects.members map
Can't query "my projects" without scanning all projects or maintaining index collection
100+ field project documents
Large reads on every project fetch; hot document problem
No pagination wired
Handlers assume full list (seed); Firestore getDocs without cursors will break at scale
No server-side rules in v1
Any future client SDK exposure = security incident
Dual Postgres + Firestore without event sync
Consistency bugs under write load
267 unwired handlers
Operational complexity; teams may wire routes inconsistently
10. Migration Plan (phased)
Phase	Goal	Actions
P0 — Foundation
RBAC data model
Decide: projectMembers collection vs embedded map; implement Zod + rules
P1 — Auth + User
Live user profile
Already partial; complete users write on signup, subscription fields
P2 — Projects read
Replace seed
Wire GET /api/projects, /[id] to FirestoreProjectRepository
P3 — Membership
Team + access
Implement projectMembers, wire verifyAccess in web deps
P4 — Inbox/Notifications
Real-time UI
Wire inbox/notifications handlers + onSnapshot or polling
P5 — Tasks/Vendor
Marketplace loop
taskAssignments, vendorRequests collectionGroup
P6 — Financial
Banking
Prisma adapters for Plaid/transactions; link to projectId
P7 — Consolidation
Single source of truth
Pick Firestore vs Postgres per entity; deprecate duplicates
Final Collection Checklist (production)
#	Collection	Status in v1
1
users
PARTIAL (read on auth)
2
organizations
MISSING - REQUIRED
3
organizationMembers
MISSING - REQUIRED
4
projects
PARTIAL (repo, seed in UI)
5
projectMembers
MISSING - REQUIRED (role.md; conflicts with embedded members)
6
projects/{id}/vendorRequests
MISSING - REQUIRED
7
projects/{id}/ledgerItems
MISSING - REQUIRED
8
projects/{id}/commitments
MISSING - REQUIRED
9
projects/{id}/activityLog
MISSING - REQUIRED
10
projects/{id}/phaseSnapshots
MISSING - REQUIRED
11
inboxItems
MISSING - REQUIRED
12
notifications
MISSING - REQUIRED
13
messages / threads
MISSING - REQUIRED
14
taskAssignments
MISSING - REQUIRED
15
dataCompletionTasks
MISSING - REQUIRED
16
projectFolders
MISSING - REQUIRED
17
projectFiles
MISSING - REQUIRED
18
propertyMetricSnapshots
MISSING - REQUIRED
19
dealListings
MISSING - REQUIRED
20
dealInvitations
MISSING - REQUIRED
21
investorFollowers
MISSING - REQUIRED
22
subscriptions
MISSING - REQUIRED (or formalize users fields only)
23
stripe_events
MISSING - REQUIRED
24
adminAuditLogs
MISSING - REQUIRED (Prisma model exists)
25
systemConfig
MISSING - REQUIRED
26
verification_codes
MISSING - REQUIRED
27
queued_emails
MISSING - REQUIRED
28
permissions / roleBindings
MISSING - REQUIRED (for full RBAC matrix)
29
firestore.rules
MISSING - REQUIRED
30
firestore.indexes.json
MISSING - REQUIRED
31
Firebase Storage rules
MISSING - REQUIRED (documents/receipts)
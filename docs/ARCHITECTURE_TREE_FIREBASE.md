# PaperWorking V1 — Architecture Tree Diagram

> **Scope:** Target **Firebase-centric** architecture — no PostgreSQL (Neon), Prisma, REIL SQL, P&L ledger SQL, or Banking/Plaid.  
> **Implementation note:** V1 code today still reads/writes via **Neon + Prisma** for auth, users, projects, deals, and billing. This document describes the **target direction**; Firestore migration is a separate phase.

---

## 0. Top-down overview (arrows flow downward)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — USERS                                                        │
│  Investor · Investment Team · Vendor · Platform Admin                   │
│  Browser (Chrome / Safari) · paperworking.co · localhost:3000         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │  HTTPS (TLS)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — FRONTEND                                                     │
│  Next.js 15 App Router · apps/web                                       │
│  Marketing · Login · Dashboard · Project · Vendor Portal · Admin        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │  fetch same-origin /api/*
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — API / BUSINESS LOGIC (Cloud Run)                             │
│  Firebase App Hosting → Cloud Run container                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  BFF routes (/api/auth, /api/projects, /api/deals, …)           │    │
│  │  @paperworking/services · authz · validation                    │    │
│  │  @paperworking/financial-engine (IRR, cap rate, NOI)             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└───────────────┬─────────────────────┬─────────────────────┬─────────────┘
                │                     │                     │
                │ verify token        │ read / write docs   │ upload / download files
                ▼                     ▼                     ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│  LAYER 4a             │ │  LAYER 4b             │ │  LAYER 4c             │
│  Firebase Auth        │ │  Firebase Firestore   │ │  Firebase Storage     │
│                       │ │                       │ │                       │
│  · Google login       │ │  · /users             │ │  · document PDFs      │
│  · Facebook login     │ │  · /organizations     │ │  · receipts           │
│  · Session cookie     │ │  · /projects          │ │  · tax reports        │
│    __session          │ │  · /dealListings      │ │                       │
│                       │ │  · ledgerItems (*)    │ │  gs://paperworking-   │
│                       │ │  · metric snapshots   │ │  97055.firebasestorage│
│                       │ │  · billing mirror (**)│ │                       │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
                │
                │  checkout + webhooks (sync back into Firestore)
                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 5 — EXTERNAL SERVICES (not hosted on Firebase)                   │
│  Stripe — checkout · subscriptions · customer portal · invoices         │
│  (card data stays on Stripe; PaperWorking stores a Firebase mirror)     │
└─────────────────────────────────────────────────────────────────────────┘

(*)  ledgerItems = subcollection under /projects — no Postgres / Plaid
(**) billing fields on /users + optional /billingEvents — see §0.1 below
```

### 0.1 Where does Layer 5 (External) data live in Firebase?

Layer 5 services **run outside Firebase** (e.g. Stripe’s servers). PaperWorking does **not** replace Stripe with Firebase Storage or Firestore for payments. Instead:

| What | Where it lives | Notes |
|---|---|---|
| Credit cards, bank details | **Stripe only** | Never stored in Firebase (PCI) |
| Subscription contracts, invoices | **Stripe only** | Source of truth for billing ops |
| Customer ID link | **Firestore** `/users/{uid}.stripeCustomerId` | Links Firebase user → Stripe customer |
| Plan + status (app gate) | **Firestore** `/users/{uid}` | `subscriptionPlan`, `subscriptionStatus` |
| Display cookie (fast UI) | **HTTP cookie** `__sub` | Mirror of plan/status; not authoritative |
| Webhook audit / idempotency | **Firestore** `/stripeWebhookEvents/{eventId}` | Optional; prevents double-processing |
| Invoice PDFs (if exported) | **Firebase Storage** `/billing/{orgId}/invoices/{id}.pdf` | Optional copy for in-app download |

```
Stripe (external — Layer 5)
│
├── checkout.session.completed
├── customer.subscription.updated
└── invoice.paid
        │
        │  POST /api/stripe/webhook  (Layer 3 BFF)
        ▼
┌───────────────────────────────────────┐
│  Firebase Firestore (Layer 4b)      │
│                                       │
│  /users/{uid}                         │
│    stripeCustomerId: "cus_…"          │
│    subscriptionPlan: "Individual"   │
│    subscriptionStatus: "active"       │
│                                       │
│  /stripeWebhookEvents/{eventId}     │
│    type, processedAt, payloadHash     │
└───────────────────────────────────────┘
        │
        │  optional: store invoice PDF
        ▼
┌───────────────────────────────────────┐
│  Firebase Storage (Layer 4c)          │
│  /billing/{orgId}/invoices/{id}.pdf   │
└───────────────────────────────────────┘
```

**Summary:** Use Firebase to store **your app’s copy** of billing state (Firestore) and **files** (Storage). Keep **payment processing** on Stripe (Layer 5).

---

### Example flow: Login → Dashboard

```
  [User clicks "Continue with Google"]
              │
              ▼
  ┌───────────────────────┐
  │  Firebase Auth        │  ← Google popup → ID token
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │  POST /api/auth/session│  ← exchange token → __session cookie
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │  Firestore /users/{uid}│  ← provision / read profile + subscription
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │  GET /dashboard        │  ← UI loads projects from Firestore
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │  GET /api/projects     │  ← services + authz → Firestore query
  └───────────────────────┘
```

### Example flow: Document upload

```
  [User uploads PDF in Project Documents]
              │
              ▼
  ┌───────────────────────┐
  │  POST /api/projects/   │
  │  {id}/documents        │
  └───────────┬───────────┘
              │
              ├──────────────────────────┐
              ▼                          ▼
  ┌───────────────────────┐  ┌───────────────────────┐
  │  Firebase Storage      │  │  Firestore             │
  │  binary file           │  │  metadata              │
  │  /projects/…/documents/│  │  name, url, uploadedBy │
  └───────────────────────┘  └───────────────────────┘
```

### Example flow: Subscribe via Stripe

```
  [User clicks plan on /pricing]
              │
              ▼
  ┌───────────────────────┐
  │  POST /api/stripe/     │
  │  checkout              │  → redirects to Stripe Hosted Checkout
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │  Stripe (Layer 5)      │  ← user pays; Stripe holds payment method
  └───────────┬───────────┘
              │
              │  webhook
              ▼
  ┌───────────────────────┐
  │  Firestore /users/{uid}│  ← subscriptionPlan + subscriptionStatus updated
  └───────────────────────┘
              │
              ▼
  ┌───────────────────────┐
  │  App unlocks features  │  ← authz reads Firestore, not Stripe directly
  └───────────────────────┘
```

---

## 1. Full platform tree (top → bottom)

```
PaperWorking Platform
│
├── 🌐 Client Layer
│   └── Browser / Mobile Web
│       └── Next.js 15 App Router (apps/web)
│           ├── Marketing (/, /pricing, /how-it-works)
│           ├── Auth (/login, /signup)
│           ├── Dashboard (/dashboard/*)
│           ├── Project workspace (/project/[id]/*)
│           ├── Vendor portal (/vendor-portal)
│           └── Admin (/admin/*)
│
├── ☁️ Google Cloud / Firebase (paperworking-97055)
│   │
│   ├── Firebase App Hosting
│   │   └── Cloud Run container (apps/web)
│   │       ├── Port 8080 — Next.js standalone
│   │       ├── SSR / CSR pages
│   │       └── BFF API routes (/api/*)
│   │
│   ├── apps/api (Nest — Cloud Run, optional deploy)
│   │   └── Framework-agnostic handlers (@paperworking/api)
│   │
│   └── Monorepo packages/
│       ├── @paperworking/services      → business logic
│       ├── @paperworking/identity      → verify Firebase token
│       ├── @paperworking/authz         → RBAC / permissions
│       ├── @paperworking/validation    → Zod schemas
│       ├── @paperworking/financial-engine → IRR, cap rate, NOI (in-memory)
│       └── @paperworking/database      → Firestore repos + Firebase Storage adapter
│
├── 🔐 Firebase Authentication
│   ├── Google Sign-In
│   ├── Facebook Sign-In
│   ├── Email / Password (optional)
│   └── Session cookies (httpOnly)
│       ├── __session   → Firebase session token
│       ├── __acct      → accountType (investor | vendor | admin)
│       └── __sub       → subscription plan + status (display mirror)
│
├── 📄 Firebase Firestore (document DB — primary source of truth)
│   │
│   ├── /users/{uid}
│   │   ├── email, displayName, accountType, role
│   │   ├── organizationId
│   │   ├── stripeCustomerId
│   │   ├── subscriptionPlan, subscriptionStatus
│   │   └── preferences
│   │
│   ├── /organizations/{orgId}
│   │   ├── name, ownerUid, maxSeats
│   │   └── members (map)
│   │
│   ├── /projects/{projectId}
│   │   ├── propertyName, address, currentPhase (1–4)
│   │   ├── status, dispositionType, financials (summary)
│   │   ├── ownerUid, organizationId
│   │   │
│   │   ├── /ledgerItems/{itemId}          → income / expense (documents, not SQL)
│   │   ├── /phaseSnapshots/{phaseId}      → per-phase checklist
│   │   ├── /vendorRequests/{requestId}    → vendor quotes
│   │   └── /activityLog/{logId}           → project audit trail
│   │
│   ├── /dealListings/{dealId}
│   │   ├── dealSlug, address, purchasePrice
│   │   ├── targetRaise, currentPledged
│   │   └── visibility (marketplace | invitation | private)
│   │
│   ├── /propertyMetricSnapshots/{projectId}
│   │   └── capRate, NOI, IRR, DSCR… (financial-engine cache)
│   │
│   ├── /stripeWebhookEvents/{eventId}     → billing webhook audit (optional)
│   │
│   └── /verification_codes/{codeId}       → Admin OTP
│
├── 📦 Firebase Storage (object store — files)
│   │
│   Bucket: gs://paperworking-97055.firebasestorage.app
│   │
│   ├── /projects/{projectId}/documents/{docId}/{filename}
│   │   └── LOI, title binder, closing packet, appraisal PDF
│   │
│   ├── /projects/{projectId}/receipts/{transactionId}/{filename}
│   │   └── rehab receipt images / PDFs
│   │
│   ├── /reports/{organizationId}/{reportId}.pdf
│   │   └── tax package, Schedule E, Form 8825
│   │
│   └── /billing/{organizationId}/invoices/{invoiceId}.pdf  (optional)
│       └── Stripe invoice export for in-app download
│
├── 💳 Stripe (external — Layer 5)
│   ├── Hosted Checkout / Customer Portal
│   ├── Payment methods & invoices (Stripe-owned)
│   └── Webhook → sync subscription fields into Firestore /users/{uid}
│
└── 🛡️ Security
    ├── firestore.rules          → user / org / project isolation
    └── Storage rules            → path scoped by projectId + org permissions
```

---

## 2. Request flow tree (user click → data)

```
User Action
│
├── [1] HTTPS → paperworking.co / localhost:3000
│       └── Next.js page or /api/* route
│
├── [2] Auth check
│       ├── Cookie __session → Firebase Admin verify
│       └── Load /users/{uid} from Firestore → AuthUser + isAdmin
│
├── [3] Business logic
│       └── @paperworking/services
│           ├── Authorization (@paperworking/authz)
│           ├── Validation (Zod)
│           └── financial-engine (metrics when needed)
│
├── [4] Read / write
│       │
│       ├── Structured data  → Firestore (users, projects, deals, inbox…)
│       │
│       └── Files            → Firebase Storage
│           ├── upload PDF / receipt
│           └── download signed URL
│
└── [5] Response → JSON or HTML → Browser
```

---

## 3. REIL lifecycle tree (4 phases — no SQL)

```
REIL Deal Lifecycle
│
├── Phase 1 — Acquisition
│   ├── Deal calculator
│   ├── Comp / valuation inputs
│   └── LOI, offer caps
│
├── Phase 2 — Fund
│   ├── Debt / equity stack (Firestore sub-documents)
│   ├── Lender review pack → Storage
│   └── Earnest money window
│
├── Phase 3 — Hold
│   ├── Rehab draws & milestones
│   ├── Holding cost clock
│   ├── ledgerItems (Firestore subcollection)
│   └── Receipts → Storage
│
└── Phase 4 — Exit
    ├── Disposition / sale
    ├── 1031 / rent hold
    └── CPA tax reports → Storage (/reports/…)

Metrics (IRR, cap rate, DSCR…)
└── @paperworking/financial-engine
    ├── Input: Firestore project.financials + ledgerItems
    └── Output: snapshot → /propertyMetricSnapshots/{projectId}
```

---

## 4. Monorepo tree (folders)

```
PaperWorking_v1/
│
├── apps/
│   ├── web/                         # Next.js — UI + BFF /api/*
│   │   ├── app/                     # App Router pages
│   │   ├── components/
│   │   ├── lib/
│   │   └── context/AuthContext.tsx
│   │
│   └── api/                         # Nest API (Cloud Run)
│       └── src/
│
├── packages/
│   ├── services/                    # Session, projects, deals, billing…
│   ├── database/
│   │   ├── firestore/               # Firestore read/write repos
│   │   └── firebase/                # Firebase Storage adapter
│   ├── identity/                    # Firebase token verify
│   ├── authz/                       # RBAC
│   ├── financial-engine/            # deriveAllProjectMetrics()
│   ├── validation/
│   └── shared/
│
├── firestore.rules
├── firestore.indexes.json
└── docs/
    └── ARCHITECTURE_TREE_FIREBASE.md  ← this file
```

---

## 5. RBAC tree (account types)

```
Account Types
│
├── investor              → /dashboard
│   ├── Solo projects
│   ├── Deal calculator
│   └── Browse marketplace
│
├── investment_team       → /dashboard
│   ├── Multi-seat org (≤10)
│   └── Invite LP/GP to deals
│
├── vendor                → /vendor-portal
│   ├── Quote requests
│   └── Trade profile
│
└── admin (Firestore)     → /admin
    ├── User management
    ├── Subscriptions
    ├── Agent crew QA
    └── Audit logs
```

---

## 6. Quick comparison: legacy doc vs target

```
Legacy architecture (dual DB)     Target architecture (this doc)
─────────────────────────────     ────────────────────────────────
Firebase Firestore        ✅       Firebase Firestore     ✅ primary
PostgreSQL (Neon)         ✅       PostgreSQL (Neon)      ❌ removed
Prisma                    ✅       Prisma                 ❌ removed
REIL / P&L / Ledger SQL   ✅       Firestore ledgerItems  ✅ documents
Banking / Plaid           ✅       (not used)             ❌ removed
Firebase Storage          ✅       Firebase Storage     ✅ expanded
Redis (Upstash)           ✅       (optional / removed)   ⚪ optional
Firebase Auth             ✅       Firebase Auth          ✅
Stripe                    ✅       Stripe + Firestore     ✅ mirror in Firebase
```

---

## 7. V1 code reality today

```
Current runtime (not 100% aligned with this diagram yet)
│
├── ✅ Firebase Auth — production login works
├── ✅ Firebase Storage adapter — code exists (project documents)
├── ⚠️ Firestore repos — read code exists; not yet source of truth
├── ❌ Neon + Prisma — still source of truth (auth, users, deals…)
└── 📋 Migration needed: move services from Prisma → Firestore write path
```

---

*Updated: 2026-03-03 — Firebase-centric tree; Neon/Prisma/Plaid removed from target diagram; Layer 5 billing mirror documented.*

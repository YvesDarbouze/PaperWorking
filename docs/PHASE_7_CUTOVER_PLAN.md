# Phase 7 — Production Cutover Plan & Executable Checklist

**Status:** 📋 Ready for Execution  
**Current Production Deployment:** Google Cloud Run via Firebase App Hosting (`paperworker`, region `us-east4`), GCP project `paperworking-97055`  
**Current Deployed Repository:** `https://github.com/YvesDarbouze/PaperWorking.git` (Legacy Monolith @ `9c9efe98`)  
**Target Repository:** `https://github.com/YvesDarbouze/PaperWorking_v1.git` (`main` branch)  
**Hosting Architecture:** Firebase App Hosting → Google Cloud Run (Next.js 15 Monorepo `apps/web`)  

---

## 1. Executive Summary & Reality Check

Forensic analysis in Prompt I1 proved that `https://paperworking.co` is powered by **Firebase App Hosting on Google Cloud Run** connected to the legacy repository `YvesDarbouze/PaperWorking`. It is **NOT** hosted on Vercel. 

The empty KPI state observed in production ("No KPI data yet.") is the direct result of this deployment drift: the production service runs outdated monolith code that predates the verified 33-KPI financial engine, the 4-category command surface, and the dynamic insights loader.

**The permanent fix is the Phase 7 Cutover:** linking Firebase App Hosting to `PaperWorking_v1`, configuring all required environment variables and secrets, testing on a preview rollout, and switching production traffic to `PaperWorking_v1`.

---

## 2. Deployment Topology

### Current Reality (Legacy Production)
```
paperworking.co ──> Firebase App Hosting Backend: "paperworker" (us-east4)
                     └── Repo: YvesDarbouze/PaperWorking (legacy monolith @ 9c9efe98)
                     └── Backing Services: Firestore, Neon PostgreSQL, Secret Manager
```

### Target Reality (Post-Cutover)
```
paperworking.co ──> Firebase App Hosting Backend: "paperworking-v1" (or re-linked "paperworker")
                     └── Repo: YvesDarbouze/PaperWorking_v1 (branch: main)
                     └── Root Directory: / (Next.js apps/web via npm workspaces)
                     └── Core Engine: @paperworking/financial-engine (33/33 KPIs)
                     └── API Handlers: @paperworking/api
                     └── Build Provenance: Injected NEXT_PUBLIC_BUILD_SHA & /api/health
```

---

## 3. Required Environment Variables & Secrets Enumeration

All variables are derived from `.env.local.example`, `apps/web/.env.local.example`, and `infrastructure/apphosting.migration.yaml.template`.

### A. Client-Side Public Variables (Configured in App Hosting `env` / Build Settings)

| Variable Name | Build / Runtime | Example / Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Build + Runtime | `production` | Production environment flag |
| `NEXT_PUBLIC_APP_URL` | Build + Runtime | `https://paperworking.co` | Canonical origin for auth redirects and absolute links |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Build + Runtime | `AIzaSy...` | Firebase Web Client API key (browser-safe) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Build + Runtime | `paperworking-97055.firebaseapp.com` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Build + Runtime | `paperworking-97055` | GCP / Firebase project identifier |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Build + Runtime | `paperworking-97055.firebasestorage.app` | Cloud Storage bucket for deal docs/photos |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Build + Runtime | `100000000000` | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Build + Runtime | `1:100000000000:web:abcdef1234567890` | Firebase Web App registration ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Build + Runtime | `AIzaSy...` | Browser-restricted key for Maps JS & Places Autocomplete |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Build + Runtime | `pk_live_...` | Stripe client-side checkout & elements key |
| `NEXT_PUBLIC_BUILD_SHA` | Build (Auto) | *Baked by next.config.ts* | Commit SHA baked at build time via `COMMIT_SHA` / `GITHUB_SHA` |
| `NEXT_PUBLIC_BUILT_AT` | Build (Auto) | *Baked by next.config.ts* | ISO build timestamp for provenance verification |

### B. Server-Side Secrets (Configured in Google Cloud Secret Manager)

| Secret Name | Runtime Only | GCP Secret Manager Key | Description |
| :--- | :---: | :--- | :--- |
| `GOOGLE_MAPS_API_KEY` | Yes | `GOOGLE_MAPS_API_KEY` | Server-only key for Static Maps, Street View, and Geocoding proxy |
| `FIREBASE_PROJECT_ID` | Yes | *Plain env or secret* | `paperworking-97055` |
| `FIREBASE_CLIENT_EMAIL` | Yes | `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key (PEM format) |
| `DATABASE_URL` | Yes | `DATABASE_URL` | Neon PostgreSQL pooled connection string (`postgresql://...`) |
| `DIRECT_URL` | Yes | `DIRECT_URL` | Neon PostgreSQL unpooled direct connection string |
| `STRIPE_SECRET_KEY` | Yes | `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `SENDGRID_API_KEY` | Yes | `SENDGRID_API_KEY` | SendGrid transactional email API key (`SG....`) |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY` | Yes | `SENDGRID_WEBHOOK_VERIFICATION_KEY` | SendGrid inbound webhook verification ECDSA key |
| `REDIS_URL` | Yes | `REDIS_URL` | Upstash / Redis cache connection string (optional) |

---

## 4. Executable Cutover Checklist

Each step is explicitly designated as **[HUMAN]** (requiring account/console credentials) or **[AGENT]** (runnable via terminal/codebase tooling).

### Phase 1: Repository & Code Preparation
- [x] **[AGENT]** Verify monorepo typecheck: `npm run typecheck` exits code 0.
- [x] **[AGENT]** Verify test suites: Web 388+, financial engine 13/13, K3 matrix 33/33.
- [x] **[AGENT]** Verify build provenance wiring in `next.config.ts`, `build-info.ts`, and `/api/health`.
- [ ] **[HUMAN]** Commit working branch `Yves-update-UI-dashboard`:
  ```bash
  git add .
  git commit -m "feat: complete Phase 5g marketplace, 33-KPI insights rebuild, and build provenance"
  ```
- [ ] **[HUMAN]** Push branch and merge into `main` of `YvesDarbouze/PaperWorking_v1`:
  ```bash
  git push origin Yves-update-UI-dashboard
  # Merge PR or fast-forward main:
  git checkout main
  git merge Yves-update-UI-dashboard
  git push origin main
  ```

### Phase 2: Firebase App Hosting Backend Configuration
- [ ] **[HUMAN]** Open Firebase Console at `https://console.firebase.google.com/project/paperworking-97055/apphosting`.
- [ ] **[HUMAN]** Choose Blue/Green Provisioning Option:
  - **Option A (Recommended Blue/Green):** Click **Create Backend** -> Name: `paperworking-v1` -> Link to GitHub repo `YvesDarbouze/PaperWorking_v1` -> Branch: `main` -> Root directory: `/`.
  - **Option B (In-Place Re-link):** Go to existing backend `paperworker` -> Settings -> GitHub connection -> Reconnect repository to `YvesDarbouze/PaperWorking_v1` -> Branch: `main`.
- [ ] **[HUMAN]** Bind Environment Variables and Secrets in App Hosting settings matching Section 3:
  - Add all public `NEXT_PUBLIC_*` variables.
  - Bind secrets from Google Secret Manager (`GOOGLE_MAPS_API_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, etc.).
  - Ensure Cloud Run service account has `Secret Manager Secret Accessor` role.

### Phase 3: Preview Deployment & Verification Gate
- [ ] **[HUMAN]** Trigger rollout on `paperworking-v1` backend (or create a preview channel rollout).
- [ ] **[AGENT]** Query `/api/health` on preview URL:
  - Verify HTTP 200 response with `{ ok: true, status: { postgres: "healthy", firestore: "healthy" }, buildSha: "<commit-sha>", builtAt: "..." }`.
  - Confirm `buildSha` matches the latest `PaperWorking_v1` commit.
- [ ] **[AGENT]** Run automated test suites against preview URL:
  ```bash
  npm run test:e2e
  ```
- [ ] **[HUMAN]** Perform manual verification sweep on preview:
  - Login via Firebase Auth.
  - Navigate to `/dashboard/insights`: confirm all 4 categories render with 33 cards (no blank "No KPI data yet.").
  - Open KPI Detail Modal (e.g. Quick Cap Rate or DSCR) and verify canonical formula display.
  - Navigate to `/dashboard/settings` and inspect subtle build SHA in sidebar footer.
  - Navigate to `/marketplace`: verify address autocomplete, map cards, and filter rail.

### Phase 4: Production Traffic Switch (Zero-Downtime)
- [ ] **[HUMAN]** In Firebase Console -> App Hosting -> Custom Domains:
  - Assign domain `paperworking.co` (and `www.paperworking.co`) to the `paperworking-v1` backend.
  - (If using Option B in-place re-link, promote the rollout to 100% live traffic).
- [ ] **[AGENT]** Post-Cutover Live Health Verification:
  ```bash
  curl -s https://paperworking.co/api/health | jq .
  ```
  Confirm `buildSha` reflects the `PaperWorking_v1` commit.
- [ ] **[AGENT]** Verify external webhooks:
  - Stripe webhook endpoint `/api/stripe/webhook` returns expected handshake.
  - SendGrid webhook endpoint `/api/webhooks/sendgrid` returns 200.

### Phase 5: Hot Standby & Rollback Window (72 Hours)
- [ ] **[HUMAN]** **Keep the legacy `paperworker` backend active as hot standby for 72 hours.** Do NOT delete or disable the legacy Cloud Run service.
- [ ] **[HUMAN / AGENT]** Monitor error rates and alerts for 72 hours.
- [ ] **[HUMAN]** Decommission legacy backend only after 72 hours of stable operation with zero critical incidents.

---

## 5. Rollback Procedure (< 5 Minutes)

### Rollback Triggers (Any single condition initiates rollback):
1. Error rate > 2% for 15 minutes (5xx on `/api/*`).
2. Auth session creation failure rate > 1%.
3. Stripe webhook failures on live checkout events.
4. Insights page or project underwriting calculations crash in production.
5. Founder / Operator executive decision.

### Execution Steps:
1. **[HUMAN]** In Firebase Console -> App Hosting -> Custom Domains:
   - Immediately switch custom domain `paperworking.co` back to the legacy `paperworker` backend.
   - Target execution time: **< 3 minutes**.
2. **[AGENT]** Verify legacy endpoint responds:
   ```bash
   curl -I https://paperworking.co
   ```
3. **[HUMAN / AGENT]** Triage root cause from Cloud Logging (`paperworking-97055` / Cloud Run `paperworking-v1`) without impacting live user traffic.

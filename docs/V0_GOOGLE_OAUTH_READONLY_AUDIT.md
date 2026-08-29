# V0 Google / Firebase OAuth — READ-ONLY Configuration Audit

**Scope:** `PaperWorking/` (V0) — **read-only**.  
**Purpose:** Configure **V1 Supabase Auth → Google** using the client’s existing Google/Firebase project.  
**Date:** 2026-08-29  

**Constraints honored:** V0 not modified. No private keys, service-account JSON, or OAuth client secrets printed.

---

## 1. Firebase project

| Field | Value | Source |
|-------|--------|--------|
| Firebase Project ID | `paperworking-97055` | `.firebaserc`, `.env` / `.env.local`, `apphosting.yaml` |
| Firebase / GCP Project Number (messaging sender) | `779101817926` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| Firebase Web App ID | `1:779101817926:web:0dfce37fddc70718e70e47` | `NEXT_PUBLIC_FIREBASE_APP_ID` |
| Auth domain | `paperworking-97055.firebaseapp.com` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| Storage bucket | `paperworking-97055.firebasestorage.app` | env |
| Measurement ID | `G-7JX7B7KF0D` | env / `apphosting.yaml` |

### Auth providers (from V0 **code**, not Console API)

| Provider | Evidence in V0 | Enabled in app code? |
|----------|----------------|----------------------|
| **Google** | `GoogleAuthProvider` + `signInWithPopup` in `src/context/AuthContext.tsx` | **YES** (primary Google Login path) |
| **Facebook** | `FacebookAuthProvider` + `signInWithPopup`; `NEXT_PUBLIC_FACEBOOK_APP_ID` in `apphosting.yaml` | **YES** (code path present) |
| Email/password | Firebase Auth flows in auth UI / AuthContext | **YES** (present in product auth UX) |

**Google Sign-In:** **YES** — implemented via Firebase client SDK popup (not a custom `GOOGLE_CLIENT_ID` env login).

> Console toggle state (Firebase Console → Authentication → Sign-in method) cannot be read from the repo. Code + production env strongly imply Google is enabled for project `paperworking-97055`.

---

## 2. Google OAuth configuration

### Important finding

V0 **Google Login does not use** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from env.

Those variables are documented in `.env.example` for **Google Calendar / Drive integration only**, and in live V0 env files they are:

| Variable | `.env` | `.env.local` |
|----------|--------|--------------|
| `GOOGLE_CLIENT_ID` | **NOT FOUND** | **NOT FOUND** |
| `GOOGLE_CLIENT_SECRET` | **NOT FOUND** | **NOT FOUND** |

Firebase Auth Google provider uses the **Google Cloud OAuth 2.0 Web client auto-created for the Firebase project** (managed in Google Cloud Console under the same GCP project as Firebase).

| Field | Report |
|-------|--------|
| OAuth Client Name | **Not in repo** — typically named like `Web client (auto created by Google Service)` in GCP for Firebase |
| OAuth Client Type | **Web application** (Firebase Auth web) |
| Google Cloud Project | `paperworking-97055` (same as Firebase Project ID) |
| Client ID | **NOT stored in V0 env** — must be copied from Google Cloud Console |
| Client Secret | **GOOGLE_CLIENT_SECRET = NOT FOUND** in V0 env |

**Where the client retrieves Client ID + Secret (manual):**

1. [Google Cloud Console](https://console.cloud.google.com/) → select project **`paperworking-97055`**
2. **APIs & Services → Credentials**
3. Under **OAuth 2.0 Client IDs**, open the **Web client** associated with Firebase (often “Web client (auto created by Google Service)”)
4. Copy **Client ID** (safe to paste into Supabase)
5. Copy **Client secret** (SECRET — show once in Console; never commit)

Alternate path: **Firebase Console → Project settings → Your apps → Web app** shows public Firebase web config; OAuth client secret is only in **Google Cloud → Credentials**.

---

## 3. Redirect configuration (inferred from V0 — unchanged)

### Firebase Auth handler (actual Google Login callback for V0)

| Item | Value |
|------|--------|
| Firebase Auth handler | `https://paperworking-97055.firebaseapp.com/__/auth/handler` |
| Next.js rewrite | `/__/auth/:path*` → `https://paperworking-97055.firebaseapp.com/__/auth/:path*` (`next.config.ts`) |
| Login UX | Popup (`signInWithPopup`) — browser talks to Google + Firebase handler; **no custom app redirect URI for Google Login** |

### Domains implied for Firebase Auth authorized domains

(Exact Console list not in repo; these appear in V0 config and should match Console.)

| Domain | Evidence |
|--------|----------|
| `localhost` | Local Next.js auth (standard Firebase default) |
| `paperworking-97055.firebaseapp.com` | Auth domain + CSRF allowlist |
| `paperworking.co` | `NEXT_PUBLIC_APP_URL`, CSRF allowlist |
| `www.paperworking.co` | CSRF allowlist in `src/lib/auth/csrf.ts` |

### Other V0 Google OAuth callbacks (NOT Firebase Login)

Documented for **Drive/Calendar**, separate from Firebase Sign-In:

| Callback | Purpose |
|----------|---------|
| `{NEXT_PUBLIC_APP_URL}/api/integrations/google-drive/callback` | Google Drive OAuth (`.env.example`) |

Do **not** confuse Drive OAuth redirects with Supabase Auth Google redirects.

### Google OAuth Authorized JS Origins / Redirect URIs

**Not present as files in V0.** They live only in Google Cloud Console for the Web client.  
Expected Firebase defaults typically include origins like:

- `https://paperworking-97055.firebaseapp.com`
- `https://paperworking.co`
- `http://localhost:3000` (dev)

and redirect:

- `https://paperworking-97055.firebaseapp.com/__/auth/handler`

**Do not change V0 entries.** For V1, **add** Supabase callback URIs alongside (see §6–§7).

---

## 4. Environment variables (V0)

Legend: **SAFE_VALUE** shown only for public / non-secret fields.

### Firebase client (public)

| VARIABLE | SOURCE | PURPOSE | STATUS / SAFE_VALUE |
|----------|--------|---------|---------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `.env`, `.env.local`, `apphosting.yaml` | Firebase web API key | PRESENT — `AIzaSyDlmH8L2s9_IXXKUx9DIhhWP4nMYDzUlvg` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same | Auth domain | PRESENT — `paperworking-97055.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same | Project ID | PRESENT — `paperworking-97055` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same | Storage | PRESENT — `paperworking-97055.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same | Project number | PRESENT — `779101817926` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same | Web app ID | PRESENT — `1:779101817926:web:0dfce37fddc70718e70e47` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | same | Analytics | PRESENT — `G-7JX7B7KF0D` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | `.env`, `.env.local` | FCM push | PRESENT — **[REDACTED]** |
| `NEXT_PUBLIC_APP_URL` | env / apphosting | Canonical app URL | PRESENT — `https://paperworking.co` (prod) |

### Firebase Admin

| VARIABLE | SOURCE | PURPOSE | STATUS |
|----------|--------|---------|--------|
| `FIREBASE_PROJECT_ID` | `.env`, `.env.local`, `apphosting.yaml` | Admin project | PRESENT — `paperworking-97055` |
| `FIREBASE_CLIENT_EMAIL` | `.env`, `.env.local`, App Hosting secret | Service account email | PRESENT — **[REDACTED]** |
| `FIREBASE_PRIVATE_KEY` | `.env`, `.env.local`, App Hosting secret | Service account private key | PRESENT — **[REDACTED]** |

### Google OAuth env (Calendar/Drive — not used for Firebase Login)

| VARIABLE | SOURCE | PURPOSE | STATUS |
|----------|--------|---------|--------|
| `GOOGLE_CLIENT_ID` | `.env.example` only (empty template) | Drive/Calendar OAuth | **NOT FOUND** in `.env` / `.env.local` |
| `GOOGLE_CLIENT_SECRET` | `.env.example` only | Drive/Calendar OAuth | **NOT FOUND** in `.env` / `.env.local` → report as **NOT FOUND** |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `.env` / `.env.local` | Server Drive/Calendar | PRESENT — **[REDACTED]** |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `.env.example` template | SA key | check locally; treat as secret |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY` | `.env.example` | JSON SA | template only in example |
| `GOOGLE_PLACES_API_KEY` | `.env` / `.env.local` | Places | PRESENT — **[REDACTED]** |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `.env` / `.env.local` | GenAI | PRESENT — **[REDACTED]** |

### Facebook (related IdP, not Google)

| VARIABLE | SOURCE | STATUS |
|----------|--------|--------|
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | `apphosting.yaml` | PRESENT — `846487651808178` |

### GitHub Actions

| Secret name | Purpose |
|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_PAPERWORKING_97055` | Firebase Hosting deploy (`.github/workflows/firebase-hosting-*.yml`) |

---

## 5. Firebase service account

| Question | Answer |
|----------|--------|
| Present? | **YES** |
| Sources | (1) `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` in `.env` / `.env.local` / App Hosting secrets; (2) `PaperWorking/firebase-key.json` (`type: service_account`, `project_id: paperworking-97055`); (3) GitHub Actions secret `FIREBASE_SERVICE_ACCOUNT_PAPERWORKING_97055` |
| Used by | Firebase Admin SDK (`src/lib/firebase/admin.ts`), session routes (`/api/auth/session`), seed scripts, hosting deploy |

**Not printed:** private_key, client_email, JSON body.

**V1 note:** Do **not** copy Firebase service account into Supabase Auth Google settings. Supabase Google provider needs the **OAuth Web Client** ID/secret, not the Firebase Admin SA.

---

## 6. V0 → V1 Supabase mapping

| V0 configuration | → V1 Supabase / Google Cloud |
|------------------|------------------------------|
| Firebase Google Sign-In (popup via Firebase SDK) | Supabase Auth → Providers → **Google** (enabled) |
| GCP OAuth Web Client ID (Console; not in V0 env) | Supabase → Authentication → Providers → Google → **Client ID** |
| GCP OAuth Web Client Secret (Console; not in V0 env) | Supabase → Authentication → Providers → Google → **Client Secret** |
| Firebase handler `…firebaseapp.com/__/auth/handler` | **Keep for V0.** For V1 add Supabase callback (below) — do not remove Firebase handler |
| App URL `https://paperworking.co` | Supabase → Authentication → URL Configuration → **Site URL** (and V1 app URL) |
| Local `http://localhost:3000` | Supabase Redirect URLs + Google Authorized origins |
| V1 callback (new) `https://<SUPABASE_REF>.supabase.co/auth/v1/callback` | Must be added to Google Cloud OAuth client → **Authorized redirect URIs** |
| V1 app callback `http://localhost:3000/auth/callback` (V1 Next route) | Supabase → Redirect URLs (allow list) |
| Firebase authorized domains | Stay on Firebase for V0; Supabase uses its own URL allow list |
| `FIREBASE_*` Admin credentials | **Not used by V1 Supabase Auth** (V1 uses Nest + Supabase JWT) |

V1 Supabase project (from V1 env, for redirect construction): host `zhrfihonbacdupdrfqkp.supabase.co`  
→ callback: `https://zhrfihonbacdupdrfqkp.supabase.co/auth/v1/callback`

---

## 7. What to copy manually

### SAFE TO COPY

- Firebase Project ID: `paperworking-97055`
- Project number: `779101817926`
- Web App ID: `1:779101817926:web:0dfce37fddc70718e70e47`
- Auth domain: `paperworking-97055.firebaseapp.com`
- Public Firebase web API key (already public in client bundle)
- Production site URL: `https://paperworking.co`
- Local URL: `http://localhost:3000`
- V1 Supabase callback: `https://zhrfihonbacdupdrfqkp.supabase.co/auth/v1/callback`
- V1 app OAuth return: `http://localhost:3000/auth/callback` (+ prod V1 URL when ready)
- **Google OAuth Client ID** from GCP Credentials (once you open the Web client)

### SECRET — MANUAL COPY REQUIRED

| Secret | Where it exists | Where to get it |
|--------|-----------------|-----------------|
| **Google OAuth Client Secret** | Google Cloud Console only (NOT in V0 env) | GCP → APIs & Services → Credentials → Web client → Client secret |
| Firebase Admin private key / SA JSON | V0 `.env*`, `firebase-key.json`, GitHub/App Hosting secrets | **Do not use for Supabase Google provider** |
| `GOOGLE_CLIENT_SECRET` env | **NOT FOUND** in V0 live env | N/A for Firebase Login; create/copy from GCP Web client for Supabase |

### SUPABASE SETTINGS

**Supabase → Authentication → Providers → Google**

| Field | Paste |
|-------|--------|
| Enable Sign in with Google | ON |
| Client ID | OAuth Web Client ID from GCP project `paperworking-97055` |
| Client Secret | OAuth Web Client Secret from same Web client |

**Supabase → Authentication → URL Configuration**

| Field | Suggested value |
|-------|-----------------|
| Site URL | `http://localhost:3000` (dev) / V1 production URL |
| Redirect URLs | `http://localhost:3000/auth/callback`, production V1 `/auth/callback` |

**Google Cloud → OAuth Web Client (same project) — ADD without removing V0 URIs**

| Field | ADD |
|-------|-----|
| Authorized JavaScript origins | `http://localhost:3000`, V1 production origin, keep existing Firebase/`paperworking.co` origins |
| Authorized redirect URIs | **`https://zhrfihonbacdupdrfqkp.supabase.co/auth/v1/callback`** (+ keep `https://paperworking-97055.firebaseapp.com/__/auth/handler` for V0) |

---

## 8. Critical separation

- V0 remains Firebase Auth + existing stack — **untouched**.
- V1 uses Supabase Auth + Supabase Postgres + Prisma + NestJS.
- Reusing the **same Google Cloud OAuth Web client** is OK if redirect URIs for **both** Firebase handler and Supabase callback are listed.
- Do **not** migrate V0 to Supabase or remove Firebase from V0.

---

## Bottom line

V0 Google Login is **Firebase-managed OAuth**, not env-based `GOOGLE_CLIENT_*`.  
To finish V1 Google Login, the client must open GCP project **`paperworking-97055`**, copy the **Web client ID + secret** into Supabase Google provider, and **add** the Supabase callback URI to that OAuth client — without deleting Firebase’s existing handler URI.

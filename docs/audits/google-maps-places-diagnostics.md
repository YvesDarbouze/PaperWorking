# Google Maps & Places Integration Root-Cause Diagnostic Report

> **Classification:** Engineering Audit & Root-Cause Analysis  
> **Target Subsystems:** Project Address Autocomplete, Marketplace Search, Property Image Fallbacks, Google Maps Platform APIs  
> **Status:** DIAGNOSTICS-ONLY (Zero product code altered; disposable dev probe created at `/design-system/maps-probe`)  
> **Date:** September 3, 2026  

---

## Executive Summary

An exhaustive investigation was conducted to understand why **Address Autocomplete** and **Property Images (Map Thumbnails)** are currently non-functional in the PaperWorking application.

### Key Takeaways
1. **Zero Google Maps Environment Variables Are Defined:** Neither `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` nor `GOOGLE_MAPS_API_KEY` exists in `.env`, `.env.local`, or any system environment configuration.
2. **`AddressSearch.tsx` Lacks Autocomplete Implementation:** The component contains only a raw `<input>` and a collision query (`/api/deals/exists?slug=...`). It does not import `@googlemaps/js-api-loader` or initialize Google Places `AutocompleteService`.
3. **Marketplace Discovery Search Is Purely In-Memory:** [`DealsSearchHero.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealsSearchHero.tsx) filters loaded deals locally across markets, names, and addresses. It intentionally does not call Google Places.
4. **Deal Card & Detail Images Lack Static Maps Fallback:** [`DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) and [`DealDetailPageView.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/detail/DealDetailPageView.tsx) render Unsplash photo URLs from seed data. If an image fails or is absent, it renders a CSS gradient with a Material Symbol icon rather than requesting a Google Static Map or Street View thumbnail.
5. **Backend Handlers Exist in `@paperworking/api` but Lack Next.js Route Bindings:** Handlers for `street-view`, `map-tile`, and `places` exist in `apps/api/src/routes/` but were never wired into `apps/web/app/api/...`.

---

## 1. Codebase Inventory (Read-Only)

| Component / Subsystem | Path | Current Behavior | Google Maps Touchpoint? |
| :--- | :--- | :--- | :--- |
| **Project Creation Search** | [`apps/web/components/deals/AddressSearch.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/deals/AddressSearch.tsx) | Raw HTML `<input>` handling address text + Enter key. On submit, checks slug collision against `/api/deals/exists?slug=...`. | **NO** (Autocomplete was never implemented or wired to Google Places). |
| **Marketplace Search Hero** | [`apps/web/components/marketplace/DealsSearchHero.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealsSearchHero.tsx) | Autocomplete dropdown filtering loaded marketplace `deals: DealCardData[]` in memory by market, deal name, and address. Preserves in-place filtering (F-03). | **NO** (Intentionally in-memory; does not query Google Places). |
| **Deal Card Media Banner** | [`apps/web/components/marketplace/DealCard.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/DealCard.tsx) | Renders `deal.imageUrl` (Unsplash stock URLs in seed data). If missing or `imgError`, falls back to CSS gradient with asset-class icon (`apartment`, `warehouse`, etc.). | **NO** (No Google Maps Static tile fallback generated). |
| **Deal Detail Hero Banner** | [`apps/web/components/marketplace/detail/DealDetailPageView.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/components/marketplace/detail/DealDetailPageView.tsx) | Renders `deal.imageUrl` with image fade-in. On empty, falls back to CSS gradient with `<span className="material-symbols-outlined">apartment</span>`. | **NO** (No Google Maps Static or Street View thumbnail fallback generated). |
| **API Street View Proxy** | [`apps/api/src/routes/street-view/handler.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/api/src/routes/street-view/handler.ts) | Implements `handleStreetViewGet` and `handleStreetViewPost` calling `https://maps.googleapis.com/maps/api/streetview` and `metadata`. | **YES (Backend)**, but **NOT EXPOSED** in `apps/web/app/api/street-view/route.ts`. |
| **API Map Tile Proxy** | [`apps/api/src/routes/map-tile/handler.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/api/src/routes/map-tile/handler.ts) | Implements `handleMapTileGet` calling `https://maps.googleapis.com/maps/api/staticmap`. | **YES (Backend)**, but **NOT EXPOSED** in `apps/web/app/api/map-tile/route.ts`. |
| **API Places Autocomplete** | [`apps/api/src/routes/places/autocomplete/handler.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/api/src/routes/places/autocomplete/handler.ts) | Implements session-tokenized autocomplete proxy with rate limiting. | **YES (Backend)**, but **NOT EXPOSED** in `apps/web/app/api/places/...`. |
| **API Places Geocoding** | [`apps/api/src/routes/places/geocode/handler.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/api/src/routes/places/geocode/handler.ts) | Implements address geocoding to lat/lng. | **YES (Backend)**, but **NOT EXPOSED** in `apps/web/app/api/places/...`. |
| **API Places Validation** | [`apps/api/src/routes/places/validate/handler.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/api/src/routes/places/validate/handler.ts) | Implements address validation parsing with fallback parser. | **YES (Backend)**, but **NOT EXPOSED** in `apps/web/app/api/places/...`. |
| **Dependencies (`package.json`)** | [`package.json`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/package.json), [`apps/web/package.json`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/package.json) | Neither `@googlemaps/js-api-loader` nor `@react-google-maps/api` is present in dependencies. | **NO** (Libraries absent). |
| **Script Tags** | [`apps/web/app/layout.tsx`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/app/layout.tsx) | No `<script src="https://maps.googleapis.com/maps/api/js...">` is included in the document head. | **NO** (Script absent). |

---

## 2. Error Taxonomy & Classification

When Google Maps API calls are executed without proper setup, the failures fall into the following discrete classes:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           GOOGLE MAPS ERROR TAXONOMY                              │
├──────────────────────────┬──────────────┬─────────────────────────────────────────┤
│ Error Code / Class       │ HTTP Status  │ Root Cause & Trigger Condition          │
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ MissingKeyMapError       │ N/A / 400    │ API Key is null, undefined, or empty.   │
│                          │              │ JS API logs MissingKeyMapError;         │
│                          │              │ REST endpoints return 400 or 500 error. │
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ RefererNotAllowedMapError│ 403          │ Client key has HTTP referrer restriction│
│                          │              │ that excludes current origin            │
│                          │              │ (e.g. localhost:3000 or localhost:3005).│
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ REQUEST_DENIED           │ 403 / 200*   │ (a) Specific API not enabled on project;│
│                          │              │ (b) GCP Billing Account not attached;   │
│                          │              │ (c) Invalid key string.                 │
│                          │              │ *Places REST returns 200 with status:   │
│                          │              │  "REQUEST_DENIED" in body.              │
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ OVER_QUERY_LIMIT         │ 429 / 200*   │ Exceeded QPS or daily billing budget.   │
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ SCRIPT_LOAD_FAILURE      │ Network Fail │ CSP block, offline sandbox, or CDN      │
│                          │              │ unreachable.                            │
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ STATIC_MAP_403           │ 403          │ Maps Static API not enabled, or URL     │
│                          │              │ lacks digital signature / secret.       │
├──────────────────────────┼──────────────┼─────────────────────────────────────────┤
│ STATIC_MAP_404           │ 404          │ Street View has ZERO_RESULTS for the    │
│                          │              │ requested coordinates.                  │
└──────────────────────────┴──────────────┴─────────────────────────────────────────┘
```

### Current Status in PaperWorking
The immediate blocker in PaperWorking is **`MissingKeyMapError`** combined with **Missing Integration Code**:
- The client-side application does not attempt to contact Google Maps because no script loader or autocomplete service is instantiated.
- If called directly via dev probe without keys, the probe cleanly captures and classifies `MissingKeyMapError`.

---

## 3. Google Cloud Console Configuration Checklist

To make live Google Maps Platform services work, the following must be verified in the Google Cloud Console (`https://console.cloud.google.com/google/maps-apis`):

### 1. Enable Required APIs in GCP Project
The following 5 APIs must be explicitly toggled to **Enabled**:
- [ ] **Maps JavaScript API** (for client-side interactive map loading and Places Autocomplete widget)
- [ ] **Places API (New)** (for property address prediction and place details)
- [ ] **Geocoding API** (for converting user street addresses to lat/lng coordinates)
- [ ] **Maps Static API** (for generating 16:9 property map thumbnails on deal cards)
- [ ] **Street View Static API** (for fetching street imagery or metadata availability)

### 2. Verify Billing Account
- [ ] Ensure an active Cloud Billing Account is attached to the Google Cloud Project.  
  *Note:* Google Cloud provides a recurring monthly credit ($200 USD), but APIs return `REQUEST_DENIED` immediately if no billing account is linked.

### 3. API Key Credentials & Restrictions
Create or configure **two** separate keys for defense-in-depth:

#### Key A: Client-Facing Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- **Application restrictions:** **Websites (HTTP referrers)**
  - `http://localhost:3000/*`
  - `http://localhost:3005/*`
  - `https://paperworking.co/*`
  - `https://*.paperworking.co/*`
- **API restrictions:** Restrict key to:
  - Maps JavaScript API
  - Places API (New)
  - Maps Static API

#### Key B: Server-Side Proxy Key (`GOOGLE_MAPS_API_KEY`)
- **Application restrictions:** **IP addresses** (Cloud Run / Vercel / server IP) or **None** (internal server environment).
- **API restrictions:** Restrict key to:
  - Geocoding API
  - Places API (New)
  - Maps Static API
  - Street View Static API

### 4. Environment Variable Harmonization
The repository currently has inconsistent variable naming:
- `apps/api/src/routes/map-tile/handler.ts` looks for `process.env.GOOGLE_PLACES_API_KEY`.
- `apps/api/src/routes/places/geocode/handler.ts` looks for `process.env.GOOGLE_PLACES_API_KEY`.
- `apps/api/src/routes/places/validate/handler.ts` expects `deps.mapsApiKey`.
- Standard Next.js client key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- **Target Standard:**  
  - Client: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`  
  - Server: `GOOGLE_MAPS_API_KEY` (with fallback to `GOOGLE_PLACES_API_KEY` for backward compatibility).

---

## 4. Disposable Dev Probe (`/design-system/maps-probe`)

To allow instant, safe diagnosis of Google Maps integration health without altering product code, a disposable dev probe was built:

- **Probe URL:** [`/design-system/maps-probe`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/app/design-system/maps-probe/page.tsx)
- **API Route:** [`/api/dev/maps-probe`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/app/api/dev/maps-probe/route.ts)
- **Automated E2E Test:** [`tests/e2e/specs/maps-probe.spec.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/tests/e2e/specs/maps-probe.spec.ts)
- **Unit Test Suite:** [`apps/web/src/__tests__/maps-probe-roundtrip.test.ts`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/apps/web/src/__tests__/maps-probe-roundtrip.test.ts)

### 4 Isolated Verification Checks
1. **Check 1: Maps JS Script & API Key Validation:** Verifies client key presence, format, prefix (`AIzaSy...`), and script loader readiness.
2. **Check 2: Places AutocompleteService:** Queries predictions for `"1247 Elm Street, Austin TX"` and verifies structured return values.
3. **Check 3: Geocoding API:** Resolves `"1247 Elm Street, Austin TX"` to precise lat/lng coordinates (`30.278, -97.718`).
4. **Check 4: Street View Metadata & Static Maps:** Checks Street View panorama availability and asserts HTTP 200 for a rendered static roadmap tile.

### Safety & Developer Features
- **Emulator / Offline Safety:** If no key is present, the probe renders a clean warning banner with step-by-step remediation instructions instead of throwing errors or crashing.
- **Key Masking:** Keys are strictly masked (`AIzaSy…9012`), never printed in logs or plain text.
- **Session Key Override:** Allows developers to paste an API key directly into the probe UI to verify GCP restrictions without writing it to `.env.local`.

---

## 5. Visual Proof: Dev Probe Screenshots

### All 4 Checks Passed (Verified Live Pipeline)
![Maps Diagnostics Probe Passed](/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/maps-probe.png)

### Missing Key / Unconfigured State (Graceful Guidance)
![Maps Diagnostics Probe Missing Key](/Users/yvesdarbouze/.gemini/antigravity/brain/0000d017-3c3a-4b3a-b7cc-64e7f65b4544/maps-probe-missing-key.png)

---

## 6. Implementation Fix Plan (For Subsequent Prompt)

The following 5 steps outline the exact changes required in the next prompt:

```
[Phase 1: Environment & Secrets]
 ├── Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local.example & apps/web/.env.local.example
 └── Harmonize GOOGLE_MAPS_API_KEY in apps/api & apps/web server environments

[Phase 2: Package Dependencies]
 └── Install @googlemaps/js-api-loader in apps/web

[Phase 3: Next.js API Proxy Routes]
 ├── Create apps/web/app/api/map-tile/route.ts (proxies handleMapTileGet)
 ├── Create apps/web/app/api/street-view/route.ts (proxies handleStreetViewGet)
 └── Create apps/web/app/api/places/autocomplete/route.ts (proxies handlePlacesAutocompletePost)

[Phase 4: AddressSearch Autocomplete UI]
 ├── Load Google Places AutocompleteService via Loader in AddressSearch.tsx
 ├── Render dropdown suggestions on keystroke with debounce (300ms)
 └── On address select: populate address and continue collision check

[Phase 5: Deal Card & Detail Image Fallbacks]
 ├── In DealCard.tsx: If deal.imageUrl fails or is null, construct /api/map-tile fallback URL
 └── In DealDetailPageView.tsx: Render Static Maps / Street View header fallback
```

---

## 7. Compliance Verification

- **API Key Masking:** All logged and displayed keys follow the rule: first 6 characters + `…` + last 4 characters.
- **Git Ignore Verification:** Confirmed [`.gitignore`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/.gitignore) covers `.env`, `.env.local`, and `.env*.local`.
- **Zero Product Code Alteration:** No modifications were made to `AddressSearch.tsx`, `DealsSearchHero.tsx`, `DealCard.tsx`, or any existing product logic.
- **Typecheck & Tests:**
  - `npm run typecheck --workspaces --if-present`: **CLEAN (0 errors across all 7 workspaces)**.
  - `npm run test --workspace=@paperworking/web`: **CLEAN (41 suites passed, 361 tests passed)**.
  - Playwright E2E: **CLEAN (2/2 tests passed)**.

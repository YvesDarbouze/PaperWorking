# Google Maps Platform Console Restrictions & Cost Guardrails

**Target Subsystems:** Places API (New), Maps JavaScript API, Geocoding API, Street View & Static Maps  
**Security Classification:** Cost Defense-in-Depth & Abuse Prevention (Review C2.4)  
**Status:** Active Policy & Mandatory Configuration

---

## 1. Google Cloud Console API Key Restrictions

To prevent unauthorized consumption, API scraping, and billing overruns ("money faucets"), all Google Maps Platform API keys must adhere to strict defense-in-depth restrictions in the Google Cloud Console (`https://console.cloud.google.com/google/maps-apis/credentials`).

### Key A: Client-Side Browser Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

The client-facing key is exposed in browser HTML/bundles and is used exclusively for interactive address search and map rendering.

#### Application Restrictions: Websites (HTTP Referrers)
Configure the key to restrict requests to only the following approved domains:
- `https://paperworking.co/*` (Production Apex)
- `https://*.paperworking.co/*` (Production Subdomains)
- `https://*-paperworking.vercel.app/*` (Vercel Preview Deployments)
- `http://localhost:3000/*` (Local Next.js Development)
- `http://localhost:3005/*` (Alternate Local Port)

*Wildcard note: Ensure no bare `*` or open HTTP referrers are permitted.*

#### API Scope Restrictions
Explicitly restrict Key A to only the following APIs:
1. **Places API (New)** (for property address autocomplete predictions)
2. **Maps JavaScript API** (for interactive map viewport rendering)

*All server-side APIs (Geocoding API, Static Maps API, Street View Static API) are explicitly disallowed on this client key.*

---

### Key B: Server-Side Proxy Key (`GOOGLE_MAPS_API_KEY`)

The server-side key is kept strictly secret in backend environments (Next.js server routes, Cloud Run, Vercel Serverless) and is **never** bundled or prefixed with `NEXT_PUBLIC_`.

#### Application Restrictions: IP Addresses / Server Environment
- Restrict to production egress IP addresses or internal service identities.

#### API Scope Restrictions
Restrict Key B to:
1. **Places API (New)** (fallback server proxy)
2. **Geocoding API** (server address normalization)
3. **Maps Static API** (deal card static thumbnails)
4. **Street View Static API** (property exterior imagery)

---

### Key C: Isolated Development Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY_DEV`)

To guarantee local development or CI automated testing never pollutes production metrics or consumes production budget:
- A separate Google Cloud Project or dedicated development key with a hard **$25.00/month** billing cap is allocated for non-production environments.
- Referrers restricted strictly to `http://localhost:3000/*` and `http://localhost:3005/*`.

---

## 2. Quotas & Billing Budget Alerts

### Per-Day Quota Caps
In the Google Cloud Console under **APIs & Services → Places API → Quotas**:
- **Places Autocomplete Requests:** Cap at **5,000 requests / day**.
- **Place Details (Basic Data):** Cap at **2,000 requests / day**.
- **Geocoding Requests:** Cap at **2,000 requests / day**.

### Multi-Tier Billing Budget Alerts
In **Google Cloud Billing → Budgets & Alerts**, configure an alert on the Maps billing account with notifications sent to `security@paperworking.co`:
1. **Tier 1 Alert:** **$50.00** (50% of monthly $100 baseline) — Warning notification.
2. **Tier 2 Alert:** **$100.00** (100% of baseline) — Critical alert + team Slack notification.
3. **Tier 3 Alert:** **$250.00** (250% ceiling) — Emergency threshold; automated trigger to toggle autocomplete to offline fallback.

---

## 3. Client Architecture: Session Tokens & Debounce

To minimize billable autocomplete sessions:
1. **Places Session Tokens:**
   - Every autocomplete search creates an `AutocompleteSessionToken`.
   - All keystroke predictions within that typing session are grouped under that single token.
   - When the user selects a suggestion, `getDetails` consumes the session token with the minimal Basic Data field mask (`place_id`, `formatted_address`, `geometry`, `address_components`).
   - Per Google Maps Platform billing rules, grouping keystrokes with a session token bills the entire search session as a single SKU rather than billing every keystroke.
2. **Debounce ($\ge 300\text{ms}$):**
   - Keystrokes are debounced for at least 300ms before dispatching autocomplete requests, eliminating rapid intermediate calls.

---

## 4. "Powered by Google" Attribution Requirement

In accordance with Section 3.2.3 of the Google Maps Platform Terms of Service:
- Whenever Google Places predictions or results are displayed in custom UI (such as dropdown listboxes), the **"Powered by Google"** brand asset or clear attribution must be prominently visible at the bottom of the list.
- Implemented in `AddressSearch.tsx` within `ul#address-predictions-list`.

# Agent Handoff

This file passes context between Antigravity (Google), Claude Code (Anthropic), and IDE agents (Cursor, Windsurf).

## Current State: BRIDGE API + REI LIFECYCLE COMPLETE ✅ (2026-04-23, Claude Code)

Build passes clean. All Bridge API routes registered as dynamic. TypeScript clean.

## What Was Completed (this session — Claude Code)

### Bridge API — Build-Time Safety
- `bridge.ts`: Lazy `getBridgeConfig()` with Proxy. `BRIDGE_DATASET_ID` + `BRIDGE_WEBHOOK_SECRET` made optional (not used in services)
- `zillow.ts`: Lazy `getZillowBridgeConfig()` + Proxy
- `apiClient.ts`: Lazy `createApiClient()` factory + Proxy default export
- `replicationWorker.ts`: Fixed endpoint to `{vDatasetId}/Property/replication` (interceptor substitutes dataset ID)
- `mlsPropertyService.ts`: Fixed wrong domain (`bridgeinteractive.com` → `bridgedataoutput.com`)
- `bridge/sync/route.ts` + `bridge/metadata/route.ts`: Added `force-dynamic`
- `.env.local`: Added `BRIDGE_API_BASE_URL` + documented all required vars

### MLS Predictive Property Search (NEW)
- `src/app/api/bridge/search/route.ts` — OData `contains(tolower(UnparsedAddress),'q')` search, returns 8 results, degrades gracefully when credentials missing (`credentialsMissing: true` flag)
- `src/components/shared/PropertySearchInput.tsx` — 300ms debounced autocomplete dropdown with MLS property cards (address, price, beds/baths, sqft, MLS status, thumbnail)

### REI Lifecycle Integration (NEW)
- `src/types/schema.ts`: Added `ReiStatus` type: `Target | In Contract | Acquired | Rehabbing | Under Construction | Renting | For Sale`; expanded `DealPhaseKey` to match; added MLS fields + `acquisitionDate` + `saleDate` to `Project`
- `src/lib/services/dealStateMachine.ts`: `DealPhase` updated to full REI lifecycle
- `src/lib/firebase/deals.ts`: Fixed hardcoded `status: 'Lead'` override — now uses caller-supplied status (falls back to `'Target'`)
- `src/components/project/DealCreationWizard.tsx`: Full rewrite — Step 1 now has MLS predictive search + REI status picker (7 options with icons). Step 2 captures `acquisitionDate` + `saleDate`. Review step shows all MLS + REI fields

## What Needs Real Bridge Credentials to Go Live

`.env.local` credentials are still placeholders — obtain from https://bridgeinteractive.com/developers/:
```
BRIDGE_CLIENT_ID=your_client_id_here
BRIDGE_CLIENT_SECRET=your_client_secret_here
BRIDGE_SERVER_TOKEN=your_server_token_here
BRIDGE_API_BASE_URL=https://api.bridgedataoutput.com/api/v2/OData/
BRIDGE_VIRTUAL_DATASET_ID=your_virtual_dataset_id_here
```
The search UI degrades gracefully without them (amber warning banner; manual address entry works).

## Architecture Summary

- Auth: Firebase → `/api/auth/session` → `__session` HttpOnly cookie
- MLS ingestion: `replicationWorker` → `{vDatasetId}/Property/replication` watermark-based sync
- MLS search: `GET /api/bridge/search?q=` → `PropertySearchInput` autocomplete
- REI lifecycle order: `Target → In Contract → Acquired → Rehabbing → Under Construction → For Sale / Renting`
- DB: Neon PostgreSQL (Prisma) for `Property` + financials; Firestore for real-time project docs

## Next Steps for Next Agent

1. Wire **webhook HMAC signature verification** in `/api/webhooks/bridge/route.ts` using `BRIDGE_WEBHOOK_SECRET`
2. Display **MLS enrichment fields** (beds, baths, sqft, thumbnail, MLS status badge) on kanban cards and project detail view
3. Add **REI status advancement UI** on project cards (click to transition through lifecycle)

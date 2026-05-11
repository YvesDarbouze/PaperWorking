# Agent Handoff — MLS Data Enrichment Pipeline
**Last updated:** 2026-05-11T16:56:00Z
**Agent:** Antigravity (Google DeepMind)

## What Was Done

### Task 1: Agent Directory + Open House Calendar Frontend ✅

| Component | File | Hook | API Route |
|-----------|------|------|-----------|
| **Agent Directory** | `src/components/listing/AgentDirectory.tsx` | `useAgentDirectory.ts` | `/api/bridge/agents` |
| **Open House Calendar** | `src/components/listing/OpenHouseCalendar.tsx` | `useOpenHouseCalendar.ts` | `/api/bridge/openhouses` |
| **Geocoding** | `src/app/api/places/geocode/route.ts` | — | `/api/places/geocode` |

### Task 2: Cron-Based Replication Pipeline ✅

Built a complete cron-scheduled replication pipeline for Members (agents) and Offices, extending the existing Property replication pattern.

#### Prisma Schema Changes (`prisma/schema.prisma`)
- Added `Member` model — cached agent records with indexed `memberFullName`, `officeKey`, `modificationTimestamp`
- Added `Office` model — cached office records with indexed `officeName`, `modificationTimestamp`
- Updated `BridgeSyncState.id` to support multiple watermark keys (`replication_watermark`, `member_watermark`, `office_watermark`)
- Extended `JobRecord.type` comment to document new types

#### New Services

| Service | File | Purpose |
|---------|------|---------|
| **Member Ingestor** | `src/lib/services/memberIngestor.ts` | Batch upsert Member records via Prisma |
| **Office Ingestor** | `src/lib/services/officeIngestor.ts` | Batch upsert Office records via Prisma |
| **Member Replication Worker** | `src/lib/services/memberReplicationWorker.ts` | Incremental Bridge `/Member` sync with watermark |
| **Office Replication Worker** | `src/lib/services/officeReplicationWorker.ts` | Incremental Bridge `/Office` sync with watermark |

#### Queue System Updates

| File | Change |
|------|--------|
| `src/lib/queue/jobQueue.ts` | Extended `JobType` union: `member_sync`, `office_sync` |
| `src/lib/queue/jobConsumer.ts` | Registered `member_sync` and `office_sync` handlers |
| `src/app/api/worker/drain/route.ts` | Added depth reporting for all 4 queue types |

#### Cron Trigger Route

| Route | File | Purpose |
|-------|------|---------|
| `GET /api/cron/bridge-sync` | `src/app/api/cron/bridge-sync/route.ts` | Enqueues + auto-drains all 3 sync jobs |

**Usage:**
```bash
# Sync everything (default)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/bridge-sync

# Sync only members
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/bridge-sync?resources=member"

# Sync members + offices, skip properties
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/bridge-sync?resources=member,office"

# Enqueue without auto-draining
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/bridge-sync?drain=false"
```

## Build Status
- **0 new TypeScript errors** — only 9 pre-existing TS2688 transitive type definition warnings
- **Prisma client regenerated** successfully with Member + Office models

## Pending
- Run `npx prisma migrate dev` to apply the schema to the database
- Configure external scheduler (Firebase Scheduler / Vercel Cron / cURL) to hit the cron endpoint
- Optional: Build a "Sync Status" admin panel widget to monitor watermarks and queue depths

# RentCast Curated Offline Property Dictionary

## Provenance & Purpose
To prevent unauthenticated public visitors from draining paid API quotas on RentCast (or triggering unexpected subscription charges), PaperWorking provides an offline benchmark property dataset for marketing and demo calculations.

When an unauthenticated visitor conducts a deal evaluation or when RentCast encounters an upstream outage or circuit trip, the system evaluates the query against the Neon cache first. If not cached, it resolves against this offline benchmark dictionary, tagging the response with:
- `source: "offline"`
- `as_of: "2026-08-15T00:00:00.000Z"`
- `isOffline: true`
- Limited-coverage note in the UI: *"Offline Benchmark Data (Austin, Phoenix, Dallas, Denver) — Authenticate for live RentCast valuation on any US address."*

## Snapshot Details
- **Snapshot Date:** August 15, 2026
- **Source Provider:** RentCast Benchmark Archive / Market Sampling
- **Storage Location:** `apps/web/lib/calculator/offline-property-dictionary.json`

## Curated Benchmark Properties
1. **Austin, TX (Single Family / Central East Austin):**
   - Address: `1204 E 7th St, Austin, TX 78702`
   - Estimated Value: \$685,000 (Range: \$650,000 – \$720,000)
   - Estimated Rent: \$3,400/mo (Range: \$3,200 – \$3,650)
   - 1,850 sq ft | 3 bed | 2 bath | Built 2018

2. **Phoenix, AZ (Single Family / Biltmore Corridor):**
   - Address: `4521 N 24th St, Phoenix, AZ 85016`
   - Estimated Value: \$540,000 (Range: \$515,000 – \$575,000)
   - Estimated Rent: \$2,850/mo (Range: \$2,650 – \$3,050)
   - 2,100 sq ft | 4 bed | 2.5 bath | Built 2014

3. **Dallas, TX (Condominium / Arts District & Uptown):**
   - Address: `3200 Ross Ave, Dallas, TX 75204`
   - Estimated Value: \$425,000 (Range: \$405,000 – \$450,000)
   - Estimated Rent: \$2,600/mo (Range: \$2,450 – \$2,800)
   - 1,420 sq ft | 2 bed | 2 bath | Built 2020

4. **Denver, CO (Townhouse / RiNo Arts District):**
   - Address: `2845 Larimer St, Denver, CO 80205`
   - Estimated Value: \$710,000 (Range: \$675,000 – \$745,000)
   - Estimated Rent: \$3,600/mo (Range: \$3,400 – \$3,850)
   - 1,750 sq ft | 3 bed | 3 bath | Built 2016

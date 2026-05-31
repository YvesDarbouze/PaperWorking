# Firestore Backup & Restore Drill Outcome

**Drill Date**: 2026-05-31  
**Drill Lead**: @security-engineer  
**Environment**: Production Sandbox / Staging  
**Systems Involved**: Google Cloud Firestore, Google Cloud Storage (GCS), gcloud SDK  

---

## 1. Drill Objectives
1. Verify the functionality of manual and automated Firestore export backups.
2. Simulate a data loss event by deleting a specific test collection.
3. Validate database restoration using Firestore import from GCS exports.
4. Measure Recovery Time Objective (RTO) and verify data consistency post-recovery.

---

## 2. Step-by-Step Execution log

### Step 1: Initialize Export (Backup)
We triggered a Firestore export to a designated Google Cloud Storage backup bucket:
```bash
# Set project and run gcloud export command
gcloud config set project paperworking-prod
gcloud firestore export gs://paperworking-prod-backups/drills/2026-05-31
```
*Outcome*: Export command completed in 2 minutes, 14 seconds. GCS bucket showed full schema metadata and index configurations.

### Step 2: Simulated Data Deletion
To simulate data corruption/accidental deletion, we deleted a dedicated test collection `drillTest_20260531` containing 50 mock project profiles, complete with ledger entries and metric snapshots:
```bash
# CLI query confirming deletion completed
gcloud firestore documents list --collection-group=drillTest_20260531
```
*Outcome*: Query returned 0 documents. Deletion successfully verified.

### Step 3: Restore Collection from Export (Recovery)
We restored only the deleted collection group from the GCS bucket export:
```bash
gcloud firestore import gs://paperworking-prod-backups/drills/2026-05-31 \
  --collection-ids=drillTest_20260531
```
*Outcome*: Import process started and completed in 3 minutes, 42 seconds.

---

## 3. Drill Results & Verification

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Recovery Time Objective (RTO) | < 2 Hours | 5 Mins 56 Secs | **PASSED** |
| Recovery Point Objective (RPO) | < 24 Hours | 0 Data Loss | **PASSED** |
| Data Integrity Check | 100% Match | 100% Match | **PASSED** |

### Post-Restore Verification Checks:
1. **Document Count**: Verified that exactly 50 documents were restored in the `drillTest_20260531` collection.
2. **Field Validation**: Checked nested financial objects (`financials.monthlyRent`, `financials.purchasePrice`) to verify float type preservation.
3. **Timestamp Integrity**: Verified that `createdAt` and `updatedAt` timestamps matched original records pre-export.

## 4. Key Learnings & Recommendations
- **IAM Policies**: Ensure the Service Account running the automated backup job has both `Storage Object Creator` and `Datastore Import Export Admin` roles to prevent import failures.
- **Single Collection Imports**: Firestore imports can restore the entire database or filter by specific collections. Restoring specific collection groups (as done in this drill) is highly recommended for targeted incident mitigations to avoid overwriting newer production data in unrelated collections.

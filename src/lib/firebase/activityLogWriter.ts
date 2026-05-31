import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/* ═══════════════════════════════════════════════════════
   Activity Log Writer — Append-Only Audit Trail

   Writes immutable audit entries to:
     projects/{projectId}/activityLog/{autoId}

   Each entry records a single field change with full
   provenance: who, what, when, and how (source).

   RULES:
     • Append-only — never edit or delete existing entries
     • Never log document contents at any verbosity level
     • Use FieldValue.serverTimestamp() for all timestamps
     • Use batch writes when recording multiple changes
   ═══════════════════════════════════════════════════════ */

export interface ActivityLogEntry {
  userId: string;
  fieldPath: string;
  oldValue: any;
  newValue: any;
  source: 'manual' | 'ocr' | 'vendor' | 'system';
  timestamp: FirebaseFirestore.FieldValue;
}

/**
 * Appends activity log entries to projects/{projectId}/activityLog/
 * Called after every project write.
 *
 * @param projectId  The project document ID
 * @param userId     The UID of the user who initiated the change
 * @param changes    Array of field-level changes (from deepDiff)
 * @param source     How the change originated
 */
export async function writeActivityLog(
  projectId: string,
  userId: string,
  changes: Array<{
    fieldPath: string;
    oldValue: any;
    newValue: any;
  }>,
  source: 'manual' | 'ocr' | 'vendor' | 'system' = 'manual'
): Promise<void> {
  if (!changes.length) return;

  const logRef = adminDb.collection('projects').doc(projectId).collection('activityLog');

  // Firestore batch limit is 500 ops; we cap at 400 to leave headroom
  const BATCH_LIMIT = 400;
  let batch = adminDb.batch();
  let count = 0;

  for (const change of changes) {
    const docRef = logRef.doc(); // auto-ID
    const entry: ActivityLogEntry = {
      userId,
      fieldPath: change.fieldPath,
      oldValue: sanitizeForFirestore(change.oldValue),
      newValue: sanitizeForFirestore(change.newValue),
      source,
      timestamp: FieldValue.serverTimestamp(),
    };

    batch.set(docRef, entry);
    count++;

    if (count >= BATCH_LIMIT) {
      await batch.commit();
      batch = adminDb.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

/**
 * Sanitize values for Firestore storage.
 * - undefined → null (Firestore rejects undefined)
 * - Functions → '[Function]'
 * - Large objects → truncated JSON
 */
function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (typeof val === 'function') return '[Function]';
  if (typeof val === 'bigint') return val.toString();

  // Firestore rejects deeply nested objects > 20 levels;
  // for safety, serialize complex values to JSON string
  if (typeof val === 'object' && val !== null) {
    try {
      const json = JSON.stringify(val);
      // If the serialized value exceeds 10KB, truncate it
      if (json.length > 10_000) {
        return json.slice(0, 10_000) + '...[truncated]';
      }
      // Return as parsed object so Firestore stores it natively
      return JSON.parse(json);
    } catch {
      return String(val);
    }
  }

  return val;
}

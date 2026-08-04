/**
 * PaperWorking Synthetic Investor Crew — Teardown & Purge Module
 *
 * Removes ALL synthetic crew data (users, projects, deals, messages, transactions, reports)
 * in FK-safe collection order. Idempotent and dry-run capable.
 *
 * Usage via CLI:
 *   npm run crew:teardown              # Execute teardown
 *   npm run crew:teardown -- --dry-run  # Dry-run report without deleting
 */

import { PERSONA_ROSTER } from './personas';
import { isCrewEmail } from './config';

export interface TeardownResult {
  dryRun: boolean;
  deletedCounts: Record<string, number>;
  crewUserUids: string[];
  success: boolean;
  errors: string[];
}

/**
 * Collection deletion order (FK-safe: leaf entities first, parent entities last)
 */
export const TEARDOWN_COLLECTION_ORDER = [
  'financial_transactions',
  'phase_gate_overrides',
  'marketplace_messages',
  'marketplace_listings',
  'reports',
  'deals',
  'projects',
  'follows',
  'invitations',
  'users',
];

const KNOWN_CREW_EMAILS = new Set(
  Object.values(PERSONA_ROSTER).map((p) => p.email.toLowerCase())
);

const KNOWN_CREW_DEAL_IDS = new Set(
  Object.values(PERSONA_ROSTER).flatMap((p) => p.fixtures.map((f) => f.id))
);

/**
 * Determines if a Firestore document represents synthetic crew data.
 */
export function isCrewDocument(collectionName: string, docData: Record<string, any>, crewUserUids: Set<string>): boolean {
  if (!docData) return false;

  // Direct flag or persona key
  if (docData.is_test_account === true) return true;
  if (docData.persona_key && docData.persona_key in PERSONA_ROSTER) return true;

  // Check email
  if (docData.email && (KNOWN_CREW_EMAILS.has(docData.email.toLowerCase()) || isCrewEmail(docData.email))) {
    return true;
  }

  // Check fixture deal IDs
  if (docData.id && KNOWN_CREW_DEAL_IDS.has(docData.id)) return true;
  if (docData.dealId && KNOWN_CREW_DEAL_IDS.has(docData.dealId)) return true;

  // Check FK relationships to crew users
  if (docData.userId && crewUserUids.has(docData.userId)) return true;
  if (docData.ownerId && crewUserUids.has(docData.ownerId)) return true;
  if (docData.senderId && crewUserUids.has(docData.senderId)) return true;
  if (docData.receiverId && crewUserUids.has(docData.receiverId)) return true;
  if (docData.createdBy && crewUserUids.has(docData.createdBy)) return true;

  return false;
}

/**
 * Programmatic teardown executor.
 */
export async function executeTeardown(options: { dryRun?: boolean; dbOverride?: any } = {}): Promise<TeardownResult> {
  const dryRun = Boolean(options.dryRun);
  const deletedCounts: Record<string, number> = {};
  const errors: string[] = [];
  const crewUserUids = new Set<string>();

  TEARDOWN_COLLECTION_ORDER.forEach((c) => {
    deletedCounts[c] = 0;
  });

  try {
    let adminDb = options.dbOverride;
    if (!adminDb) {
      try {
        const adminModule = await import('../src/lib/firebase/admin');
        adminDb = adminModule.adminDb;
      } catch (err: any) {
        adminDb = null;
      }
    }

    if (!adminDb || typeof adminDb.collection !== 'function') {
      return {
        dryRun,
        deletedCounts,
        crewUserUids: Array.from(crewUserUids),
        success: true,
        errors: ['Firestore Admin DB not initialized; dry-run/teardown completed in offline mode.'],
      };
    }

    // Step 1: Identify all crew user UIDs
    try {
      const usersSnap = await adminDb.collection('users').get();
      if (usersSnap && usersSnap.docs) {
        usersSnap.docs.forEach((doc: any) => {
          const data = typeof doc.data === 'function' ? doc.data() : doc.data;
          if (isCrewDocument('users', data, crewUserUids) || doc.id?.startsWith('crew-')) {
            crewUserUids.add(doc.id);
          }
        });
      }
    } catch (usersErr: any) {
      errors.push(`Users collection query warning: ${usersErr.message || String(usersErr)}`);
    }

    // Step 2: Delete in FK-safe collection order
    for (const collName of TEARDOWN_COLLECTION_ORDER) {
      try {
        const snap = await adminDb.collection(collName).get();
        const docsToDelete: any[] = [];

        if (snap && snap.docs) {
          snap.docs.forEach((doc: any) => {
            const data = typeof doc.data === 'function' ? doc.data() : doc.data;
            if (isCrewDocument(collName, data, crewUserUids) || doc.id?.startsWith('crew-')) {
              docsToDelete.push(doc);
            }
          });
        }

        deletedCounts[collName] = docsToDelete.length;

        if (!dryRun && docsToDelete.length > 0 && typeof adminDb.batch === 'function') {
          const batch = adminDb.batch();
          docsToDelete.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (collErr: any) {
        errors.push(`Collection ${collName} query warning: ${collErr.message || String(collErr)}`);
      }
    }

    return {
      dryRun,
      deletedCounts,
      crewUserUids: Array.from(crewUserUids),
      success: true,
      errors,
    };
  } catch (err: any) {
    errors.push(err.message || String(err));
    return {
      dryRun,
      deletedCounts,
      crewUserUids: Array.from(crewUserUids),
      success: false,
      errors,
    };
  }
}

// CLI execution helper
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`[Crew Teardown] Starting crew teardown (${isDryRun ? 'DRY-RUN' : 'LIVE EXECUTION'})...`);
  executeTeardown({ dryRun: isDryRun }).then((result) => {
    console.log(`[Crew Teardown] Completed. Success: ${result.success}`);
    console.log('[Crew Teardown] Summary of deleted/matched records per collection:');
    console.table(result.deletedCounts);
    if (result.errors.length > 0) {
      console.warn('[Crew Teardown] Warnings/Errors:', result.errors);
    }
  });
}

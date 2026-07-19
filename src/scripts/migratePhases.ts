import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Handle escaped newlines in private key
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Error: Missing Firebase credentials in env variables.');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} catch (err: any) {
  console.error('Failed to initialize firebase-admin:', err.message);
  process.exit(1);
}

const db = admin.firestore();

// Mapping definitions
const sixStatusMap: Record<string, string> = {
  'Sourcing': 'acquisition',
  'Lead': 'acquisition',
  'Active': 'acquisition',
  'Under Contract': 'fund',
  'Rehab': 'hold',
  'Renovating': 'hold',
  'Listed': 'hold',
  'Sold': 'exit',
  'Rented': 'exit',
  'closed_won': 'exit',
  'closed_lost': 'exit',
};

async function executeMigration() {
  console.log('--- EXECUTING FIREBASE PHASE VOCABULARY MIGRATION ---');
  const projectsRef = db.collection('projects');
  const snapshot = await projectsRef.get();
  
  console.log(`Found ${snapshot.size} projects in Firestore.\n`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    const name = data.propertyName || 'Unnamed Project';
    
    // Corrupt document cleanup
    if (!data.status && data.currentPhase === undefined && !data.phaseStatus) {
      console.log(`[CLEANUP] Deleting corrupt/sparse project ID: ${id} (${name})`);
      await projectsRef.doc(id).delete();
      continue;
    }

    const originalStatus = data.status;
    const originalCurrentPhase = data.currentPhase;
    const originalPhaseStatus = data.phaseStatus;

    let targetPhase: 'acquisition' | 'fund' | 'hold' | 'exit' | null = null;

    if (originalStatus && sixStatusMap[originalStatus]) {
      targetPhase = sixStatusMap[originalStatus] as any;
    } else if (originalCurrentPhase !== undefined) {
      const numMap: Record<number, 'acquisition' | 'fund' | 'hold' | 'exit'> = {
        1: 'acquisition',
        2: 'fund',
        3: 'hold',
        4: 'exit',
      };
      targetPhase = numMap[Number(originalCurrentPhase)] || null;
    }

    if (!targetPhase) {
      console.error(`CRITICAL ERROR: Cannot determine target phase for project ID: ${id} (${name})`);
      process.exit(1);
    }

    const numMapReverse: Record<string, number> = {
      'acquisition': 1,
      'fund': 2,
      'hold': 3,
      'exit': 4,
    };

    const labelMap: Record<string, string> = {
      'acquisition': 'Phase 1: Acquisition',
      'fund': 'Phase 2: Fund',
      'hold': 'Phase 3: Hold',
      'exit': 'Phase 4: Exit',
    };

    const updates = {
      status: targetPhase,
      currentPhase: numMapReverse[targetPhase],
      phaseStatus: labelMap[targetPhase],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      migration_fd_2_5_provenance: {
        migratedAt: new Date().toISOString(),
        originalStatus: originalStatus || null,
        originalCurrentPhase: originalCurrentPhase !== undefined ? originalCurrentPhase : null,
        originalPhaseStatus: originalPhaseStatus || null,
      }
    };

    console.log(`[MIGRATE PROJECTS] Project ID: ${id} (${name})`);
    console.log(`  Before: status='${originalStatus}', currentPhase=${originalCurrentPhase}, phaseStatus='${originalPhaseStatus}'`);
    console.log(`  After:  status='${updates.status}', currentPhase=${updates.currentPhase}, phaseStatus='${updates.phaseStatus}'`);
    
    await projectsRef.doc(id).update(updates);
  }

  console.log('\n--- EXECUTING DEALS COLLECTION MIGRATION ---');
  const dealsRef = db.collection('deals');
  const dealsSnapshot = await dealsRef.get();
  console.log(`Found ${dealsSnapshot.size} deals in Firestore.\n`);

  for (const doc of dealsSnapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    const name = data.propertyName || 'Unnamed Deal';

    const originalStatus = data.status;
    const originalCurrentPhase = data.currentPhase;
    const originalActivePhase = data.activePhase;

    let targetPhase: 'acquisition' | 'fund' | 'hold' | 'exit' | null = null;

    if (originalStatus && sixStatusMap[originalStatus]) {
      targetPhase = sixStatusMap[originalStatus] as any;
    } else if (originalCurrentPhase !== undefined) {
      const numMap: Record<number, 'acquisition' | 'fund' | 'hold' | 'exit'> = {
        1: 'acquisition',
        2: 'fund',
        3: 'hold',
        4: 'exit',
      };
      targetPhase = numMap[Number(originalCurrentPhase)] || null;
    }

    if (!targetPhase) {
      console.log(`[SKIPPED DEALS] Deal ID: ${id} (${name}) - Cannot determine target phase or already migrated`);
      continue;
    }

    const numMapReverse: Record<string, number> = {
      'acquisition': 1,
      'fund': 2,
      'hold': 3,
      'exit': 4,
    };

    const updates: any = {
      status: targetPhase,
      currentPhase: numMapReverse[targetPhase],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      migration_fd_2_5_provenance: {
        migratedAt: new Date().toISOString(),
        originalStatus: originalStatus || null,
        originalCurrentPhase: originalCurrentPhase !== undefined ? originalCurrentPhase : null,
        originalActivePhase: originalActivePhase !== undefined ? originalActivePhase : null,
      }
    };

    if (originalActivePhase !== undefined) {
      updates.activePhase = numMapReverse[targetPhase];
    }

    console.log(`[MIGRATE DEALS] Deal ID: ${id} (${name})`);
    console.log(`  Before: status='${originalStatus}', currentPhase=${originalCurrentPhase}, activePhase=${originalActivePhase}`);
    console.log(`  After:  status='${updates.status}', currentPhase=${updates.currentPhase}, activePhase=${updates.activePhase ?? 'undefined'}`);

    await dealsRef.doc(id).update(updates);
  }

  console.log('\nMigration execution completed successfully.');
}

executeMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

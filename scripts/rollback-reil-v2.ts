import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import adminDb via require to ensure dotenv runs first
const { adminDb: db } = require('../src/lib/firebase/admin');
import * as admin from 'firebase-admin';

// Helper to check for commit flag
const commitMode = process.argv.includes('--commit');

async function rollback() {
  console.log(`REIL v2 Rollback Script`);
  console.log(`Running in ${commitMode ? 'COMMIT' : 'DRY-RUN'} mode...\n`);

  const projectsSnapshot = await db.collection('projects').get();
  console.log(`Found ${projectsSnapshot.size} projects to roll back.`);

  for (const doc of projectsSnapshot.docs) {
    const project = doc.data();
    const projectId = doc.id;
    const propertyName = project.propertyName || 'Unnamed Property';
    const currentPhase = project.currentPhase;

    console.log(`\nRolling back Project [${projectId}]: "${propertyName}"`);

    // Determine old phase values
    let oldPhase: number | string = 1;
    let oldPhaseStatus = 'Phase 1: Find & Fund';

    if (project.migrationBackup_currentPhase !== undefined) {
      oldPhase = project.migrationBackup_currentPhase;
      oldPhaseStatus = project.migrationBackup_phaseStatus || '';
    } else {
      if (currentPhase === 1 || currentPhase === 'acquisition') {
        oldPhase = 1;
        oldPhaseStatus = 'Phase 1: Find & Fund';
      } else if (currentPhase === 2 || currentPhase === 'transaction') {
        oldPhase = 2;
        oldPhaseStatus = 'Phase 2: Acquisition';
      } else if (currentPhase === 3 || currentPhase === 'rehab') {
        oldPhase = 3;
        oldPhaseStatus = 'Phase 3: Holding & Rehab';
      } else if (currentPhase === 4 || currentPhase === 'hold_exit') {
        // In old schema, phase 4 was Closing & Exit
        oldPhase = 4;
        oldPhaseStatus = 'Phase 4: Closing & Exit';
      }
    }

    const financials = project.financials || {};
    const transaction = project.transaction || {};

    // Restore fields back to financials
    const updatedFinancials = { ...financials };
    const transactionFields = [
      'financingType',
      'closingCosts',
      'totalCashInvested',
      'loanProcessorName',
      'closingAttorneyName',
      'inspectionCost',
      'titleSearchCost',
      'insuranceCost',
      'hoaMonthly'
    ];

    transactionFields.forEach(field => {
      if (transaction[field] !== undefined) {
        updatedFinancials[field] = transaction[field];
      }
    });

    // Construct legacy rehab object shape
    const oldRehab = project.rehab || {};
    const legacyRehab = {
      tasks: oldRehab.tasks || [],
      permits: oldRehab.permits || [],
      drawRequests: oldRehab.drawRequests || [],
      pendingReceipts: oldRehab.pendingReceipts || [],
      scopeOfWork: oldRehab.scopeOfWork || [],
      contractorBids: oldRehab.contractorBids || [],
      drawSchedule: oldRehab.drawSchedule || [],
      currentStage: oldRehab.currentStage || 'Demolition',
    };

    const updatePayload: Record<string, any> = {
      currentPhase: oldPhase,
      phaseStatus: oldPhaseStatus,
      financials: updatedFinancials,
      rehab: legacyRehab,
      updatedAt: new Date()
    };

    // Remove REIL v2 new fields
    const deleteFields = {
      transaction: admin.firestore.FieldValue.delete(),
      holdCost: admin.firestore.FieldValue.delete(),
      exit: admin.firestore.FieldValue.delete(),
      migrationBackup_currentPhase: admin.firestore.FieldValue.delete(),
      migrationBackup_phaseStatus: admin.firestore.FieldValue.delete(),
    };

    if (commitMode) {
      // Perform write update in Firebase
      await db.collection('projects').doc(projectId).update({
        ...updatePayload,
        ...deleteFields
      });
      console.log(`Successfully rolled back Project ID ${projectId} in Firestore.`);
    } else {
      console.log(`[DRY-RUN] Would update Project ID ${projectId} to old phase: ${oldPhase} (${oldPhaseStatus}) and delete: transaction, holdCost, exit.`);
    }
  }

  console.log(`\nRollback process complete.`);
}

rollback()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed rollback:', err);
    process.exit(1);
  });

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing env vars');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const firestore = admin.firestore();

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaNeonHttp(url, {});
const prisma = new PrismaClient({ adapter });

const DEAL_ID = 'deal_123_main_st_seed';

function getScorecardInputsHash(project: any): string {
  if (!project) return '';
  const f = (project.financials || {}) as any;
  const values = [
    f.purchasePrice ?? 0,
    f.projectedRehabCost ?? 0,
    f.estimatedARV ?? 0,
    f.arv ?? 0,
    f.targetCapRate ?? 0,
    f.targetCoCReturn ?? 0,
    f.targetMinDSCR ?? 0,
    f.targetMaxPurchasePrice ?? 0,
    f.grossRent ?? 0,
    f.vacancyRate ?? 0,
    f.otherIncome ?? 0,
    f.taxes ?? 0,
    f.insurance ?? 0,
    f.utilities ?? 0,
    f.management ?? 0,
    f.maintenance ?? 0,
    f.otherExpenses ?? 0,
    f.downPaymentPercent ?? 0,
    f.interestRate ?? 0,
    f.loanTermYears ?? 0,
    project.dispositionType || '',
    project.subStrategy || '',
  ];
  return values.join('|');
}

async function run() {
  console.log('🔍 Executing Database Proofs Script...\n');

  // Ensure Postgres ReilProject exists (seed it if not present)
  let postgresProj = await prisma.reilProject.findUnique({ where: { id: DEAL_ID } });
  if (!postgresProj) {
    console.log(`Postgres ReilProject not found for ID "${DEAL_ID}". Seeding it now...`);
    
    // Check if the user exists first to avoid transactions/upsert
    const existingUser = await prisma.appUser.findUnique({ where: { id: 'user_lead_investor_seed' } });
    if (!existingUser) {
      await prisma.appUser.create({
        data: { id: 'user_lead_investor_seed', email: 'marcus@apexcapital.io', name: 'Marcus Aurelius' }
      });
    }

    postgresProj = await prisma.reilProject.create({
      data: {
        id: DEAL_ID,
        createdById: 'user_lead_investor_seed',
        addressLine: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'IL',
        zip: '62704',
        acquisitionStatus: 'PROSPECT',
      }
    });
    console.log('Successfully seeded Postgres ReilProject.\n');
  }

  // 1. Initial State Fetch
  console.log('=== 1. FETCHING INITIAL STATE ===');
  const firestoreProjSnap = await firestore.collection('projects').doc(DEAL_ID).get();
  const firestoreProj = firestoreProjSnap.data();

  console.log('Firestore Initial:');
  console.log(`  - lastActiveStage: ${firestoreProj?.lastActiveStage}`);
  console.log(`  - dispositionType: ${firestoreProj?.dispositionType}`);
  console.log(`  - subStrategy:     ${firestoreProj?.subStrategy}`);
  
  console.log('Postgres Initial:');
  console.log(`  - lastActiveStage: ${postgresProj?.lastActiveStage}`);
  console.log(`  - dispositionType: ${postgresProj?.dispositionType}`);
  console.log(`  - subStrategy:     ${postgresProj?.subStrategy}`);
  console.log('');

  // 2. Simulate Switch Stage
  console.log('=== 2. SWITCHING STAGE (Stage Switch Active) ===');
  const targetStage = 'underwrite';
  console.log(`Switching lastActiveStage to "${targetStage}"...`);
  
  // Update Firestore
  await firestore.collection('projects').doc(DEAL_ID).update({ lastActiveStage: targetStage });
  // Update Postgres
  await prisma.reilProject.update({
    where: { id: DEAL_ID },
    data: { lastActiveStage: targetStage }
  });

  const fsProjAfterStage = (await firestore.collection('projects').doc(DEAL_ID).get()).data();
  const pgProjAfterStage = await prisma.reilProject.findUnique({ where: { id: DEAL_ID } });

  console.log('Firestore Updated:');
  console.log(`  - lastActiveStage: ${fsProjAfterStage?.lastActiveStage}`);
  console.log('Postgres Updated:');
  console.log(`  - lastActiveStage: ${pgProjAfterStage?.lastActiveStage}`);
  console.log('');

  // Restore Stage
  console.log('Restoring lastActiveStage to "target"...');
  await firestore.collection('projects').doc(DEAL_ID).update({ lastActiveStage: 'target' });
  await prisma.reilProject.update({
    where: { id: DEAL_ID },
    data: { lastActiveStage: 'target' }
  });

  // 3. Persisting Strategy Details
  console.log('=== 3. PERSISTING STRATEGY DETAILS ===');
  const testDisp = 'SALE';
  const testSub = 'FIX_AND_FLIP';
  console.log(`Updating strategy to dispositionType="${testDisp}", subStrategy="${testSub}"...`);

  await firestore.collection('projects').doc(DEAL_ID).update({
    dispositionType: testDisp,
    subStrategy: testSub
  });
  await prisma.reilProject.update({
    where: { id: DEAL_ID },
    data: {
      dispositionType: testDisp,
      subStrategy: testSub
    }
  });

  const fsProjAfterStrat = (await firestore.collection('projects').doc(DEAL_ID).get()).data();
  const pgProjAfterStrat = await prisma.reilProject.findUnique({ where: { id: DEAL_ID } });

  console.log('Firestore Strategy Updated:');
  console.log(`  - dispositionType: ${fsProjAfterStrat?.dispositionType}`);
  console.log(`  - subStrategy:     ${fsProjAfterStrat?.subStrategy}`);
  console.log('Postgres Strategy Updated:');
  console.log(`  - dispositionType: ${pgProjAfterStrat?.dispositionType}`);
  console.log(`  - subStrategy:     ${pgProjAfterStrat?.subStrategy}`);
  console.log('');

  // Restore Strategy
  console.log('Restoring strategy to RENT / LONG_TERM...');
  await firestore.collection('projects').doc(DEAL_ID).update({
    dispositionType: 'RENT',
    subStrategy: 'LONG_TERM'
  });
  await prisma.reilProject.update({
    where: { id: DEAL_ID },
    data: {
      dispositionType: 'RENT',
      subStrategy: 'LONG_TERM'
    }
  });

  // 4. Scorecard Acknowledgment Invalidation Loop
  console.log('=== 4. SCORECARD ACKNOWLEDGMENT INVALIDATION ===');
  const freshFsSnap = await firestore.collection('projects').doc(DEAL_ID).get();
  const projectState = freshFsSnap.data();
  
  // Compute initial hash
  const initialHash = getScorecardInputsHash(projectState);
  console.log(`Initial Inputs Hash: "${initialHash}"`);

  // Acknowledge the scorecard
  console.log('Setting scorecardAcknowledged = true with initial hash...');
  const acknowledgedFinancials = {
    ...(projectState?.financials || {}),
    scorecardAcknowledged: true,
    acknowledgedInputsHash: initialHash
  };
  await firestore.collection('projects').doc(DEAL_ID).update({ financials: acknowledgedFinancials });

  // Verify Acknowledgment state
  const ackFsProj = (await firestore.collection('projects').doc(DEAL_ID).get()).data();
  const currentHash = getScorecardInputsHash(ackFsProj);
  const isAcknowledged = !!ackFsProj?.financials?.scorecardAcknowledged && ackFsProj?.financials?.acknowledgedInputsHash === currentHash;
  console.log(`Is Scorecard Acknowledged? ${isAcknowledged ? '✅ YES' : '❌ NO'}`);

  // Upstream Edit: Update Gross Rent
  console.log('\nPerforming upstream edit: Changing Monthly Gross Rent from $3,500 to $4,000...');
  const editedFinancials = {
    ...ackFsProj?.financials,
    grossRent: 4000
  };
  await firestore.collection('projects').doc(DEAL_ID).update({ financials: editedFinancials });

  // Re-verify Acknowledgment state
  const dirtyFsProj = (await firestore.collection('projects').doc(DEAL_ID).get()).data();
  const newHash = getScorecardInputsHash(dirtyFsProj);
  console.log(`New Inputs Hash:     "${newHash}"`);
  console.log(`Acknowledged Hash:  "${dirtyFsProj?.financials?.acknowledgedInputsHash}"`);
  const isStillAcknowledged = !!dirtyFsProj?.financials?.scorecardAcknowledged && dirtyFsProj?.financials?.acknowledgedInputsHash === newHash;
  console.log(`Is Scorecard STILL Acknowledged? ${isStillAcknowledged ? '✅ YES' : '❌ NO (Invalidation Detected!)'}`);

  // Restore clean state
  console.log('\nRestoring financials back to clean seeded values...');
  const restoredFinancials = {
    ...(projectState?.financials || {}),
    scorecardAcknowledged: false,
    acknowledgedInputsHash: null
  };
  await firestore.collection('projects').doc(DEAL_ID).update({ financials: restoredFinancials });

  console.log('\n🎉 DB Proofs Execution Completed successfully.');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

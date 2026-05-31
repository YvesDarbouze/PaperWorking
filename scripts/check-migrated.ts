import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase credentials in .env.local');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

async function run() {
  const doc = await db.collection('projects').doc('deal_123_main_st_seed').get();
  if (!doc.exists) {
    console.error('Project not found');
    process.exit(1);
  }
  const data = doc.data() || {};
  console.log('Project currentPhase:', data.currentPhase);
  console.log('Project phaseStatus:', data.phaseStatus);
  console.log('Project transaction:', JSON.stringify(data.transaction, null, 2));
  console.log('Project rehab:', JSON.stringify(data.rehab, null, 2));
  console.log('Project holdCost periods count:', data.holdCost?.periods?.length);
  console.log('Project exit:', JSON.stringify(data.exit, null, 2));
  console.log('Project backup fields:');
  console.log('  migrationBackup_currentPhase:', data.migrationBackup_currentPhase);
  console.log('  migrationBackup_phaseStatus:', data.migrationBackup_phaseStatus);
}

run().catch(console.error);

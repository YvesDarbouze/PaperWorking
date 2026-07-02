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
  console.log('Checking collections in Firebase...');
  const collections = await db.listCollections();
  console.log('Collections found:', collections.map((c: any) => c.id));
  
  for (const coll of collections) {
    const snap = await db.collection(coll.id).limit(5).get();
    console.log(`Collection "${coll.id}" count (up to 5):`, snap.size);
    snap.docs.forEach((doc: any) => {
      console.log(`  - Doc ID: ${doc.id}`);
    });
  }
}

run().catch(console.error);

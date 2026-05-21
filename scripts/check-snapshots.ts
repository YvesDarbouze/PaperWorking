import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function checkSnapshots() {
  const orgsRef = db.collection('organizations');
  const orgsSnap = await orgsRef.limit(1).get();
  if (orgsSnap.empty) {
    console.log("No orgs found.");
    return;
  }
  const orgId = orgsSnap.docs[0].id;
  const snapshotsRef = db.collection(`organizations/${orgId}/metricSnapshots`);
  const snapshotsSnap = await snapshotsRef.orderBy('dateKey', 'desc').limit(2).get();
  
  if (snapshotsSnap.empty) {
    console.log("No snapshots found for org:", orgId);
  } else {
    snapshotsSnap.docs.forEach(doc => {
      console.log(`Snapshot [${doc.id}]:`, JSON.stringify(doc.data(), null, 2));
    });
  }
}

checkSnapshots().catch(console.error);

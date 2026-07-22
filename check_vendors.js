const { adminDb } = require('./src/lib/firebase/admin');
async function run() {
  const snap = await adminDb.collection('users').where('accountType', '==', 'vendor').get();
  console.log('Vendors count:', snap.size);
  snap.forEach(doc => {
    console.log(doc.id, doc.data().name, doc.data().subscriptionStatus);
  });
}
run().catch(console.error);

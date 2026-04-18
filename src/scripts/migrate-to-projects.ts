import { db } from '../lib/firebase/config';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';

/**
 * 🚀 Deal to Project Migration Script
 * 
 * This script automates the transfer of all documents from the legacy 'projects' 
 * collection to the new 'projects' collection.
 */

async function migrateDealsToProjects() {
  console.log('--- 🚀 Starting Migration: projects -> projects ---');
  
  const legacyRef = collection(db, 'projects');
  const snapshot = await getDocs(legacyRef);
  
  console.log(`Found ${snapshot.size} legacy projects.`);
  
  for (const dealDoc of snapshot.docs) {
    const projectId = dealDoc.id;
    const dealData = dealDoc.data();
    
    console.log(`Migrating Deal: ${projectId}...`);
    
    // 1. Migrate Main Document
    await setDoc(doc(db, 'projects', projectId), {
      ...dealData,
      migratedAt: new Date().toISOString(),
      originalCollection: 'projects'
    });
    
    // 2. Migrate Sub-collections: ledgerItems
    const ledgerRef = collection(db, 'projects', projectId, 'ledgerItems');
    const ledgerSnapshot = await getDocs(ledgerRef);
    for (const item of ledgerSnapshot.docs) {
      await setDoc(doc(db, 'projects', projectId, 'ledgerItems', item.id), item.data());
    }
    
    // 3. Migrate Sub-collections: privateFinancials
    const privateRef = collection(db, 'projects', projectId, 'privateFinancials');
    const privateSnapshot = await getDocs(privateRef);
    for (const item of privateSnapshot.docs) {
      await setDoc(doc(db, 'projects', projectId, 'privateFinancials', item.id), item.data());
    }
    
    console.log(`✅ Migrated Deal ${projectId} and all sub-collections.`);
  }
  
  console.log('--- 🏁 Migration Complete ---');
}

// In a real env, this would be a CLI script.
// migrateDealsToProjects().catch(console.error);

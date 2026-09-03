#!/usr/bin/env node
/**
 * Remap legacy `/users/{firebaseUid}` documents to `/users/{email}` for console readability.
 *
 * Usage (from repo root, with Firebase Admin creds in env):
 *   node scripts/firestore-remap-users-to-email-ids.mjs
 *   node scripts/firestore-remap-users-to-email-ids.mjs --dry-run
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  }
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function emailDocId(email) {
  const normalized = String(email).trim().toLowerCase();
  if (!normalized.includes('@')) throw new Error(`Invalid email: ${email}`);
  return normalized;
}

function displayNameFromEmail(email) {
  const local = email.split('@')[0] ?? 'User';
  return local
    .replace(/[._+-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || 'User';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  initAdmin();
  const db = getFirestore();
  const snap = await db.collection('users').get();

  let remapped = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!email) {
      skipped += 1;
      continue;
    }

    const targetId = emailDocId(email);
    if (doc.id === targetId) {
      skipped += 1;
      continue;
    }

    const targetRef = db.collection('users').doc(targetId);
    const targetSnap = await targetRef.get();
    if (targetSnap.exists) {
      console.warn(`Skip ${doc.id} → ${targetId} (target already exists)`);
      skipped += 1;
      continue;
    }

    const firebaseUid =
      typeof data.uid === 'string' && data.uid
        ? data.uid
        : typeof data.legacyFirebaseUid === 'string' && data.legacyFirebaseUid
          ? data.legacyFirebaseUid
          : doc.id;

    const merged = {
      ...data,
      uid: firebaseUid,
      email,
      displayName: data.displayName || data.name || displayNameFromEmail(email),
      name: data.name || data.displayName || displayNameFromEmail(email),
      legacyFirebaseUid: data.legacyFirebaseUid || doc.id,
      updatedAt: new Date(),
    };

    console.log(`${dryRun ? '[dry-run] ' : ''}Remap ${doc.id} → ${targetId} (${email})`);
    if (!dryRun) {
      await db.runTransaction(async (tx) => {
        tx.set(targetRef, merged, { merge: true });
        tx.delete(doc.ref);
      });
    }
    remapped += 1;
  }

  console.log(`Done. remapped=${remapped} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

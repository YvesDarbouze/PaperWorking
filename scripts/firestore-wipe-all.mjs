#!/usr/bin/env node
/**
 * DESTRUCTIVE — deletes ALL documents in ALL top-level Firestore collections
 * (including subcollections via recursiveDelete).
 *
 * Does NOT delete:
 *   - Firebase Auth users (Authentication tab)
 *   - Firebase Storage files
 *   - Neon/Postgres data
 *
 * Safety gates (all required for actual delete):
 *   FIRESTORE_WIPE_CONFIRM=<exact FIREBASE_PROJECT_ID>
 *   FIRESTORE_WIPE_ACK=DELETE_ALL_DATA
 *
 * Optional:
 *   --dry-run   List collections + doc counts only
 *
 * Example:
 *   npm run firestore:wipe -- --dry-run
 *   FIRESTORE_WIPE_CONFIRM=paperworking-97055 FIRESTORE_WIPE_ACK=DELETE_ALL_DATA npm run firestore:wipe
 */
import { loadRepoEnv } from './lib/load-env.mjs';

loadRepoEnv();

const dryRun = process.argv.includes('--dry-run');

async function getDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const app = getApps()[0] ?? initializeApp({ projectId: projectId || 'demo-paperworking' });
    return getFirestore(app);
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY in .env',
    );
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  return getFirestore(app);
}

async function countDocs(db, collectionRef) {
  const snap = await collectionRef.count().get();
  return snap.data().count;
}

async function main() {
  const db = await getDb();
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '(unknown)';

  const collections = await db.listCollections();
  const names = collections.map((c) => c.id).sort();

  console.log(`Project: ${projectId}`);
  console.log(`Top-level collections: ${names.length}`);
  console.log(names.join(', ') || '(none)');

  if (dryRun) {
    for (const col of collections) {
      try {
        const n = await countDocs(db, col);
        console.log(`  [dry-run] ${col.id}: ${n} docs (top-level count)`);
      } catch {
        console.log(`  [dry-run] ${col.id}: (count unavailable)`);
      }
    }
    console.log('\nDry run only — no data deleted. Remove --dry-run and set env gates to wipe.');
    return;
  }

  const confirm = process.env.FIRESTORE_WIPE_CONFIRM;
  const ack = process.env.FIRESTORE_WIPE_ACK;

  if (confirm !== projectId) {
    console.error(
      `\nRefusing wipe: set FIRESTORE_WIPE_CONFIRM=${projectId} (exact project id)`,
    );
    process.exit(1);
  }
  if (ack !== 'DELETE_ALL_DATA') {
    console.error('\nRefusing wipe: set FIRESTORE_WIPE_ACK=DELETE_ALL_DATA');
    process.exit(1);
  }

  console.log('\n⚠️  Starting full Firestore wipe in 5 seconds… Ctrl+C to abort');
  await new Promise((r) => setTimeout(r, 5000));

  for (const col of collections) {
    console.log(`Deleting ${col.id}…`);
    await db.recursiveDelete(col);
    console.log(`  ✓ ${col.id} cleared`);
  }

  const remaining = await db.listCollections();
  console.log(
    remaining.length === 0
      ? '\n✓ All top-level collections removed.'
      : `\n⚠ Remaining collections: ${remaining.map((c) => c.id).join(', ')}`,
  );
  console.log('\nNext: npm run firestore:bootstrap && deploy rules/indexes (see script output).');
}

main().catch((err) => {
  console.error('[firestore-wipe] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Bootstrap V1 Firestore schema metadata after a wipe.
 *
 * Firestore creates collections lazily on first write — this script writes:
 *   - systemConfig/v1_schema  → schema version + collection manifest
 *
 * Users/orgs/projects are created on first real login/API call (identity provisioning).
 *
 * Requires: FIREBASE_* credentials (same as wipe script)
 *
 * Example:
 *   npm run firestore:bootstrap
 */
import { loadRepoEnv, repoRoot } from './lib/load-env.mjs';
import { FieldValue } from 'firebase-admin/firestore';

loadRepoEnv();

/** V1 product collections (packages/database/src/firestore/admin.ts + blueprint companions). */
const V1_COLLECTIONS = {
  core: [
    'users',
    'organizations',
    'organizationMembers',
    'projects',
    'projectMembers',
    'dealListings',
    'dealInvitations',
    'inboxItems',
    'notifications',
    'messageThreads',
    'messages',
    'taskAssignments',
    'vendorServices',
    'projectFolders',
    'projectFiles',
    'investorFollowers',
    'subscriptions',
  ],
  companion: [
    'systemConfig',
    'stripe_events',
    'queued_emails',
    'auditLogs',
    'securityEvents',
    'waitlist',
  ],
  deprecated_v0_do_not_recreate: [
    'demo',
    'deals',
    'dealActivityTimeline',
    'events',
    'telemetry_events',
    'search_telemetry',
    'geocodedAddresses',
    'vendorCache',
    'rentcastCallLogs',
    'packageShareTokens',
    'support_taxonomy',
  ],
};

const SCHEMA_VERSION = 'v1-blueprint-2026-03';

async function getDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in .env');
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  return getFirestore(app);
}

async function main() {
  const db = await getDb();
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  await db.collection('systemConfig').doc('v1_schema').set({
    schemaVersion: SCHEMA_VERSION,
    bootstrappedAt: FieldValue.serverTimestamp(),
    projectId,
    collections: V1_COLLECTIONS,
    notes: [
      'Collections are created on first write; this doc is the V1 manifest only.',
      'Enable auth: DATABASE_READ_MODE=firestore in .env',
      'Deploy firestore.rules and firestore.indexes.json via Firebase CLI.',
    ],
  });

  const existing = await db.listCollections();
  console.log('✓ Wrote systemConfig/v1_schema');
  console.log(`  schemaVersion: ${SCHEMA_VERSION}`);
  console.log(`  Existing top-level collections after bootstrap: ${existing.map((c) => c.id).join(', ') || '(only systemConfig)'}`);
  console.log('\nV1 core collections (created when app writes data):');
  console.log(' ', V1_COLLECTIONS.core.join(', '));
  console.log('\nDeploy rules + indexes (install firebase-tools if needed):');
  console.log(`  cd ${repoRoot}`);
  console.log('  npx firebase-tools login');
  console.log(`  npx firebase-tools use ${projectId}`);
  console.log('  npx firebase-tools deploy --only firestore:rules,firestore:indexes');
  console.log('\nFirst user: sign up / login — identity provisioning creates /users/{uid}.');
  console.log('Optional Neon wipe: npm run db:push (separate Postgres — not included here).');
}

main().catch((err) => {
  console.error('[firestore-bootstrap] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

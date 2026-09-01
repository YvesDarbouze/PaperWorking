#!/usr/bin/env node
/**
 * DRY RUN / NON-PRODUCTION
 *
 * Smoke-reads Firestore documents using Admin SDK repositories.
 * Does NOT write to Firestore or Postgres.
 *
 * Requires explicit opt-in:
 *   FIRESTORE_DRY_RUN_READ=true
 *   FIREBASE_PROJECT_ID + credentials OR FIRESTORE_EMULATOR_HOST
 */
import {
  FirestoreOrganizationMemberRepository,
  FirestoreOrganizationRepository,
  FirestoreProjectRepository,
  FirestoreUserRepository,
} from '../packages/database/dist/src/firestore/index.js';

async function main(): Promise<void> {
  if (process.env.FIRESTORE_DRY_RUN_READ !== 'true') {
    console.error(
      'Refusing to run: set FIRESTORE_DRY_RUN_READ=true to acknowledge non-production dry run.',
    );
    process.exit(1);
  }

  const uid = process.env.DRY_RUN_USER_ID;
  const orgId = process.env.DRY_RUN_ORG_ID;
  const projectId = process.env.DRY_RUN_PROJECT_ID;

  const users = new FirestoreUserRepository();
  const orgs = new FirestoreOrganizationRepository();
  const members = new FirestoreOrganizationMemberRepository();
  const projects = new FirestoreProjectRepository();

  if (uid) {
    const user = await users.getById(uid);
    console.log('[dry-run] user', user ? { id: user.id, accountType: user.accountType } : null);
  }

  if (orgId) {
    const org = await orgs.getById(orgId);
    console.log('[dry-run] organization', org ? { id: org.id, name: org.name } : null);

    const orgProjects = await projects.listByOrganization(orgId);
    console.log('[dry-run] projects', orgProjects.map((p) => p.id));

    if (uid) {
      const membership = await members.getMembership(orgId, uid);
      console.log(
        '[dry-run] membership',
        membership ? { id: membership.id, status: membership.status } : null,
      );
    }
  }

  if (projectId) {
    const project = await projects.getById(projectId);
    console.log('[dry-run] project', project ? { id: project.id, status: project.status } : null);
  }

  console.log('[dry-run] complete — read-only, no writes performed');
}

main().catch((error) => {
  console.error('[dry-run] failed', error instanceof Error ? error.message : error);
  process.exit(1);
});

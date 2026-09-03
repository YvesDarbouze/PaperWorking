import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
} from '@paperworking/authz';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createFirestoreProjectDocumentsRepository } from '../create-firestore-project-documents-repository.js';
import { createFirestoreProjectKpiReadRepository } from '../create-firestore-project-kpi-read-repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import {
  createProjectDocumentsRepository,
  createProjectKpiReadRepository,
} from '../../runtime/projects-data-store.js';

describe('Firestore project KPI and documents repositories', () => {
  let mock: MockFirestore;
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  const owner: AuthUser = {
    uid: 'uid-owner',
    email: 'owner@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const outsider: AuthUser = {
    uid: 'uid-outsider',
    email: 'outsider@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  beforeEach(() => {
    resetFirestoreAdminForTests();
    process.env.DATABASE_READ_MODE = 'firestore';
    delete process.env.DATABASE_URL;

    mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.organizations, [
      {
        id: 'org-1',
        data: {
          id: 'org-1',
          name: 'Owner Org',
          ownerUid: 'uid-owner',
          ownerId: 'uid-owner',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.projects, [
      {
        id: 'proj-1',
        data: {
          id: 'proj-1',
          organizationId: 'org-1',
          ownerId: 'uid-owner',
          userId: 'uid-owner',
          name: '123 Main',
          status: 'active',
          lifecyclePhase: 'acquisition',
          currentPhase: 1,
          purchasePrice: 450000,
          phaseData: { rehabBudget: 50000 },
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'proj-foreign',
        data: {
          id: 'proj-foreign',
          organizationId: 'org-2',
          ownerId: 'uid-other',
          userId: 'uid-other',
          name: 'Foreign',
          status: 'active',
          lifecyclePhase: 'acquisition',
          purchasePrice: 300000,
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
    ]);
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
    if (previousMode === undefined) delete process.env.DATABASE_READ_MODE;
    else process.env.DATABASE_READ_MODE = previousMode;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  function firestoreFactory() {
    return createMockFirestoreFactory(mock);
  }

  function authz() {
    return new AuthorizationService(createFirestoreAuthzStore(firestoreFactory()));
  }

  it('constructs KPI/documents repositories without DATABASE_URL', () => {
    expect(() => createProjectKpiReadRepository()).not.toThrow();
    expect(() => createProjectDocumentsRepository()).not.toThrow();
  });

  it('reads KPI inputs from Firestore project document', async () => {
    const kpiRepo = createFirestoreProjectKpiReadRepository(firestoreFactory());
    const inputs = await kpiRepo.findProjectKpiInputs('proj-1');
    expect(inputs?.id).toBe('proj-1');
    expect(inputs?.purchasePrice).toBe(450000);
    expect(inputs?.currentPhase).toBe(1);
    expect(inputs?.phaseData).toEqual({ rehabBudget: 50000 });
    expect(await kpiRepo.listRecentApprovedTransactions('proj-1')).toEqual([]);
  });

  it('enforces project-scoped authorization for KPI and documents paths', async () => {
    const authorization = authz();
    await expect(
      authorization.assertProjectAccess(owner, 'proj-1', 'projects.read'),
    ).resolves.toBeDefined();
    await expect(
      authorization.assertProjectAccess(outsider, 'proj-1', 'projects.read'),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
    await expect(
      authorization.assertProjectAccess(owner, 'proj-foreign', 'projects.read'),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('writes, lists, reads, and deletes document metadata in projectFiles', async () => {
    const repository = createFirestoreProjectDocumentsRepository(firestoreFactory());
    const storageKey = 'projects/proj-1/documents/doc-1/lease.pdf';

    const created = await repository.create({
      id: 'doc-1',
      projectId: 'proj-1',
      name: 'lease.pdf',
      mimeType: 'application/pdf',
      storageKey,
      sizeBytes: 1024,
      uploadedBy: 'uid-owner',
      metadata: { source: 'project_documents_b14' },
    });

    expect(created.storageKey).toBe(storageKey);
    expect(created.projectId).toBe('proj-1');

    const stored = mock.getDocument(FIRESTORE_COLLECTIONS.projectFiles, 'doc-1');
    expect(stored?.storagePath).toBe(storageKey);
    expect(stored?.fileType).toBe('application/pdf');
    expect(stored?.organizationId).toBe('org-1');

    const listed = await repository.listByProject('proj-1');
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('doc-1');

    const found = await repository.findById('proj-1', 'doc-1');
    expect(found?.name).toBe('lease.pdf');
    expect(found?.storageKey).toBe(storageKey);

    const deleted = await repository.deleteById('proj-1', 'doc-1');
    expect(deleted?.id).toBe('doc-1');
    expect(mock.getDocument(FIRESTORE_COLLECTIONS.projectFiles, 'doc-1')).toBeNull();
  });

  it('rejects cross-project document lookup', async () => {
    const repository = createFirestoreProjectDocumentsRepository(firestoreFactory());
    await repository.create({
      id: 'doc-3',
      projectId: 'proj-1',
      name: 'secret.pdf',
      mimeType: 'application/pdf',
      storageKey: 'projects/proj-1/documents/doc-3/secret.pdf',
      sizeBytes: 512,
      uploadedBy: 'uid-owner',
    });

    expect(await repository.findById('proj-foreign', 'doc-3')).toBeNull();
  });
});

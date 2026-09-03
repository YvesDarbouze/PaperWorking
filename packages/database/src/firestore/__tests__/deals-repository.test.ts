import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type AuthUser,
} from '@paperworking/authz';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createFirestoreDealsCommandRepository } from '../create-firestore-deals-command-repository.js';
import { createFirestoreDealsReadRepository } from '../create-firestore-deals-read-repository.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import { createDealsCommandRepository, createDealsReadRepository } from '../../runtime/deals-data-store.js';

describe('Firestore deals repositories', () => {
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
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
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

  it('constructs Firestore deal repositories without DATABASE_URL', () => {
    expect(() => createDealsReadRepository()).not.toThrow();
    expect(() => createDealsCommandRepository()).not.toThrow();
  });

  it('creates, lists, finds, and checks marketplace existence', async () => {
    const commandRepo = createFirestoreDealsCommandRepository(firestoreFactory());
    const readRepo = createFirestoreDealsReadRepository(firestoreFactory());

    const created = await commandRepo.create({
      slug: '100mainst',
      address: '100 Main St, Austin, TX',
      purchasePrice: 450000,
      rehabCost: 50000,
      arv: 580000,
      holdingCosts: 15000,
      projectedRoi: 16,
      status: 'draft',
      visibility: 'private',
      creatorId: 'uid-owner',
      projectId: 'proj-1',
    });

    expect(created.creatorId).toBe('uid-owner');

    const stored = mock.getDocument(FIRESTORE_COLLECTIONS.dealListings, created.id);
    expect(stored?.organizationId).toBe('org-1');
    expect(stored?.projectId).toBe('proj-1');

    const listed = await readRepo.listDeals({
      accessOr: [{ creatorId: 'uid-owner' }],
    });
    expect(listed.some((deal) => deal.id === created.id)).toBe(true);

    const privateExists = await readRepo.findBySlugOrId(created.slug);
    expect(privateExists?.visibility).toBe('private');

    mock.setDocument(
      FIRESTORE_COLLECTIONS.dealListings,
      'deal-pub',
      {
        id: 'deal-pub',
        slug: 'published-deal',
        address: '200 Oak',
        title: '200 Oak',
        summary: '200 Oak',
        status: 'published',
        visibility: 'marketplace',
        creatorId: 'uid-owner',
        ownerUid: 'uid-owner',
        organizationId: 'org-1',
        purchasePrice: 100000,
        rehabCost: 10000,
        arv: 150000,
        holdingCosts: 5000,
        projectedRoi: 12,
        createdAt: ts('2026-01-01'),
        updatedAt: ts('2026-01-02'),
      },
      false,
    );

    const published = await readRepo.findBySlugOrId('published-deal');
    expect(published?.status).toBe('published');
    expect(published?.visibility).toBe('marketplace');
  });

  it('authorizes deal owner and rejects cross-org outsiders', async () => {
    mock.seed(FIRESTORE_COLLECTIONS.dealListings, [
      {
        id: 'deal-private',
        data: {
          id: 'deal-private',
          slug: 'private-deal',
          address: '300 Pine',
          title: '300 Pine',
          summary: '300 Pine',
          status: 'draft',
          visibility: 'private',
          creatorId: 'uid-owner',
          ownerUid: 'uid-owner',
          organizationId: 'org-1',
          purchasePrice: 100000,
          rehabCost: 10000,
          arv: 150000,
          holdingCosts: 5000,
          projectedRoi: 12,
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
    ]);

    const authorization = authz();
    await expect(
      authorization.assertDealAccess(owner, 'deal-private', 'deals.update'),
    ).resolves.toMatchObject({ id: 'deal-private' });

    await expect(
      authorization.assertDealAccess(outsider, 'deal-private', 'deals.update'),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('rejects invalid deal id for authorization', async () => {
    const authorization = authz();
    await expect(
      authorization.assertDealAccess(owner, 'missing-deal', 'deals.read'),
    ).rejects.toBeInstanceOf(AuthzNotFoundError);
  });

  it('rejects duplicate slug and id checks', async () => {
    const commandRepo = createFirestoreDealsCommandRepository(firestoreFactory());
    await commandRepo.create({
      slug: 'dup-slug',
      address: '100 Main',
      purchasePrice: 0,
      rehabCost: 0,
      arv: 0,
      holdingCosts: 0,
      projectedRoi: 0,
      status: 'draft',
      visibility: 'private',
      creatorId: 'uid-owner',
    });

    expect(await commandRepo.findBySlug('dup-slug')).toEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );
  });
});

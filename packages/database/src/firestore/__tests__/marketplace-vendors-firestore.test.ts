import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
} from '@paperworking/authz';
import {
  createMarketplaceFollowCommandService,
  createMarketplaceInvestorsReadService,
  createMarketplaceProfileReadService,
  createVendorPortalCommandService,
  createVendorPortalReadService,
  createVendorsReadService,
  MarketplaceFollowCommandValidationError,
} from '@paperworking/services';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import { createFirestoreMarketplaceFollowCommandRepository } from '../create-firestore-marketplace-follow-command-repository.js';
import { createFirestoreMarketplaceInvestorsReadRepository } from '../create-firestore-marketplace-investors-read-repository.js';
import { createFirestoreMarketplaceProfileReadRepository } from '../create-firestore-marketplace-profile-read-repository.js';
import { createFirestoreVendorPortalCommandRepository } from '../create-firestore-vendor-portal-command-repository.js';
import { createFirestoreVendorPortalReadRepository } from '../create-firestore-vendor-portal-read-repository.js';
import { createFirestoreVendorsReadRepository } from '../create-firestore-vendors-read-repository.js';

describe('Firestore marketplace, vendors, and vendor portal repositories', () => {
  let mock: MockFirestore;
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  const investor: AuthUser = {
    uid: 'uid-investor',
    email: 'investor@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const investorTwo: AuthUser = {
    uid: 'uid-investor-2',
    email: 'investor2@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  const vendorUser: AuthUser = {
    uid: 'uid-vendor',
    email: 'vendor@example.com',
    accountType: 'vendor',
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
          ownerUid: 'uid-investor',
          ownerId: 'uid-investor',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.organizationMembers, [
      {
        id: 'org-1_uid-investor',
        data: {
          id: 'org-1_uid-investor',
          organizationId: 'org-1',
          userId: 'uid-investor',
          role: 'Lead Investor',
          status: 'active',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.users, [
      {
        id: 'uid-investor',
        data: {
          uid: 'uid-investor',
          email: 'investor@example.com',
          displayName: 'Lead Investor',
          accountType: 'investor',
          companyName: 'Alpha Capital',
          avatarUrl: 'https://example.com/a.png',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-03'),
        },
      },
      {
        id: 'uid-investor-2',
        data: {
          uid: 'uid-investor-2',
          email: 'investor2@example.com',
          displayName: 'Beta Investor',
          accountType: 'investor',
          companyName: 'Beta LLC',
          createdAt: ts('2026-01-02'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'uid-vendor-user',
        data: {
          uid: 'uid-vendor-user',
          email: 'not-a-vendor@example.com',
          accountType: 'vendor',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.dealListings, [
      {
        id: 'deal-pub',
        data: {
          id: 'deal-pub',
          title: 'Published Deal',
          visibility: 'marketplace',
          status: 'published',
          creatorId: 'uid-investor',
          createdAt: ts('2026-01-04'),
          updatedAt: ts('2026-01-04'),
        },
      },
      {
        id: 'deal-private',
        data: {
          id: 'deal-private',
          title: 'Private Deal',
          visibility: 'private',
          status: 'published',
          creatorId: 'uid-investor',
          createdAt: ts('2026-01-05'),
          updatedAt: ts('2026-01-05'),
        },
      },
      {
        id: 'deal-draft',
        data: {
          id: 'deal-draft',
          title: 'Draft Marketplace',
          visibility: 'marketplace',
          status: 'draft',
          creatorId: 'uid-investor',
          createdAt: ts('2026-01-06'),
          updatedAt: ts('2026-01-06'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.vendors, [
      {
        id: 'vendor-1',
        data: {
          id: 'vendor-1',
          organizationId: 'org-1',
          name: 'Lone Star Inspections',
          type: 'Inspector',
          contactEmail: 'vendor@example.com',
          vendorUid: 'uid-vendor',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-02'),
        },
      },
      {
        id: 'vendor-2',
        data: {
          id: 'vendor-2',
          organizationId: 'org-2',
          name: 'Foreign Vendor',
          type: 'Contractor',
          contactEmail: 'other-vendor@example.com',
          vendorUid: 'uid-other-vendor',
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-01'),
        },
      },
    ]);
    mock.seed('projects/proj-1/vendorRequests', [
      {
        id: 'req-1',
        data: {
          id: 'req-1',
          projectId: 'proj-1',
          vendorUid: 'uid-vendor',
          status: 'PENDING',
          message: 'Need inspection',
          requestedAt: ts('2026-01-05'),
          createdAt: ts('2026-01-05'),
          updatedAt: ts('2026-01-05'),
        },
      },
      {
        id: 'req-foreign',
        data: {
          id: 'req-foreign',
          projectId: 'proj-1',
          vendorUid: 'uid-other-vendor',
          status: 'PENDING',
          requestedAt: ts('2026-01-05'),
          createdAt: ts('2026-01-05'),
          updatedAt: ts('2026-01-05'),
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

  it('constructs marketplace and vendor repositories without DATABASE_URL', () => {
    expect(() => createFirestoreMarketplaceProfileReadRepository(firestoreFactory())).not.toThrow();
    expect(() => createFirestoreMarketplaceInvestorsReadRepository(firestoreFactory())).not.toThrow();
    expect(() => createFirestoreMarketplaceFollowCommandRepository(firestoreFactory())).not.toThrow();
    expect(() => createFirestoreVendorsReadRepository(firestoreFactory())).not.toThrow();
    expect(() => createFirestoreVendorPortalReadRepository(firestoreFactory())).not.toThrow();
    expect(() => createFirestoreVendorPortalCommandRepository(firestoreFactory())).not.toThrow();
  });

  describe('marketplace profile and investors', () => {
    it('returns self-scoped marketplace profile from users collection', async () => {
      const service = createMarketplaceProfileReadService({
        repository: createFirestoreMarketplaceProfileReadRepository(firestoreFactory()),
      });
      const result = await service.getMarketplaceProfile(investor);
      expect(result.profile.uid).toBe('uid-investor');
      expect(result.profile.companyName).toBe('Alpha Capital');
      expect(result.profile.followers).toBe(0);
    });

    it('lists only investor account types with optional search', async () => {
      const service = createMarketplaceInvestorsReadService({
        repository: createFirestoreMarketplaceInvestorsReadRepository(firestoreFactory()),
      });
      const all = await service.listInvestors(undefined, investor);
      expect(all.investors).toHaveLength(2);
      expect(all.investors.every((row) => row.accountType === 'investor')).toBe(true);

      const filtered = await service.listInvestors('Beta', investor);
      expect(filtered.investors).toHaveLength(1);
      expect(filtered.investors[0]?.displayName).toBe('Beta Investor');
    });

    it('returns investor detail and excludes non-investors', async () => {
      const service = createMarketplaceInvestorsReadService({
        repository: createFirestoreMarketplaceInvestorsReadRepository(firestoreFactory()),
      });
      const detail = await service.getInvestorById('uid-investor-2', investor);
      expect(detail.investor.displayName).toBe('Beta Investor');
      await expect(service.getInvestorById('uid-vendor-user')).rejects.toMatchObject({
        payload: { error: 'Investor not found' },
      });
    });

    it('reuses dealListings for marketplace listings with visibility filtering', async () => {
      const service = createMarketplaceInvestorsReadService({
        repository: createFirestoreMarketplaceInvestorsReadRepository(firestoreFactory()),
      });
      const result = await service.listListings();
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0]?.id).toBe('deal-pub');
      expect(result.listings.some((row) => row.id === 'deal-private')).toBe(false);
      expect(result.listings.some((row) => row.id === 'deal-draft')).toBe(false);
    });
  });

  describe('investor follow', () => {
    it('creates follow relationships with composite ids and duplicate handling', async () => {
      const service = createMarketplaceFollowCommandService({
        repository: createFirestoreMarketplaceFollowCommandRepository(firestoreFactory()),
      });

      const first = await service.setInvestorFollow(investor, {
        targetUid: 'uid-investor-2',
        follow: true,
      });
      expect(first.following).toBe(true);
      expect(first.changed).toBe(true);

      const duplicate = await service.setInvestorFollow(investor, {
        targetUid: 'uid-investor-2',
        follow: true,
      });
      expect(duplicate.changed).toBe(false);

      const stored = mock.getDocument(
        FIRESTORE_COLLECTIONS.investorFollowers,
        'uid-investor_uid-investor-2',
      );
      expect(stored?.followerUid).toBe('uid-investor');
      expect(stored?.targetUid).toBe('uid-investor-2');
    });

    it('rejects self-follow and uses authenticated follower uid only', async () => {
      const service = createMarketplaceFollowCommandService({
        repository: createFirestoreMarketplaceFollowCommandRepository(firestoreFactory()),
      });

      await expect(
        service.setInvestorFollow(investor, { targetUid: 'uid-investor', follow: true }),
      ).rejects.toBeInstanceOf(MarketplaceFollowCommandValidationError);
    });

    it('unfollows an existing relationship', async () => {
      mock.setDocument(
        FIRESTORE_COLLECTIONS.investorFollowers,
        'uid-investor_uid-investor-2',
        {
          id: 'uid-investor_uid-investor-2',
          followerUid: 'uid-investor',
          targetUid: 'uid-investor-2',
          createdAt: ts('2026-01-01'),
        },
        false,
      );

      const service = createMarketplaceFollowCommandService({
        repository: createFirestoreMarketplaceFollowCommandRepository(firestoreFactory()),
      });
      const result = await service.setInvestorFollow(investor, {
        targetUid: 'uid-investor-2',
        follow: false,
      });
      expect(result.following).toBe(false);
      expect(result.changed).toBe(true);
    });
  });

  describe('vendors and vendor portal', () => {
    it('lists vendors scoped to caller organization memberships', async () => {
      const service = createVendorsReadService({
        authz: authz(),
        repository: createFirestoreVendorsReadRepository(firestoreFactory()),
      });
      const result = await service.listVendors(investor);
      expect(result.vendors).toHaveLength(1);
      expect(result.vendors[0]?.id).toBe('vendor-1');
    });

    it('filters vendors by search query', async () => {
      const service = createVendorsReadService({
        authz: authz(),
        repository: createFirestoreVendorsReadRepository(firestoreFactory()),
      });
      const result = await service.listVendors(investor, 'lone star');
      expect(result.vendors).toHaveLength(1);
      expect(result.vendors[0]?.name).toBe('Lone Star Inspections');
    });

    it('reads vendor portal profile and own requests', async () => {
      const readService = createVendorPortalReadService({
        repository: createFirestoreVendorPortalReadRepository(firestoreFactory()),
      });
      const profile = await readService.getPortalProfile(vendorUser);
      expect(profile.profile).toMatchObject({
        id: 'vendor-1',
        contactEmail: 'vendor@example.com',
      });

      const requests = await readService.listPortalRequests(vendorUser);
      expect(requests.requests).toHaveLength(1);
      expect(requests.requests[0]?.id).toBe('req-1');
    });

    it('updates own vendor request and rejects foreign vendor bids', async () => {
      const commandService = createVendorPortalCommandService({
        authz: authz(),
        repository: createFirestoreVendorPortalCommandRepository(firestoreFactory()),
      });

      const updated = await commandService.updateRequest(vendorUser, {
        id: 'req-1',
        status: 'QUOTED',
        quotedFee: 500,
        notes: 'Can inspect next week',
      });
      expect(updated.request.status).toBe('QUOTED');

      await expect(
        commandService.updateRequest(vendorUser, { id: 'req-foreign', status: 'QUOTED' }),
      ).rejects.toBeInstanceOf(AuthzForbiddenError);
    });

    it('rejects vendor portal access for non-vendor accounts', async () => {
      const readService = createVendorPortalReadService({
        repository: createFirestoreVendorPortalReadRepository(firestoreFactory()),
      });
      await expect(readService.getPortalProfile(investorTwo)).rejects.toBeInstanceOf(
        AuthzForbiddenError,
      );
    });
  });
});

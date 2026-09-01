import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createVendorsReadService,
  createVendorPortalReadService,
  type VendorsReadRepository,
  type VendorPortalReadRepository,
} from '../vendors/index.js';

const investor: AuthUser = {
  uid: 'user-a',
  email: 'a@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const vendorUser: AuthUser = {
  uid: 'vendor-1',
  email: 'vendor@example.com',
  accountType: 'vendor',
  isAdmin: false,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async () => null,
    findActiveProjectMember: async () => null,
    findDealById: async () => null,
    findActiveProjectMemberByUserId: async () => null,
    findActiveOrgMember: async () => null,
    findOrganizationOwnedBy: async () => null,
    findActiveOrgMemberInOrgs: async () => null,
    findOrganizationOwnedByUserInOrgs: async () => null,
    findMessageInThreadForUser: async () => null,
    findAnyMessageInThread: async () => null,
    ...overrides,
  };
}

describe('VendorsReadService', () => {
  it('lists vendors scoped to caller org memberships', async () => {
    const repository: VendorsReadRepository = {
      listVendors: jest.fn(async ({ organizationIds }) =>
        organizationIds.includes('org-1')
          ? [
              {
                id: 'v1',
                organizationId: 'org-1',
                name: 'Acme GC',
                type: 'Contractor',
                contactEmail: 'gc@example.com',
                contactPhone: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]
          : [],
      ),
    };

    const service = createVendorsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.listVendors(investor);
    expect(result.vendors).toHaveLength(1);
    expect(repository.listVendors).toHaveBeenCalledWith(
      expect.objectContaining({ organizationIds: ['org-1'] }),
    );
  });
});

describe('VendorPortalReadService', () => {
  const vendorRow = {
    id: 'v1',
    organizationId: 'org-1',
    name: 'Acme GC',
    type: 'Contractor',
    contactEmail: 'vendor@example.com',
    contactPhone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns self vendor profile resolved by session email', async () => {
    const repository: VendorPortalReadRepository = {
      findVendorByContactEmail: jest.fn(async () => vendorRow),
      listVendorBids: jest.fn(async () => []),
    };

    const service = createVendorPortalReadService({ repository });
    const result = await service.getPortalProfile(vendorUser);
    expect(result.profile).toEqual(vendorRow);
  });

  it('denies investor access to vendor portal profile', async () => {
    const service = createVendorPortalReadService({
      repository: {
        findVendorByContactEmail: async () => null,
        listVendorBids: async () => [],
      },
    });

    await expect(service.getPortalProfile(investor)).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('lists only bids for trusted vendor profile', async () => {
    const repository: VendorPortalReadRepository = {
      findVendorByContactEmail: jest.fn(async () => vendorRow),
      listVendorBids: jest.fn(async () => [
        {
          id: 'bid-1',
          vendorId: 'v1',
          milestoneId: 'm1',
          bidAmount: 1000n,
          status: 'Pending',
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };

    const service = createVendorPortalReadService({ repository });
    const result = await service.listPortalRequests(vendorUser);
    expect(result.requests).toHaveLength(1);
    expect(repository.listVendorBids).toHaveBeenCalledWith('v1');
  });

  it('returns empty requests when vendor profile missing', async () => {
    const service = createVendorPortalReadService({
      repository: {
        findVendorByContactEmail: async () => null,
        listVendorBids: async () => {
          throw new Error('should not list foreign bids');
        },
      },
    });

    const result = await service.listPortalRequests(vendorUser);
    expect(result.requests).toEqual([]);
  });
});

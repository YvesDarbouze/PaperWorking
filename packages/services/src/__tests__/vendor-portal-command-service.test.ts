import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createVendorPortalCommandService,
  type VendorPortalCommandRepository,
} from '../vendors/vendor-portal-command-service.js';
import { VendorPortalCommandValidationError } from '../vendors/vendor-portal-command-errors.js';

const vendorUser: AuthUser = {
  uid: 'vendor-1',
  email: 'vendor@example.com',
  accountType: 'vendor',
  isAdmin: false,
};

const investor: AuthUser = {
  uid: 'investor-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

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

describe('VendorPortalCommandService', () => {
  it('updates self vendor profile allowlisted fields', async () => {
    const repository: VendorPortalCommandRepository = {
      findVendorByContactEmail: jest.fn(async () => vendorRow),
      createVendor: jest.fn(async () => vendorRow),
      updateVendor: jest.fn(async () => ({ ...vendorRow, name: 'Updated Co' })),
      findBidForVendor: jest.fn(async () => null),
      updateBid: jest.fn(async () => ({
        id: 'bid-1',
        vendorId: 'v1',
        milestoneId: 'm1',
        bidAmount: 1000n,
        status: 'Pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const service = createVendorPortalCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.updateProfile(vendorUser, {
      companyName: 'Updated Co',
      type: 'Inspector',
      bio: 'ignored',
    });

    expect(result.profile.name).toBe('Updated Co');
    expect(repository.updateVendor).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({ name: 'Updated Co', type: 'Inspector' }),
    );
  });

  it('denies investor profile update', async () => {
    const service = createVendorPortalCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: {
        findVendorByContactEmail: async () => null,
        createVendor: async () => vendorRow,
        updateVendor: async () => vendorRow,
        findBidForVendor: async () => null,
        updateBid: async () => {
          throw new Error('should not update');
        },
      },
    });

    await expect(
      service.updateProfile(investor, { companyName: 'Hack Co' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('updates own bid only', async () => {
    const repository: VendorPortalCommandRepository = {
      findVendorByContactEmail: jest.fn(async () => vendorRow),
      createVendor: jest.fn(async () => vendorRow),
      updateVendor: jest.fn(async () => vendorRow),
      findBidForVendor: jest.fn(async () => ({
        id: 'bid-1',
        vendorId: 'v1',
        milestoneId: 'm1',
        bidAmount: 500n,
        status: 'Pending',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updateBid: jest.fn(async () => ({
        id: 'bid-1',
        vendorId: 'v1',
        milestoneId: 'm1',
        bidAmount: 1500n,
        status: 'QUOTED',
        notes: 'Updated',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const service = createVendorPortalCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.updateRequest(vendorUser, {
      requestId: 'bid-1',
      status: 'QUOTED',
      quotedFee: 1500,
      message: 'Updated',
    });

    expect(result.request.status).toBe('QUOTED');
    expect(repository.findBidForVendor).toHaveBeenCalledWith('v1', 'bid-1');
  });

  it('denies foreign bid update', async () => {
    const service = createVendorPortalCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: {
        findVendorByContactEmail: async () => vendorRow,
        createVendor: async () => vendorRow,
        updateVendor: async () => vendorRow,
        findBidForVendor: async () => null,
        updateBid: async () => {
          throw new Error('should not update foreign bid');
        },
      },
    });

    await expect(
      service.updateRequest(vendorUser, { requestId: 'foreign-bid', status: 'QUOTED' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('requires request id', async () => {
    const service = createVendorPortalCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: {
        findVendorByContactEmail: async () => vendorRow,
        createVendor: async () => vendorRow,
        updateVendor: async () => vendorRow,
        findBidForVendor: async () => null,
        updateBid: async () => {
          throw new Error('should not update');
        },
      },
    });

    await expect(service.updateRequest(vendorUser, {})).rejects.toBeInstanceOf(
      VendorPortalCommandValidationError,
    );
  });
});

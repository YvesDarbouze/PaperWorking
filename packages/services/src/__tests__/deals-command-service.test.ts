import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import {
  createDealsCommandService,
  DealsCommandValidationError,
  type DealsCommandRepository,
} from '../deals/index.js';

const investor: AuthUser = {
  uid: 'user-a',
  email: 'a@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const projectA: StoredProject = {
  id: 'p1',
  userId: 'user-a',
  investorId: 'user-a',
  organizationId: 'org-1',
  name: '123 Main',
};

const foreignProject: StoredProject = {
  id: 'p2',
  userId: 'user-b',
  investorId: 'user-b',
  organizationId: 'org-2',
  name: '456 Oak',
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async (id) => {
      if (id === 'p1') return projectA;
      if (id === 'p2') return foreignProject;
      return null;
    },
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

function makeRepository(
  overrides: Partial<DealsCommandRepository> = {},
): DealsCommandRepository {
  return {
    findBySlug: jest.fn(async () => null),
    findById: jest.fn(async () => null),
    create: jest.fn(async (data) => ({
      id: data.id ?? 'deal-1',
      slug: data.slug,
      address: data.address,
      purchasePrice: data.purchasePrice,
      rehabCost: data.rehabCost,
      arv: data.arv,
      holdingCosts: data.holdingCosts,
      projectedRoi: data.projectedRoi,
      status: data.status,
      visibility: data.visibility,
      creatorId: data.creatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    ...overrides,
  };
}

describe('DealsCommandService', () => {
  it('creates deal with server-assigned creatorId', async () => {
    const repository = makeRepository();
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.createDeal(investor, {
      address: '100 Main St',
      slug: '100mainst',
    });

    expect(result.success).toBe(true);
    expect(result.deal.creatorId).toBe('user-a');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ creatorId: 'user-a', address: '100 Main St' }),
    );
  });

  it('requires address', async () => {
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(service.createDeal(investor, { address: '  ' })).rejects.toBeInstanceOf(
      DealsCommandValidationError,
    );
  });

  it('denies foreign project link on create', async () => {
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(
      service.createDeal(investor, { address: '100 Main', projectId: 'p2' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('links deal to accessible project when projectId provided', async () => {
    const repository = makeRepository();
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    await service.createDeal(investor, {
      address: '100 Main',
      projectId: 'p1',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', creatorId: 'user-a' }),
    );
  });

  it('rejects duplicate client-supplied deal id', async () => {
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository({
        findById: async () => ({ id: 'existing' }),
      }),
    });

    await expect(
      service.createDeal(investor, { address: '100 Main', id: 'existing' }),
    ).rejects.toBeInstanceOf(DealsCommandValidationError);
  });

  it('does not trust client creatorId spoof fields', async () => {
    const repository = makeRepository();
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    await service.createDeal(investor, { address: '100 Main' });
    const createArg = (repository.create as jest.Mock).mock.calls[0]?.[0] as {
      creatorId: string;
    };
    expect(createArg.creatorId).toBe('user-a');
    expect(createArg.creatorId).not.toBe('attacker');
  });
});

describe('DealsCommandService — project not found', () => {
  it('denies when projectId does not exist', async () => {
    const service = createDealsCommandService({
      authz: new AuthorizationService(
        makeStore({ findProjectById: async () => null }),
      ),
      repository: makeRepository(),
    });

    await expect(
      service.createDeal(investor, { address: '100 Main', projectId: 'missing' }),
    ).rejects.toBeInstanceOf(AuthzNotFoundError);
  });
});

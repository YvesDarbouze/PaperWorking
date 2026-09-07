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
    getBySlug: jest.fn(async () => null),
    updateBySlug: jest.fn(async (_slug, patch) => ({
      id: 'deal-1',
      slug: '100mainst',
      address: '100 Main St',
      purchasePrice: patch.purchasePrice ?? 0,
      rehabCost: patch.rehabCost ?? 0,
      arv: patch.arv ?? 0,
      holdingCosts: patch.holdingCosts ?? 0,
      projectedRoi: patch.projectedRoi ?? 0,
      projectedMonthlyRent: patch.projectedMonthlyRent,
      status: patch.status ?? 'draft',
      visibility: patch.visibility ?? 'private',
      creatorId: 'user-a',
      projectId: patch.projectId ?? null,
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

  it('strips punctuation from client-supplied slugs', async () => {
    const repository = makeRepository();
    const service = createDealsCommandService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    await service.createDeal(investor, {
      address: '812 E2E Ave, Austin, TX 78704',
      slug: '812e2eave,austin,tx78704',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: '812e2eaveaustintx78704' }),
    );
  });

  it('decodes percent-encoded slugs on read', async () => {
    const getBySlug = jest.fn(async (slug: string) =>
      slug === '812e2eave,austin,tx78704'
        ? {
            id: 'deal-1',
            slug: '812e2eave,austin,tx78704',
            address: '812 E2E Ave',
            creatorId: 'user-a',
            projectId: 'p1',
          }
        : null,
    );
    const service = createDealsCommandService({
      authz: new AuthorizationService(
        makeStore({
          findDealById: async () => ({
            id: 'deal-1',
            creatorId: 'user-a',
            visibility: 'private',
            status: 'draft',
          }),
        }),
      ),
      repository: makeRepository({ getBySlug }),
    });

    const result = await service.getDealBySlug(investor, '812e2eave%2Caustin%2Ctx78704');
    expect(result.deal.id).toBe('deal-1');
    expect(getBySlug).toHaveBeenCalledWith('812e2eave,austin,tx78704');
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

  it('resolves hyphenated client slug to slugified stored slug on PATCH', async () => {
    const getBySlug = jest.fn(async (slug: string) =>
      slug === 'e2edeal123'
        ? {
            id: 'deal-1',
            slug: 'e2edeal123',
            address: '100 E2E Test St',
            purchasePrice: 300000,
            rehabCost: 0,
            arv: 0,
            holdingCosts: 0,
            projectedRoi: 0,
            status: 'draft',
            visibility: 'private',
            creatorId: 'user-a',
            projectId: 'p1',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    );
    const updateBySlug = jest.fn(async (_slug: string, patch: { purchasePrice?: number }) => ({
      id: 'deal-1',
      slug: 'e2edeal123',
      address: '100 E2E Test St',
      purchasePrice: patch.purchasePrice ?? 300000,
      rehabCost: 0,
      arv: 0,
      holdingCosts: 0,
      projectedRoi: 0,
      status: 'draft',
      visibility: 'private',
      creatorId: 'user-a',
      projectId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const service = createDealsCommandService({
      authz: new AuthorizationService(
        makeStore({
          findDealById: async () => ({
            id: 'deal-1',
            creatorId: 'user-a',
            visibility: 'private',
            status: 'draft',
          }),
        }),
      ),
      repository: makeRepository({ getBySlug, updateBySlug }),
    });

    const result = await service.updateDealBySlug(investor, 'e2e-deal-123', {
      purchasePrice: 450000,
      projectId: 'p1',
    });

    expect(result.deal.purchasePrice).toBe(450000);
    expect(getBySlug).toHaveBeenCalledWith('e2e-deal-123');
    expect(getBySlug).toHaveBeenCalledWith('e2edeal123');
    expect(updateBySlug).toHaveBeenCalledWith(
      'e2edeal123',
      expect.objectContaining({ purchasePrice: 450000 }),
    );
  });

  it('updates deal baseline by slug for authorized owner', async () => {
    const repository = makeRepository({
      getBySlug: async () => ({
        id: 'deal-1',
        slug: '100mainst',
        address: '100 Main St',
        purchasePrice: 400000,
        rehabCost: 50000,
        arv: 550000,
        holdingCosts: 0,
        projectedRoi: 0,
        status: 'draft',
        visibility: 'private',
        creatorId: 'user-a',
        projectId: 'p1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: async () => ({ id: 'deal-1' }),
    });
    const service = createDealsCommandService({
      authz: new AuthorizationService(
        makeStore({
          findDealById: async () => ({
            id: 'deal-1',
            creatorId: 'user-a',
            visibility: 'private',
            status: 'draft',
          }),
        }),
      ),
      repository,
    });

    const result = await service.updateDealBySlug(investor, '100mainst', {
      purchasePrice: 410000,
      projectedMonthlyRent: 3200,
      projectId: 'p1',
    });

    expect(result.deal.purchasePrice).toBe(410000);
    expect(repository.updateBySlug).toHaveBeenCalled();
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

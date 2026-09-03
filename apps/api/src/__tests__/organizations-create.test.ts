import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';

type OrganizationsServiceCtor =
  typeof import('../organizations/organizations.module.js').OrganizationsService;

const mockOrganizationsRepository = {
  listByIds: jest.fn<() => Promise<unknown[]>>(),
  getById: jest.fn<() => Promise<unknown>>(),
  createWithOwner: jest.fn<() => Promise<unknown>>(),
};

function makeAuthzStore() {
  return {
    findOrganizationsOwnedBy: async () => [],
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
  };
}

describe('OrganizationsService.create', () => {
  let OrganizationsService: OrganizationsServiceCtor;
  const authz = {
    resolveUserOrgIds: jest.fn(),
    assertOrgAccess: jest.fn(),
  };

  let service: InstanceType<OrganizationsServiceCtor>;

  beforeAll(async () => {
    await jest.unstable_mockModule('@paperworking/database', () => ({
      createOrganizationsRepository: () => mockOrganizationsRepository,
      createAuthzStore: () => makeAuthzStore(),
    }));
    const mod = await import('../organizations/organizations.module.js');
    OrganizationsService = mod.OrganizationsService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_READ_MODE = 'firestore';
    service = new OrganizationsService(authz as never);
    mockOrganizationsRepository.createWithOwner.mockResolvedValue({
      organization: {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        ownerId: 'user-1',
      },
      membership: {
        id: 'mem-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: 'Owner',
      },
    });
  });

  it('creates organization and owner membership via repository router', async () => {
    const result = await service.create(
      { uid: 'user-1', email: 'a@example.com', accountType: 'investor', isAdmin: false },
      { name: 'Acme' },
    );

    expect(mockOrganizationsRepository.createWithOwner).toHaveBeenCalledWith({
      name: 'Acme',
      slug: 'acme',
      ownerId: 'user-1',
      ownerEmail: 'a@example.com',
    });
    expect(result.success).toBe(true);
    expect(result.organization).toEqual(
      expect.objectContaining({ id: 'org-1', name: 'Acme' }),
    );
  });
});

import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@127.0.0.1:5432/test';

type OrganizationsServiceCtor =
  typeof import('../organizations/organizations.module.js').OrganizationsService;

describe('OrganizationsService.create', () => {
  let OrganizationsService: OrganizationsServiceCtor;
  const tx = {
    organization: { create: jest.fn() },
    organizationMember: { create: jest.fn() },
  };
  const prisma = {
    organization: { findUnique: jest.fn().mockResolvedValue(null) },
    client: {
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
  const authz = {
    resolveUserOrgIds: jest.fn(),
    assertOrgAccess: jest.fn(),
  };

  let service: InstanceType<OrganizationsServiceCtor>;

  beforeAll(async () => {
    const mod = await import('../organizations/organizations.module.js');
    OrganizationsService = mod.OrganizationsService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrganizationsService(prisma as never, authz as never);
    tx.organization.create.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      ownerId: 'user-1',
    });
    tx.organizationMember.create.mockResolvedValue({
      id: 'mem-1',
      organizationId: 'org-1',
      userId: 'user-1',
      role: 'Owner',
    });
  });

  it('creates organization and owner membership in one transaction', async () => {
    const result = await service.create(
      { uid: 'user-1', email: 'a@example.com', accountType: 'investor', isAdmin: false },
      { name: 'Acme' },
    );

    expect(prisma.client.$transaction).toHaveBeenCalled();
    expect(tx.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 'user-1', name: 'Acme' }),
      }),
    );
    expect(tx.organizationMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'Owner',
        }),
      }),
    );
    expect(result.success).toBe(true);
  });
});

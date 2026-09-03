import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createDealsReadService,
  type DealsReadRepository,
} from '../deals/index.js';

const investor: AuthUser = {
  uid: 'user-a',
  email: 'a@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const foreignDeal = {
  id: 'foreign-private',
  slug: 'foreign',
  address: '200 Foreign St',
  purchasePrice: 100,
  rehabCost: 0,
  arv: 0,
  holdingCosts: 0,
  projectedRoi: 0,
  status: 'published',
  visibility: 'private',
  creatorId: 'user-b',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ownDeal = {
  ...foreignDeal,
  id: 'own-private',
  slug: 'own',
  address: '100 Own St',
  creatorId: 'user-a',
};

const publicDeal = {
  ...foreignDeal,
  id: 'public-mkt',
  slug: 'market',
  address: '300 Market St',
  creatorId: 'user-b',
  visibility: 'marketplace',
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
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
    ...overrides,
  };
}

function makeRepository(deals: typeof ownDeal[]): DealsReadRepository {
  return {
    listDeals: jest.fn(async ({ accessOr, q }) => {
      let rows = deals.filter((deal) =>
        accessOr.some((clause) => {
          if ('creatorId' in clause && clause.creatorId === deal.creatorId) return true;
          if ('AND' in clause) {
            const and = clause.AND as Array<Record<string, string>>;
            return (
              deal.visibility === and[0]?.visibility &&
              deal.status === and[1]?.status
            );
          }
          return false;
        }),
      );
      if (q) {
        const needle = q.toLowerCase();
        rows = rows.filter(
          (d) =>
            d.address.toLowerCase().includes(needle) ||
            d.slug.toLowerCase().includes(needle),
        );
      }
      return rows;
    }),
    findBySlugOrId: jest.fn(async (slugOrId) => {
      const deal = deals.find((d) => d.id === slugOrId || d.slug === slugOrId);
      if (!deal) return null;
      return {
        id: deal.id,
        slug: deal.slug,
        status: deal.status,
        visibility: deal.visibility,
        address: deal.address,
      };
    }),
    findBySlug: jest.fn(async () => null),
  };
}

describe('DealsReadService', () => {
  it('lists own deals and marketplace-visible deals by default', async () => {
    const service = createDealsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([ownDeal, foreignDeal, publicDeal]),
    });

    const result = await service.listDeals(investor);
    const ids = result.deals.map((d) => d.id);
    expect(ids).toContain('own-private');
    expect(ids).toContain('public-mkt');
    expect(ids).not.toContain('foreign-private');
  });

  it('discover tab shows only marketplace-published deals', async () => {
    const service = createDealsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([ownDeal, publicDeal]),
    });

    const result = await service.listDeals(investor, { tab: 'discover' });
    expect(result.deals.map((d) => d.id)).toEqual(['public-mkt']);
  });

  it('dealExists hides private deals from public probe', async () => {
    const service = createDealsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository([ownDeal, publicDeal]),
    });

    const privateProbe = await service.dealExists('own');
    expect(privateProbe).toEqual({ exists: false, deal: null });

    const publicProbe = await service.dealExists('market');
    expect(publicProbe.exists).toBe(true);
    expect(publicProbe.deal?.id).toBe('public-mkt');
  });

});

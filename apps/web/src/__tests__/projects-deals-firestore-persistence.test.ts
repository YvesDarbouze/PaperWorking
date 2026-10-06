import {
  getProjectFromStore,
  listProjectsFromStore,
  createProjectInStore,
  updateProjectInStore,
  deleteProjectInStore,
  countProjectsInStore,
} from '../../lib/projects/project-store.js';
import {
  getDealFromStore,
  listDealsFromStore,
  createDealInStore,
  patchDealInStore,
} from '../../lib/deals/deal-store.js';

describe('Project & Deal Store Persistence (Firestore & Dual-Layer Cache)', () => {
  describe('Project Store Persistence', () => {
    it('bootstraps projects from seed and lists them', async () => {
      const projects = await listProjectsFromStore('org-1');
      expect(projects.length).toBeGreaterThanOrEqual(1);

      const deal1 = await getProjectFromStore('deal-1');
      expect(deal1).not.toBeNull();
      expect(deal1?.id).toBe('deal-1');
      expect(deal1?.propertyName).toBeDefined();
    });

    it('creates, persists, updates, and deletes a custom project', async () => {
      const testId = `proj-test-${Date.now()}`;
      const newProject = await createProjectInStore({
        id: testId,
        propertyName: '742 Evergreen Terrace',
        property_address: '742 Evergreen Terrace, Springfield, OR',
        address: '742 Evergreen Terrace, Springfield, OR',
        city: 'Springfield',
        propertyState: 'OR',
        purchasePrice: 320000,
        currentPhase: 'acquisition',
        organizationId: 'org-test-1',
      });

      expect(newProject.id).toBe(testId);
      expect(newProject.purchasePrice).toBe(320000);

      // Verify retrieval
      const fetched = await getProjectFromStore(testId);
      expect(fetched).not.toBeNull();
      expect(fetched?.propertyName).toBe('742 Evergreen Terrace');
      expect(fetched?.organizationId).toBe('org-test-1');

      // Verify update
      const updated = await updateProjectInStore(testId, {
        propertyName: '742 Evergreen Terrace (Renovated)',
        purchasePrice: 350000,
        contingencies: [
          {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            type: 'inspection',
            label: 'Home Inspection',
            deadline: new Date().toISOString(),
            status: 'pending',
            responsiblePartyUid: 'usr-1',
            responsiblePartyName: 'Inspector Dan',
            extensionHistory: [],
            supportingDocumentUrls: [],
          },
        ],
      });
      expect(updated?.propertyName).toBe('742 Evergreen Terrace (Renovated)');
      expect(updated?.purchasePrice).toBe(350000);
      expect(updated?.contingencies?.length).toBe(1);

      // Verify update reflected in get
      const refetched = await getProjectFromStore(testId);
      expect(refetched?.propertyName).toBe('742 Evergreen Terrace (Renovated)');
      expect(refetched?.contingencies?.[0].id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

      // Verify deletion
      const deleted = await deleteProjectInStore(testId);
      expect(deleted).toBe(true);

      const afterDelete = await getProjectFromStore(testId);
      expect(afterDelete).toBeNull();
    });

    it('filters projects by search query', async () => {
      const queryResults = await listProjectsFromStore('org-1', 'Elm');
      expect(queryResults.length).toBeGreaterThanOrEqual(1);
      expect(queryResults.every((p) => p.propertyName.includes('Elm') || p.address.includes('Elm'))).toBe(true);
    });

    it('counts projects correctly', async () => {
      const count = await countProjectsInStore('org-1');
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Deal Store Persistence', () => {
    it('bootstraps deals from seed and retrieves by id or slug', async () => {
      const deals = await listDealsFromStore();
      expect(deals.length).toBeGreaterThanOrEqual(1);

      const dealById = await getDealFromStore('deal-mp-1');
      expect(dealById).not.toBeNull();
      expect(dealById?.id).toBe('deal-mp-1');

      const dealBySlug = await getDealFromStore('1247elmst');
      expect(dealBySlug).not.toBeNull();
      expect(dealBySlug?.slug).toBe('1247elmst');
    });

    it('creates, persists, and patches a custom deal', async () => {
      const dealId = `deal-custom-${Date.now()}`;
      const slug = `custom-slug-${Date.now()}`;

      const created = await createDealInStore({
        id: dealId,
        slug,
        address: '500 Peachtree St NE, Atlanta, GA 30308',
        status: 'published',
        visibility: 'marketplace',
        dealType: 'syndication',
        purchasePrice: 1200000,
        rehabCost: 150000,
        fundingTarget: 400000,
        targetIrr: 19.5,
        projectedRoi: 19.5,
        equityMultiple: 2.1,
        holdPeriod: '4 Years',
        minInvestment: 50000,
        holdingCosts: 25000,
        isVerifiedOperator: true,
        creatorId: 'operator-1',
        createdAt: new Date().toISOString(),
        sharedWith: [],
        projects: [{ name: 'Peachtree Commercial Hub', city: 'Atlanta', state: 'GA' }],
        commitments: [{ amount: 100000, investorId: 'inv-1' }],
        invitations: [],
      });

      expect(created.id).toBe(dealId);
      expect(created.slug).toBe(slug);

      // Fetch by ID
      const fetchedById = await getDealFromStore(dealId);
      expect(fetchedById).not.toBeNull();
      expect(fetchedById?.projects?.[0]?.name).toBe('Peachtree Commercial Hub');

      // Fetch by Slug
      const fetchedBySlug = await getDealFromStore(slug);
      expect(fetchedBySlug).not.toBeNull();
      expect(fetchedBySlug?.id).toBe(dealId);

      // Patch Deal
      const patched = await patchDealInStore(dealId, {
        fundingTarget: 450000,
        status: 'funded',
      });
      expect(patched?.fundingTarget).toBe(450000);
      expect(patched?.status).toBe('funded');

      // Refetch
      const refetched = await getDealFromStore(slug);
      expect(refetched?.status).toBe('funded');
      expect(refetched?.fundingTarget).toBe(450000);
    });

    it('filters deals by tab and search query', async () => {
      const syndicationDeals = await listDealsFromStore({ tab: 'syndication' });
      expect(syndicationDeals.every((d) => d.dealType === 'syndication')).toBe(true);

      const searchDeals = await listDealsFromStore({ search: 'Elm' });
      expect(searchDeals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Deal to Project Bidirectional Linking', () => {
    it('maintains backlinks between project and deal', async () => {
      const dealId = `deal-link-${Date.now()}`;
      const slug = `slug-link-${Date.now()}`;
      const projId = `proj-link-${Date.now()}`;

      await createDealInStore({
        id: dealId,
        slug,
        address: '100 Broadway, New York, NY 10005',
        status: 'published',
        visibility: 'marketplace',
        dealType: 'syndication',
        purchasePrice: 2500000,
        rehabCost: 300000,
        fundingTarget: 800000,
        targetIrr: 17.0,
        projectedRoi: 17.0,
        equityMultiple: 1.9,
        holdPeriod: '5 Years',
        minInvestment: 50000,
        holdingCosts: 40000,
        isVerifiedOperator: true,
        creatorId: 'operator-ny',
        createdAt: new Date().toISOString(),
        sharedWith: [],
        projects: [{ name: 'Broadway Value-Add' }],
        commitments: [],
        invitations: [],
        projectId: projId,
      });

      const project = await createProjectInStore({
        id: projId,
        propertyName: 'Broadway Value-Add Project',
        property_address: '100 Broadway, New York, NY 10005',
        address: '100 Broadway, New York, NY 10005',
        city: 'New York',
        propertyState: 'NY',
        purchasePrice: 2500000,
        dealId,
        dealSlug: slug,
        dealAddress: '100 Broadway, New York, NY 10005',
      });

      expect(project.dealId).toBe(dealId);
      expect(project.dealSlug).toBe(slug);

      const fetchedProject = await getProjectFromStore(projId);
      expect(fetchedProject?.dealId).toBe(dealId);
      expect(fetchedProject?.dealSlug).toBe(slug);

      const fetchedDeal = await getDealFromStore(dealId);
      expect(fetchedDeal?.projectId).toBe(projId);
    });
  });
});

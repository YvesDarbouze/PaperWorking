import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';

// Mock next/navigation
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams('projectId=deal-lifecycle'),
  usePathname: () => '/project/deal-lifecycle',
}));

// Mock Auth context for DashboardBottomNav
jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'operator', subscriptionPlan: 'Pro' },
    navContext: { role: 'operator', accountType: 'operator' },
  }),
  useOptionalAuth: () => ({
    loading: false,
    authenticated: true,
  }),
}));

// Mock Compare context
jest.unstable_mockModule('@/context/CompareContext', () => ({
  useCompare: () => ({
    addToCompare: jest.fn(),
    removeFromCompare: jest.fn(),
    isComparing: () => false,
    compareList: [],
    comparedDeals: [],
    clearCompare: jest.fn(),
  }),
}));

// Mock Saved deals context
jest.unstable_mockModule('@/context/SavedDealsContext', () => ({
  useSavedDeals: () => ({
    isSaved: () => false,
    toggleSave: jest.fn(),
    savedDeals: [],
  }),
}));

// Mock Property Image hook
jest.unstable_mockModule('@/lib/maps/property-image', () => ({
  usePropertyImage: () => ({
    imageUrl: '/images/properties/deal-property-default.jpg',
    handleImageError: jest.fn(),
    isLoading: false,
  }),
}));

const mockProjectWorkspace = {
  id: 'deal-lifecycle',
  project_id: 'deal-lifecycle',
  propertyName: 'Elm Street Flip',
  address: '1247 Elm Street, Austin, TX 78702',
  property_address: '1247 Elm Street, Austin, TX 78702',
  city: 'Austin, TX',
  currentPhase: 'acquisition' as const,
  phase: 'acquisition' as const,
  status: 'Active',
  dispositionType: 'SALE' as const,
  purchasePrice: 475000,
  purchase_price: 475000,
  rehab_costs: 55000,
  exit_strategy: 'Fix & Flip',
  entity_type: 'LLC',
  phase_completion_pct: 45,
  estimatedIrr: 0.185,
  dealId: 'deal-mp-1',
  dealSlug: 'apexheights',
  dealAddress: '1247 Elm Street, Austin, TX 78702',
  deals: [
    {
      id: 'deal-calc-deal-lifecycle',
      slug: 'deal-lifecycle-underwriting',
      name: 'Elm Street Flip Acquisition Underwriting',
      address: '1247 Elm Street, Austin, TX 78702',
      dealType: 'underwriting' as const,
      status: 'underwritten' as const,
      purchasePrice: 475000,
      rehabBudget: 55000,
      cashRequired: 118750,
      projectedIrr: 18.5,
      capRate: 6.5,
    },
    {
      id: 'deal-mp-1',
      slug: 'apexheights',
      name: 'Elm Street Flip Syndication Offering',
      address: '1247 Elm Street, Austin, TX 78702',
      dealType: 'syndication' as const,
      status: 'active' as const,
      purchasePrice: 475000,
      rehabBudget: 55000,
      cashRequired: 118750,
      projectedIrr: 18.5,
      targetRaise: 150000,
      committedAmount: 85000,
      marketplaceUrl: '/marketplace/apexheights',
    },
  ],
  todos: [],
  documents: [],
  tasks: [],
  contingencies: [],
  storage_used_bytes: 0,
  storageQuotaBytes: 1000000,
};

jest.unstable_mockModule('@/components/projects/ProjectWorkspaceProvider', () => ({
  useProjectWorkspace: () => ({
    project: mockProjectWorkspace,
    loading: false,
    error: null,
    refetch: jest.fn(),
    updateProject: jest.fn(),
  }),
}));

const { default: DealCard } = await import('../../components/marketplace/DealCard.js');
const { default: DealsDenseTable } = await import('../../components/marketplace/DealsDenseTable.js');
const { default: DealDetailPageView } = await import('../../components/marketplace/detail/DealDetailPageView.js');
const { default: ProjectWorkspaceShell } = await import('../../components/projects/ProjectWorkspaceShell.js');
const { default: ProjectFolderCard } = await import('../../components/projects/ProjectFolderCard.js');
const { default: DealCalculatorView } = await import('../../components/marketing/DealCalculatorView.js');
const { default: ProjectOverviewContent } = await import('../../components/projects/ProjectOverviewContent.js');
const { SEED_RAW_DEALS } = await import('../../lib/marketplace/seed-data.js');
const { SEED_PROJECTS, getSeedProjectById } = await import('../../lib/projects/seed-data.js');

describe('Deal as Component of Overarching Project UI Integration', () => {
  const sampleDeal = {
    id: 'deal-mp-1',
    slug: 'apexheights',
    name: 'Apex Heights Living',
    propertyName: 'Apex Heights Living',
    address: '1247 Elm Street, Austin, TX 78702',
    city: 'Austin',
    state: 'TX',
    assetClass: 'Multifamily',
    subStrategy: 'VALUE_ADD',
    status: 'funding',
    targetIrr: 18.4,
    equityMultiple: 1.85,
    holdPeriod: '3–5 Years',
    minInvestment: 25000,
    fundingTarget: 1850000,
    committedAmount: 1250000,
    investorCount: 14,
    creatorName: 'Apex Capital Management',
    creatorId: 'user-1',
    isVerifiedOperator: true,
    projectId: 'deal-lifecycle',
    projectName: 'Elm Street Flip',
    projects: [
      {
        id: 'deal-lifecycle',
        name: 'Elm Street Flip',
        stage: 'ACQUISITION',
        progress: 45,
      },
    ],
  };

  const sampleProject = {
    id: 'deal-lifecycle',
    propertyName: 'Elm Street Flip',
    address: '1247 Elm Street, Austin, TX 78702',
    city: 'Austin',
    state: 'TX',
    currentPhase: 'acquisition' as const,
    phase_completion_pct: 45,
    purchasePrice: 475000,
    dealId: 'deal-mp-1',
    dealSlug: 'apexheights',
    dealAddress: '1247 Elm Street, Austin, TX 78702',
  };

  describe('1. DealCard Overarching Project Linkage', () => {
    it('renders accessible overarching project link with folder icon and navigation', () => {
      const html = renderToString(<DealCard deal={sampleDeal as any} />);

      expect(html).toContain('data-testid="deal-overarching-project-link"');
      expect(html).toContain('href="/project/deal-lifecycle"');
      expect(html).toContain('Project: Elm Street Flip');
    });

    it('renders overarching project link in compact mode', () => {
      const html = renderToString(<DealCard deal={sampleDeal as any} compact />);

      expect(html).toContain('data-testid="deal-overarching-project-link"');
      expect(html).toContain('href="/project/deal-lifecycle"');
    });
  });

  describe('2. DealsDenseTable Overarching Project Column Integration', () => {
    it('renders dense-overarching-project-link for each listed deal', () => {
      const html = renderToString(<DealsDenseTable deals={[sampleDeal as any]} />);

      expect(html).toContain('data-testid="dense-overarching-project-link"');
      expect(html).toContain('href="/project/deal-lifecycle"');
      expect(html).toContain('Project: Elm Street Flip');
    });
  });

  describe('3. DealDetailPageView Overarching Project Card & Breadcrumbs', () => {
    it('renders dedicated overarching project card with REIL phase, workspace CTA, and parent project breadcrumbs', () => {
      const html = renderToString(
        <DealDetailPageView deal={sampleDeal as any} allDeals={[sampleDeal as any]} />
      );
      const cleanHtml = html.replace(/<!--.*?-->/g, '');

      // Breadcrumbs with Overarching Project
      expect(cleanHtml).toContain('data-testid="deal-detail-breadcrumb"');
      expect(cleanHtml).toContain('data-testid="breadcrumb-overarching-project-link"');
      expect(cleanHtml).toContain('href="/project/deal-lifecycle"');
      expect(cleanHtml).toContain('Project: Elm Street Flip');
      expect(cleanHtml).toContain('Deal Component: Apex Heights Living');

      // Overarching Project Card
      expect(html).toContain('data-testid="deal-overarching-project-card"');
      expect(html).toContain('Overarching Project');
      expect(html).toContain('Elm Street Flip');
      expect(html).toContain('Phase 01: Acquisition');
      expect(html).toContain('This Deal is an active investment offering component underwritten and managed within the overarching Project lifecycle.');

      // Open Project Workspace Button
      expect(html).toContain('data-testid="open-overarching-project-btn"');
      expect(html).toContain('href="/project/deal-lifecycle"');
      expect(html).toContain('Open Project Workspace →');

      // Right rail widget
      expect(html).toContain('data-testid="rail-overarching-project-widget"');
    });
  });

  describe('4. ProjectWorkspaceShell Deal Component Header', () => {
    it('displays active Deal Component link and marketplace navigation', () => {
      const html = renderToString(
        <ProjectWorkspaceShell project={sampleProject as any}>
          <div>Workspace Content</div>
        </ProjectWorkspaceShell>
      );

      expect(html).toContain('data-testid="workspace-deal-component-link"');
      expect(html).toContain('href="/marketplace/apexheights"');
      expect(html).toContain('Deal Component:');
      expect(html).toContain('1247 Elm Street');
      expect(html).toContain('Marketplace Offering →');
    });
  });

  describe('5. ProjectFolderCard Deal Component Attachment', () => {
    it('renders project-deal-badge linking to the attached Deal Component offering', () => {
      const summary = {
        id: 'deal-lifecycle',
        propertyName: 'Elm Street Flip',
        address: '1247 Elm Street, Austin, TX 78702',
        city: 'Austin',
        state: 'TX',
        currentPhase: 'acquisition' as const,
        dispositionType: 'SALE' as const,
        purchasePrice: 475000,
        dealId: 'deal-mp-1',
        dealSlug: 'apexheights',
        dealAddress: '1247 Elm Street, Austin, TX 78702',
      };

      const html = renderToString(<ProjectFolderCard project={summary as any} />);

      expect(html).toContain('data-testid="project-deal-badge"');
      expect(html).toContain('href="/marketplace/apexheights"');
      expect(html).toContain('Deal:');
      expect(html).toContain('1247 Elm Street');
      expect(html).toContain('Offering →');
    });
  });

  describe('6. DealCalculatorView Overarching Project Contextual Banner', () => {
    it('renders calc-overarching-project-badge when projectId query param is active', () => {
      const html = renderToString(<DealCalculatorView />);

      expect(html).toContain('data-testid="calc-overarching-project-badge"');
      expect(html).toContain('href="/project/deal-lifecycle"');
      expect(html).toContain('Overarching Project Workspace');
      expect(html).toContain('Phase 01 Underwriting');
      expect(html).toContain('Back to Project Workspace');
    });
  });

  describe('7. Bidirectional Seed Data Integrity', () => {
    it('guarantees every deal in SEED_RAW_DEALS has explicit projectId and projects metadata', () => {
      expect(SEED_RAW_DEALS.length).toBeGreaterThan(0);

      for (const deal of SEED_RAW_DEALS) {
        expect(deal.projectId).toBeDefined();
        expect(typeof deal.projectId).toBe('string');
        expect(deal.projects).toBeDefined();
        expect(deal.projects!.length).toBeGreaterThan(0);
        expect(deal.projects![0].id).toBe(deal.projectId);

        // Verify the project exists in SEED_PROJECTS
        const matchingProject = getSeedProjectById(deal.projectId!);
        expect(matchingProject).toBeDefined();
      }
    });

    it('guarantees projects with dealId link to existing deals in SEED_RAW_DEALS', () => {
      const projectsWithDeals = SEED_PROJECTS.filter((p) => p.dealId);
      expect(projectsWithDeals.length).toBeGreaterThan(0);

      for (const project of projectsWithDeals) {
        const matchingDeal = SEED_RAW_DEALS.find((d) => d.id === project.dealId || d.slug === project.dealSlug);
        expect(matchingDeal).toBeDefined();
        expect(matchingDeal?.projectId).toBe(project.id);
      }
    });

    it('guarantees all seed projects have populated deals components array with at least primary underwriting', () => {
      for (const project of SEED_PROJECTS) {
        const fullProject = getSeedProjectById(project.id);
        expect(fullProject).toBeDefined();
        expect(fullProject?.deals).toBeDefined();
        expect(fullProject!.deals!.length).toBeGreaterThan(0);

        const primaryUnderwriting = fullProject!.deals!.find((d) => d.dealType === 'underwriting');
        expect(primaryUnderwriting).toBeDefined();
        expect(primaryUnderwriting?.purchasePrice).toBeGreaterThan(0);

        if (fullProject?.dealId || fullProject?.dealSlug) {
          const syndicationComp = fullProject!.deals!.find((d) => d.dealType === 'syndication');
          expect(syndicationComp).toBeDefined();
          expect(syndicationComp?.marketplaceUrl).toBeDefined();
        }
      }
    });
  });

  describe('8. ProjectOverviewContent Deal Components Hub', () => {
    it('renders dedicated deal components hub with count badge, metrics, and action buttons', () => {
      const html = renderToString(<ProjectOverviewContent />);
      const cleanHtml = html.replace(/<!--.*?-->/g, '');
      expect(cleanHtml).toContain('data-testid="project-deal-components-hub"');
      expect(cleanHtml).toContain('Deal Components Inside This Project');
      expect(cleanHtml).toContain('data-testid="project-deals-count-badge"');
      expect(cleanHtml).toContain('2 Components');

      // Underwrite new deal component CTA
      expect(html).toContain('data-testid="overview-add-deal-component-btn"');
      expect(html).toContain('/deal-calculator?projectId=deal-lifecycle');

      // Individual Deal Component Cards
      expect(html).toContain('data-testid="deal-component-card-deal-calc-deal-lifecycle"');
      expect(html).toContain('Acquisition Pro-Forma');
      expect(html).toContain('data-testid="open-underwriting-deal-calc-deal-lifecycle"');

      expect(html).toContain('data-testid="deal-component-card-deal-mp-1"');
      expect(html).toContain('Marketplace Offering');
      expect(html).toContain('data-testid="view-syndication-deal-mp-1"');
      expect(html).toContain('href="/marketplace/apexheights"');
    });
  });
});


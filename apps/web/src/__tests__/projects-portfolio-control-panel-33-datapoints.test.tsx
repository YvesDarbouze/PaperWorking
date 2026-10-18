import { TextEncoder, TextDecoder } from 'node:util';
import { MessageChannel } from 'node:worker_threads';
Object.assign(globalThis, { TextEncoder, TextDecoder, MessageChannel });

import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
const { renderToString } = await import('react-dom/server');

const mockUseAuth = jest.fn();
const mockUseSearchParams = jest.fn(() => new URLSearchParams());

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
  useOptionalAuth: mockUseAuth,
}));

// Mock next/navigation
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: mockUseSearchParams,
  usePathname: () => '/dashboard',
}));

// Dynamically import components after mocks
const { default: CommandCenterPanel } = await import(
  '../../components/dashboard/CommandCenterPanel.js'
);
const { default: ProjectWorkspaceShell } = await import(
  '../../components/projects/ProjectWorkspaceShell.js'
);
const { default: ProjectFolderCard } = await import(
  '../../components/projects/ProjectFolderCard.js'
);
const { default: NewProjectPage } = await import(
  '../../app/(dashboard)/projects/new/page.js'
);
const { default: AcquisitionWorkspaceView } = await import(
  '../../components/projects/AcquisitionWorkspaceView.js'
);
const {
  addSeedProject,
  listSeedProjectSummaries,
  SEED_PROJECTS,
} = await import('../../lib/projects/seed-data.js');
const {
  SEED_RAW_DEALS,
  findSeedDeal,
} = await import('../../lib/marketplace/seed-data.js');
const { PROJECT_SUBROUTES } = await import('../../lib/projects/types.js');
const { AUTHORITATIVE_33_KPIS } = await import('../../lib/insights/kpi-registry.js');

describe('PROJECTS as Central Mechanism in Portfolio Control Panel & 33 Datapoints Suite', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      loading: false,
      authenticated: true,
      profile: {
        accountType: 'operator',
        subscriptionPlan: 'Pro',
        subscriptionStatus: 'active',
      },
      navContext: {
        role: 'operator',
        accountType: 'operator',
        subscriptionPlan: 'Pro',
        isSubscribed: true,
      },
    });
  });

  describe('1. Portfolio Control Panel Architecture', () => {
    it('elevates Projects as the central operating mechanism in header and subtitle', () => {
      const html = renderToString(<CommandCenterPanel />);

      // Asserts header title & subtitle
      expect(html).toContain('Portfolio Control Panel');
      expect(html).toContain('Projects are the central operating mechanism of your portfolio');
      expect(html).toContain('across 33 Underwriting Datapoints');

      // Asserts 33 Datapoints navigation button in header
      expect(html).toContain('href="/dashboard/insights"');
      expect(html).toContain('33 Datapoints');
    });

    it('renders Active Projects card with internal Deal street address, serial hover, and 33 Datapoints links', () => {
      const html = renderToString(<CommandCenterPanel />);

      expect(html).toContain('data-testid="portfolio-active-projects-panel"');
      expect(html).toContain('Central mechanism for Deals &amp; 33 Datapoints');

      // Check first seed project
      const summaries = listSeedProjectSummaries();
      expect(summaries.length).toBeGreaterThan(0);
      const firstProject = summaries[0];

      // Asserts project card and deal link
      expect(html).toContain(`data-testid="active-project-card-${firstProject.id}"`);
      expect(html).toContain(`data-testid="project-33-datapoints-link-${firstProject.id}"`);
      expect(html).toContain(`/dashboard/insights?project=${firstProject.id}`);

      // Street address displayed with hover title containing full serial address
      const fullAddress = firstProject.dealAddress || firstProject.address;
      expect(html).toContain(`title="${fullAddress}"`);
    });

    it('Quick Launch card explains that Address is Step 1 followed immediately by deal calculation without Address-First or Discovery brow badges', () => {
      const html = renderToString(<CommandCenterPanel />);

      expect(html).toContain('data-testid="quick-launch-create-project"');
      expect(html).not.toContain('Address-First');
      expect(html).not.toContain('>Discovery<');
      expect(html).toContain('The first step is the property address, followed immediately by deal calculation, creating the Deal inside the Project and powering all 33 Underwriting Datapoints.');
    });

    it('Featured metric card provides direct exploration of 33 Datapoints', () => {
      const html = renderToString(<CommandCenterPanel />);

      expect(html).toContain('Open insights →');
      expect(html).toContain('href="/dashboard/insights"');
    });
  });

  describe('2. Project & Deal Data Layer Two-Way Synchronization', () => {
    it('addSeedProject initializes the Deal inside Project and registers it in SEED_RAW_DEALS', () => {
      const testProjectId = `proj-test-${Date.now()}`;
      const testAddress = '902 Colorado St, Austin, TX 78701';

      const created = addSeedProject({
        id: testProjectId,
        propertyName: 'Colorado Street Assets',
        address: testAddress,
        purchasePrice: 620000,
        rehab_costs: 80000,
        estimatedIrr: 0.175,
        exit_strategy: 'Fix & Flip',
        currentPhase: 'acquisition',
      });

      // Assert Project Workspace contains Deal identifiers
      expect(created.id).toBe(testProjectId);
      expect(created.dealAddress).toBe(testAddress);
      expect(created.dealId).toBe(`deal-${testProjectId}`);
      expect(created.dealSlug).toBeDefined();

      // Assert Deal was synchronized into SEED_RAW_DEALS
      const registeredDeal = findSeedDeal(created.dealId!);
      expect(registeredDeal).toBeDefined();
      expect(registeredDeal?.address).toBe(testAddress);
      expect(registeredDeal?.projectId).toBe(testProjectId);
      expect(registeredDeal?.purchasePrice).toBe(620000);
      expect(registeredDeal?.targetIrr).toBe(17.5);
      expect(registeredDeal?.calculatorResults).toBeDefined();
      expect(registeredDeal?.calculatorResults?.purchasePrice).toBe(620000);
      expect(registeredDeal?.calculatorResults?.targetIrr).toBe(17.5);
    });
  });

  describe('3. Project Workspace Shell & Project Folder Card', () => {
    it('ProjectWorkspaceShell header displays Deal inside Project and links to 33 Datapoints', () => {
      const projectSummary = listSeedProjectSummaries()[0];
      const projectWorkspace = {
        ...projectSummary,
        project_id: projectSummary.id,
        property_address: projectSummary.address,
        phase: projectSummary.currentPhase,
        phase_completion_pct: projectSummary.phaseCompletionPct || 45,
        purchase_price: projectSummary.purchasePrice,
        rehab_costs: 50000,
        exit_strategy: 'Fix & Flip',
        entity_type: 'LLC',
        storage_used_bytes: 1000,
        storageQuotaBytes: 500000000,
        todos: [],
        documents: [],
      };

      const html = renderToString(
        <ProjectWorkspaceShell project={projectWorkspace as any}>
          <div>Workspace Content</div>
        </ProjectWorkspaceShell>
      );

      expect(html).toContain('Deal Inside Project');
      expect(html).toContain(`title="Canonical Deal Serial: ${projectSummary.dealAddress || projectSummary.address}"`);
      expect(html).toContain('33 Datapoints');
    });

    it('ProjectFolderCard renders deal street address with hover serial number and 33 Datapoints link', () => {
      const projectSummary = listSeedProjectSummaries()[0];

      const html = renderToString(<ProjectFolderCard project={projectSummary} />);

      expect(html).toContain('data-testid="project-deal-badge"');
      expect(html).toContain('href="/marketplace/');
      expect(html).toContain(`title="${projectSummary.dealAddress || projectSummary.address}"`);
    });

    it('PROJECT_SUBROUTES includes 33 Datapoints under the insights slug', () => {
      const insightsRoute = PROJECT_SUBROUTES.find((r) => r.slug === 'insights');
      expect(insightsRoute).toBeDefined();
      expect(insightsRoute?.label).toBe('33 Datapoints');
    });

    it('AUTHORITATIVE_33_KPIS registry confirms exactly 33 canonical KPIs', () => {
      expect(AUTHORITATIVE_33_KPIS).toHaveLength(33);
      expect(AUTHORITATIVE_33_KPIS[0].name).toBe('Gross Purchase Price');
      expect(AUTHORITATIVE_33_KPIS[32].name).toBe('Investor Profit at Exit');
    });

    it('AcquisitionWorkspaceView renders direct 33 Datapoints link in Underwriting section', () => {
      const projectSummary = listSeedProjectSummaries()[0];
      const projectWorkspace = {
        ...projectSummary,
        project_id: projectSummary.id,
        property_address: projectSummary.address,
        phase: projectSummary.currentPhase,
        phase_completion_pct: projectSummary.phaseCompletionPct || 45,
        purchase_price: projectSummary.purchasePrice,
        rehab_costs: 50000,
        exit_strategy: 'Fix & Flip',
        entity_type: 'LLC',
        storage_used_bytes: 1000,
        storageQuotaBytes: 500000000,
        todos: [],
        documents: [],
      };

      const html = renderToString(
        <AcquisitionWorkspaceView project={projectWorkspace as any} onUpdateProject={jest.fn()} />
      );

      expect(html).toContain('data-testid="project-view-33-datapoints-btn"');
      expect(html).toContain(`/project/${projectSummary.id}/insights`);
      expect(html).toContain('33 Datapoints');
    });
  });

  describe('4. Anti-Slop & Design System Compliance', () => {
    it('never contains the forbidden word "sponsor" in rendered CommandCenterPanel markup', () => {
      const html = renderToString(<CommandCenterPanel />);
      expect(html.toLowerCase()).not.toContain('sponsor');
    });

    it('never contains legacy neon #00DD94 in CommandCenterPanel', () => {
      const html = renderToString(<CommandCenterPanel />);
      expect(html).not.toContain('#00DD94');
      expect(html).not.toContain('#00dd94');
    });

    it('never contains legacy neon #00DD94 in ProjectFolderCard', () => {
      const projectSummary = listSeedProjectSummaries()[0];
      const html = renderToString(<ProjectFolderCard project={projectSummary} />);
      expect(html).not.toContain('#00DD94');
      expect(html).not.toContain('#00dd94');
    });
  });

  describe('5. New Project Address-Then-Deal-Calculation Workflow', () => {
    it('initializes on Step 1 Property Address Intake and leads directly to Step 2 Deal Calculation', () => {
      const html = renderToString(<NewProjectPage />);

      // Asserts Step 1 is active and rendered
      expect(html).toContain('data-testid="step-1-address-intake"');
      expect(html).toContain('Step 1: Property Address Intake');

      // Asserts architecture callout
      expect(html).toContain('The first step is the property address, establishing the physical asset and Deal serial number.');
      expect(html).toContain('Step 2 immediately performs deal calculation across the 33 Underwriting Datapoints.');

      // Asserts Stepper shows Step 2 is Deal Calculation (Bug_15c)
      expect(html).toContain('>Deal Calculation<');
      expect(html).not.toContain('>Deal Calc<');
      expect(html).toContain('Underwriting');

      // Asserts primary continue action directs to Step 2 Deal Calculation
      expect(html).toContain('Continue to Step 2: Deal Calculation');
    });

    it('complies with anti-slop rules: zero neon #00DD94 and zero forbidden sponsor tokens in NewProjectPage', () => {
      const html = renderToString(<NewProjectPage />);
      expect(html.toLowerCase()).not.toContain('sponsor');
      expect(html).not.toContain('#00DD94');
      expect(html).not.toContain('#00dd94');
    });

    it('Bug_07: displays selected template title badge and banner on Create New Project screen for Fix & Flip, BRRRR, and Buy & Hold Rental', () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams('strategy=flip'));
      const flipHtml = renderToString(<NewProjectPage />);
      expect(flipHtml).toContain('data-testid="selected-template-title-badge"');
      expect(flipHtml).toContain('data-testid="selected-strategy-template-banner"');
      expect(flipHtml).toContain('data-testid="selected-template-title"');
      expect(flipHtml).toContain('Fix &amp; Flip Template');
      expect(flipHtml).toContain('Fix &amp; Flip');
      expect(flipHtml).toContain('Capital improvement for rapid resale. Short 6-12 month hold.');

      mockUseSearchParams.mockReturnValue(new URLSearchParams('strategy=brrrr'));
      const brrrrHtml = renderToString(<NewProjectPage />);
      expect(brrrrHtml).toContain('BRRRR Template');
      expect(brrrrHtml).toContain('BRRRR');
      expect(brrrrHtml).toContain('Buy, Rehab, Rent, Refinance, Repeat. Post-rehab equity extraction.');
      expect(brrrrHtml).toContain('7.0% institutional vacancy floor');

      mockUseSearchParams.mockReturnValue(new URLSearchParams('strategy=buy_and_hold_rental'));
      const rentalHtml = renderToString(<NewProjectPage />);
      expect(rentalHtml).toContain('Buy &amp; Hold Rental Template');
      expect(rentalHtml).toContain('Buy &amp; Hold Rental');
      expect(rentalHtml).toContain('Long-term residential rental for durable monthly yield and appreciation.');
      expect(rentalHtml).toContain('6.0% institutional vacancy floor');

      mockUseSearchParams.mockReturnValue(new URLSearchParams());
    });

    it('Bug_14: clamps extreme Target Purchase Price values and applies min-w-0 overflow-hidden + block truncate on Live 33 Underwriting Datapoints Engine KPI cards', () => {
      const maxCurrency = 999_999_999_999;

      mockUseSearchParams.mockReturnValue(
        new URLSearchParams('step=2&price=5000000000000000000000000000000&arv=600000&strategy=flip'),
      );
      const step2Html = renderToString(<NewProjectPage />);

      // Verify Target Purchase Price input has max attribute and clamped value
      const priceInputMatch = step2Html.match(/<input[^>]*id="purchase-price-input"[^>]*>/);
      expect(priceInputMatch).not.toBeNull();
      expect(priceInputMatch?.[0]).toContain(`max="${maxCurrency}"`);
      expect(priceInputMatch?.[0]).toContain(`value="${maxCurrency}"`);

      // Verify all 4 KPI cards in Live 33 Underwriting Datapoints Engine have min-w-0 and overflow-hidden
      const kpiCards = step2Html.match(/<div[^>]*data-testid="underwriting-kpi-card"[^>]*>/g) ?? [];
      expect(kpiCards).toHaveLength(4);
      for (const cardTag of kpiCards) {
        expect(cardTag).toContain('min-w-0');
        expect(cardTag).toContain('overflow-hidden');
      }

      // Verify Cash Required and Expected Net Margin value spans use block truncate and never render $-
      const cashRequiredMatch = step2Html.match(
        /<span[^>]*data-testid="underwriting-kpi-cash-required"[^>]*>/,
      );
      expect(cashRequiredMatch).not.toBeNull();
      expect(cashRequiredMatch?.[0]).toContain('block');
      expect(cashRequiredMatch?.[0]).toContain('truncate');

      const netMarginMatch = step2Html.match(
        /<span[^>]*data-testid="underwriting-kpi-net-margin"[^>]*>/,
      );
      expect(netMarginMatch).not.toBeNull();
      expect(netMarginMatch?.[0]).toContain('block');
      expect(netMarginMatch?.[0]).toContain('truncate');
      expect(step2Html).not.toContain('$-');

      mockUseSearchParams.mockReturnValue(new URLSearchParams());
    });

    it('Bug_15: hides Negative Leverage Detected banner when all 4 KPI cards are non-negative and displays it only when negative KPI values appear in the section', () => {
      // Case 1: Target Purchase Price = 4, Rehab Budget = 5, Estimated ARV = 14 (MAO=$5, Cash Required=$6, Expected Net Margin=$4, Cap Rate=0.00%)
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams('step=2&price=4&rehab=5&arv=14&strategy=flip'),
      );
      const nonNegativeHtml = renderToString(<NewProjectPage />);
      expect(nonNegativeHtml).toContain('title="$5"');
      expect(nonNegativeHtml).toContain('title="$6"');
      expect(nonNegativeHtml).toContain('title="$4"');
      expect(nonNegativeHtml).toContain('title="0.00%"');
      expect(nonNegativeHtml).not.toContain('Negative Leverage Detected');
      expect(nonNegativeHtml).not.toContain('data-testid="negative-leverage-banner"');

      // Case 2: Target Purchase Price = 485000, Rehab Budget = 50000, Estimated ARV = 2000 (produces negative Expected Net Margin -$542,800)
      mockUseSearchParams.mockReturnValue(
        new URLSearchParams('step=2&price=485000&rehab=50000&arv=2000&strategy=flip'),
      );
      const negativeKpiHtml = renderToString(<NewProjectPage />);
      expect(negativeKpiHtml).toContain('-$542,800');
      expect(negativeKpiHtml).toContain('data-testid="negative-leverage-banner"');
      expect(negativeKpiHtml).toContain('Negative Leverage Detected');

      mockUseSearchParams.mockReturnValue(new URLSearchParams());
    });
  });
});


import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { canonicalDemoDeal, reconcileAcquisitionUnderwriting } from '@paperworking/financial-engine';
import { GLOSSARY_TERMS } from '../../lib/marketing/glossary-data.js';
import type { ProjectWorkspace } from '../../lib/projects/types.js';

const mockPush = jest.fn();
const mockFetchSessionProfile = jest.fn<() => Promise<{
  authenticated: boolean;
  accountType?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  usePathname: () => '/deal-calculator',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
}));

const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);
const { default: AcquisitionWorkspaceView } = await import(
  '../../components/projects/AcquisitionWorkspaceView.js'
);

describe('Wave 2 UI Discipline (W2-05, W2-06, W2-07, W2-08)', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
    mockFetchSessionProfile.mockResolvedValue({
      authenticated: true,
      subscriptionStatus: 'active',
    });
  });

  describe('W2-05: IRR Solver Transparency & Hardening in UI', () => {
    it('renders projected IRR with full precision and status honesty', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      // Verify presence of IRR output
      expect(html).toContain('data-testid="irr-output-metric"');
      expect(html).toContain('3.8%');
      // Terminal value method qualifier displayed on the card
      expect(html).toContain('Exit @ 3.0%/yr on $520,000 purchase price');
    });
  });

  describe('W2-06: Terminal-Value Discipline in UI', () => {
    it('renders terminal valuation method selection buttons for all 3 supported methods', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="terminal-method-appreciation"');
      expect(html).toContain('data-testid="terminal-method-exit-cap"');
      expect(html).toContain('data-testid="terminal-method-per-unit"');
      expect(html).toContain('Appreciation %');
      expect(html).toContain('Exit Cap Rate');
      expect(html).toContain('Per Unit Exit');
    });

    it('renders explicit method qualifier label in pro-forma output summary', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('Estimated Exit Valuation');
      expect(html).toContain('Exit @ 3.0%/yr on $520,000 purchase price');
    });
  });

  describe('W2-07: Cap Rate on Cost vs Market Cap Rate Labeling', () => {
    it('qualifies cap rate as "Cap Rate on Cost" on primary cards and summaries', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      // Card title must be "Cap Rate on Cost"
      expect(html).toContain('Cap Rate on Cost');
      // Subtitle/tooltip explains Year-1 NOI / Total Cost Basis
      expect(html).toContain('Year-1 NOI');
      expect(html).toContain('Total Cost Basis');
      // Promotion modal summary line
      const modalHtml = renderToString(
        <DealCalculatorView
          initialAuthenticated={true}
          initialSubscriptionStatus="active"
          initialShowProjectPrompt={true}
        />
      );
      expect(modalHtml).toContain('Cap Rate on Cost / IRR:');
    });

    it('glossary contains distinct entries for both Cap Rate on Cost and Market Cap Rate', () => {
      const capOnCost = GLOSSARY_TERMS.find((t) => t.term.includes('Cap Rate on Cost'));
      expect(capOnCost).toBeDefined();
      expect(capOnCost?.definition).toContain('Total Property Cost Basis');

      const marketCap = GLOSSARY_TERMS.find((t) => t.term.includes('Market Cap Rate'));
      expect(marketCap).toBeDefined();
      expect(marketCap?.definition).toContain('Market Value');
    });
  });

  describe('W2-08: Negative-Leverage Badge', () => {
    it('renders NEGATIVE LEVERAGE warning banner on canonical demo deal', () => {
      // Canonical demo deal:
      // Loan Amount: $390,000, Annual Debt Service: $29,580.00 -> Loan Constant = 7.585%
      // Total Cost Basis: $595,400, NOI: $38,138 -> Yield on Cost = 6.405% (6.4%)
      // Since 6.4% < 7.585%, negative leverage occurs!
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="negative-leverage-banner"');
      expect(html).toContain('Negative Leverage');
      expect(html).toContain('Debt Constant');
      expect(html).toContain('7.58');
      expect(html).toContain('Yield on Cost');
      expect(html).toContain('6.4');
      expect(html).toContain('The debt costs more than the deal yields — returns are amplified downward.');
    });

    it('renders Negative Leverage badge on AcquisitionWorkspaceView when deal exhibits negative leverage', () => {
      const reconciled = reconcileAcquisitionUnderwriting(canonicalDemoDeal);
      expect(reconciled.isNegativeLeverage).toBe(true);

      const project: ProjectWorkspace = {
        id: 'canonical-workspace-deal',
        project_id: 'canonical-workspace-deal',
        propertyName: '2844 Highland Park Blvd',
        address: '2844 Highland Park Blvd, Memphis, TN 38111',
        property_address: '2844 Highland Park Blvd, Memphis, TN 38111',
        city: 'Memphis, TN',
        currentPhase: 'acquisition',
        phase: 'acquisition',
        status: 'Underwriting',
        dispositionType: 'RENT',
        purchasePrice: canonicalDemoDeal.purchasePrice,
        purchase_price: canonicalDemoDeal.purchasePrice,
        rehab_costs: canonicalDemoDeal.rehabBudget,
        exit_strategy: 'Buy & Hold',
        entity_type: 'LLC',
        phase_completion_pct: 35,
        estimatedIrr: 0.038,
        dealId: null,
        dealSlug: null,
        dealAddress: null,
        storage_used_bytes: 1000,
        storageQuotaBytes: 536870912,
        todos: [],
        documents: [],
        acquisitionStatus: 'analyzing',
        contingencies: [],
        underwritingSnapshot: {
          snapshotId: 'snap-canon-1',
          version: 1,
          engineVersion: 4,
          superseded: false,
          createdAt: new Date().toISOString(),
          createdByUid: 'usr-1',
          source: 'deal_calculator',
          calculatorVersion: '2.0.0',
          inputs: canonicalDemoDeal as any,
          outputs: reconciled as any,
          assumptions: {
            notes: 'canonical_demo_deal',
          },
        },
      };

      const html = renderToString(
        <AcquisitionWorkspaceView project={project} onUpdateProject={() => {}} />
      );

      expect(html).toContain('data-testid="acquisition-negative-leverage-badge"');
      expect(html).toContain('Negative Leverage');
      expect(html).toContain('Loan Constant');
      expect(html).toContain('7.58');
      expect(html).toContain('Yield on Cost');
      expect(html).toContain('Debt costs exceed asset yield');
    });
  });
});

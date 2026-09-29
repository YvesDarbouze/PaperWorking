/**
 * Test Suite: REIL Hold Phase Comprehensive Engine & Workspace
 *
 * Verifies:
 * 1. Progressive Disclosure Conversational UX (TurboTax & Clerky pattern).
 * 2. 5 Renovation Tiers (STAGE, REFURBISH, RENOVATE, GUT, DEVELOP) & SOW budget comparison.
 * 3. The 8 Core Holding Cost Pillars with benchmarks (PITI, 1% maintenance, 5-10% CapEx, 8-12% PM).
 * 4. Landlord Insurance +15% to 20% cost notation over standard homeowner policies.
 * 5. Marketing & Advertising Campaign Log across channels with lead tracking.
 * 6. Daily Carrying Burn Rate ((Monthly Burn * 12) / 365) & Holding Drag calculations.
 * 7. Radix Lyra design system (rounded-none, neutral palette) and Anti-Slop copy rules.
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import HoldWorkspaceView from '../../components/projects/HoldWorkspaceView';
import {
  HoldConversationalEngine,
  RenovationTierCard,
  CarryingCostsLedgerCard,
  MarketingAdvertisingCard,
  HoldBurnCalculatorCard,
  RENOVATION_TIER_DETAILS,
} from '../../components/projects/hold';
import type { ProjectWorkspace } from '../../lib/projects/types';
import { deriveAllProjectMetrics } from '@paperworking/financial-engine';

describe('REIL Phase 3: Hold Conversational Engine & Executive Workspace', () => {
  const mockProject: ProjectWorkspace = {
    id: 'proj-hold-spec-1',
    project_id: 'proj-hold-spec-1',
    propertyName: '1247 East 7th Street Triplex',
    address: '1247 East 7th Street, Austin, TX 78702',
    property_address: '1247 East 7th Street, Austin, TX 78702',
    city: 'Austin',
    currentPhase: 'hold',
    phase: 'hold',
    status: 'In Rehabilitation',
    dispositionType: 'RENT',
    purchasePrice: 485000,
    purchase_price: 485000,
    rehab_costs: 65000,
    exit_strategy: 'Buy & Hold Rental',
    entity_type: 'Texas Series LLC',
    storage_used_bytes: 12000000,
    storageQuotaBytes: 524288000,
    phase_completion_pct: 45,
    dealId: 'deal-tx-austin-1247',
    todos: [],
    documents: [],
    funding: {
      loanAmount: 363750,
      interestRatePct: 6.875,
      amortizationYears: 30,
      monthlyDebtService: 2390,
      loanType: 'Bridge / Rehab Loan',
      lenderName: 'Apex Commercial Lending',
    },
    underwriting: {
      rentRoll: {
        grossScheduledRent: 4200,
      },
    } as any,
    teamMembers: [
      { id: 'tm-1', name: 'Marcus Vance', role: 'General Contractor' },
      { id: 'tm-2', name: 'Elena Rostova', role: 'Property Manager' },
    ],
  };

  describe('Progressive Disclosure Conversational UX (One Decision at a Time)', () => {
    it('renders only the first decision screen (Disposition Strategy) on initial load', () => {
      const html = renderToString(
        <HoldConversationalEngine
          project={mockProject}
          onUpdateProject={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      // Verify Screen 1 is active
      expect(html).toContain('data-testid="hold-conversational-engine"');
      expect(html).toContain('data-testid="screen-disposition-strategy"');
      expect(html).toContain('What is your primary exit strategy for this property?');
      expect(html).toContain('Step 1 of 7');

      // Verify Strategy Choices exist
      expect(html).toContain('data-testid="choice-strategy-rent"');
      expect(html).toContain('data-testid="choice-strategy-lease"');
      expect(html).toContain('data-testid="choice-strategy-sale"');

      // Verify subsequent screens are NOT rendered simultaneously (Progressive Disclosure)
      expect(html).not.toContain('data-testid="screen-renovation-tier"');
      expect(html).not.toContain('data-testid="screen-piti-debt-service"');
      expect(html).not.toContain('data-testid="screen-maintenance-capex-reserves"');
      expect(html).not.toContain('data-testid="screen-property-management-utilities"');
      expect(html).not.toContain('data-testid="screen-marketing-advertising"');
      expect(html).not.toContain('data-testid="screen-hold-summary"');
    });

    it('contains plain English context explaining why exit strategy matters', () => {
      const html = renderToString(
        <HoldConversationalEngine
          project={mockProject}
          onUpdateProject={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('Why this matters:');
      expect(html).toContain('When holding for a sale, every day the property sits unfinished accrues mortgage interest');
    });
  });

  describe('5 Renovation Tiers Component (RenovationTierCard)', () => {
    const mockSowItems = [
      {
        id: 'sow-1',
        category: 'Interior Tear-Out',
        description: 'Demolition of non-load bearing partitions',
        contractor: 'Apex Demo Services LLC',
        budgetedAmount: 6500,
        actualAmount: 6200,
        completionPct: 100,
        status: 'completed' as const,
      },
      {
        id: 'sow-2',
        category: 'Kitchen & Bath Remodel',
        description: 'New cabinetry, quartz countertops, plumbing trim',
        contractor: 'Granite & Oak Studio',
        budgetedAmount: 25000,
        actualAmount: 18000,
        completionPct: 70,
        status: 'in_progress' as const,
      },
    ];

    it('renders all 5 standardized Renovation Tiers (STAGE, REFURBISH, RENOVATE, GUT, DEVELOP)', () => {
      const html = renderToString(
        <RenovationTierCard
          project={mockProject}
          selectedTier="RENOVATE"
          onSelectTier={jest.fn()}
          sowItems={mockSowItems}
          onUpdateSowItems={jest.fn()}
          onUpdateProject={jest.fn()}
        />
      );

      expect(html).toContain('data-testid="renovation-tier-card"');
      expect(html).toContain('data-testid="renovation-tier-stage"');
      expect(html).toContain('data-testid="renovation-tier-refurbish"');
      expect(html).toContain('data-testid="renovation-tier-renovate"');
      expect(html).toContain('data-testid="renovation-tier-gut"');
      expect(html).toContain('data-testid="renovation-tier-develop"');

      // Verify specific cost ranges
      expect(html).toContain('$5,000 - $15,000');
      expect(html).toContain('$15,000 - $35,000');
      expect(html).toContain('$35,000 - $80,000');
      expect(html).toContain('$80,000 - $175,000');
      expect(html).toContain('$175,000+');
    });

    it('renders the Budget vs. Committed SOW vs. Incurred Spend reconciliation card', () => {
      const html = renderToString(
        <RenovationTierCard
          project={mockProject}
          selectedTier="RENOVATE"
          onSelectTier={jest.fn()}
          sowItems={mockSowItems}
          onUpdateSowItems={jest.fn()}
          onUpdateProject={jest.fn()}
        />
      );

      expect(html).toContain('data-testid="rehab-budget-comparison"');
      expect(html).toContain('Baseline Budget');
      expect(html).toContain('Committed SOW');
      expect(html).toContain('Actual Incurred');
      expect(html).toContain('Variance (Budget - Actual)');
      expect(html).toContain('Scope of Work (SOW) Line Item Execution');
    });
  });

  describe('The 8 Core Holding Cost Pillars (CarryingCostsLedgerCard)', () => {
    const mockHoldingCosts = [
      {
        id: 'cc-1',
        category: 'piti_debt_service' as const,
        name: 'Mortgage Principal & Interest',
        frequency: 'monthly' as const,
        monthlyAmount: 2390,
        dueDay: 1,
        status: 'active' as const,
      },
      {
        id: 'cc-2',
        category: 'piti_property_taxes' as const,
        name: 'County Property Taxes Escrow',
        frequency: 'monthly' as const,
        monthlyAmount: 480,
        dueDay: 1,
        status: 'active',
      },
      {
        id: 'cc-3',
        category: 'piti_insurance' as const,
        name: 'Landlord Hazard & Liability Insurance (DP-3)',
        frequency: 'monthly' as const,
        monthlyAmount: 260,
        dueDay: 1,
        status: 'active',
      },
      {
        id: 'cc-4',
        category: 'maintenance_repairs' as const,
        name: 'Routine Upkeep & Maintenance',
        frequency: 'monthly' as const,
        monthlyAmount: 404,
        dueDay: 5,
        status: 'active',
      },
    ];

    it('renders holding cost ledger with 1% maintenance rule and CapEx 5-10% benchmarks', () => {
      const html = renderToString(
        <CarryingCostsLedgerCard
          project={mockProject}
          holdingCosts={mockHoldingCosts as any}
          onUpdateHoldingCosts={jest.fn()}
          isSelfManaged={false}
          onToggleSelfManaged={jest.fn()}
          propertyManagementFeePct={8.0}
          onChangeManagementFeePct={jest.fn()}
        />
      );

      expect(html).toContain('data-testid="carrying-costs-ledger-card"');
      expect(html).toContain('Monthly Carrying Burn');
      expect(html).toContain('Daily Holding Run Rate');
      expect(html).toContain('Annualized Carrying Cost');

      // Rule of Thumb Benchmarks
      expect(html).toContain('Maintenance 1% Rule');
      expect(html).toContain('CapEx 5% - 10% Reserve');
      expect(html).toContain('Landlord Insurance (DP-3)');
      expect(html).toContain('+15% - 20%');

      // Property Management
      expect(html).toContain('Pillar 5: Property Management Strategy');
      expect(html).toContain('Benchmark for professional management: 8% to 12% of collected rent');
      expect(html).toContain('data-testid="toggle-self-managed"');
      expect(html).toContain('data-testid="toggle-pro-managed"');

      // 50% Rule Guideline Check (Non-debt operating expenses: 480 + 260 + 404 = $1,144 / $4,200 = 27.2% <= 50%)
      expect(html).toContain('data-testid="fifty-percent-rule-indicator"');
      expect(html).toContain('data-testid="fifty-percent-rule-badge"');
      expect(html).toContain('PASS (≤ 50% Rule)');
      expect(html).toContain('27.2% of Gross Rent');
    });

    it('triggers 50% Rule warning badge when operating expenses exceed 50% of gross rent', () => {
      const highOperatingCosts = [
        {
          id: 'cc-high-1',
          category: 'piti_property_taxes' as const,
          name: 'High Property Taxes',
          frequency: 'monthly' as const,
          monthlyAmount: 1400,
          dueDay: 1,
          status: 'active' as const,
        },
        {
          id: 'cc-high-2',
          category: 'maintenance_repairs' as const,
          name: 'Heavy Upkeep',
          frequency: 'monthly' as const,
          monthlyAmount: 1100,
          dueDay: 5,
          status: 'active' as const,
        },
      ];

      // Operating expenses = 1400 + 1100 = 2500 / 4200 = 59.5% > 50%
      const html = renderToString(
        <CarryingCostsLedgerCard
          project={mockProject}
          holdingCosts={highOperatingCosts as any}
          onUpdateHoldingCosts={jest.fn()}
          isSelfManaged={true}
          onToggleSelfManaged={jest.fn()}
          propertyManagementFeePct={0}
          onChangeManagementFeePct={jest.fn()}
        />
      );

      expect(html).toContain('data-testid="fifty-percent-rule-indicator"');
      expect(html).toContain('data-testid="fifty-percent-rule-badge"');
      expect(html).toContain('WARNING (&gt; 50% Rule)');
      expect(html).toContain('59.5% of Gross Rent');
    });
  });

  describe('Marketing & Advertising Campaign Log (MarketingAdvertisingCard)', () => {
    const mockListingAds = [
      {
        id: 'ad-1',
        channel: 'Zillow' as const,
        datePlaced: '2026-03-01',
        spendAmount: 120,
        isRecurring: true,
        status: 'active' as const,
        inquiriesGenerated: 14,
        showingsScheduled: 6,
        applicationsReceived: 2,
      },
      {
        id: 'ad-2',
        channel: 'Facebook Marketplace' as const,
        datePlaced: '2026-03-05',
        spendAmount: 60,
        isRecurring: false,
        status: 'active' as const,
        inquiriesGenerated: 19,
        showingsScheduled: 8,
        applicationsReceived: 1,
      },
    ];

    it('renders marketing ad log with spend, inquiry, showing, and application KPIs', () => {
      const html = renderToString(
        <MarketingAdvertisingCard
          project={mockProject}
          listingAds={mockListingAds}
          onUpdateListingAds={jest.fn()}
          dispositionStrategy="RENT"
        />
      );

      expect(html).toContain('data-testid="marketing-advertising-card"');
      expect(html).toContain('Marketing Campaign Log');
      expect(html).toContain('Total Ad Spend');
      expect(html).toContain('Inquiries / Leads');
      expect(html).toContain('Showings Conducted');
      expect(html).toContain('Applications / Offers');
      expect(html).toContain('Zillow');
      expect(html).toContain('Facebook Marketplace');
      expect(html).toContain('data-testid="add-ad-campaign-btn"');
    });
  });

  describe('Hold Burn Rate & Holding Drag Calculator (HoldBurnCalculatorCard)', () => {
    it('calculates daily burn rate and cumulative holding drag correctly', () => {
      const monthlyBurn = 3650;
      // Daily burn = (3650 * 12) / 365 = 43800 / 365 = 120
      const html = renderToString(
        <HoldBurnCalculatorCard
          project={mockProject}
          monthlyBurn={monthlyBurn}
          dispositionStrategy="SALE"
          targetARV={710000}
          initialDaysInHold={90}
        />
      );

      expect(html).toContain('data-testid="hold-burn-calculator-card"');
      expect(html).toContain('$120 / Day');
      expect(html).toContain('$3,650 / Month');
      expect(html).toContain('Projected Holding Duration:');
      expect(html).toContain('90 Days (3 Months)');
      // 120 * 90 = $10,800 holding drag
      expect(html).toContain('-$10,800');
      expect(html).toContain('Total Carrying Drag');
      expect(html).toContain('Profit Margin Erosion');
    });

    it('calculates Fix-and-Flip Breakeven Resale Selling Price and 6-month holding benchmark', () => {
      const monthlyBurn = 3650;
      const html = renderToString(
        <HoldBurnCalculatorCard
          project={mockProject}
          monthlyBurn={monthlyBurn}
          dispositionStrategy="SALE"
          targetARV={710000}
          initialDaysInHold={90}
        />
      );

      // Verify Breakeven Resale Card exists
      expect(html).toContain('data-testid="breakeven-resale-calculator"');
      expect(html).toContain('Breakeven Resale Selling Price Formula');
      expect(html).toContain('data-testid="breakeven-selling-price"');
      expect(html).toContain('data-testid="breakeven-headroom-badge"');

      // Verify components of Breakeven Formula:
      // Purchase price: $485,000, Rehab: $65,000, Closing: $9,700, Drag (90d): $10,800
      // Total Invested = $570,500
      // Breakeven price at 5% commission = $570,500 / 0.95 = $600,526
      expect(html).toContain('$485,000');
      expect(html).toContain('$65,000');
      expect(html).toContain('$9,700');
      expect(html).toContain('+$10,800');
      expect(html).toContain('$600,526');

      // 6-Month Rule-of-Thumb Holding Period Benchmark (180 days)
      expect(html).toContain('6-Month Benchmark (180 Days Standard Rule)');
      // 180 * 120 = $21,600 holding drag
      expect(html).toContain('-$21,600');
    });
  });

  describe('HoldWorkspaceView Executive Mode & Anti-Slop Discipline', () => {
    it('renders Executive Workspace with tabs and header card', () => {
      const html = renderToString(
        <HoldWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
      );

      expect(html).toContain('data-testid="hold-workspace-view"');
      expect(html).toContain('data-testid="hold-deal-header-card"');
      expect(html).toContain('REIL Phase 03: Hold Workspace');
      expect(html).toContain('deal-tx-austin-1247');
      expect(html).toContain('1247 East 7th Street, Austin, TX 78702');
      expect(html).toContain('data-testid="hold-tab-renovation"');
      expect(html).toContain('data-testid="hold-tab-financials"');
      expect(html).toContain('data-testid="hold-tab-marketing"');
      expect(html).toContain('data-testid="hold-tab-management"');
    });

    it('strictly satisfies Anti-Slop copywriting rules (zero em dashes, zero forbidden terms)', () => {
      const html = renderToString(
        <HoldWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
      );

      // No em-dashes
      expect(html).not.toContain('—');
      expect(html).not.toContain('&mdash;');

      // No forbidden words
      expect(html.toLowerCase()).not.toContain('delve');
      expect(html.toLowerCase()).not.toContain('tapestry');
      expect(html.toLowerCase()).not.toContain('seamless');
      expect(html.toLowerCase()).not.toContain('game-changer');
    });

    it('satisfies Radix Lyra design requirements (rounded-none precision controls)', () => {
      const convHtml = renderToString(
        <HoldConversationalEngine
          project={mockProject}
          onUpdateProject={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      // Conversational Engine strictly adheres to Radix Lyra rounded-none
      expect(convHtml).toContain('rounded-none');
      expect(convHtml).not.toContain('rounded-2xl');
      expect(convHtml).not.toContain('rounded-xl');

      // Workspace view header adheres to rounded-none
      const wsHtml = renderToString(
        <HoldWorkspaceView project={mockProject} onUpdateProject={jest.fn()} />
      );
      expect(wsHtml).toContain('data-testid="hold-workspace-view"');
      expect(wsHtml).toContain('rounded-none');
    });
  });

  describe('Hold Phase KPI Integration & Underwriting Contract', () => {
    it('wires holdPhase into financial engine derived metrics (avgDailyHoldingCost, rehabOverrunPct, daysInHold)', async () => {
      const projectWithHold = {
        ...mockProject,
        holdPhase: {
          targetDisposition: 'RENT' as const,
          renovationTier: 'RENOVATE' as const,
          initialRehabBudget: 60000,
          committedSowBudget: 66000, // 10% overrun
          actualRehabSpend: 66000,
          finalProjectedCost: 66000,
          daysInHold: 120,
          holdingCosts: [
            {
              id: 'cc-1',
              category: 'piti_debt_service' as const,
              name: 'Debt Service',
              frequency: 'monthly' as const,
              monthlyAmount: 2000,
              status: 'active' as const,
            },
            {
              id: 'cc-2',
              category: 'piti_property_taxes' as const,
              name: 'Taxes',
              frequency: 'monthly' as const,
              monthlyAmount: 500,
              status: 'active' as const,
            },
            {
              id: 'cc-3',
              category: 'maintenance_repairs' as const,
              name: 'Maintenance',
              frequency: 'monthly' as const,
              monthlyAmount: 500,
              status: 'active' as const,
            },
          ],
          listingAds: [],
          isSelfManaged: false,
          propertyManagementFeePct: 8.0,
        },
      };

      const metrics = await deriveAllProjectMetrics(projectWithHold.id, {
        mockData: projectWithHold,
      });

      // Total monthly holding = 2000 + 500 + 500 = $3000/mo
      // Daily holding cost = (3000 * 12) / 365 = 36000 / 365 = 98.63
      expect(metrics.derived.avgDailyHoldingCost).toBe(98.63);

      // Rehab overrun = ((66000 - 60000) / 60000) * 100 = 10.0%
      expect(metrics.derived.rehabOverrunPct).toBe(10.0);

      // Days in hold = 120
      expect(metrics.derived.daysInHold).toBe(120);

      // Cumulative drag = Math.round(98.63 * 120) = 11836
      expect(metrics.derived.cumulativeHoldingDrag).toBe(11836);
    });
  });
});

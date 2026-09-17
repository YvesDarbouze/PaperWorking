import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import SupersededSnapshotBadge from '../../components/calculator/SupersededSnapshotBadge.js';
import AcquisitionWorkspaceView from '../../components/projects/AcquisitionWorkspaceView.js';
import FundWorkspaceView from '../../components/projects/FundWorkspaceView.js';
import type { ProjectWorkspace } from '../../lib/projects/types.js';

describe('SupersededSnapshotBadge & Superseded-Record Rendering Protections', () => {
  it('renders the exact required badge text: "Superseded — pre-DCF engine"', () => {
    const html = renderToString(<SupersededSnapshotBadge />);
    expect(html).toContain('Superseded — pre-DCF engine');
    expect(html).toContain('pre-DCF');
    expect(html).toContain('data-testid="superseded-snapshot-badge"');
  });

  const baseProject: ProjectWorkspace = {
    id: 'proj-superseded-test',
    project_id: 'proj-superseded-test',
    propertyName: '450 West 42nd St',
    address: '450 West 42nd St, New York, NY 10036',
    property_address: '450 West 42nd St, New York, NY 10036',
    city: 'New York, NY',
    currentPhase: 'acquisition',
    phase: 'acquisition',
    status: 'Underwriting',
    dispositionType: 'SALE',
    purchasePrice: 1250000,
    purchase_price: 1250000,
    rehab_costs: 150000,
    exit_strategy: 'Value-Add Flip',
    entity_type: 'LLC',
    phase_completion_pct: 35,
    estimatedIrr: 0.152,
    dealId: null,
    dealSlug: null,
    dealAddress: null,
    storage_used_bytes: 5000,
    storageQuotaBytes: 536870912,
    todos: [],
    documents: [],
    acquisitionStatus: 'analyzing',
    contingencies: [],
    tasks: [],
  };

  const v1SupersededSnapshot = {
    snapshotId: 'snap-mtw1xydy-xlq1',
    version: 1,
    engineVersion: 1,
    superseded: true,
    createdAt: '2026-08-01T12:00:00.000Z',
    createdByUid: 'usr-analyst-legacy',
    source: 'deal_calculator' as const,
    calculatorVersion: '1.0.0',
    inputs: {
      strategy: 'flip' as const,
      purchasePrice: 1250000,
      buyerClosingCostsPct: 2.0,
      buyerClosingCostsAmount: 25000,
      rehabBudget: 150000,
      estimatedARV: 1750000,
      grossMonthlyRent: 8500,
      otherMonthlyIncome: 0,
      vacancyRatePct: 5.0,
      operatingExpenseRatioPct: 35.0,
      annualPropertyTax: 15000,
      annualInsurance: 4000,
      monthlyHOA: 0,
      monthlyManagementFeePct: 8.0,
      targetLtvPct: 75.0,
      interestRatePct: 6.5,
      amortizationYears: 30,
      interestOnlyMonths: 0,
      holdPeriodYears: 5,
      exitCapRatePct: 6.5,
      costOfSalePct: 5.0,
    },
    outputs: {
      totalCostBasis: 1425000,
      loanAmount: 937500,
      cashRequired: 487500,
      grossOperatingIncome: 96900,
      totalOperatingExpenses: 33915,
      netOperatingIncome: 62985,
      monthlyDebtService: 5925.64,
      annualDebtService: 71107.68,
      annualNetCashFlow: -8122.68,
      capRateOnCost: 4.42,
      cashOnCashReturnPct: -1.67,
      projectedIrrPct: 15.2, // Legacy heuristic false IRR
      dscr: 0.89,
      ltvPct: 75.0,
      grossRentMultiplier: 12.25,
      maximumAllowableOffer70Pct: 1075000,
      calculatedAt: '2026-08-01T12:00:00.000Z',
      engineVersion: '1.0.0',
    },
    assumptions: {
      notes: 'Historical underwriting snapshot from v1 heuristic era.',
    },
  };

  const v2ActiveSnapshot = {
    ...v1SupersededSnapshot,
    snapshotId: 'snap-mtw4dfqy-ybid',
    version: 2,
    engineVersion: 2,
    superseded: false,
    outputs: {
      ...v1SupersededSnapshot.outputs,
      projectedIrrPct: 3.8, // True DCF root-finding IRR
      engineVersion: '2.0.0',
    },
    assumptions: {
      notes: 'Truth-era underwriting snapshot from v2 DCF engine.',
    },
  };

  describe('AcquisitionWorkspaceView render-path policy', () => {
    it('displays SupersededSnapshotBadge and Historical Underwriting Archive for v1 records', () => {
      const project: ProjectWorkspace = {
        ...baseProject,
        underwritingSnapshot: v1SupersededSnapshot,
      };

      const html = renderToString(
        <AcquisitionWorkspaceView project={project} onUpdateProject={() => {}} />,
      );

      // Must display badge
      expect(html).toContain('Superseded — pre-DCF engine');
      // Must display historical archive header rather than active lineage
      expect(html).toContain('Historical Underwriting Archive');
      expect(html).toContain('data-testid="view-superseded-snapshot-btn"');
      expect(html).not.toContain('data-testid="view-snapshot-lineage-btn"');
    });

    it('displays active Engine v2 lineage and active metrics for v2 records', () => {
      const project: ProjectWorkspace = {
        ...baseProject,
        underwritingSnapshot: v2ActiveSnapshot,
      };

      const html = renderToString(
        <AcquisitionWorkspaceView project={project} onUpdateProject={() => {}} />,
      );

      // Must NOT display superseded badge
      expect(html).not.toContain('Superseded — pre-DCF engine');
      expect(html).not.toContain('Historical Underwriting Archive');
      // Must display active lineage
      expect(html).toContain('Snapshot Lineage Details');
      expect(html).toMatch(/Engine v(<!-- -->)?2/);
      expect(html).toContain('data-testid="view-snapshot-lineage-btn"');
      expect(html).not.toContain('data-testid="view-superseded-snapshot-btn"');
    });
  });

  describe('FundWorkspaceView render-path policy', () => {
    it('displays SupersededSnapshotBadge and flags v1 records in fund phase', () => {
      const project: ProjectWorkspace = {
        ...baseProject,
        phase: 'purchase',
        currentPhase: 'purchase',
        underwritingSnapshot: v1SupersededSnapshot,
      };

      const html = renderToString(
        <FundWorkspaceView project={project} onUpdateProject={() => {}} />,
      );

      // Must display badge and superseded button
      expect(html).toContain('Superseded — pre-DCF engine');
      expect(html).toContain('data-testid="view-superseded-snapshot-btn"');
      // Must NOT display active lineage button
      expect(html).not.toContain('data-testid="view-snapshot-lineage-btn"');
    });

    it('displays active Underwriting Lineage for v2 records in fund phase', () => {
      const project: ProjectWorkspace = {
        ...baseProject,
        phase: 'purchase',
        currentPhase: 'purchase',
        underwritingSnapshot: v2ActiveSnapshot,
      };

      const html = renderToString(
        <FundWorkspaceView project={project} onUpdateProject={() => {}} />,
      );

      // Must NOT display superseded badge or superseded button
      expect(html).not.toContain('Superseded — pre-DCF engine');
      expect(html).not.toContain('data-testid="view-superseded-snapshot-btn"');
      // Must display active lineage button
      expect(html).toContain('data-testid="view-snapshot-lineage-btn"');
      expect(html).toContain('Underwriting Lineage');
    });
  });
});

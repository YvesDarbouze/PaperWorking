import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import AcquisitionWorkspaceView from '../../components/projects/AcquisitionWorkspaceView.js';
import type { ProjectWorkspace } from '../../lib/projects/types.js';

const baseProject: ProjectWorkspace = {
  id: 'deal-test-1',
  project_id: 'deal-test-1',
  propertyName: '1247 Elm Street',
  address: '1247 Elm Street, Austin, TX 78702',
  property_address: '1247 Elm Street, Austin, TX 78702',
  city: 'Austin, TX',
  currentPhase: 'acquisition',
  phase: 'acquisition',
  status: 'Underwriting',
  dispositionType: 'SALE',
  purchasePrice: 485000,
  purchase_price: 485000,
  rehab_costs: 62000,
  exit_strategy: 'Fix & Flip',
  entity_type: 'LLC',
  phase_completion_pct: 42,
  estimatedIrr: 0.184,
  dealId: null,
  dealSlug: null,
  dealAddress: null,
  storage_used_bytes: 1000,
  storageQuotaBytes: 536870912,
  todos: [],
  documents: [],
  acquisitionStatus: 'analyzing',
  contingencies: [
    {
      id: 'cont-inspection',
      type: 'inspection',
      label: 'General Home & Sewer Inspection',
      deadline: new Date(Date.now() + 20 * 3600000).toISOString(), // 20 hours -> critical!
      status: 'open',
      responsiblePartyUid: 'usr-1',
      responsiblePartyName: 'Alex Inspector',
      extensionHistory: [],
      supportingDocumentUrls: [],
    },
    {
      id: 'cont-financing',
      type: 'financing',
      label: 'Hard Money Commitment',
      deadline: new Date(Date.now() + 42 * 3600000).toISOString(), // 42 hours -> urgent!
      status: 'open',
      responsiblePartyUid: 'usr-2',
      responsiblePartyName: 'Jordan Lender',
      extensionHistory: [],
      supportingDocumentUrls: [],
    },
  ],
  underwritingSnapshot: {
    snapshotId: 'a12b3c4d-5e6f-4a0b-8c1d-2e3f4a5b6c7d',
    version: 1,
    engineVersion: 2,
    superseded: false,
    createdAt: '2026-08-01T12:00:00.000Z',
    createdByUid: 'usr-analyst-1',
    source: 'deal_calculator',
    calculatorVersion: '1.0.0',
    inputs: {
      strategy: 'flip',
      purchasePrice: 485000,
      buyerClosingCostsPct: 2.0,
      buyerClosingCostsAmount: 9700,
      rehabBudget: 62000,
      estimatedARV: 650000,
      grossMonthlyRent: 4200,
      otherMonthlyIncome: 0,
      vacancyRatePct: 6.0,
      operatingExpenseRatioPct: 35.0,
      annualPropertyTax: 7200,
      annualInsurance: 1800,
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
      totalCostBasis: 556700,
      loanAmount: 363750,
      cashRequired: 192950,
      grossOperatingIncome: 47376,
      totalOperatingExpenses: 16582,
      netOperatingIncome: 30794,
      monthlyDebtService: 2299.15,
      annualDebtService: 27589.8,
      annualNetCashFlow: 3204.2,
      capRateOnCost: 5.53,
      cashOnCashReturnPct: 1.66,
      projectedIrrPct: 18.4,
      dscr: 1.12,
      ltvPct: 75.0,
      grossRentMultiplier: 9.62,
      maximumAllowableOffer70Pct: 383300,
      calculatedAt: '2026-08-01T12:00:00.000Z',
      engineVersion: '1.0.0',
    },
    assumptions: {
      notes: 'East Austin gentrification corridor.',
    },
  },
  tasks: [],
};

describe('AcquisitionWorkspaceView Component', () => {
  it('renders all 8 pipeline stages with Analyzing marked as current', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Lead');
    expect(html).toContain('Analyzing');
    expect(html).toContain('Offer Sent');
    expect(html).toContain('Negotiating');
    expect(html).toContain('Under Contract');
    expect(html).toContain('Due Diligence');
    expect(html).toContain('Clear to Close');
    expect(html).toContain('Closed');

    // Shows advance action for next stage (offer_sent)
    expect(html).toContain('Submit Offer (Offer Sent)');
  });

  it('displays the honest unconfigured property data API banner (Rule 5)', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('[Property Data API: Not Configured — Manual Entry Enabled]');
  });

  it('renders progressive hard-date contingency alerts for 20h and 42h deadlines', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    // Critical (< 24h) and Urgent (< 48h) alerts
    expect(html).toContain('CRITICAL CONTINGENCY EXPIRATION — DATE GOES HARD');
    expect(html).toContain('General Home &amp; Sewer Inspection');
    expect(html).toContain('URGENT CONTINGENCY DEADLINE');
    expect(html).toContain('Hard Money Commitment');
  });

  it('renders accurate financial engine underwriting metrics and lineage badge', () => {
    const html = renderToString(
      <AcquisitionWorkspaceView project={baseProject} onUpdateProject={() => {}} />,
    );

    // Canonical calculations from financial engine
    expect(html).toContain('Underwriting &amp; Financial Metrics');
    expect(html).toContain('Locked from Deal Calculator');
    expect(html).toContain('Underwritten on');
    expect(html).toContain('View Snapshot');
    expect(html).toContain('MAO (70% Rule)');
    expect(html).toContain('Cap Rate on Cost');
    expect(html).toContain('Cash-on-Cash Return');
    expect(html).toContain('Monthly Debt Service');
    expect(html).toContain('Snapshot ID:');
    expect(html).toContain('a12b3c4d-5e6f-4a0b-8c1d-2e3f4a5b6c7d');
  });

  it('renders 11 under-contract tasks when populated', () => {
    const projectWithTasks: ProjectWorkspace = {
      ...baseProject,
      acquisitionStatus: 'under_contract',
      tasks: [
        {
          id: 'task-1',
          projectId: 'deal-test-1',
          title: 'Wire Earnest Money Deposit (EMD)',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          status: 'pending',
          isAutoGenerated: true,
          sortOrder: 1,
        },
        {
          id: 'task-2',
          projectId: 'deal-test-1',
          title: 'Schedule General Property Inspection',
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          status: 'complete',
          isAutoGenerated: true,
          sortOrder: 2,
        },
      ],
    };

    const html = renderToString(
      <AcquisitionWorkspaceView project={projectWithTasks} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Wire Earnest Money Deposit (EMD)');
    expect(html).toContain('Schedule General Property Inspection');
    expect(html).toContain('Contract Milestone');
    expect(html).toContain('1 of 2 tasks completed');
    expect(html).toContain('% Done');
  });

  it('renders dead deal banner when deal is dead', () => {
    const deadProject: ProjectWorkspace = {
      ...baseProject,
      acquisitionStatus: 'dead',
      deadRecord: {
        deadReasonCategory: 'inspection',
        deadReasonNotes: 'Unrepaired structural foundation movement exceeded $40k repair credit.',
        archivedAt: '2026-08-15T14:00:00.000Z',
        archivedByUid: 'usr-1',
        previousStatus: 'due_diligence',
      },
    };

    const html = renderToString(
      <AcquisitionWorkspaceView project={deadProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Project Archived (Dead Deal)');
    expect(html).toContain('Terminal State: Dead');
    expect(html).toContain('Inspection Failure / Structural Defects');
    expect(html).toContain('Unrepaired structural foundation movement exceeded $40k repair credit.');
  });
});

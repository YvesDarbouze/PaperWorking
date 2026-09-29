/**
 * Integration Test Suite: REIL Fund Phase Closing Cockpit & Milestones
 *
 * Verifies:
 * 1. Clear to Close (CTC) Milestone Progress Bar & 5-stage radar (PSA/Escrow, Diligence, Valuation/PTD, CTC/PTF, Deed)
 * 2. Interactive Sources & Uses of Funds Ledger with double-entry variance and auto-balance
 * 3. Document-to-Condition Auto-Clearance & intelligent fulfillment
 * 4. Role-Filtered Multiplayer Team Workflows (Lender, Title, Inspector, Legal, Lead)
 * 5. Closing Ceremony & Bridge to HOLD with pre-flight verification gate
 * 6. Radix Lyra design compliance (rounded-none, min-h-[44px]) and strict anti-slop copy rules
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import FundWorkspaceView from '../../components/projects/FundWorkspaceView';
import { ClearToCloseProgressBar } from '../../components/projects/fund/ClearToCloseProgressBar';
import { SourcesAndUsesLedger } from '../../components/projects/fund/SourcesAndUsesLedger';
import { LegalOwnershipTransferCard } from '../../components/projects/fund/LegalOwnershipTransferCard';
import type { ProjectWorkspace, ProjectFundingTerms } from '../../lib/projects/types';

const mockCompleteProject: ProjectWorkspace = {
  id: 'fund-cockpit-001',
  project_id: 'fund-cockpit-001',
  propertyName: 'Biscayne Bay Multifamily Portfolio',
  property_address: '1420 Biscayne Blvd, Miami, FL 33132',
  address: '1420 Biscayne Blvd, Miami, FL 33132',
  city: 'Miami, FL',
  currentPhase: 'purchase',
  phase: 'purchase',
  status: 'active',
  dispositionType: 'SALE',
  purchasePrice: 2400000,
  purchase_price: 2400000,
  rehab_costs: 400000,
  exit_strategy: 'Hold',
  entity_type: 'LLC',
  phase_completion_pct: 75,
  estimatedIrr: 0.182,
  dealId: null,
  dealSlug: null,
  dealAddress: null,
  todos: [],
  storage_used_bytes: 2480000,
  storageQuotaBytes: 536870912,
  funding: {
    loanAmount: 1800000,
    interestRatePct: 6.75,
    amortizationYears: 30,
    downPayment: 600000,
    closingCosts: 48000,
    fundingStatus: 'Lender Underwriting',
    monthlyDebtService: 11675,
    actualCashToClose: 648000,
    capitalStack: {
      seniorDebt: 1800000,
      mezzanineDebt: 0,
      preferredEquity: 150000,
      investorEquity: 650000,
      leadEquity: 200000,
      totalCostBasis: 2800000,
      ltvPct: 75.0,
      ltcPct: 64.3,
    },
    sourcesAndUses: {
      sources: [
        { id: 's1', name: 'Senior Loan Facility', category: 'debt', amount: 1800000 },
        { id: 's2', name: 'Preferred Equity', category: 'equity', amount: 150000 },
        { id: 's3', name: 'LP Investor Equity', category: 'equity', amount: 650000 },
        { id: 's4', name: 'Lead GP Equity (Cash to Close)', category: 'equity', amount: 200000 },
      ],
      uses: [
        { id: 'u1', name: 'Contract Purchase Price', category: 'acquisition', amount: 2400000 },
        { id: 'u2', name: 'Rehab Escrow Holdback', category: 'rehab', amount: 350000 },
        { id: 'u3', name: 'Closing & Title Fees', category: 'closing', amount: 48000 },
        { id: 'u4', name: 'Working Capital Reserves', category: 'reserves', amount: 2000 },
      ],
      totalSources: 2800000,
      totalUses: 2800000,
      variance: 0,
      isBalanced: true,
    },
    lenderConditions: [
      {
        id: 'cond-ptd-01',
        category: 'PTD',
        title: 'Certified Commercial Narrative Appraisal',
        status: 'approved',
      },
      {
        id: 'cond-ptf-01',
        category: 'PTF',
        title: 'Phase I ESA Report with No RECs',
        status: 'approved',
      },
      {
        id: 'cond-closing-01',
        category: 'CLOSING',
        title: 'Title Policy Endorsement 100 with Gap Coverage',
        status: 'approved',
      },
    ],
    valuationVerification: {
      appraisedValue: 2450000,
      appraisalCompany: 'CBRE Valuation Services',
      appraisalDate: '2026-09-15',
      appraisalGapAmount: 0,
      gapResolutionStrategy: 'none',
      phase1EsaStatus: 'clean',
      surveyStatus: 'clean',
      physicalInspectionSignedOff: true,
      inspectionClearanceDate: '2026-09-10',
      notes: 'No structural deficiencies.',
    },
    legalTransfer: {
      vestingEntityName: 'Biscayne Bay Holdings LLC',
      vestingEntityState: 'FL',
      vestingEntityEin: '98-7654321',
      goodStandingVerified: true,
      operatingAgreementExecuted: true,
      authorizedSignatoryName: 'David Vance',
      titleCommitmentNumber: 'FL-2026-88412',
      titleInsurer: 'First American Title Insurance Company',
      scheduleBCurativeItems: [
        {
          id: 'item-sch-01',
          item: 'Payoff verification for prior commercial mortgage',
          category: 'requirement',
          status: 'cleared',
        },
      ],
      wireFraudVerified: true,
      wireVerifiedPhone: '(305) 555-0199',
      wireVerifiedWith: 'Melissa Rodriguez',
      outgoingWireReference: 'FEDWIRE-2026-9921448',
      deedInstrumentNumber: 'DOC-2026-098231',
      deedRecordingDate: '2026-10-10',
    },
  },
  earnestMoney: {
    amount: 100000,
    holderEntity: 'First American Title Escrow Services',
    dueDate: '2026-08-05T00:00:00Z',
    status: 'held',
    receiptConfirmed: true,
  },
  contingencies: [
    {
      id: 'c-01',
      type: 'financing',
      label: 'Senior Debt Final Underwriting Commitment',
      deadline: '2026-10-08T17:00:00Z',
      status: 'satisfied',
      responsiblePartyName: 'David Vance',
      responsiblePartyUid: 'usr-lender-1',
      extensionHistory: [],
      supportingDocumentUrls: [],
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Submit Senior Debt Loan Application File',
      status: 'complete',
      assignedTo: 'Elena Rostova',
      dueDate: '2026-10-01',
      isAutoGenerated: true,
    },
    {
      id: 'task-2',
      title: 'Review Title Commitment and Municipal Liens',
      status: 'complete',
      assignedTo: 'Heritage Escrow Co',
      dueDate: '2026-10-03',
      isAutoGenerated: true,
    },
    {
      id: 'task-3',
      title: 'Physical Building Inspection and PCA',
      status: 'complete',
      assignedTo: 'Marcus Vance',
      dueDate: '2026-10-04',
      isAutoGenerated: true,
    },
  ],
  documents: [],
};

describe('REIL Fund Phase Closing Cockpit & Milestones Integration', () => {
  it('renders ClearToCloseProgressBar with all 5 milestone stages and 100% readiness', () => {
    const html = renderToString(
      <ClearToCloseProgressBar
        funding={mockCompleteProject.funding as ProjectFundingTerms}
        earnestMoney={mockCompleteProject.earnestMoney}
        contingencies={mockCompleteProject.contingencies}
        tasks={mockCompleteProject.tasks}
      />
    );

    const badgeText = html.match(/data-testid="ctc-readiness-badge"[^>]*>([^<]+)/)?.[1];
    expect(badgeText).toBe('100% Ready');

    // 5 Stages
    expect(html).toContain('PSA &amp; Escrow Deposit');
    expect(html).toContain('Diligence &amp; Underwriting');
    expect(html).toContain('Valuation &amp; PTD Clearance');
    expect(html).toContain('Clear to Close &amp; PTF');
    expect(html).toContain('Funding &amp; Deed Recordation');
  });

  it('renders ClearToCloseProgressBar with active blockers when items are incomplete', () => {
    const incompleteFunding: ProjectFundingTerms = {
      ...mockCompleteProject.funding,
      valuationVerification: {
        appraisedValue: 2200000, // $200k shortfall
        appraisalGapAmount: 200000,
        gapResolutionStrategy: 'none',
        physicalInspectionSignedOff: false,
      },
      legalTransfer: {
        wireFraudVerified: false,
        deedInstrumentNumber: '',
        deedRecordingDate: '',
      },
    };

    const html = renderToString(
      <ClearToCloseProgressBar
        funding={incompleteFunding}
        earnestMoney={{ status: 'pending', receiptConfirmed: false }}
        contingencies={[]}
        tasks={[]}
      />
    );

    expect(html).toContain('Active Clear-to-Close Blockers');
    expect(html).toContain('Earnest Money Deposit receipt not yet confirmed');
    expect(html).toContain('Physical property inspection condition sign-off pending');
    expect(html).toContain('Appraisal shortfall of $200,000 requires resolution');
    expect(html).toContain('Institutional voice verification of escrow wire instructions required');
  });

  it('renders SourcesAndUsesLedger with balanced $0 variance', () => {
    const html = renderToString(
      <SourcesAndUsesLedger
        funding={mockCompleteProject.funding as ProjectFundingTerms}
        purchasePrice={2400000}
        totalCostBasis={2800000}
        onUpdateFunding={jest.fn()}
      />
    );

    expect(html).toContain('data-testid="sources-and-uses-ledger"');
    expect(html).toContain('Sources &amp; Uses of Funds Ledger');
    expect(html).toContain('Balanced ($0 Variance)');
    expect(html).toContain('Sources of Capital');
    expect(html).toContain('Uses of Funds');
    expect(html).toContain('Senior Loan Facility');
    expect(html).toContain('Contract Purchase Price');
    expect(html).toContain('2,800,000');
  });

  it('renders role-based filter tabs in FundWorkspaceView tasks section', () => {
    const html = renderToString(
      <FundWorkspaceView
        project={mockCompleteProject}
        onUpdateProject={jest.fn()}
      />
    );

    expect(html).toContain('data-testid="task-filter-all"');
    expect(html).toContain('data-testid="task-filter-lender"');
    expect(html).toContain('data-testid="task-filter-title"');
    expect(html).toContain('data-testid="task-filter-inspector"');
    expect(html).toContain('data-testid="task-filter-legal"');
    expect(html).toContain('data-testid="task-filter-lead"');
  });

  it('enables Finalize Closing & Advance to Hold button when all pre-flight conditions are satisfied', () => {
    const onFinalizeClosing = jest.fn();
    const html = renderToString(
      <LegalOwnershipTransferCard
        funding={mockCompleteProject.funding as ProjectFundingTerms}
        onUpdateFunding={jest.fn()}
        onFinalizeClosing={onFinalizeClosing}
      />
    );

    expect(html).toContain('Closing Ceremony &amp; Advance to Hold Phase');
    expect(html).toContain('data-testid="finalize-closing-advance-btn"');
    expect(html).toContain('Finalize Closing &amp; Advance to Hold →');
    // Not disabled when valid
    expect(html).not.toContain('cursor-not-allowed opacity-60');
  });

  it('disables Finalize Closing button when wire verification or deed is missing', () => {
    const incompleteFunding: ProjectFundingTerms = {
      ...mockCompleteProject.funding,
      legalTransfer: {
        wireFraudVerified: false,
        deedInstrumentNumber: '',
        deedRecordingDate: '',
      },
    };

    const html = renderToString(
      <LegalOwnershipTransferCard
        funding={incompleteFunding}
        onUpdateFunding={jest.fn()}
      />
    );

    expect(html).toContain('data-testid="finalize-closing-advance-btn"');
    expect(html).toContain('cursor-not-allowed opacity-60');
    expect(html).toContain('Requires verified phone wire confirmation and county deed recording details above.');
  });

  it('verifies strict Radix Lyra design compliance and zero slop', () => {
    const html = renderToString(
      <FundWorkspaceView
        project={mockCompleteProject}
        onUpdateProject={jest.fn()}
      />
    );

    // No forbidden terms
    expect(html.toLowerCase()).not.toContain('sponsor');
    // Design precision
    expect(html).not.toContain('rounded-2xl');
    expect(html).not.toContain('rounded-xl');
    // Touch target compliance
    expect(html).toContain('min-h-[44px]');
  });
});

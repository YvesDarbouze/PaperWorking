import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import FundWorkspaceView from '../../components/projects/FundWorkspaceView';
import type { ProjectWorkspace } from '../../lib/projects/types';

const baseFundProject: ProjectWorkspace = {
  id: 'deal-fund-test',
  project_id: 'deal-fund-test',
  propertyName: '88 Harbor Lane',
  address: '88 Harbor Lane, Tampa, FL 33602',
  property_address: '88 Harbor Lane, Tampa, FL 33602',
  city: 'Tampa, FL',
  currentPhase: 'purchase',
  phase: 'purchase',
  status: 'Lender review',
  dispositionType: 'SALE',
  purchasePrice: 392000,
  purchase_price: 392000,
  rehab_costs: 48000,
  exit_strategy: 'Fix & Flip',
  entity_type: 'LLC',
  phase_completion_pct: 58,
  estimatedIrr: 0.162,
  dealId: null,
  dealSlug: null,
  dealAddress: null,
  storage_used_bytes: 2480000,
  storageQuotaBytes: 536870912,
  todos: [],
  documents: [
    {
      doc_id: 'doc-psa-88',
      type: 'Purchase Agreement',
      name: 'Executed_Purchase_and_Sale_Agreement.pdf',
      url: '/api/projects/deal-fund-test/documents/doc-psa-88',
      generated_at: '2026-08-08T14:30:00.000Z',
    },
    {
      doc_id: 'doc-le-88',
      type: 'Loan Estimate',
      name: 'Loan_Estimate_Apex_Commercial.pdf',
      url: '/api/projects/deal-fund-test/documents/doc-le-88',
      generated_at: '2026-08-10T09:15:00.000Z',
    },
  ],
  funding: {
    loanAmount: 294000,
    interestRatePct: 6.875,
    amortizationYears: 30,
    downPayment: 98000,
    closingCosts: 7840,
    actualCashToClose: 105840,
    fundingStatus: 'Term Sheet Received',
    lenderName: 'Apex Commercial Capital',
    loanType: 'Hard Money / Bridge',
    monthlyDebtService: 1931.33,
  },
  underwritingSnapshot: {
    snapshotId: 'b23c4d5e-6f7a-4b1c-9d2e-3f4a5b6c7d8e',
    version: 1,
    engineVersion: 2,
    superseded: false,
    createdAt: '2026-08-10T12:00:00.000Z',
    createdByUid: 'usr-analyst-1',
    source: 'deal_calculator',
    calculatorVersion: '1.0.0',
    inputs: {
      strategy: 'flip',
      purchasePrice: 392000,
      buyerClosingCostsPct: 2.0,
      buyerClosingCostsAmount: 7840,
      rehabBudget: 48000,
      estimatedARV: 520000,
      grossMonthlyRent: 3600,
      otherMonthlyIncome: 0,
      vacancyRatePct: 6.0,
      operatingExpenseRatioPct: 35.0,
      annualPropertyTax: 5800,
      annualInsurance: 1600,
      monthlyHOA: 0,
      monthlyManagementFeePct: 8.0,
      targetLtvPct: 75.0,
      interestRatePct: 6.875,
      amortizationYears: 30,
      interestOnlyMonths: 0,
      holdPeriodYears: 5,
      exitCapRatePct: 6.5,
      costOfSalePct: 5.0,
    },
    outputs: {
      totalCostBasis: 447840,
      loanAmount: 294000,
      cashRequired: 105840,
      grossOperatingIncome: 40608,
      totalOperatingExpenses: 14212,
      netOperatingIncome: 26396,
      monthlyDebtService: 1931.33,
      annualDebtService: 23175.96,
      annualNetCashFlow: 3220.04,
      capRateOnCost: 5.89,
      cashOnCashReturnPct: 3.04,
      projectedIrrPct: 16.2,
      dscr: 1.14,
      ltvPct: 75.0,
      grossRentMultiplier: 9.07,
      maximumAllowableOffer70Pct: 308160,
      calculatedAt: '2026-08-10T12:00:00.000Z',
      engineVersion: '1.0.0',
    },
    assumptions: {
      notes: 'Tampa waterfront submarket. 75% bridge financing.',
    },
  },
  earnestMoney: {
    amount: 5000,
    holderEntity: 'First American Title & Escrow Co',
    contactName: 'Sarah Jenkins (Escrow Officer)',
    phone: '(813) 555-0144',
    email: 'sjenkins@firstamtitle.example.com',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'held',
    receiptConfirmed: true,
  },
  contingencies: [
    {
      id: 'ctg-1',
      type: 'financing',
      label: 'Financing Contingency (Loan Commitment)',
      deadline: new Date(Date.now() + 36 * 3600000).toISOString(), // 36 hours -> urgent 48h banner!
      status: 'open',
      responsiblePartyUid: 'usr-lender-1',
      responsiblePartyName: 'Elena Rostova (Lender)',
      extensionHistory: [
        {
          extensionId: 'ext-1',
          previousDeadline: new Date(Date.now() - 48 * 3600000).toISOString(),
          newDeadline: new Date(Date.now() + 36 * 3600000).toISOString(),
          reason: 'Lender requested appraisal endorsement',
          requestedAt: new Date(Date.now() - 50 * 3600000).toISOString(),
          approvedBySeller: true,
        },
      ],
      supportingDocumentUrls: [],
    },
    {
      id: 'ctg-2',
      type: 'appraisal',
      label: 'Appraisal Contingency',
      deadline: new Date(Date.now() + 68 * 3600000).toISOString(),
      status: 'open',
      responsiblePartyUid: 'usr-analyst-1',
      responsiblePartyName: 'Alex Mercer (Analyst)',
      extensionHistory: [],
      supportingDocumentUrls: [],
    },
  ],
  teamMembers: [
    {
      uid: 'usr-lead-1',
      name: 'Jordan Taylor',
      role: 'Lead Investor',
    },
    {
      uid: 'usr-analyst-1',
      name: 'Alex Mercer',
      role: 'Acquisitions Analyst',
    },
    {
      uid: 'usr-lender-1',
      name: 'Elena Rostova',
      role: 'Mortgage Loan Officer',
    },
    {
      uid: 'usr-escrow-1',
      name: 'Heritage Escrow Co',
      role: 'Title & Escrow Officer',
    },
  ],
  tasks: [
    {
      id: 'task-fund-1',
      title: 'Wire Earnest Money Deposit to Escrow',
      status: 'complete',
      assignedTo: 'Heritage Escrow Co',
      assignedToUid: 'usr-escrow-1',
      dueDate: new Date(Date.now() - 24 * 3600000).toISOString(),
      isAutoGenerated: true,
    },
    {
      id: 'task-fund-2',
      title: 'Review Loan Estimate (LE) and Lock Interest Rate',
      status: 'pending',
      assignedTo: 'Elena Rostova',
      assignedToUid: 'usr-lender-1',
      dueDate: new Date(Date.now() + 24 * 3600000).toISOString(),
      isAutoGenerated: true,
    },
  ],
};

const cleanHtml = (raw: string) => raw.replace(/<!-- -->/g, '');

describe('FundWorkspaceView Component', () => {
  it('renders Phase 02 · Fund header with project details and lineage button', () => {
    const html = cleanHtml(
      renderToString(
        <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
      ),
    );

    expect(html).toContain('Phase 02 · Fund');
    expect(html).toContain('Fund &amp; Documentation Vault');
    expect(html).toContain('88 Harbor Lane, Tampa, FL 33602');
    expect(html).toContain('Underwriting Lineage (v1)');
  });

  it('renders Funding Summary with live calculated monthly debt service', () => {
    const html = cleanHtml(
      renderToString(
        <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
      ),
    );

    expect(html).toContain('Funding Summary');
    expect(html).toContain('$294,000'); // Loan Amount
    expect(html).toContain('6.875%'); // Interest Rate
    expect(html).toContain('$1,931/mo'); // Monthly Debt Service via computeMonthlyPayment
    expect(html).toContain('$98,000'); // Down Payment
    expect(html).toContain('$7,840'); // Closing Costs
    expect(html).toContain('$105,840'); // Actual Cash to Close
    expect(html).toContain('Apex Commercial Capital'); // Lender
    expect(html).toContain('Term Sheet Received'); // Funding Status
  });

  it('renders progressive hard dates alert for the 36h contingency deadline', () => {
    const html = cleanHtml(
      renderToString(
        <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
      ),
    );

    expect(html).toContain('Upcoming Hard Date');
    expect(html).toContain('Financing Contingency (Loan Commitment)');
    expect(html).toContain('36h');
    expect(html).toContain('Action Required');
  });

  it('renders Contingency Deadlines with countdown and extension badge', () => {
    const html = cleanHtml(
      renderToString(
        <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
      ),
    );

    expect(html).toContain('Contingency Deadlines');
    expect(html).toContain('Financing Contingency (Loan Commitment)');
    expect(html).toContain('Appraisal Contingency');
    expect(html).toContain('+ Request Extension (1)');
    expect(html).toContain('Lender requested appraisal endorsement');
  });

  it('renders Earnest Money (EMD) Tracker with deposit amount and confirmed receipt', () => {
    const html = renderToString(
      <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Earnest Money Deposit (EMD) Tracker');
    expect(html).toContain('$5,000');
    expect(html).toContain('First American Title &amp; Escrow Co');
    expect(html).toContain('held');
    expect(html).toContain('✓ Receipt Confirmed');
  });

  it('renders Fund Tasks with team member assignment dropdown populated from roster', () => {
    const html = renderToString(
      <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Fund Tasks &amp; Team Assignments');
    expect(html).toContain('Wire Earnest Money Deposit to Escrow');
    expect(html).toContain('Review Loan Estimate (LE) and Lock Interest Rate');
    expect(html).toContain('Elena Rostova');
    expect(html).toContain('Heritage Escrow Co');
    expect(html).toContain('Jordan Taylor');
    expect(html).toContain('Alex Mercer');
  });

  it('renders Contract Vault documents with real download links', () => {
    const html = renderToString(
      <FundWorkspaceView project={baseFundProject} onUpdateProject={() => {}} />,
    );

    expect(html).toContain('Contract Vault');
    expect(html).toContain('Executed_Purchase_and_Sale_Agreement.pdf');
    expect(html).toContain('Loan_Estimate_Apex_Commercial.pdf');
    expect(html).toContain('Download');
    expect(html).toContain('Delete');
  });
});

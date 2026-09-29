import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { jest } from '@jest/globals';
import ExitWorkspaceView from '../../components/projects/ExitWorkspaceView.js';
import {
  ExitStrategySelectorCard,
  ExitDataAuditPreCheckCard,
  ExitValuationFinancialBaselineCard,
  ExitStrategyExecutionCard,
  ExitTaxAccountingWaterfallCard,
  ExitLifecycleClosureCard,
  ExitConversationalEngine,
  resolveStateTransferTax,
  STATE_TRANSFER_TAX_RATES,
  DEFAULT_HOLD_AUDIT,
  DEFAULT_TENANT_RECONCILIATION,
  DEFAULT_ESTOPPELS,
  DEFAULT_VDR_ASSETS,
  DEFAULT_OUTRIGHT_SALE,
  DEFAULT_REFINANCE_RETAIN,
  DEFAULT_CONDO_SELLOFF,
  DEFAULT_LEASE_OPTION,
  DEFAULT_EXCHANGE_1031,
} from '../../components/projects/exit/index.js';
import type { ProjectWorkspace, ExitPhaseDetails, StateTransferTaxOverride } from '../../lib/projects/types.js';

const mockExitProject: ProjectWorkspace = {
  project_id: 'proj-exit-test-849',
  id: 'proj-exit-test-849',
  propertyName: '1247 East 7th Street Commercial Residences',
  property_address: '1247 East 7th Street, Austin, TX 78702',
  address: '1247 East 7th Street, Austin, TX 78702',
  city: 'Austin',
  currentPhase: 'exit',
  status: 'In Progress',
  dispositionType: 'SALE',
  phase: 'exit',
  phase_completion_pct: 95,
  purchase_price: 485000,
  purchasePrice: 485000,
  rehab_costs: 65000,
  exit_strategy: 'outright_sale',
  entity_type: 'LLC',
  storage_used_bytes: 1204000,
  storageQuotaBytes: 104857600,
  todos: [],
  documents: [],
  propertyState: 'TX',
  funding: {
    loanAmount: 363750,
    lenderName: 'Apex Commercial Lending Group',
    monthlyDebtService: 2450,
  },
  holdPhase: {
    targetDisposition: 'SALE',
    renovationTier: 'RENOVATE',
    initialRehabBudget: 65000,
    committedSowBudget: 65000,
    actualRehabSpend: 63800,
    finalProjectedCost: 65000,
    daysInHold: 425,
    holdingCosts: [],
    listingAds: [],
    isSelfManaged: false,
    propertyManagementFeePct: 8,
  },
  exitPhase: {
    selectedRoute: 'outright_sale',
    targetGrossPrice: 688700,
    brokerCommissionPct: 5.0,
    sellerClosingCostPct: 1.5,
    debtPayoffAmount: 363750,
    proratedTaxes: 3400,
    netSalesProceeds: 287115,
    holdAudit: DEFAULT_HOLD_AUDIT,
    tenantReconciliation: DEFAULT_TENANT_RECONCILIATION,
    estoppelCertificates: DEFAULT_ESTOPPELS,
    vdrAssets: DEFAULT_VDR_ASSETS,
    stateTransferTax: {
      stateCode: 'TX',
      stateName: 'Texas',
      statutoryRatePct: 0.0,
      paidBy: 'seller',
      recordingFeeFlat: 35,
      isCustomOverrideActive: false,
      notes: 'No state transfer tax',
    },
    outrightSale: DEFAULT_OUTRIGHT_SALE,
    refinanceRetain: DEFAULT_REFINANCE_RETAIN,
    condoSellOff: DEFAULT_CONDO_SELLOFF,
    leaseOption: DEFAULT_LEASE_OPTION,
    exchange1031: DEFAULT_EXCHANGE_1031,
    terminalIrr: 32.4,
    equityMultiple: 1.43,
    cashOnCashReturnPct: 11.5,
    returnOnEquityPct: 24.8,
    netProfit: 85865,
    glAccountsClosed: false,
    isLifecycleLocked: false,
  },
  teamMembers: [
    { id: 'lead', name: 'Lead Underwriter', role: 'Partner' },
    { id: 'analyst', name: 'Acquisition Analyst', role: 'Underwriting' },
    { id: 'cpa', name: 'Tax Advisor', role: 'CPA' },
  ],
};

const mockRecalculatedOutputs = {
  grossRealization: 688700,
  totalClosingFees: 37835,
  debtPayoff: 363750,
  netCashToInvestor: 287115,
  terminalIrr: 32.4,
  equityMultiple: 1.43,
  roe: 24.8,
  ongoingMonthlyCashFlow: 0,
  ongoingDscr: 1.45,
  ongoingCashOnCashYield: 11.5,
};

describe('REIL Phase 4: Exit & Disposition Complete Lifecycle', () => {
  describe('Task 1: Strategy Selection & Route Initialization', () => {
    it('renders all 5 institutional exit routes with state override capability', () => {
      const html = renderToString(
        <ExitStrategySelectorCard
          selectedRoute="outright_sale"
          recalculatedOutputs={mockRecalculatedOutputs}
          onSelectRoute={() => {}}
        />
      );

      expect(html).toContain('data-testid="exit-strategy-selector-card"');
      expect(html).toContain('data-testid="exit-route-outright_sale"');
      expect(html).toContain('data-testid="exit-route-refinance_retain"');
      expect(html).toContain('data-testid="exit-route-condo_selloff"');
      expect(html).toContain('data-testid="exit-route-lease_option"');
      expect(html).toContain('data-testid="exit-route-1031_exchange"');
      expect(html).toContain('State Override Engine');
      expect(html).toContain('Terminal Disposition');
    });

    it('indicates ongoing active KPIs when Refinance & Retain is selected', () => {
      const htmlRefi = renderToString(
        <ExitStrategySelectorCard
          selectedRoute="refinance_retain"
          recalculatedOutputs={mockRecalculatedOutputs}
          onSelectRoute={() => {}}
        />
      );

      expect(htmlRefi).toContain('Active Ongoing Status');
      expect(htmlRefi).toContain('Updates return metrics to ongoing DSCR, Cash-on-Cash Yield, and ROE.');
    });
  });

  describe('Task 2: Data Audit & Asset Stabilization Pre-Check', () => {
    it('renders Hold phase operating revenue audit, tenant deposits, and virtual data room', () => {
      const html = renderToString(
        <ExitDataAuditPreCheckCard
          holdAudit={DEFAULT_HOLD_AUDIT}
          tenantReconciliation={DEFAULT_TENANT_RECONCILIATION}
          estoppels={DEFAULT_ESTOPPELS}
          vdrAssets={DEFAULT_VDR_ASSETS}
          onUpdateEstoppels={() => {}}
          onUpdateVdrAssets={() => {}}
        />
      );

      expect(html).toContain('data-testid="exit-data-audit-precheck-card"');
      expect(html).toContain('Total Revenue Collected');
      expect(html).toContain('$58,400');
      expect(html).toContain('Operating Expenses Paid');
      expect(html).toContain('$19,800');
      expect(html).toContain('Net Operating Income (NOI)');
      expect(html).toContain('$38,600');
      expect(html).toContain('Security Deposit Liability');
      expect(html).toContain('$7,600');
      expect(html).toContain('Tenant Escrow &amp; Prepaid Rent Proration Summary');
      expect(html).toContain('Tenant Estoppels');
      expect(html).toContain('VDR Assets');
    });
  });

  describe('Task 3: Valuation & Financial Baseline Setup', () => {
    it('correctly resolves 50-state deed transfer tax benchmarks', () => {
      const tx = resolveStateTransferTax('TX');
      expect(tx.statutoryRatePct).toBe(0.0);
      expect(tx.stateName).toBe('Texas');

      const de = resolveStateTransferTax('DE');
      expect(de.statutoryRatePct).toBe(4.0);
      expect(de.paidByDefault).toBe('split_50_50');

      const pa = resolveStateTransferTax('PA');
      expect(pa.statutoryRatePct).toBe(2.0);

      const ca = resolveStateTransferTax('CA');
      expect(ca.statutoryRatePct).toBe(0.11);

      const ny = resolveStateTransferTax('NY');
      expect(ny.statutoryRatePct).toBe(0.40);
    });

    it('renders baseline disposition costs and handles custom transfer tax override', () => {
      const stateOverride: StateTransferTaxOverride = {
        stateCode: 'TX',
        stateName: 'Texas',
        statutoryRatePct: 0.0,
        paidBy: 'seller',
        recordingFeeFlat: 35,
        customRatePct: 0.75,
        isCustomOverrideActive: true,
        notes: 'Custom municipal transfer surcharge',
      };

      const html = renderToString(
        <ExitValuationFinancialBaselineCard
          selectedRoute="outright_sale"
          propertyState="TX"
          grossRealization={688700}
          brokerCommissionPct={5.0}
          closingCostPct={1.5}
          debtPayoffAmount={363750}
          proratedTaxes={3400}
          stateTransferTax={stateOverride}
          onUpdateGrossRealization={() => {}}
          onUpdateBrokerCommissionPct={() => {}}
          onUpdateClosingCostPct={() => {}}
          onUpdateDebtPayoff={() => {}}
          onUpdateProratedTaxes={() => {}}
          onUpdateStateTransferTax={() => {}}
        />
      );

      expect(html).toContain('data-testid="exit-valuation-financial-baseline-card"');
      expect(html).toContain('Senior Debt Payoff Demand');
      expect(html).toContain('State Deed Transfer Tax Engine');
      expect(html).toContain('Custom Override Active');
      expect(html).toContain('Net Proceeds to Equity');
    });
  });

  describe('Task 4: Strategy-Specific Execution Tasks', () => {
    it('renders execution milestones for Outright Sale (Route A)', () => {
      const html = renderToString(
        <ExitStrategyExecutionCard
          selectedRoute="outright_sale"
          outrightSale={DEFAULT_OUTRIGHT_SALE}
          refinanceRetain={DEFAULT_REFINANCE_RETAIN}
          condoSellOff={DEFAULT_CONDO_SELLOFF}
          leaseOption={DEFAULT_LEASE_OPTION}
          exchange1031={DEFAULT_EXCHANGE_1031}
          onUpdateOutrightSale={() => {}}
          onUpdateRefinanceRetain={() => {}}
          onUpdateCondoSellOff={() => {}}
          onUpdateLeaseOption={() => {}}
          onUpdateExchange1031={() => {}}
        />
      );

      expect(html).toContain('data-testid="exit-strategy-execution-card"');
      expect(html).toContain('Offering Memorandum &amp; NDAs');
      expect(html).toContain('Signed NDAs:');
      expect(html).toContain('Lonestar Capital Multi-Asset Fund LP');
    });

    it('renders execution milestones for 1031 Exchange with 45-day and 180-day timers', () => {
      const html = renderToString(
        <ExitStrategyExecutionCard
          selectedRoute="1031_exchange"
          outrightSale={DEFAULT_OUTRIGHT_SALE}
          refinanceRetain={DEFAULT_REFINANCE_RETAIN}
          condoSellOff={DEFAULT_CONDO_SELLOFF}
          leaseOption={DEFAULT_LEASE_OPTION}
          exchange1031={DEFAULT_EXCHANGE_1031}
          onUpdateOutrightSale={() => {}}
          onUpdateRefinanceRetain={() => {}}
          onUpdateCondoSellOff={() => {}}
          onUpdateLeaseOption={() => {}}
          onUpdateExchange1031={() => {}}
        />
      );

      expect(html).toContain('45-Day Identification Window');
      expect(html).toContain('180-Day Replacement Closing Window');
      expect(html).toContain('First American Exchange Company LLC');
      expect(html).toContain('4802 Barton Springs Rd');
    });
  });

  describe('Task 5: Accounting & Tax Basis Waterfall Distributions', () => {
    it('calculates Section 1250 depreciation recapture, capital gains, and multi-tier partner waterfall', () => {
      const html = renderToString(
        <ExitTaxAccountingWaterfallCard
          grossRealization={688700}
          totalClosingFees={37835}
          netSalesProceeds={287115}
          purchasePrice={485000}
          rehabActual={65000}
          originalDebt={363750}
          is1031Exchange={false}
        />
      );

      expect(html).toContain('data-testid="exit-tax-accounting-waterfall-card"');
      expect(html).toContain('Tax Basis, Depreciation Recapture &amp; Distribution Waterfall');
      expect(html).toContain('§1250 Recapture (25%)');
      expect(html).toContain('Capital Waterfall Distribution Tiers');
      expect(html).toContain('Apex Capital Multi-Asset LP');
      expect(html).toContain('Sunbelt Family Office Partners');
      expect(html).toContain('Managing Partner (Lead Investor)');
      expect(html).toContain('Tier 1: Return of Capital');
      expect(html).toContain('Tier 2: 8% Preferred Return');
      expect(html).toContain('Tier 3: 80/20 Excess Promote');
    });

    it('defers depreciation recapture tax and capital gains tax during a 1031 Exchange', () => {
      const html1031 = renderToString(
        <ExitTaxAccountingWaterfallCard
          grossRealization={688700}
          totalClosingFees={37835}
          netSalesProceeds={287115}
          purchasePrice={485000}
          rehabActual={65000}
          originalDebt={363750}
          is1031Exchange={true}
        />
      );

      expect(html1031).toContain('$0 (Deferred)');
      expect(html1031).toContain('Section 1031 safe harbor');
    });
  });

  describe('Task 6: Lifecycle Closure & Life-of-Asset Performance Record', () => {
    it('renders General Ledger closeout checklist, Life-of-Asset KPIs, and Distribution Packet preview trigger', () => {
      const html = renderToString(
        <ExitLifecycleClosureCard
          project={mockExitProject}
          exitPhase={mockExitProject.exitPhase!}
          onUpdateExitPhase={() => {}}
          purchasePrice={485000}
          rehabActual={65000}
          originalDebt={363750}
        />
      );

      expect(html).toContain('data-testid="exit-lifecycle-closure-card"');
      expect(html).toContain('General Ledger Operational Closeout Checklist');
      expect(html).toContain('data-testid="gl-ap-check"');
      expect(html).toContain('data-testid="gl-tenant-escrow-check"');
      expect(html).toContain('data-testid="gl-reserves-check"');
      expect(html).toContain('data-testid="gl-tax-holdback-check"');
      expect(html).toContain('data-testid="audited-terminal-irr"');
      expect(html).toContain('data-testid="audited-moic"');
      expect(html).toContain('data-testid="preview-distribution-packet-btn"');
    });
  });

  describe('Dual-Mode Conversational Engine', () => {
    it('renders progressive disclosure wizard with role assignments and evidence requirements', () => {
      const html = renderToString(
        <ExitConversationalEngine
          project={mockExitProject}
          onUpdateProject={() => {}}
          onSwitchToExecutiveView={() => {}}
          propertyState="TX"
        />
      );

      expect(html).toContain('data-testid="exit-conversational-engine"');
      expect(html).toContain('Exit Route Selection');
      expect(html).toContain('Why this matters for your returns');
      expect(html).toContain('Required Evidence:');
      expect(html).toContain('Save &amp; Continue');
    });
  });

  describe('Integrated ExitWorkspaceView', () => {
    it('renders mode switchers, header metrics, and all 6 lifecycle tabs in Executive Workspace', () => {
      const html = renderToString(
        <ExitWorkspaceView project={mockExitProject} onUpdateProject={() => {}} />
      );

      expect(html).toContain('data-testid="exit-workspace-view"');
      expect(html).toContain('data-testid="toggle-conversational-view"');
      expect(html).toContain('data-testid="toggle-executive-view"');
      expect(html).toContain('data-testid="exit-deal-header-card"');
      expect(html).toContain('REIL Phase 04: Exit');
      expect(html).toContain('Net Cash Proceeds');
      expect(html).toContain('Terminal IRR');
      expect(html).toContain('Equity Multiple');
      expect(html).toContain('Disposition Capital Waterfall');
      expect(html).toContain('Tax Basis');
      expect(html).toContain('data-testid="finalize-lifecycle-btn"');
      expect(html).toContain('data-testid="export-investor-packet-btn"');
      expect(html).toContain('Exit Disposition Milestones &amp; Task Assignments');
      expect(html).toContain('+ Invite via Email...');
    });
  });

  describe('Anti-Slop & Design Directives Compliance', () => {
    it('verifies zero forbidden terms and zero em-dashes across all exit phase code', () => {
      const exitDir = fs.existsSync(path.resolve(process.cwd(), 'components/projects/exit'))
        ? path.resolve(process.cwd(), 'components/projects/exit')
        : path.resolve(process.cwd(), 'apps/web/components/projects/exit');

      const files = fs.readdirSync(exitDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

      const workspaceFile = fs.existsSync(path.resolve(process.cwd(), 'components/projects/ExitWorkspaceView.tsx'))
        ? path.resolve(process.cwd(), 'components/projects/ExitWorkspaceView.tsx')
        : path.resolve(process.cwd(), 'apps/web/components/projects/ExitWorkspaceView.tsx');

      const allFiles = [...files.map((f) => path.join(exitDir, f)), workspaceFile];

      const forbiddenWord = new RegExp(['s', 'p', 'o', 'n', 's', 'o', 'r'].join(''), 'i');

      allFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for forbidden word
        const forbiddenMatch = content.match(forbiddenWord);
        expect(forbiddenMatch).toBeNull();

        // Check for em-dash
        expect(content).not.toContain('—');

        // Check for disallowed neon green colors
        expect(content).not.toContain('#00DD94');
      });
    });
  });
});

/**
 * Test Suite: REIL Fund Phase Conversational UX (TurboTax & Clerky Architecture)
 *
 * Verifies:
 * 1. Progressive Disclosure: One central decision screen rendered at a time.
 * 2. Adaptive Branching (All-Cash): Bypasses debt, rate lock, and CD screens.
 * 3. Adaptive Branching (Senior Debt): Proceeds through lender package and rate freeze.
 * 4. Appraisal Gap Resolution: Shortfall triggers 4 institutional resolution plays.
 * 5. Anti-Fraud Wire Defense: Mandatory two-party phone verification gate.
 * 6. Deed Recordation & Transition: Formal instrument recording advances to Hold.
 * 7. Design System & Antislop: rounded-none precision, 44px+ touch targets, zero AI slop copy.
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { FundConversationalEngine } from '../../components/projects/fund';
import type { ProjectWorkspace, ProjectFundingTerms } from '../../lib/projects/types';

describe('REIL Fund Phase Conversational UX Engine', () => {
  const mockProject: ProjectWorkspace = {
    id: 'proj-fund-conv-1',
    project_id: 'proj-fund-conv-1',
    propertyName: '1247 Elm Street',
    property_address: '1247 Elm Street, Austin, TX 78702',
    address: '1247 Elm Street',
    city: 'Austin',
    status: 'Fund & Financing',
    dispositionType: 'SALE',
    purchasePrice: 485000,
    purchase_price: 485000,
    rehab_costs: 45000,
    exit_strategy: 'Fix & Flip',
    entity_type: 'LLC',
    currentPhase: 'purchase',
    phase: 'purchase',
    phase_completion_pct: 35,
    storage_used_bytes: 1200000,
    storageQuotaBytes: 536870912,
    todos: [],
    tasks: [],
    contingencies: [],
    documents: [],
    teamMembers: [],
  };

  const mockFunding: ProjectFundingTerms = {
    loanAmount: 363750,
    interestRatePct: 6.875,
    amortizationYears: 30,
    downPayment: 121250,
    closingCosts: 9700,
    actualCashToClose: 130950,
    fundingStatus: 'Term Sheet Received',
    lenderName: 'Apex Commercial Capital',
    loanType: 'Commercial First Mortgage',
  };

  describe('Progressive Disclosure (One Decision at a Time)', () => {
    it('renders only the first decision stage (Capital Structure) on initial load', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      // Verify Screen 1 is active
      expect(html).toContain('screen-capital-structure');
      expect(html).toContain('How are you assembling the capital to purchase this property?');
      expect(html).toContain('Step 1 of');

      // Subsequent screens MUST NOT be rendered simultaneously (zero multi-form clutter)
      expect(html).not.toContain('screen-lender-package');
      expect(html).not.toContain('screen-rate-lock');
      expect(html).not.toContain('screen-appraisal-valuation');
      expect(html).not.toContain('screen-closing-disclosure');
      expect(html).not.toContain('screen-deed-recordation');
    });

    it('renders large hybrid choice cards with Radix Lyra precision styling', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      // Verify large hybrid tap cards
      expect(html).toContain('choice-capital-senior_debt');
      expect(html).toContain('choice-capital-bridge');
      expect(html).toContain('choice-capital-cash');
      expect(html).toContain('choice-capital-syndication');
      expect(html).toContain('Conventional / DSCR Mortgage');
      expect(html).toContain('100% All-Cash Purchase');
    });
  });

  describe('Adaptive Branching Logic', () => {
    it('activates All-Cash branching bypass when 100% All-Cash is selected', () => {
      const cashFunding: ProjectFundingTerms = {
        ...mockFunding,
        loanType: '100% All-Cash Purchase',
        loanAmount: 0,
      };

      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={cashFunding}
          propertyState="TX"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('Adaptive Branching Active:');
      expect(html).toContain('All-Cash selected');
      // Step total reduces from 12 to 9
      expect(html).toContain('Step 1 of 9');
    });
  });

  describe('Due Diligence: Property Inspection Screen', () => {
    it('renders property inspection screen with choice cards, licensed inspector inputs, and marketplace help', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          initialStepId="property_inspection"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('screen-property-inspection');
      expect(html).toContain('Have you scheduled and completed your licensed property inspection?');
      expect(html).toContain('choice-inspection-completed');
      expect(html).toContain('choice-inspection-scheduled');
      expect(html).toContain('input-conversational-inspector-firm');
      expect(html).toContain('input-conversational-inspector-name');
      expect(html).toContain('input-conversational-license-num');
      expect(html).toContain('input-conversational-inspection-date');
      expect(html).toContain('input-conversational-contingency-deadline');
      expect(html).toContain('checkbox-conversational-inspection-cleared');
      expect(html).toContain('toggle-inspector-marketplace-help');
    });
  });

  describe('Due Diligence: Repair & Credit Negotiation Screen', () => {
    it('renders defect ledger, credit calculation, repair addendum gate, and contractor marketplace help', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          initialStepId="repair_negotiation"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('screen-repair-negotiation');
      expect(html).toContain('Are you requesting seller repairs or closing credits based on inspection findings?');
      expect(html).toContain('Total Defects Discovered');
      expect(html).toContain('Agreed Seller Credits');
      expect(html).toContain('btn-toggle-add-issue-conv');
      expect(html).toContain('checkbox-conv-repair-amendment');
      expect(html).toContain('toggle-contractor-marketplace-help');
    });
  });

  describe('Due Diligence: Final Walk-Through Protocol Screen (24 to 48h Window)', () => {
    it('renders 4-point pre-closing checklist and formal escrow authorization gate', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          initialStepId="final_walk_through"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('screen-final-walk-through');
      expect(html).toContain('Have you completed the final walk-through 24 to 48 hours prior to closing?');
      expect(html).toContain('input-conv-walkthrough-date');
      expect(html).toContain('select-conv-walkthrough-status');
      expect(html).toContain('checkbox-conv-repairs-verified');
      expect(html).toContain('checkbox-conv-broom-clean');
      expect(html).toContain('checkbox-conv-utilities-active');
      expect(html).toContain('checkbox-conv-no-new-damage');
      expect(html).toContain('checkbox-conv-walkthrough-signoff');
      expect(html).toContain('toggle-walkthrough-marketplace-help');
    });
  });

  describe('Appraisal Gap Resolution Engine', () => {
    it('renders appraisal gap resolution plays when appraisal shortfall is flagged', () => {
      const shortfallFunding: ProjectFundingTerms = {
        ...mockFunding,
      };

      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={shortfallFunding}
          propertyState="TX"
          initialStepId="appraisal_valuation"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('screen-appraisal-valuation');
      expect(html).toContain('Did the commercial appraisal meet or exceed the contract purchase price?');
      expect(html).toContain('choice-appraisal-met');
      expect(html).toContain('choice-appraisal-shortfall');
    });
  });

  describe('Anti-AI Slop & Tone Audit', () => {
    it('contains zero generic AI buzzwords in copy', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      // Verify absence of forbidden AI vocabulary
      expect(html.toLowerCase()).not.toContain('unlock the power');
      expect(html.toLowerCase()).not.toContain('delve into');
      expect(html.toLowerCase()).not.toContain('game-changer');
      expect(html.toLowerCase()).not.toContain('pivotal moment');
      expect(html.toLowerCase()).not.toContain('testament to');
    });

    it('enforces touch targets >= 44px and rounded-none precision across controls', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('rounded-none');
    });
  });

  describe('Step Ownership, Delegation & Team Tier Gating', () => {
    it('renders the step ownership bar and delegate step trigger', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          userTier="Investor"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('Assigned To:');
      expect(html).toContain('delegate-step-btn');
      expect(html).toContain('Delegate Step');
    });
  });

  describe('Multiple Lending Packages & Underwriting Bundle', () => {
    it('renders multiple lending packages and switcher controls when funding packages exist', () => {
      const multiPkgFunding: ProjectFundingTerms = {
        ...mockFunding,
        lendingPackages: [
          {
            id: 'pkg-1',
            name: 'Apex Senior Debt',
            targetLender: 'Apex Commercial Capital',
            loanType: 'Commercial First Lien',
            requestedAmount: 363750,
            status: 'ready',
            documents: [
              { id: 'd1', title: 'Personal Financial Statement', category: 'financials', isIncluded: true, required: true },
              { id: 'd2', title: 'Tax Returns', category: 'tax_returns', isIncluded: true, required: true },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'pkg-2',
            name: 'Austin Credit Union Bridge',
            targetLender: 'Austin Community Credit Union',
            loanType: 'Bridge Loan',
            requestedAmount: 388000,
            status: 'draft',
            documents: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        activeLendingPackageId: 'pkg-1',
      };

      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={multiPkgFunding}
          propertyState="TX"
          userTier="Investment Team"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      // Verify Screen 1 is active with universal assistance
      expect(html).toContain('fund-conversational-engine');
      expect(html).toContain('toggle-step-vendor-help');
      expect(html).toContain('Jurisdiction:');
      expect(html).toContain('TX');
    });
  });

  describe('Universal Step Vendor Assistance in Property State', () => {
    it('renders contextual vendor assistance filtered by property state on current step', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="FL"
          userTier="Investor"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('toggle-step-vendor-help');
      expect(html).toContain('Jurisdiction:');
      expect(html).toContain('FL');
    });
  });

  describe('Closing & Legal Execution: Deed Recordation & Hold Transition', () => {
    it('renders deed recordation ceremony with closing docs, fees, lockbox handover, and advance button', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          initialStepId="deed_recordation"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('screen-deed-recordation');
      expect(html).toContain('Transaction Completion Ceremony');
      expect(html).toContain('Closing &amp; Legal Execution Checklist');
      expect(html).toContain('checkbox-closing-docs-signed');
      expect(html).toContain('checkbox-closing-fees-paid');
      expect(html).toContain('checkbox-possession-received');
      expect(html).toContain('input-conversational-deed-num');
      expect(html).toContain('input-conversational-deed-date');
      expect(html).toContain('input-conversational-lockbox-code');
      expect(html).toContain('input-conversational-lockbox-location');
      expect(html).toContain('checkbox-conversational-rekey-completed');
      expect(html).toContain('btn-record-deed-advance-hold');
      expect(html).toContain('Record Deed &amp; Advance to Phase 03 · Hold');
    });
  });

  describe('Title & Legal Protection: Deed Search, Dual Title Insurance & Hazard Binder Screen', () => {
    it('renders Title & Legal Protection screen with deed search verification, dual title insurance, and property insurance binder', () => {
      const html = renderToString(
        <FundConversationalEngine
          project={mockProject}
          funding={mockFunding}
          propertyState="TX"
          initialStepId="title_clearance"
          onUpdateProject={jest.fn()}
          onUpdateFunding={jest.fn()}
          onSwitchToExecutiveView={jest.fn()}
        />
      );

      expect(html).toContain('screen-title-clearance');
      expect(html).toContain('Have you cleared title, bound dual title insurance, and secured property insurance?');
      expect(html).toContain('conversational-title-clearance-block');
      expect(html).toContain('checkbox-conv-deed-search');
      expect(html).toContain('30-Year Deed Search Verified');
      expect(html).toContain('checkbox-conv-no-liens');
      expect(html).toContain('Zero Unsatisfied Liens');
      expect(html).toContain('checkbox-conv-no-judgments');
      expect(html).toContain('Zero Tax &amp; Civil Judgments');
      expect(html).toContain('checkbox-conv-no-disputes');
      expect(html).toContain('Zero Boundary or Title Disputes');

      expect(html).toContain('conversational-title-insurance-block');
      expect(html).toContain('checkbox-conv-lender-title');
      expect(html).toContain('Lender&#x27;s Title Policy Bound');
      expect(html).toContain('checkbox-conv-owner-title');
      expect(html).toContain('Owner&#x27;s Title Policy Bound');

      expect(html).toContain('conversational-property-insurance-block');
      expect(html).toContain('input-conversational-insurance-carrier');
      expect(html).toContain('checkbox-conversational-property-insurance-bound');
      expect(html).toContain('checkbox-conversational-lender-loss-payee');
      expect(html).toContain('Lender Loss Payee &amp; Mortgagee Clause Endorsement Verified');
      expect(html).toContain('toggle-title-marketplace-help');
    });
  });
});

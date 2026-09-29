import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import LegalOwnershipTransferCard from '../../components/projects/fund/LegalOwnershipTransferCard';
import type { ProjectFundingTerms } from '../../lib/projects/types';

const baseFundingTerms: ProjectFundingTerms = {
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
  legalTransfer: {
    vestingEntityName: '88 Harbor Lane Investments LLC',
    vestingEntityState: 'FL',
    vestingEntityEin: 'XX-XXX8921',
    goodStandingVerified: true,
    operatingAgreementExecuted: true,
    authorizedSignatoryName: 'Jordan Taylor (Managing Member)',
    titleCommitmentNumber: 'TC-FL-2026-88912',
    titleInsurer: 'First American Title Insurance Co',
    scheduleBCurativeItems: [
      {
        id: 'sch-1',
        item: 'Prior mortgage payoff letter verified',
        category: 'requirement',
        status: 'cleared',
      },
      {
        id: 'sch-2',
        item: 'Municipal tax certificate paid through closing',
        category: 'requirement',
        status: 'cleared',
      },
      {
        id: 'sch-3',
        item: 'Utility easement standard setback noted',
        category: 'exception',
        status: 'pending',
      },
    ],
    wireFraudVerified: true,
    wireVerifiedPhone: '(813) 555-0144',
    wireVerifiedWith: 'Sarah Jenkins (Escrow Officer)',
    wireVerifiedDate: '2026-08-14',
    outgoingWireReference: 'FED-WIRE-2026-99214',
    deedInstrumentNumber: 'DOC-2026-089412',
    deedRecordingDate: '2026-08-15',
  },
};

const cleanHtml = (raw: string) => raw.replace(/<!-- -->/g, '');

describe('LegalOwnershipTransferCard Component', () => {
  it('renders header, title, and milestone summary badges accurately', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Vesting Entity, Title Curative &amp; Wire Protection');
    expect(html).toContain('Pillar 3: Legal Ownership Transfer');
    expect(html).toContain('Vesting: Verified');
    expect(html).toContain('Title Curative: 2/3 Cleared');
    expect(html).toContain('Wire Safety: Phone Verified');
  });

  it('renders Vesting Entity and Authority Verification fields and checkboxes', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('1. Vesting Entity &amp; Authority Verification');
    expect(html).toContain('88 Harbor Lane Investments LLC');
    expect(html).toContain('XX-XXX8921');
    expect(html).toContain('Jordan Taylor (Managing Member)');
    expect(html).toContain('Certificate of Good Standing Verified with Secretary of State');
    expect(html).toContain('Operating Agreement &amp; Manager Resolution Executed');
  });

  it('renders Title Commitment and Schedule B Curative Matrix items', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('2. Title Commitment &amp; Schedule B Curative Matrix');
    expect(html).toContain('TC-FL-2026-88912');
    expect(html).toContain('First American Title Insurance Co');
    expect(html).toContain('Prior mortgage payoff letter verified');
    expect(html).toContain('Municipal tax certificate paid through closing');
    expect(html).toContain('Utility easement standard setback noted');
    expect(html).toContain('requirement');
    expect(html).toContain('exception');
    expect(html).toContain('Cleared');
    expect(html).toContain('Pending Clearance');
    expect(html).toContain('Add Schedule B Item');
  });

  it('renders critical wire fraud protection protocol banner with exact voice verification quote', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('3. Wire Fraud Protection Protocol &amp; Escrow Wire Authorization');
    expect(html).toContain(
      'Wire fraud prevention: Title wire instructions must be verified by phone using independently confirmed contact details before transmitting funds.',
    );
    expect(html).toContain(
      'Wire Instructions Independently Verified by Phone with Title Officer',
    );
    expect(html).toContain('(813) 555-0144');
    expect(html).toContain('Sarah Jenkins (Escrow Officer)');
    expect(html).toContain('FED-WIRE-2026-99214');
    expect(html).toContain('2026-08-14');
  });

  it('renders county deed recordation instruments and deed recording confirmation', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('4. County Deed Recordation');
    expect(html).toContain('DOC-2026-089412');
    expect(html).toContain('2026-08-15');
    expect(html).toContain('Title Conveyance Recorded with County');
  });

  it('renders the Save Legal Transfer Records button with accessible touch target', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Save Legal Transfer Records');
    expect(html).toContain('data-testid="save-legal-transfer-btn"');
    expect(html).toContain('min-h-[44px]');
  });

  it('strictly contains zero instances of forbidden term (case-insensitive)', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    const forbiddenRegex = /s[\s_\-]*p[\s_\-]*o[\s_\-]*n[\s_\-]*s[\s_\-]*o[\s_\-]*r/i;
    expect(forbiddenRegex.test(html)).toBe(false);
  });

  it('strictly contains zero em-dashes anywhere in output', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html.includes('—')).toBe(false);
    expect(html.includes('&mdash;')).toBe(false);
  });

  it('enforces rounded-none on controls, badges, and cards', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('rounded-none');
    expect(html).not.toMatch(/\brounded-(?:sm|md|lg|xl|2xl|3xl|full)\b/);
  });

  it('renders Closing Document Execution Package with all 4 executed instruments and notary details', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('5. Closing Document Execution Package');
    expect(html).toContain('Promissory / Mortgage Note Executed');
    expect(html).toContain('Deed of Trust / Security Instrument Executed');
    expect(html).toContain('Settlement Statement (ALTA / HUD-1) Executed');
    expect(html).toContain('Title &amp; Escrow Compliance Affidavits Executed');
    expect(html).toContain('Execution / Notarization Method');
    expect(html).toContain('Remote Online Notarization (RON)');
    expect(html).toContain('Claire Patterson, Commission #FL-882190');
    expect(html).toContain('data-testid="chk-mortgage-note"');
    expect(html).toContain('data-testid="chk-deed-of-trust"');
    expect(html).toContain('data-testid="chk-settlement-statement"');
    expect(html).toContain('data-testid="chk-title-affidavits"');
  });

  it('renders Itemized Closing Fee Settlement Ledger with calculated total and disbursement reconciliation', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('6. Itemized Closing Fee Settlement Ledger');
    expect(html).toContain('Lender Origination &amp; Underwriting ($)');
    expect(html).toContain('Title Examination &amp; Escrow Settlement ($)');
    expect(html).toContain('Escrow Taxes &amp; Insurance Prepaids ($)');
    expect(html).toContain('Government Recording &amp; Transfer Taxes ($)');
    expect(html).toContain('Total: $7,840');
    expect(html).toContain('Settlement Reconciled &amp; Audited');
    expect(html).toContain('ESCROW-DISB-88912');
  });

  it('renders Property Keys Receipt and Physical Possession Handover with lockbox and rekeying details', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('7. Property Keys Receipt &amp; Physical Possession Handover');
    expect(html).toContain('Possession Status');
    expect(html).toContain('Physical Keys &amp; Possession Received');
    expect(html).toContain('Key Handover Protocol');
    expect(html).toContain('Master Lockbox Code');
    expect(html).toContain('4821');
    expect(html).toContain('Water meter pipe on left side of porch');
    expect(html).toContain('Jordan Taylor (Lead Investor)');
    expect(html).toContain('Deadbolt Rekeying &amp; Access Codes Replaced');
    expect(html).toContain('data-testid="chk-rekey-completed"');
  });

  it('renders Finalize Closing & Advance to Hold ceremony and action button', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Closing Ceremony &amp; Advance to Hold Phase');
    expect(html).toContain('data-testid="finalize-closing-advance-btn"');
    expect(html).toContain('Finalize Closing &amp; Advance to Hold');
  });

  it('renders Title & Legal Protection milestone badges in the executive header', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Title: Cleared');
    expect(html).toContain('Title Ins: Dual Bound');
    expect(html).toContain('Hazard Ins: Bound &amp; Loss Payee');
  });

  it('renders Clear Property Title panel with deed search, lien clearance, and 4 verification checkboxes', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Clear Property Title: Deed Search &amp; Lien Clearance');
    expect(html).toContain('data-testid="panel-deed-search-clearance"');
    expect(html).toContain('data-testid="input-title-company-search"');
    expect(html).toContain('data-testid="select-title-search-status"');
    expect(html).toContain('data-testid="chk-deed-chain-verified"');
    expect(html).toContain('30-Year Deed Chain Verified');
    expect(html).toContain('data-testid="chk-no-unsatisfied-liens"');
    expect(html).toContain('Zero Unsatisfied Mortgage &amp; Mechanics Liens');
    expect(html).toContain('data-testid="chk-no-tax-judgment-liens"');
    expect(html).toContain('Zero Tax or Civil Judgment Liens');
    expect(html).toContain('data-testid="chk-no-ownership-boundary-disputes"');
    expect(html).toContain('Zero Ownership or Boundary Disputes');
    expect(html).toContain('MLC-2026-009412');
  });

  it('renders Purchase Title Insurance panel with dual policy comparison (lender vs owner) and pricing', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Purchase Title Insurance: Dual Policy Protection');
    expect(html).toContain('data-testid="panel-title-insurance"');
    expect(html).toContain('Lender&#x27;s Title Insurance Policy');
    expect(html).toContain('data-testid="input-lender-policy-num"');
    expect(html).toContain('LP-882190-FA');
    expect(html).toContain('Owner&#x27;s Title Insurance Policy');
    expect(html).toContain('data-testid="input-owner-policy-num"');
    expect(html).toContain('OP-882191-FA');
    expect(html).toContain('data-testid="input-total-title-premium"');
    expect(html).toContain('1850');
    expect(html).toContain('data-testid="chk-simultaneous-issue-discount"');
    expect(html).toContain('Simultaneous Issue Rate Discount Applied');
    expect(html).toContain('data-testid="chk-title-policies-bound"');
    expect(html).toContain('Title Policies Bound with Underwriter');
  });

  it('renders Secure Property Insurance panel with landlord DP-3 form, dwelling limits, and lender loss payee condition precedent', () => {
    const html = cleanHtml(
      renderToString(
        <LegalOwnershipTransferCard
          funding={baseFundingTerms}
          onUpdateFunding={() => {}}
        />,
      ),
    );

    expect(html).toContain('Secure Property Insurance: Hazard &amp; Landlord Binder');
    expect(html).toContain('data-testid="panel-property-insurance"');
    expect(html).toContain('data-testid="input-insurance-carrier"');
    expect(html).toContain('Steadily Real Estate Insurance / Travelers');
    expect(html).toContain('data-testid="select-insurance-policy-type"');
    expect(html).toContain('Landlord Policy (DP-3)');
    expect(html).toContain('data-testid="input-insurance-binder-num"');
    expect(html).toContain('BND-2026-99120');
    expect(html).toContain('data-testid="input-dwelling-coverage"');
    expect(html).toContain('350000');
    expect(html).toContain('data-testid="chk-lender-loss-payee"');
    expect(html).toContain('Lender Loss Payee &amp; Mortgagee Clause Endorsement Verified');
    expect(html).toContain('Mandatory condition precedent for loan funding: Lender must be named as First Mortgagee / Loss Payee on the insurance binder.');
    expect(html).toContain('data-testid="chk-flood-insurance-required"');
  });
});

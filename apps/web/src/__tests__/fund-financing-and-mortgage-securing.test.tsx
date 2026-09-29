/**
 * Test Suite: Financing & Mortgage Securing Suite
 *
 * Verifies:
 * 1. LendingPackageBuilder: Multi-package creation, document bundling, and loan application finalization.
 * 2. RateLockCard: Rate lock confirmation, expiration countdown, and agreement attachment.
 * 3. ClosingDisclosureReconciliation: TRID 0% and 10% tolerance buckets, side-by-side variance analysis.
 * 4. DownPaymentCoordinator: Wire transfer setup, anti-fraud verbal verification gate, and escrow confirmation.
 * 5. Design system compliance: Radix Lyra (rounded-none, min-h-[44px], neutral palette).
 */

import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import {
  LendingPackageBuilder,
  RateLockCard,
  ClosingDisclosureReconciliation,
  DownPaymentCoordinator,
} from '../../components/projects/fund';
import type {
  LendingPackage,
  RateLockDetails,
  ClosingDisclosureComparison,
  DownPaymentCoordination,
} from '../../lib/projects/types';

describe('Financing & Mortgage Securing Suite', () => {
  describe('LendingPackageBuilder', () => {
    const mockPackages: LendingPackage[] = [
      {
        id: 'pkg-senior-1',
        name: 'Senior Acquisition Debt Package',
        targetLender: 'Apex Commercial Capital',
        loanType: 'Commercial First Mortgage',
        requestedAmount: 294000,
        status: 'ready',
        documents: [
          {
            id: 'doc-1',
            title: 'Personal Financial Statement (PFS / Form 1003/1008)',
            category: 'financials',
            isIncluded: true,
            required: true,
            fileName: 'PFS_Signed.pdf',
          },
          {
            id: 'doc-2',
            title: 'Last 2 Years Personal & Corporate Tax Returns',
            category: 'tax_returns',
            isIncluded: true,
            required: true,
            fileName: 'Tax_Returns_2024_2025.pdf',
          },
          {
            id: 'doc-3',
            title: 'Last 3 Months Operating & Liquidity Bank Statements',
            category: 'bank_statements',
            isIncluded: false,
            required: true,
          },
        ],
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'pkg-bridge-2',
        name: 'Bridge Mezzanine Facility',
        targetLender: 'Lima One Capital',
        loanType: 'Bridge Loan',
        requestedAmount: 50000,
        status: 'draft',
        documents: [],
        createdAt: '2026-08-05T00:00:00.000Z',
        updatedAt: '2026-08-05T00:00:00.000Z',
      },
    ];

    it('renders multiple lending packages and active package details', () => {
      const html = renderToString(
        <LendingPackageBuilder
          packages={mockPackages}
          purchasePrice={392000}
          loanAmount={294000}
          onUpdatePackages={jest.fn()}
        />
      );

      // Verify header and packages count
      expect(html).toContain('Institutional Lending Packages &amp; Application');
      expect(html).toContain('2 Packages Active');

      // Verify package tabs
      expect(html).toContain('Senior Acquisition Debt Package');
      expect(html).toContain('Bridge Mezzanine Facility');

      // Verify active package properties
      expect(html).toContain('Apex Commercial Capital');
      expect(html).toContain('Commercial First Mortgage');
      expect(html).toContain('$294,000');

      // Verify document bundling checklist
      expect(html).toContain('Personal Financial Statement');
      expect(html).toContain('Tax_Returns_2024_2025.pdf');
      expect(html).toContain('Finalize Loan Application &amp; Submit to Lender');

      // Verify Radix Lyra design compliance
      expect(html).toContain('rounded-none');
      expect(html).toContain('min-h-[44px]');
    });

    it('renders submitted application status banner when package is submitted', () => {
      const submittedPackages: LendingPackage[] = [
        {
          ...mockPackages[0],
          status: 'submitted',
          submissionDate: '2026-09-20T10:00:00.000Z',
        },
      ];

      const html = renderToString(
        <LendingPackageBuilder
          packages={submittedPackages}
          onUpdatePackages={jest.fn()}
        />
      );

      expect(html).toContain('package-submitted-banner');
      expect(html).toContain('Loan Application Finalized &amp; Submitted to Apex Commercial Capital');
      expect(html).toContain('Application Submitted');
    });
  });

  describe('RateLockCard', () => {
    it('renders floating rate status and lock trigger when unlocked', () => {
      const floatingRate: RateLockDetails = {
        status: 'floating',
        lockedRatePct: 6.875,
        lockPeriodDays: 45,
      };

      const html = renderToString(
        <RateLockCard
          rateLock={floatingRate}
          currentUnderwritingRate={6.875}
          lenderName="Apex Commercial Capital"
          onUpdateRateLock={jest.fn()}
        />
      );

      expect(html).toContain('Floating (Unlocked)');
      expect(html).toContain('Mortgage Interest Rate Lock Controller');
      expect(html).toContain('Freeze &amp; Lock Rate');
      expect(html).toContain('6.875%');
      expect(html).toContain('rounded-none');
    });

    it('renders locked status, expiration countdown, and confirmation agreement', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 35);

      const lockedRate: RateLockDetails = {
        status: 'locked',
        lockedRatePct: 6.625,
        lockExecutionDate: '2026-09-01T00:00:00.000Z',
        expirationDate: futureDate.toISOString(),
        lockPeriodDays: 45,
        pointsOrFeeAmount: 1500,
        lenderConfirmationNumber: 'RL-CONF-98421',
        agreementDocumentName: 'Apex_Rate_Lock_Executed.pdf',
      };

      const html = renderToString(
        <RateLockCard
          rateLock={lockedRate}
          lenderName="Apex Commercial Capital"
          onUpdateRateLock={jest.fn()}
        />
      );

      expect(html).toContain('Interest Rate Locked');
      expect(html).toContain('rate-lock-countdown-banner');
      expect(html).toContain('Rate Freeze Active');
      expect(html).toContain('6.625%');
      expect(html).toContain('$1,500');
      expect(html).toContain('Apex_Rate_Lock_Executed.pdf');
      expect(html).toContain('Modify Lock Terms');
    });
  });

  describe('ClosingDisclosureReconciliation', () => {
    const mockCompliantComparison: ClosingDisclosureComparison = {
      loanEstimateDate: '2026-08-15',
      closingDisclosureDate: '2026-09-24',
      loanEstimateCashToClose: 105840,
      closingDisclosureCashToClose: 105650,
      isTridCompliant: true,
      items: [
        {
          id: 'cd-1',
          name: 'Loan Origination Fee (1.00%)',
          category: 'origination',
          toleranceBucket: 'zero_percent',
          loanEstimateAmount: 2940,
          closingDisclosureAmount: 2940,
        },
        {
          id: 'cd-2',
          name: 'Title - Closing Settlement Fee',
          category: 'can_shop',
          toleranceBucket: 'ten_percent',
          loanEstimateAmount: 1200,
          closingDisclosureAmount: 1250,
        },
        {
          id: 'cd-3',
          name: 'Prepaid Hazard Insurance',
          category: 'prepaids',
          toleranceBucket: 'unlimited',
          loanEstimateAmount: 1800,
          closingDisclosureAmount: 1610,
        },
      ],
    };

    it('renders side-by-side reconciliation and TRID compliance badge', () => {
      const html = renderToString(
        <ClosingDisclosureReconciliation
          comparison={mockCompliantComparison}
          loanAmount={294000}
          purchasePrice={392000}
          onUpdateComparison={jest.fn()}
        />
      );

      expect(html).toContain('TRID Compliant');
      expect(html).toContain('Closing Disclosure (CD) vs. Loan Estimate (LE) Reconciliation');
      expect(html).toContain('Loan Origination Fee (1.00%)');
      expect(html).toContain('0% Tolerance');
      expect(html).toContain('10% Cumulative');
      expect(html).toContain('Unlimited');
      expect(html).toContain('$105,840');
      expect(html).toContain('$105,650');
      expect(html).toContain('Acknowledge &amp; Sign Off CD');
    });

    it('flags TRID tolerance threshold breach with alert banner', () => {
      const breachComparison: ClosingDisclosureComparison = {
        ...mockCompliantComparison,
        items: [
          {
            id: 'cd-1',
            name: 'Lender Processing Fee',
            category: 'origination',
            toleranceBucket: 'zero_percent',
            loanEstimateAmount: 950,
            closingDisclosureAmount: 1450, // +$500 breach on 0% tolerance!
          },
        ],
      };

      const html = renderToString(
        <ClosingDisclosureReconciliation
          comparison={breachComparison}
          onUpdateComparison={jest.fn()}
        />
      );

      expect(html).toContain('Tolerance Discrepancy Detected');
      expect(html).toContain('tolerance-breach-banner');
      expect(html).toContain('CFPB TRID Tolerance Threshold Exceeded');
      expect(html).toContain('Breach');
    });
  });

  describe('DownPaymentCoordinator', () => {
    it('renders escrow coordinates and anti-fraud verbal verification gate', () => {
      const initialCoord: DownPaymentCoordination = {
        paymentMethod: 'wire_transfer',
        totalAmountDue: 105840,
        recipientEscrowCompany: 'First National Title & Settlement',
        recipientBankName: 'JPMorgan Chase Bank, N.A.',
        routingNumberMasked: '••••1248',
        accountNumberMasked: '••••••••4892',
        referenceFileNumber: 'ESC-2026-09-842',
        verbalConfirmationCompleted: false,
        status: 'awaiting_instructions',
      };

      const html = renderToString(
        <DownPaymentCoordinator
          coordination={initialCoord}
          totalCashToClose={105840}
          downPaymentAmount={98000}
          closingCostsAmount={7840}
          onUpdateCoordination={jest.fn()}
        />
      );

      expect(html).toContain('Down Payment &amp; Cash-to-Close Coordination');
      expect(html).toContain('$105,840');
      expect(html).toContain('$98,000 Down');
      expect(html).toContain('$7,840 Closing Costs');
      expect(html).toContain('Federal Wire Transfer (Standard)');
      expect(html).toContain('Official Bank Cashier&#x27;s Check');
      expect(html).toContain('First National Title &amp; Settlement');
      expect(html).toContain('JPMorgan Chase Bank, N.A.');
      expect(html).toContain('anti-fraud-verbal-gate');
      expect(html).toContain('Mandatory Anti-Fraud Verbal Phone Verification Gate');
      expect(html).toContain('Confirm Funds Dispatched to Escrow');
    });

    it('renders dispatched funds status and escrow clearance confirmation', () => {
      const dispatchedCoord: DownPaymentCoordination = {
        paymentMethod: 'wire_transfer',
        totalAmountDue: 105840,
        verbalConfirmationCompleted: true,
        verbalVerifiedPhone: '+1 (512) 555-0199',
        verbalVerifiedAt: '2026-09-25T14:30:00.000Z',
        status: 'payment_dispatched',
        dispatchReferenceNumber: 'FED-WIRE-982140',
        dispatchedAt: '2026-09-25T15:00:00.000Z',
      };

      const html = renderToString(
        <DownPaymentCoordinator
          coordination={dispatchedCoord}
          totalCashToClose={105840}
          onUpdateCoordination={jest.fn()}
        />
      );

      expect(html).toContain('Payment Dispatched');
      expect(html).toContain('FED-WIRE-982140');
      expect(html).toContain('Record Escrow Wire Confirmation');
    });
  });
});

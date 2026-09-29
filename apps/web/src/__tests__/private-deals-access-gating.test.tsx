import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  verifyDealAccess,
  updateSeedDealVisibility,
  shareSeedDealWith,
  getDealCalculatorResults,
  findSeedDeal,
  isUserSubscribed,
  SEED_RAW_DEALS,
} from '@/lib/marketplace/seed-data';
import PrivateDealAccessGate from '@/components/marketplace/PrivateDealAccessGate';
import ShareDealModal from '@/components/marketplace/ShareDealModal';
import {
  renderDealBroadcastHtml,
  renderDealBroadcastPlainText,
  type DealBroadcastEmailProps,
} from '@/lib/email/dealBroadcast';
import { INBOX_THREADS } from '@/lib/dashboard/shell-seed';

describe('Private Deals, Targeted Sharing & Access Gating Suite', () => {
  beforeEach(() => {
    // Reset seed deal 3 to private
    const oakridge = findSeedDeal('oakridgehold');
    if (oakridge) {
      oakridge.visibility = 'private';
      oakridge.shareToken = 'token_oakridge_pvt_2026';
      oakridge.sharedWith = ['dev-user-1', 'authorized@paperworking.test'];
    }
  });

  describe('1. verifyDealAccess Logic & Rules Engine', () => {
    it('allows full access for marketplace/public deals to any user or guest', () => {
      const publicResult = verifyDealAccess('1247elmst', null, null);
      expect(publicResult.allowed).toBe(true);
      expect(publicResult.isPrivate).toBe(false);
      expect(publicResult.reason).toBe('public');
      expect(publicResult.calculatorResults).toBeDefined();
      expect(publicResult.calculatorResults?.purchasePrice).toBe(485_000);
    });

    it('allows full access to the deal creator regardless of subscription tier', () => {
      const oakridge = findSeedDeal('oakridgehold')!;
      const creatorResult = verifyDealAccess(
        'oakridgehold',
        { id: oakridge.creatorId, subscriptionStatus: 'inactive' },
        null,
      );
      expect(creatorResult.allowed).toBe(true);
      expect(creatorResult.reason).toBe('creator');
      expect(creatorResult.calculatorResults).toBeDefined();
    });

    it('allows full access to a subscribed investor with a valid shareToken', () => {
      const subscribedUser = {
        id: 'investor-sub-1',
        email: 'sub@apexcap.com',
        subscriptionStatus: 'active',
        subscriptionPlan: 'pro',
      };
      const result = verifyDealAccess('oakridgehold', subscribedUser, 'token_oakridge_pvt_2026');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('subscribed_authorized');
      expect(result.calculatorResults).toBeDefined();
    });

    it('allows full access to a subscribed investor who is in sharedWith list', () => {
      const authorizedSubscribedUser = {
        id: 'dev-user-1',
        email: 'dev@paperworking.test',
        subscriptionStatus: 'active',
      };
      const result = verifyDealAccess('oakridgehold', authorizedSubscribedUser, null);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('subscribed_authorized');
    });

    it('GATES access for unsubscribed investor with valid shareToken, providing ONLY Deal Calculator Results', () => {
      const unsubscribedUser = {
        id: 'guest-inv-99',
        email: 'unsub@external.com',
        subscriptionStatus: 'inactive',
        subscriptionPlan: 'None',
      };
      const result = verifyDealAccess('oakridgehold', unsubscribedUser, 'token_oakridge_pvt_2026');
      // Must not allow full deal access
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unsubscribed_gate');
      // But delivers full calculator results
      expect(result.calculatorResults).toBeDefined();
      expect(result.calculatorResults?.purchasePrice).toBe(720_000);
      expect(result.calculatorResults?.targetIrr).toBe(9.5);
      expect(result.calculatorResults?.cashRequired).toBe(216_000);
      expect(result.calculatorResults?.strategy).toBe('Buy & Hold');
    });

    it('blocks access completely for unauthorized anonymous viewer without token', () => {
      const result = verifyDealAccess('oakridgehold', null, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('unauthorized');
      expect(result.calculatorResults).toBeUndefined();
    });
  });

  describe('2. PrivateDealAccessGate Component', () => {
    const sampleResults = {
      purchasePrice: 650000,
      rehabBudget: 45000,
      arv: 780000,
      targetIrr: 17.5,
      cashRequired: 195000,
      netOperatingIncome: 42000,
      capRateOnCost: 6.05,
      equityMultiple: 1.8,
      strategy: 'Value-Add Multifamily',
      holdPeriod: '3–5 Years',
    };

    it('renders delivered Deal Calculator results grid for unsubscribed recipients', () => {
      const html = renderToString(
        <PrivateDealAccessGate
          dealName="Highland Park Apartments"
          dealAddress="5400 Highland Ave, Dallas, TX 75205"
          dealSlug="highlandpark"
          dealId="deal-hp-1"
          calculatorResults={sampleResults}
          creatorName="Apex Operating Group"
          reason="unsubscribed_gate"
        />,
      );

      // Verify header and street address
      expect(html).toContain('5400 Highland Ave');
      expect(html).toContain('5400 Highland Ave, Dallas, TX 75205');
      expect(html).toContain('Apex Operating Group');

      // Verify delivered calculator outputs
      expect(html).toContain('delivered-calculator-results-grid');
      expect(html).toContain('$650,000');
      expect(html).toContain('$45,000');
      expect(html).toContain('$780,000');
      expect(html).toContain('17.5%');
      expect(html).toContain('$195,000');
      expect(html).toContain('$42,000');
      expect(html).toContain('6.05%');
      expect(html).toContain('1.80x');

      // Verify locked assets notice & subscription upgrade CTAs
      expect(html).toContain('Confidential Deal Room Assets');
      expect(html).toContain('href="/pricing"');
      expect(html).toContain('href="/login"');
      expect(html).toContain('Subscribe to PaperWorking');
    });

    it('never contains the forbidden word "sponsor" anywhere in markup', () => {
      const html = renderToString(
        <PrivateDealAccessGate
          dealName="Highland Park"
          dealAddress="5400 Highland Ave, Dallas, TX"
          dealSlug="highlandpark"
          calculatorResults={sampleResults}
          creatorName="Apex Group"
        />,
      );

      expect(html.toLowerCase()).not.toContain('sponsor');
    });
  });

  describe('3. ShareDealModal Component', () => {
    it('renders placement toggle and distribution channels cleanly', () => {
      const html = renderToString(
        <ShareDealModal
          isOpen={true}
          onClose={() => {}}
          dealId="deal-mp-1"
          dealSlug="1247elmst"
          dealTitle="1247 Elm Street"
          dealAddress="1247 Elm Street, Austin, TX 78702"
          currentVisibility="marketplace"
          targetIrr={18.4}
          purchasePrice={485000}
        />,
      );

      // Asserts modal elements
      expect(html).toContain('data-testid="share-deal-modal"');
      expect(html).toContain('data-testid="visibility-marketplace-btn"');
      expect(html).toContain('data-testid="visibility-private-btn"');
      expect(html).toContain('data-testid="channel-message-btn"');
      expect(html).toContain('data-testid="channel-email-btn"');
      expect(html).toContain('data-testid="channel-copy-link-btn"');
      expect(html).toContain('data-testid="share-submit-btn"');

      // Asserts calculator preview
      expect(html).toContain('18.4% Target IRR');
      expect(html).toContain('$485,000');
      expect(html).not.toContain('sponsor');
    });
  });

  describe('4. Email Generator Deal Calculator Results Rendering', () => {
    const baseEmailProps: DealBroadcastEmailProps = {
      dealName: 'Oak Ridge Hold',
      dealAddress: '88 Oak Ridge Dr, Denver, CO 80202',
      dealSlug: 'oakridgehold',
      purchasePrice: 720000,
      projectedRoi: 9.5,
      senderName: 'Private Investor',
      senderEmail: 'private@paperworking.test',
      subject: 'Private Investment Opportunity: 88 Oak Ridge Dr',
      message: 'Review our underwriting calculations for Oak Ridge.',
      token: 'token_oakridge_pvt_2026',
      calculatorResults: {
        purchasePrice: 720000,
        rehabBudget: 0,
        arv: 780000,
        targetIrr: 9.5,
        cashRequired: 216000,
        netOperatingIncome: 45000,
        capRateOnCost: 6.25,
        equityMultiple: 1.45,
        strategy: 'Buy & Hold',
        holdPeriod: '5–7 Years',
      },
    };

    it('renders Deal Calculator results table in HTML email with complete financial outputs', () => {
      const html = renderDealBroadcastHtml(baseEmailProps);

      expect(html).toContain('Deal Calculator Results');
      expect(html).toContain('$720,000');
      expect(html).toContain('$780,000');
      expect(html).toContain('9.5%');
      expect(html).toContain('$216,000');
      expect(html).toContain('$45,000');
      expect(html).toContain('6.25%');
      expect(html).toContain('Buy & Hold (5–7 Years)');
      expect(html).toContain('/deals/oakridgehold/external?token=token_oakridge_pvt_2026&broadcast=true');
    });

    it('renders Deal Calculator results in plain text email fallback', () => {
      const text = renderDealBroadcastPlainText(baseEmailProps);

      expect(text).toContain('DEAL CALCULATOR RESULTS:');
      expect(text).toContain('Purchase Price: $720,000');
      expect(text).toContain('ARV: $780,000');
      expect(text).toContain('Target IRR: 9.5%');
      expect(text).toContain('Cash Required: $216,000');
      expect(text).toContain('Net Operating Income (NOI): $45,000');
      expect(text).toContain('Cap Rate on Cost: 6.25%');
      expect(text).toContain('Strategy & Hold: Buy & Hold (5–7 Years)');
    });
  });

  describe('5. Seed Mutators & Helpers for Privacy', () => {
    it('updateSeedDealVisibility toggles deal between marketplace and private and creates token', () => {
      const updated = updateSeedDealVisibility('oakridgehold', 'private');
      expect(updated).not.toBeNull();
      expect(updated?.visibility).toBe('private');
      expect(updated?.shareToken).toBeDefined();

      const backToMkt = updateSeedDealVisibility('oakridgehold', 'marketplace');
      expect(backToMkt?.visibility).toBe('marketplace');
    });

    it('shareSeedDealWith registers recipients and creates shareToken', () => {
      const res = shareSeedDealWith('oakridgehold', 'new-investor@fund.org');
      expect(res.success).toBe(true);
      expect(res.deal?.sharedWith).toContain('new-investor@fund.org');
      expect(res.shareToken).toBeDefined();
    });
  });
});

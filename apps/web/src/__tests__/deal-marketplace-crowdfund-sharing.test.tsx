import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';

// Mock next/navigation
jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/marketplace/apexheights',
}));

// Mock Auth Context
jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'investor', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
    navContext: { role: 'investor', accountType: 'investor' },
  }),
  useOptionalAuth: () => ({
    loading: false,
    authenticated: true,
    profile: { accountType: 'investor', subscriptionPlan: 'Pro', subscriptionStatus: 'active' },
  }),
}));

// Mock Compare Context
jest.unstable_mockModule('@/context/CompareContext', () => ({
  useCompare: () => ({
    addToCompare: jest.fn(),
    removeFromCompare: jest.fn(),
    isComparing: () => false,
    compareList: [],
    comparedDeals: [],
    clearCompare: jest.fn(),
  }),
}));

// Mock Saved Deals Context
jest.unstable_mockModule('@/context/SavedDealsContext', () => ({
  useSavedDeals: () => ({
    isSaved: () => false,
    toggleSave: jest.fn(),
    savedDeals: [],
  }),
}));

// Mock Property Image hook
jest.unstable_mockModule('@/lib/maps/property-image', () => ({
  usePropertyImage: () => ({
    imageUrl: '/images/properties/deal-property-default.jpg',
    handleImageError: jest.fn(),
    isLoading: false,
  }),
}));

const { default: DealDetailPageView } = await import('../../components/marketplace/detail/DealDetailPageView.js');
const { default: DealCrowdfundModal } = await import('../../components/marketplace/DealCrowdfundModal.js');
const { default: DealsMarketplacePanel } = await import('../../components/marketplace/DealsMarketplacePanel.js');
const { default: DealCard } = await import('../../components/marketplace/DealCard.js');
const { default: ShareDealModal } = await import('../../components/marketplace/ShareDealModal.js');
const { default: BroadcastDealModal } = await import('../../components/marketing/deal-calculator/BroadcastDealModal.js');
const { default: PrivateDealAccessGate } = await import('../../components/marketplace/PrivateDealAccessGate.js');
const {
  verifyDealAccess,
  isUserSubscribed,
  getDealCalculatorResults,
  findSeedDeal,
  SEED_RAW_DEALS,
} = await import('../../lib/marketplace/seed-data.js');
const {
  renderDealBroadcastHtml,
  renderDealBroadcastPlainText,
} = await import('../../lib/email/dealBroadcast.js');

describe('Requirement 8: Crowdfunding Ecosystem, Deal Sharing & Subscriber Gating', () => {
  const mockDeal = {
    id: 'deal-mp-1',
    slug: 'apexheights',
    name: 'Apex Heights Living',
    propertyName: 'Apex Heights Living',
    address: '1247 Elm Street, Austin, TX 78702',
    city: 'Austin',
    state: 'TX',
    assetClass: 'Multifamily',
    subStrategy: 'VALUE_ADD',
    status: 'funding',
    visibility: 'marketplace' as const,
    purchasePrice: 1250000,
    price: 1250000,
    fundingTarget: 450000,
    target: 450000,
    committedAmount: 315000,
    committed: 315000,
    investorCount: 14,
    minInvestment: 25000,
    targetIrr: 18.4,
    projectedRoi: 18.4,
    roi: 18.4,
    equityMultiple: 1.85,
    holdPeriod: '3–5 Years',
    creatorName: 'Apex Syndications',
    isVerifiedOperator: true,
    calculatorResults: {
      purchasePrice: 1250000,
      rehabBudget: 150000,
      arv: 1650000,
      targetIrr: 18.4,
      projectedRoi: 18.4,
      cashRequired: 400000,
      equityMultiple: 1.85,
      capRateOnCost: 6.8,
      cashOnCashReturnPct: 7.5,
      monthlyDebtService: 5800,
      grossMonthlyRent: 11000,
      netOperatingIncome: 85000,
      maximumAllowableOffer70Pct: 1005000,
      strategy: 'Value Add Multifamily',
      holdPeriod: '3–5 Years',
    },
    projects: [
      {
        id: 'proj-1247',
        name: 'Apex Multifamily Portfolio',
        stage: 'FUND',
        progress: 60,
      },
    ],
  };

  describe('1. Crowdfunding Ecosystem on Deals Marketplace', () => {
    it('renders crowdfunding ecosystem metrics widget with target, commitments, and progress', () => {
      const html = renderToString(
        <DealDetailPageView
          deal={mockDeal as any}
          allDeals={[mockDeal as any]}
          isSubscriber={true}
        />
      );
      const cleanHtml = html.replace(/<!--.*?-->/g, '');

      expect(cleanHtml).toContain('data-testid="crowdfunding-ecosystem-widget"');
      expect(cleanHtml).toContain('Crowdfunding Allocation');
      expect(cleanHtml).toContain('70% Funded');
      expect(cleanHtml).toContain('14 Investors');
      expect(cleanHtml).toContain('data-testid="rail-invest-syndicate-btn"');
      expect(cleanHtml).toContain('Invest in Syndicate');
      expect(cleanHtml).toContain('data-testid="hero-invest-syndicate-btn"');
    });

    it('renders DealCrowdfundModal with investment commitment options and off-platform closing notice', () => {
      const html = renderToString(
        <DealCrowdfundModal
          deal={mockDeal as any}
          isOpen={true}
          onClose={() => {}}
          onCommitSuccess={() => {}}
        />
      );
      const cleanHtml = html.replace(/<!--.*?-->/g, '');

      expect(cleanHtml).toContain('data-testid="deal-crowdfund-modal"');
      expect(cleanHtml).toContain('Crowdfunding Syndicate');
      expect(cleanHtml).toContain('Invest in Apex Heights Living');
      expect(cleanHtml).toContain('1. Select Investment Amount (Min: $25,000)');
      expect(cleanHtml).toContain('2. Investing Entity Type');
      expect(cleanHtml).toContain('accredited investor');
      expect(cleanHtml).toContain('Private Placement Memorandum');
      expect(cleanHtml).toContain('Off-Platform Closing');
      expect(cleanHtml).toContain('data-testid="submit-crowdfund-commitment-btn"');
    });

    it('renders "+ Post Deal to Marketplace" button in DealsMarketplacePanel header', () => {
      const html = renderToString(
        <DealsMarketplacePanel initialDeals={[mockDeal as any]} />
      );

      expect(html).toContain('data-testid="marketplace-post-deal-btn"');
      expect(html).toContain('+ Post Deal to Marketplace');
    });
  });

  describe('2. Deal Calculator Results Included in Every Post', () => {
    it('prominently showcases Deal Calculator results card in DealDetailPageView overview', () => {
      const html = renderToString(
        <DealDetailPageView
          deal={mockDeal as any}
          allDeals={[mockDeal as any]}
          isSubscriber={false}
        />
      );

      expect(html).toContain('data-testid="deal-calculator-results-card"');
      expect(html).toContain('Deal Calculator Results');
      expect(html).toContain('Verified Underwriting');
      expect(html).toContain('$1,250,000'); // Purchase price
      expect(html).toContain('$150,000'); // Rehab budget
      expect(html).toContain('$1,650,000'); // ARV
      expect(html).toContain('18.4%'); // Target IRR
      expect(html).toContain('1.85x'); // Equity multiple
      expect(html).toContain('$400,000'); // Cash required
      expect(html).toContain('6.8%'); // Cap rate
    });

    it('displays 4-metric underwriting grid and calculator attribution in DealCard', () => {
      const html = renderToString(<DealCard deal={mockDeal as any} />);

      expect(html).toContain('Target IRR');
      expect(html).toContain('Eq Multiple');
      expect(html).toContain('Hold Period');
      expect(html).toContain('Min Invest');
      expect(html).toContain('Underwritten via PaperWorking Deal Calculator');
    });
  });

  describe('3. Email Sharing to a Comma-Delineated List', () => {
    it('renders comma-delineated email list input in BroadcastDealModal', () => {
      const html = renderToString(
        <BroadcastDealModal
          isOpen={true}
          onClose={() => {}}
          address="1247 Elm Street, Austin, TX 78702"
          purchasePrice={1250000}
          calculations={{
            projectedIrrPct: 18.4,
            netOperatingIncome: 85000,
            cashRequired: 400000,
            capRateOnCost: 6.8,
          } as any}
          onSuccess={() => {}}
        />
      );

      expect(html).toContain('data-testid="broadcast-deal-modal"');
      expect(html).toContain('Investor / Partner Email List (comma-delineated');
      expect(html).toContain('partners@investorgroup.com, acquisitions@capitalfund.io');
    });

    it('renders complete Deal Calculator results table in HTML and plain text email templates', () => {
      const emailProps = {
        dealName: 'Apex Heights Living',
        dealAddress: '1247 Elm Street, Austin, TX 78702',
        dealSlug: 'apexheights',
        purchasePrice: 1250000,
        projectedRoi: 18.4,
        senderName: 'Sarah Jenkins',
        senderEmail: 'sarah@apexcap.com',
        subject: 'Investment Opportunity: 1247 Elm Street',
        message: 'Review our underwriting metrics for this acquisition.',
        token: 'test_token_123',
        calculatorResults: mockDeal.calculatorResults,
      };

      const htmlOutput = renderDealBroadcastHtml(emailProps);
      expect(htmlOutput).toContain('data-testid="deal-calculator-results-section"');
      expect(htmlOutput).toContain('Deal Calculator Results');
      expect(htmlOutput).toContain('$1,250,000');
      expect(htmlOutput).toContain('$150,000');
      expect(htmlOutput).toContain('$1,650,000');
      expect(htmlOutput).toContain('18.4%');
      expect(htmlOutput).toContain('$85,000');

      const plainText = renderDealBroadcastPlainText(emailProps);
      expect(plainText).toContain('DEAL CALCULATOR RESULTS');
      expect(plainText).toContain('Purchase Price: $1,250,000');
      expect(plainText).toContain('Rehab Budget: $150,000');
      expect(plainText).toContain('Target IRR: 18.4%');
    });
  });

  describe('4. Social Media Sharing with Deal Calculator Results', () => {
    it('renders dedicated Social Media channel and one-click share buttons in ShareDealModal', () => {
      const html = renderToString(
        <ShareDealModal
          isOpen={true}
          onClose={() => {}}
          dealId="deal-mp-1"
          dealSlug="apexheights"
          dealTitle="Apex Heights Living"
          dealAddress="1247 Elm Street, Austin, TX 78702"
          currentVisibility="marketplace"
          initialChannel="social"
          targetIrr={18.4}
          purchasePrice={1250000}
          calculatorResults={mockDeal.calculatorResults}
          onVisibilityChange={() => {}}
        />
      );
      const cleanHtml = html.replace(/<!--.*?-->/g, '');

      expect(cleanHtml).toContain('data-testid="channel-social-btn"');
      expect(cleanHtml).toContain('Social Media');
      expect(cleanHtml).toContain('data-testid="share-twitter-btn"');
      expect(cleanHtml).toContain('data-testid="share-linkedin-btn"');
      expect(cleanHtml).toContain('data-testid="share-facebook-btn"');
      expect(cleanHtml).toContain('data-testid="copy-social-post-btn"');
      expect(cleanHtml).toContain('Copy Post');
      expect(cleanHtml).toContain('Deal Calculator Results:');
      expect(cleanHtml).toContain('Target IRR: 18.4%');
      expect(cleanHtml).toContain('Purchase: $1,250,000');
      expect(cleanHtml).toContain('Rehab: $150,000');
      expect(cleanHtml).toContain('NOI: $85,000');
    });
  });

  describe('5. Subscriber Gating for Full Deal Access', () => {
    it('enforces subscriber gate in DealDetailPageView when viewer is NOT a subscriber', () => {
      const html = renderToString(
        <DealDetailPageView
          deal={mockDeal as any}
          allDeals={[mockDeal as any]}
          isSubscriber={false}
        />
      );

      // Section 1 Overview and Deal Calculator Results remain visible
      expect(html).toContain('data-testid="deal-calculator-results-card"');
      expect(html).toContain('Deal Calculator Results');

      // Section 2 Financials is gated
      expect(html).toContain('data-testid="subscriber-full-deal-gate"');
      expect(html).toContain('Subscriber Only Deal Room');
      expect(html).toContain('Users must be subscribers to see the full deal.');
      expect(html).toContain('data-testid="gate-upgrade-subscription-btn"');
      expect(html).toContain('Upgrade to Subscriber Pro');

      // Section 5 Documents is gated
      expect(html).toContain('data-testid="subscriber-documents-gate"');
      expect(html).toContain('Users must be subscribers to see the full deal and download confidential due diligence records.');

      // Pro-forma table should NOT be rendered
      expect(html).not.toContain('Line Item');
      expect(html).not.toContain('Gross Revenue');
    });

    it('unrolls full deal financial pro-forma and downloads when viewer IS a subscriber', () => {
      const html = renderToString(
        <DealDetailPageView
          deal={mockDeal as any}
          allDeals={[mockDeal as any]}
          isSubscriber={true}
        />
      );

      // Gate should NOT be rendered
      expect(html).not.toContain('data-testid="subscriber-full-deal-gate"');
      expect(html).not.toContain('data-testid="subscriber-documents-gate"');

      // Full 5-year pro-forma table is visible
      expect(html).toContain('Financial Breakdown &amp; Projections');
      expect(html).toContain('Line Item');
      expect(html).toContain('Gross Revenue');
      expect(html).toContain('Operating Expenses (Opex)');
      expect(html).toContain('Net Operating Income (NOI)');
      expect(html).toContain('Net Cash Flow');
      expect(html).toContain('Cash-on-Cash Return');
      expect(html).toContain('Downside Sensitivity (-12%)');
    });

    it('renders PrivateDealAccessGate with exact requirement copy when reason is unsubscribed_gate', () => {
      const html = renderToString(
        <PrivateDealAccessGate
          dealName="Apex Heights Living"
          dealAddress="1247 Elm Street, Austin, TX 78702"
          dealSlug="apexheights"
          dealId="deal-mp-1"
          calculatorResults={mockDeal.calculatorResults}
          creatorName="Apex Syndications"
          reason="unsubscribed_gate"
        />
      );

      expect(html).toContain('data-testid="subscriber-full-deal-gate"');
      expect(html).toContain('Users must be subscribers to see the full deal.');
      expect(html).toContain('data-testid="delivered-calculator-results-grid"');
      expect(html).toContain('Delivered Deal Calculator Results');
    });

    it('verifies deal access with options.requireSubscriberForFullDeal', () => {
      // Unsubscribed user with requireSubscriberForFullDeal option
      const unsubscribedUser = {
        id: 'unsub-investor-1',
        email: 'unsub@external.com',
        subscriptionStatus: 'inactive',
      };

      const gatedResult = verifyDealAccess(
        '1247elmst',
        unsubscribedUser,
        null,
        { requireSubscriberForFullDeal: true }
      );

      expect(gatedResult.allowed).toBe(false);
      expect(gatedResult.reason).toBe('unsubscribed_gate');
      expect(gatedResult.calculatorResults).toBeDefined();

      // Subscribed user with requireSubscriberForFullDeal option
      const subscribedUser = {
        id: 'sub-investor-2',
        email: 'sub@apexcap.com',
        subscriptionStatus: 'active',
        subscriptionPlan: 'pro',
      };

      const allowedResult = verifyDealAccess(
        '1247elmst',
        subscribedUser,
        null,
        { requireSubscriberForFullDeal: true }
      );

      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.reason).toBe('public');
    });

    it('isUserSubscribed correctly recognizes active subscriber tiers', () => {
      expect(isUserSubscribed({ subscriptionStatus: 'active' })).toBe(true);
      expect(isUserSubscribed({ subscriptionStatus: 'trialing' })).toBe(true);
      expect(isUserSubscribed({ subscriptionPlan: 'pro', subscriptionStatus: 'active' })).toBe(true);
      expect(isUserSubscribed({ subscriptionPlan: 'subscriber' })).toBe(true);
      expect(isUserSubscribed({ subscriptionPlan: 'enterprise' })).toBe(true);
      expect(isUserSubscribed({ subscriptionStatus: 'canceled' })).toBe(false);
      expect(isUserSubscribed(null)).toBe(false);
      expect(isUserSubscribed(undefined)).toBe(false);
    });
  });
});

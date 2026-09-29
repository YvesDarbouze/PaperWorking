import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockPush = jest.fn();
const mockFetchSessionProfile = jest.fn<() => Promise<{
  authenticated: boolean;
  accountType?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}>>();

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  usePathname: () => '/deal-calculator',
  useSearchParams: () => new URLSearchParams(),
}));

jest.unstable_mockModule('@/lib/auth/session-client', () => ({
  fetchSessionProfile: mockFetchSessionProfile,
  destroySession: jest.fn(),
  createSession: jest.fn(),
  createDevSession: jest.fn(),
}));

const { default: DealCalculatorView } = await import(
  '../../components/marketing/DealCalculatorView.js'
);
const { default: ExpressInterestModal } = await import(
  '../../components/marketplace/ExpressInterestModal.js'
);

describe('Deal Calculator Institutional Features & Lifecycle Integration Suite', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSessionProfile.mockReset();
  });

  describe('1. 6 Strategies & Strategy Selector Bar', () => {
    it('renders all 6 strategy selectors with tags and badges', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('Long-Term Rental');
      expect(html).toContain('Short-Term (STR / Airbnb)');
      expect(html).toContain('Fix &amp; Flip');
      expect(html).toContain('BRRRR Refinance');
      expect(html).toContain('Commercial &amp; Multi-Family');
      expect(html).toContain('Wholesaling');
    });
  });

  describe('2. Deal Structuring & Capital Seeking Intent', () => {
    it('renders financing modality pills and capital seeking intent cards', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      // Financing modalities
      expect(html).toContain('Conventional');
      expect(html).toContain('Hard Money');
      expect(html).toContain('All Cash');
      expect(html).toContain('Owner Financed');

      // Capital Intent cards
      expect(html).toContain('Solo / Self-Funded');
      expect(html).toContain('Partner for Down Payment');
      expect(html).toContain('Partner for Whole Deal (JV)');
      expect(html).toContain('Crowdfund / Syndication');
    });
  });

  describe('3. Purchase Criteria Screening (Buy Box Scorecard)', () => {
    it('renders Green Light Buy Box Scorecard and decision chips', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="purchase-criteria-card"');
      expect(html).toContain('data-testid="criteria-status-chip"');
      expect(html).toContain('Cash-on-Cash Return');
      expect(html).toContain('Cap Rate on Cost');
    });
  });

  describe('4. Worksheets & Collaboration Actions', () => {
    it('renders Itemized Worksheet trigger, Schedule E trigger, Share and Post buttons', () => {
      const html = renderToString(
        <DealCalculatorView initialAuthenticated={true} initialSubscriptionStatus="active" />
      );

      expect(html).toContain('data-testid="open-rehab-worksheet-btn"');
      expect(html).toContain('Itemized Worksheet');
      expect(html).toContain('data-testid="open-schedule-e-btn"');
      expect(html).toContain('Schedule E OpEx');
      expect(html).toContain('data-testid="broadcast-deal-btn"');
      expect(html).toContain('Share via Email');
      expect(html).toContain('data-testid="post-marketplace-btn"');
      expect(html).toContain('Post to Marketplace');
    });
  });

  describe('5. Express Interest Modal with Meeting Scheduler', () => {
    it('renders commitment input and "Set up a time to talk" scheduler tab and slots', () => {
      const mockDeal = {
        id: 'deal-123',
        slug: 'austin-multifamily-deal',
        propertyName: 'Austin Riverfront Flats',
        minInvestment: 50000,
        fundingTarget: 1200000,
        committedAmount: 400000,
      };

      const html = renderToString(
        <ExpressInterestModal
          deal={mockDeal}
          isOpen={true}
          onClose={() => {}}
        />
      );

      expect(html).toContain('data-testid="express-interest-modal"');
      expect(html).toContain('data-testid="tab-commitment"');
      expect(html).toContain('data-testid="tab-schedule"');
      expect(html).toContain('Express Commitment');
      expect(html).toContain('Set up a time to talk');
      expect(html).toContain('Austin Riverfront Flats');
      expect(html).toContain('$50,000');
    });

    it('renders scheduler form when in schedule mode', () => {
      const mockDeal = {
        id: 'deal-456',
        slug: 'denver-mixed-use',
        propertyName: 'Denver LoDo Lofts',
        minInvestment: 25000,
      };

      const html = renderToString(
        <ExpressInterestModal
          deal={mockDeal}
          isOpen={true}
          onClose={() => {}}
          initialMode="schedule"
        />
      );

      expect(html).toContain('data-testid="preferred-date-input"');
      expect(html).toContain('data-testid="time-slot-morning"');
      expect(html).toContain('data-testid="time-slot-afternoon"');
      expect(html).toContain('data-testid="time-slot-evening"');
      expect(html).toContain('data-testid="meeting-format-google_meet"');
      expect(html).toContain('data-testid="investor-email-input"');
      expect(html).toContain('data-testid="submit-meeting-btn"');
    });
  });
});

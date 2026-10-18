import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import DashboardTrendDetailModal from '../../components/dashboard/DashboardTrendDetailModal.js';
import FollowersModal from '../../components/dashboard/FollowersModal.js';

const mockUseAuth = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

// Import dynamically after module mock
const { default: CommandCenterPanel } = await import(
  '../../components/dashboard/CommandCenterPanel.js'
);

describe('Dashboard Modals & Followers Interaction Suite', () => {
  describe('DashboardTrendDetailModal', () => {
    it('renders with expand button, period controls, phase filters, and chart view', () => {
      const html = renderToString(
        <DashboardTrendDetailModal
          isOpen={true}
          onClose={() => {}}
          portfolioValue="$2,840,000"
          growthPct="+8.4%"
          totalNoi="$174,000"
        />
      );

      expect(html).toContain('data-testid="dashboard-trend-detail-modal"');
      expect(html).toContain('Portfolio Value Trend &amp; Performance Ledger');
      expect(html).toContain('data-testid="trend-modal-expand-button"');
      // Time period controls
      expect(html).toContain('data-testid="time-period-30D"');
      expect(html).toContain('data-testid="time-period-90D"');
      expect(html).toContain('data-testid="time-period-1Y"');
      expect(html).toContain('data-testid="time-period-ALL"');
      // Phase filter
      expect(html).toContain('data-testid="trend-phase-filter"');
      expect(html).toContain('All REIL Phases');
      // View switches
      expect(html).toContain('data-testid="view-mode-chart"');
      expect(html).toContain('data-testid="view-mode-table"');
      // Chart container
      expect(html).toContain('data-testid="trend-chart-container"');
      expect(html).toContain('$2,840,000');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <DashboardTrendDetailModal
          isOpen={false}
          onClose={() => {}}
        />
      );
      expect(html).toBe('');
    });
  });

  describe('FollowersModal', () => {
    it('renders followers list, search input, and connection actions', () => {
      const html = renderToString(
        <FollowersModal
          isOpen={true}
          onClose={() => {}}
          totalCount={12}
        />
      );

      expect(html).toContain('data-testid="portfolio-followers-modal"');
      expect(html).toContain('Portfolio Followers &amp; Network');
      expect(html).toContain('data-testid="followers-search-input"');
      expect(html).toContain('data-testid="tab-followers"');
      expect(html).toContain('data-testid="tab-following"');
      expect(html).toContain('Alex Morgan');
      expect(html).toContain('Message');
      expect(html).toContain('Deals');
      expect(html).toContain('href="/dashboard/deals"');
      expect(html).not.toContain('href="/dashboard/explore"');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <FollowersModal
          isOpen={false}
          onClose={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('Bug_73: renders active in-modal direct chat panel when initialSelectedFollower is provided', () => {
      const html = renderToString(
        <FollowersModal
          isOpen={true}
          onClose={() => {}}
          initialSelectedFollower={{
            id: 'f1',
            name: 'Alex Morgan',
            dealName: '1247 Elm Street',
            firm: 'Apex Commercial Capital',
            role: 'Acquisitions Director',
            email: 'alex@apexcommercial.com',
          }}
        />
      );

      expect(html).toContain('data-testid="follower-direct-chat-panel"');
      expect(html).toContain('data-testid="direct-chat-messages"');
      expect(html).toContain('data-testid="direct-chat-input"');
      expect(html).toContain('data-testid="direct-chat-send-btn"');
      expect(html).toContain('data-testid="back-to-followers-list-btn"');
      expect(html).toContain('data-testid="open-in-inbox-link"');
      expect(html).toContain('Alex Morgan');
      expect(html).toContain('Apex Commercial Capital');
    });
  });

  describe('CommandCenterPanel & Relocated MarketplaceSocialProfileCard triggers integration', () => {
    it('renders trend expansion triggers on CommandCenterPanel and followers social triggers on MarketplaceSocialProfileCard', async () => {
      const { default: MarketplaceSocialProfileCard } = await import(
        '../../components/marketplace/MarketplaceSocialProfileCard.js'
      );

      mockUseAuth.mockReturnValue({
        loading: false,
        authenticated: true,
        profile: {
          accountType: 'investor',
          subscriptionPlan: 'Individual',
        },
      });

      const dashboardHtml = renderToString(<CommandCenterPanel />);

      // 90-Day Trend expand triggers remain on Portfolio Dashboard
      expect(dashboardHtml).toContain('data-testid="expand-trend-modal-trigger"');
      expect(dashboardHtml).toContain('data-testid="trend-card-heading-trigger"');
      expect(dashboardHtml).toContain('data-testid="trend-card-content-trigger"');

      // Social Profile card relocated off Portfolio Dashboard to Deals Marketplace & Vendor Directory
      expect(dashboardHtml).not.toContain('data-testid="followers-count-trigger"');

      const socialProfileHtml = renderToString(
        <MarketplaceSocialProfileCard variant="banner" contextLabel="Deals Marketplace" />
      );
      expect(socialProfileHtml).toContain('data-testid="marketplace-social-profile-card"');
      expect(socialProfileHtml).toContain('data-testid="followers-count-trigger"');
      expect(socialProfileHtml).toContain('data-testid="followers-heading-trigger"');
      expect(socialProfileHtml).toContain('data-testid="follower-row-f1"');
    });
  });
});

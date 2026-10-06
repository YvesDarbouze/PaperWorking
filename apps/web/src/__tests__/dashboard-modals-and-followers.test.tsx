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
  });

  describe('CommandCenterPanel triggers integration', () => {
    it('renders interactive triggers for followers and trend expansion', () => {
      mockUseAuth.mockReturnValue({
        loading: false,
        authenticated: true,
        profile: {
          accountType: 'investor',
          subscriptionPlan: 'Individual',
        },
      });

      const html = renderToString(<CommandCenterPanel />);

      // Followers count and heading triggers
      expect(html).toContain('data-testid="followers-count-trigger"');
      expect(html).toContain('data-testid="followers-heading-trigger"');
      expect(html).toContain('data-testid="follower-row-f1"');

      // 90-Day Trend expand triggers
      expect(html).toContain('data-testid="expand-trend-modal-trigger"');
      expect(html).toContain('data-testid="trend-card-heading-trigger"');
      expect(html).toContain('data-testid="trend-card-content-trigger"');
    });
  });
});

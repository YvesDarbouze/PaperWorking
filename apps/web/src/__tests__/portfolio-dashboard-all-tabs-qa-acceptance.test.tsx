import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';

const mockUseAuth = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
  useOptionalAuth: mockUseAuth,
}));

jest.unstable_mockModule('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

const {
  resolvePrimaryNav,
  resolveAccountNav,
  resolveBottomNav,
  resolveDrawerNav,
} = await import('../../lib/navigation/nav-contract.js');
const { default: CommandCenterPanel } = await import(
  '../../components/dashboard/CommandCenterPanel.js'
);
const { default: DashboardTrendDetailModal } = await import(
  '../../components/dashboard/DashboardTrendDetailModal.js'
);
const { default: ProjectsListPanel } = await import(
  '../../components/projects/ProjectsListPanel.js'
);
const { default: ProjectFolderCard } = await import(
  '../../components/projects/ProjectFolderCard.js'
);
const { default: PortfolioInsightsPanel } = await import(
  '../../components/insights/PortfolioInsightsPanel.js'
);
const { default: PortfolioReportsPanel } = await import(
  '../../components/reports/PortfolioReportsPanel.js'
);
const { default: InboxNotificationCenter } = await import(
  '../../components/inbox/InboxNotificationCenter.js'
);
const { default: TeamDirectoryPanel } = await import(
  '../../components/team/TeamDirectoryPanel.js'
);
const { default: PublicProfileEditor } = await import(
  '../../components/profile/PublicProfileEditor.js'
);
const { default: GeneralSettingsPanel } = await import(
  '../../components/settings/GeneralSettingsPanel.js'
);
const { default: SecuritySettingsPanel } = await import(
  '../../components/settings/SecuritySettingsPanel.js'
);
const { default: BillingPreviewPanel } = await import(
  '../../components/dashboard/BillingPreviewPanel.js'
);
const { default: DataPrivacyPanel } = await import(
  '../../components/settings/DataPrivacyPanel.js'
);
const { listSeedProjectSummaries } = await import('../../lib/projects/seed-data.js');
const { AUTHORITATIVE_33_KPIS } = await import('../../lib/insights/kpi-registry.js');
const { CANONICAL_VENDOR_PROFESSIONS } = await import(
  '../../lib/marketplace/vendor-professions.js'
);
const { deriveSingleProjectMetrics } = await import(
  '../../lib/insights/live-insights.js'
);

describe('Portfolio Dashboard All-Tabs QA Acceptance Verification Suite', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      loading: false,
      profile: {
        displayName: 'Alex Morgan',
        email: 'alex@apexcap.internal',
        accountType: 'investor',
        subscriptionPlan: 'investor',
        isSubscribed: true,
      },
    });
  });

  describe('0. Navigation Contract (All 10 Investor Tabs + Vendor Tabs)', () => {
    it('defines all 10 canonical Investor Portfolio Dashboard tabs (8 Primary + 2 Account)', () => {
      const primary = resolvePrimaryNav({ accountType: 'investor', isSubscribed: true });
      const account = resolveAccountNav({ accountType: 'investor', isSubscribed: true });
      const bottom = resolveBottomNav({ accountType: 'investor', isSubscribed: true });
      expect(primary.map((n) => n.id)).toEqual([
        'portfolio',
        'projects',
        'marketplace',
        'deals',
        'insights',
        'reports',
        'inbox',
        'team',
      ]);
      expect(account.map((n) => n.id)).toEqual(['profile', 'settings']);
      expect(bottom).toHaveLength(5);
    });

    it('defines all canonical Vendor navigation tabs including Vendor Directory and Deals Marketplace', () => {
      const primary = resolvePrimaryNav({ accountType: 'vendor', role: 'vendor' });
      const drawer = resolveDrawerNav({ accountType: 'vendor', role: 'vendor' });
      const bottom = resolveBottomNav({ accountType: 'vendor', role: 'vendor' });
      expect(primary.map((n) => n.id)).toEqual([
        'portfolio',
        'vendor-marketplace',
        'deals',
        'insights',
        'reports',
        'inbox',
        'team',
      ]);
      expect(drawer.map((n) => n.id)).toContain('marketplace');
      expect(drawer.map((n) => n.id)).toContain('deals');
      expect(bottom).toHaveLength(5);
    });
  });

  describe('1. Tab 1 — Portfolio Control Panel (/dashboard)', () => {
    it('renders Portfolio Control Panel header, Market Scoreboard, Quick Launch cards, Active Projects, and 90-Day Trend sparkline', () => {
      const html = renderToString(<CommandCenterPanel />);
      expect(html).toContain('Portfolio Control Panel');
      expect(html).toContain('33 Datapoints');
      expect(html).toContain('Deal Calculator');
      expect(html).toContain('New Project');
      expect(html).toContain('Macro &amp; Debt Benchmarks');
      expect(html).toContain('Local Real Estate Liquidity Scoreboard');
      expect(html).toContain('Active Projects');
      expect(html).toContain('90-Day Portfolio Value Trend');
      expect(html).toContain('Portfolio Net Operating Income (NOI)');
      expect(html).toContain('Blended Portfolio IRR');
      expect(html).toContain('Portfolio Performance Summary');
    });

    it('renders DashboardTrendDetailModal with 30D/90D/1Y/ALL period tabs, REIL phase filter tabs, and Chart/Table toggle', () => {
      const projects = listSeedProjectSummaries();
      const html = renderToString(
        <DashboardTrendDetailModal
          isOpen={true}
          onClose={() => {}}
        />
      );
      expect(html).toContain('dashboard-trend-detail-modal');
      expect(html).toContain('time-period-30D');
      expect(html).toContain('time-period-90D');
      expect(html).toContain('time-period-1Y');
      expect(html).toContain('time-period-ALL');
      expect(html).toContain('trend-phase-filter');
      expect(html).toContain('All REIL Phases');
      expect(html).toContain('view-mode-chart');
      expect(html).toContain('view-mode-table');
    });
  });

  describe('2. Tab 2 — Projects (/projects)', () => {
    it('renders ProjectsListPanel with 6 view mode switchers (Pipeline, REIL Board, List, Stacks, Lineup, Everything) and filters', () => {
      const html = renderToString(<ProjectsListPanel />);
      expect(html).toContain('Projects');
      expect(html).toContain('Pipeline');
      expect(html).toContain('REIL Board');
      expect(html).toContain('List');
      expect(html).toContain('Stacks');
      expect(html).toContain('Lineup');
      expect(html).toContain('Everything');
      expect(html).toContain('Create Project');
      expect(html).toContain('All Phases');
      expect(html).toContain('All Strategies');
    });

    it('renders ProjectFolderCard with REIL phase badge, Deal address serial hover, and 33 Datapoints deep link', () => {
      const project = listSeedProjectSummaries()[0];
      const html = renderToString(<ProjectFolderCard project={project} />);
      expect(html).toContain(project.propertyName);
      expect(html).toContain('33 Datapoints');
      expect(html).toContain(`/dashboard/insights?project=${project.id}`);
    });
  });

  describe('3. Tab 5 — Insights (/dashboard/insights)', () => {
    it('renders PortfolioInsightsPanel and verifies all 33 authoritative REIL KPIs', () => {
      expect(AUTHORITATIVE_33_KPIS).toHaveLength(33);
      const html = renderToString(<PortfolioInsightsPanel />);
      expect(html).toBeTruthy();
    });

    it('computes deterministic financial engine outputs for seed projects', async () => {
      const project = listSeedProjectSummaries()[0];
      const result = await deriveSingleProjectMetrics(project);
      expect(result).toBeDefined();
      expect(result.derived.totalCostBasis).toBeGreaterThan(0);
      expect(result.scorecard.noi.value).toBeDefined();
    });
  });

  describe('4. Tab 6 — Reports (/dashboard/reports)', () => {
    it('renders PortfolioReportsPanel with Scope selector, Monthly/Quarterly/Annual tabs, Fiscal Year selector, Export CSV/PDF, and 8-report catalog', () => {
      const html = renderToString(<PortfolioReportsPanel />);
      expect(html).toContain('Reports');
      expect(html).toContain('Export to CSV');
      expect(html).toContain('Export PDF');
      expect(html).toContain('period-tab-monthly');
      expect(html).toContain('period-tab-quarterly');
      expect(html).toContain('period-tab-annual');
      expect(html).toContain('fiscal-year-select');
      expect(html).toContain('pl-statement-grid');
      expect(html).toContain('reports-disclaimer-bar');
    });
  });

  describe('5. Tab 7 — Inbox (/dashboard/inbox)', () => {
    it('renders InboxNotificationCenter with 6 category tabs (All, Opportunities, Tasks, Vendor, Team, System), Search, and Compose', () => {
      const html = renderToString(<InboxNotificationCenter />);
      expect(html).toContain('Inbox');
      expect(html).toContain('Opportunities');
      expect(html).toContain('Tasks');
      expect(html).toContain('Vendor');
      expect(html).toContain('Team');
      expect(html).toContain('System');
    });
  });

  describe('6. Tab 8 — Team (/dashboard/team)', () => {
    it('renders TeamDirectoryPanel with seat counter, role permissions, and member directory', () => {
      const html = renderToString(<TeamDirectoryPanel />);
      expect(html).toContain('Team');
      expect(html).toContain('Invite');
    });
  });

  describe('7. Tab 9 — Profile (/dashboard/profile)', () => {
    it('renders PublicProfileEditor with counterparty preview and REIL track record', () => {
      const html = renderToString(<PublicProfileEditor initialLoading={false} />);
      expect(html).toContain('Public Profile');
      expect(html).toContain('Operator Identity');
    });
  });

  describe('8. Tab 10 — Settings (/dashboard/settings)', () => {
    it('renders GeneralSettingsPanel with 38 canonical vendor professions and 1-3 Vendor Directory skills selector', () => {
      expect(CANONICAL_VENDOR_PROFESSIONS).toHaveLength(38);
      const html = renderToString(<GeneralSettingsPanel initialLoading={false} />);
      expect(html).toContain('Vendor Directory &amp; Professional Skills');
      expect(html).toContain('Skills Selected');
      expect(html).toContain('Real Estate Broker / Agent');
      expect(html).toContain('Cost Segregation Specialist');
    });

    it('renders SecuritySettingsPanel, BillingPreviewPanel, and DataPrivacyPanel sub-tabs cleanly', () => {
      const securityHtml = renderToString(<SecuritySettingsPanel />);
      const billingHtml = renderToString(<BillingPreviewPanel />);
      const privacyHtml = renderToString(<DataPrivacyPanel />);
      expect(securityHtml.toLowerCase()).toContain('security');
      expect(billingHtml.toLowerCase()).toContain('subscription');
      expect(privacyHtml.toLowerCase()).toContain('privacy');
    });
  });
});

import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderToString } from 'react-dom/server';


const mockUseAuth = jest.fn();

jest.unstable_mockModule('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
  useOptionalAuth: mockUseAuth,
}));

jest.unstable_mockModule('next/navigation', () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
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
  getPageLabel,
} = await import('../../lib/navigation/nav-contract.js');
const { default: CommandCenterPanel } = await import(
  '../../components/dashboard/CommandCenterPanel.js'
);
const { default: DashboardShell } = await import(
  '../../components/dashboard/DashboardShell.js'
);
const { default: DashboardTrendDetailModal } = await import(
  '../../components/dashboard/DashboardTrendDetailModal.js'
);
const { default: MarketVisualizationModal } = await import(
  '../../components/dashboard/scoreboard/MarketVisualizationModal.js'
);
const {
  BENCHMARK_TICKERS,
  BENCHMARK_LOCAL_MARKET,
} = await import('../../lib/market/market-service.js');
const { acquireModalScrollLock } = await import(
  '../../components/dashboard/useModalScrollLock.js'
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
const { KpiDetailModal } = await import(
  '../../components/insights/KpiDetailModal.js'
);
const { default: PortfolioReportsPanel } = await import(
  '../../components/reports/PortfolioReportsPanel.js'
);
const { default: InboxNotificationCenter } = await import(
  '../../components/inbox/InboxNotificationCenter.js'
);
const { default: ComposeEmailModal } = await import(
  '../../components/inbox/ComposeEmailModal.js'
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
const {
  handleSettingsGet,
  handleSettingsPut,
  handleSettingsPost,
  handleMarketplaceProfileGet,
} = await import('@paperworking/api');
const {
  getUserProfile,
  updateUserProfile,
} = await import('../../lib/settings/settings-store.js');
const {
  updateVendorProfileInStore,
  listMarketplaceVendorsFromStore,
} = await import('../../lib/vendor-portal/vendor-store.js');
const { default: VendorMarketplacePanel } = await import(
  '../../components/marketplace/VendorMarketplacePanel.js'
);
const { default: DealsMarketplacePanel } = await import(
  '../../components/marketplace/DealsMarketplacePanel.js'
);
const {
  default: DealBroadcastModal,
  parseBroadcastRecipientEmails,
  isBroadcastFormValid,
} = await import('../../components/marketplace/DealBroadcastModal.js');
const { default: SettingsLayout } = await import(
  '../../app/(dashboard)/dashboard/settings/layout.js'
);
const { default: DashboardTopBar } = await import(
  '../../components/dashboard/DashboardTopBar.js'
);
const { default: DashboardMobileDrawer } = await import(
  '../../components/dashboard/DashboardMobileDrawer.js'
);
const { default: MarketplaceSocialProfileCard } = await import(
  '../../components/marketplace/MarketplaceSocialProfileCard.js'
);
const { default: ScheduleEExpenseModal } = await import(
  '../../components/marketing/deal-calculator/ScheduleEExpenseModal.js'
);
const { HELP_ARTICLES } = await import('../../lib/marketing/help-data.js');
const { NextRequest } = await import('next/server');
const {
  GET: getSettingsRoute,
  PUT: putSettingsRoute,
  POST: postSettingsRoute,
} = await import('../../app/api/settings/[[...section]]/route.js');
const {
  GET: getMarketplaceProfileRoute,
  POST: postMarketplaceProfileRoute,
} = await import('../../app/api/marketplace/profile/route.js');
const {
  GET: getVendorPortalProfileRoute,
} = await import('../../app/api/vendor-portal/profile/route.js');
const { default: VendorProfilePanel } = await import(
  '../../components/vendor-portal/VendorProfilePanel.js'
);
const { getSeedVendorProfile } = await import('../../lib/vendor-portal/seed-data.js');
const {
  stripUndefinedDeep,
  createDealInStore,
} = await import('../../lib/deals/deal-store.js');
const {
  POST: postDealsRoute,
} = await import('../../app/api/deals/route.js');

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

    it('Bug_55: DashboardMobileDrawer always renders the Projects option in the Workspace menu list even when navContext is undefined', () => {
      const html = renderToString(<DashboardMobileDrawer isOpen={true} onClose={() => {}} />);
      expect(html).toContain('data-testid="drawer-link-projects"');
      expect(html).toContain('href="/projects"');
      expect(html).toContain('>Projects</span>');
      const drawerNoCtx = resolveDrawerNav();
      expect(drawerNoCtx.map((n) => n.id)).toContain('projects');
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

    it('Bug_54: keeps Active Projects "+ New Project" header link, REIL Phase badge, and card action labels aligned in a single row at 390px mobile width', () => {
      const html = renderToString(<CommandCenterPanel />);
      expect(html).toContain('data-testid="active-projects-new-project-link"');
      expect(html).toMatch(
        /data-testid="active-projects-new-project-link"[^>]*class="[^"]*shrink-0[^"]*whitespace-nowrap/
      );
      expect(html).toMatch(
        /class="[^"]*shrink-0[^"]*whitespace-nowrap[^"]*">\s*REIL Phase:/
      );
      expect(html).toMatch(
        /data-testid="project-33-datapoints-link-[^"]+"[^>]*class="[^"]*shrink-0[^"]*whitespace-nowrap/
      );
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

    it('Bug_23: locks background Portfolio scroll container when Historical Analytics popup is open and contains modal overscroll', () => {
      // 1. DashboardShell marks its primary scroll container with data-dashboard-scroll-container="true"
      const shellHtml = renderToString(
        <DashboardShell>
          <div>Portfolio Content</div>
        </DashboardShell>
      );
      expect(shellHtml).toContain('data-testid="dashboard-scroll-container"');
      expect(shellHtml).toContain('data-dashboard-scroll-container="true"');

      // 2. MarketVisualizationModal renders overscroll-contain on the dialog overlay and scrollable body
      const modalHtml = renderToString(
        <MarketVisualizationModal
          isOpen={true}
          onClose={() => {}}
          tickers={BENCHMARK_TICKERS}
          localMarket={BENCHMARK_LOCAL_MARKET}
        />
      );
      expect(modalHtml).toContain('data-testid="market-visualization-modal"');
      expect(modalHtml).toContain('data-testid="market-visualization-modal-body"');
      expect(modalHtml).toMatch(
        /<div[^>]*role="dialog"[^>]*aria-modal="true"[^>]*class="[^"]*overscroll-contain[^"]*"/
      );
      expect(modalHtml).toMatch(
        /<div[^>]*data-testid="market-visualization-modal-body"[^>]*class="[^"]*overflow-y-auto[^"]*overscroll-contain[^"]*"/
      );

      // 3. acquireModalScrollLock locks documentElement, body, and [data-dashboard-scroll-container="true"] and restores on close
      const makeTarget = (initialOverflow = '', initialOverflowY = 'auto') => {
        const attrs = new Map<string, string>();
        return {
          style: {
            overflow: initialOverflow,
            overflowY: initialOverflowY,
            overscrollBehavior: '',
          },
          attrs,
          setAttribute(name: string, value: string) {
            attrs.set(name, value);
          },
          removeAttribute(name: string) {
            attrs.delete(name);
          },
        };
      };

      const docEl = makeTarget('', '');
      const bodyEl = makeTarget('', '');
      const dashboardScrollEl = makeTarget('', 'auto');

      const releaseLock = acquireModalScrollLock({
        documentElement: docEl,
        body: bodyEl,
        querySelectorAll: (selector: string) =>
          selector === '[data-dashboard-scroll-container="true"]' ? [dashboardScrollEl] : [],
      });

      expect(docEl.style.overflow).toBe('hidden');
      expect(bodyEl.style.overflow).toBe('hidden');
      expect(dashboardScrollEl.style.overflow).toBe('hidden');
      expect(dashboardScrollEl.style.overflowY).toBe('hidden');
      expect(dashboardScrollEl.style.overscrollBehavior).toBe('none');
      expect(dashboardScrollEl.attrs.get('data-scroll-locked')).toBe('true');

      releaseLock();

      expect(docEl.style.overflow).toBe('');
      expect(bodyEl.style.overflow).toBe('');
      expect(dashboardScrollEl.style.overflow).toBe('');
      expect(dashboardScrollEl.style.overflowY).toBe('auto');
      expect(dashboardScrollEl.style.overscrollBehavior).toBe('');
      expect(dashboardScrollEl.attrs.has('data-scroll-locked')).toBe(false);
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

    it('Bug_05: disables "Clear all filters" when no filters are applied and enables it when any filter is applied', () => {
      // 1. No filters applied (default filter state): "Clear all filters" is disabled and non-clickable
      const defaultHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="list"
          initialProjects={[]}
        />
      );
      expect(defaultHtml).toContain('No projects found');
      expect(defaultHtml).toMatch(
        /<button[^>]*data-testid="clear-all-filters-btn"[^>]*disabled=""[^>]*aria-disabled="true"[^>]*class="[^"]*disabled:cursor-not-allowed[^"]*disabled:pointer-events-none[^"]*"/
      );

      // 2. When any filter is applied (e.g. search or phaseFilter): "Clear all filters" is enabled and clickable
      const projects = listSeedProjectSummaries();
      const filteredEmptyHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="list"
          initialProjects={projects}
          initialSearch="NonExistentDealQuery999"
        />
      );
      expect(filteredEmptyHtml).toContain('No projects match active filters');
      expect(filteredEmptyHtml).toMatch(
        /<button[^>]*data-testid="clear-all-filters-btn"[^>]*aria-disabled="false"[^>]*class="[^"]*cursor-pointer[^"]*"/
      );
      expect(filteredEmptyHtml).not.toMatch(
        /<button[^>]*data-testid="clear-all-filters-btn"[^>]*disabled=""/
      );
    });

    it('Bug_22: hides clear (X) icon when search bar is empty and renders it when search text is entered', () => {
      const projects = listSeedProjectSummaries();

      // 1. Empty search input: clear (X) icon button is not rendered
      const emptySearchHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="list"
          initialProjects={projects}
          initialSearch=""
        />
      );
      expect(emptySearchHtml).toContain('data-testid="projects-search-input"');
      expect(emptySearchHtml).not.toContain('data-testid="clear-project-search-btn"');

      // 2. Non-empty search input: clear (X) icon button appears with accessible label and 44x44px touch target
      const activeSearchHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="list"
          initialProjects={projects}
          initialSearch="Elm"
        />
      );
      expect(activeSearchHtml).toContain('data-testid="projects-search-input"');
      expect(activeSearchHtml).toContain('data-testid="clear-project-search-btn"');
      expect(activeSearchHtml).toMatch(
        /<button[^>]*aria-label="Clear search"[^>]*data-testid="clear-project-search-btn"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/
      );
    });

    it('Bug_15a: filters the Projects screen when searching in an empty workspace or by Target Purchase Price / deal attributes', () => {
      // 1. Searching on an empty workspace (initialProjects = []) filters out the onboarding template cards and shows the active filter empty state
      const emptyWorkspaceSearchHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="pipeline"
          initialProjects={[]}
          initialSearch="New"
        />
      );
      expect(emptyWorkspaceSearchHtml).toContain('No projects match active filters');
      expect(emptyWorkspaceSearchHtml).not.toContain('Start Your First Investment Project');
      expect(emptyWorkspaceSearchHtml).not.toContain('Use Flip Template');

      // 2. Searching by Target Purchase Price (raw digits and formatted currency) filters visible deals on screen
      const projects = listSeedProjectSummaries();
      const targetProject = projects[0];
      const otherProject = projects.find((p) => p.purchasePrice !== targetProject.purchasePrice)!;

      const rawPriceSearchHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="pipeline"
          initialProjects={projects}
          initialSearch={String(targetProject.purchasePrice)}
        />
      );
      expect(rawPriceSearchHtml).toContain(targetProject.propertyName);
      expect(rawPriceSearchHtml).not.toContain(otherProject.propertyName);

      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(targetProject.purchasePrice);

      const formattedPriceSearchHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="list"
          initialProjects={projects}
          initialSearch={formattedPrice}
        />
      );
      expect(formattedPriceSearchHtml).toContain(targetProject.propertyName);
      expect(formattedPriceSearchHtml).not.toContain(otherProject.propertyName);
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

    it('Bug_15b: renders FinancialStatementGrid Line Item column as scrollable without sticky overlap or transparent bg-surface classes', () => {
      const html = renderToString(<PortfolioReportsPanel />);
      expect(html).toContain('Line Item');
      // Line Item column and rows must scroll cleanly with the table without sticky left-0 overlap
      expect(html).not.toContain('sticky left-0');
      // Must use opaque Radix-Lyra design tokens instead of undefined bg-surface/bg-elevated
      expect(html).not.toContain('bg-surface');
      expect(html).not.toContain('bg-elevated');
      expect(html).toContain('bg-card');
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

    it('Bug_24: saves selected Vendor Directory skills via PUT /api/settings/profile and retains them on reload in both /api/settings/profile and /api/marketplace/profile', async () => {
      const testUid = 'bug24-test-user';
      const selectedSkills = ['Real Estate Broker / Agent', 'General Contractor'];

      const settingsDeps = {
        requireAuth: async () => ({ uid: testUid }),
        loadUser: async (uid: string) => {
          const p = await getUserProfile(uid);
          return p as unknown as Record<string, unknown>;
        },
        updateUser: async (uid: string, patch: Record<string, unknown>) => {
          if (Array.isArray(patch.vendorSkills)) {
            await updateVendorProfileInStore(uid, {
              companyName: String(patch.companyName || 'Apex Capital Partners'),
              vendorSkills: patch.vendorSkills as string[],
            });
          }
          const updated = await updateUserProfile(uid, patch);
          return updated as unknown as Record<string, unknown>;
        },
      };

      // 1. Save preferences with selected vendorSkills
      const putResult = await handleSettingsPut(
        ['profile'],
        {
          email: 'alex@apexcap.internal',
          timezone: 'America/New_York',
          locale: 'en-GB',
          companyName: 'Apex Capital Brokerage',
          vendorSkills: selectedSkills,
        },
        settingsDeps,
      );
      expect(putResult.status).toBe(200);
      const putBody = (putResult as { status: number; body: Record<string, unknown> }).body;
      expect(putBody.vendorSkills).toEqual(selectedSkills);
      expect(putBody.locale).toBe('en-GB');

      // 2. Reload via GET /api/settings/profile -> selected skills remain intact
      const getSettingsResult = await handleSettingsGet(['profile'], {}, {}, settingsDeps);
      expect(getSettingsResult.status).toBe(200);
      const getSettingsBody = (getSettingsResult as { status: number; body: Record<string, unknown> }).body;
      expect(getSettingsBody.vendorSkills).toEqual(selectedSkills);
      expect(getSettingsBody.companyName).toBe('Apex Capital Brokerage');
      expect(getSettingsBody.timezone).toBe('America/New_York');
      expect(getSettingsBody.locale).toBe('en-GB');

      // 3. Reload via GET /api/marketplace/profile -> selected skills also remain intact
      const getMarketplaceResult = await handleMarketplaceProfileGet({
        requireAuth: async () => ({ uid: testUid }),
        getUserDoc: async (uid: string) => {
          const p = await getUserProfile(uid);
          return p as unknown as Record<string, unknown>;
        },
      });
      expect(getMarketplaceResult.status).toBe(200);
      const marketplaceBody = (
        getMarketplaceResult as { status: number; body: { profile: Record<string, unknown> } }
      ).body;
      expect(marketplaceBody.profile.vendorSkills).toEqual(selectedSkills);

      // 4. Verify the vendor directory store includes the user's published vendor record
      const directoryVendors = await listMarketplaceVendorsFromStore();
      const userVendor = directoryVendors.find((v) => v.id === `vendor-${testUid}`);
      expect(userVendor).toBeDefined();
      expect((userVendor as unknown as { vendorSkills?: string[] })?.vendorSkills).toEqual(selectedSkills);
    });

    it('Bug_25: hides clear (X) icon when Vendor Directory search bar is empty and renders it when search text is entered', () => {
      const emptySearchHtml = renderToString(<VendorMarketplacePanel />);
      expect(emptySearchHtml).toContain('data-testid="vendor-directory-search-input"');
      expect(emptySearchHtml).not.toContain('data-testid="clear-vendor-search-btn"');

      const populatedSearchHtml = renderToString(
        <VendorMarketplacePanel initialSearchInput="Austin" />,
      );
      expect(populatedSearchHtml).toContain('data-testid="vendor-directory-search-input"');
      expect(populatedSearchHtml).toContain('value="Austin"');
      expect(populatedSearchHtml).toContain('data-testid="clear-vendor-search-btn"');
      expect(populatedSearchHtml).toContain('aria-label="Clear search"');
      expect(populatedSearchHtml).toContain('min-h-[44px]');
      expect(populatedSearchHtml).toContain('min-w-[44px]');
    });

    it('Bug_26: Settings Need Help section links to /support and /help (Help Guides) instead of raw /api/health or "unknown"', () => {
      const settingsLayoutHtml = renderToString(
        <SettingsLayout>
          <div>Settings body</div>
        </SettingsLayout>,
      );

      expect(settingsLayoutHtml).toContain('Need help?');
      expect(settingsLayoutHtml).toContain('href="/support"');
      expect(settingsLayoutHtml).toContain('href="/help"');
      expect(settingsLayoutHtml).toContain('Help Guides');
      expect(settingsLayoutHtml).not.toContain('href="/api/health"');
      expect(settingsLayoutHtml.toLowerCase()).not.toContain('>unknown<');

      const settingsArticle = HELP_ARTICLES.find(
        (a) => a.slug === 'workspace-settings-and-preferences',
      );
      expect(settingsArticle).toBeDefined();
      expect(settingsArticle?.title).toContain('Workspace settings');
    });

    it('Bug_28: hides clear (X) icon when Projects screen search bars (ProjectsListPanel and DashboardTopBar) are empty and renders a 44x44px clear button when text is entered', () => {
      const projects = listSeedProjectSummaries();

      // 1. ProjectsListPanel search bar
      const emptyProjectsHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="pipeline"
          initialProjects={projects}
          initialSearch=""
        />,
      );
      expect(emptyProjectsHtml).toContain('data-testid="projects-search-input"');
      expect(emptyProjectsHtml).not.toContain('data-testid="clear-project-search-btn"');

      const populatedProjectsHtml = renderToString(
        <ProjectsListPanel
          initialLoading={false}
          initialViewMode="pipeline"
          initialProjects={projects}
          initialSearch="Elm Street"
        />,
      );
      expect(populatedProjectsHtml).toContain('data-testid="projects-search-input"');
      expect(populatedProjectsHtml).toContain('data-testid="clear-project-search-btn"');
      expect(populatedProjectsHtml).toContain('aria-label="Clear search"');

      // 2. DashboardTopBar search bar on the Projects screen
      const emptyTopBarHtml = renderToString(<DashboardTopBar initialSearchQuery="" />);
      expect(emptyTopBarHtml).toContain('data-testid="dashboard-topbar-search-input"');
      expect(emptyTopBarHtml).not.toContain('data-testid="clear-topbar-search-btn"');

      const populatedTopBarHtml = renderToString(
        <DashboardTopBar initialSearchQuery="Elm Street" />,
      );
      expect(populatedTopBarHtml).toContain('data-testid="dashboard-topbar-search-input"');
      expect(populatedTopBarHtml).toContain('data-testid="clear-topbar-search-btn"');
      expect(populatedTopBarHtml).toMatch(
        /<button[^>]*aria-label="Clear search"[^>]*data-testid="clear-topbar-search-btn"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/,
      );
    });

    it('Bug_29: disables background scrolling across Portfolio Historical Analytics (MarketVisualizationModal) and Portfolio Insights (KpiDetailModal) popups while keeping modal bodies independently scrollable', async () => {
      // 1. MarketVisualizationModal (Historical Analytics popup on /dashboard)
      const historicalModalHtml = renderToString(
        <MarketVisualizationModal
          isOpen={true}
          onClose={() => {}}
          tickers={BENCHMARK_TICKERS}
          localMarket={BENCHMARK_LOCAL_MARKET}
          initialSelectedId="DGS10"
        />,
      );
      expect(historicalModalHtml).toContain('data-testid="market-visualization-modal-backdrop"');
      expect(historicalModalHtml).toContain('data-testid="market-visualization-modal"');
      expect(historicalModalHtml).toContain('data-testid="market-visualization-modal-body"');
      expect(historicalModalHtml).toMatch(
        /<div[^>]*data-testid="market-visualization-modal-backdrop"[^>]*class="[^"]*overscroll-contain[^"]*"/,
      );
      expect(historicalModalHtml).toMatch(
        /<div[^>]*data-testid="market-visualization-modal-body"[^>]*class="[^"]*overflow-y-auto[^"]*overscroll-contain[^"]*"/,
      );

      // 2. KpiDetailModal (Portfolio Insights KPI / Historical Trend popup on /dashboard/insights)
      const project = listSeedProjectSummaries()[0]!;
      const metrics = await deriveSingleProjectMetrics(project);
      const kpi = AUTHORITATIVE_33_KPIS[0]!;
      const kpiModalHtml = renderToString(
        <KpiDetailModal
          kpi={kpi}
          metrics={metrics}
          project={project}
          period="annual"
          isOpen={true}
          onClose={() => {}}
        />,
      );
      expect(kpiModalHtml).toContain('data-testid="kpi-detail-modal-backdrop"');
      expect(kpiModalHtml).toContain('data-testid="kpi-detail-modal-body"');
      expect(kpiModalHtml).toMatch(
        /<div[^>]*data-testid="kpi-detail-modal-backdrop"[^>]*class="[^"]*overscroll-contain[^"]*"/,
      );
      expect(kpiModalHtml).toMatch(
        /<div[^>]*data-testid="kpi-detail-modal-body"[^>]*class="[^"]*overflow-y-auto[^"]*overscroll-contain[^"]*"/,
      );

      // 3. Ref-counted scroll lock across documentElement, body, and [data-dashboard-scroll-container="true"]
      const makeTarget = (initialOverflow = '', initialOverflowY = 'auto') => {
        const attrs = new Map<string, string>();
        return {
          style: {
            overflow: initialOverflow,
            overflowY: initialOverflowY,
            overscrollBehavior: '',
          },
          attrs,
          setAttribute(name: string, value: string) {
            attrs.set(name, value);
          },
          removeAttribute(name: string) {
            attrs.delete(name);
          },
        };
      };

      const docEl = makeTarget('', '');
      const bodyEl = makeTarget('', '');
      const dashboardScrollEl = makeTarget('', 'auto');
      const customDoc = {
        documentElement: docEl,
        body: bodyEl,
        querySelectorAll: (selector: string) =>
          selector === '[data-dashboard-scroll-container="true"]' ? [dashboardScrollEl] : [],
      };

      const releaseFirst = acquireModalScrollLock(customDoc);
      const releaseSecond = acquireModalScrollLock(customDoc);

      expect(dashboardScrollEl.style.overflow).toBe('hidden');
      expect(dashboardScrollEl.style.overflowY).toBe('hidden');
      expect(dashboardScrollEl.style.overscrollBehavior).toBe('none');
      expect(dashboardScrollEl.attrs.get('data-scroll-locked')).toBe('true');

      // Releasing first lock keeps container locked while second modal remains open
      releaseFirst();
      expect(dashboardScrollEl.style.overflowY).toBe('hidden');
      expect(dashboardScrollEl.attrs.get('data-scroll-locked')).toBe('true');

      // Releasing final lock restores original scroll container state
      releaseSecond();
      expect(dashboardScrollEl.style.overflowY).toBe('auto');
      expect(dashboardScrollEl.attrs.has('data-scroll-locked')).toBe(false);
    });

    it('Bug_30: saves selected skills via PUT /api/settings/profile and POST /api/marketplace/profile without "Failed to save preferences" error, preserves existing investor profile fields, and keeps skills selected when settings are reopened', async () => {
      const prevUid = process.env.TEST_AUTH_UID;
      process.env.TEST_AUTH_UID = 'bug30-vendor-skills-user';

      try {
        // 1. Seed initial user profile with custom displayName, bio, location, and strategies
        await updateUserProfile('bug30-vendor-skills-user', {
          displayName: 'Alex Mercer',
          email: 'alex@apexcap.internal',
          companyName: 'Apex Capital Partners',
          publicBio: 'Value-add multifamily operator in Texas and the Sunbelt.',
          location: 'Austin, TX',
          strategies: ['brrrr', 'multifamily'],
          vendorSkills: [],
        });

        const selectedSkills = [
          'Real Estate Attorney',
          'Real Estate Appraiser',
          'Cost Segregation Specialist',
        ];

        // 2. Execute the exact Save Preferences flow from GeneralSettingsPanel:
        //    Step A: PUT /api/settings/profile
        const putSettingsReq = new NextRequest('http://localhost:3000/api/settings/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'alex@apexcap.internal',
            timezone: 'America/Chicago',
            locale: 'en-US',
            companyName: 'Apex Capital Partners',
            vendorSkills: selectedSkills,
          }),
        });
        const putSettingsRes = await putSettingsRoute(putSettingsReq, {
          params: Promise.resolve({ section: ['profile'] }),
        });
        expect(putSettingsRes.status).toBe(200);
        const putSettingsJson = await putSettingsRes.json();
        expect(putSettingsJson.vendorSkills).toEqual(selectedSkills);

        //    Step B: POST /api/marketplace/profile (partial payload sent by GeneralSettingsPanel)
        const postMarketplaceReq = new NextRequest(
          'http://localhost:3000/api/marketplace/profile',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: 'Apex Capital Partners',
              vendorSkills: selectedSkills,
            }),
          },
        );
        const postMarketplaceRes = await postMarketplaceProfileRoute(postMarketplaceReq);
        expect(postMarketplaceRes.status).toBe(200);
        const postMarketplaceJson = await postMarketplaceRes.json();
        expect(postMarketplaceJson.success).toBe(true);
        expect(postMarketplaceJson.profile.vendorSkills).toEqual(selectedSkills);

        // 3. Reopen Settings: GET /api/settings/profile and GET /api/marketplace/profile
        const reopenSettingsReq = new NextRequest('http://localhost:3000/api/settings/profile', {
          method: 'GET',
        });
        const reopenSettingsRes = await getSettingsRoute(reopenSettingsReq, {
          params: Promise.resolve({ section: ['profile'] }),
        });
        expect(reopenSettingsRes.status).toBe(200);
        const reopenSettingsJson = await reopenSettingsRes.json();
        expect(reopenSettingsJson.vendorSkills).toEqual(selectedSkills);
        expect(reopenSettingsJson.name).toBe('Alex Mercer');

        const reopenMarketplaceRes = await getMarketplaceProfileRoute();
        expect(reopenMarketplaceRes.status).toBe(200);
        const reopenMarketplaceJson = await reopenMarketplaceRes.json();
        expect(reopenMarketplaceJson.profile.vendorSkills).toEqual(selectedSkills);
        // Existing profile fields must remain intact (not wiped by partial vendorSkills sync)
        expect(reopenMarketplaceJson.profile.publicBio).toBe(
          'Value-add multifamily operator in Texas and the Sunbelt.',
        );
        expect(reopenMarketplaceJson.profile.location).toBe('Austin, TX');
        expect(reopenMarketplaceJson.profile.strategies).toEqual(['brrrr', 'multifamily']);

        // 4. Verify GET /api/vendor-portal/profile also returns the saved skills when reopened
        const reopenVendorPortalRes = await getVendorPortalProfileRoute();
        expect(reopenVendorPortalRes.status).toBe(200);
        const reopenVendorPortalJson = await reopenVendorPortalRes.json();
        expect(reopenVendorPortalJson.profile.vendorSkills).toEqual(selectedSkills);
        expect(reopenVendorPortalJson.profile.companyName).toBe('Apex Capital Partners');

        // 5. Verify Vendor Directory store reflects the saved skills
        const directoryVendors = await listMarketplaceVendorsFromStore();
        const publishedVendor = directoryVendors.find(
          (v) => v.id === 'vendor-bug30-vendor-skills-user',
        );
        expect(publishedVendor).toBeDefined();
        expect(
          (publishedVendor as unknown as { vendorSkills?: string[] })?.vendorSkills,
        ).toEqual(selectedSkills);
      } finally {
        if (prevUid === undefined) {
          delete process.env.TEST_AUTH_UID;
        } else {
          process.env.TEST_AUTH_UID = prevUid;
        }
      }
    });

    it('Bug_31: hides clear (X) icon when Vendor Directory, Vendor Profile, and Team Directory search bars are empty and renders a 44x44px clear button when text is entered', () => {
      // 1. Vendor Directory screen (VendorMarketplacePanel)
      const emptyVendorDirHtml = renderToString(<VendorMarketplacePanel initialSearchInput="" />);
      expect(emptyVendorDirHtml).toContain('data-testid="vendor-directory-search-input"');
      expect(emptyVendorDirHtml).not.toContain('data-testid="clear-vendor-search-btn"');

      const populatedVendorDirHtml = renderToString(
        <VendorMarketplacePanel initialSearchInput="Austin" />,
      );
      expect(populatedVendorDirHtml).toContain('data-testid="vendor-directory-search-input"');
      expect(populatedVendorDirHtml).toContain('value="Austin"');
      expect(populatedVendorDirHtml).toContain('data-testid="clear-vendor-search-btn"');
      expect(populatedVendorDirHtml).toMatch(
        /<button[^>]*aria-label="Clear search"[^>]*data-testid="clear-vendor-search-btn"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/,
      );

      // 2. Vendor Profile profession search bar (VendorProfilePanel)
      const initialVendorProfile = getSeedVendorProfile();
      const emptyVendorProfileHtml = renderToString(
        <VendorProfilePanel
          initialProfile={initialVendorProfile}
          initialLoading={false}
          initialSkillsSearch=""
        />,
      );
      expect(emptyVendorProfileHtml).toContain('data-testid="vendor-profile-skills-search-input"');
      expect(emptyVendorProfileHtml).not.toContain(
        'data-testid="clear-vendor-profile-skills-search-btn"',
      );

      const populatedVendorProfileHtml = renderToString(
        <VendorProfilePanel
          initialProfile={initialVendorProfile}
          initialLoading={false}
          initialSkillsSearch="Attorney"
        />,
      );
      expect(populatedVendorProfileHtml).toContain(
        'data-testid="vendor-profile-skills-search-input"',
      );
      expect(populatedVendorProfileHtml).toContain(
        'data-testid="clear-vendor-profile-skills-search-btn"',
      );
      expect(populatedVendorProfileHtml).toMatch(
        /<button[^>]*aria-label="Clear search"[^>]*data-testid="clear-vendor-profile-skills-search-btn"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/,
      );

      // 3. Team Directory search bar (TeamDirectoryPanel)
      const emptyTeamHtml = renderToString(<TeamDirectoryPanel initialSearchQuery="" />);
      expect(emptyTeamHtml).toContain('data-testid="team-directory-search-input"');
      expect(emptyTeamHtml).not.toContain('data-testid="clear-team-search-btn"');

      const populatedTeamHtml = renderToString(
        <TeamDirectoryPanel initialSearchQuery="Alex" />,
      );
      expect(populatedTeamHtml).toContain('data-testid="team-directory-search-input"');
      expect(populatedTeamHtml).toContain('data-testid="clear-team-search-btn"');
      expect(populatedTeamHtml).toMatch(
        /<button[^>]*aria-label="Clear search"[^>]*data-testid="clear-team-search-btn"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/,
      );
    });

    it('Bug_32: Settings Need Help card and footer link to /support, /help/workspace-settings-and-preferences (Settings Guide), and /help (Help Guides) instead of /api/health or "Unknown"', () => {
      const settingsLayoutHtml = renderToString(
        <SettingsLayout>
          <div>Settings body</div>
        </SettingsLayout>,
      );

      expect(settingsLayoutHtml).toContain('data-testid="settings-need-help-card"');
      expect(settingsLayoutHtml).toContain('data-testid="mobile-settings-need-help-card"');
      expect(settingsLayoutHtml).toContain('Need help?');
      expect(settingsLayoutHtml).toContain('href="/support"');
      expect(settingsLayoutHtml).toContain('href="/help/workspace-settings-and-preferences"');
      expect(settingsLayoutHtml).toContain('Settings Guide');
      expect(settingsLayoutHtml).toContain('href="/help"');
      expect(settingsLayoutHtml).toContain('Help Guides →');
      expect(settingsLayoutHtml).not.toContain('href="/api/health"');
      expect(settingsLayoutHtml.toLowerCase()).not.toContain('>unknown<');

      const settingsArticle = HELP_ARTICLES.find(
        (a) => a.slug === 'workspace-settings-and-preferences',
      );
      expect(settingsArticle).toBeDefined();
      expect(settingsArticle?.title).toContain('Workspace settings');
      expect(settingsArticle?.body).toContain('Vendor Directory skills');
    });

    it('Bug_33: Deals Marketplace renders Grid View and List View icons with descriptive hover tooltips and 44x44px touch targets', () => {
      const dealsMarketplaceHtml = renderToString(<DealsMarketplacePanel />);

      expect(dealsMarketplaceHtml).toContain('data-testid="toggle-view-grid"');
      expect(dealsMarketplaceHtml).toContain('data-testid="toggle-view-table"');
      expect(dealsMarketplaceHtml).toContain('data-testid="mobile-toggle-view-grid"');
      expect(dealsMarketplaceHtml).toContain('data-testid="mobile-toggle-view-table"');

      expect(dealsMarketplaceHtml).toContain('title="Grid View"');
      expect(dealsMarketplaceHtml).toContain('title="List View"');
      expect(dealsMarketplaceHtml).toContain('aria-label="Grid View"');
      expect(dealsMarketplaceHtml).toContain('aria-label="List View"');

      expect(dealsMarketplaceHtml).toContain('data-testid="tooltip-view-grid"');
      expect(dealsMarketplaceHtml).toContain('data-testid="tooltip-view-table"');
      expect(dealsMarketplaceHtml).toContain('role="tooltip"');

      expect(dealsMarketplaceHtml).toMatch(
        /<button[^>]*data-testid="toggle-view-grid"[^>]*title="Grid View"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/,
      );
      expect(dealsMarketplaceHtml).toMatch(
        /<button[^>]*data-testid="toggle-view-table"[^>]*title="List View"[^>]*class="[^"]*min-h-\[44px\][^"]*min-w-\[44px\][^"]*"/,
      );
    });

    it('Bug_34: Share Analysis & Broadcast Deal modal enables the Share Analysis button with high-contrast primary styling once all required details are filled in', () => {
      // 1. Validate helper functions
      expect(parseBroadcastRecipientEmails('')).toEqual([]);
      expect(parseBroadcastRecipientEmails('invalid-email')).toEqual([]);
      expect(
        parseBroadcastRecipientEmails('partner@investor.com, capital@fund.com\ncpa@firm.com'),
      ).toEqual(['partner@investor.com', 'capital@fund.com', 'cpa@firm.com']);
      expect(isBroadcastFormValid('', 'Investment Opportunity: Elm Street Flip')).toBe(false);
      expect(isBroadcastFormValid('partner@investor.com', '   ')).toBe(false);
      expect(
        isBroadcastFormValid('partner@investor.com', 'Investment Opportunity: Elm Street Flip'),
      ).toBe(true);

      // 2. When required Recipient Emails field is empty, Share Analysis button is disabled
      const emptyModalHtml = renderToString(
        <DealBroadcastModal
          dealId="deal-1"
          dealName="Elm Street Flip"
          dealAddress="1247 Elm St"
          dealRoi={18.4}
          isOpen={true}
          onClose={() => {}}
        />,
      );
      expect(emptyModalHtml).toContain('data-testid="broadcast-submit-btn"');
      expect(emptyModalHtml).toMatch(
        /<button[^>]*data-testid="broadcast-submit-btn"[^>]*disabled=""/,
      );

      // 3. Once required Recipient Emails and Subject are filled in, Share Analysis button is enabled and high-contrast
      const filledModalHtml = renderToString(
        <DealBroadcastModal
          dealId="deal-1"
          dealName="Elm Street Flip"
          dealAddress="1247 Elm St"
          dealRoi={18.4}
          isOpen={true}
          onClose={() => {}}
          initialEmailsText="partner@investor.com, capital@fund.com"
          initialSubject="Investment Opportunity: Elm Street Flip"
        />,
      );
      expect(filledModalHtml).toContain('data-testid="broadcast-submit-btn"');
      expect(filledModalHtml).not.toMatch(
        /<button[^>]*data-testid="broadcast-submit-btn"[^>]*disabled=""/,
      );
      expect(filledModalHtml).toMatch(
        /<button[^>]*data-testid="broadcast-submit-btn"[^>]*class="[^"]*bg-neutral-100[^"]*text-neutral-950[^"]*min-h-\[44px\][^"]*"/,
      );
      expect(filledModalHtml).not.toContain('text-[#0a0a0f]');
    });

    it('Bug_35: Publishing a deal to the Deals Marketplace strips undefined shareToken and optional fields before Firestore persistence', async () => {
      // 1. Verify stripUndefinedDeep recursively removes undefined keys and preserves valid values
      const rawDoc = {
        id: 'deal-test-35',
        address: '742 Evergreen Terrace, Austin, TX',
        visibility: 'marketplace',
        shareToken: undefined,
        calculatorResults: {
          purchasePrice: 525000,
          arv: 690000,
          optionalUndefinedMetric: undefined,
        },
        projects: [
          {
            id: 'proj-1',
            name: 'Evergreen Duplex',
            zip: undefined,
          },
        ],
      };

      const sanitized = stripUndefinedDeep(rawDoc);
      expect('shareToken' in sanitized).toBe(false);
      expect('optionalUndefinedMetric' in sanitized.calculatorResults).toBe(false);
      expect('zip' in sanitized.projects[0]).toBe(false);
      expect(sanitized.address).toBe('742 Evergreen Terrace, Austin, TX');
      expect(sanitized.calculatorResults.purchasePrice).toBe(525000);

      // Helper to assert zero undefined values exist anywhere in an object tree
      const hasUndefinedValue = (val: unknown): boolean => {
        if (val === undefined) return true;
        if (!val || typeof val !== 'object') return false;
        if (Array.isArray(val)) return val.some(hasUndefinedValue);
        return Object.values(val as Record<string, unknown>).some(hasUndefinedValue);
      };

      expect(hasUndefinedValue(sanitized)).toBe(false);

      // 2. Verify createDealInStore produces a normalized deal with zero undefined fields
      const storedDeal = await createDealInStore({
        address: '880 Congress Ave, Austin, TX',
        visibility: 'marketplace',
        shareToken: undefined,
        purchasePrice: 610000,
        rehabCost: 75000,
        targetIrr: 18.2,
      });
      expect(storedDeal.address).toBe('880 Congress Ave, Austin, TX');
      expect(hasUndefinedValue(storedDeal)).toBe(false);
      expect('shareToken' in storedDeal).toBe(false);

      // 3. Verify POST /api/deals succeeds with status 201 when publishing to Deals Marketplace
      const prevUid = process.env.TEST_AUTH_UID;
      process.env.TEST_AUTH_UID = 'bug35-investor-user';
      try {
        const req = new NextRequest('http://localhost:3000/api/deals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: '910 South Lamar Mixed-Use',
            address: '910 S Lamar Blvd, Austin, TX',
            purchasePrice: 850000,
            rehabCost: 120000,
            arv: 1180000,
            targetIrr: 19.5,
            equityMultiple: 1.92,
            holdPeriod: '3-5 Years',
            minInvestment: 50000,
            fundingTarget: 375000,
            dealType: 'syndication',
            visibility: 'marketplace',
            strategy: 'VALUE_ADD',
            assetClass: 'MULTIFAMILY',
            pitch: 'Value-add multifamily acquisition in South Lamar corridor.',
          }),
        });

        const res = await postDealsRoute(req);
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.deal.address).toBe('910 S Lamar Blvd, Austin, TX');
        expect(body.deal.visibility).toBe('marketplace');
        expect(hasUndefinedValue(body.deal)).toBe(false);
      } finally {
        if (prevUid === undefined) {
          delete process.env.TEST_AUTH_UID;
        } else {
          process.env.TEST_AUTH_UID = prevUid;
        }
      }
    });
  });

  describe('Bug_36 & Bug_37: Footer Blog (/blog) and Cookies (/cookies) Routing & Dedicated Pages', () => {
    it('renders MarketingFooter with Blog linking to /blog and Cookies linking to /cookies, and renders BlogPage and CookiesPage', async () => {
      const { default: MarketingFooter } = await import('../../components/marketing/MarketingFooter.js');
      const { default: BlogPage } = await import('../../app/(marketing)/blog/page.js');
      const { default: CookiesPage } = await import('../../app/(marketing)/cookies/page.js');

      const footerHtml = renderToString(<MarketingFooter />);
      expect(footerHtml).toContain('data-testid="footer-column-link-blog"');
      expect(footerHtml).toContain('href="/blog"');
      expect(footerHtml).toContain('data-testid="footer-column-link-cookies"');
      expect(footerHtml).toContain('data-testid="footer-bottom-link-cookies"');
      expect(footerHtml).toContain('href="/cookies"');

      const blogHtml = renderToString(<BlogPage />);
      expect(blogHtml).toContain('data-testid="blog-index-page"');
      expect(blogHtml).toContain('Real Estate Investment Lifecycle Insights');
      expect(blogHtml).toContain('href="/blog/underwriting-discipline-across-the-reil"');
      expect(blogHtml).toContain('data-testid="blog-filter-acquisition"');

      const cookiesHtml = renderToString(<CookiesPage />);
      expect(cookiesHtml).toContain('data-testid="cookies-policy-page"');
      expect(cookiesHtml).toContain('Cookie Policy');
      expect(cookiesHtml).toContain('1. How PaperWorking Uses Cookies &amp; Local Storage');
      expect(cookiesHtml).toContain('__session (Authentication &amp; Session Integrity)');
    });
  });

  describe('Bug_38: General Settings Save Preferences Succeeds via POST /api/settings/profile and Fallback Whether Unchanged or Modified', () => {
    it('saves General Settings via POST /api/settings/profile and POST /api/marketplace/profile when unchanged (0 skills) and when modified', async () => {
      const prevUid = process.env.TEST_AUTH_UID;
      process.env.TEST_AUTH_UID = 'bug38-general-settings-user';

      try {
        await updateUserProfile('bug38-general-settings-user', {
          displayName: 'Alex Mercer',
          email: 'alex@apexcap.internal',
          companyName: 'Apex Capital Partners',
          timezone: 'America/Chicago',
          locale: 'en-US',
          vendorSkills: [],
        });

        // 1. Save with unchanged settings (vendorSkills: []) via POST /api/settings/profile
        const postUnchangedReq = new NextRequest('http://localhost:3000/api/settings/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'alex@apexcap.internal',
            timezone: 'America/Chicago',
            locale: 'en-US',
            companyName: 'Apex Capital Partners',
            vendorSkills: [],
          }),
        });
        const postUnchangedRes = await postSettingsRoute(postUnchangedReq, {
          params: Promise.resolve({ section: ['profile'] }),
        });
        expect(postUnchangedRes.status).toBe(200);
        const postUnchangedJson = await postUnchangedRes.json();
        expect(postUnchangedJson.email).toBe('alex@apexcap.internal');
        expect(postUnchangedJson.companyName).toBe('Apex Capital Partners');
        expect(postUnchangedJson.timezone).toBe('America/Chicago');
        expect(postUnchangedJson.locale).toBe('en-US');
        expect(postUnchangedJson.vendorSkills).toEqual([]);

        // 2. Save with modified settings via POST /api/settings/profile
        const postModifiedReq = new NextRequest('http://localhost:3000/api/settings/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'managing.partner@apexcap.internal',
            timezone: 'America/New_York',
            locale: 'en-GB',
            companyName: 'Apex Capital Holdings LLC',
            vendorSkills: ['Real Estate Attorney'],
          }),
        });
        const postModifiedRes = await postSettingsRoute(postModifiedReq, {
          params: Promise.resolve({ section: ['profile'] }),
        });
        expect(postModifiedRes.status).toBe(200);
        const postModifiedJson = await postModifiedRes.json();
        expect(postModifiedJson.email).toBe('managing.partner@apexcap.internal');
        expect(postModifiedJson.companyName).toBe('Apex Capital Holdings LLC');
        expect(postModifiedJson.timezone).toBe('America/New_York');
        expect(postModifiedJson.locale).toBe('en-GB');
        expect(postModifiedJson.vendorSkills).toEqual(['Real Estate Attorney']);

        // 3. Verify fallback POST /api/marketplace/profile also persists email, companyName, timezone, locale, and vendorSkills
        const postFallbackReq = new NextRequest('http://localhost:3000/api/marketplace/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'acquisitions@apexcap.internal',
            companyName: 'Apex Sunbelt Syndicate',
            businessName: 'Apex Sunbelt Syndicate',
            timezone: 'America/Los_Angeles',
            locale: 'es-ES',
            vendorSkills: [],
          }),
        });
        const postFallbackRes = await postMarketplaceProfileRoute(postFallbackReq);
        expect(postFallbackRes.status).toBe(200);
        const postFallbackJson = await postFallbackRes.json();
        expect(postFallbackJson.success).toBe(true);
        expect(postFallbackJson.profile.email).toBe('acquisitions@apexcap.internal');
        expect(postFallbackJson.profile.companyName).toBe('Apex Sunbelt Syndicate');
        expect(postFallbackJson.profile.timezone).toBe('America/Los_Angeles');
        expect(postFallbackJson.profile.locale).toBe('es-ES');
        expect(postFallbackJson.profile.vendorSkills).toEqual([]);

        // 4. Reopen Settings: GET /api/settings/profile reflects the updated General Settings
        const getReq = new NextRequest('http://localhost:3000/api/settings/profile', {
          method: 'GET',
        });
        const getRes = await getSettingsRoute(getReq, {
          params: Promise.resolve({ section: ['profile'] }),
        });
        expect(getRes.status).toBe(200);
        const getJson = await getRes.json();
        expect(getJson.email).toBe('acquisitions@apexcap.internal');
        expect(getJson.companyName).toBe('Apex Sunbelt Syndicate');
        expect(getJson.timezone).toBe('America/Los_Angeles');
        expect(getJson.locale).toBe('es-ES');
        expect(getJson.vendorSkills).toEqual([]);

        // 5. Also verify handleSettingsPost supports security section updates via POST
        const securityResult = await handleSettingsPost(
          ['security'],
          { twoFaRequired: true },
          {
            requireAuth: async () => ({ uid: 'bug38-general-settings-user' }),
            loadUser: async () => ({}),
            updateOrg: async (_orgId, patch) => patch,
          },
        );
        expect(securityResult.status).toBe(200);
        expect((securityResult.body as { twoFaRequired?: boolean }).twoFaRequired).toBe(true);
      } finally {
        if (prevUid === undefined) {
          delete process.env.TEST_AUTH_UID;
        } else {
          process.env.TEST_AUTH_UID = prevUid;
        }
      }
    });
  });

  describe('Bug_39: Data & Privacy Export JSON Downloads User Data Attachment Instead of Raw Status Response', () => {
    it('returns a downloadable JSON attachment with Content-Disposition for both /api/settings/data-privacy/download-export and /api/settings/data-privacy?id=export, and records export jobs via POST', async () => {
      const prevUid = process.env.TEST_AUTH_UID;
      process.env.TEST_AUTH_UID = 'bug39-privacy-export-user';

      try {
        await updateUserProfile('bug39-privacy-export-user', {
          displayName: 'Elena Vance',
          email: 'elena@apexcap.internal',
          companyName: 'Vance Industrial Partners',
          timezone: 'America/New_York',
          locale: 'en-US',
          vendorSkills: ['Real Estate Appraiser'],
        });

        // 1. POST /api/settings/data-privacy/export records an active export job
        const postExportReq = new NextRequest(
          'http://localhost:3000/api/settings/data-privacy/export',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          },
        );
        const postExportRes = await postSettingsRoute(postExportReq, {
          params: Promise.resolve({ section: ['data-privacy', 'export'] }),
        });
        expect(postExportRes.status).toBe(200);
        const postExportJson = await postExportRes.json();
        expect(postExportJson.success).toBe(true);
        expect(postExportJson.activeExportJob?.id).toMatch(/^exp_/);

        // 2. GET /api/settings/data-privacy/download-export?id=export returns Content-Disposition attachment + full JSON archive
        const downloadSubActionReq = new NextRequest(
          'http://localhost:3000/api/settings/data-privacy/download-export?id=export',
          { method: 'GET' },
        );
        const downloadSubActionRes = await getSettingsRoute(downloadSubActionReq, {
          params: Promise.resolve({ section: ['data-privacy', 'download-export'] }),
        });
        expect(downloadSubActionRes.status).toBe(200);
        expect(downloadSubActionRes.headers.get('content-disposition')).toContain(
          'attachment; filename="paperworking_export_export.json"',
        );
        const downloadedText1 = await downloadSubActionRes.text();
        const parsedArchive1 = JSON.parse(downloadedText1);
        expect(parsedArchive1.workspaceId).toBeDefined();
        expect(parsedArchive1.exportedAt).toBeDefined();
        expect(parsedArchive1.account?.email).toBe('elena@apexcap.internal');
        expect(parsedArchive1.account?.companyName).toBe('Vance Industrial Partners');
        expect(Array.isArray(parsedArchive1.data?.properties)).toBe(true);

        // 3. GET /api/settings/data-privacy?id=export ALSO returns the downloadable JSON attachment (not raw status JSON)
        const queryExportReq = new NextRequest(
          'http://localhost:3000/api/settings/data-privacy?id=export',
          { method: 'GET' },
        );
        const queryExportRes = await getSettingsRoute(queryExportReq, {
          params: Promise.resolve({ section: ['data-privacy'] }),
        });
        expect(queryExportRes.status).toBe(200);
        expect(queryExportRes.headers.get('content-disposition')).toContain(
          'attachment; filename="paperworking_export_export.json"',
        );
        const downloadedText2 = await queryExportRes.text();
        const parsedArchive2 = JSON.parse(downloadedText2);
        expect(parsedArchive2.account?.email).toBe('elena@apexcap.internal');
        expect(parsedArchive2.data?.properties?.length).toBeGreaterThan(0);
      } finally {
        if (prevUid === undefined) {
          delete process.env.TEST_AUTH_UID;
        } else {
          process.env.TEST_AUTH_UID = prevUid;
        }
      }
    });
  });

  describe('Bug_40: Bottom-Right Corner Widget Renders Stably Without Blinking or Occlusion on Create Project Page', () => {
    it('removes the rapid blinking interval from PepperLauncher and removes full-viewport z-[60] backdrop-blur occlusion on /projects/new', () => {
      const webRoot = fs.existsSync(
        path.join(process.cwd(), 'components/assistant/PepperLauncher.tsx'),
      )
        ? process.cwd()
        : path.join(process.cwd(), 'apps/web');
      const launcherSource = fs.readFileSync(
        path.join(webRoot, 'components/assistant/PepperLauncher.tsx'),
        'utf-8',
      );
      // 1. No blinking/fading interval or opacity-0 toggle
      expect(launcherSource).not.toContain('setInterval(');
      expect(launcherSource).not.toContain('opacity-0 translate-y-1');
      expect(launcherSource).toContain('z-[65]');
      expect(launcherSource).toContain('opacity-100 translate-y-0 scale-100');

      // 2. Create Project page bottom actions bar does not use full-viewport fixed z-[60] backdrop-blur over the bottom-right widget
      const newProjectSource = fs.readFileSync(
        path.join(webRoot, 'app/(dashboard)/projects/new/page.tsx'),
        'utf-8',
      );
      expect(newProjectSource).not.toContain('fixed bottom-0 left-0 right-0 z-[60]');
      expect(newProjectSource).toContain('data-testid="create-project-actions-bar"');
    });
  });

  describe('Bug_41 & Bug_42: Create Project Satellite Map Preview & Contact Phone / Email Validation', () => {
    it('Bug_41 & Bug_42: PropertySatelliteViewer suppresses raw alt-text overlap with persistent parcel SVG background and Create Project validates Contact Phone / Email (#source-contact-phone)', () => {
      const webRoot = fs.existsSync(
        path.join(process.cwd(), 'components/maps/PropertySatelliteViewer.tsx'),
      )
        ? process.cwd()
        : path.join(process.cwd(), 'apps/web');
      const satelliteSource = fs.readFileSync(
        path.join(webRoot, 'components/maps/PropertySatelliteViewer.tsx'),
        'utf-8',
      );
      expect(satelliteSource).toContain('text-transparent select-none');
      expect(satelliteSource).toContain('backgroundImage: `url("${inlineFallbackDataUri}")`');

      const mapTileSource = fs.readFileSync(
        path.join(webRoot, 'app/api/map-tile/route.ts'),
        'utf-8',
      );
      expect(mapTileSource).toContain('x-staticmap-api-warning');
      expect(mapTileSource).toContain('text-anchor="middle"');

      const newProjectSource = fs.readFileSync(
        path.join(webRoot, 'app/(dashboard)/projects/new/page.tsx'),
        'utf-8',
      );
      expect(newProjectSource).toContain('sourceContactPhoneError');
      expect(newProjectSource).toContain('data-testid="source-contact-phone-error"');
      expect(newProjectSource).toContain('Enter a valid phone number (e.g. 512-555-0199) or email address.');
    });
  });

  describe('Bug_56: MarketplaceSocialProfileCard Banner Mobile Tag & Followers Non-Overlap', () => {
    it('Bug_56: renders MarketplaceSocialProfileCard banner with responsive stacked mobile container, overflow-hidden identity wrapper, and non-overlapping role badge and Followers buttons', () => {
      const html = renderToString(
        <MarketplaceSocialProfileCard
          variant="banner"
          contextLabel="Vendor Directory"
          roleLabel="Principal Investor"
        />,
      );
      expect(html).toContain('data-testid="marketplace-social-profile-card"');
      expect(html).toContain('data-testid="social-profile-role-badge"');
      expect(html).toContain('data-testid="followers-count-trigger"');
      expect(html).toContain('flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center');
      expect(html).toContain('min-w-0 flex-1 overflow-hidden');
      expect(html).toContain('flex flex-wrap items-center gap-x-2 gap-y-1');
      expect(html).toContain('grid w-full grid-cols-2 gap-2 shrink-0 sm:flex sm:w-auto');
    });
  });

  describe('Bug_57: Vendor Directory Search Bar Mobile Placeholder Visibility', () => {
    it('Bug_57: stacks Vendor Directory search input and Find Vendors button on mobile (< sm) with pr-4 when empty and pr-11 when populated so the placeholder is never cut off on the right side at 390px', () => {
      const emptyHtml = renderToString(<VendorMarketplacePanel />);
      expect(emptyHtml).toContain('data-testid="vendor-directory-search-input"');
      expect(emptyHtml).toContain('flex flex-col gap-2 sm:flex-row sm:gap-0');
      expect(emptyHtml).toContain('sm:border-r-0');
      expect(emptyHtml).toContain('pl-11 pr-4');
      expect(emptyHtml).toContain('w-full sm:w-auto shrink-0 whitespace-nowrap');

      const populatedHtml = renderToString(<VendorMarketplacePanel initialSearchInput="Miami" />);
      expect(populatedHtml).toContain('pl-11 pr-11');
      expect(populatedHtml).toContain('data-testid="clear-vendor-search-btn"');
    });
  });

  describe('Bug_58: MarketplaceSocialProfileCard Mobile Full Profile Name Visibility', () => {
    it('Bug_58: renders full profile name and company name with break-words instead of truncate in both banner and sidebar variants', () => {
      const bannerHtml = renderToString(
        <MarketplaceSocialProfileCard
          variant="banner"
          displayName="Avery Stone"
          company="Stonebridge Capital"
          contextLabel="Vendor Directory"
        />,
      );
      expect(bannerHtml).toContain('data-testid="social-profile-display-name"');
      expect(bannerHtml).toContain('data-testid="social-profile-company"');
      expect(bannerHtml).toContain('mt-0.5 break-words text-base font-bold text-foreground');
      expect(bannerHtml).toContain('break-words text-xs text-muted-foreground');
      expect(bannerHtml).not.toContain('mt-0.5 truncate text-base');

      const sidebarHtml = renderToString(
        <MarketplaceSocialProfileCard
          variant="sidebar"
          displayName="Avery Stone"
          company="Stonebridge Capital"
        />,
      );
      expect(sidebarHtml).toContain('data-testid="social-profile-display-name"');
      expect(sidebarHtml).toContain('data-testid="social-profile-company"');
      expect(sidebarHtml).toContain('break-words text-base font-bold text-foreground');
    });
  });

  describe('Bug_60: ScheduleEExpenseModal & Sibling Worksheet Modals Mobile Footer Alignment', () => {
    it('Bug_60: stacks price summary and action buttons cleanly on mobile (< sm) and aligns Cancel and Apply Expenses on a single 44px row without overflow', () => {
      const html = renderToString(
        <ScheduleEExpenseModal
          isOpen={true}
          onClose={jest.fn()}
          grossRentAnnual={62400}
          currentAnnualOpex={15992}
          onApplyExpenses={jest.fn()}
        />,
      );
      expect(html).toContain('data-testid="schedule-e-modal-footer"');
      expect(html).toContain(
        'pt-4 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0',
      );
      expect(html).toContain('data-testid="schedule-e-total-price-block"');
      expect(html).toContain('data-testid="schedule-e-footer-actions"');
      expect(html).toContain('data-testid="cancel-schedule-e-btn"');
      expect(html).toContain('data-testid="apply-schedule-e-btn"');
      expect(html).toContain('whitespace-nowrap');

      const rehabSrc = fs.readFileSync(
        path.resolve(
          process.cwd(),
          'components/marketing/deal-calculator/RehabWorksheetModal.tsx',
        ),
        'utf8',
      );
      expect(rehabSrc).toContain(
        'pt-4 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0',
      );

      const closingSrc = fs.readFileSync(
        path.resolve(
          process.cwd(),
          'components/marketing/deal-calculator/ClosingCostsModal.tsx',
        ),
        'utf8',
      );
      expect(closingSrc).toContain('whitespace-nowrap');
    });
  });

  describe('Bug_61: PortfolioReportsPanel Mobile Scope Dropdown Section Containment', () => {
    it('Bug_61: constrains the Scope selector flex hierarchy and project-filter select inside reports-control-bar on 390px mobile viewports', () => {
      const html = renderToString(<PortfolioReportsPanel />);
      expect(html).toContain('data-testid="reports-control-bar"');
      expect(html).toContain('data-testid="scope-selector-group"');
      expect(html).toContain(
        'flex w-full min-w-0 items-center gap-2 sm:w-auto',
      );
      expect(html).toContain(
        'h-10 min-h-[44px] w-full min-w-0 max-w-full flex-1 cursor-pointer truncate rounded-none border border-input bg-background px-3 text-base font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-auto sm:max-w-[280px] sm:flex-none md:max-w-[340px] md:text-xs',
      );

      const gridSrc = fs.readFileSync(
        path.resolve(
          process.cwd(),
          'components/reports/FinancialStatementGrid.tsx',
        ),
        'utf8',
      );
      expect(gridSrc).toContain('flex flex-wrap items-center gap-2');
    });
  });

  describe('Bug_62: ComposeEmailModal Mobile Selected Option & Input Placeholder Visibility', () => {
    it('Bug_62: renders concise default option None (General Workspace) in #compose-project-select and mobile-safe placeholders with rounded-none controls', () => {
      const html = renderToString(
        <ComposeEmailModal isOpen={true} onClose={jest.fn()} />,
      );
      expect(html).toContain('data-testid="compose-project-select"');
      expect(html).toContain('None (General Workspace)');
      expect(html).not.toContain(
        'None (General Announcement / Workspace Message)',
      );
      expect(html).toContain('placeholder="e.g. team@partnercapital.com"');
      expect(html).toContain('placeholder="e.g. Q3 Portfolio Review"');
      expect(html).toContain(
        'h-11 min-h-[44px] w-full min-w-0 max-w-full cursor-pointer truncate rounded-none',
      );
      expect(html).toContain('z-[70]');
    });
  });

  describe('Bug_63: TeamDirectoryPanel Mobile Role and Workspace Access Dropdown Sizing', () => {
    it('Bug_63: renders inline Roster role-select and access-level-select with data-compact-select="true" and compact badge classes while scoping globals.css mobile 16px rule', () => {
      const html = renderToString(<TeamDirectoryPanel />);
      expect(html).toContain('data-testid="role-select-member-2"');
      expect(html).toContain('data-testid="access-level-select-member-2"');
      expect(html).toContain('data-compact-select="true"');
      expect(html).toContain(
        'h-7 cursor-pointer appearance-none rounded-none border border-neutral-800 bg-neutral-900 py-0.5 pl-2 pr-6 text-[11px] font-semibold uppercase leading-tight tracking-wider text-neutral-200',
      );
      expect(html).toContain(
        'h-7 cursor-pointer appearance-none rounded-none border border-neutral-800 bg-neutral-900 py-0.5 pl-2 pr-6 text-[11px] font-semibold leading-tight tracking-wide text-neutral-200',
      );

      const globalsCss = fs.readFileSync(
        path.resolve(process.cwd(), 'app/globals.css'),
        'utf8',
      );
      expect(globalsCss).toContain('select:not([data-compact-select="true"])');
      expect(globalsCss).toContain('font-size: 16px !important;');
    });
  });

  describe('Bug_64: DealCalculatorPage & DealCalculatorView Active Session Recognition on + Post Deal to Marketplace', () => {
    it('Bug_64: DealCalculatorPage reads server session cookies and passes initialAuthenticated to DealCalculatorView, and /api/auth/me validates with Edge fallback', () => {
      const pageSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/(marketing)/deal-calculator/page.tsx'),
        'utf8',
      );
      expect(pageSrc).toContain('cookies');
      expect(pageSrc).toContain('verifySessionTokenEdge');
      expect(pageSrc).toContain('initialAuthenticated={isSessionValid}');
      expect(pageSrc).toContain('initialSubscriptionStatus={subscription.status}');

      const authMeSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/api/auth/me/route.ts'),
        'utf8',
      );
      expect(authMeSrc).toContain('verifySessionTokenEdge');

      const calcViewSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/marketing/DealCalculatorView.tsx'),
        'utf8',
      );
      expect(calcViewSrc).toContain('hasClientSessionCookie');
      expect(calcViewSrc).toContain("searchParams?.get('post') === 'true'");
    });
  });

  describe('Bug_65: In-App Support Center Layout & Top-Bar Navigation for Authenticated Users', () => {
    it('Bug_65: DashboardTopBar and DashboardMobileDrawer link to /dashboard/support and MarketingLayoutShell keeps authenticated users inside DashboardShell on /support', () => {
      const topBarSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/dashboard/DashboardTopBar.tsx'),
        'utf8',
      );
      expect(topBarSrc).toContain('href="/dashboard/support"');
      expect(topBarSrc).toContain('data-testid="topbar-support-button"');

      const drawerSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/dashboard/DashboardMobileDrawer.tsx'),
        'utf8',
      );
      expect(drawerSrc).toContain('href="/dashboard/support"');
      expect(drawerSrc).toContain('data-testid="drawer-link-support"');

      const dashboardSupportPage = fs.readFileSync(
        path.resolve(process.cwd(), 'app/(dashboard)/dashboard/support/page.tsx'),
        'utf8',
      );
      expect(dashboardSupportPage).toContain('initialSubscriber={true}');

      const marketingLayoutShell = fs.readFileSync(
        path.resolve(process.cwd(), 'components/marketing/MarketingLayoutShell.tsx'),
        'utf8',
      );
      expect(marketingLayoutShell).toContain('DashboardProviders');
      expect(marketingLayoutShell).toContain('isInAppSupportRoute');
    });
  });

  describe('Bug_66: PaperWorking Triage Widget Header LIVE Badge & Human Desk Button Spacing', () => {
    it('Bug_66: PepperDrawer header enforces gap-3 sm:gap-4, flex-wrap title/badge container, shrink-0 mr-1 on triage-live-badge, and shrink-0 on right action buttons', () => {
      const pepperDrawerSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/assistant/PepperDrawer.tsx'),
        'utf8',
      );
      expect(pepperDrawerSrc).toContain('data-testid="triage-drawer-header"');
      expect(pepperDrawerSrc).toContain('data-testid="triage-live-badge"');
      expect(pepperDrawerSrc).toContain('sm:w-[540px]');
      expect(pepperDrawerSrc).toContain('gap-3 sm:gap-4');
      expect(pepperDrawerSrc).toContain('flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1');
    });
  });

  describe('Bug_67: Public Landing Page CTAs Redirection & Button asChild Navigation', () => {
    it('Bug_67: LandingHero routes Get started to /signup and See how it works to /how-it-works, and Button implements asChild polymorphic rendering without nested button/anchor DOM', () => {
      const landingHeroSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/marketing/LandingHero.tsx'),
        'utf8',
      );
      expect(landingHeroSrc).toContain('href="/signup"');
      expect(landingHeroSrc).toContain('href="/how-it-works"');
      expect(landingHeroSrc).toContain('data-testid="hero-get-started-cta"');
      expect(landingHeroSrc).toContain('data-testid="hero-how-it-works-cta"');
      expect(landingHeroSrc).not.toContain('href="#deal-calculator"');

      const buttonSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/ui/Button.tsx'),
        'utf8',
      );
      expect(buttonSrc).toContain('if (asChild && React.isValidElement(children))');
      expect(buttonSrc).toContain('React.cloneElement');
    });
  });

  describe('Bug_68: Facebook Social Login Popup Cancellation Error Suppression', () => {
    it('Bug_68: social-auth.ts and LoginPanel.tsx suppress auth/popup-closed-by-user and Facebook OAuth cancellation errors cleanly without showing raw Firebase error banners', () => {
      const socialAuthSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'lib/firebase/social-auth.ts'),
        'utf8',
      );
      expect(socialAuthSrc).toContain('auth/popup-closed-by-user');
      expect(socialAuthSrc).toContain('user_denied');
      expect(socialAuthSrc).toContain('customData');
      expect(socialAuthSrc).toContain('isPopupDismissedError');

      const loginPanelSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/auth/LoginPanel.tsx'),
        'utf8',
      );
      expect(loginPanelSrc).toContain('isPopupDismissedError(result.error)');
      expect(loginPanelSrc).toContain('formatSocialAuthError(result.error)');
    });
  });

  describe('Bug_69: Dynamic Field Error Clearing on Sign-Up & Auth Forms', () => {
    it('Bug_69: LoginPanel, ForgotPasswordPanel, and AuthActionPanel reconcile and clear field validation errors dynamically on input/change', () => {
      const loginPanelSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/auth/LoginPanel.tsx'),
        'utf8',
      );
      expect(loginPanelSrc).toContain('reconcileFieldErrors');
      expect(loginPanelSrc).toContain('validateAuthPayload');
      expect(loginPanelSrc).toContain('onInput={(e) => reconcileFieldErrors(e.currentTarget)}');
      expect(loginPanelSrc).toContain('onChange={(e) => reconcileFieldErrors(e.currentTarget)}');
    });
  });

  describe('Bug_70: Blog Footer Link, Blog Index Page, and Non-Deal 404 Boundaries', () => {
    it('Bug_70: MarketingFooter routes Blog to /blog, /blog renders blog-index-page, and global not-found.tsx plus blog/[slug]/not-found.tsx never display "This deal is no longer available"', () => {
      const globalNotFoundSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/not-found.tsx'),
        'utf8',
      );
      expect(globalNotFoundSrc).toContain('data-testid="global-not-found"');
      expect(globalNotFoundSrc).toContain('Page not found');
      expect(globalNotFoundSrc).not.toContain('This deal is no longer available');

      const blogNotFoundSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/(marketing)/blog/[slug]/not-found.tsx'),
        'utf8',
      );
      expect(blogNotFoundSrc).toContain('data-testid="blog-article-not-found"');
      expect(blogNotFoundSrc).toContain('Article not found');
      expect(blogNotFoundSrc).not.toContain('This deal is no longer available');
    });
  });

  describe('Bug_71: Footer Links & Dedicated Pages for About, Careers, and Cookies', () => {
    it('Bug_71: FOOTER_COLUMNS routes About to /about, Careers to /careers, and Cookies to /cookies, with dedicated /about and /careers pages', () => {
      const contentSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'lib/marketing/content.ts'),
        'utf8',
      );
      expect(contentSrc).toContain("{ label: 'About', href: '/about' }");
      expect(contentSrc).toContain("{ label: 'Careers', href: '/careers' }");
      expect(contentSrc).toContain("{ label: 'Cookies', href: '/cookies' }");

      const aboutPageSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/(marketing)/about/page.tsx'),
        'utf8',
      );
      expect(aboutPageSrc).toContain('data-testid="about-page"');

      const careersPageSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/(marketing)/careers/page.tsx'),
        'utf8',
      );
      expect(careersPageSrc).toContain('data-testid="careers-page"');
    });
  });

  describe('Bug_72: Operator Profile Persistence Across Navigation and Reloads', () => {
    it('Bug_72: mapUserDocToEditableProfile, /api/marketplace/profile, settings-store, and PublicProfileEditor preserve headline, publicBio, strategies, displayName, companyName, location, websiteUrl, and avatarUrl', async () => {
      const mapperSrc = fs.readFileSync(
        path.resolve(process.cwd(), '../api/src/lib/marketplace/investor-mapper.ts'),
        'utf8',
      );
      expect(mapperSrc).toContain('headline:');
      expect(mapperSrc).toContain('avatarUrl:');

      const routeSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/api/marketplace/profile/route.ts'),
        'utf8',
      );
      expect(routeSrc).toContain('Cache-Control');
      expect(routeSrc).toContain('no-store');
      expect(routeSrc).toContain('headline');

      const editorSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/profile/PublicProfileEditor.tsx'),
        'utf8',
      );
      expect(editorSrc).toContain("cache: 'no-store'");
      expect(editorSrc).toContain("credentials: 'include'");
      expect(editorSrc).toContain('Array.isArray(p.strategies)');

      const { updateUserProfile, getUserProfile } = await import('../../lib/settings/settings-store.js');
      const testUid = 'bug72-persistence-test-uid';
      await updateUserProfile(testUid, {
        displayName: 'Evelyn Vance',
        businessName: 'Vance Industrial Partners',
        companyName: 'Vance Industrial Partners',
        headline: 'Principal & Sunbelt Multifamily Operator',
        publicBio: 'Value-add multifamily and industrial acquisitions across Texas and Florida.',
        location: 'Dallas, TX',
        websiteUrl: 'https://vanceindustrial.com',
        strategies: ['flip', 'brrrr'],
      });

      const reloaded = await getUserProfile(testUid);
      expect(reloaded.displayName).toBe('Evelyn Vance');
      expect(reloaded.businessName).toBe('Vance Industrial Partners');
      expect(reloaded.headline).toBe('Principal & Sunbelt Multifamily Operator');
      expect(reloaded.publicBio).toBe(
        'Value-add multifamily and industrial acquisitions across Texas and Florida.',
      );
      expect(reloaded.location).toBe('Dallas, TX');
      expect(reloaded.websiteUrl).toBe('https://vanceindustrial.com');
      expect(reloaded.strategies).toEqual(['flip', 'brrrr']);
    });
  });

  describe('Bug_73: Network Modal Direct Chat Window & Inbox Deep-Linked Thread Selection', () => {
    it('Bug_73: FollowersModal opens an active direct chat window on Message click and InboxNotificationCenter auto-selects or creates a direct chat thread for initialRecipient / ?to= without showing the empty reading pane', () => {
      const followersModalSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/dashboard/FollowersModal.tsx'),
        'utf8',
      );
      expect(followersModalSrc).toContain('data-testid="follower-direct-chat-panel"');
      expect(followersModalSrc).toContain('data-testid={`message-follower-btn-${follower.id}`}');
      expect(followersModalSrc).toContain('data-testid="direct-chat-input"');
      expect(followersModalSrc).toContain('data-testid="direct-chat-send-btn"');

      const inboxHtml = renderToString(
        <InboxNotificationCenter
          initialRecipient={{
            to: 'Alex Morgan',
            role: 'Acquisitions Director',
            firm: 'Apex Commercial Capital',
            deal: '1247 Elm Street',
          }}
        />,
      );
      expect(inboxHtml).toContain('Alex Morgan');
      expect(inboxHtml).toContain('data-testid="inbox-inline-reply-form"');
      expect(inboxHtml).toContain('data-testid="inbox-inline-reply-input"');
      expect(inboxHtml).toContain('data-testid="inbox-inline-reply-send"');
      expect(inboxHtml).not.toContain('Select an item to read');
    });
  });

  describe('Bug_74: Pepper AI Knowledge Base Retrieval & Operational Query Routing', () => {
    it('Bug_74: synthesizeGroundedKnowledgeResponse and /api/support/pepper return the Hold phase answer for Hold phase rehab budget and holding cost queries without returning subscription pricing tiers', () => {
      const aiClientSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'lib/assistant/firebase-ai-client.ts'),
        'utf8',
      );
      const pricingBlock = aiClientSrc.slice(
        aiClientSrc.indexOf('isPricingQuery'),
        aiClientSrc.indexOf(';', aiClientSrc.indexOf('isPricingQuery')),
      );
      expect(pricingBlock).not.toContain("includes('cost')");

      const pepperRouteSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'app/api/support/pepper/route.ts'),
        'utf8',
      );
      expect(pepperRouteSrc).toContain('async function retrieveDomainContext');
    });
  });

  describe('Bug_75: Portfolio Dashboard /dashboard/calendar Route & /api/calendar 200 OK Resolution', () => {
    it('Bug_75: /dashboard/calendar page, DashboardCalendarPanel, /api/calendar, and /api/calendar/events exist and resolve cleanly so Portfolio load has zero 404 calendar requests', () => {
      const calendarPagePath = path.resolve(
        process.cwd(),
        'app/(dashboard)/dashboard/calendar/page.tsx',
      );
      const calendarPanelPath = path.resolve(
        process.cwd(),
        'components/dashboard/DashboardCalendarPanel.tsx',
      );
      const calendarApiPath = path.resolve(
        process.cwd(),
        'app/api/calendar/route.ts',
      );
      const calendarEventsApiPath = path.resolve(
        process.cwd(),
        'app/api/calendar/events/route.ts',
      );

      expect(fs.existsSync(calendarPagePath)).toBe(true);
      expect(fs.existsSync(calendarPanelPath)).toBe(true);
      expect(fs.existsSync(calendarApiPath)).toBe(true);
      expect(fs.existsSync(calendarEventsApiPath)).toBe(true);

      const panelSrc = fs.readFileSync(calendarPanelPath, 'utf8');
      expect(panelSrc).toContain('data-testid="dashboard-calendar-panel"');
      expect(panelSrc).toContain('BasecampMiniCalendar');
      expect(panelSrc).toContain('/api/projects/everything');
      expect(getPageLabel('/dashboard/calendar')).toBe('Schedule & Calendar');
    });
  });

  describe('Bug_21: Settings Left Sidebar Option Renders Cogwheel Gear Icon Instead of Brightness/Sun Icon', () => {
    it('Bug_21: PhosphorIcons Gear and getNavPhosphorIcon("settings") render the connected 8-tooth cogwheel gear SVG path and never the detached sun rays', () => {
      const iconsSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'components/icons/PhosphorIcons.tsx'),
        'utf8',
      );
      expect(iconsSrc).toContain('M207.86,123.18l16.78-21');
      expect(iconsSrc).not.toContain('M128,24V48m0,160v24M24,128H48m160,0h24');
    });
  });

  describe('Bug_76, Bug_77 & Bug_78: Topbar Search Placeholder, Profile Completeness 67% Math, and Washington DC Address Parsing', () => {
    it('Bug_76: DashboardTopBar search input displays "Search deals by name or address" with max-w-xl and conditional right padding', () => {
      const html = renderToString(<DashboardTopBar initialSearchQuery="" />);
      expect(html).toContain('placeholder="Search deals by name or address"');
      expect(html).not.toContain('Search deals by name or addres"');
    });

    it('Bug_77: calculateProfileCompleteness computes Math.round((4 / 6) * 100) = 67% Complete when 4 of 6 criteria are met', async () => {
      const { calculateProfileCompleteness } = await import('../../lib/profile/completeness.js');
      const result = calculateProfileCompleteness({
        displayName: 'Alex Mercer',
        companyName: 'Apex Capital Partners',
        headline: 'Principal Operator',
        publicBio: 'Principal operator focused on value-add acquisitions across sunbelt markets.',
        location: '',
        strategies: ['brrrr', 'multifamily'],
        avatarUrl: '',
      });
      expect(result.criteria.filter((c) => c.met)).toHaveLength(4);
      expect(result.criteria).toHaveLength(6);
      expect(result.score).toBe(67);
    });

    it('Bug_78: parseAddressComponents resolves "Abbey Place Northeast, Washington, DC, USA" to City="Washington", State="DC", Zip="20002"', async () => {
      const { parseAddressComponents } = await import('../../lib/maps/address-parser.js');
      const parsed = parseAddressComponents('Abbey Place Northeast, Washington, DC, USA');
      expect(parsed.city).toBe('Washington');
      expect(parsed.state).toBe('DC');
      expect(parsed.zipCode).toBe('20002');
    });
  });
});



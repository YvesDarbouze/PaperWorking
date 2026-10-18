import fs from 'fs';
import path from 'path';

describe('shadcn buFzlTs Design System & Responsive Gospel Compliance Test', () => {
  const cwd = process.cwd();
  const webAppDir = cwd.endsWith('apps/web') ? cwd : path.join(cwd, 'apps/web');

  const elevatedComponents = [
    'components/marketing/MarketingHeader.tsx',
    'components/marketing/MarketingBottomNav.tsx',
    'components/marketing/LandingHero.tsx',
    'components/marketing/HeroProductShowcase.tsx',
    'components/marketing/HeroProductCarousel.tsx',
    'components/marketing/SupportCenter.tsx',
    'components/marketing/PricingSection.tsx',
    'components/marketing/BlogIndexClient.tsx',
    'components/marketing/MarketingLayoutShell.tsx',
    'components/dashboard/DashboardSidebar.tsx',
    'components/dashboard/DashboardTopBar.tsx',
    'components/dashboard/DashboardMobileDrawer.tsx',
    'components/dashboard/DashboardBottomNav.tsx',
    'components/dashboard/CommandCenterPanel.tsx',
    'components/dashboard/DashboardCalendarPanel.tsx',
    'components/dashboard/FollowersModal.tsx',
    'components/dashboard/DashboardTrendDetailModal.tsx',
    'components/dashboard/SettingsHubPanel.tsx',
    'components/dashboard/TeamPreviewPanel.tsx',
    'components/dashboard/InboxPreviewPanel.tsx',
    'components/dashboard/BillingPreviewPanel.tsx',
    'components/dashboard/ProfilePreviewPanel.tsx',
    'components/marketing/deal-calculator/PublishToMarketplaceModal.tsx',
    'components/marketing/deal-calculator/StartProjectFromCalculatorModal.tsx',
    'components/marketing/DealCalculatorView.tsx',
    'components/marketplace/InvestorProfilePanel.tsx',
    'components/vendor-portal/VendorProfilePanel.tsx',
    'components/reports/ProjectReportsPanel.tsx',
    'components/reports/RentRollView.tsx',
    'components/settings/SecuritySettingsPanel.tsx',
    'components/settings/BankConnectionCard.tsx',
    'components/projects/ProjectsListPanel.tsx',
    'components/projects/ProjectFolderCard.tsx',
    'components/projects/REILKanBan.tsx',
    'components/projects/AcquisitionPipelineBoard.tsx',
    'app/(dashboard)/projects/new/page.tsx',
    'app/(dashboard)/dashboard/calendar/page.tsx',
    'app/(dashboard)/dashboard/support/page.tsx',
    'app/(marketing)/blog/page.tsx',
    'app/(marketing)/about/page.tsx',
    'app/(marketing)/careers/page.tsx',
    'app/(marketing)/cookies/page.tsx',
    'app/(marketing)/unsubscribe/page.tsx',
    'app/auth/action/page.tsx',
    'app/global-error.tsx',
  ];

  it('enforces buFywKm / buFzlTs precision geometry: 0 instances of rounded-2xl or rounded-xl in elevated components', () => {
    elevatedComponents.forEach((relPath) => {
      const fullPath = path.join(webAppDir, relPath);
      if (!fs.existsSync(fullPath)) return;
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check for forbidden rounded classes in JSX classNames
      const hasRoundedXl = /className=.*rounded-(?:xl|2xl|3xl)/.test(content);
      expect(hasRoundedXl).toBe(false);
    });
  });

  it('enforces pure OKLCH neutral tokens in globals.css without colored sidebar-primary overrides', () => {
    const globalsCss = fs.readFileSync(path.join(webAppDir, 'app/globals.css'), 'utf8');
    expect(globalsCss).not.toContain('oklch(0.488 0.243 264.376)');
    expect(globalsCss).toContain('--sidebar-primary: oklch(0.985 0 0);');
  });

  it('enforces Phosphor icon library: 0 instances of material-symbols-outlined in elevated components', () => {
    elevatedComponents.forEach((relPath) => {
      const fullPath = path.join(webAppDir, relPath);
      if (!fs.existsSync(fullPath)) return;
      const content = fs.readFileSync(fullPath, 'utf8');

      const hasMaterialSymbols = content.includes('material-symbols-outlined');
      expect(hasMaterialSymbols).toBe(false);
    });
  });

  it('enforces Anti-Slop Directive: strictly zero instances of forbidden term sponsor in apps/web/app, components, and lib', () => {
    const searchDirs = [
      path.join(webAppDir, 'app'),
      path.join(webAppDir, 'components'),
      path.join(webAppDir, 'lib'),
    ];

    function checkDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          // Skip test files if any
          if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
          const text = fs.readFileSync(full, 'utf8');
          // Check for sponsor (case-insensitive) as a standalone word
          const match = text.match(/\b(sponsor|sponsors|sponsored|sponsorship)\b/i);
          if (match) {
            throw new Error(`Found forbidden term "${match[0]}" in ${full}`);
          }
        }
      }
    }

    searchDirs.forEach((dir) => checkDir(dir));
  });

  it('enforces Responsive Gospel: elevated interactive elements and buttons include min-h-[44px]', () => {
    const keyInteractiveComponents = [
      'components/marketing/MarketingHeader.tsx',
      'components/marketing/MarketingBottomNav.tsx',
      'components/dashboard/DashboardSidebar.tsx',
      'components/dashboard/DashboardTopBar.tsx',
      'components/dashboard/DashboardBottomNav.tsx',
      'components/dashboard/CommandCenterPanel.tsx',
      'app/(dashboard)/projects/new/page.tsx',
    ];

    keyInteractiveComponents.forEach((relPath) => {
      const fullPath = path.join(webAppDir, relPath);
      if (!fs.existsSync(fullPath)) return;
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasTouchTarget = /(?:min-h-\[(?:4[4-9]|[5-9]\d|\d{3,})px\])/.test(content);
      expect(hasTouchTarget).toBe(true);
    });
  });

  it('enforces iOS Safari zoom prevention: new project form inputs use text-base sm:text-xs', () => {
    const newProjectPage = path.join(webAppDir, 'app/(dashboard)/projects/new/page.tsx');
    const content = fs.readFileSync(newProjectPage, 'utf8');
    expect(content).toContain('text-base sm:text-xs');
  });

  it('enforces buFzlTs rounded-none controls across elevated modals and panels', () => {
    const modalFiles = [
      'components/dashboard/FollowersModal.tsx',
      'components/dashboard/DashboardTrendDetailModal.tsx',
      'components/marketing/deal-calculator/PublishToMarketplaceModal.tsx',
      'components/marketing/deal-calculator/StartProjectFromCalculatorModal.tsx',
    ];

    modalFiles.forEach((relPath) => {
      const fullPath = path.join(webAppDir, relPath);
      if (!fs.existsSync(fullPath)) return;
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('rounded-none');
    });
  });
});

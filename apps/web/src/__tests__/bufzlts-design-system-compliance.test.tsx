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
    'components/marketing/SupportCenter.tsx',
    'components/marketing/PricingSection.tsx',
    'components/dashboard/DashboardSidebar.tsx',
    'components/dashboard/DashboardTopBar.tsx',
    'components/dashboard/DashboardMobileDrawer.tsx',
    'components/dashboard/DashboardBottomNav.tsx',
    'components/dashboard/CommandCenterPanel.tsx',
    'components/dashboard/FollowersModal.tsx',
    'components/dashboard/DashboardTrendDetailModal.tsx',
    'components/dashboard/SettingsHubPanel.tsx',
    'components/dashboard/TeamPreviewPanel.tsx',
    'components/dashboard/InboxPreviewPanel.tsx',
    'components/dashboard/BillingPreviewPanel.tsx',
    'components/dashboard/ProfilePreviewPanel.tsx',
    'components/marketing/deal-calculator/PublishToMarketplaceModal.tsx',
    'components/marketing/deal-calculator/StartProjectFromCalculatorModal.tsx',
    'app/(dashboard)/projects/new/page.tsx',
  ];

  it('enforces buFzlTs precision geometry: 0 instances of rounded-2xl or rounded-xl in elevated components', () => {
    elevatedComponents.forEach((relPath) => {
      const fullPath = path.join(webAppDir, relPath);
      if (!fs.existsSync(fullPath)) return;
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check for forbidden rounded classes in JSX classNames
      const hasRoundedXl = /className=.*rounded-(?:xl|2xl|3xl)/.test(content);
      expect(hasRoundedXl).toBe(false);
    });
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
